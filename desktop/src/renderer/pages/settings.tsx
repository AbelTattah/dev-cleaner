import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import { Settings } from '../../shared/types'

export function SettingsPage() {
  const setStore = useAppStore(s => s.setSettings)
  const [s, setS] = useState<Settings | null>(null)
  const [newDir, setNewDir] = useState('')

  useEffect(() => {
    window.api.settings.get().then((x: Settings) => setS(x))
  }, [])

  if (!s) return <div className="p-6">Loading...</div>

  const save = async () => {
    await window.api.settings.set(s)
    setStore(s)
    toast.success('Settings saved')
  }

  const addDir = () => {
    if (!newDir) return
    setS({ ...s, protectedDirs: [...s.protectedDirs, newDir] })
    setNewDir('')
  }

  const removeDir = (d: string) => {
    setS({ ...s, protectedDirs: s.protectedDirs.filter(x => x !== d) })
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Dry-run mode (preview only)</Label>
            <Switch checked={s.dryRun} onCheckedChange={v => setS({ ...s, dryRun: v })} />
          </div>
          <div className="space-y-2">
            <Label>Quarantine directory</Label>
            <Input value={s.quarantineDir} onChange={e => setS({ ...s, quarantineDir: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Low storage threshold (GB)</Label>
            <Input type="number" value={s.lowStorageThresholdGB} onChange={e => setS({ ...s, lowStorageThresholdGB: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Large file threshold (MB)</Label>
            <Input type="number" value={s.largeFileThresholdMB} onChange={e => setS({ ...s, largeFileThresholdMB: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Max scan depth</Label>
            <Input type="number" value={s.maxScanDepth} onChange={e => setS({ ...s, maxScanDepth: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Protected Directories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newDir} onChange={e => setNewDir(e.target.value)} placeholder="C:\\path\\to\\protect" />
            <Button onClick={addDir}>Add</Button>
          </div>
          <div className="space-y-1">
            {s.protectedDirs.map(d => (
              <div key={d} className="flex items-center justify-between text-sm border-b border-border/50 py-1">
                <span className="truncate">{d}</span>
                <Button size="sm" variant="ghost" onClick={() => removeDir(d)}>Remove</Button>
              </div>
            ))}
            {s.protectedDirs.length === 0 && <div className="text-muted-foreground text-sm">No custom protected directories.</div>}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save}>Save settings</Button>
    </div>
  )
}
