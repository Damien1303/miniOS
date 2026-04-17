const { ipcRenderer } = require("electron");

function newWindow() {
  ipcRenderer.send("new-window");
}

function add() {
  let input = document.getElementById("text");
  let text = input.value;

  if (!text) return;

  let div = document.createElement("div");
  div.className = "note";

  let span = document.createElement("span");
  span.innerText = "🟡 " + text;

  let del = document.createElement("button");
  del.innerText = "🗑";

  del.onclick = () => div.remove();

  div.appendChild(span);
  div.appendChild(del);

  document.getElementById("notes").appendChild(div);

  input.value = "";
}