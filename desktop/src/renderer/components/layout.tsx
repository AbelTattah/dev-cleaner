import { useState } from 'react'
import { Page } from '@/App'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, Scan, Trash2, Copy, FileSearch, AppWindow, Activity, History, Settings as SettingsIcon, CreditCard
} from 'lucide-react'
import logo from '@/assets/logo.png'

const nav: { key: Page; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'deepscan', label: 'Deep Scan', icon: Scan },
  { key: 'junk', label: 'Developer Cleanup', icon: Trash2 },
  { key: 'subscription', label: 'Pro Subscription', icon: CreditCard },
  { key: 'monitor', label: 'Monitor', icon: Activity },
  { key: 'history', label: 'History', icon: History },
  { key: 'settings', label: 'Settings', icon: SettingsIcon }
]

export function Layout({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 flex items-center justify-center">
          <img src={logo} alt="Dev Cleaner" className="h-20 w-auto object-contain" />
        </div>
        <Separator />
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-1">
            {nav.map(item => {
              const Icon = item.icon
              const active = page === item.key
              return (
                <Button
                  key={item.key}
                  variant={active ? 'secondary' : 'ghost'}
                  className="justify-start gap-2"
                  onClick={() => setPage(item.key)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </nav>
        </ScrollArea>
        <div className="p-3 text-xs text-muted-foreground">v1.0.0</div>
      </aside>
      <main className="flex-1 overflow-auto">
        <PageContent page={page} />
      </main>
    </div>
  )
}

import { OverviewPage } from '@/pages/overview'
import { DeepScanPage } from '@/pages/deepscan'
import { JunkPage } from '@/pages/junk'
import { SubscriptionPage } from '@/pages/subscription'
import { MonitorPage } from '@/pages/monitor'
import { HistoryPage } from '@/pages/history'
import { SettingsPage } from '@/pages/settings'

function PageContent({ page }: { page: Page }) {
  switch (page) {
    case 'overview': return <OverviewPage />
    case 'deepscan': return <DeepScanPage />
    case 'junk': return <JunkPage />
    case 'subscription': return <SubscriptionPage />
    case 'monitor': return <MonitorPage />
    case 'history': return <HistoryPage />
    case 'settings': return <SettingsPage />
  }
}