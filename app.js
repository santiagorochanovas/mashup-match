const KEYS = [
  {name:'A♭ minor', camelot:'1A'}, {name:'B major', camelot:'1B'},
  {name:'E♭ minor', camelot:'2A'}, {name:'F♯ major', camelot:'2B'},
  {name:'B♭ minor', camelot:'3A'}, {name:'D♭ major', camelot:'3B'},
  {name:'F minor', camelot:'4A'}, {name:'A♭ major', camelot:'4B'},
  {name:'C minor', camelot:'5A'}, {name:'E♭ major', camelot:'5B'},
  {name:'G minor', camelot:'6A'}, {name:'B♭ major', camelot:'6B'},
  {name:'D minor', camelot:'7A'}, {name:'F major', camelot:'7B'},
  {name:'A minor', camelot:'8A'}, {name:'C major', camelot:'8B'},
  {name:'E minor', camelot:'9A'}, {name:'G major', camelot:'9B'},
  {name:'B minor', camelot:'10A'}, {name:'D major', camelot:'10B'},
  {name:'F♯ minor', camelot:'11A'}, {name:'A major', camelot:'11B'},
  {name:'C♯ minor', camelot:'12A'}, {name:'E major', camelot:'12B'}
];

const WHEEL_ORDER = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];

const config = window.APP_CONFIG || {};
const publicKey = config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY || '';
const hasConfig = Boolean(config.SUPABASE_URL && publicKey);
const sb = hasConfig ? window.supabase.createClient(config.SUPABASE_URL, publicKey) : null;

let songs = [];
let currentUser = null;
let csvImportRows = [];
let currentPage = 1;
let pageSize = 24;
let currentView = 'catalog';
let metadataCandidates = [];
let chosenMetadata = null;
let chosenRelease = null;
let metadataCoverReady = false;
let metadataCoverCheck = 0;
let metadataBusy = false;

const $ = (id) => document.getElementById(id);
const els = {
  search: $('search'), keyFilter: $('keyFilter'), keyMode: $('keyMode'), bpmMin: $('bpmMin'), bpmMax: $('bpmMax'), sort: $('sort'),
  clearFilters: $('clearFilters'), resultCount: $('resultCount'), songGrid: $('songGrid'), status: $('status'),
  catalogTab: $('catalogTab'), explorerTab: $('explorerTab'), catalogView: $('catalogView'),
  pagination: $('pagination'), pageInfo: $('pageInfo'), pageSize: $('pageSize'), pageButtons: $('pageButtons'),
  harmonicKey: $('harmonicKey'), harmonicMode: $('harmonicMode'), harmonicWheel: $('harmonicWheel'), harmonicIntro: $('harmonicIntro'),
  harmonicSummary: $('harmonicSummary'), applyHarmonicFilter: $('applyHarmonicFilter'), clearHarmonic: $('clearHarmonic'), harmonicExplorer: $('harmonicExplorer'),
  adminToggle: $('adminToggle'), adminPanel: $('adminPanel'), loginBox: $('loginBox'), songForm: $('songForm'),
  email: $('email'), password: $('password'), loginBtn: $('loginBtn'), logoutBtn: $('logoutBtn'),
  songId: $('songId'), title: $('title'), artist: $('artist'), bpm: $('bpm'), key: $('key'), version: $('version'), album: $('album'), year: $('year'), coverUrl: $('coverUrl'), notes: $('notes'),
  cancelEdit: $('cancelEdit'), dialog: $('songDialog'), dialogContent: $('dialogContent'), closeDialog: $('closeDialog'),
  importBox: $('importBox'), csvFile: $('csvFile'), csvFileName: $('csvFileName'), skipDuplicates: $('skipDuplicates'),
  importSummary: $('importSummary'), importPreview: $('importPreview'), importControls: $('importControls'),
  importCsvBtn: $('importCsvBtn'), clearCsvBtn: $('clearCsvBtn'),
  metadataBox: $('metadataBox'), metaSong: $('metaSong'), metaArtist: $('metaArtist'), metaSearchBtn: $('metaSearchBtn'),
  metaFromForm: $('metaFromForm'), metaStatus: $('metaStatus'), metaResults: $('metaResults'), metaReview: $('metaReview'),
  metaChosenTitle: $('metaChosenTitle'), metaChosenArtist: $('metaChosenArtist'), metaRelease: $('metaRelease'),
  metaArt: $('metaArt'), metaYearPreview: $('metaYearPreview'), metaCoverState: $('metaCoverState'),
  metaOverwrite: $('metaOverwrite'), metaApplyBtn: $('metaApplyBtn'), metaCancelBtn: $('metaCancelBtn')
};

function initKeySelects() {
  const options = KEYS.map(k => `<option value="${k.camelot}">${k.name} · ${k.camelot}</option>`).join('');
  els.key.innerHTML = '<option value="">Elegí una tonalidad</option>' + options;
  els.keyFilter.innerHTML = '<option value="">Todas</option>' + options;
  els.harmonicKey.innerHTML = '<option value="">Elegí una tonalidad</option>' + options;
}

function showStatus(message, error = false) {
  els.status.textContent = message;
  els.status.classList.remove('hidden', 'error');
  if (error) els.status.classList.add('error');
}
function hideStatus() { els.status.classList.add('hidden'); }

function keyName(camelot) { return KEYS.find(k => k.camelot === camelot)?.name || camelot || '—'; }


function shortKeyName(camelot) {
  const name = keyName(camelot);
  return name.replace(' major', '').replace(' minor', 'm');
}

function normalizeCamelotNumber(number) {
  return ((Number(number) - 1 + 12) % 12) + 1;
}

function harmonicRelation(source, target) {
  if (!source || !target) return { level:'none', score:0, label:'Sin relación cercana', description:'' };
  if (source === target) return {
    level:'exact', score:50, label:'Misma tonalidad',
    description:'Mismo centro tonal y el mismo conjunto de notas.'
  };

  const sourceNumber = parseInt(source, 10);
  const targetNumber = parseInt(target, 10);
  const sourceMode = source.slice(-1);
  const targetMode = target.slice(-1);
  const distance = Math.min(Math.abs(sourceNumber - targetNumber), 12 - Math.abs(sourceNumber - targetNumber));

  if (sourceNumber === targetNumber && sourceMode !== targetMode) return {
    level:'relative', score:46, label:'Relativa mayor/menor',
    description:'Comparten las mismas siete notas; cambia el centro tonal.'
  };
  if (sourceMode === targetMode && distance === 1) return {
    level:'neighbor', score:42, label:'Vecina en la rueda',
    description:'Relación de quinta/cuarta: comparten seis de las siete notas de la escala.'
  };
  if (sourceMode !== targetMode && distance === 1) return {
    level:'wide', score:34, label:'Pariente cercano',
    description:'Es la relativa de una tonalidad vecina. Útil para ampliar la búsqueda y probar transiciones con más color.'
  };
  return { level:'none', score:0, label:'Sin relación cercana', description:'' };
}

function harmonicKeysForMode(baseKey, mode='exact') {
  if (!baseKey) return new Set();
  const sourceNumber = parseInt(baseKey, 10);
  const sourceMode = baseKey.slice(-1);
  const oppositeMode = sourceMode === 'A' ? 'B' : 'A';
  const prev = normalizeCamelotNumber(sourceNumber - 1);
  const next = normalizeCamelotNumber(sourceNumber + 1);
  const result = new Set([baseKey]);
  if (mode === 'exact') return result;
  result.add(`${sourceNumber}${oppositeMode}`);
  result.add(`${prev}${sourceMode}`);
  result.add(`${next}${sourceMode}`);
  if (mode === 'wide') {
    result.add(`${prev}${oppositeMode}`);
    result.add(`${next}${oppositeMode}`);
  }
  return result;
}

function relatedKeyGroups(baseKey) {
  if (!baseKey) return [];
  const number = parseInt(baseKey, 10);
  const mode = baseKey.slice(-1);
  const opposite = mode === 'A' ? 'B' : 'A';
  const prev = normalizeCamelotNumber(number - 1);
  const next = normalizeCamelotNumber(number + 1);
  return [
    { title:'Actual', relation:'exact', keys:[baseKey], note:'La referencia de la búsqueda.' },
    { title:'Relativa', relation:'relative', keys:[`${number}${opposite}`], note:'Mismas siete notas, distinto centro tonal.' },
    { title:'Vecinas', relation:'neighbor', keys:[`${prev}${mode}`, `${next}${mode}`], note:'Quinta/cuarta vecina; comparten seis de siete notas.' },
    { title:'Exploración amplia', relation:'wide', keys:[`${prev}${opposite}`, `${next}${opposite}`], note:'Relativas de las tonalidades vecinas.' }
  ];
}

function songCountForKey(camelot) {
  return songs.filter(song => song.camelot_key === camelot).length;
}

function wheelClass(baseKey, targetKey, mode) {
  if (!baseKey) return '';
  const relation = harmonicRelation(baseKey, targetKey);
  if (relation.level === 'exact') return 'is-current';
  if (mode === 'safe' && ['relative','neighbor'].includes(relation.level)) return `is-${relation.level}`;
  if (mode === 'wide' && ['relative','neighbor','wide'].includes(relation.level)) return `is-${relation.level}`;
  return '';
}

function renderHarmonicExplorer() {
  const baseKey = els.harmonicKey.value;
  const mode = els.harmonicMode.value;
  const radius = { B: 43, A: 29 };
  const buttons = [];

  WHEEL_ORDER.forEach((number, index) => {
    const angle = (-90 + index * 30) * Math.PI / 180;
    ['B','A'].forEach(letter => {
      const camelot = `${number}${letter}`;
      const r = radius[letter];
      const left = 50 + Math.cos(angle) * r;
      const top = 50 + Math.sin(angle) * r;
      const count = songCountForKey(camelot);
      buttons.push(`<button type="button" class="wheel-key ${letter === 'B' ? 'major' : 'minor'} ${wheelClass(baseKey, camelot, mode)}" style="left:${left}%;top:${top}%" data-harmonic-key="${camelot}" title="${escapeHtml(keyName(camelot))} · ${camelot} · ${count} canción${count === 1 ? '' : 'es'}"><strong>${escapeHtml(shortKeyName(camelot))}</strong><span>${camelot}</span></button>`);
    });
  });

  const center = baseKey
    ? `<div class="wheel-center"><span>${escapeHtml(baseKey)}</span><strong>${escapeHtml(keyName(baseKey))}</strong><small>${songCountForKey(baseKey)} en catálogo</small></div>`
    : `<div class="wheel-center"><span>♫</span><strong>Elegí un tono</strong><small>24 tonalidades</small></div>`;
  els.harmonicWheel.innerHTML = center + buttons.join('');

  if (!baseKey) {
    els.harmonicIntro.classList.remove('hidden');
    els.harmonicSummary.classList.add('hidden');
    els.harmonicSummary.innerHTML = '';
    els.applyHarmonicFilter.disabled = true;
    return;
  }

  els.harmonicIntro.classList.add('hidden');
  els.harmonicSummary.classList.remove('hidden');
  els.applyHarmonicFilter.disabled = false;
  const groups = relatedKeyGroups(baseKey).filter(group => mode === 'wide' || group.relation !== 'wide');
  els.harmonicSummary.innerHTML = `
    <div class="harmonic-selected">
      <span class="eyebrow">TONALIDAD BASE</span>
      <h3>${escapeHtml(keyName(baseKey))} · ${baseKey}</h3>
      <p class="muted">${mode === 'wide' ? 'Exploración amplia: suma las relativas de las tonalidades vecinas.' : 'Modo seguro: misma tonalidad, relativa y vecinas de quinta/cuarta.'}</p>
    </div>
    ${groups.map(group => `<div class="relation-card relation-${group.relation}">
      <div><strong>${group.title}</strong><span>${group.note}</span></div>
      <div class="relation-keys">${group.keys.map(key => `<button type="button" class="relation-key" data-search-key="${key}"><b>${escapeHtml(keyName(key))}</b><small>${key} · ${songCountForKey(key)} canción${songCountForKey(key) === 1 ? '' : 'es'}</small></button>`).join('')}</div>
    </div>`).join('')}`;
}

function useHarmonicSearch(baseKey, mode='safe') {
  if (!baseKey) return;
  setView('catalog');
  els.keyFilter.value = baseKey;
  els.keyMode.value = mode;
  els.keyMode.disabled = false;
  currentPage = 1;
  render();
  document.querySelector('.search-panel')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function cover(song, cls='cover') {
  if (!song.cover_url) return `<div class="${cls} cover-placeholder">♫</div>`;
  return `<img class="${cls}" src="${escapeHtml(song.cover_url)}" alt="Portada de ${escapeHtml(song.title)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;${cls} cover-placeholder&quot;>♫</div>'">`;
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

async function loadSongs() {
  if (!sb) {
    showStatus('Falta conectar Supabase. Completá config.js con tu URL y publishable key. Mientras tanto la interfaz está lista.', true);
    songs = [];
    render();
    return;
  }
  hideStatus();

  // Supabase suele limitar la cantidad de filas devueltas por una sola petición.
  // Las traemos por bloques para que un catálogo de más de 1000 canciones siga completo.
  const batchSize = 1000;
  let from = 0;
  let total = null;
  const allSongs = [];

  while (total === null || allSongs.length < total) {
    let query = total === null
      ? sb.from('songs').select('*', { count:'exact' })
      : sb.from('songs').select('*');
    query = query
      .order('artist')
      .order('title')
      .order('id')
      .range(from, from + batchSize - 1);

    const { data, error, count } = await query;
    if (error) return showStatus('No pude cargar las canciones: ' + error.message, true);
    if (total === null) total = count ?? (data?.length || 0);
    if (!data?.length) break;
    allSongs.push(...data);
    from += data.length;
    if (data.length < batchSize && allSongs.length >= total) break;
  }

  songs = allSongs;
  currentPage = 1;
  render();
  renderHarmonicExplorer();
}
function filteredSongs() {
  const q = els.search.value.trim().toLowerCase();
  const key = els.keyFilter.value;
  const acceptedKeys = key ? harmonicKeysForMode(key, els.keyMode.value) : null;
  const min = parseFloat(els.bpmMin.value);
  const max = parseFloat(els.bpmMax.value);
  let list = songs.filter(song => {
    const haystack = [song.title, song.artist, song.version, song.album, song.year, song.bpm, song.camelot_key, keyName(song.camelot_key)].join(' ').toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (key && !acceptedKeys.has(song.camelot_key)) return false;
    if (!Number.isNaN(min) && Number(song.bpm) < min) return false;
    if (!Number.isNaN(max) && Number(song.bpm) > max) return false;
    return true;
  });
  const sort = els.sort.value;
  list.sort((a,b) => {
    if (sort === 'bpm') return Number(a.bpm) - Number(b.bpm);
    if (sort === 'year') return Number(b.year || 0) - Number(a.year || 0);
    return String(a[sort] || '').localeCompare(String(b[sort] || ''), 'es', {sensitivity:'base'});
  });
  return list;
}

function setView(view) {
  currentView = view === 'explorer' ? 'explorer' : 'catalog';
  const showCatalog = currentView === 'catalog';
  els.catalogView.classList.toggle('hidden', !showCatalog);
  els.harmonicExplorer.classList.toggle('hidden', showCatalog);
  els.catalogTab.classList.toggle('active', showCatalog);
  els.explorerTab.classList.toggle('active', !showCatalog);
  els.catalogTab.setAttribute('aria-selected', String(showCatalog));
  els.explorerTab.setAttribute('aria-selected', String(!showCatalog));
  if (!showCatalog) renderHarmonicExplorer();
}

function resetPageAndRender() {
  currentPage = 1;
  render();
}

function paginationPages(totalPages, page) {
  if (totalPages <= 7) return Array.from({length: totalPages}, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const valid = [...pages].filter(n => n >= 1 && n <= totalPages).sort((a,b) => a-b);
  const result = [];
  valid.forEach((n, i) => {
    if (i && n - valid[i-1] > 1) result.push('…');
    result.push(n);
  });
  return result;
}

function renderPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalItems);

  els.pageSize.value = String(pageSize);
  els.pageInfo.textContent = totalItems
    ? `Mostrando ${start}–${end} de ${totalItems}`
    : '0 canciones';

  if (totalItems <= pageSize) {
    els.pagination.classList.add('hidden');
    els.pageButtons.innerHTML = '';
    return;
  }

  els.pagination.classList.remove('hidden');
  const pages = paginationPages(totalPages, currentPage);
  els.pageButtons.innerHTML = `
    <button type="button" class="page-nav" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
    ${pages.map(p => p === '…'
      ? '<span class="page-ellipsis">…</span>'
      : `<button type="button" class="page-number ${p === currentPage ? 'active' : ''}" data-page="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`
    ).join('')}
    <button type="button" class="page-nav" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Página siguiente">›</button>`;
}

function render() {
  const list = filteredSongs();
  els.resultCount.textContent = `${list.length} canción${list.length === 1 ? '' : 'es'}`;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  if (!list.length) {
    els.songGrid.innerHTML = `<div class="empty">No hay resultados con esos filtros.</div>`;
    renderPagination(0);
    return;
  }

  els.songGrid.innerHTML = pageItems.map(song => `
    <article class="card">
      ${cover(song)}
      <div class="card-body">
        <h3>${escapeHtml(song.title)}</h3>
        <p class="artist">${escapeHtml(song.artist)}</p>
        <div class="badges">
          <span class="badge">${Number(song.bpm).toFixed(Number(song.bpm) % 1 ? 1 : 0)} BPM</span>
          <span class="badge key">${escapeHtml(keyName(song.camelot_key))} · ${escapeHtml(song.camelot_key)}</span>
          ${song.version ? `<span class="badge">${escapeHtml(song.version)}</span>` : ''}
          ${song.year ? `<span class="badge">${song.year}</span>` : ''}
        </div>
        <div class="card-actions">
          <button data-view="${song.id}">Ver mezclas</button>
          ${currentUser ? `<button class="ghost" data-edit="${song.id}">Editar</button><button class="danger" data-delete="${song.id}">Borrar</button>` : ''}
        </div>
      </div>
    </article>`).join('');
  renderPagination(list.length);
}
function compatibleKeyScore(a, b) {
  return harmonicRelation(a, b).score;
}

function bpmRelation(source, target) {
  const a = Number(source), b = Number(target);
  const candidates = [
    {ratio:b/a, label:'tempo directo'},
    {ratio:(b/2)/a, label:'half-time'},
    {ratio:(b*2)/a, label:'double-time'}
  ];
  candidates.sort((x,y) => Math.abs(x.ratio-1) - Math.abs(y.ratio-1));
  const best = candidates[0];
  const pct = (best.ratio - 1) * 100;
  const abs = Math.abs(pct);
  const score = abs <= 1 ? 50 : abs <= 3 ? 44 : abs <= 6 ? 34 : abs <= 10 ? 20 : 0;
  return {score, pct, label:best.label};
}

function recommendationScore(source, target) {
  const relation = harmonicRelation(source.camelot_key, target.camelot_key);
  const bpm = bpmRelation(source.bpm, target.bpm);
  return { total:relation.score + bpm.score, keyScore:relation.score, relation, bpm };
}

function openDetails(song) {
  const matches = songs
    .filter(s => s.id !== song.id)
    .map(s => ({song:s, ...recommendationScore(song, s)}))
    .filter(x => x.relation.level !== 'none' && x.bpm.score >= 20)
    .sort((a,b) => b.total - a.total || Math.abs(a.bpm.pct) - Math.abs(b.bpm.pct))
    .slice(0, 18);

  const groups = relatedKeyGroups(song.camelot_key);
  els.dialogContent.innerHTML = `<div class="detail">
    <div class="detail-head">
      ${cover(song, 'detail-cover')}
      <div>
        <p class="eyebrow">${escapeHtml(song.camelot_key)} · ${escapeHtml(keyName(song.camelot_key))}</p>
        <h2>${escapeHtml(song.title)}</h2>
        <p class="artist">${escapeHtml(song.artist)}</p>
        <div class="badges">
          <span class="badge">${song.bpm} BPM</span>
          ${song.album ? `<span class="badge">${escapeHtml(song.album)}</span>` : ''}
          ${song.version ? `<span class="badge">${escapeHtml(song.version)}</span>` : ''}
          ${song.year ? `<span class="badge">${song.year}</span>` : ''}
        </div>
        ${song.notes ? `<p>${escapeHtml(song.notes)}</p>` : ''}
        <button type="button" class="explore-song" data-explore-key="${song.camelot_key}">Abrir en Explorador Armónico</button>
      </div>
    </div>

    <div class="detail-harmony">
      <h3>Mapa armónico</h3>
      <p class="muted">Además de la tonalidad exacta, podés probar la relativa, sus vecinas por quinta/cuarta y, si querés ampliar, las relativas de esas vecinas.</p>
      <div class="detail-relation-grid">
        ${groups.map(group => `<div class="detail-relation relation-${group.relation}"><strong>${group.title}</strong>${group.keys.map(key => `<button type="button" data-search-key="${key}">${escapeHtml(keyName(key))}<small>${key} · ${songCountForKey(key)} en catálogo</small></button>`).join('')}</div>`).join('')}
      </div>
    </div>

    <h3>Ideas para combinar</h3>
    <p class="muted">Ordenadas por cercanía armónica y de tempo. “Afinidad” es una heurística para explorar ideas, no una garantía de que dos arreglos concretos vayan a funcionar juntos.</p>
    <div class="match-list">
      ${matches.length ? matches.map(m => {
        const pct = m.bpm.pct;
        const tempo = Math.abs(pct) < .05 ? 'mismo tempo' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% (${m.bpm.label})`;
        return `<div class="match">
          <div><strong>${escapeHtml(m.song.title)} — ${escapeHtml(m.song.artist)}</strong><span class="muted">${m.song.bpm} BPM · ${escapeHtml(keyName(m.song.camelot_key))} ${m.song.camelot_key}</span><span class="match-reason ${m.relation.level}">${escapeHtml(m.relation.label)} · ${tempo}</span></div>
          <span class="score">Afinidad ${m.total}</span>
        </div>`;
      }).join('') : '<p class="muted">Todavía no hay suficientes canciones con relación armónica y BPM cercano en la base.</p>'}
    </div>
  </div>`;
  els.dialog.showModal();
}


function normalizeText(value='') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function duplicateKey(song) {
  return [song.title, song.artist, song.version || ''].map(normalizeText).join('|');
}

function normalizeHeader(value='') {
  return normalizeText(String(value).replace(/^\uFEFF/, ''))
    .replace(/[\s-]+/g, '_');
}

const HEADER_ALIASES = {
  title: ['title','titulo','cancion','song'],
  artist: ['artist','artista','interprete'],
  bpm: ['bpm','tempo'],
  tonalidad: ['tonalidad','tono','key','musical_key','camelot','camelot_key','codigo_camelot'],
  version: ['version','mix','edicion','edit'],
  album: ['album','disco'],
  year: ['year','ano','fecha'],
  cover_url: ['cover_url','cover','portada','url_portada','imagen','image'],
  notes: ['notes','notas','observaciones','comentarios']
};

function canonicalHeader(raw) {
  const h = normalizeHeader(raw);
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(h)) return canonical;
  }
  return null;
}

function delimiterScore(line, delimiter) {
  let count = 0, quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && line[i] === delimiter) count++;
  }
  return count;
}

function detectDelimiter(firstLine) {
  const candidates = [',',';','\t'];
  return candidates.sort((a,b) => delimiterScore(firstLine,b) - delimiterScore(firstLine,a))[0];
}

function parseDelimited(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const delimiter = detectDelimiter(firstLine);
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (quoted && clean[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(field); field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
  return { rows, delimiter };
}

const KEY_ALIASES = (() => {
  const map = new Map();
  const add = (camelot, ...aliases) => aliases.forEach(a => map.set(normalizeText(a).replace(/♯/g,'#').replace(/♭/g,'b'), camelot));
  KEYS.forEach(k => add(k.camelot, k.camelot, k.name));
  add('1A','Ab minor','G# minor','Ab min','G# min','Abm','G#m');
  add('1B','B major','B maj','B');
  add('2A','Eb minor','D# minor','Eb min','D# min','Ebm','D#m');
  add('2B','F# major','Gb major','F# maj','Gb maj','F#','Gb');
  add('3A','Bb minor','A# minor','Bb min','A# min','Bbm','A#m');
  add('3B','Db major','C# major','Db maj','C# maj','Db','C#');
  add('4A','F minor','F min','Fm');
  add('4B','Ab major','G# major','Ab maj','G# maj','Ab','G#');
  add('5A','C minor','C min','Cm');
  add('5B','Eb major','D# major','Eb maj','D# maj','Eb','D#');
  add('6A','G minor','G min','Gm');
  add('6B','Bb major','A# major','Bb maj','A# maj','Bb','A#');
  add('7A','D minor','D min','Dm');
  add('7B','F major','F maj','F');
  add('8A','A minor','A min','Am');
  add('8B','C major','C maj','C');
  add('9A','E minor','E min','Em');
  add('9B','G major','G maj','G');
  add('10A','B minor','B min','Bm');
  add('10B','D major','D maj','D');
  add('11A','F# minor','Gb minor','F# min','Gb min','F#m','Gbm');
  add('11B','A major','A maj','A');
  add('12A','C# minor','Db minor','C# min','Db min','C#m','Dbm');
  add('12B','E major','E maj','E');
  return map;
})();

function resolveCamelot(value) {
  const raw = String(value || '').trim();
  const compact = raw.toUpperCase().replace(/\s+/g,'');
  if (/^(?:[1-9]|1[0-2])[AB]$/.test(compact)) return compact;
  const key = normalizeText(raw).replace(/♯/g,'#').replace(/♭/g,'b');
  return KEY_ALIASES.get(key) || null;
}

function parseImportedRows(text) {
  const { rows } = parseDelimited(text);
  if (rows.length < 2) throw new Error('El archivo no tiene filas de datos.');

  const headerMap = rows[0].map(canonicalHeader);
  const required = ['title','artist','bpm','tonalidad'];
  const missing = required.filter(field => !headerMap.includes(field));
  if (missing.length) {
    const labels = {title:'título', artist:'artista', bpm:'bpm', tonalidad:'tonalidad'};
    throw new Error('Faltan columnas obligatorias: ' + missing.map(x => labels[x]).join(', ') + '.');
  }

  const existing = new Set(songs.map(duplicateKey));
  const seenInFile = new Set();

  return rows.slice(1).map((cells, idx) => {
    const raw = {};
    headerMap.forEach((field, i) => { if (field) raw[field] = String(cells[i] ?? '').trim(); });
    const errors = [];
    const bpm = Number(String(raw.bpm || '').replace(',', '.'));
    const year = raw.year ? Number(String(raw.year).trim()) : null;
    const camelot = resolveCamelot(raw.tonalidad);

    if (!raw.title) errors.push('Falta título');
    if (!raw.artist) errors.push('Falta artista');
    if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) errors.push('BPM inválido');
    if (!camelot) errors.push('Tonalidad inválida');
    if (raw.year && (!Number.isInteger(year) || year < 1900 || year > 2100)) errors.push('Año inválido');

    const song = {
      title: raw.title || '',
      artist: raw.artist || '',
      bpm: Number.isFinite(bpm) ? bpm : null,
      camelot_key: camelot || '',
      version: raw.version || null,
      album: raw.album || null,
      year: raw.year && Number.isInteger(year) ? year : null,
      cover_url: raw.cover_url || null,
      notes: raw.notes || null
    };

    const key = duplicateKey(song);
    const duplicate = !errors.length && (existing.has(key) || seenInFile.has(key));
    if (!errors.length && !seenInFile.has(key)) seenInFile.add(key);

    return { rowNumber: idx + 2, song, errors, duplicate };
  }).filter(item => Object.values(item.song).some(v => v !== null && v !== ''));
}

function importStats() {
  const valid = csvImportRows.filter(r => !r.errors.length);
  const invalid = csvImportRows.filter(r => r.errors.length);
  const duplicates = valid.filter(r => r.duplicate);
  const importable = valid.filter(r => !(els.skipDuplicates.checked && r.duplicate));
  return { valid, invalid, duplicates, importable };
}

function renderImportPreview() {
  if (!csvImportRows.length) return clearImport(false);
  const { valid, invalid, duplicates, importable } = importStats();
  els.importSummary.classList.remove('hidden');
  els.importSummary.innerHTML = `
    <span class="summary-pill">${csvImportRows.length} filas</span>
    <span class="summary-pill ok">${valid.length} válidas</span>
    <span class="summary-pill warn">${duplicates.length} duplicadas</span>
    <span class="summary-pill bad">${invalid.length} con errores</span>
    <span class="summary-pill ok">${importable.length} para importar</span>`;

  const preview = csvImportRows.slice(0, 15);
  els.importPreview.classList.remove('hidden');
  els.importPreview.innerHTML = `<table class="import-table">
    <thead><tr><th>Fila</th><th>Estado</th><th>Título</th><th>Artista</th><th>BPM</th><th>Tonalidad</th><th>Versión</th><th>Álbum</th><th>Año</th></tr></thead>
    <tbody>${preview.map(r => {
      const status = r.errors.length
        ? `<span class="row-error">${escapeHtml(r.errors.join(' · '))}</span>`
        : r.duplicate
          ? '<span class="row-duplicate">Duplicada</span>'
          : '<span class="row-ok">Lista</span>';
      return `<tr><td>${r.rowNumber}</td><td>${status}</td><td>${escapeHtml(r.song.title)}</td><td>${escapeHtml(r.song.artist)}</td><td>${r.song.bpm ?? '—'}</td><td>${r.song.camelot_key ? `${escapeHtml(keyName(r.song.camelot_key))} · ${r.song.camelot_key}` : '—'}</td><td>${escapeHtml(r.song.version || '—')}</td><td>${escapeHtml(r.song.album || '—')}</td><td>${r.song.year || '—'}</td></tr>`;
    }).join('')}</tbody>
  </table>${csvImportRows.length > preview.length ? `<div class="import-note">Vista previa de las primeras ${preview.length} filas. Se procesarán las ${csvImportRows.length} filas.</div>` : ''}`;
  els.importControls.classList.remove('hidden');
  els.importCsvBtn.disabled = importable.length === 0;
  els.importCsvBtn.textContent = `Importar ${importable.length} canción${importable.length === 1 ? '' : 'es'}`;
}

async function handleCsvFile() {
  const file = els.csvFile.files?.[0];
  if (!file) return clearImport();
  els.csvFileName.textContent = file.name;
  try {
    const text = await file.text();
    csvImportRows = parseImportedRows(text);
    if (!csvImportRows.length) throw new Error('No encontré canciones en el archivo.');
    hideStatus();
    renderImportPreview();
  } catch (error) {
    csvImportRows = [];
    els.importSummary.classList.add('hidden');
    els.importPreview.classList.add('hidden');
    els.importControls.classList.add('hidden');
    showStatus('No pude leer el CSV: ' + error.message, true);
  }
}

function clearImport(resetFile = true) {
  csvImportRows = [];
  if (resetFile && els.csvFile) els.csvFile.value = '';
  if (els.csvFileName) els.csvFileName.textContent = 'Ningún archivo seleccionado.';
  els.importSummary?.classList.add('hidden');
  els.importPreview?.classList.add('hidden');
  els.importControls?.classList.add('hidden');
  if (els.importPreview) els.importPreview.innerHTML = '';
  if (els.importSummary) els.importSummary.innerHTML = '';
}

async function importCsvSongs() {
  if (!currentUser || !sb) return;
  const { importable } = importStats();
  if (!importable.length) return;
  if (!confirm(`¿Importar ${importable.length} canción${importable.length === 1 ? '' : 'es'} al catálogo?`)) return;

  const originalText = els.importCsvBtn.textContent;
  els.importCsvBtn.disabled = true;
  let imported = 0;
  try {
    const payloads = importable.map(r => r.song);
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await sb.from('songs').insert(chunk);
      if (error) throw error;
      imported += chunk.length;
      els.importCsvBtn.textContent = `Importando… ${imported}/${payloads.length}`;
    }
    showStatus(`${imported} canción${imported === 1 ? '' : 'es'} importada${imported === 1 ? '' : 's'} correctamente.`);
    clearImport();
    await loadSongs();
  } catch (error) {
    showStatus(`La importación se detuvo después de ${imported} canciones: ${error.message}`, true);
    els.importCsvBtn.disabled = false;
    els.importCsvBtn.textContent = originalText;
  }
}

async function updateAuthUI() {
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  currentUser = data.user || null;
  els.loginBox.classList.toggle('hidden', Boolean(currentUser));
  els.songForm.classList.toggle('hidden', !currentUser);
  els.importBox.classList.toggle('hidden', !currentUser);
  els.metadataBox.classList.toggle('hidden', !currentUser);
  if (!currentUser) resetMetadataLookup();
  els.logoutBtn.classList.toggle('hidden', !currentUser);
  render();
}

async function login() {
  if (!sb) return showStatus('Primero conectá Supabase en config.js.', true);
  const { error } = await sb.auth.signInWithPassword({ email: els.email.value.trim(), password: els.password.value });
  if (error) return showStatus('No pude iniciar sesión: ' + error.message, true);
  hideStatus();
  await updateAuthUI();
}

async function logout() {
  await sb?.auth.signOut();
  currentUser = null;
  resetForm();
  await updateAuthUI();
}

function resetForm() {
  els.songForm.reset();
  els.songId.value = '';
  els.cancelEdit.classList.add('hidden');
  resetMetadataLookup();
}

function editSong(song) {
  els.songId.value = song.id;
  els.title.value = song.title || '';
  els.artist.value = song.artist || '';
  els.bpm.value = song.bpm || '';
  els.key.value = song.camelot_key || '';
  els.version.value = song.version || '';
  els.album.value = song.album || '';
  els.year.value = song.year || '';
  els.coverUrl.value = song.cover_url || '';
  els.notes.value = song.notes || '';
  els.cancelEdit.classList.remove('hidden');
  resetMetadataLookup();
  els.metaSong.value = song.title || '';
  els.metaArtist.value = song.artist || '';
  els.adminPanel.scrollIntoView({behavior:'smooth'});
}

async function saveSong(event) {
  event.preventDefault();
  if (!currentUser) return;
  const payload = {
    title: els.title.value.trim(), artist: els.artist.value.trim(), bpm: Number(els.bpm.value),
    camelot_key: els.key.value, version: els.version.value.trim() || null, album: els.album.value.trim() || null,
    year: els.year.value ? Number(els.year.value) : null,
    cover_url: els.coverUrl.value.trim() || null, notes: els.notes.value.trim() || null
  };
  const id = els.songId.value;
  const query = id ? sb.from('songs').update(payload).eq('id', id) : sb.from('songs').insert(payload);
  const { error } = await query;
  if (error) return showStatus('No pude guardar: ' + error.message, true);
  showStatus(id ? 'Canción actualizada.' : 'Canción agregada.');
  resetForm();
  await loadSongs();
}

async function deleteSong(id) {
  if (!currentUser || !confirm('¿Borrar esta canción?')) return;
  const { error } = await sb.from('songs').delete().eq('id', id);
  if (error) return showStatus('No pude borrar: ' + error.message, true);
  await loadSongs();
}


// V1.5 · Autocompletado: sólo propone datos; jamás guarda ni modifica BPM/key.
function metaMessage(message, error = false) {
  els.metaStatus.textContent = message;
  els.metaStatus.classList.toggle('metadata-error', error);
}
function resetMetadataLookup(clearQuery = false) {
  metadataCandidates = [];
  chosenMetadata = null;
  chosenRelease = null;
  metadataCoverReady = false;
  ++metadataCoverCheck; // descarta eventos tardíos de imágenes antiguas
  els.metaResults.innerHTML = '';
  els.metaResults.classList.add('hidden');
  els.metaReview.classList.add('hidden');
  els.metaOverwrite.checked = false;
  if (clearQuery) { els.metaSong.value = ''; els.metaArtist.value = ''; }
  metaMessage('Buscá una canción o usá el título y artista que ya escribiste.');
}
function metadataLoading(loading) {
  metadataBusy = loading;
  els.metaSearchBtn.disabled = loading;
  els.metaFromForm.disabled = loading;
  els.metaApplyBtn.disabled = loading;
  els.metaResults.querySelectorAll('button').forEach(btn => btn.disabled = loading);
}
async function metadataInvoke(body) {
  // La Edge Function valida que exista sesión; nunca usa una clave secreta en el navegador.
  const { data, error } = await sb.functions.invoke('music-metadata', { body });
  if (error) {
    let message = error.message || 'No pude consultar MusicBrainz.';
    if (error.context instanceof Response) {
      const details = await error.context.clone().json().catch(() => null);
      message = details?.error || details?.message || message;
      if (error.context.status === 404) message = 'Falta instalar la función music-metadata en Supabase. Seguí el README.';
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
async function searchMetadata() {
  if (!currentUser || metadataBusy) return;
  const title = els.metaSong.value.trim();
  const artist = els.metaArtist.value.trim();
  if (!title || !artist) return metaMessage('Completá canción y artista para buscar.', true);
  resetMetadataLookup();
  metaMessage(`Buscando «${title}» de ${artist}…`);
  metadataLoading(true);
  try {
    const response = await metadataInvoke({ action: 'search', title, artist });
    metadataCandidates = Array.isArray(response?.results) ? response.results : [];
    if (!metadataCandidates.length) return metaMessage('No hubo coincidencias. Probá un título más corto o revisá la escritura.');
    els.metaResults.innerHTML = metadataCandidates.map((item, i) => `
      <button type="button" class="metadata-result" data-meta-pick="${i}">
        <span class="metadata-result-icon">♫</span><span><strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.artist)}${item.comment ? ' · ' + escapeHtml(item.comment) : ''}${item.firstDate ? ' · ' + escapeHtml(item.firstDate.slice(0,4)) : ''}</small></span>
        <span class="metadata-arrow">Elegir ↗</span>
      </button>`).join('');
    els.metaResults.classList.remove('hidden');
    metaMessage(`Encontré ${metadataCandidates.length} grabaciones. Elegí la que corresponda.`);
  } catch (error) {
    metaMessage(`No se pudo buscar: ${error.message}`, true);
  } finally {
    metadataLoading(false);
  }
}
function releaseLabel(item) {
  return [item.album || 'Sin título de álbum', item.kind ? `(${item.kind})` : '', item.year || ''].filter(Boolean).join(' ');
}
function updateReleasePreview() {
  if (!chosenMetadata) return;
  chosenRelease = chosenMetadata.releases[Number(els.metaRelease.value)] || null;
  const album = chosenRelease?.album || 'Sin información de álbum';
  const year = chosenRelease?.year || chosenMetadata.firstDate?.slice(0, 4) || '';
  els.metaYearPreview.textContent = `Álbum: ${album}${year ? ` · Año sugerido: ${year}` : ' · Año: sin información'}`;
  metadataCoverReady = false;
  const token = ++metadataCoverCheck;
  els.metaArt.innerHTML = '<div class="metadata-art-placeholder">♫</div>';
  const url = chosenRelease?.cover || '';
  if (!url) return void (els.metaCoverState.textContent = 'No hay portada asociada; podés ingresar una URL manualmente.');
  els.metaCoverState.textContent = 'Comprobando si esta portada está disponible…';
  const img = new Image();
  img.alt = `Portada de ${album}`;
  img.onload = () => {
    if (token !== metadataCoverCheck) return;
    metadataCoverReady = true;
    els.metaArt.replaceChildren(img);
    els.metaCoverState.textContent = 'Portada disponible ✓';
  };
  img.onerror = () => {
    if (token !== metadataCoverCheck) return;
    els.metaCoverState.textContent = 'No se encontró portada para este lanzamiento. Podés elegir otro o pegarla manualmente.';
  };
  img.src = url;
}
async function selectMetadata(index) {
  if (!currentUser || metadataBusy || !metadataCandidates[index]) return;
  metadataLoading(true);
  metaMessage('Consultando álbumes y versiones de esta grabación…');
  try {
    const item = metadataCandidates[index];
    const data = await metadataInvoke({ action: 'details', id: item.id });
    chosenMetadata = data;
    if (!Array.isArray(chosenMetadata.releases)) chosenMetadata.releases = [];
    els.metaChosenTitle.textContent = data.title || item.title;
    els.metaChosenArtist.textContent = data.artist || item.artist;
    els.metaRelease.innerHTML = chosenMetadata.releases.length
      ? chosenMetadata.releases.map((release, i) => `<option value="${i}">${escapeHtml(releaseLabel(release))}</option>`).join('')
      : '<option value="0">No se encontraron álbumes; completar a mano</option>';
    els.metaReview.classList.remove('hidden');
    updateReleasePreview();
    metaMessage('Revisá la versión, el álbum, el año y la portada antes de aplicar.');
  } catch (error) {
    metaMessage(`No se pudieron consultar los detalles: ${error.message}`, true);
  } finally {
    metadataLoading(false);
  }
}
function applyMetadata() {
  if (!currentUser || !chosenMetadata || metadataBusy) return;
  const overwrite = els.metaOverwrite.checked;
  const values = [
    [els.title, chosenMetadata.title], [els.artist, chosenMetadata.artist],
    [els.album, chosenRelease?.album],
    [els.year, chosenRelease?.year || chosenMetadata.firstDate?.slice(0,4)],
    [els.coverUrl, metadataCoverReady ? chosenRelease?.cover : '']
  ];
  const changed = [];
  values.forEach(([input, value]) => {
    if (value && (overwrite || !input.value.trim())) {
      input.value = value;
      changed.push(input.id);
    }
  });
  // Nunca tocar BPM, tonalidad, versión ni notas: dependen de la edición específica.
  metaMessage(changed.length
    ? 'Datos aplicados al formulario. Revisá los campos y guardá la canción cuando quieras.'
    : 'No había campos vacíos. Marcá «reemplazar» si querés sobrescribir los datos actuales.');
  els.songForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

['input','change'].forEach(evt => {
  els.search.addEventListener(evt, resetPageAndRender);
  els.bpmMin.addEventListener(evt, resetPageAndRender);
  els.bpmMax.addEventListener(evt, resetPageAndRender);
  els.sort.addEventListener(evt, resetPageAndRender);
});
els.keyFilter.addEventListener('change', () => {
  els.keyMode.disabled = !els.keyFilter.value;
  resetPageAndRender();
});
els.keyMode.addEventListener('change', resetPageAndRender);

els.clearFilters.addEventListener('click', () => {
  els.search.value=''; els.keyFilter.value=''; els.keyMode.value='exact'; els.keyMode.disabled=true;
  els.bpmMin.value=''; els.bpmMax.value=''; els.sort.value='title'; resetPageAndRender();
});
els.catalogTab.addEventListener('click', () => setView('catalog'));
els.explorerTab.addEventListener('click', () => setView('explorer'));
els.pageSize.addEventListener('change', () => {
  pageSize = Number(els.pageSize.value) || 24;
  currentPage = 1;
  render();
});
els.pageButtons.addEventListener('click', (e) => {
  const button = e.target.closest('[data-page]');
  if (!button || button.disabled) return;
  currentPage = Number(button.dataset.page) || 1;
  render();
  document.querySelector('.search-panel')?.scrollIntoView({ behavior:'smooth', block:'start' });
});
els.adminToggle.addEventListener('click', () => els.adminPanel.classList.toggle('hidden'));
els.loginBtn.addEventListener('click', login);
els.logoutBtn.addEventListener('click', logout);
els.songForm.addEventListener('submit', saveSong);
els.cancelEdit.addEventListener('click', resetForm);
els.csvFile.addEventListener('change', handleCsvFile);
els.skipDuplicates.addEventListener('change', renderImportPreview);
els.importCsvBtn.addEventListener('click', importCsvSongs);
els.clearCsvBtn.addEventListener('click', () => clearImport());
els.metaSearchBtn.addEventListener('click', searchMetadata);
els.metaFromForm.addEventListener('click', () => {
  els.metaSong.value = els.title.value.trim(); els.metaArtist.value = els.artist.value.trim();
  searchMetadata();
});
[els.metaSong, els.metaArtist].forEach(input => input.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); searchMetadata(); }
}));
els.metaResults.addEventListener('click', e => {
  const button = e.target.closest('[data-meta-pick]');
  if (button) selectMetadata(Number(button.dataset.metaPick));
});
els.metaRelease.addEventListener('change', updateReleasePreview);
els.metaApplyBtn.addEventListener('click', applyMetadata);
els.metaCancelBtn.addEventListener('click', () => resetMetadataLookup());
els.closeDialog.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', (e) => {
  if (e.target === els.dialog) return els.dialog.close();
  const explore = e.target.closest('[data-explore-key]');
  if (explore) {
    setView('explorer');
    els.harmonicKey.value = explore.dataset.exploreKey;
    renderHarmonicExplorer();
    els.dialog.close();
    els.harmonicExplorer.scrollIntoView({ behavior:'smooth', block:'start' });
    return;
  }
  const searchKey = e.target.closest('[data-search-key]');
  if (searchKey) {
    useHarmonicSearch(searchKey.dataset.searchKey, 'exact');
    els.dialog.close();
  }
});

els.harmonicKey.addEventListener('change', renderHarmonicExplorer);
els.harmonicMode.addEventListener('change', renderHarmonicExplorer);
els.harmonicWheel.addEventListener('click', (e) => {
  const keyButton = e.target.closest('[data-harmonic-key]');
  if (!keyButton) return;
  els.harmonicKey.value = keyButton.dataset.harmonicKey;
  renderHarmonicExplorer();
});
els.harmonicSummary.addEventListener('click', (e) => {
  const keyButton = e.target.closest('[data-search-key]');
  if (!keyButton) return;
  els.harmonicKey.value = keyButton.dataset.searchKey;
  renderHarmonicExplorer();
});
els.applyHarmonicFilter.addEventListener('click', () => useHarmonicSearch(els.harmonicKey.value, els.harmonicMode.value));
els.clearHarmonic.addEventListener('click', () => {
  els.harmonicKey.value = '';
  els.harmonicMode.value = 'safe';
  renderHarmonicExplorer();
});

els.songGrid.addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]');
  if (view) return openDetails(songs.find(s => String(s.id) === String(view.dataset.view)));
  const edit = e.target.closest('[data-edit]');
  if (edit) return editSong(songs.find(s => String(s.id) === String(edit.dataset.edit)));
  const del = e.target.closest('[data-delete]');
  if (del) deleteSong(del.dataset.delete);
});

initKeySelects();
setView('catalog');
renderHarmonicExplorer();
loadSongs();
updateAuthUI();
if (sb) sb.auth.onAuthStateChange(() => updateAuthUI());
