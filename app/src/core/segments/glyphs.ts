import type { Glyph, StyleId } from '@/core/types'
import data from './glyphs.json'

/*
 * Every display design on Posy's Segmented Display Designs Sheet v1.1, in
 * sheet order. The JSON is generated: `pnpm glyphs` (scripts/extract_glyphs.py).
 */
export const GLYPHS = data as Glyph[]

const BY_ID = new Map(GLYPHS.map((g) => [g.id, g]))

export const STYLE_IDS: ReadonlySet<StyleId> = new Set(BY_ID.keys())

/** The design for `id`; the first one (Sports 1) for an id the sheet doesn't have. */
export function glyphById(id: StyleId): Glyph {
  return BY_ID.get(id) ?? GLYPHS[0]
}
