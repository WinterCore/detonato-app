/*
 * The app icon and splash screen: a countdown dial of 24 ticks, three
 * quarters lit, with «25» in Sports segments in its middle, in the LED's
 * amber on the app's ground. Drawn here as SVG, rendered to the source PNGs
 * in assets/ with Inkscape (as `pnpm glyphs` needs), then handed to
 * @capacitor/assets, which writes every size into the iOS and Android
 * projects. The web build's favicon is the same SVG.
 *
 *   pnpm icons    (after changing the art)
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Glyph } from '../src/core/types.ts'
// core/segments/digits.ts only: its one import is a type, which Node strips.
import { litSegments } from '../src/core/segments/digits.ts'

const app = new URL('..', import.meta.url).pathname
const glyphs = JSON.parse(readFileSync(join(app, 'src/core/segments/glyphs.json'), 'utf8')) as Glyph[]

/** The icon's square, in px; the splash's. */
const ICON = 1024
const SPLASH = 2732
/**
 * The dial's share of the splash's square. A phone crops the square to its
 * height, so on an iPhone this is about a third of the screen's width.
 */
const SPLASH_SHARE = 0.16
/** The dial's width on the icon's square: its ticks' outer ends, 300 out from the centre. */
const DIAL_SPAN = 600

/** The LED's default amber, and the app's ground (styles/tokens.css › --led, --bg). */
const LED = '#ffb000'
const GROUND = '#0b0c0d'
/** Unlit marks, as the app's default ghost and the darkest heat shade draw them. */
const GHOST_OPACITY = 0.08
const DIM_OPACITY = 0.1

/** A soft halo under every lit mark, as the app's glow draws one. */
const DEFS =
  '<defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur"/>' +
  '<feComponentTransfer in="blur" result="halo"><feFuncA type="linear" slope="0.55"/></feComponentTransfer>' +
  '<feMerge><feMergeNode in="halo"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'

function glyph(id: string): Glyph {
  const found = glyphs.find((g) => g.id === id)
  if (!found) {
    throw new Error(`No design ${id} in glyphs.json`)
  }
  return found
}

/** One digit at (x, y), `h` tall: every segment in ghost, the lit ones in the LED with the glow. */
function digit(g: Glyph, char: string, x: number, y: number, h: number): string {
  const [bx, by, bw, bh] = g.box
  const w = (bw / bh) * h
  const lit = new Set(litSegments(g, char))
  const all = g.segments.join('')
  const on = g.segments.filter((_, i) => lit.has(i)).join('')
  const frame = `x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" viewBox="${bx} ${by} ${bw} ${bh}" overflow="visible"`
  return `<svg ${frame}><g fill="${LED}" fill-opacity="${GHOST_OPACITY}">${all}</g><g fill="${LED}" filter="url(#glow)">${on}</g></svg>`
}

/** Digits side by side, centred on `cx`, the top at `y`, with the display's 0.1em gap. */
function digits(g: Glyph, text: string, cx: number, y: number, h: number): string {
  const [, , bw, bh] = g.box
  const w = (bw / bh) * h
  const gap = 0.1 * h
  const total = text.length * w + (text.length - 1) * gap
  return [...text].map((ch, i) => digit(g, ch, cx - total / 2 + i * (w + gap), y, h)).join('')
}

/** A tick's look: lit with the glow, or dim. */
function tickFill(lit: boolean): string {
  if (lit) {
    return `fill="${LED}" filter="url(#glow)"`
  }
  return `fill="${LED}" fill-opacity="${DIM_OPACITY}"`
}

/**
 * The dial on the icon's 1024 square: 24 ticks round from the top, the first
 * 18 lit, «25» in the middle. It stays inside Android's adaptive-icon safe
 * zone (the middle 61%), so its round mask never cuts it.
 */
function dial(): string {
  const c = ICON / 2
  const ticks = Array.from({ length: 24 }, (_, i) => {
    return `<rect x="${c - 11}" y="${c - 300}" width="22" height="84" rx="11" ${tickFill(i < 18)} transform="rotate(${i * 15} ${c} ${c})"/>`
  })
  return ticks.join('') + digits(glyph('sports-1'), '25', c, c - 90, 180)
}

function svg(size: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${DEFS}${body}</svg>`
}

const ground = (size: number) => `<rect width="${size}" height="${size}" fill="${GROUND}"/>`

/** The dial scaled onto the splash's square, centred. */
function splashDial(): string {
  const scale = (SPLASH * SPLASH_SHARE) / DIAL_SPAN
  const offset = (SPLASH - ICON * scale) / 2
  return `<g transform="translate(${offset.toFixed(1)} ${offset.toFixed(1)}) scale(${scale.toFixed(4)})">${dial()}</g>`
}

const sources: Record<string, { size: number; svg: string }> = {
  // iOS and Android's older launchers: the dial on the ground.
  'icon-only': { size: ICON, svg: svg(ICON, ground(ICON) + dial()) },
  // Android's adaptive icon: the dial alone over a ground layer.
  'icon-foreground': { size: ICON, svg: svg(ICON, dial()) },
  'icon-background': { size: ICON, svg: svg(ICON, ground(ICON)) },
  // One theme, always dark: the same splash both ways.
  splash: { size: SPLASH, svg: svg(SPLASH, ground(SPLASH) + splashDial()) },
  'splash-dark': { size: SPLASH, svg: svg(SPLASH, ground(SPLASH) + splashDial()) },
}

const work = mkdtempSync(join(tmpdir(), 'detonato-icons-'))
for (const [name, { size, svg: art }] of Object.entries(sources)) {
  const from = join(work, `${name}.svg`)
  writeFileSync(from, art)
  execFileSync('inkscape', [from, '--export-type=png', `--export-width=${size}`, `--export-filename=${join(app, 'assets', `${name}.png`)}`], { stdio: 'inherit' })
}
writeFileSync(join(app, 'public/favicon.svg'), sources['icon-only'].svg)

execFileSync(
  'pnpm',
  [
    'exec',
    'capacitor-assets',
    'generate',
    '--ios',
    '--android',
    `--iconBackgroundColor=${GROUND}`,
    `--iconBackgroundColorDark=${GROUND}`,
    `--splashBackgroundColor=${GROUND}`,
    `--splashBackgroundColorDark=${GROUND}`,
  ],
  { cwd: app, stdio: 'inherit' },
)
