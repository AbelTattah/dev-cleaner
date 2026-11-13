import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: process.platform,
  drives: {
    list: () => ipcRenderer.invoke('drives:list')
  },
  fs: {
    scanFolder: (root: string, maxDepth?: number) => ipcRenderer.invoke('fs:scanFolder', root, maxDepth),
    findLargeFiles: (root: string, thresholdMB: number, maxDepth?: number) => ipcRenderer.invoke('fs:findLargeFiles', root, thresholdMB, maxDepth),
    findDuplicates: (root: string, maxDepth?: number) => ipcRenderer.invoke('fs:findDuplicates', root, maxDepth),
    pickFolder: () => ipcRenderer.invoke('fs:pickFolder'),
    openPath: (p: string) => ipcRenderer.invoke('fs:openPath', p),
    sizeOf: (p: string) => ipcRenderer.invoke('fs:sizeOf', p)
  },
  cleanup: {
    scanTargets: () => ipcRenderer.invoke('cleanup:scanTargets'),
    scanJunk: () => ipcRenderer.invoke('cleanup:scanJunk'),
    execute: (paths: string[], quarantine: boolean) => ipcRenderer.invoke('cleanup:execute', paths, quarantine),
    runTask: (task: string, opts?: any) => ipcRenderer.invoke('cleanup:runTask', task, opts)
  },
  history: {
    list: () => ipcRenderer.invoke('history:list'),
    clear: () => ipcRenderer.invoke('history:clear'),
    add: (e: any) => ipcRenderer.invoke('history:add', e)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s: any) => ipcRenderer.invoke('settings:set', s)
  }
}

contextBridge.exposeInMainWorld('api', api)