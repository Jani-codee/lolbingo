/* ====== Webes Bingó – kombinált tábla több játékostól ====== */

// ---- Előre definiált játékosok és saját szókészletük
const PLAYER_PRESETS = {
  "Ádám": [
    "Sprint demo", "Code review", "Bugfix", "Refaktor", "Merging", "Ticket csúszik",
    "„Nézzük meg gyorsan”", "CI lefutott", "Deploy", "„Ez edge-case”", "TDD",
    "„Majd backlog”", "Meeting elhúzódik", "Kamera off", "Késés", "Chat ping",
    "Release note", "„Nem reprodukálható”", "Hotfix", "Pair programming", "Lint hiba",
    "PR sablon", "Staging", "„Újraindítottam”", "Spec hiányos"
  ],
  "Bea": [
    "Marketing slide", "Kampányterv", "CTA változtatás", "A/B teszt", "„Megkérdezem a csapatot”",
    "Szerkesztési jog", "Kezdőlap frissítés", "„Később posztoljuk”", "Link rövidítése",
    "„Ezt még jóvá kell hagyni”", "UAT", "Teszt felhasználó", "„Küldöm a linket”",
    "Árajánlat", "Persona", "„Nincs elég adat”", "Workshop", "Hírlevél", "KPI",
    "Wireframe", "„Van erről stat?”", "Jóváhagyás", "Brief", "Landing", "Benchmark"
  ],
  "Csaba": [
    "Szerver restarthoz kell jog", "Log elemzés", "CPU spike", "Mem leak gyanú",
    "„Nála működik”", "Késő este deploy", "Rollback", "Config mismatch",
    "„Majd cronból megy”", "Rate limit", "„Átmeneti hiba”", "Alert jött",
    "DNS cache", "„Átlagos terhelés”", "Failover", "Healthcheck", "„Kézzel patcheltem”",
    "Kibana", "Grafana", "„Rögtön nézem”", "SSH", "„Státusz oldalt nézted?”",
    "Timeout", "„Kint van az incident”", "Root cause"
  ],
  "Dóri": [
    "User interjú", "Persona update", "Journey map", "Affinity diagram",
    "„Papíron jobban nézett ki”", "Tap target kicsi", "„Mobile first”",
    "Figma frissítés", "Spacing", "„Sötét mód mikor?”", "Kontraszt kevés",
    "„Ez túl zajos”", "Szegmens", "Heatmap", "FigJam", "„Ez nem fér ki”",
    "„Amikor a user...”", "AB teszt terv", "„Fájlrendszer?”", "Komponens könyvtár",
    "„Nem konzisztens”", "Spacing token", "„12 oszlopos grid”", "„Rendszer ikon?”", "Prototípus"
  ],
  "Emőke": [
    "Pénzügyi riport", "Budget cut", "Forecast", "„Szoros a keret”", "ROI",
    "„Backlog prioritás”", "SLA", "„Scope csökkentés”", "Risk", "„Roadmap csúszik”",
    "„Stakeholder review”", "High-level", "OKR", "„Ezt mérjük?”", "„Ez nem fér bele”",
    "„Szállítási dátum?”", "„Melyik quarter?”", "„Pingeld meg őket”", "Approval",
    "Contract", "„Vendor válaszolt?”", "„QBR”", "„RACI”", "„Mit mond a PMO?”", "„Escalation”"
  ]
};

const BOARD_SIZE = 5;
const STORAGE_KEY = "hu-bingo-combined-v1";

const $ = (sel, root=document) => root.querySelector(sel);

// ---- Segédek
function seededRandom(seed){
  function xmur3(str){ let h=1779033703 ^ str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h ^ str.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19); } return function(){ h=Math.imul(h ^ (h>>>16),2246822507); h=Math.imul(h ^ (h>>>13),3266489909); h^=h>>>16; return h>>>0; } }
  function sfc32(a,b,c,d){ return function(){ a>>>=0;b>>=0;c>>=0;d>>=0; let t=(a+b)|0; a=b^(b>>>9); b=(c+(c<<3))|0; c=(c<<21|c>>>11); d=(d+1)|0; t=(t+d)|0; c=(c+t)|0; return (t>>>0)/4294967296; } }
  const f=xmur3(String(seed)); return sfc32(f(),f(),f(),f());
}
function shuffle(arr, rand=Math.random){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [a[i], a[j]]=[a[j], a[i]]; } return a; }

// ===== Dinamikus illesztés mobilra
function fitToViewport(){
  const header = document.querySelector('.app-header');
  const footer = document.querySelector('.app-footer');
  const board  = document.getElementById('board');
  if(!header || !footer || !board) return;

  const vh = (window.visualViewport?.height) || window.innerHeight;
  const bodyStyles  = getComputedStyle(document.body);
  const boardStyles = getComputedStyle(board);

  const gap        = parseFloat(boardStyles.gap) || 0;
  const padTop     = parseFloat(boardStyles.paddingTop) || 0;
  const padBottom  = parseFloat(boardStyles.paddingBottom) || 0;
  const bodyTop    = parseFloat(bodyStyles.paddingTop) || 0;
  const bodyBottom = parseFloat(bodyStyles.paddingBottom) || 0;

  const rows = 5;
  const available = vh - header.offsetHeight - footer.offsetHeight - bodyTop - bodyBottom - padTop - padBottom;
  const cellH = Math.max(52, Math.floor((available - gap * (rows - 1)) / rows));
  document.documentElement.style.setProperty('--cell-h',  cellH + 'px');
  document.documentElement.style.setProperty('--cell-fs', Math.max(11, Math.min(18, Math.floor(cellH * 0.26))) + 'px');
}

// ===== Állapot
const state = {
  selectedPlayers: [],  // ["Ádám","Bea",...]
  cells: []             // [{text, owner, marked} * 25]
};

function countBingos(cells){
  const size = BOARD_SIZE, g = i => cells[i].marked?1:0; let lines=0;
  for(let r=0;r<size;r++){ let ok=true; for(let c=0;c<size;c++){ if(!g(r*size+c)){ok=false;break;} } if(ok) lines++; }
  for(let c=0;c<size;c++){ let ok=true; for(let r=0;r<size;r++){ if(!g(r*size+c)){ok=false;break;} } if(ok) lines++; }
  { let ok=true; for(let i=0;i<size;i++){ if(!g(i*size+i)){ok=false;break;} } if(ok) lines++; }
  { let ok=true; for(let i=0;i<size;i++){ if(!g(i*size+(size-1-i))){ok=false;break;} } if(ok) lines++; }
  return lines;
}

function buildCombinedCells(names, seed=""){
  const k = names.length;
  const rand = seed ? seededRandom(seed) : Math.random;
  // cél eloszlás: minél egyenletesebb
  const base = Math.floor(25 / k);
  let rem = 25 % k;
  const order = shuffle([...names], rand); // a többlet kiosztás sorrendje
  const quotas = Object.fromEntries(names.map(n => [n, base]));
  for(let i=0;i<rem;i++){ quotas[order[i]]++; }

  // játékosonként keverünk, kvótát veszünk
  let pool = [];
  names.forEach(n => {
    const words = shuffle(PLAYER_PRESETS[n], rand).slice(0, quotas[n]);
    pool.push(...words.map(w => ({text:w, owner:n})));
  });

  // Ha valamiért kevesebb lett (nem lesz), pótoljuk; ha több, vágjuk 25-re
  pool = shuffle(pool, rand).slice(0, 25);

  // cellák generálása (nincs szabad közép)
  return pool.map(item => ({ text: item.text, owner: item.owner, marked: false }));
}

function renderBoard(){
  const board = document.getElementById('board');
  board.innerHTML = "";
  const tpl = document.getElementById('cellTemplate');

  state.cells.forEach((cell, idx)=>{
    const btn = tpl.content.firstElementChild.cloneNode(true);
    btn.innerHTML = `<div class="txt">${cell.text}</div><span class="owner"></span>`;
    btn.querySelector('.owner').textContent = cell.owner;
    // owner színindexe a kiválasztottak sorrendje alapján
    const colorIdx = state.selectedPlayers.indexOf(cell.owner) % 5;
    btn.querySelector('.owner').classList.add('c'+colorIdx);
    btn.setAttribute('aria-pressed', String(!!cell.marked));
    btn.addEventListener('click', ()=>{
      const marked = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!marked));
      state.cells[idx].marked = !marked;
      updateStatus();
      saveState();
    });
    board.appendChild(btn);
  });
}

function saveState(){
  const save = { selectedPlayers: state.selectedPlayers, cells: state.cells };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}
function loadState(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }catch{ return null; }
}

function updateStatus(){
  const lines = countBingos(state.cells);
  const pickLabel = state.selectedPlayers.length ? " – " + state.selectedPlayers.join(", ") : "";
  document.getElementById('status').textContent = `${lines} bingóvonal${pickLabel}`;
}

function rebuildBoard(seed=""){
  state.cells = buildCombinedCells(state.selectedPlayers, seed);
  renderBoard();
  updateStatus();
  saveState();
  fitToViewport();
}

// ===== Játékos választó
function buildPicker(){
  const list = document.getElementById('pickerList');
  list.innerHTML = "";
  Object.keys(PLAYER_PRESETS).forEach(name => {
    const item = document.createElement('label');
    item.className = 'picker-item';
    const checked = state.selectedPlayers.includes(name) ? 'checked' : '';
    item.innerHTML = `<input type="checkbox" name="pick" value="${name}" ${checked}><span>${name}</span>`;
    list.appendChild(item);
  });
}

function openPicker(){
  buildPicker();
  const dlg = document.getElementById('playerPicker');
  dlg.showModal?.();
}

/* ===== Fejléc overflow menü ===== */
function setupMenu(){
  const btn = document.getElementById('moreBtn');
  const menu = document.getElementById('moreMenu');
  if(!btn || !menu) return;
  function close(){ menu.hidden = true; btn.setAttribute('aria-expanded','false'); }
  function open(){ menu.hidden = false; btn.setAttribute('aria-expanded','true'); }
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener('click', (e)=>{ if(menu.hidden) return; if(!menu.contains(e.target) && e.target !== btn) close(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });
}

/* ===== Fő ===== */
document.addEventListener("DOMContentLoaded", ()=>{
  setupMenu();

  // Gombok
  document.getElementById('newCardBtn').addEventListener('click', ()=> rebuildBoard(""));
  document.getElementById('resetMarksBtn').addEventListener('click', ()=>{
    state.cells = state.cells.map(c => ({...c, marked:false}));
    renderBoard();
    updateStatus();
    saveState();
  });
  document.getElementById('printBtn').addEventListener('click', ()=> window.print());
  document.getElementById('shareBtn').addEventListener('click', ()=>{
    try{
      const payload = { players: state.selectedPlayers };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const url = `${location.origin}${location.pathname}?p=${b64}`;
      navigator.clipboard?.writeText(url);
      alert("Link vágólapra másolva!");
    }catch{}
  });
  document.getElementById('pickPlayersBtn').addEventListener('click', ()=>{
    document.getElementById('moreMenu').hidden = true;
    openPicker();
  });

  // Picker ok/cancel
  const picker = document.getElementById('playerPicker');
  document.getElementById('pickerOk').addEventListener('click', (e)=>{
    const names = Array.from(document.querySelectorAll('input[name="pick"]:checked')).map(i=>i.value);
    if(names.length < 3 || names.length > 5){
      e.preventDefault();
      alert("Válassz 3 és 5 fő között!");
      return;
    }
    picker.close();
    state.selectedPlayers = names;
    rebuildBoard("");
  });
  document.getElementById('pickerCancel').addEventListener('click', ()=> picker.close());

  // URL vagy mentett állapot
  const params = new URLSearchParams(location.search);
  const p64 = params.get("p");
  const saved = loadState();

  if(p64){
    try{
      const decoded = decodeURIComponent(escape(atob(p64)));
      const data = JSON.parse(decoded);
      const names = (data.players||[]).filter(n => PLAYER_PRESETS[n]);
      if(names.length >= 3 && names.length <= 5){
        state.selectedPlayers = names;
        rebuildBoard("");
        return;
      }
    }catch{}
  }

  if(saved && Array.isArray(saved.selectedPlayers) && saved.selectedPlayers.length){
    state.selectedPlayers = saved.selectedPlayers.filter(n => PLAYER_PRESETS[n]);
    state.cells = (saved.cells||[]).filter(Boolean);
    if(state.cells.length === 25){
      renderBoard(); updateStatus(); fitToViewport();
      window.addEventListener("resize", fitToViewport);
      window.addEventListener("orientationchange", fitToViewport);
      return;
    }
  }

  // Nincs állapot: indító picker
  openPicker();
  fitToViewport();
  window.addEventListener("resize", fitToViewport);
  window.addEventListener("orientationchange", fitToViewport);
});
