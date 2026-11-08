import type { SoundId } from '@/core/settings'

/*
 * The sounds a session can end with, as notes: what `lib/sound` plays with
 * Web Audio in the app, and what `pnpm sounds` renders into the WAV files the
 * notification plays with the app closed. One table, so they sound the same.
 */

export interface Tone {
  freq: number
  /** Seconds after the sound starts. */
  at: number
  /** Seconds until it has faded out. */
  len: number
  gain: number
  wave: 'sine' | 'square'
}

const sine = (freq: number, at: number, len: number, gain: number): Tone => ({ freq, at, len, gain, wave: 'sine' })

export const TONES: Record<SoundId, Tone[]> = {
  // Two notes rising a fifth, each with a quiet octave above.
  chime: [sine(1046.5, 0, 1.1, 0.22), sine(2093, 0, 0.6, 0.05), sine(1568, 0.18, 1.4, 0.22), sine(3136, 0.18, 0.7, 0.05)],
  // One strike, with a bell's uneven partials ringing out at different rates.
  bell: [sine(880, 0, 2.6, 0.25), sine(880 * 2.76, 0, 1.4, 0.08), sine(880 * 5.4, 0, 0.7, 0.04), sine(440, 0, 2.2, 0.06)],
  // Three short square beeps: the detonator.
  beeps: [0, 0.16, 0.32].map((at) => ({ freq: 1000, at, len: 0.09, gain: 0.08, wave: 'square' as const })),
  silent: [],
}

/**
 * The notification's sound file for each choice: in `public/` for iOS, and
 * in Android's `res/raw/` (whose names allow only a–z, 0–9 and _). None for
 * silent.
 */
export const SOUND_FILES: Record<SoundId, string | null> = {
  chime: 'session_chime.wav',
  bell: 'session_bell.wav',
  beeps: 'session_beeps.wav',
  silent: null,
}

/** One of Android's notification channels: its sound and buzz are fixed once it exists, so each pair gets its own. */
export interface EndChannel {
  id: string
  name: string
  description: string
  /** The `res/raw` file; none for a silent channel. */
  sound?: string
  /** 4 rings and pops up; 2 arrives quietly. */
  importance: 2 | 4
  vibration: boolean
}

/** Every session-end channel's id starts with this, so the stale ones can be found and removed. */
export const END_CHANNEL_PREFIX = 'session-end'

/** The channel a session's end is announced on, for the chosen sound and haptics. */
export function endChannel(sound: SoundId, haptics: boolean): EndChannel {
  const file = SOUND_FILES[sound]
  return {
    id: `${END_CHANNEL_PREFIX}-${sound}-${haptics ? 'buzz' : 'still'}`,
    name: 'Session ends',
    description: 'When a focus session is over',
    ...(file ? { sound: file } : {}),
    importance: file ? 4 : 2,
    vibration: haptics,
  }
}
