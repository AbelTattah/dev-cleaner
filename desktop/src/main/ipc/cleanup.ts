import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { execSync } from 'child_process'
import { app } from 'electron'
import Store from 'electron-store'
import { ScanItem, CleanupResult } from '../../shared/types'

const HOME = os.homedir()
const LOCAL = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local')
const ROAMING = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming')

function exists(p: string): boolean {
  try { return fs.existsSync(p) } catch { return false }
}

async function sizeOf(p: string): Promise<number> {
  try {
    const st = await fs.promises.stat(p)
    if (st.isFile()) return st.size
    if (!st.isDirectory()) return 0
    let total = 0
    const entries = await fs.promises.readdir(p, { withFileTypes: true })
    for (const e of entries) {
      total += await sizeOf(path.join(p, e.name))
    }
    return total
  } catch { return 0 }
}

function globDirs(base: string, filter: (n: string) => boolean): string[] {
  try {
    if (!fs.existsSync(base)) return []
    return fs.readdirSync(base, { withFileTypes: true })
      .filter(d => d.isDirectory() && filter(d.name))
      .map(d => path.join(base, d.name))
  } catch { return [] }
}

function protectedPath(p: string, protectedDirs: string[]): boolean {
  const lower = p.toLowerCase()
  const defaults = ['c:\\windows', 'c:\\program files', 'c:\\program files (x86)', 'c:\\programdata']
  const all = [...defaults, ...protectedDirs.map(x => x.toLowerCase())]
  return all.some(pr => lower === pr || lower.startsWith(pr + '\\') || lower.startsWith(pr + '/'))
}

export async function runCleanupTask(task: string, opts: any = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  const isWin = process.platform === 'win32'
  const name = isWin ? 'dev-cleaner.ps1' : 'dev-cleaner.sh'
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', name),
    path.join(process.resourcesPath || '', name)
  ]
  const script = candidates.find(c => fs.existsSync(c))
  if (!script) return { code: -1, stdout: '', stderr: 'Script not found: ' + name }

  const args: string[] = []
  let cmd = ''
  if (isWin) {
    cmd = 'powershell.exe'
    args.push('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Task', task, '-Yes', '-NoElevate')
    if (opts?.dryRun) args.push('-DryRun')
    if (opts?.flutterDir) args.push('-FlutterDir', opts.flutterDir)
    if (opts?.vsDir) args.push('-VsDir', opts.vsDir)
  } else {
    cmd = 'bash'
    args.push(script, '--task', task, '--yes')
    if (opts?.dryRun) args.push('--dry-run')
    if (opts?.flutterDir) args.push('--flutter-dir', opts.flutterDir)
    if (opts?.vsDir) args.push('--vs-dir', opts.vsDir)
  }

  return await new Promise((resolve) => {
    const proc = spawn(cmd, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('error', (e) => { stderr += e.message })
    proc.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

export function registerCleanupIpc(ipcMain: any, store: Store) {
  ipcMain.handle('cleanup:scanTargets', async () => {
    const items: ScanItem[] = []
    let id = 0
    const push = async (category: string, p: string, name?: string, safe = true) => {
      if (!exists(p)) return
      if (protectedPath(p, (store.get('settings.protectedDirs') as string[]) || [])) return
      const sz = await sizeOf(p)
      if (sz <= 0) return
      items.push({ id: String(id++), path: p, name: name || path.basename(p), category, size: sz, safe, protected: false })
    }

    // Visual Studio global caches
    for (const vdir of globDirs(path.join(LOCAL, 'Microsoft', 'VisualStudio'), () => true)) {
      for (const sub of ['ComponentModelCache', 'MEFCacheData', path.join('Designer', 'ShadowCache'), 'ImageLibrary']) {
        await push('Visual Studio', path.join(vdir, sub), `VS ${path.basename(vdir)} / ${sub}`)
      }
    }
    // NuGet
    await push('NuGet', path.join(HOME, '.nuget', 'packages'), 'NuGet global packages')
    await push('NuGet', path.join(LOCAL, 'NuGet', 'v3-cache'), 'NuGet HTTP cache')
    await push('NuGet', path.join(LOCAL, 'NuGet', 'plugins-cache'), 'NuGet plugins cache')
    // Gradle
    await push('Gradle', path.join(HOME, '.gradle', 'caches'), 'Gradle caches')
    await push('Gradle', path.join(HOME, '.gradle', 'daemon'), 'Gradle daemon')
    // Android Studio
    for (const p of globDirs(path.join(LOCAL, 'Google'), n => n.toLowerCase().startsWith('androidstudio'))) {
      await push('Android', p, 'Android Studio cache')
    }
    for (const p of globDirs(path.join(LOCAL, 'JetBrains'), n => n.toLowerCase().startsWith('androidstudio'))) {
      await push('Android', p, 'Android Studio cache')
    }
    // Flutter / pub
    await push('Flutter', path.join(LOCAL, 'Pub', 'Cache'), 'Pub cache')
    await push('Flutter', path.join(HOME, '.pub-cache'), 'Pub cache (home)')
    await push('Flutter', path.join(HOME, '.flutter'), 'Flutter cache')
    // npm
    await push('npm', path.join(ROAMING, 'npm-cache'), 'npm cache')
    await push('npm', path.join(LOCAL, 'npm-cache'), 'npm cache')
    // yarn
    await push('Yarn', path.join(LOCAL, 'Yarn', 'Cache'), 'Yarn cache')
    // pnpm
    await push('pnpm', path.join(LOCAL, 'pnpm', 'store'), 'pnpm store')
    await push('pnpm', path.join(LOCAL, 'pnpm-cache'), 'pnpm cache')
    // IDEs
    for (const p of globDirs(path.join(LOCAL, 'JetBrains'), () => true)) {
      for (const sub of ['caches', 'index', 'tmp']) await push('IDE', path.join(p, sub), `JetBrains ${path.basename(p)} / ${sub}`)
    }
    await push('IDE', path.join(ROAMING, 'Code', 'Cache'), 'VSCode Cache')
    await push('IDE', path.join(ROAMING, 'Code', 'CachedData'), 'VSCode CachedData')
    await push('IDE', path.join(ROAMING, 'Code', 'CachedExtensionVSIXs'), 'VSCode CachedExtensionVSIXs')
    await push('IDE', path.join(ROAMING, 'Code', 'User', 'workspaceStorage'), 'VSCode workspaceStorage')
    // PlatformIO
    await push('PlatformIO', path.join(HOME, '.platformio'), 'PlatformIO')

    return items.sort((a, b) => b.size - a.size)
  })

  ipcMain.handle('cleanup:scanJunk', async () => {
    const items: ScanItem[] = []
    let id = 0
    const push = async (category: string, p: string, name?: string, safe = true) => {
      if (!exists(p)) return
      if (protectedPath(p, (store.get('settings.protectedDirs') as string[]) || [])) return
      const sz = await sizeOf(p)
      if (sz <= 0) return
      items.push({ id: String(id++), path: p, name: name || path.basename(p), category, size: sz, safe, protected: false })
    }
    // Windows temp
    await push('Temp', process.env.TEMP || path.join(LOCAL, 'Temp'), 'User temp')
    await push('Temp', path.join(LOCAL, 'Temp'), 'Local temp')
    await push('Temp', 'C:\\Windows\\Temp', 'System temp')
    // Browser caches
    const browsers: Record<string, string[]> = {
      Chrome: [path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'), path.join(LOCAL, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache')],
      Edge: [path.join(LOCAL, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'), path.join(LOCAL, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache')],
      Brave: [path.join(LOCAL, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache')],
      Opera: [path.join(ROAMING, 'Opera Software', 'Opera Stable', 'Cache')],
      'Opera GX': [path.join(ROAMING, 'Opera Software', 'Opera GX Stable', 'Cache')]
    }
    for (const [b, ps] of Object.entries(browsers)) {
      for (const p of ps) await push('Browser', p, `${b} cache`)
    }
    // Firefox
    const ff = path.join(LOCAL, 'Mozilla', 'Firefox', 'Profiles')
    if (exists(ff)) {
      for (const prof of globDirs(ff, () => true)) {
        await push('Browser', path.join(prof, 'cache2'), `Firefox ${path.basename(prof)}`)
      }
    }
    // App containers
    const appCaches = [
      [path.join(ROAMING, 'Slack', 'Cache'), 'Slack Cache'],
      [path.join(ROAMING, 'Slack', 'Service Worker', 'CacheStorage'), 'Slack Service Worker'],
      [path.join(ROAMING, 'discord', 'Cache'), 'Discord Cache'],
      [path.join(ROAMING, 'discord', 'Code Cache'), 'Discord Code Cache'],
      [path.join(LOCAL, 'Spotify', 'Storage'), 'Spotify Storage']
    ]
    for (const [p, n] of appCaches) await push('App', p, n)
    // Teams
    await push('App', path.join(ROAMING, 'Microsoft', 'Teams', 'Cache'), 'Teams Cache')
    // Thumbnail cache
    await push('Windows', path.join(LOCAL, 'Microsoft', 'Windows', 'Explorer'), 'Explorer thumbnail cache')
    // Recycle bin size via PowerShell
    try {
      const out = execSync('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).NameSpace(10).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"', { encoding: 'utf8', timeout: 20000 })
      const sz = Number(out.trim()) || 0
      if (sz > 0) items.push({ id: String(id++), path: 'RECYCLE_BIN', name: 'Recycle Bin', category: 'Windows', size: sz, safe: true, protected: false })
    } catch {}
    return items.sort((a, b) => b.size - a.size)
  })

  ipcMain.handle('cleanup:execute', async (_e: any, paths: string[], quarantine: boolean) => {
    const settings = (store.get('settings') as any) || {}
    const protectedDirs = (settings.protectedDirs as string[]) || []
    const quarantineDir = settings.quarantineDir || path.join(HOME, '.dev-cleaner-quarantine')
    const dryRun = !!settings.dryRun
    const result: CleanupResult = { deleted: [], failed: [], freed: 0 }
    if (quarantine && !dryRun) {
      try { fs.mkdirSync(quarantineDir, { recursive: true }) } catch {}
    }
    for (const p of paths) {
      if (p === 'RECYCLE_BIN') {
        if (dryRun) { result.deleted.push(p); continue }
        try {
          execSync('powershell -NoProfile -Command "Clear-RecycleBin -Force"', { timeout: 30000 })
          result.deleted.push(p)
        } catch (e: any) { result.failed.push({ path: p, reason: e?.message || String(e) }) }
        continue
      }
      if (protectedPath(p, protectedDirs)) {
        result.failed.push({ path: p, reason: 'Protected path' })
        continue
      }
      // size before
      let sz = 0
      try { sz = await sizeOf(p) } catch {}
      if (dryRun) {
        result.deleted.push(p)
        result.freed += sz
        continue
      }
      try {
        if (quarantine) {
          const dest = path.join(quarantineDir, `${Date.now()}_${path.basename(p)}`)
          try {
            fs.renameSync(p, dest)
          } catch {
            // cross-device: copy then delete
            const st = await fs.promises.stat(p)
            if (st.isDirectory()) {
              fs.cpSync(p, dest, { recursive: true })
              await fs.promises.rm(p, { recursive: true, force: true })
            } else {
              await fs.promises.copyFile(p, dest)
              await fs.promises.unlink(p)
            }
          }
        } else {
          // delete
          const st = await fs.promises.stat(p)
          if (st.isDirectory()) await fs.promises.rm(p, { recursive: true, force: true })
          else await fs.promises.unlink(p)
        }
        result.deleted.push(p)
        result.freed += sz
      } catch (e: any) {
        result.failed.push({ path: p, reason: e?.message || String(e) })
      }
    }
    return result
  })

  ipcMain.handle('cleanup:runTask', async (_e: any, task: string, opts: any) => runCleanupTask(task, opts))
}