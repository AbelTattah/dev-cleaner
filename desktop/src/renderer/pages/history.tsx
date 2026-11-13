import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBytes, formatDate } from '@/lib/format'
import { HistoryEntry } from '../../shared/types'
import { toast } from 'sonner'

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const load = async () => setEntries(await window.api.history.list())
  useEffect(() => { load() }, [])

  const clear = async () => {
    await window.api.history.clear()
    toast.success('History cleared')
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cleanup History</h1>
        <Button variant="outline" onClick={clear}>Clear history</Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Freed</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{formatDate(e.timestamp)}</TableCell>
                  <TableCell>{e.action}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.items}</TableCell>
                  <TableCell>{formatBytes(e.freed)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {entries.length === 0 && <div className="text-muted-foreground py-4">No history yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
