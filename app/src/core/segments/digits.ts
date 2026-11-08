import type { Glyph } from '@/core/types'

/**
 * Which of a design's segments light to show `char`: a digit's map, nothing
 * for a space (a dark slot), and every segment for a design whose digits
 * aren't worked out yet — so it still shows something.
 */
export function litSegments(glyph: Glyph, char: string): number[] {
  if (!/^\d$/.test(char)) return []
  if (!glyph.digits) return glyph.segments.map((_, i) => i)
  return glyph.digits[Number(char)]
}
