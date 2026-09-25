/**
 * Mashup Match V1.5 · Supabase Edge Function `music-metadata`
 * Pegar este único archivo en Supabase > Edge Functions > Deploy a new function > Via Editor.
 * No necesita secretos nuevos; exige una sesión de Supabase Auth válida.
 * MusicBrainz: para uso NO COMERCIAL. 1 petición/s de este proceso; uso manual,
 * nunca ejecutar importaciones automáticas masivas con esta función.
 */
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });

const MB_ROOT = 'https://musicbrainz.org/ws/2/';
const MB_AGENT = 'MashupMatch/1.5 (https://github.com/santiagorochanovas/mashup-match)';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cache = new Map<string, { expires: number; value: unknown }>();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

// Cola local: una petición a MusicBrainz como máximo cada 1200 ms por instancia.
// Como Supabase puede iniciar varias instancias, se destina a uso manual por UN admin,
// no a un importador público ni a consultas en masa.
function musicBrainz(url: string): Promise<any> {
  const previous = requestQueue;
  let finish!: () => void;
  requestQueue = new Promise<void>((resolve) => { finish = resolve; });
  return (async () => {
    await previous;
    try {
      const wait = nextRequestAt - Date.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      nextRequestAt = Date.now() + 1200;
      const response = await fetch(url, {
        headers: { 'User-Agent': MB_AGENT, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(14000),
      });
      if (response.status === 429 || response.status === 503) {
        throw new Error('MusicBrainz está limitando las consultas. Esperá unos segundos y volvé a buscar.');
      }
      if (!response.ok) throw new Error(`MusicBrainz devolvió HTTP ${response.status}.`);
      return await response.json();
    } finally {
      finish();
    }
  })();
}
function cachedFetch(url: string): Promise<any> {
  const item = cache.get(url);
  if (item && item.expires > Date.now()) return Promise.resolve(item.value);
  return musicBrainz(url).then(value => {
    if (cache.size >= 120) cache.clear();
    cache.set(url, { expires: Date.now() + 5 * 60_000, value });
    return value;
  });
}
function credit(recording: any): string {
  return (recording?.['artist-credit'] || []).map((a: any) =>
    typeof a === 'string' ? a : (a?.name || a?.artist?.name || '')).join('').trim();
}
function year(date: unknown): string {
  return typeof date === 'string' && /^\d{4}/.test(date) ? date.slice(0, 4) : '';
}
function normalizeRelease(group: any, fallback: any = null): any {
  const id: string = group?.id || fallback?.id || '';
  const useGroup = Boolean(group?.id);
  return {
    id,
    album: String(group?.title || fallback?.title || '').slice(0, 180),
    kind: String(group?.['primary-type'] || group?.type || '').slice(0, 40),
    year: year(group?.['first-release-date'] || fallback?.date),
    // Imagen directa, sin descargar ni almacenar archivos en la base.
    cover: id && uuid.test(id) ? `https://coverartarchive.org/${useGroup ? 'release-group' : 'release'}/${id}/front-500` : '',
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);
  try {
    // Autenticación obligatoria. No enviamos JWT de Supabase a MusicBrainz.
    const authorization = request.headers.get('authorization') || '';
    const apiKey = request.headers.get('apikey') || '';
    const projectUrl = Deno.env.get('SUPABASE_URL') || '';
    if (!authorization.startsWith('Bearer ') || !apiKey || !projectUrl) {
      return reply({ error: 'Iniciá sesión como administrador para usar el autocompletado.' }, 401);
    }
    const authResult = await fetch(`${projectUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { 'Authorization': authorization, 'apikey': apiKey },
      signal: AbortSignal.timeout(6000),
    });
    if (!authResult.ok) return reply({ error: 'Tu sesión expiró. Volvé a iniciar sesión.' }, 401);
    const user = await authResult.json();
    if (!user?.id) return reply({ error: 'No se encontró el usuario autenticado.' }, 401);

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== 'object') return reply({ error: 'Solicitud inválida.' }, 400);

    if (payload.action === 'search') {
      const title = String(payload.title || '').trim();
      const artist = String(payload.artist || '').trim();
      if (!title || !artist || title.length > 120 || artist.length > 120) {
        return reply({ error: 'Ingresá título y artista (máximo 120 caracteres cada uno).' }, 400);
      }
      // Escapar caracteres reservados de Lucene sin alterar los acentos.
      const quote = (s: string) => `"${s.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, '\\$&')}"`;
      const params = new URLSearchParams({
        query: `recording:${quote(title)} AND artist:${quote(artist)}`,
        fmt: 'json', limit: '12',
      });
      const data = await cachedFetch(`${MB_ROOT}recording/?${params}`);
      const results = (data.recordings || []).map((r: any) => ({
        id: r.id, title: r.title || '', artist: credit(r),
        comment: r.disambiguation || '', firstDate: r['first-release-date'] || '',
      })).filter((r: any) => uuid.test(r.id));
      return reply({ results });
    }

    if (payload.action === 'details') {
      const id = String(payload.id || '');
      if (!uuid.test(id)) return reply({ error: 'Identificador de grabación inválido.' }, 400);
      const data = await cachedFetch(`${MB_ROOT}recording/${id}?fmt=json&inc=releases+release-groups`);
      const candidates: any[] = [];
      for (const group of (data['release-groups'] || [])) candidates.push(normalizeRelease(group));
      for (const release of (data.releases || [])) {
        candidates.push(normalizeRelease(release['release-group'], release));
      }
      // Deduplicar por MBID de release-group, y priorizar álbumes/EP frente a singles.
      const releasesById = new Map<string, any>();
      for (const item of candidates.filter(item => item.id && item.album)) {
        const previous = releasesById.get(item.id);
        // Conservar la fecha de lanzamiento del release-group si ya está disponible.
        // No sustituirla accidentalmente por la fecha de una reedición.
        if (!previous || (!previous.year && item.year)) releasesById.set(item.id, item);
      }
      const unique = [...releasesById.values()];
      const rank = (r: any) => ({ Album: 0, EP: 1, Single: 2 }[r.kind as 'Album'|'EP'|'Single'] ?? 3);
      unique.sort((a, b) => rank(a) - rank(b) || Number(a.year || 9999) - Number(b.year || 9999) || a.album.localeCompare(b.album));
      return reply({
        title: data.title || '', artist: credit(data), firstDate: data['first-release-date'] || '',
        releases: unique.slice(0, 30),
      });
    }
    return reply({ error: 'Acción desconocida.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado.';
    // Evitar filtrar datos internos si una biblioteca lanza errores complejos.
    const safe = message.startsWith('MusicBrainz') ? message : 'No se pudo consultar MusicBrainz. Intentá nuevamente.';
    return reply({ error: safe }, 502);
  }
});
