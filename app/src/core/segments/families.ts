import type { Glyph } from '@/core/types'

/** One family of designs, in sheet order: Sports and its four variants. */
export interface Family {
  name: string
  glyphs: Glyph[]
}

/** The designs grouped by family, families and designs both in sheet order. */
export function familiesOf(glyphs: Glyph[]): Family[] {
  const out: Family[] = []
  const byName = new Map<string, Family>()
  for (const g of glyphs) {
    let family = byName.get(g.family)
    if (!family) {
      family = { name: g.family, glyphs: [] }
      byName.set(g.family, family)
      out.push(family)
    }
    family.glyphs.push(g)
  }
  return out
}

/** «Sports · 1» for a design in a family of several, «Tangram» for one that stands alone. */
export function glyphName(glyph: Glyph, glyphs: Glyph[]): string {
  const siblings = glyphs.filter((g) => g.family === glyph.family).length
  return siblings > 1 ? `${glyph.family} · ${glyph.variant}` : glyph.family
}

/**
 * The digits a design draws alike, each group in order: `[[0, 8]]` for one
 * with no middle bar. Empty when every digit has a shape of its own.
 */
export function sameDigits(glyph: Glyph): number[][] {
  const groups = new Map<string, number[]>()
  glyph.digits?.forEach((lit, d) => {
    const key = [...lit].sort((a, b) => a - b).join(',')
    groups.set(key, [...(groups.get(key) ?? []), d])
  })
  return [...groups.values()].filter((g) => g.length > 1)
}

/** «0 and 8», «1, 3 and 7». */
const listed = (ds: number[]) => (ds.length < 3 ? ds.join(' and ') : `${ds.slice(0, -1).join(', ')} and ${ds.at(-1)}`)

/**
 * What to know about a family before picking from it: which of its designs
 * light every segment (digits not worked out yet), or which digits look the
 * same (a family's designs share a layout, so its first speaks for all).
 * Null when there's nothing to say.
 */
export function familyNote(family: Family): string | null {
  const missing = family.glyphs.filter((g) => !g.digits)
  if (missing.length === family.glyphs.length) return 'Digits not mapped yet'
  if (missing.length) return `${missing.map((g) => g.variant).join(', ')}: digits not mapped yet`
  const alike = sameDigits(family.glyphs[0])
  if (alike.length) return `${alike.map(listed).join('; ')} look the same`
  return null
}
