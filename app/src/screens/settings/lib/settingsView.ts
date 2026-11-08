import type { BackupFile } from '@/core/backup'
import { glyphName } from '@/core/segments/families'
import {
  GHOST_LEVELS,
  LED_HEX,
  LED_IDS,
  LENGTH_MAX,
  LENGTH_MIN,
  SOUND_IDS,
  WEEK_STARTS,
  type GhostLevel,
  type LedId,
  type Settings,
  type SoundId,
  type WeekStart,
} from '@/core/settings'
import { minutesLabel } from '@/core/timer'
import type { Glyph } from '@/core/types'

/** One choice of a group where one is on: a swatch, a segmented button, a sound. */
export interface Option<T> {
  value: T
  label: string
  checked: boolean
}

const LED_NAMES: Record<LedId, string> = { amber: 'Amber', red: 'Red', green: 'Green', cyan: 'Cyan', ice: 'Ice' }
const GHOST_NAMES: Record<GhostLevel, string> = { off: 'Off', low: 'Low', high: 'High' }
const SOUND_NAMES: Record<SoundId, string> = { chime: 'Chime', bell: 'Bell', beeps: 'Beeps', silent: 'Silent' }
const WEEK_START_NAMES: Record<WeekStart, string> = { 6: 'Sat', 0: 'Sun', 1: 'Mon' }

const options = <T extends string | number>(values: readonly T[], names: Record<T, string>, current: T): Option<T>[] =>
  values.map((value) => ({ value, label: names[value], checked: value === current }))

/** The style row's second line: «Sports · 1 · 7 segments», and a word when its digits aren't mapped. */
export function styleLine(glyph: Glyph, glyphs: Glyph[]): string {
  const line = `${glyphName(glyph, glyphs)} · ${glyph.count} segments`
  return glyph.digits ? line : `${line} · no digit map`
}


/** Everything the settings screen shows, from the settings. */
export function settingsView(s: Settings, glyph: Glyph, glyphs: Glyph[]) {
  return {
    style: styleLine(glyph, glyphs),
    leds: options(LED_IDS, LED_NAMES, s.led).map((o) => ({ ...o, color: LED_HEX[o.value] })),
    ghosts: options(GHOST_LEVELS, GHOST_NAMES, s.ghost),
    glow: s.glow,
    length: {
      /** Two digits for the stepper's display: «05», «25». */
      text: String(s.defaultLength).padStart(2, '0'),
      label: minutesLabel(s.defaultLength),
      atMin: s.defaultLength <= LENGTH_MIN,
      atMax: s.defaultLength >= LENGTH_MAX,
    },
    keepAwake: s.keepAwake,
    sound: SOUND_NAMES[s.sound],
    sounds: options(SOUND_IDS, SOUND_NAMES, s.sound),
    haptics: s.haptics,
    weekStarts: options(WEEK_STARTS, WEEK_START_NAMES, s.weekStart),
  }
}

export type SettingsView = ReturnType<typeof settingsView>

/** The restore sheet's line: what the backup replaces, and when it was saved. */
export function restoreLine(backup: BackupFile): string {
  const saved = new Date(backup.exportedAt)
  const when = Number.isNaN(saved.getTime())
    ? 'in this backup'
    : `saved on ${saved.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const what = backup.data.history ? 'Your tasks, history and settings' : 'Your settings'
  return `${what} will be replaced with the ones ${when}.`
}

/** «Version 0.1.0». */
export const versionLine = (version: string) => `Version ${version}`
