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

const config = window.APP_CONFIG || {};
const publicKey = config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY || '';
const hasConfig = Boolean(config.SUPABASE_URL && publicKey);
const sb = hasConfig ? window.supabase.createClient(config.SUPABASE_URL, publicKey) : null;

let songs = [];
let currentUser = null;

const $ = (id) => document.getElementById(id);
const els = {
  search: $('search'), keyFilter: $('keyFilter'), bpmMin: $('bpmMin'), bpmMax: $('bpmMax'), sort: $('sort'),
  clearFilters: $('clearFilters'), resultCount: $('resultCount'), songGrid: $('songGrid'), status: $('status'),
  adminToggle: $('adminToggle'), adminPanel: $('adminPanel'), loginBox: $('loginBox'), songForm: $('songForm'),
  email: $('email'), password: $('password'), loginBtn: $('loginBtn'), logoutBtn: $('logoutBtn'),
  songId: $('songId'), title: $('title'), artist: $('artist'), bpm: $('bpm'), key: $('key'), version: $('version'), album: $('album'), year: $('year'), coverUrl: $('coverUrl'), notes: $('notes'),
  cancelEdit: $('cancelEdit'), dialog: $('songDialog'), dialogContent: $('dialogContent'), closeDialog: $('closeDialog')
};

function initKeySelects() {
  const options = KEYS.map(k => `<option value="${k.camelot}">${k.name} · ${k.camelot}</option>`).join('');
  els.key.innerHTML = '<option value="">Elegí una tonalidad</option>' + options;
  els.keyFilter.innerHTML = '<option value="">Todas</option>' + options;
}

function showStatus(message, error = false) {
  els.status.textContent = message;
  els.status.classList.remove('hidden', 'error');
  if (error) els.status.classList.add('error');
}
function hideStatus() { els.status.classList.add('hidden'); }

function keyName(camelot) { return KEYS.find(k => k.camelot === camelot)?.name || camelot || '—'; }

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
  const { data, error } = await sb.from('songs').select('*').order('artist').order('title');
  if (error) return showStatus('No pude cargar las canciones: ' + error.message, true);
  songs = data || [];
  render();
}

function filteredSongs() {
  const q = els.search.value.trim().toLowerCase();
  const key = els.keyFilter.value;
  const min = parseFloat(els.bpmMin.value);
  const max = parseFloat(els.bpmMax.value);
  let list = songs.filter(song => {
    const haystack = [song.title, song.artist, song.version, song.album, song.year, song.bpm, song.camelot_key, keyName(song.camelot_key)].join(' ').toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (key && song.camelot_key !== key) return false;
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

function render() {
  const list = filteredSongs();
  els.resultCount.textContent = `${list.length} canción${list.length === 1 ? '' : 'es'}`;
  if (!list.length) {
    els.songGrid.innerHTML = `<div class="empty">No hay resultados con esos filtros.</div>`;
    return;
  }
  els.songGrid.innerHTML = list.map(song => `
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
}

function compatibleKeyScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 50;
  const na = parseInt(a), nb = parseInt(b), la = a.slice(-1), lb = b.slice(-1);
  const circularDistance = Math.min(Math.abs(na-nb), 12-Math.abs(na-nb));
  if (la === lb && circularDistance === 1) return 42; // vecino Camelot
  if (na === nb && la !== lb) return 40; // relativo mayor/menor
  return 0;
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
  const keyScore = compatibleKeyScore(source.camelot_key, target.camelot_key);
  const bpm = bpmRelation(source.bpm, target.bpm);
  return { total:keyScore + bpm.score, keyScore, bpm };
}

function openDetails(song) {
  const matches = songs
    .filter(s => s.id !== song.id)
    .map(s => ({song:s, ...recommendationScore(song, s)}))
    .filter(x => x.total >= 45)
    .sort((a,b) => b.total - a.total)
    .slice(0, 12);

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
      </div>
    </div>
    <h3>Ideas para combinar</h3>
    <p class="muted">La compatibilidad prioriza misma tonalidad, vecinos/relativos de Camelot y BPM cercano, incluyendo half-time y double-time.</p>
    <div class="match-list">
      ${matches.length ? matches.map(m => {
        const pct = m.bpm.pct;
        const tempo = Math.abs(pct) < .05 ? 'mismo tempo' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% (${m.bpm.label})`;
        const keyReason = m.keyScore === 50 ? 'misma tonalidad' : m.keyScore === 42 ? 'tono vecino Camelot' : m.keyScore === 40 ? 'relativo mayor/menor' : 'BPM compatible';
        return `<div class="match">
          <div><strong>${escapeHtml(m.song.title)} — ${escapeHtml(m.song.artist)}</strong><span class="muted">${m.song.bpm} BPM · ${escapeHtml(keyName(m.song.camelot_key))} ${m.song.camelot_key} · ${keyReason} · ${tempo}</span></div>
          <span class="score">${m.total}%</span>
        </div>`;
      }).join('') : '<p class="muted">Todavía no hay suficientes canciones compatibles en la base.</p>'}
    </div>
  </div>`;
  els.dialog.showModal();
}

async function updateAuthUI() {
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  currentUser = data.user || null;
  els.loginBox.classList.toggle('hidden', Boolean(currentUser));
  els.songForm.classList.toggle('hidden', !currentUser);
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

['input','change'].forEach(evt => {
  els.search.addEventListener(evt, render);
  els.keyFilter.addEventListener(evt, render);
  els.bpmMin.addEventListener(evt, render);
  els.bpmMax.addEventListener(evt, render);
  els.sort.addEventListener(evt, render);
});

els.clearFilters.addEventListener('click', () => { els.search.value=''; els.keyFilter.value=''; els.bpmMin.value=''; els.bpmMax.value=''; els.sort.value='title'; render(); });
els.adminToggle.addEventListener('click', () => els.adminPanel.classList.toggle('hidden'));
els.loginBtn.addEventListener('click', login);
els.logoutBtn.addEventListener('click', logout);
els.songForm.addEventListener('submit', saveSong);
els.cancelEdit.addEventListener('click', resetForm);
els.closeDialog.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', (e) => { if (e.target === els.dialog) els.dialog.close(); });
els.songGrid.addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]');
  if (view) return openDetails(songs.find(s => String(s.id) === String(view.dataset.view)));
  const edit = e.target.closest('[data-edit]');
  if (edit) return editSong(songs.find(s => String(s.id) === String(edit.dataset.edit)));
  const del = e.target.closest('[data-delete]');
  if (del) deleteSong(del.dataset.delete);
});

initKeySelects();
loadSongs();
updateAuthUI();
if (sb) sb.auth.onAuthStateChange(() => updateAuthUI());
