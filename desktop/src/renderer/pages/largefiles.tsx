import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBytes } from '@/lib/format'
import { toast } from 'sonner'

export function LargeFilesPage() {
  const [root, setRoot] = useState('')
  const [threshold, setThreshold] = useState(100)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [executing, setExecuting] = useState(false)

  const pick = async () => { const p = await window.api.fs.pickFolder(); if (p) setRoot(p) }

  const scan = async () => {
    if (!root) return
    setLoading(true)
    try {
      const res = await window.api.fs.findLargeFiles(root, threshold, 6)
      setFiles(res)
      setSelected(new Set())
    } finally { setLoading(false) }
  }

  const toggle = (p: string) => {
    const s = new Set(selected)
    if (s.has(p)) s.delete(p); else s.add(p)
    setSelected(s)
  }

  const run = async () => {
    const paths = [...selected]
    if (paths.length === 0) return
    setExecuting(true)
    try {
      const res = await window.api.cleanup.execute(paths, true)
      const entry = { id: crypto.randomUUID(), timestamp: Date.now(), action: 'Large files removed', category: 'LargeFiles', freed: res.freed, items: res.deleted.length, details: `Deleted ${res.deleted.length}` }
      await window.api.history.add(entry)
      toast.success(`Removed ${res.deleted.length}, freed ${formatBytes(res.freed)}`)
      await scan()
    } finally { setExecuting(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Large Files</h1>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Input value={root} onChange={e => setRoot(e.target.value)} placeholder="Folder to scan" />
            <Button variant="outline" onClick={pick}>Browse</Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Threshold (MB)</span>
            <Input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-24" />
            <Button onClick={scan} disabled={loading || !root}>{loading ? 'Scanning...' : 'Scan'}</Button>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{files.length} large files found</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {files.map(f => (
              <div key={f.path} className="flex items-center gap-3 py-2 border-b border-border/50">
                <Checkbox checked={selected.has(f.path)} onCheckedChange={() => toggle(f.path)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{f.path}</div>
                </div>
                <div className="text-sm text-muted-foreground">{formatBytes(f.size)}</div>
                <Button size="sm" variant="ghost" onClick={() => window.api.fs.openPath(f.path)}>Open</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {selected.size > 0 && (
        <Button onClick={run} disabled={executing}>{executing ? 'Removing...' : `Remove ${selected.size} file(s)`}</Button>
      )}
    </div>
  )
}
