/* ====== Webes Bingó – kombinált tábla + jobb oldali névjegyek (v17) ====== */

/* --- Játékos presetek: név -> saját kifejezések listája --- */
const PLAYER_PRESETS = {
  "Ádám": [
    "Sprint demo","Code review","Bugfix","Refaktor","Merging","Ticket csúszik",
    "„Nézzük meg gyorsan”","CI lefutott","Deploy","„Ez edge-case”","TDD",
    "„Majd backlog”","Meeting elhúzódik","Kamera off","Késés","Chat ping",
    "Release note","„Nem reprodukálható”","Hotfix","Pair programming","Lint hiba",
    "PR sablon","Staging","„Újraindítottam”","Spec hiányos"
  ],
  "Bea": [
    "Marketing slide","Kampányterv","CTA változtatás","A/B teszt","„Megkérdezem a csapatot”",
    "Szerkesztési jog","Kezdőlap frissítés","„Később posztoljuk”","Link rövidítése",
    "„Ezt még jóvá kell hagyni”","UAT","Teszt felhasználó","„Küldöm a linket”",
    "Árajánlat","Persona","„Nincs elég adat”","Workshop","Hírlevél","KPI",
    "Wireframe","„Van erről stat?”","Jóváhagyás","Brief","Landing","Benchmark"
  ],
  "Csaba": [
    "Szerver restarthoz kell jog","Log elemzés","CPU spike","Mem leak gyanú",
    "„Nála működik”","Késő este deploy","Rollback","Config mismatch",
    "„Majd cronból megy”","Rate limit","„Átmeneti hiba”","Alert jött",
    "DNS cache","„Átlagos terhelés”","Failover","Healthcheck","„Kézzel patcheltem”",
    "Kibana","Grafana","„Rögtön nézem”","SSH","„Státusz oldalt nézted?”",
    "Timeout","„Kint van az incident”","Root cause"
  ],
  "Dóri": [
    "User interjú","Persona update","Journey map","Affinity diagram",
    "„Papíron jobban nézett ki”","Tap target kicsi","„Mobile first”",
    "Figma frissítés","Spacing","„Sötét mód mikor?”","Kontraszt kevés",
    "„Ez túl zajos”","Szegmens","Heatmap","FigJam","„Ez nem fér ki”",
    "„Amikor a user...”","AB teszt terv","„Fájlrendszer?”","Komponens könyvtár",
    "„Nem konzisztens”","Spacing token","„12 oszlopos grid”","„Rendszer ikon?”","Prototípus"
  ],
  "Emőke": [
    "Pénzügyi riport","Budget cut","Forecast","„Szoros a keret”","ROI",
    "„Backlog prioritás”","SLA","„Scope csökkentés”","Risk","„Roadmap csúszik”",
    "„Stakeholder review”","High-level","OKR","„Ezt mérjük?”","„Ez nem fér bele”",
    "„Szállítási dátum?”","„Melyik quarter?”","„Pingeld meg őket”","Approval",
    "Contract","„Vendor válaszolt?”","„QBR”","„RACI”","„Mit mond a PMO?”","„Escalation”"
  ]
};

/* --- BEDRÓTOZOTT ALAPÉRTELMEZETT PROFILOK (minden eszközön azonos) --- */
/* Tipp: a fájlneveket ékezet nélkül add meg az img/ mappában. */
const DEFAULT_PROFILES = {
  "Ádám":  { img: "img/adam.jpg",  note: "" },
  "Bea":   { img: "img/bea.jpg",   note: "" },
  "Csaba": { img: "img/csaba.jpg", note: "" },
  "Dóri":  { img: "img/dori.jpg",  note: "" },
  "Emőke": { img: "img/emoke.jpg", note: "" }
};

/* --- Profilok (kép + jegyzet) --- */
const PROFILE_KEY = "hu-bingo-profiles-v1";
let PROFILES = {}; // { Név: {img:"", note:""} }
function loadProfiles(){
  // a helyi (szerkesztett) értékek felülírják a bedrótozott alapokat
  let local = {};
  try { local = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { local = {}; }
  PROFILES = { ...DEFAULT_PROFILES, ...local };
}
function saveProfiles(){
  localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILES||{}));
}

/* --- Általános --- */
const BOARD_SIZE = 5;
const STORAGE_KEY = "hu-bingo-combined-v1";
const $ = (sel, root=document) => root.querySelector(sel);

function seededRandom(seed){
  function xmur3(str){ let h=1779033703 ^ str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h ^ str.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19); } return function(){ h=Math.imul(h ^ (h>>>16),2246822507); h=Math.imul(h ^ (h>>>13),3266489909); h^=h>>>16; return h>>>0; } }
  function sfc32(a,b,c,d){ return function(){ a>>>=0;b>>=0;c>>=0;d>>=0; let t=(a+b)|0; a=b^(b>>>9); b=(c+(c<<3))|0; c=(c<<21|c>>>11); d=(d+1)|0; t=(t+d)|0; c=(c+t)|0; return (t>>>0)/4294967296; } }
  const f=xmur3(String(seed)); return sfc32(f(),f(),f(),f());
}
function shuffle(arr, rand=Math.random){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ---- Mobil/desktop illesztés: a tábla magassága férjen ki görgetés nélkül
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

  // kis ráhagyás, hogy biztosan ne legyen 1-2px felesleges görgetés
  const fudge = 10;

  const rows = 5;
  const available = vh
    - header.offsetHeight
    - footer.offsetHeight
    - bodyTop - bodyBottom
    - padTop  - padBottom
    - fudge;

  const cellH = Math.max(52, Math.floor((available - gap * (rows - 1)) / rows));
  document.documentElement.style.setProperty('--cell-h',  cellH + 'px');
  document.documentElement.style.setProperty('--cell-fs', Math.max(11, Math.min(18, Math.floor(cellH * 0.26))) + 'px');
}


/* --- Állapot --- */
const state = { selectedPlayers: [], cells: [] };
let lastLines = 0;

/* --- Bingó logika --- */
function countBingos(cells){
  const g=i=>cells[i].marked?1:0, n=BOARD_SIZE; let lines=0;
  for(let r=0;r<n;r++){ let ok=true; for(let c=0;c<n;c++){ if(!g(r*n+c)){ok=false;break;} } if(ok) lines++; }
  for(let c=0;c<n;c++){ let ok=true; for(let r=0;r<n;r++){ if(!g(r*n+c)){ok=false;break;} } if(ok) lines++; }
  { let ok=true; for(let i=0;i<n;i++){ if(!g(i*n+i)){ok=false;break;} } if(ok) lines++; }
  { let ok=true; for(let i=0;i<n;i++){ if(!g(i*n+(n-1-i))){ok=false;break;} } if(ok) lines++; }
  return lines;
}
function maybeCelebrate(){
  const lines = countBingos(state.cells);
  if(lines > lastLines){
    const dlg = $('#bingoDialog'); const msg = $('#bingoMessage'); const d = lines - lastLines;
    if(msg) msg.textContent = `Új vonal(ak): +${d}. Összesen: ${lines}.`;
    if(dlg?.showModal){ try{ dlg.showModal(); }catch(e){} } else { alert('🎉 BINGÓ! 🎉'); }
  }
  lastLines = lines;
}

/* --- Kombinált tábla --- */
function buildCombinedCells(names, seed=""){
  const k=names.length, rand=seed?seededRandom(seed):Math.random;
  const base=Math.floor(25/k); let rem=25%k;
  const order=shuffle([...names], rand);
  const quotas=Object.fromEntries(names.map(n=>[n, base])); for(let i=0;i<rem;i++){ quotas[order[i]]++; }
  let pool = [];
  names.forEach(n=>{
    const words = shuffle(PLAYER_PRESETS[n], rand).slice(0, quotas[n]);
    pool.push(...words.map(w=>({text:w, owner:n})));
  });
  pool = shuffle(pool, rand).slice(0,25);
  return pool.map(it => ({ text: it.text, owner: it.owner, marked: false }));
}

/* --- Render: tábla + jobb oldali kártyák --- */
function renderBoard(){
  const board = $('#board'); board.innerHTML="";
  const tpl = $('#cellTemplate');
  state.cells.forEach((cell, idx)=>{
    const btn = tpl.content.firstElementChild.cloneNode(true);
    btn.innerHTML = `<div class="txt">${cell.text}</div><span class="owner"></span>`;
    const ownerEl = btn.querySelector('.owner');
    ownerEl.textContent = cell.owner;
    const colorIdx = state.selectedPlayers.indexOf(cell.owner) % 5;
    ownerEl.classList.add('c'+colorIdx);
    btn.setAttribute('aria-pressed', String(!!cell.marked));
    btn.addEventListener('click', ()=>{
      const marked = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!marked));
      state.cells[idx].marked = !marked;
      updateStatus(); maybeCelebrate(); saveState();
    });
    board.appendChild(btn);
  });
  renderSidebar();
}
function renderSidebar(){
  const el = $('#sidebar'); if(!el) return;
  el.innerHTML = "";
  state.selectedPlayers.forEach(name=>{
    const p = PROFILES[name] || {};
    const imgHtml = p.img
      ? `<img src="${p.img}" alt="${name}" loading="lazy">`
      : `<div class="ph"></div>`;
    const colorIdx = state.selectedPlayers.indexOf(name) % 5;
    const card = document.createElement('div');
    card.className = 'person-card c' + colorIdx;
    card.innerHTML = `
      <div class="pc-img">${imgHtml}</div>
      <div class="pc-text">
        <div class="pc-name">${name}</div>
        <div class="pc-note">${(p.note||"").replaceAll("<","&lt;")}</div>
      </div>`;
    el.appendChild(card);
  });
}

/* --- Mentés / betöltés --- */
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedPlayers: state.selectedPlayers, cells: state.cells })); }
function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }catch{ return null; } }

/* --- Státusz --- */
function updateStatus(){
  const lines = countBingos(state.cells);
  const pick = state.selectedPlayers.length ? " – " + state.selectedPlayers.join(", ") : "";
  $('#status').textContent = `${lines} bingóvonal${pick}`;
  return lines;
}
function rebuildBoard(seed=""){
  state.cells = buildCombinedCells(state.selectedPlayers, seed);
  renderBoard();
  lastLines = countBingos(state.cells);
  updateStatus(); saveState(); fitToViewport();
}

/* --- Picker --- */
function buildPicker(){
  const list = $('#pickerList'); list.innerHTML="";
  Object.keys(PLAYER_PRESETS).forEach(name=>{
    const item = document.createElement('label');
    item.className = 'picker-item';
    const checked = state.selectedPlayers.includes(name) ? 'checked' : '';
    item.innerHTML = `<input type="checkbox" name="pick" value="${name}" ${checked}><span>${name}</span>`;
    list.appendChild(item);
  });
}
function openPicker(){ buildPicker(); $('#playerPicker')?.showModal?.(); }

/* --- Menü + profil szerkesztő --- */
function setupMenu(){
  const btn=$('#moreBtn'), menu=$('#moreMenu');
  if(!btn || !menu) return;
  function close(){ menu.hidden=true; btn.setAttribute('aria-expanded','false'); }
  function open(){ menu.hidden=false; btn.setAttribute('aria-expanded','true'); }
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener('click', (e)=>{ if(menu.hidden)return; if(!menu.contains(e.target) && e.target!==btn) close(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

  // Profilok szerkesztése
  $('#editProfilesBtn').addEventListener('click', ()=>{
    menu.hidden = true;
    openProfileEditor();
  });
}
function openProfileEditor(){
  const wrap = $('#profileFields'); wrap.innerHTML = "";
  state.selectedPlayers.forEach(name=>{
    const p = PROFILES[name] || {img:"", note:""};
    const row = document.createElement('div');
    row.className = 'profile-row';
    row.innerHTML = `
      <div class="label">${name}</div>
      <div class="fields">
        <input type="url" placeholder="Kép URL (pl. img/adam.jpg)" data-name="${name}" class="pf-img" value="${p.img||""}" />
        <textarea placeholder="Leírás" data-name="${name}" class="pf-note">${p.note||""}</textarea>
      </div>`;
    wrap.appendChild(row);
  });
  $('#profileEditor')?.showModal?.();
}
function commitProfiles(){
  document.querySelectorAll('.pf-img').forEach(inp=>{
    const name = inp.getAttribute('data-name');
    PROFILES[name] = PROFILES[name] || {};
    PROFILES[name].img = inp.value.trim();
  });
  document.querySelectorAll('.pf-note').forEach(inp=>{
    const name = inp.getAttribute('data-name');
    PROFILES[name] = PROFILES[name] || {};
    PROFILES[name].note = inp.value.trim();
  });
  saveProfiles();
  renderSidebar();
}

/* --- Fő --- */
document.addEventListener("DOMContentLoaded", ()=>{
  loadProfiles();
  setupMenu();

  // Új kártya – megerősítés
  const newDlg = $('#newCardDialog');
  $('#newCardBtn').addEventListener('click', ()=>{
    if(state.selectedPlayers.length < 3){ openPicker(); return; }
    newDlg?.showModal?.();
  });
  $('#keepPlayersBtn').addEventListener('click', ()=>{ newDlg.close(); rebuildBoard(""); });
  $('#reselectPlayersBtn').addEventListener('click', ()=>{ newDlg.close(); openPicker(); });

  // Közös gombok
  $('#resetMarksBtn').addEventListener('click', ()=>{
    state.cells = state.cells.map(c => ({...c, marked:false}));
    renderBoard(); lastLines = countBingos(state.cells); updateStatus(); saveState();
  });
  $('#printBtn').addEventListener('click', ()=> window.print());
  $('#shareBtn').addEventListener('click', ()=>{
    try{
      const payload = { players: state.selectedPlayers };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const url = `${location.origin}${location.pathname}?p=${b64}`;
      navigator.clipboard?.writeText(url);
      alert("Link vágólapra másolva!");
    }catch{}
  });
  $('#pickPlayersBtn').addEventListener('click', ()=>{ $('#moreMenu').hidden=true; openPicker(); });
  $('#saveProfilesBtn').addEventListener('click', ()=>{ commitProfiles(); $('#profileEditor')?.close?.(); });

  // Picker OK/Cancel
  const picker = $('#playerPicker');
  $('#pickerOk').addEventListener('click', (e)=>{
    const names = Array.from(document.querySelectorAll('input[name="pick"]:checked')).map(i=>i.value);
    if(names.length < 3 || names.length > 5){ e.preventDefault(); alert("Válassz 3 és 5 fő között!"); return; }
    picker.close();
    state.selectedPlayers = names;
    rebuildBoard("");
  });
  $('#pickerCancel').addEventListener('click', ()=> picker.close());

  // Betöltés
  const params = new URLSearchParams(location.search);
  const p64 = params.get("p");
  const saved = (()=>{ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }catch{ return null; } })();

  if(p64){
    try{
      const decoded = decodeURIComponent(escape(atob(p64)));
      const data = JSON.parse(decoded);
      const names = (data.players||[]).filter(n => PLAYER_PRESETS[n]);
      if(names.length >= 3 && names.length <= 5){
        state.selectedPlayers = names; rebuildBoard("");
        window.addEventListener("resize", fitToViewport);
        window.addEventListener("orientationchange", fitToViewport);
        return;
      }
    }catch{}
  }
  if(saved && Array.isArray(saved.selectedPlayers) && saved.selectedPlayers.length){
    state.selectedPlayers = saved.selectedPlayers.filter(n => PLAYER_PRESETS[n]);
    state.cells = (saved.cells||[]).filter(Boolean);
    if(state.cells.length === 25){
      renderBoard(); lastLines = countBingos(state.cells); updateStatus(); fitToViewport();
      window.addEventListener("resize", fitToViewport);
      window.addEventListener("orientationchange", fitToViewport);
      return;
    }
  }

  // Első indítás
  openPicker(); fitToViewport();
  window.addEventListener("resize", fitToViewport);
  window.addEventListener("orientationchange", fitToViewport);
});
