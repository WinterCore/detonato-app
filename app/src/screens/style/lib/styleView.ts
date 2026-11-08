import { familiesOf, familyNote, glyphName } from '@/core/segments/families'
import type { Glyph, StyleId } from '@/core/types'

/** One design in the picker, drawn as a lit 8. */
export interface StyleTile {
  id: StyleId
  /** Under the tile: the variant in a family of several, the segment count for one alone. */
  label: string
  /** The whole name, for a screen reader: «Sports · 2». */
  name: string
  selected: boolean
}

export interface StyleSection {
  name: string
  note: string | null
  tiles: StyleTile[]
}

/** Every design, grouped by family in sheet order, the chosen one marked. */
export function styleSections(glyphs: Glyph[], current: StyleId): StyleSection[] {
  return familiesOf(glyphs).map((family) => ({
    name: family.name,
    note: familyNote(family),
    tiles: family.glyphs.map((g) => ({
      id: g.id,
      label: family.glyphs.length > 1 ? g.variant : `${g.count} seg`,
      name: glyphName(g, glyphs),
      selected: g.id === current,
    })),
  }))
}

/** Under the preview: «Sports · 1 · 7 segments». */
export function previewLine(glyph: Glyph, glyphs: Glyph[]): string {
  return `${glyphName(glyph, glyphs)} · ${glyph.count} segments`
}
