import { useState } from 'react'

export interface Settings {
  readerWidth: 'constrained' | 'full'
  spreadView: boolean
  spreadDirection: 'rtl' | 'ltr'
  version: number
}

const STORAGE_KEY = 'comicreader.settings'

const defaults: Settings = {
  readerWidth: 'constrained',
  spreadView: false,
  spreadDirection: 'rtl',
  version: 1,
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (parsed?.version === 1) return { ...defaults, ...parsed }
  } catch {
    // ignore
  }
  return defaults
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function updateSettings(patch: Partial<Settings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return { settings, updateSettings }
}
