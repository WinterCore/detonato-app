import { memo, type CSSProperties } from 'react'
import { litSegments } from '@/core/segments/digits'
import type { Glyph } from '@/core/types'

/** Every segment, in the layer's colour. */
const Segments = memo(function Segments({ glyph }: { glyph: Glyph }) {
  return glyph.segments.map((m, i) => <g key={i} dangerouslySetInnerHTML={{ __html: m }} />)
})

/**
 * One digit in a design: the ghost layer under the lit one, whose segments
 * each switch on or off alone (`data-seg` is the sheet's order). `index` is
 * the digit's place in its display, for the sweep.
 */
export const Digit = memo(function Digit({ glyph, char, index }: { glyph: Glyph; char: string; index: number }) {
  const [x, y, w, h] = glyph.box
  const on = new Set(litSegments(glyph, char))
  const viewBox = `${x} ${y} ${w} ${h}`
  return (
    <span className="seg-digit" style={{ width: `${w / h}em`, '--d': index } as CSSProperties}>
      <svg className="ghost" viewBox={viewBox} aria-hidden>
        <Segments glyph={glyph} />
      </svg>
      <svg className="lit" viewBox={viewBox} aria-hidden>
        {glyph.segments.map((m, i) => (
          <g
            key={i}
            data-seg={i}
            className={on.has(i) ? 'on' : undefined}
            style={{ '--i': i } as CSSProperties}
            dangerouslySetInnerHTML={{ __html: m }}
          />
        ))}
      </svg>
    </span>
  )
})
