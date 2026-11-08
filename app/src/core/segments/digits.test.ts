import { describe, expect, it } from 'vitest'
import { GLYPHS, glyphById } from './glyphs'
import { litSegments } from './digits'

describe('litSegments', () => {
  const sports = glyphById('sports-1')

  it('lights the standard seven-segment shapes', () => {
    // 8 is every segment; 1 is two; 7 is three.
    expect(litSegments(sports, '8')).toHaveLength(7)
    expect(litSegments(sports, '1')).toHaveLength(2)
    expect(litSegments(sports, '7')).toHaveLength(3)
  })

  it('lights nothing for a space', () => {
    expect(litSegments(sports, ' ')).toEqual([])
  })

  it('lights every segment of a design with no digit map', () => {
    // Every design on the sheet has a map now; one added without would light like this.
    const unmapped = { ...sports, digits: null, how: null }
    expect(litSegments(unmapped, '3')).toEqual(unmapped.segments.map((_, i) => i))
  })

  it('names only segments the design has', () => {
    for (const g of GLYPHS) {
      for (const d of '0123456789') {
        for (const i of litSegments(g, d)) expect(i).toBeLessThan(g.count)
      }
    }
  })
})

describe('glyphById', () => {
  it('falls back to the first design for an unknown id', () => {
    expect(glyphById('gone')).toBe(GLYPHS[0])
  })
})
