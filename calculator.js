const { ipcRenderer } = require("electron");

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  a: "",
  b: "",
  active: "a",   // which operand we're typing into
  op: "+",
  result: null,
  history: [],
};

// ── DOM refs ─────────────────────────────────────────────────────────────────
const $result    = document.getElementById("result");
const $expr      = document.getElementById("expr");
const $history   = document.getElementById("historyStrip");
const $copyFlash = document.getElementById("copyFlash");

// ── Op symbol → math operator ────────────────────────────────────────────────
const OP_MAP = { "+": "+", "−": "-", "×": "*", "÷": "/", "%": "%" };

// ── Render ────────────────────────────────────────────────────────────────────
function renderScreen() {
  const opSym = state.op;
  const a = state.a || (state.active === "a" ? "▌" : "—");
  const b = state.b || (state.active === "b" ? "▌" : "—");

  if (state.op === "%") {
    $expr.textContent = `${state.a || "▌"}  %`;
  } else {
    $expr.textContent = `${a}  ${opSym}  ${b}`;
  }

  if (state.result !== null) {
    $result.textContent = formatNum(state.result);
    $result.className = "screen-result " + (state.result === "Err" ? "error" : "success");
  } else {
    const current = state.active === "a" ? state.a : state.b;
    $result.textContent = current || "0";
    $result.className = "screen-result";
  }
}

function formatNum(n) {
  if (n === "Err") return "Division / 0";
  if (typeof n === "number") {
    if (!isFinite(n)) return "Erreur";
    // round to avoid floating point noise
    return +n.toPrecision(12) + "";
  }
  return String(n);
}

function renderHistory() {
  // keep only label + items
  $history.innerHTML = `<span class="history-label">hist</span>`;
  state.history.slice(0, 10).forEach(item => {
    const el = document.createElement("span");
    el.className = "history-item";
    el.textContent = item;
    el.title = "Réutiliser";
    el.addEventListener("click", () => reuseHistory(item));
    $history.appendChild(el);
  });
}

function reuseHistory(item) {
  // item format: "a OP b = result"  →  put result in active field
  const match = item.match(/=\s*(.+)$/);
  if (match) {
    const val = match[1].trim();
    state[state.active] = val;
    state.result = null;
    renderScreen();
  }
}

// ── Input helpers ─────────────────────────────────────────────────────────────
function appendDigit(d) {
  // After a calculation, start fresh on "a" unless we type directly into b
  if (state.result !== null) {
    state.result = null;
    state.a = "";
    state.b = "";
    state.active = "a";
  }

  const field = state.active;
  const cur = state[field];

  if (d === ".") {
    if (cur.includes(".")) return;
    state[field] = cur === "" ? "0." : cur + ".";
  } else {
    if (cur === "0") {
      state[field] = d;
    } else {
      state[field] = cur + d;
    }
  }

  // Auto-switch to b after enough digits on a (only if op needs two operands)
  if (field === "a" && state.op !== "%" && state[field].replace("-","").replace(".","").length >= 1) {
    // stay on a until user presses an op tab or we switch manually
  }

  renderScreen();
}

function switchToB() {
  if (state.op !== "%" && state.a !== "") {
    state.active = "b";
    renderScreen();
  }
}

// ── Calculation ───────────────────────────────────────────────────────────────
function calc() {
  const a = parseFloat(state.a);
  const op = OP_MAP[state.op];

  if (isNaN(a)) return;

  let r, expr;

  if (state.op === "%") {
    r = a / 100;
    expr = `${state.a} % = ${formatNum(r)}`;
  } else {
    const b = parseFloat(state.b);
    if (isNaN(b)) return;

    if (state.op === "÷" && b === 0) {
      state.result = "Err";
      renderScreen();
      return;
    }

    if (op === "+") r = a + b;
    if (op === "-") r = a - b;
    if (op === "*") r = a * b;
    if (op === "/") r = a / b;

    expr = `${state.a} ${state.op} ${state.b} = ${formatNum(r)}`;
  }

  state.result = r;
  state.history.unshift(expr);
  renderScreen();
  renderHistory();
}

// ── Actions ───────────────────────────────────────────────────────────────────
function clearAll() {
  state.a = "";
  state.b = "";
  state.active = "a";
  state.result = null;
  renderScreen();
}

function swap() {
  const tmp = state.a;
  state.a = state.b;
  state.b = tmp;
  state.result = null;
  renderScreen();
}

async function copyResult() {
  const val = state.result !== null ? formatNum(state.result) : (state.active === "a" ? state.a : state.b);
  if (!val) return;
  try {
    await navigator.clipboard.writeText(val);
    $copyFlash.classList.add("show");
    setTimeout(() => $copyFlash.classList.remove("show"), 1200);
  } catch (e) {}
}

// ── Keypad events ─────────────────────────────────────────────────────────────
document.getElementById("keypad").addEventListener("click", e => {
  const key = e.target.closest(".key");
  if (!key) return;

  if (key.dataset.digit !== undefined) {
    appendDigit(key.dataset.digit);
  } else if (key.dataset.action) {
    switch (key.dataset.action) {
      case "calc":  calc();     break;
      case "clear": clearAll(); break;
      case "swap":  swap();     break;
      case "copy":  copyResult(); break;
    }
  }
});

// ── Op tabs ───────────────────────────────────────────────────────────────────
document.getElementById("opRow").addEventListener("click", e => {
  const tab = e.target.closest(".op-tab");
  if (!tab) return;

  document.querySelectorAll(".op-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  state.op = tab.dataset.op;
  state.result = null;

  // Switch input focus to b (if a is already filled)
  if (state.op !== "%" && state.a !== "") {
    state.active = "b";
  }

  renderScreen();
});

// ── Keyboard support ──────────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  const k = e.key;

  if (k >= "0" && k <= "9") { appendDigit(k); return; }
  if (k === ".") { appendDigit("."); return; }
  if (k === "Enter" || k === "=") { calc(); return; }
  if (k === "Backspace") {
    const f = state.active;
    state[f] = state[f].slice(0, -1);
    state.result = null;
    renderScreen();
    return;
  }
  if (k === "Escape") { clearAll(); return; }
  if (k === "Tab") {
    e.preventDefault();
    state.active = state.active === "a" ? "b" : "a";
    state.result = null;
    renderScreen();
    return;
  }

  // Op shortcuts
  const opKeys = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "%" };
  if (opKeys[k]) {
    document.querySelectorAll(".op-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.op === opKeys[k]);
    });
    state.op = opKeys[k];
    state.result = null;
    if (state.a !== "") state.active = "b";
    renderScreen();
  }
});

// ── Close ─────────────────────────────────────────────────────────────────────
document.getElementById("closeCalc").addEventListener("click", () => window.close());

// ── Init ──────────────────────────────────────────────────────────────────────
renderScreen();
renderHistory();