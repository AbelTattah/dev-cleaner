import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store'
import { toast } from 'sonner'

const windowsTasks = [
  { key: 'all', label: 'Clear All Caches', desc: 'Run every cleanup task below.' },
  { key: 'vs', label: 'Visual Studio', desc: 'bin/obj/.vs folders and VS global caches.' },
  { key: 'android', label: 'Android / Gradle', desc: 'Gradle caches and Android Studio caches.' },
  { key: 'androidsdk', label: 'Android SDK', desc: 'Old build-tools and temp files.' },
  { key: 'flutter', label: 'Flutter', desc: 'Flutter project build artifacts and global cache.' },
  { key: 'npm', label: 'npm / Yarn / pnpm', desc: 'Package manager caches.' },
  { key: 'nuget', label: 'NuGet', desc: 'NuGet global packages and HTTP cache.' },
  { key: 'platformio', label: 'PlatformIO', desc: 'PlatformIO project builds.' },
  { key: 'ide', label: 'IDE Caches', desc: 'JetBrains and VSCode caches.' },
  { key: 'temp', label: 'Windows Temp & Recycle Bin', desc: 'User/system temp and recycle bin.' },
  { key: 'browser', label: 'Browser Caches', desc: 'Chrome, Edge, Firefox, Brave, Opera.' },
  { key: 'apps', label: 'App Caches', desc: 'Slack, Teams, Discord, Spotify, WhatsApp.' }
]

const macTasks = [
  { key: 'all', label: 'Clear All Caches', desc: 'Run every cleanup task below.' },
  { key: 'xcode', label: 'Xcode', desc: 'DerivedData, simulators, device support, archives.' },
  { key: 'android', label: 'Android / Gradle', desc: 'Gradle caches and Android Studio caches.' },
  { key: 'androidsdk', label: 'Android SDK', desc: 'Old build-tools and x86 images.' },
  { key: 'flutter', label: 'Flutter', desc: 'Flutter project build artifacts and global cache.' },
  { key: 'npm', label: 'npm / Yarn / pnpm', desc: 'Package manager caches.' },
  { key: 'homebrew', label: 'Homebrew', desc: 'brew cleanup.' },
  { key: 'cocoapods', label: 'CocoaPods', desc: 'CocoaPods repos and caches.' },
  { key: 'ide', label: 'IDE Caches', desc: 'JetBrains and VSCode caches.' },
  { key: 'system', label: 'System Junk & Logs', desc: 'Trash, logs, system caches (sudo).' },
  { key: 'browser', label: 'Browser Caches', desc: 'Chrome, Brave, Firefox, Safari, Edge, Opera.' },
  { key: 'platformio', label: 'PlatformIO', desc: 'PlatformIO project builds.' },
  { key: 'apps', label: 'App Containers', desc: 'Slack, Teams, Discord, Spotify, WhatsApp.' },
  { key: 'timemachine', label: 'Time Machine Snapshots', desc: 'Local snapshots (sudo).' }
]

export function JunkPage() {
  const settings = useAppStore(s => s.settings)
  const [dryRun, setDryRun] = useState(settings?.dryRun ?? false)
  const [running, setRunning] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const platform = window.api.platform || 'win32'
  const tasks = platform === 'darwin' ? macTasks : windowsTasks

  const run = async (task: string) => {
    if (!confirm(`Run "${task}" cleanup?`)) return
    setRunning(task)
    setOutput('')
    try {
      const res = await window.api.cleanup.runTask(task, { dryRun })
      const text = (res.stdout || '') + (res.stderr ? '\n--- STDERR ---\n' + res.stderr : '')
      setOutput(text || '(no output)')
      if (res.code === 0) {
        toast.success(`Task "${task}" completed`)
        const entry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          action: `Developer cleanup: ${task}`,
          category: 'Developer',
          freed: 0,
          items: 0,
          details: (text || '').slice(-300)
        }
        await window.api.history.add(entry)
      } else {
        toast.error(`Task "${task}" failed (code ${res.code})`)
      }
    } catch (e: any) {
      setOutput(String(e?.message || e))
      toast.error('Task failed')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Developer Cleanup</h1>
        <div className="flex items-center gap-2">
          <Switch checked={dryRun} onCheckedChange={setDryRun} />
          <Label>Dry-run</Label>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Cleaning is performed by the original dev-cleaner engine. Each task runs the corresponding cleanup routine.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map(t => (
          <Card key={t.key}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {t.label}
                <Button size="sm" onClick={() => run(t.key)} disabled={running !== null}>
                  {running === t.key ? 'Running...' : 'Run'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{t.desc}</CardContent>
          </Card>
        ))}
      </div>

      {output && (
        <Card>
          <CardHeader><CardTitle>Output</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-72 w-full rounded border border-border p-2">
              <pre className="text-xs whitespace-pre-wrap font-mono">{output}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}