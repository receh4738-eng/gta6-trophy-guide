// Leonida Trophy Guide: a tracker for the 55 GTA VI trophies on PS5.
// Loads app/data/trophies.json, renders the checklist and the roadmap,
// and keeps progress in localStorage. No network requests besides the
// local data file; source links open only when the reader follows them.
const EARNED_KEY = 'gta6-trophy-guide-earned-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoiler-v1';

const cardsEl = document.getElementById('cards');
const emptyEl = document.getElementById('emptyState');
const resultEl = document.getElementById('resultCount');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const gradeCountsEl = document.getElementById('gradeCounts');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const hideEarnedEl = document.getElementById('hideEarned');
const kindButtons = [...document.querySelectorAll('#kindFilters .kind')];
const tabChecklist = document.getElementById('tabChecklist');
const tabRoadmap = document.getElementById('tabRoadmap');
const checklistPane = document.getElementById('checklistPane');
const roadmapPane = document.getElementById('roadmapPane');

const params = new URLSearchParams(location.search);
let kind = params.get('kind') || 'all';
let earned = new Set(loadEarned());
let spoiler = params.get('spoiler') === 'on'
  ? true
  : params.get('spoiler') === 'off'
    ? false
    : localStorage.getItem(SPOILER_KEY) === '1';
let openGuides = new Set();

function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? '1' : '0');
}

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

function gradeLabel(g) {
  return g[0].toUpperCase() + g.slice(1);
}

function isHiddenFromReader(t) {
  return spoiler && t.hidden && !earned.has(t.name);
}

function trophyMatches(t) {
  if (kind === 'story' && t.kind !== 'story') return false;
  if (kind === 'missable' && !t.missable) return false;
  if (kind === 'collectibles' && t.kind !== 'collectibles') return false;
  if (kind === 'activities' && t.kind !== 'activities') return false;
  if (kind === 'online' && !t.online) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (hideEarnedEl.checked && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = [t.name, t.description, t.guide, ...(t.steps || [])].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function makeChip(text, cls) {
  const s = document.createElement('span');
  s.className = 'chip ' + cls;
  s.textContent = text;
  return s;
}

function renderCard(t) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.trophyId = String(t.id);
  if (earned.has(t.name)) card.classList.add('earned');
  if (t.missable) card.classList.add('missable-card');

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveEarned();
    render();
  });
  const title = document.createElement('h3');
  if (isHiddenFromReader(t)) {
    const em = document.createElement('span');
    em.className = 'hidden-name';
    em.textContent = 'Hidden trophy — earn it to reveal it';
    title.append(em);
  } else {
    title.textContent = t.name;
  }
  head.append(box, title);
  card.append(head);

  const chips = document.createElement('div');
  chips.className = 'chips';
  chips.append(makeChip(gradeLabel(t.grade), t.grade));
  chips.append(makeChip(t.kind, ''));
  if (t.missable) chips.append(makeChip('Missable', 'missable'));
  if (t.hidden) chips.append(makeChip('Hidden on PS5', ''));
  if (typeof t.count === 'number') {
    chips.append(makeChip('Count: ' + t.count.toLocaleString('en-US'), 'count'));
  }
  card.append(chips);

  if (isHiddenFromReader(t)) {
    const note = document.createElement('p');
    note.className = 'spoiler-note';
    note.textContent = 'Spoiler-safe mode is on: this story trophy stays hidden until you tick it off.';
    card.append(note);
    return card;
  }

  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = t.description;
  card.append(official);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  const guideOpen = openGuides.has(t.id);
  toggle.textContent = guideOpen ? 'Hide the guide' : 'How to earn it';
  toggle.setAttribute('aria-expanded', String(guideOpen));
  const guide = document.createElement('div');
  guide.className = 'guide' + (guideOpen ? ' open' : '');
  const guideText = document.createElement('p');
  guideText.textContent = t.guide;
  guide.append(guideText);
  if (t.steps && t.steps.length) {
    const steps = document.createElement('ol');
    for (const s of t.steps) {
      const li = document.createElement('li');
      li.textContent = s;
      steps.append(li);
    }
    guide.append(steps);
  }
  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.textContent = 'Sources: ';
  t.sources.forEach((src, i) => {
    if (i > 0) sources.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = src.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = src.name;
    sources.append(a);
  });
  guide.append(sources);
  toggle.addEventListener('click', () => {
    if (openGuides.has(t.id)) openGuides.delete(t.id);
    else openGuides.add(t.id);
    render();
  });
  card.append(toggle, guide);
  return card;
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  progressFill.style.width = pct + '%';
  progressText.textContent = n + ' of ' + total + ' earned · ' + pct + '%';
  gradeCountsEl.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => gradeLabel(g) + ' ' + trophies.filter((t) => t.grade === g && earned.has(t.name)).length
      + '/' + trophies.filter((t) => t.grade === g).length)
    .join(' · ');
}

function renderRoadmap() {
  const list = document.getElementById('roadmapStages');
  list.replaceChildren();
  for (const stage of doc.roadmap) {
    const li = document.createElement('li');
    li.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = 'Stage ' + stage.stage + ' — ' + stage.title;
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = stage.time;
    h.append(time);
    const p = document.createElement('p');
    p.textContent = stage.text;
    li.append(h, p);
    const ul = document.createElement('ul');
    for (const t of trophies.filter((x) => x.roadmap === stage.stage)) {
      const item = document.createElement('li');
      if (earned.has(t.name)) item.className = 'done';
      const g = document.createElement('span');
      g.className = 'g ' + t.grade;
      g.textContent = gradeLabel(t.grade);
      item.append(g, document.createTextNode(t.name));
      ul.append(item);
    }
    li.append(ul);
    list.append(li);
  }
}

function render() {
  renderProgress();
  const visible = trophies.filter(trophyMatches);
  cardsEl.replaceChildren(...visible.map(renderCard));
  resultEl.textContent = visible.length === trophies.length
    ? 'Showing all ' + trophies.length + ' trophies.'
    : 'Showing ' + visible.length + ' of ' + trophies.length + ' trophies.';
  if (visible.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = kind === 'online'
      ? 'There are no online trophies: all 55 are single-player and offline, so this filter is empty by design.'
      : 'No trophies match these filters. Clear the search or pick another kind.';
  } else {
    emptyEl.hidden = true;
  }
  renderRoadmap();
  window.__guideReady = true;
}

function setTab(which) {
  const roadmap = which === 'roadmap';
  tabChecklist.classList.toggle('active', !roadmap);
  tabRoadmap.classList.toggle('active', roadmap);
  tabChecklist.removeAttribute('aria-current');
  tabRoadmap.removeAttribute('aria-current');
  (roadmap ? tabRoadmap : tabChecklist).setAttribute('aria-current', 'page');
  checklistPane.hidden = roadmap;
  roadmapPane.hidden = !roadmap;
}

tabChecklist.addEventListener('click', () => setTab('checklist'));
tabRoadmap.addEventListener('click', () => setTab('roadmap'));

kindButtons.forEach((b) => {
  b.addEventListener('click', () => {
    kind = b.dataset.kind;
    kindButtons.forEach((x) => x.classList.toggle('active', x === b));
    render();
  });
});
searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
hideEarnedEl.addEventListener('change', render);
spoilerEl.addEventListener('change', () => {
  spoiler = spoilerEl.checked;
  saveSpoiler();
  render();
});

document.getElementById('export').addEventListener('click', () => {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
    spoiler,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('bad file');
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    if (typeof data.spoiler === 'boolean') {
      spoiler = data.spoiler;
      spoilerEl.checked = spoiler;
      saveSpoiler();
    }
    saveEarned();
    render();
  } catch {
    resultEl.textContent = 'That file could not be imported: it is not a progress export from this guide.';
  }
  e.target.value = '';
});

// Deep links: ?tab=roadmap, ?kind=missable, ?spoiler=on, ?trophy=17
kindButtons.forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
spoilerEl.checked = spoiler;
if (params.get('tab') === 'roadmap') setTab('roadmap');
render();
const focusId = Number(params.get('trophy') || 0);
if (focusId) {
  openGuides.add(focusId);
  render();
  const el = cardsEl.querySelector('[data-trophy-id="' + focusId + '"]');
  if (el) el.scrollIntoView({ block: 'start' });
}
