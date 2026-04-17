const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

const SAVE_PATH = path.join(process.env.APPDATA || process.env.HOME || __dirname, "minios-notes.json");
const $ = (id) => document.getElementById(id);

let notes = [];
let onlyPinned = false;
let searchTerm = "";

function nowLabel() {
  return new Date().toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateClock() {
  const c = $("clock");
  const d = $("date");
  if (c) c.innerText = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  if (d) d.innerText = new Date().toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function savedFlash() {
  const el = $("savedIndicator");
  if (!el) return;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1500);
}

function persist() {
  try {
    fs.writeFileSync(SAVE_PATH, JSON.stringify(notes, null, 2), "utf-8");
    savedFlash();
  } catch (e) {
    console.error(e);
  }
}

function load() {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SAVE_PATH, "utf-8"));
      notes = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error(e);
    notes = [];
  }
  render();
}

function matches(note) {
  const s = searchTerm.trim().toLowerCase();
  return (!s || note.text.toLowerCase().includes(s)) && (!onlyPinned || note.pinned);
}

function render() {
  const list = $("notes");
  const empty = $("empty");
  const count = $("noteCount");
  if (!list) return;

  const visible = notes.filter(matches);
  list.innerHTML = "";
  if (empty) empty.style.display = visible.length ? "none" : "block";
  if (count) count.innerText = notes.length;

  visible.forEach((note) => {
    const item = document.createElement("article");
    item.className = `note${note.pinned ? " pinned" : ""}`;
    item.innerHTML = `
      <div class="note-head">
        <div>
          <div class="badge">${note.pinned ? "📌 Épinglée" : "📝 Note"}</div>
          <div class="muted">${note.date || nowLabel()}</div>
        </div>
        <div class="note-actions">
          <button class="icon" data-act="pin" type="button">📌</button>
          <button class="icon" data-act="copy" type="button">⧉</button>
          <button class="icon" data-act="del" type="button">🗑</button>
        </div>
      </div>
      <div style="margin-top:10px;white-space:pre-wrap;word-break:break-word"></div>
    `;

    item.querySelector("div[style]").innerText = note.text;

    item.querySelector('[data-act="pin"]').addEventListener("click", () => {
      note.pinned = !note.pinned;
      persist();
      render();
    });

    item.querySelector('[data-act="copy"]').addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(note.text);
        savedFlash();
      } catch (e) {
        console.warn(e);
      }
    });

    item.querySelector('[data-act="del"]').addEventListener("click", () => {
      notes = notes.filter(n => n !== note);
      persist();
      render();
    });

    list.appendChild(item);
  });
}

function add() {
  const input = $("text");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  notes.unshift({ text, date: nowLabel(), pinned: false });
  input.value = "";
  persist();
  render();
  input.focus();
}

function clearInput() {
  const input = $("text");
  if (input) {
    input.value = "";
    input.focus();
  }
}

function wire() {
  $("saveBtn")?.addEventListener("click", add);
  $("clearBtn")?.addEventListener("click", clearInput);
  $("pinBtn")?.addEventListener("click", () => {
    onlyPinned = !onlyPinned;
    $("pinBtn")?.classList.toggle("active", onlyPinned);
    render();
  });
  $("newWinBtn")?.addEventListener("click", () => ipcRenderer.send("new-window"));
  $("closeAppBtn")?.addEventListener("click", () => ipcRenderer.send("close-app"));
  $("calcBtn")?.addEventListener("click", () => ipcRenderer.send("open-calculator"))
  $("search")?.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    render();
  });
  $("text")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add();
  });
}
$("toggleMaxBtn")?.addEventListener("click", () => ipcRenderer.send("toggle-maximize"))

ipcRenderer.on("window-state", (_event, maximized) => {
  const btn = $("toggleMaxBtn")
  if (!btn) return
  btn.innerText = maximized ? "🗗" : "🗖"
})

window.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
  wire();
  load();
});