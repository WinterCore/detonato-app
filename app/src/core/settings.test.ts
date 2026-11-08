import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, LED_HEX, LED_IDS, parseSettings, serializeSettings, stepLength } from './settings'

describe('parseSettings', () => {
  it('gives the defaults for nothing stored', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('gives the defaults for something that is not an object', () => {
    expect(parseSettings('amber')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings(['green'])).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps every valid field', () => {
    const s = {
      styleId: 'classic-bold-1',
      led: 'cyan',
      ghost: 'high',
      glow: false,
      defaultLength: 50,
      keepAwake: false,
      sound: 'beeps',
      haptics: false,
      notify: false,
      weekStart: 1,
    } as const
    expect(parseSettings(s)).toEqual(s)
  })

  it('fixes a bad field alone, keeping the rest', () => {
    const s = parseSettings({ led: 'green', ghost: 'loud', glow: 'yes', defaultLength: 25.5, weekStart: 3 })
    expect(s).toEqual({ ...DEFAULT_SETTINGS, led: 'green' })
  })

  it('takes the default style for a design the sheet does not have', () => {
    expect(parseSettings({ styleId: 'gone-9', led: 'red' })).toEqual({ ...DEFAULT_SETTINGS, led: 'red' })
  })

  it('keeps lengths only within the stepper’s range, a dev build’s short ones included', () => {
    expect(parseSettings({ defaultLength: 1 }).defaultLength).toBe(1)
    expect(parseSettings({ defaultLength: 5 }).defaultLength).toBe(5)
    expect(parseSettings({ defaultLength: 95 }).defaultLength).toBe(95)
    expect(parseSettings({ defaultLength: 0 }).defaultLength).toBe(25)
    expect(parseSettings({ defaultLength: 120 }).defaultLength).toBe(25)
  })

  it('drops unknown keys and the version', () => {
    expect(parseSettings({ v: 1, theme: 'light', led: 'ice' })).toEqual({ ...DEFAULT_SETTINGS, led: 'ice' })
  })

  it('reads back what it stores', () => {
    const s = { ...DEFAULT_SETTINGS, led: 'red' as const, weekStart: 0 as const }
    expect(parseSettings(JSON.parse(JSON.stringify(serializeSettings(s))))).toEqual(s)
  })
})

describe('serializeSettings', () => {
  it('stamps the version', () => {
    expect(serializeSettings(DEFAULT_SETTINGS)).toEqual({ v: 1, ...DEFAULT_SETTINGS })
  })
})

describe('LED_HEX', () => {
  it('has a colour for every LED', () => {
    for (const id of LED_IDS) expect(LED_HEX[id]).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('stepLength', () => {
  it('moves one step', () => {
    expect(stepLength(25, 1)).toBe(30)
    expect(stepLength(25, -1)).toBe(20)
  })

  it('lands on the step grid from a value between steps', () => {
    expect(stepLength(23, 1)).toBe(25)
    expect(stepLength(23, -1)).toBe(20)
  })

  it('stops at the ends: a minute, and 95', () => {
    expect(stepLength(1, -1)).toBe(1)
    expect(stepLength(95, 1)).toBe(95)
  })

  it('goes a minute at a time under 5, and back onto the grid above it', () => {
    expect(stepLength(10, -1)).toBe(5)
    expect(stepLength(7, -1)).toBe(5)
    expect(stepLength(5, -1)).toBe(4)
    expect(stepLength(2, -1)).toBe(1)
    expect(stepLength(1, 1)).toBe(2)
    expect(stepLength(4, 1)).toBe(5)
    expect(stepLength(5, 1)).toBe(10)
  })
})
