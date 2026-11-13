import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { registerFsIpc } from './ipc/fs'
import { registerDriveIpc } from './ipc/drives'
import { registerCleanupIpc } from './ipc/cleanup'
import { registerHistoryIpc } from './ipc/history'
import { registerSettingsIpc } from './ipc/settings'

const store = new Store({ name: 'dev-cleaner' })

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Dev Cleaner',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerDriveIpc(ipcMain)
  registerFsIpc(ipcMain)
  registerCleanupIpc(ipcMain, store)
  registerHistoryIpc(ipcMain, store)
  registerSettingsIpc(ipcMain, store)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})