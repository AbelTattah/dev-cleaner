import Store from 'electron-store'
import { HistoryEntry } from '../../shared/types'

export function registerHistoryIpc(ipcMain: any, store: Store) {
  ipcMain.handle('history:list', async () => {
    return (store.get('history') as HistoryEntry[]) || []
  })
  ipcMain.handle('history:clear', async () => {
    store.set('history', [])
    return true
  })
  // helper to add
  ipcMain.handle('history:add', async (_e: any, entry: HistoryEntry) => {
    const list = (store.get('history') as HistoryEntry[]) || []
    list.unshift(entry)
    store.set('history', list.slice(0, 500))
    return true
  })
}