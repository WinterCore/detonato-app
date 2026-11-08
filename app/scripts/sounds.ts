/*
 * The notification's sound files, rendered from the notes the app plays
 * (src/core/sounds.ts), so a session's end sounds the same with the app
 * closed. Writes 16-bit mono WAVs to public/ — where iOS's notifications
 * find them, in the web assets — and to the Android project's res/raw/, where
 * its notification channels take them from.
 *
 *   pnpm sounds    (after changing the notes)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
// core/sounds.ts only: its imports are types, which Node strips. (core/settings.ts imports through `@/`, which Node can't resolve.)
import { SOUND_FILES, TONES, type Tone } from '../src/core/sounds.ts'

const RATE = 44_100
const app = new URL('..', import.meta.url).pathname
const targets = [join(app, 'public'), join(app, 'android/app/src/main/res/raw')]

/** The tone's loudness at `t` seconds: Web Audio's ramps — 5 ms up, exponentially down to near silence at `len`. */
function envelope(t: number, { at, len, gain }: Tone): number {
  const floor = 0.0001
  const u = t - at
  if (u < 0 || u > len) return 0
  if (u < 0.005) return floor * (gain / floor) ** (u / 0.005)
  return gain * (floor / gain) ** ((u - 0.005) / (len - 0.005))
}

function wave(phase: number, kind: Tone['wave']): number {
  const s = Math.sin(phase)
  return kind === 'square' ? Math.sign(s) : s
}

function render(tones: Tone[]): Int16Array {
  const seconds = Math.max(...tones.map((t) => t.at + t.len)) + 0.05
  const out = new Int16Array(Math.ceil(seconds * RATE))
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE
    let v = 0
    for (const tone of tones) v += envelope(t, tone) * wave(2 * Math.PI * tone.freq * (t - tone.at), tone.wave)
    out[i] = Math.round(Math.max(-1, Math.min(1, v)) * 32767)
  }
  return out
}

function wav(samples: Int16Array): Buffer {
  const data = samples.length * 2
  const b = Buffer.alloc(44 + data)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + data, 4)
  b.write('WAVE', 8)
  b.write('fmt ', 12)
  b.writeUInt32LE(16, 16) // PCM header size
  b.writeUInt16LE(1, 20) // PCM
  b.writeUInt16LE(1, 22) // mono
  b.writeUInt32LE(RATE, 24)
  b.writeUInt32LE(RATE * 2, 28) // bytes a second
  b.writeUInt16LE(2, 32) // bytes a frame
  b.writeUInt16LE(16, 34) // bits a sample
  b.write('data', 36)
  b.writeUInt32LE(data, 40)
  Buffer.from(samples.buffer).copy(b, 44)
  return b
}

for (const [id, file] of Object.entries(SOUND_FILES) as [keyof typeof SOUND_FILES, string | null][]) {
  if (!file) continue
  const bytes = wav(render(TONES[id]))
  for (const dir of targets) {
    if (!existsSync(join(dir, '..')) && dir.includes('android')) continue // no Android project yet
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, file), bytes)
    console.log(`${join(dir, file).replace(app, '')}  ${(bytes.length / 1024).toFixed(0)} kB`)
  }
}
