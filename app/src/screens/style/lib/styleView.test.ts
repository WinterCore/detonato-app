import { describe, expect, it } from 'vitest'
import { GLYPHS, glyphById } from '@/core/segments/glyphs'
import { previewLine, styleSections } from './styleView'

describe('styleSections', () => {
  const sections = styleSections(GLYPHS, 'sports-2')

  it('holds every design once', () => {
    const ids = sections.flatMap((s) => s.tiles.map((t) => t.id))
    expect(ids).toEqual(GLYPHS.map((g) => g.id))
  })

  it('marks only the chosen design', () => {
    const selected = sections.flatMap((s) => s.tiles).filter((t) => t.selected)
    expect(selected.map((t) => t.id)).toEqual(['sports-2'])
  })

  it('labels a tile by its variant, or by its segments when it stands alone', () => {
    expect(sections[0].tiles[1]).toMatchObject({ label: '2', name: 'Sports · 2' })
    const alone = sections.find((s) => s.tiles.length === 1)!
    expect(alone.tiles[0].label).toMatch(/^\d+ seg$/)
  })
})

describe('previewLine', () => {
  it('names the design and counts its segments', () => {
    expect(previewLine(glyphById('sports-1'), GLYPHS)).toBe('Sports · 1 · 7 segments')
  })
})
