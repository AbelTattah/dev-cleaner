import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout'
import { useAppStore } from '@/store'

export type Page = 'overview' | 'deepscan' | 'junk' | 'monitor' | 'history' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const loadSettings = useAppStore(s => s.loadSettings)
  useEffect(() => { loadSettings() }, [loadSettings])
  return <Layout page={page} setPage={setPage} />
}