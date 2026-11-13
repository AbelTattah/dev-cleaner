import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store'
import { toast } from 'sonner'
import { PAYSTACK_PUBLIC_KEY, PAYSTACK_PLAN_CODE, PRO_PRICE_GHS } from '@/lib/paystack'

declare global { interface Window { PaystackPop?: any } }

export function SubscriptionPage() {
  const setStore = useAppStore(s => s.setSettings)
  const [s, setS] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.settings.get().then((x: any) => setS(x))
  }, [])

  const loadPaystackScript = () => new Promise<void>((resolve, reject) => {
    if (window.PaystackPop) return resolve()
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Paystack'))
    document.head.appendChild(script)
  })

  const subscribe = async () => {
    if (!email) { toast.error('Enter your email'); return }
    setLoading(true)
    try {
      await loadPaystackScript()
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email,
        amount: PRO_PRICE_GHS * 100,
        currency: 'GHS',
        plan: PAYSTACK_PLAN_CODE || undefined,
        callback: (response: any) => {
          const expires = Date.now() + 30 * 24 * 60 * 60 * 1000
          const updated = { ...s, agentEnabled: true, agentSubscriptionActive: true, agentSubscriptionExpiresAt: expires, agentSubscriptionReference: response.reference }
          setS(updated)
          window.api.settings.set(updated)
          setStore(updated)
          toast.success('Pro subscription activated')
        },
        onClose: () => { toast.info('Payment window closed') }
      })
      handler.openIframe()
    } catch (e: any) {
      toast.error(e?.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const restore = async () => {
    const x = await window.api.settings.get()
    const ref = reference || x.agentSubscriptionReference
    if (!ref) { toast.error('Enter your payment reference'); return }
    const backend = x.subscriptionBackendUrl || 'https://landing-pi-sable-38.vercel.app'
    try {
      const r = await fetch(backend.replace(/\/$/, '') + '/api/verify-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref })
      })
      const data = await r.json()
      if (!data.active) { toast.error(data.error || 'No active subscription found'); return }
      const updated = { ...x, agentEnabled: true, agentSubscriptionActive: true, agentSubscriptionExpiresAt: data.expiresAt, agentSubscriptionReference: data.reference }
      setS(updated)
      setStore(updated)
      await window.api.settings.set(updated)
      toast.success('Subscription restored')
    } catch (e: any) {
      toast.error(e?.message || 'Restore failed')
    }
  }

  const active = s?.agentSubscriptionActive && (s?.agentSubscriptionExpiresAt || 0) > Date.now()

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Pro Subscription</h1>
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dev Cleaner Pro</span>
            {active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-4xl font-bold">GHS {PRO_PRICE_GHS}<span className="text-base font-normal text-muted-foreground"> / month</span></div>
          <ul className="space-y-2 text-sm">
            <li>✅ Proactive storage agent (auto-clears safe caches)</li>
            <li>✅ Background monitoring and low-storage alerts</li>
            <li>✅ Safe cleanup that never touches coding tools</li>
            <li>✅ Priority support</li>
          </ul>
          {active ? (
            <div className="text-sm text-muted-foreground">
              Active until {new Date(s.agentSubscriptionExpiresAt).toLocaleDateString()}
              {s.agentSubscriptionReference && <span> (ref: {s.agentSubscriptionReference})</span>}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button onClick={subscribe} disabled={loading} className="w-full">
                {loading ? 'Opening payment...' : `Subscribe for GHS ${PRO_PRICE_GHS}/month`}
              </Button>
              <div className="space-y-2">
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Payment reference (for restore)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button variant="outline" onClick={restore} className="w-full">
                Restore subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}