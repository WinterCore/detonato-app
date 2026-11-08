import { z } from 'zod/mini'
import { STYLE_IDS } from '@/core/segments/glyphs'
import type { StyleId } from '@/core/types'

/*
 * The settings: how the display looks, how a session runs and ends, and how
 * the calendar reads. Kept on this device (`storage/settings.ts`) and in a
 * backup (`core/backup.ts`); this file says what's in them and reads them
 * back, whatever state they come back in.
 */

export const LED_IDS = ['amber', 'red', 'green', 'cyan', 'ice'] as const
export type LedId = (typeof LED_IDS)[number]

/** Each LED colour, tuned so its unlit segments and heatmap shades still read on the panel. */
export const LED_HEX: Record<LedId, string> = {
  amber: '#ffb000',
  red: '#ff4b33',
  green: '#4dff8f',
  cyan: '#3fd9ff',
  ice: '#e2efff',
}

export const GHOST_LEVELS = ['off', 'low', 'high'] as const
export type GhostLevel = (typeof GHOST_LEVELS)[number]

/** How much of the LED colour an unlit segment shows (tokens.css › --ghost). */
export const GHOST_MIX: Record<GhostLevel, string> = { off: '0%', low: '8%', high: '16%' }

/** What plays when a session ends (`lib/sound`). */
export const SOUND_IDS = ['chime', 'bell', 'beeps', 'silent'] as const
export type SoundId = (typeof SOUND_IDS)[number]

/** The day a week starts on: Saturday, Sunday or Monday, as `Date.getDay()` numbers them. */
export const WEEK_STARTS = [6, 0, 1] as const
export type WeekStart = (typeof WEEK_STARTS)[number]

/**
 * A session's length in minutes, for tasks without their own. The stepper
 * moves by `LENGTH_STEP`, and under `LENGTH_FINE` a minute at a time.
 */
export const LENGTH_MIN = 1
export const LENGTH_MAX = 95
export const LENGTH_STEP = 5
export const LENGTH_FINE = 5

export interface Settings {
  /** The display design every countdown is drawn in. */
  styleId: StyleId
  led: LedId
  /** Unlit segments: hidden, faint or plain. */
  ghost: GhostLevel
  /** A soft glow around lit segments. */
  glow: boolean
  /** Minutes in a session, for tasks without their own length. */
  defaultLength: number
  /** Keep the screen on while a session runs. */
  keepAwake: boolean
  sound: SoundId
  haptics: boolean
  /** A notification when a session ends, for when the app is closed or the phone locked. The apps only. */
  notify: boolean
  weekStart: WeekStart
}

export const DEFAULT_SETTINGS: Settings = {
  styleId: 'sports-1',
  led: 'amber',
  ghost: 'low',
  glow: true,
  defaultLength: 25,
  keepAwake: true,
  sound: 'chime',
  haptics: true,
  notify: true,
  weekStart: 6,
}

/**
 * Bump when a stored field changes meaning, and read the older shape in
 * `parseSettings`. A field added or removed needs no bump: missing ones
 * take their default, unknown ones are dropped.
 */
export const SETTINGS_VERSION = 1

const D = DEFAULT_SETTINGS

/*
 * Each field is checked on its own and falls back to its default alone, so
 * one bad value (a hand edit, a value from a newer version) never resets
 * the rest.
 */
const fields = z.object({
  styleId: z.catch(z.string().check(z.refine((id) => STYLE_IDS.has(id))), D.styleId),
  led: z.catch(z.enum(LED_IDS), D.led),
  ghost: z.catch(z.enum(GHOST_LEVELS), D.ghost),
  glow: z.catch(z.boolean(), D.glow),
  defaultLength: z.catch(z.int().check(z.gte(LENGTH_MIN), z.lte(LENGTH_MAX)), D.defaultLength),
  keepAwake: z.catch(z.boolean(), D.keepAwake),
  sound: z.catch(z.enum(SOUND_IDS), D.sound),
  haptics: z.catch(z.boolean(), D.haptics),
  notify: z.catch(z.boolean(), D.notify),
  weekStart: z.catch(z.union([z.literal(6), z.literal(0), z.literal(1)]), D.weekStart),
}) satisfies z.ZodMiniType<Settings>

/** Settings read back from anything — stored JSON, a backup's, nothing at all: every field valid, unknown keys dropped. */
export function parseSettings(raw: unknown): Settings {
  const obj = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return fields.parse(obj)
}

/** The settings as they're stored: versioned. */
export function serializeSettings(s: Settings): Settings & { v: number } {
  return { v: SETTINGS_VERSION, ...s }
}

/** One step up or down, before the ends: a minute at a time under 5, else onto the step grid (a stored 23 goes to 25 or 20). */
function nextLength(length: number, dir: 1 | -1): number {
  if (length < LENGTH_FINE || (dir === -1 && length === LENGTH_FINE)) {
    return length + dir
  }
  if (dir === 1) {
    return Math.floor(length / LENGTH_STEP + 1) * LENGTH_STEP
  }
  return Math.ceil(length / LENGTH_STEP - 1) * LENGTH_STEP
}

/** The stepper's next length: 1, 2, 3, 4, 5, then 10, 15… 95, never past either end. */
export function stepLength(length: number, dir: 1 | -1): number {
  return Math.min(LENGTH_MAX, Math.max(LENGTH_MIN, nextLength(length, dir)))
}
