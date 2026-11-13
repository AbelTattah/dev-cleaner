import { execSync } from 'child_process'
import { DriveInfo } from '../../shared/types'

export function registerDriveIpc(ipcMain: any) {
  ipcMain.handle('drives:list', async () => {
    const drives: DriveInfo[] = []
    try {
      const out = execSync('powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name,Root,Used,Free | ConvertTo-Json"', { encoding: 'utf8', timeout: 20000 })
      const parsed = JSON.parse(out)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      for (const d of arr) {
        const name = String(d.Name)
        const mount = String(d.Root || (name + ':\\'))
        const free = Number(d.Free || 0)
        const used = Number(d.Used || 0)
        const total = used + free
        if (total <= 0) continue
        drives.push({ name: name + ':', mount, total, free, used, type: 'Fixed' })
      }
    } catch (e) {
      // fallback
    }
    if (drives.length === 0) {
      // fallback using node fs? just C:
      drives.push({ name: 'C:', mount: 'C:\\', total: 0, free: 0, used: 0, type: 'Fixed' })
    }
    return drives
  })
}