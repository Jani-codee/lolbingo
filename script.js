/* ====== Webes Bingó – kombinált tábla + jobb oldali névjegyek (v24) ====== */

/* --- A TE presetjeid (változatlanul hagyva) --- */
const PLAYER_PRESETS = {
  Toka: [
    "Toka loading","Lemerült a füles","De mi ez a champ?","Baby rage","Agyfaszt kapok",
    "„Sírás”","?","„Rasszista megnyilvánulások”","Adjuk fel","„Gyors pisi szünet”","Kurva anyád",
  ],
  Dani: [
    "Szopd ki a faszt","Kurva anyád","Szopd le anyád","De mi ez a champ?","?","„Rasszista megnyilvánulások”",
    "Adjuk fel","„Gyors pisi szünet”",
  ],
  Beni: [
    "Dont fos","Nem hiszem el (gechi)","Megbasz/od","„Zihálás”","Höhöhőőő","Csípd meg/szedd szét","„Kiabál”",
    "Gyereide","Ajjjj","Haggyámán","De mi ez a champ?","?","„Rasszista megnyilvánulások”","5 gold",
    "Végtelen slukkos manórúd","A manórúd utolér","Adjuk fel","„Gyors pisi szünet”","Kurva anyád","Baby rage",
  ],
  Pintye: [
    "De mi ez a champ?","Meg/Basztak","Tonyás","„Fogytékos nevetés”","Nyílván megint itt a jg-s","Ajjjj","?",
    "„Rasszista megnyilvánulások”","Adjuk fel","„Gyors pisi szünet”","Kurva anyád","Baby rage",
  ],
  Jani: [
    "Dont fos","Foglak","Ez","Nyertem a mentált","?","„Rasszista megnyilvánulások”","Misseltem a cannont",
    "5 gold","Szeddszét","„Bántanak a csúnya rossz magyarok”","Könnyü","Gatyámba vannak","Mer mit csinál lerjzol?",
    "Ez win","Adjuk fel","„Gyors pisi szünet”","Kurva anyád",
  ],
  "Quinn van a gamebe": ["Szopd ki a faszomat valor"],
  "Hwei van a gamebe":  ["Lááásd amit én"],
};

/* --- Bedrótozott alap profilok (egységes minden eszközön) --- */
function slugifyName(n){
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}
const DEFAULT_PROFILES = {
  Toka:  { img: "img/toka.jpg",  note: "", bg: "" },
  Dani:  { img: "img/dani.jpg",  note: "", bg: "" },
  Beni:  { img: "img/beni.jpg",  note: "", bg: "" },
  Pintye:{ img: "img/pintye.jpg",note: "", bg: "" },
  Jani:  { img: "img/jani.jpg",  note: "", bg: "" },
  "Quinn van a gamebe": { img: "img/quinn-and-valor.gif", note: "", bg: "" },
  "Hwei van a gamebe":  { img: "img/hwei.jpg",           note: "", bg: "" },
};

/* --- Fix, névhez kötött színek --- */
const COLOR_COUNT = 5;
const COLOR_OVERRIDE = { Toka:0, Dani:1, Beni:2, Pintye:3, Jani:4,
  "Quinn van a gamebe":3, "Hwei van a gamebe":2 };
function hash32(str){
  let h=2166136261>>>0;
  for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function nameToColorIdx(name){
  if (name in COLOR_OVERRIDE) return COLOR_OVERRIDE[name] % COLOR_COUNT;
  return hash32(name) % COLOR_COUNT; // stabil fallback 0..4 között
}

/* --- Profilok (kép + jegyzet + háttér [szín vagy kép]) --- */
const PROFILE_KEY = "hu-bingo-profiles-v1";
let PROFILES = {}; // { Név: {img:"", note:"", bg:""} }
function loadProfiles(){
  let local = {};
  try { local = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { local = {}; }
  PROFILES = { ...DEFAULT_PROFILES, ...local }; // helyi felülírja az alapot
}
function saveProfiles(){ localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILES||{})); }

/* --- Általános --- */
const BOARD_SIZE = 5;
const STORAGE_KEY = "hu-bingo-combined-v1";
const $ = (sel, root=document) => root.querySelector(sel);

function seededRandom(seed){
  function xmur3(str){
    let h=1779033703 ^ str.length;
    for(let i=0;i<str.length;i++){
      h = Math.imul(h ^ str.charCodeAt(i),3432918353);
      h = (h<<13)|(h>>>19);
    }
    return function(){
      h = Math.imul(h ^ (h>>>16),2246822507);
      h = Math.imul(h ^ (h>>>13),3266489909);
      h ^= h>>>16;
      return h>>>0;
    };
  }
  function sfc32(a,b,c,d){
    return function(){
      a>>>=0; b>>>=0; c>>>=0; d>>>=0;
      let t=(a+b)|0;
      a = b^(b>>>9);
      b = (c+(c<<3))|0;
      c = (c<<21)|(c>>>11);
      d = (d+1)|0;
      t = (t+d)|0;
      c = (c+t)|0;
      return (t>>>0)/4294967296;
    };
  }
  const f=xmur3(String(seed));
  return sfc32(f(),f(),f(),f());
}
function shuffle(arr, rand=Math.random){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

/* --- Tábla magasság illesztése --- */
function fitToViewport(){
  const header=$('.app-header'), footer=$('.app-footer'), board=$('#board');
  if(!header || !footer || !board) return;
  const vh=(window.visualViewport?.height)||window.innerHeight;
  const bodyStyles=getComputedStyle(document.body);
  const boardStyles=getComputedStyle(board);
  const gap=parseFloat(boardStyles.gap)||0;
  const padTop=parseFloat(boardStyles.paddingTop)||0;
  const padBottom=parseFloat(boardStyles.paddingBottom)||0;
  const bodyTop=parseFloat(bodyStyles.paddingTop)||0;
  const bodyBottom=parseFloat(bodyStyles.paddingBottom)||0;
  const rows=5, fudge=10;
  const available = vh - header.offsetHeight - footer.offsetHeight
    - bodyTop - bodyBottom - padTop - padBottom - fudge;
  const cellH = Math.max(52, Math.floor((available - gap*(rows-1)) / rows));
  document.documentElement.style.setProperty('--cell-h',  cellH+'px');
  document.documentElement.style.setProperty('--cell-fs', Math.max(11, Math.min(18, Math.floor(cellH*0.26)))+'px');
}

/* --- Állapot + Bingó --- */
const state = { selectedPlayers: [], cells: [] };
let lastLines = 0;

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
    const dlg = $('#bingoDialog'); const msg = $('#bingoMessage');
    const d = lines - lastLines;
    if(msg) msg.textContent = `Új vonal(ak): +${d}. Összesen: ${lines}.`;
    if(dlg?.showModal){ try{ dlg.showModal(); }catch{} } else { alert('🎉 BINGÓ! 🎉'); }
  }
  lastLines = lines;
}

/* --- 25 cella előállítása (3–5 játékos, kvóta szerinti elosztás) --- */
function buildCombinedCells(names, seed=""){
  const k=names.length, rand=seed?seededRandom(seed):Math.random;
  const base=Math.floor(25/k); let rem=25%k;
  const order=shuffle([...names], rand);
  const quotas=Object.fromEntries(names.map(n=>[n, base]));
  for(let i=0;i<rem;i++) quotas[order[i]]++;
  let pool = [];
  names.forEach(n=>{
    const words = shuffle(PLAYER_PRESETS[n], rand).slice(0, quotas[n]);
    pool.push(...words.map(w=>({text:w, owner:n})));
  });
  pool = shuffle(pool, rand).slice(0,25);
  return pool.map(it => ({ text: it.text, owner: it.owner, marked:false }));
}

/* --- Render: tábla + névjegysáv --- */
function renderBoard(){
  const board=$('#board'); board.innerHTML="";
  const tpl=$('#cellTemplate');
  state.cells.forEach((cell, idx)=>{
    const btn = tpl.content.firstElementChild.cloneNode(true);
    btn.innerHTML = `<div class="txt">${cell.text}</div><span class="owner"></span>`;
    const ownerEl = btn.querySelector('.owner');
    ownerEl.textContent = cell.owner;
    const colorIdx = nameToColorIdx(cell.owner);
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

/* névjegykártya háttér beállítás: szín (hex/rgb/hsl) vagy kép-URL */
function applyCardBackground(card, bg){
  if (!bg) return false;
  const v = String(bg).trim(); if (!v) return false;
  if (/^#([\da-f]{3,8})$/i.test(v) || /^rgba?\(/i.test(v) || /^hsla?\(/i.test(v)) {
    card.classList.add('has-bgcolor');
    card.style.setProperty('--pc-bg-color', v);
    return true;
  }
  card.classList.add('has-bgimg');
  card.style.setProperty('--pc-bg-image', `url("${v}")`);
  return true;
}
function escapeHTML(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

function renderSidebar(){
  const el=$('#sidebar'); if(!el) return;
  el.innerHTML="";
  state.selectedPlayers.forEach(name=>{
    const p = PROFILES[name] || {};
    const colorIdx = nameToColorIdx(name);
    const card = document.createElement('div');
    card.className = 'person-card c'+colorIdx; // fix szín – fallback
    const imgHtml = p.img ? `<img src="${p.img}" alt="${name}" loading="lazy">` : `<div class="ph"></div>`;
    card.innerHTML = `
      <div class="pc-img">${imgHtml}</div>
      <div class="pc-text">
        <div class="pc-name">${name}</div>
        <div class="pc-note">${escapeHTML(p.note||"")}</div>
      </div>`;
    applyCardBackground(card, p.bg); // egyedi háttér (szín/kép)
    el.appendChild(card);
  });
}

/* --- Mentés / státusz --- */
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedPlayers: state.selectedPlayers, cells: state.cells })); }
function loadState(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }catch{ return null; } }

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

/* --- Játékosválasztó + menü + profil szerkesztő --- */
function buildPicker(){
  const list=$('#pickerList'); list.innerHTML="";
  Object.keys(PLAYER_PRESETS).forEach(name=>{
    const item=document.createElement('label'); item.className='picker-item';
    const checked = state.selectedPlayers.includes(name) ? 'checked' : '';
    item.innerHTML = `<input type="checkbox" name="pick" value="${name}" ${checked}><span>${name}</span>`;
    list.appendChild(item);
  });
}
function openPicker(){ buildPicker(); $('#playerPicker')?.showModal?.(); }

function setupMenu(){
  const btn=$('#moreBtn'), menu=$('#moreMenu'); if(!btn || !menu) return;
  function close(){ menu.hidden=true; btn.setAttribute('aria-expanded','false'); }
  function open(){ menu.hidden=false; btn.setAttribute('aria-expanded','true'); }
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener('click', (e)=>{ if(menu.hidden)return; if(!menu.contains(e.target) && e.target!==btn) close(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

  // Profilok szerkesztése
  $('#editProfilesBtn').addEventListener('click', ()=>{ menu.hidden=true; openProfileEditor(); });
}
function openProfileEditor(){
  const wrap=$('#profileFields'); wrap.innerHTML="";
  state.selectedPlayers.forEach(name=>{
    const p = PROFILES[name] || { img:"", note:"", bg:"" };
    const row=document.createElement('div'); row.className='profile-row';
    row.innerHTML = `
      <div class="label">${name}</div>
      <div class="fields">
        <input type="url" placeholder="Kép URL (pl. img/${slugifyName(name)}.jpg)" data-name="${name}" class="pf-img" value="${p.img||""}">
        <textarea placeholder="Leírás" data-name="${name}" class="pf-note">${p.note||""}</textarea>
        <input type="text" placeholder="HÁTTÉR: #aabbcc vagy img/${slugifyName(name)}_bg.jpg" data-name="${name}" class="pf-bg" value="${p.bg||""}">
      </div>`;
    wrap.appendChild(row);
  });
  $('#profileEditor')?.showModal?.();
}
function commitProfiles(){
  document.querySelectorAll('.pf-img').forEach(inp=>{ const name=inp.getAttribute('data-name'); (PROFILES[name]??=(PROFILES[name]||{})).img = inp.value.trim(); });
  document.querySelectorAll('.pf-note').forEach(inp=>{ const name=inp.getAttribute('data-name'); (PROFILES[name]??=(PROFILES[name]||{})).note = inp.value.trim(); });
  document.querySelectorAll('.pf-bg').forEach(inp=>{ const name=inp.getAttribute('data-name'); (PROFILES[name]??=(PROFILES[name]||{})).bg = inp.value.trim(); });
  saveProfiles(); renderSidebar();
}

/* --- Fő --- */
document.addEventListener("DOMContentLoaded", ()=>{
  loadProfiles();
  setupMenu();

  // Új kártya – megerősítés
  const newDlg=$('#newCardDialog');
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
  const picker=$('#playerPicker');
  $('#pickerOk').addEventListener('click', (e)=>{
    const names = Array.from(document.querySelectorAll('input[name="pick"]:checked')).map(i=>i.value);
    if(names.length < 3 || names.length > 5){ e.preventDefault(); alert("Válassz 3 és 5 fő között!"); return; }
    picker.close(); state.selectedPlayers = names; rebuildBoard("");
  });
  $('#pickerCancel').addEventListener('click', ()=> picker.close());

  // Betöltés (URL vagy localStorage)
  const params=new URLSearchParams(location.search); const p64=params.get("p");
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
  const saved = loadState();
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
