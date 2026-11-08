/*
 * The app's segment designs (Posy's sheet, `pnpm glyphs`), read at build
 * time: the page ships only the markup of the designs it draws.
 */
import data from '../../../app/src/core/segments/glyphs.json'

export interface Glyph {
  id: string
  family: string
  variant: string
  /** The digit's frame in the sheet: x, y, width, height. */
  box: [number, number, number, number]
  /** Each segment's SVG markup. */
  segments: string[]
  /** Which segments make each digit 0–9; null for a design drawn whole. */
  digits: number[][] | null
}

const GLYPHS = data as unknown as Glyph[]

export function glyph(id: string): Glyph {
  const found = GLYPHS.find((g) => g.id === id)
  if (!found) {
    throw new Error(`No design ${id} in glyphs.json`)
  }
  return found
}

/** The segments lit for `char`: a digit's map, none for anything else. */
export function lit(g: Glyph, char: string): number[] {
  if (!/^\d$/.test(char)) {
    return []
  }
  if (!g.digits) {
    return g.segments.map((_, i) => i)
  }
  return g.digits[Number(char)]
}

/** «Sports 1». */
export const designName = (g: Glyph) => `${g.family} ${g.variant}`

/** A number from 0 to 1 that's the same for the same seed on every build: delays and shades that look random. */
export function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}
