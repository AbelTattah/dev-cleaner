import Store from 'electron-store'
import { Settings } from '../../shared/types'
import os from 'os'
import path from 'path'

const defaults: Settings = {
  protectedDirs: [],
  quarantineDir: path.join(os.homedir(), '.dev-cleaner-quarantine'),
  dryRun: false,
  lowStorageThresholdGB: 10,
  largeFileThresholdMB: 100,
  maxScanDepth: 6,
  allowRecycleBin: true
}

export function registerSettingsIpc(ipcMain: any, store: Store) {
  ipcMain.handle('settings:get', async () => {
    const s = (store.get('settings') as Settings) || {}
    return { ...defaults, ...s }
  })
  ipcMain.handle('settings:set', async (_e: any, s: Settings) => {
    store.set('settings', s)
    return true
  })
}