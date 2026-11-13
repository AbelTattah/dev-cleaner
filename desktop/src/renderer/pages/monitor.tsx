import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBytes } from '@/lib/format'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '@/store'

interface Snap { time: string; used: number; drive: string }

export function MonitorPage() {
  const settings = useAppStore(s => s.settings)
  const [drives, setDrives] = useState<any[]>([])
  const [history, setHistory] = useState<Snap[]>([])

  const load = async () => {
    const d = await window.api.drives.list()
    setDrives(d)
    const snap: Snap[] = d.map((dr: any) => ({ time: new Date().toLocaleTimeString(), used: dr.used, drive: dr.name }))
    const prev = JSON.parse(localStorage.getItem('driveHistory') || '[]')
    const next = [...prev, ...snap].slice(-60)
    localStorage.setItem('driveHistory', JSON.stringify(next))
    setHistory(next)
  }

  useEffect(() => { load() }, [])

  const threshold = (settings?.lowStorageThresholdGB || 10) * 1024 * 1024 * 1024
  const alerts = drives.filter(d => d.free < threshold)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Storage Monitor</h1>

      {alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">Low storage alert</CardTitle></CardHeader>
          <CardContent>
            {alerts.map(d => (
              <div key={d.name}>{d.name} has only {formatBytes(d.free)} free.</div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Drive Usage History</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="time" hide />
              <YAxis tickFormatter={(v) => Math.round(v / (1024*1024*1024)) + 'GB'} />
              <Tooltip formatter={(v: any) => formatBytes(v)} />
              <Line type="monotone" dataKey="used" stroke="hsl(var(--primary))" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Drives</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {drives.map(d => (
            <div key={d.name} className="flex justify-between text-sm">
              <span>{d.name}</span>
              <span className="text-muted-foreground">{formatBytes(d.free)} free of {formatBytes(d.total)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
