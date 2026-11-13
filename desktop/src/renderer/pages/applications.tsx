import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatBytes } from '@/lib/format'
import { ScanItem } from '../../shared/types'
import { toast } from 'sonner'

export function ApplicationsPage() {
  const [items, setItems] = useState<ScanItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [quarantine, setQuarantine] = useState(true)
  const [executing, setExecuting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await window.api.cleanup.scanTargets()
      setItems(res)
      setSelected(new Set(res.map((i: ScanItem) => i.path)))
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const toggle = (p: string) => {
    const s = new Set(selected)
    if (s.has(p)) s.delete(p); else s.add(p)
    setSelected(s)
  }

  const selectedSize = items.filter(i => selected.has(i.path)).reduce((a, i) => a + i.size, 0)

  const run = async () => {
    const paths = [...selected]
    if (paths.length === 0) return
    setExecuting(true)
    try {
      const res = await window.api.cleanup.execute(paths, quarantine)
      const entry = { id: crypto.randomUUID(), timestamp: Date.now(), action: 'Application cache cleanup', category: 'Applications', freed: res.freed, items: res.deleted.length, details: `Deleted ${res.deleted.length}` }
      await window.api.history.add(entry)
      toast.success(`Freed ${formatBytes(res.freed)}`)
      await load()
    } finally { setExecuting(false) }
  }

  // group by category
  const cats = [...new Set(items.map(i => i.category))]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications & Caches</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={quarantine} onCheckedChange={setQuarantine} />
            <Label>Quarantine</Label>
          </div>
          <Button onClick={load} disabled={loading} variant="outline">{loading ? 'Scanning...' : 'Rescan'}</Button>
        </div>
      </div>

      {cats.map(cat => (
        <Card key={cat}>
          <CardHeader><CardTitle>{cat}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.filter(i => i.category === cat).map(i => (
              <div key={i.path} className="flex items-center gap-3 py-2 border-b border-border/50">
                <Checkbox checked={selected.has(i.path)} onCheckedChange={() => toggle(i.path)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{i.path}</div>
                </div>
                <div className="text-sm text-muted-foreground">{formatBytes(i.size)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {items.length === 0 && <div className="text-muted-foreground">No application caches found.</div>}

      <div className="flex gap-2 items-center">
        <span className="text-sm">Selected: {formatBytes(selectedSize)}</span>
        <Button onClick={() => setSelected(new Set(items.map(i => i.path)))} variant="outline" size="sm">Select all</Button>
        <Button onClick={run} disabled={executing || selected.size === 0} className="ml-auto">
          {executing ? 'Cleaning...' : `Clean ${selected.size} item(s)`}
        </Button>
      </div>
    </div>
  )
}
