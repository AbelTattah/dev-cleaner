import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import { join } from 'path'
import fs from 'fs'
import Store from 'electron-store'
import { registerFsIpc } from './ipc/fs'
import { registerDriveIpc } from './ipc/drives'
import { registerCleanupIpc } from './ipc/cleanup'
import { registerHistoryIpc } from './ipc/history'
import { registerSettingsIpc } from './ipc/settings'

const store = new Store({ name: 'dev-cleaner' })

let mainWindow: BrowserWindow | null = null

function iconPath(): string | undefined {
  const candidates = [
    join(__dirname, '..', '..', '..', 'assets', 'icon.ico'),
    join(__dirname, '..', '..', '..', 'assets', 'icon.png'),
    join(process.resourcesPath || '', 'icon.ico'),
    join(process.resourcesPath || '', 'icon.png')
  ]
  return candidates.find(c => fs.existsSync(c))
}

function createWindow() {
  const saved = store.get('windowBounds') as { x?: number; y?: number; width?: number; height?: number } | undefined
  mainWindow = new BrowserWindow({
    x: saved?.x,
    y: saved?.y,
    width: saved?.width || 1280,
    height: saved?.height || 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Dev Cleaner',
    icon: iconPath(),
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

  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      store.set('windowBounds', bounds)
    }
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  registerDriveIpc(ipcMain)
  registerFsIpc(ipcMain)
  registerCleanupIpc(ipcMain, store)
  registerHistoryIpc(ipcMain, store)
  registerSettingsIpc(ipcMain, store)

  const template = [
    ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ] } as Electron.MenuItemConstructorOptions] : []),
    { label: 'File', submenu: [
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
    ] },
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
    ] },
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
      { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'togglefullscreen' }
    ] },
    { label: 'Help', submenu: [
      { label: 'About Dev Cleaner', click: () => dialog.showMessageBox({ message: 'Dev Cleaner Desktop v1.0.0' }) }
    ] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})