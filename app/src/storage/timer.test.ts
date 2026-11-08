import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDLE, startTimer } from '@/core/timer'
import { readTimer, writeTimer } from './timer'

function memoryStorage() {
  const items = new Map<string, string>()
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
    items,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('readTimer / writeTimer', () => {
  it('reads back a session under way', () => {
    vi.stubGlobal('localStorage', memoryStorage())
    const t = startTimer(25, 1_000_000, { taskId: 'deep', day: '2026-11-05' })
    writeTimer(t)
    expect(readTimer()).toEqual(t)
  })

  it('keeps nothing for an idle timer', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    writeTimer(startTimer(25, 0, { taskId: null, day: '2026-11-05' }))
    writeTimer(IDLE)
    expect(storage.items.size).toBe(0)
    expect(readTimer()).toEqual(IDLE)
  })

  it('is idle when what’s kept is broken or storage refuses', () => {
    const storage = memoryStorage()
    storage.items.set('detonato.timer', '{phase')
    vi.stubGlobal('localStorage', storage)
    expect(readTimer()).toEqual(IDLE)
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(readTimer()).toEqual(IDLE)
  })
})
