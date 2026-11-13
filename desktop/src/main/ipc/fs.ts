import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { dialog, shell } from 'electron'
import { FileEntry } from '../../shared/types'

const PROTECTED = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\ProgramData']

function isProtected(p: string): boolean {
  const lower = p.toLowerCase()
  return PROTECTED.some(pr => lower.startsWith(pr.toLowerCase()))
}

async function dirSize(dir: string, maxDepth: number, depth = 0): Promise<number> {
  let total = 0
  let entries: fs.Dirent[]
  try { entries = await fs.promises.readdir(dir, { withFileTypes: true }) } catch { return 0 }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (depth < maxDepth) total += await dirSize(full, maxDepth, depth + 1)
    } else if (e.isFile()) {
      try { total += (await fs.promises.stat(full)).size } catch {}
    }
  }
  return total
}

export function registerFsIpc(ipcMain: any) {
  ipcMain.handle('fs:pickFolder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (res.canceled || !res.filePaths?.length) return null
    return res.filePaths[0]
  })

  ipcMain.handle('fs:openPath', async (_e: any, p: string) => {
    await shell.openPath(p)
    return true
  })

  ipcMain.handle('fs:sizeOf', async (_e: any, p: string) => {
    try {
      const st = await fs.promises.stat(p)
      if (st.isDirectory()) return await dirSize(p, 3)
      return st.size
    } catch { return 0 }
  })

  ipcMain.handle('fs:scanFolder', async (_e: any, root: string, maxDepth = 2) => {
    const result: { path: string; name: string; size: number; isDir: boolean; children?: any[] }[] = []
    let entries: fs.Dirent[]
    try { entries = await fs.promises.readdir(root, { withFileTypes: true }) } catch { return result }
    const items = await Promise.all(entries.map(async (e) => {
      const full = path.join(root, e.name)
      if (isProtected(full)) return null
      const isDir = e.isDirectory()
      const size = isDir ? await dirSize(full, maxDepth) : (await fs.promises.stat(full).catch(() => ({ size: 0 }))).size
      return { path: full, name: e.name, size, isDir }
    }))
    return items.filter(Boolean).sort((a: any, b: any) => b.size - a.size)
  })

  ipcMain.handle('fs:findLargeFiles', async (_e: any, root: string, thresholdMB: number, maxDepth = 6) => {
    const out: FileEntry[] = []
    const threshold = thresholdMB * 1024 * 1024
    async function walk(dir: string, depth: number) {
      if (depth > maxDepth) return
      let entries: fs.Dirent[]
      try { entries = await fs.promises.readdir(dir, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (isProtected(full)) continue
        if (e.isDirectory()) await walk(full, depth + 1)
        else if (e.isFile()) {
          try {
            const st = await fs.promises.stat(full)
            if (st.size >= threshold) out.push({ path: full, name: e.name, size: st.size, isDir: false, modified: st.mtimeMs })
          } catch {}
        }
      }
    }
    await walk(root, 0)
    return out.sort((a, b) => b.size - a.size).slice(0, 500)
  })

  ipcMain.handle('fs:findDuplicates', async (_e: any, root: string, maxDepth = 6) => {
    // group by size first
    const bySize = new Map<number, string[]>()
    async function walk(dir: string, depth: number) {
      if (depth > maxDepth) return
      let entries: fs.Dirent[]
      try { entries = await fs.promises.readdir(dir, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (isProtected(full)) continue
        if (e.isDirectory()) await walk(full, depth + 1)
        else if (e.isFile()) {
          try {
            const st = await fs.promises.stat(full)
            if (st.size < 1024) continue // skip tiny
            const arr = bySize.get(st.size) || []
            arr.push(full)
            bySize.set(st.size, arr)
          } catch {}
        }
      }
    }
    await walk(root, 0)
    const groups: { hash: string; size: number; files: string[] }[] = []
    for (const [size, files] of bySize) {
      if (files.length < 2) continue
      // hash each file
      const byHash = new Map<string, string[]>()
      for (const f of files) {
        try {
          const hash = await hashFile(f)
          const arr = byHash.get(hash) || []
          arr.push(f)
          byHash.set(hash, arr)
        } catch {}
      }
      for (const [hash, fs2] of byHash) {
        if (fs2.length >= 2) groups.push({ hash, size, files: fs2 })
      }
    }
    return groups.sort((a, b) => b.size * b.files.length - a.size * a.files.length).slice(0, 200)
  })
}

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', d => hash.update(d))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}