/* ====== Webes Bingó – letisztított ====== */

const DEFAULT_WORDS = [
  "De mi ez a champ???",
  "Adjuk fel!",
  "Oda ült az anyja!",
  "15x öse vagyok a peak-jüknek",
  "Ez?",
  "?",
  "Végtelen slukkos manórúd",
  "A manórúd utolér",
  "Gyors pisi szünet",
  "Kiki sír",
  "Beni legalább 10x died",
  "„Fitymacsattogás”",
  "Gatyámba vannak",
  "Elbasztam",
  "Mer mit csinál lerajzol?",
  "Nyertem a mentált",
  "Ez win",
  "Szopd ki a faszukat Valor",
  "Lássssd amit énn",
  "Négerezés - akármilyen kontextusban",
  "Misseltem a cannont xD",
  "Ez clap",
  "„Beni ordibál”",
  "„ff”",
  "„JOKER”",
];

const BOARD_SIZE = 5;
const STORAGE_KEY = "hu-bingo-state-v2";
let lastLines = 0;

const $ = (sel, root = document) => root.querySelector(sel);

// ---- segédek
function seededRandom(seed) {
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  const seedFn = xmur3(String(seed));
  return sfc32(seedFn(), seedFn(), seedFn(), seedFn());
}
function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- beállítások: fixek, de URL-ből felülírhatók
function getSettings() {
  // alap: van szabad közép, nincs seed, default szólista
  const base = {
    freeCenter: false,
    seed: "",
    words: DEFAULT_WORDS.slice(),
  };
  // opcionális felülírás URL paramokkal (?free=0&seed=valami&w=base64)
  const params = new URLSearchParams(location.search);
  if (params.has("free")) base.freeCenter = params.get("free") === "1";
  if (params.has("seed")) base.seed = params.get("seed") || "";
  if (params.has("w")) {
    try {
      const decoded = decodeURIComponent(escape(atob(params.get("w"))));
      base.words = decoded
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {}
  }
  return base;
}

// ---- állapot mentés / visszatöltés
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

// ---- tábla
function newBoard({ freeCenter, seed, words }) {
  const rand = seed ? seededRandom(seed) : Math.random;
  const needed = BOARD_SIZE * BOARD_SIZE - (freeCenter ? 1 : 0);
  if (words.length < needed) {
    throw new Error(
      `Kevés elem: ${needed} szükséges, de csak ${words.length} van.`
    );
  }
  const pool = shuffle(words, rand).slice(0, needed);
  const cells = [];
  let idx = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (freeCenter && r === 2 && c === 2) {
        cells.push({ text: "SZABAD", marked: true });
      } else {
        cells.push({ text: pool[idx++], marked: false });
      }
    }
  }
  return cells;
}

function renderBoard(cells) {
  const board = $("#board");
  board.innerHTML = "";
  const tpl = $("#cellTemplate");
  cells.forEach((cell, i) => {
    const btn = tpl.content.firstElementChild.cloneNode(true);
    btn.textContent = cell.text;
    btn.dataset.index = i;
    btn.setAttribute("aria-pressed", String(!!cell.marked));
    btn.addEventListener("click", () => {
      const marked = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!marked));
      cells[i].marked = !marked;
      updateStatus(cells);
      persist();
      maybeCelebrate(cells);
    });
    board.appendChild(btn);
  });
}

function countBingos(cells) {
  const size = BOARD_SIZE;
  const g = (i) => (cells[i].marked ? 1 : 0);
  let lines = 0;
  for (let r = 0; r < size; r++) {
    let ok = true;
    for (let c = 0; c < size; c++) {
      if (!g(r * size + c)) {
        ok = false;
        break;
      }
    }
    if (ok) lines++;
  }
  for (let c = 0; c < size; c++) {
    let ok = true;
    for (let r = 0; r < size; r++) {
      if (!g(r * size + c)) {
        ok = false;
        break;
      }
    }
    if (ok) lines++;
  }
  let ok = true;
  for (let i = 0; i < size; i++) {
    if (!g(i * size + i)) {
      ok = false;
      break;
    }
  }
  if (ok) lines++;
  ok = true;
  for (let i = 0; i < size; i++) {
    if (!g(i * size + (size - 1 - i))) {
      ok = false;
      break;
    }
  }
  if (ok) lines++;
  return lines;
}

function updateStatus(cells) {
  const lines = countBingos(cells);
  $("#status").textContent = `${lines} bingóvonal`;
  return lines;
}

function maybeCelebrate(cells) {
  const lines = updateStatus(cells);
  if (lines > lastLines) {
    const dlg = $("#bingoDialog");
    $("#bingoMessage").textContent = `Új vonal(ak): +${
      lines - lastLines
    }. Összesen: ${lines}.`;
    if (typeof dlg.showModal === "function") {
      try {
        dlg.showModal();
      } catch {}
    } else {
      alert("🎉 BINGÓ! 🎉");
    }
  }
  lastLines = lines;
}

function persist() {
  saveState({ cells: state.cells, settings: state.settings });
}

function restoreFromState(saved) {
  if (!saved) return false;
  try {
    state.settings = saved.settings;
    state.cells = saved.cells;
    renderBoard(state.cells);
    lastLines = updateStatus(state.cells);
    return true;
  } catch {
    return false;
  }
}

// ---- megosztás (link generálás ugyanúgy működik)
function shareBoard() {
  const { freeCenter, seed, words } = state.settings;
  const params = new URLSearchParams();
  if (freeCenter) params.set("free", "1");
  if (seed) params.set("seed", seed);
  if (words && words.length) {
    try {
      params.set("w", btoa(unescape(encodeURIComponent(words.join("\n")))));
    } catch {}
  }
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  navigator.clipboard?.writeText(url);
  alert("Link vágólapra másolva!");
}

// ---- fő
const state = { settings: null, cells: [] };

function buildNew() {
  const settings = getSettings();
  state.settings = settings;
  const cells = newBoard(settings);
  state.cells = cells;
  renderBoard(cells);
  lastLines = updateStatus(cells);
  persist();
}
function resetMarks() {
  const freeCenter = state.settings?.freeCenter ?? true;
  state.cells = state.cells.map((c, i) => ({
    ...c,
    marked: i === 12 && freeCenter ? true : false,
  }));
  renderBoard(state.cells);
  lastLines = updateStatus(state.cells);
  persist();
}
function printBoard() {
  window.print();
}


// ===== Fit board to viewport height on mobile =====
function fitToViewport(){
  const header = document.querySelector('.app-header');
  const footer = document.querySelector('.app-footer');
  const board = document.getElementById('board');
  if(!header || !footer || !board) return;

  const vh = (window.visualViewport?.height) || window.innerHeight;
  const bodyStyles = getComputedStyle(document.body);
  const boardStyles = getComputedStyle(board);

  const gap = parseFloat(boardStyles.gap) || 0;
  const padTop = parseFloat(boardStyles.paddingTop) || 0;
  const padBottom = parseFloat(boardStyles.paddingBottom) || 0;
  const bodyPadTop = parseFloat(bodyStyles.paddingTop) || 0;
  const bodyPadBottom = parseFloat(bodyStyles.paddingBottom) || 0;

  const rows = 5;
  const available = vh
    - header.offsetHeight
    - footer.offsetHeight
    - bodyPadTop - bodyPadBottom
    - padTop - padBottom;

  const cellH = Math.max(52, Math.floor((available - gap * (rows - 1)) / rows));
  document.documentElement.style.setProperty('--cell-h', cellH + 'px');

  // Dinamikus betűméret
  const fs = Math.max(11, Math.min(18, Math.floor(cellH * 0.26)));
  document.documentElement.style.setProperty('--cell-fs', fs + 'px');
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("newCardBtn").addEventListener("click", buildNew);
  document
    .getElementById("resetMarksBtn")
    .addEventListener("click", resetMarks);
  document.getElementById("printBtn").addEventListener("click", printBoard);
  document.getElementById("shareBtn").addEventListener("click", shareBoard);
  const saved = loadState();
  if (!restoreFromState(saved)) {
    buildNew();
  }
});
