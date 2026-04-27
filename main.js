const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const path = require("path");

// ─────────────────────────────
// WINDOWS STATE
// ─────────────────────────────
let mainWin = null;
let calcWin = null;
let gameWin = null;

// ─────────────────────────────
// REMOVE MENU
// ─────────────────────────────
Menu.setApplicationMenu(null);

// ─────────────────────────────
// LOG / UPDATER
// ─────────────────────────────
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

log.info("APP START", app.getVersion());

// ─────────────────────────────
// MAIN WINDOW
// ─────────────────────────────
function createMainWindow() {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.focus();
    return;
  }

  mainWin = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0c",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWin.loadFile("index.html");

  mainWin.once("ready-to-show", () => {
    mainWin.show();
    mainWin.maximize();
  });

  mainWin.on("closed", () => {
    mainWin = null;
  });
}

// ─────────────────────────────
// CALC WINDOW
// ─────────────────────────────
function createCalcWindow() {
  if (calcWin && !calcWin.isDestroyed()) {
    calcWin.focus();
    return;
  }

  calcWin = new BrowserWindow({
    width: 420,
    height: 560,
    frame: false,
    resizable: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0c",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  calcWin.setMenu(null);
  calcWin.loadFile("calculator.html");

  calcWin.on("closed", () => {
    calcWin = null;
  });
}

// ─────────────────────────────
// GAME WINDOW (FIXED CLEAN)
// ─────────────────────────────
function createGameWindow() {
  if (gameWin && !gameWin.isDestroyed()) {
    gameWin.focus();
    return;
  }

  gameWin = new BrowserWindow({
    width: 420,
    height: 560,
    frame: false,
    resizable: false,
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0c",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  gameWin.setMenu(null);
  gameWin.loadFile("game.html");

  gameWin.on("closed", () => {
    gameWin = null;
  });
}

// ─────────────────────────────
// UPDATER
// ─────────────────────────────
function initUpdater() {
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);

  autoUpdater.on("update-available", () => {
    mainWin?.webContents.send("update-available");
  });

  autoUpdater.on("update-downloaded", () => {
    mainWin?.webContents.send("update-ready");
  });
}

// ─────────────────────────────
// IPC (SIMPLE & CLEAN)
// ─────────────────────────────
ipcMain.on("close-app", () => app.quit());

ipcMain.on("open-calculator", () => createCalcWindow());

ipcMain.on("open-game", () => createGameWindow());

ipcMain.on("close-game", () => {
  if (gameWin && !gameWin.isDestroyed()) {
    gameWin.close();
    gameWin = null;
  }
});

ipcMain.on("toggle-maximize", () => {
  if (!mainWin) return;

  mainWin.isMaximized()
    ? mainWin.unmaximize()
    : mainWin.maximize();
});

ipcMain.on("new-window", () => {
  createMainWindow();
});

ipcMain.on("restart-app", () => {
  autoUpdater.quitAndInstall();
});

// ─────────────────────────────
// READY
// ─────────────────────────────
app.whenReady().then(() => {
  createMainWindow();
  initUpdater();
});

// ─────────────────────────────
// EXIT CLEAN
// ─────────────────────────────
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});