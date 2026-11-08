import { describe, expect, it } from 'vitest'
import type { Glyph } from '@/core/types'
import { familiesOf, familyNote, glyphName, sameDigits } from './families'
import { GLYPHS, glyphById } from './glyphs'

const glyph = (family: string, variant: string, extra: Partial<Glyph> = {}): Glyph => ({
  id: `${family}-${variant}`.toLowerCase(),
  family,
  variant,
  count: 7,
  box: [0, 0, 134, 240],
  segments: [],
  digits: [[0]],
  how: 'seven',
  ...extra,
})

const A1 = glyph('Sports', '1')
const A2 = glyph('Sports', '2')
const B = glyph('Tangram', '1')
const ALL = [A1, A2, B]

describe('familiesOf', () => {
  it('groups designs by family in sheet order', () => {
    expect(familiesOf(ALL)).toEqual([
      { name: 'Sports', glyphs: [A1, A2] },
      { name: 'Tangram', glyphs: [B] },
    ])
  })
})

describe('glyphName', () => {
  it('names the variant in a family of several', () => {
    expect(glyphName(A2, ALL)).toBe('Sports · 2')
  })

  it('names only the family for a design that stands alone', () => {
    expect(glyphName(B, ALL)).toBe('Tangram')
  })
})

describe('familyNote', () => {
  it('says nothing for a family that is fully mapped', () => {
    expect(familyNote({ name: 'Sports', glyphs: [A1, A2] })).toBeNull()
  })

  it('names the designs that are not mapped', () => {
    expect(familyNote({ name: 'Sports', glyphs: [A1, { ...A2, digits: null, how: null }] })).toBe('2: digits not mapped yet')
  })

  it('says so when none are', () => {
    expect(familyNote({ name: 'Sharp', glyphs: [{ ...A1, digits: null, how: null }] })).toBe('Digits not mapped yet')
  })

  it('warns that 0 and 8 match in a design with no middle bar', () => {
    expect(familyNote({ name: 'X Black', glyphs: [glyphById('x-black-1')] })).toBe('0 and 8 look the same')
  })

  it('names every group of digits that match', () => {
    expect(familyNote({ name: '4 Segments', glyphs: [glyphById('4-segments-1')] })).toBe('0 and 8; 1, 3 and 7; 4 and 9 look the same')
  })
})

describe('sameDigits', () => {
  it('groups the digits drawn with the same segments, in any order', () => {
    expect(sameDigits({ ...A1, digits: [[0, 1], [2], [1, 0], [2], [3], [4], [5], [6], [7], [8]] })).toEqual([
      [0, 2],
      [1, 3],
    ])
  })

  it('finds none where every digit has its own shape, or in a design with no map', () => {
    expect(sameDigits(glyphById('sports-1'))).toEqual([])
    expect(sameDigits({ ...A1, digits: null })).toEqual([])
  })
})

describe('the hand-drawn designs', () => {
  it('give every design on the sheet a digit map', () => {
    expect(GLYPHS.filter((g) => !g.digits).map((g) => g.id)).toEqual([])
  })

  it('draw every digit with something lit, and only 0 and 8 alike where a design can’t tell them apart', () => {
    const allowed: Record<string, string> = { '4-segments-1': '0 and 8; 1, 3 and 7; 4 and 9 look the same' }
    for (const g of GLYPHS.filter((x) => x.how === 'hand')) {
      for (const lit of g.digits!) expect(lit.length).toBeGreaterThan(0)
      const note = familyNote({ name: g.family, glyphs: [g] })
      expect([null, '0 and 8 look the same', allowed[g.id]]).toContain(note)
    }
  })
})
