import type { GhostLevel, LedId, Settings, SoundId, WeekStart } from '@/core/settings'
import type { StyleId } from '@/core/types'
import { writeSettings } from '@/storage/settings'
import { toast } from './feedback'
import { get, set } from './store'

export const NOT_SAVED = "Couldn't save your settings on this device. Changes last until the app closes."

/** Said once a run: a store that refuses one write refuses them all. */
let toldNotSaved = false

/**
 * Every settings change: saved first, then put in the store, which every
 * screen and `lib/applyDisplay` follow. No toast on success: the screen
 * changing is the answer. If the device won't save it, the change still
 * holds for this run, and a toast says so once.
 */
function change(action: string, patch: Partial<Settings>): void {
  const settings = { ...get().settings, ...patch }
  if (!writeSettings(settings) && !toldNotSaved) {
    toldNotSaved = true
    toast(NOT_SAVED)
  }
  set(`settings/${action}`, { settings })
}

export const setStyle = (styleId: StyleId) => change('style', { styleId })
export const setLed = (led: LedId) => change('led', { led })
export const setGhost = (ghost: GhostLevel) => change('ghost', { ghost })
export const setGlow = (glow: boolean) => change('glow', { glow })
export const setDefaultLength = (defaultLength: number) => change('defaultLength', { defaultLength })
export const setKeepAwake = (keepAwake: boolean) => change('keepAwake', { keepAwake })
export const setSound = (sound: SoundId) => change('sound', { sound })
export const setHaptics = (haptics: boolean) => change('haptics', { haptics })
export const setNotify = (notify: boolean) => change('notify', { notify })
export const setWeekStart = (weekStart: WeekStart) => change('weekStart', { weekStart })

/** A restored backup's settings, all at once. */
export const replaceSettings = (settings: Settings) => change('replace', settings)
