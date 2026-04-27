const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");


// ── State ────────────────────────────────────────────────────────────────────
let notes = [];
let currentId = null;
let filterTag = "all";
let searchTerm = "";

// ── DOM ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── CLOCK ─────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();

  const cl = $("clock");
  if (cl) cl.innerText = now.toLocaleTimeString("fr-FR");

  const da = $("date");
  if (da) {
    da.innerText = now.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    });
  }
}

setInterval(updateClock, 1000);
updateClock();

// ── PERSISTENCE ──────────────────────────────────────────────────────────────
function persist() {
  try {
    fs.writeFileSync(SAVE_PATH, JSON.stringify(notes, null, 2), "utf-8");
  } catch (e) {
    console.error(e);
  }
}

function load() {
  try {
    if (fs.existsSync(SAVE_PATH)) {
      const d = JSON.parse(fs.readFileSync(SAVE_PATH, "utf-8"));
      notes = Array.isArray(d) ? d : [];
    }
  } catch (e) {
    notes = [];
  }
  renderList();
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function nowLabel() {
  return new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function plainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.innerText.replace(/\n+/g, " ").trim();
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function flashSaved() {
  const el = $("savedFlash");
  if (!el) return;

  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1500);
}

// ── FILTER ───────────────────────────────────────────────────────────────────
function visible() {
  return notes.filter(n => {
    const matchTag =
      filterTag === "all"
        ? true
        : filterTag === "pinned"
        ? n.pinned
        : n.tag === filterTag;

    const s = searchTerm.trim().toLowerCase();

    const matchSearch =
      !s ||
      (n.title || "").toLowerCase().includes(s) ||
      plainText(n.body || "").toLowerCase().includes(s);

    return matchTag && matchSearch;
  });
}

// ── RENDER LIST ──────────────────────────────────────────────────────────────
function renderList() {
  const list = $("notesList");
  if (!list) return;

  const vis = visible();

  const cnt = $("noteCount");
  if (cnt)
    cnt.innerText = `${notes.length} note${
      notes.length !== 1 ? "s" : ""
    }`;

  list.innerHTML = "";

  vis.forEach(n => {
    const item = document.createElement("div");
    item.className = "note-item" + (n.id === currentId ? " active" : "");
    item.dataset.id = n.id;

    const preview = plainText(n.body || "").slice(0, 60) || "—";

    const tagsHTML = [
      n.pinned ? `<span class="note-tag pinned">📌</span>` : "",
      n.tag ? `<span class="note-tag ${n.tag}">${n.tag}</span>` : ""
    ].join("");

    item.innerHTML = `
      <div class="note-item-title">${escHtml(n.title || "Sans titre")}</div>
      <div class="note-item-preview">${escHtml(preview)}</div>
      <div class="note-item-meta">
        ${tagsHTML}
        <span class="note-date">${n.updatedAt || n.createdAt || ""}</span>
      </div>
    `;

    item.addEventListener("click", () => openNote(n.id));
    list.appendChild(item);
  });

  if (currentId && !vis.find(n => n.id === currentId)) {
    closeEditor();
  }
}

// ── GAME ─────────────────────────────────────────────────────────────────────
function openGame() {
  ipcRenderer.send("open-game");
}

// ── OPEN NOTE ────────────────────────────────────────────────────────────────
function openNote(id) {
  if (currentId && currentId !== id) saveCurrentNote(false);

  currentId = id;
  const n = notes.find(x => x.id === id);
  if (!n) return;

  $("emptyState").style.display = "none";
  $("editorInner").style.display = "flex";

  $("noteTitle").value = n.title || "";
  $("noteEditor").innerHTML = n.body || "";
  $("tagSelect").value = n.tag || "";
  updatePinBtn(n.pinned);

  renderList();
}

function closeEditor() {
  currentId = null;
  $("emptyState").style.display = "";
  $("editorInner").style.display = "none";
  renderList();
}

function updatePinBtn(pinned) {
  const btn = $("pinBtn");
  if (!btn) return;
  btn.classList.toggle("active", !!pinned);
}

// ── SAVE ─────────────────────────────────────────────────────────────────────
function saveCurrentNote(flash = true) {
  if (!currentId) return;

  const n = notes.find(x => x.id === currentId);
  if (!n) return;

  n.title = $("noteTitle").value.trim() || "Sans titre";
  n.body = $("noteEditor").innerHTML;
  n.tag = $("tagSelect").value;
  n.updatedAt = nowLabel();

  persist();
  renderList();

  if (flash) flashSaved();
}

// ── NEW NOTE ────────────────────────────────────────────────────────────────
function newNote() {
  const n = {
    id: uid(),
    title: "",
    body: "",
    tag: "",
    pinned: false,
    createdAt: nowLabel(),
    updatedAt: nowLabel()
  };

  notes.unshift(n);
  persist();
  renderList();
  openNote(n.id);
}

// ── DELETE ───────────────────────────────────────────────────────────────────
function deleteCurrentNote() {
  if (!currentId) return;
  if (!confirm("Supprimer cette note ?")) return;

  notes = notes.filter(n => n.id !== currentId);
  persist();
  closeEditor();
}

// ── TOOLBAR ──────────────────────────────────────────────────────────────────
function execCmd(cmd) {
  $("noteEditor").focus();

  switch (cmd) {
    case "h1":
      document.execCommand("formatBlock", false, "H1");
      break;
    case "h2":
      document.execCommand("formatBlock", false, "H2");
      break;
    case "quote":
      document.execCommand("formatBlock", false, "blockquote");
      break;
    case "hilite":
      document.execCommand(
        "hiliteColor",
        false,
        "rgba(240,193,79,0.3)"
      );
      break;
    default:
      document.execCommand(cmd, false, null);
  }
}

// ── EVENTS ───────────────────────────────────────────────────────────────────
function wire() {
  $("newWinBtn")?.addEventListener("click", () =>
    ipcRenderer.send("new-window")
  );

  $("calcBtn")?.addEventListener("click", () =>
    ipcRenderer.send("open-calculator")
  );

  $("gameBtn")?.addEventListener("click", openGame);

  $("closeAppBtn")?.addEventListener("click", () =>
    ipcRenderer.send("close-app")
  );

  $("toggleMaxBtn")?.addEventListener("click", () =>
    ipcRenderer.send("toggle-maximize")
  );

  $("newNoteBtn")?.addEventListener("click", newNote);

  $("search")?.addEventListener("input", e => {
    searchTerm = e.target.value;
    renderList();
  });

  document.querySelectorAll(".tag-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".tag-chip")
        .forEach(c => c.classList.remove("active"));

      chip.classList.add("active");
      filterTag = chip.dataset.filter;
      renderList();
    });
  });

  $("saveNoteBtn")?.addEventListener("click", () =>
    saveCurrentNote(true)
  );

  $("deleteNoteBtn")?.addEventListener("click", deleteCurrentNote);

  $("pinBtn")?.addEventListener("click", () => {
    if (!currentId) return;

    const n = notes.find(x => x.id === currentId);
    if (!n) return;

    n.pinned = !n.pinned;
    updatePinBtn(n.pinned);
    persist();
    renderList();
  });

  $("tagSelect")?.addEventListener("change", () =>
    saveCurrentNote(false)
  );

  document
    .querySelectorAll(".tool-btn[data-cmd]")
    .forEach(btn => {
      btn.addEventListener("click", () =>
        execCmd(btn.dataset.cmd)
      );
    });

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveCurrentNote(true);
    }
  });

  $("noteTitle")?.addEventListener("input", () => {
    if (!currentId) return;

    const n = notes.find(x => x.id === currentId);
    if (n)
      n.title =
        $("noteTitle").value.trim() || "Sans titre";

    renderList();
  });

  ipcRenderer.on("update-available", () => {
    console.log("Update dispo");
  });

  ipcRenderer.on("update-ready", () => {
    const popup = document.getElementById("updatePopup");
    if (popup) popup.style.display = "block";
  });

  document
    .getElementById("restartBtn")
    ?.addEventListener("click", () => {
      ipcRenderer.send("restart-app");
    });
}

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  wire();
  load();
});
