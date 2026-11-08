import type { SoundId } from '@/core/settings'
import { TONES, type Tone } from '@/core/sounds'

/*
 * The session's end, heard in the app: the notes of `core/sounds`, played
 * with Web Audio. With the app closed, the notification plays the same notes
 * from a file (`pnpm sounds`).
 */

let ctx: AudioContext | null = null

/** One context for the app's life. Browsers start it suspended until a tap. */
function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/**
 * Wake the audio from a tap — Start — so the end can sound minutes later
 * without one: iOS lets a page make sound only once a tap has started it.
 */
export function primeAudio(): void {
  try {
    audio()
  } catch (err) {
    console.error(err)
  }
}

/** One note: a 5 ms rise, then an exponential fade. */
function tone(c: AudioContext, t0: number, { freq, at, len, gain, wave }: Tone): void {
  const osc = c.createOscillator()
  const amp = c.createGain()
  const start = t0 + at
  osc.type = wave
  osc.frequency.value = freq
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.005)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + len)
  osc.connect(amp).connect(c.destination)
  osc.start(start)
  osc.stop(start + len + 0.05)
}

export function playSound(id: SoundId): void {
  const tones = TONES[id]
  if (!tones.length) return
  try {
    const c = audio()
    if (!c) return
    const t0 = c.currentTime + 0.02
    for (const t of tones) tone(c, t0, t)
  } catch (err) {
    console.error(err) // no sound is the worst of it
  }
}
