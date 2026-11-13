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
  allowRecycleBin: true,
  agentEnabled: false,
  agentIntervalMinutes: 30,
  agentLowThresholdGB: 10,
  paystackPublicKey: '',
  paystackPlanCode: '',
  agentSubscriptionActive: false,
  agentSubscriptionExpiresAt: 0,
  agentSubscriptionReference: '',
  subscriptionBackendUrl: 'https://landing-pi-sable-38.vercel.app'
}

export function registerSettingsIpc(ipcMain: any, store: Store, onChanged?: (s: Settings) => void) {
  ipcMain.handle('settings:get', async () => {
    const s = (store.get('settings') as Settings) || {}
    return { ...defaults, ...s }
  })
  ipcMain.handle('settings:set', async (_e: any, s: Settings) => {
    store.set('settings', s)
    if (onChanged) onChanged(s)
    return true
  })
}