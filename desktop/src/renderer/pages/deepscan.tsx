import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBytes } from '@/lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function DeepScanPage() {
  const [root, setRoot] = useState('C:\\')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [depth, setDepth] = useState(2)

  const pick = async () => {
    const p = await window.api.fs.pickFolder()
    if (p) setRoot(p)
  }

  const scan = async () => {
    setLoading(true)
    try {
      const res = await window.api.fs.scanFolder(root, depth)
      setItems(res)
    } finally { setLoading(false) }
  }

  const chartData = items.slice(0, 12).map(i => ({ name: i.name, size: Math.round(i.size / (1024*1024)) }))

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Deep Scan</h1>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Input value={root} onChange={e => setRoot(e.target.value)} />
            <Button variant="outline" onClick={pick}>Browse</Button>
            <Button onClick={scan} disabled={loading}>{loading ? 'Scanning...' : 'Scan'}</Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Depth</span>
            <input type="range" min={1} max={4} value={depth} onChange={e => setDepth(Number(e.target.value))} />
            <span>{depth}</span>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top entries by size</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(v: any) => v + ' MB'} />
                  <Bar dataKey="size" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-1">
              {items.map(i => (
                <div key={i.path} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{i.name}</span>
                    <span className="text-xs text-muted-foreground">{i.isDir ? 'Folder' : 'File'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatBytes(i.size)}</span>
                    <Button size="sm" variant="ghost" onClick={() => window.api.fs.openPath(i.path)}>Open</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
