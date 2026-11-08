import { describe, expect, it } from 'vitest'
import { SOUND_IDS } from './settings'
import { endChannel, SOUND_FILES, TONES } from './sounds'

describe('TONES', () => {
  it('has notes for every sound but silence', () => {
    for (const id of SOUND_IDS) expect(TONES[id].length > 0).toBe(id !== 'silent')
  })
})

describe('SOUND_FILES', () => {
  it('names a file Android can hold in res/raw for every sound but silence', () => {
    for (const id of SOUND_IDS) {
      const file = SOUND_FILES[id]
      if (id === 'silent') expect(file).toBeNull()
      else expect(file).toMatch(/^[a-z0-9_]+\.wav$/)
    }
  })
})

describe('endChannel', () => {
  it('rings with the chosen sound, and buzzes if haptics are on', () => {
    expect(endChannel('bell', true)).toEqual({
      id: 'session-end-bell-buzz',
      name: 'Session ends',
      description: 'When a focus session is over',
      sound: 'session_bell.wav',
      importance: 4,
      vibration: true,
    })
  })

  it('arrives quietly when silent', () => {
    const c = endChannel('silent', false)
    expect(c).toMatchObject({ id: 'session-end-silent-still', importance: 2, vibration: false })
    expect(c.sound).toBeUndefined()
  })

  it('gives each sound and buzz its own channel', () => {
    const ids = SOUND_IDS.flatMap((s) => [endChannel(s, true).id, endChannel(s, false).id])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
