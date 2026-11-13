import { create } from 'zustand'
import { Settings } from '../shared/types'

interface AppState {
  settings: Settings | null
  setSettings: (s: Settings) => void
  loadSettings: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  setSettings: (s) => set({ settings: s }),
  loadSettings: async () => {
    const s = await window.api.settings.get()
    set({ settings: s })
  }
}))