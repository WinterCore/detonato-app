import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@/core/settings'
import { readSettings, writeSettings } from './settings'

function memoryStorage(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed))
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    items,
  }
}

const broken = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('readSettings', () => {
  it('starts on the defaults with nothing stored', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    expect(readSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('reads what was stored', () => {
    vi.stubGlobal('localStorage', memoryStorage({ 'detonato.settings': '{"v":1,"led":"green","glow":false}' }))
    expect(readSettings()).toEqual({ ...DEFAULT_SETTINGS, led: 'green', glow: false })
  })

  it('starts on the defaults when the stored text is not JSON', () => {
    vi.stubGlobal('localStorage', memoryStorage({ 'detonato.settings': '{led: green' }))
    expect(readSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('starts on the defaults when storage refuses to be read', () => {
    vi.stubGlobal('localStorage', broken)
    expect(readSettings()).toEqual(DEFAULT_SETTINGS)
  })
})

describe('writeSettings', () => {
  it('stores the settings, versioned, and they read back', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    const s = { ...DEFAULT_SETTINGS, ghost: 'high' as const }
    expect(writeSettings(s)).toBe(true)
    expect(JSON.parse(storage.items.get('detonato.settings')!)).toEqual({ v: 1, ...s })
    expect(readSettings()).toEqual(s)
  })

  it('says false when storage refuses the write', () => {
    vi.stubGlobal('localStorage', broken)
    expect(writeSettings(DEFAULT_SETTINGS)).toBe(false)
  })
})
