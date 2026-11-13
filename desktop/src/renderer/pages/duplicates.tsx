import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBytes } from '@/lib/format'
import { toast } from 'sonner'

export function DuplicatesPage() {
  const [root, setRoot] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [executing, setExecuting] = useState(false)

  const pick = async () => {
    const p = await window.api.fs.pickFolder()
    if (p) setRoot(p)
  }

  const scan = async () => {
    if (!root) return
    setLoading(true)
    try {
      const res = await window.api.fs.findDuplicates(root, 6)
      setGroups(res)
      // default: select all but first in each group
      const sel = new Set<string>()
      for (const g of res) {
        g.files.slice(1).forEach((f: string) => sel.add(f))
      }
      setSelected(sel)
    } finally { setLoading(false) }
  }

  const toggle = (f: string) => {
    const s = new Set(selected)
    if (s.has(f)) s.delete(f); else s.add(f)
    setSelected(s)
  }

  const run = async () => {
    const paths = [...selected]
    if (paths.length === 0) return
    setExecuting(true)
    try {
      const res = await window.api.cleanup.execute(paths, true)
      const entry = { id: crypto.randomUUID(), timestamp: Date.now(), action: 'Duplicate cleanup', category: 'Duplicates', freed: res.freed, items: res.deleted.length, details: `Deleted ${res.deleted.length}` }
      await window.api.history.add(entry)
      toast.success(`Removed ${res.deleted.length} duplicates, freed ${formatBytes(res.freed)}`)
      await scan()
    } finally { setExecuting(false) }
  }

  const totalWaste = groups.reduce((a, g) => a + g.size * (g.files.length - 1), 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Duplicate File Finder</h1>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Input value={root} onChange={e => setRoot(e.target.value)} placeholder="Folder to scan" />
            <Button variant="outline" onClick={pick}>Browse</Button>
            <Button onClick={scan} disabled={loading || !root}>{loading ? 'Scanning...' : 'Scan'}</Button>
          </div>
        </CardContent>
      </Card>

      {groups.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground">
            {groups.length} duplicate groups found. Potential waste: {formatBytes(totalWaste)}
          </div>
          {groups.map((g, gi) => (
            <Card key={gi}>
              <CardHeader>
                <CardTitle className="text-base">
                  Group {gi + 1} — {g.files.length} files, {formatBytes(g.size)} each
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {g.files.map((f: string, fi: number) => (
                  <div key={f} className="flex items-center gap-3 py-1">
                    <Checkbox checked={selected.has(f)} onCheckedChange={() => toggle(f)} disabled={fi === 0} />
                    <span className="text-xs text-muted-foreground truncate flex-1">{f}</span>
                    {fi === 0 && <span className="text-xs text-green-400">keep</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <Button onClick={run} disabled={executing || selected.size === 0}>
            {executing ? 'Removing...' : `Remove ${selected.size} duplicate(s)`}
          </Button>
        </>
      )}
    </div>
  )
}
