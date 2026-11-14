import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } from 'electron'
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
let tray: Tray | null = null
;(app as any).isQuitting = false

function iconPath(): string | undefined {
  const candidates = [
    join(__dirname, '..', '..', 'assets', 'icon.ico'),
    join(__dirname, '..', '..', 'assets', 'icon.png'),
    join(process.resourcesPath || '', 'icon.ico'),
    join(process.resourcesPath || '', 'icon.png')
  ]
  return candidates.find(c => fs.existsSync(c))
}

function logoPath(): string | undefined {
  const candidates = [
    join(__dirname, '..', '..', 'assets', 'logo.png'),
    join(process.resourcesPath || '', 'logo.png')
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

  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    } else if (mainWindow) {
      const bounds = mainWindow.getBounds()
      store.set('windowBounds', bounds)
    }
  })
}

function rebuildTray() {
  if (tray) tray.destroy()
  const icon = nativeImage.createFromPath(iconPath() || '')
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Dev Cleaner')
  const menu = Menu.buildFromTemplate([
    { label: 'Show Dev Cleaner', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { (app as any).isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
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

  Menu.setApplicationMenu(null)

  createWindow()
  rebuildTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // keep running in tray
})