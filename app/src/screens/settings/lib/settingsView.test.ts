import { describe, expect, it } from 'vitest'
import { makeBackup } from '@/core/backup'
import { GLYPHS, glyphById } from '@/core/segments/glyphs'
import { DEFAULT_SETTINGS } from '@/core/settings'
import { EMPTY_SNAPSHOT } from '@/core/types'
import { minutesLabel, restoreLine, settingsView, styleLine } from './settingsView'

const view = (patch = {}) => {
  const s = { ...DEFAULT_SETTINGS, ...patch }
  return settingsView(s, glyphById(s.styleId), GLYPHS)
}

describe('settingsView', () => {
  it('turns on exactly the chosen option of each group', () => {
    const v = view({ led: 'cyan', ghost: 'off', sound: 'bell', weekStart: 1 })
    expect(v.leds.filter((o) => o.checked).map((o) => o.value)).toEqual(['cyan'])
    expect(v.ghosts.filter((o) => o.checked).map((o) => o.value)).toEqual(['off'])
    expect(v.sounds.filter((o) => o.checked).map((o) => o.value)).toEqual(['bell'])
    expect(v.weekStarts.filter((o) => o.checked).map((o) => o.value)).toEqual([1])
  })

  it('gives each LED its colour and name', () => {
    expect(view().leds[0]).toEqual({ value: 'amber', label: 'Amber', checked: true, color: '#ffb000' })
  })

  it('offers the week starts Saturday first', () => {
    expect(view().weekStarts.map((o) => o.label)).toEqual(['Sat', 'Sun', 'Mon'])
  })

  it('draws the length in two digits, and holds its buttons at the ends', () => {
    expect(view({ defaultLength: 1 }).length).toEqual({ text: '01', label: '1 minute', atMin: true, atMax: false })
    expect(view({ defaultLength: 5 }).length).toMatchObject({ text: '05', atMin: false })
    expect(view({ defaultLength: 95 }).length).toMatchObject({ text: '95', atMin: false, atMax: true })
    expect(view().length).toMatchObject({ text: '25', atMin: false, atMax: false })
  })

  it('names the chosen sound', () => {
    expect(view({ sound: 'beeps' }).sound).toBe('Beeps')
  })
})

describe('styleLine', () => {
  it('names the design and counts its segments', () => {
    expect(styleLine(glyphById('sports-1'), GLYPHS)).toBe('Sports · 1 · 7 segments')
  })

  it('says when a design has no digit map', () => {
    const unmapped = { ...glyphById('sports-1'), digits: null, how: null }
    expect(styleLine(unmapped, GLYPHS)).toMatch(/ · no digit map$/)
  })
})

describe('minutesLabel', () => {
  it('counts minutes', () => {
    expect(minutesLabel(1)).toBe('1 minute')
    expect(minutesLabel(25)).toBe('25 minutes')
  })
})

describe('restoreLine', () => {
  it('says when the backup was saved', () => {
    const backup = makeBackup(DEFAULT_SETTINGS, EMPTY_SNAPSHOT, new Date(2026, 10, 5, 12), '0.1.0')
    expect(restoreLine(backup)).toBe('Your tasks, history and settings will be replaced with the ones saved on Nov 5, 2026.')
  })

  it('says a settings-only backup replaces only the settings', () => {
    const backup = makeBackup(DEFAULT_SETTINGS, EMPTY_SNAPSHOT, new Date(2026, 10, 5, 12), '0.1.0')
    expect(restoreLine({ ...backup, data: { ...backup.data, history: null } })).toBe('Your settings will be replaced with the ones saved on Nov 5, 2026.')
  })

  it('leaves the date out when it can’t be read', () => {
    const backup = { ...makeBackup(DEFAULT_SETTINGS, EMPTY_SNAPSHOT, new Date(), '0.1.0'), exportedAt: 'whenever' }
    expect(restoreLine(backup)).toBe('Your tasks, history and settings will be replaced with the ones in this backup.')
  })
})
