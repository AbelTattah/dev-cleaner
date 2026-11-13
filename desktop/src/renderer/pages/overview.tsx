import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import { DriveInfo, ScanItem } from '../../shared/types'

export function OverviewPage() {
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [targets, setTargets] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const d = await window.api.drives.list()
      setDrives(d)
      const t = await window.api.cleanup.scanTargets()
      setTargets(t)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalFree = drives.reduce((a, d) => a + d.free, 0)
  const totalUsed = drives.reduce((a, d) => a + d.used, 0)
  const total = totalUsed + totalFree
  const junkTotal = targets.reduce((a, t) => a + t.size, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Storage Overview</h1>
        <Button onClick={load} disabled={loading}>{loading ? 'Scanning...' : 'Refresh'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Storage</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{formatBytes(total)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Used</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{formatBytes(totalUsed)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Available</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-400">{formatBytes(totalFree)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Drives</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {drives.map(d => {
            const pct = d.total > 0 ? (d.used / d.total) * 100 : 0
            return (
              <div key={d.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{d.name} {d.mount}</span>
                  <span className="text-muted-foreground">{formatBytes(d.used)} / {formatBytes(d.total)}</span>
                </div>
                <Progress value={pct} />
                <div className="text-xs text-muted-foreground">Free: {formatBytes(d.free)}</div>
              </div>
            )
          })}
          {drives.length === 0 && <div className="text-muted-foreground">No drives found.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quick Cleanup Recommendations</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <span>Development caches detected</span>
            <span className="font-bold text-primary">{formatBytes(junkTotal)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {targets.length} cleanup target(s) found. Go to Applications or Junk Cleaner to review.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
