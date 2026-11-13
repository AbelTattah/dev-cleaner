import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import { Settings } from '../../shared/types'

declare global {
  interface Window { PaystackPop?: any }
}

export function SettingsPage() {
  const setStore = useAppStore(s => s.setSettings)
  const [s, setS] = useState<Settings | null>(null)
  const [newDir, setNewDir] = useState('')
  const [email, setEmail] = useState('')

  const loadPaystackScript = () => new Promise<void>((resolve, reject) => {
    if (window.PaystackPop) return resolve()
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Paystack'))
    document.head.appendChild(script)
  })

  const subscribe = async () => {
    if (!s) return
    if (!s.paystackPublicKey) { toast.error('Enter Paystack public key'); return }
    if (!email) { toast.error('Enter your email'); return }
    try {
      await loadPaystackScript()
      const handler = window.PaystackPop.setup({
        key: s.paystackPublicKey,
        email,
        amount: 1000,
        currency: 'GHS',
        plan: s.paystackPlanCode || undefined,
        callback: (response: any) => {
          const expires = Date.now() + 30 * 24 * 60 * 60 * 1000
          const updated = { ...s, agentSubscriptionActive: true, agentSubscriptionExpiresAt: expires, agentSubscriptionReference: response.reference }
          setS(updated)
          window.api.settings.set(updated)
          toast.success('Subscription activated')
        },
        onClose: () => { toast.info('Payment window closed') }
      })
      handler.openIframe()
    } catch (e: any) {
      toast.error(e?.message || 'Payment failed')
    }
  }

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

          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="font-semibold">Proactive Storage Agent</h3>
            <div className="flex items-center justify-between">
              <Label>Enable background agent</Label>
              <Switch checked={s.agentEnabled} onCheckedChange={v => setS({ ...s, agentEnabled: v })} />
            </div>
            <div className="space-y-2">
              <Label>Check interval (minutes)</Label>
              <Input type="number" value={s.agentIntervalMinutes} onChange={e => setS({ ...s, agentIntervalMinutes: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Low storage threshold (GB)</Label>
              <Input type="number" value={s.agentLowThresholdGB} onChange={e => setS({ ...s, agentLowThresholdGB: Number(e.target.value) })} />
            </div>
            <div className="text-xs text-muted-foreground">
              When enabled, the agent runs in the background and clears only safe caches (temp, browser, app caches) when storage is low. Coding-related caches are never touched.
            </div>
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

      <Card>
        <CardHeader><CardTitle>Paystack Subscription (Proactive Agent)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Paystack public key</Label>
            <Input value={s.paystackPublicKey} onChange={e => setS({ ...s, paystackPublicKey: e.target.value })} placeholder="pk_test_..." />
          </div>
          <div className="space-y-2">
            <Label>Paystack plan code (optional)</Label>
            <Input value={s.paystackPlanCode} onChange={e => setS({ ...s, paystackPlanCode: e.target.value })} placeholder="PLN_..." />
          </div>
          <div className="space-y-2">
            <Label>Email for payment</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="text-sm text-muted-foreground">
            Status: {s.agentSubscriptionActive && s.agentSubscriptionExpiresAt > Date.now() ? 'Active until ' + new Date(s.agentSubscriptionExpiresAt).toLocaleDateString() : 'Inactive'}
            {s.agentSubscriptionReference && <span> (ref: {s.agentSubscriptionReference})</span>}
          </div>
          <div className="text-xs text-muted-foreground">Price: 10 GHS / month. Paystack charges in pesewas.</div>
          <Button onClick={subscribe}>Subscribe (10 GHS/month)</Button>
        </CardContent>
      </Card>

      <Button onClick={save}>Save settings</Button>
    </div>
  )
}
