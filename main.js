const { app, BrowserWindow, ipcMain } = require("electron")

let mainWin
let calcWin

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWin.loadFile("index.html")
  mainWin.removeMenu()
  mainWin.maximize()

  mainWin.on("maximize", () => {
    mainWin.webContents.send("window-state", true)
  })

  mainWin.on("unmaximize", () => {
    mainWin.webContents.send("window-state", false)
  })
}

function createCalcWindow() {
  if (calcWin && !calcWin.isDestroyed()) {
    calcWin.focus()
    return
  }

  calcWin = new BrowserWindow({
    width: 420,
    height: 560,
    frame: false,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  calcWin.loadFile("calculator.html")
  calcWin.removeMenu()

  calcWin.on("closed", () => {
    calcWin = null
  })

}

app.whenReady().then(() => {
  createMainWindow()
})

ipcMain.on("close-app", () => {
  app.quit()
})

ipcMain.on("new-window", () => {
  createMainWindow()
})

ipcMain.on("open-calculator", () => {
  createCalcWindow()
})

ipcMain.on("toggle-maximize", () => {
  if (!mainWin) return
  if (mainWin.isMaximized()) {
    mainWin.unmaximize()
  } else {
    mainWin.maximize()
  }
})