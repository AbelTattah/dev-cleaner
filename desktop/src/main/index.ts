import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'
import fs from 'fs'
import Store from 'electron-store'
import { registerFsIpc } from './ipc/fs'
import { registerDriveIpc, listDrives } from './ipc/drives'
import { registerCleanupIpc } from './ipc/cleanup'
import { runCleanupTask } from './ipc/cleanup'
import { registerHistoryIpc } from './ipc/history'
import { registerSettingsIpc } from './ipc/settings'

const store = new Store({ name: 'dev-cleaner' })

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let agentTimer: NodeJS.Timeout | null = null
let agentRunning = false
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

function getSettings(): any {
  const defaults = {
    agentEnabled: false,
    agentIntervalMinutes: 30,
    agentLowThresholdGB: 10,
    dryRun: false
  }
  return { ...defaults, ...(store.get('settings') as any || {}) }
}

async function runAgentOnce() {
  if (agentRunning) return
  const settings = getSettings()
  if (!settings.agentEnabled) return
  if (!settings.agentSubscriptionActive || (settings.agentSubscriptionExpiresAt || 0) < Date.now()) return
  agentRunning = true
  try {
    const drives = await listDrives()
    const thresholdBytes = (settings.agentLowThresholdGB || 10) * 1024 * 1024 * 1024
    const low = drives.some((d: any) => d.free < thresholdBytes)
    if (!low) return
    const tasks = process.platform === 'win32' ? ['temp', 'browser', 'apps'] : ['browser', 'apps']
    for (const t of tasks) {
      await runCleanupTask(t, { dryRun: false })
    }
    const history = (store.get('history') as any[]) || []
    history.unshift({
      id: (globalThis as any).crypto?.randomUUID?.() || String(Date.now()),
      timestamp: Date.now(),
      action: 'Proactive agent cleanup',
      category: 'Agent',
      freed: 0,
      items: 0,
      details: 'Low storage detected; cleared safe caches: ' + tasks.join(', ')
    })
    store.set('history', history.slice(0, 500))
  } catch (e) {
    console.error('Agent error', e)
  } finally {
    agentRunning = false
  }
}

function startAgent() {
  stopAgent()
  const settings = getSettings()
  if (!settings.agentEnabled) return
  if (!settings.agentSubscriptionActive || (settings.agentSubscriptionExpiresAt || 0) < Date.now()) return
  const intervalMs = Math.max(1, settings.agentIntervalMinutes || 30) * 60 * 1000
  agentTimer = setInterval(() => { runAgentOnce() }, intervalMs)
  // run once after short delay
  setTimeout(() => runAgentOnce(), 5000)
}

function stopAgent() {
  if (agentTimer) {
    clearInterval(agentTimer)
    agentTimer = null
  }
}

function rebuildTray() {
  if (tray) tray.destroy()
  const settings = getSettings()
  const icon = nativeImage.createFromPath(iconPath() || '')
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('Dev Cleaner')
  const menu = Menu.buildFromTemplate([
    { label: 'Show Dev Cleaner', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Agent enabled', type: 'checkbox', checked: !!settings.agentEnabled, click: (item) => {
      const s = getSettings()
      s.agentEnabled = item.checked
      store.set('settings', s)
      if (item.checked) startAgent(); else stopAgent()
      rebuildTray()
    } },
    { label: 'Run agent now', click: () => runAgentOnce() },
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
  registerSettingsIpc(ipcMain, store, (s: any) => {
    store.set('settings', s)
    if (s.agentEnabled) startAgent(); else stopAgent()
    rebuildTray()
  })
  // override settings:set to use callback? registerSettingsIpc already stores; we also need trigger. We'll patch by re-register? 
  // Instead, wrap: store is source of truth; renderer calls settings:set which stores. We'll poll? Simpler: start agent based on stored settings on ready.
  
  Menu.setApplicationMenu(null)

  createWindow()
  rebuildTray()
  startAgent()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // keep running in tray
})