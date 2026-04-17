const { app, BrowserWindow, ipcMain } = require("electron");

let windows = [];

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
  windows.push(win);
}

app.whenReady().then(() => {
  createWindow();
});

ipcMain.on("new-window", () => {
  createWindow();
});