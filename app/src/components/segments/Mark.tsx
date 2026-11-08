import { cn } from '@/ui'
import { MARKS, type MarkKind } from './marks'

/** A mark between digits; `dim` draws it in quiet ink instead of the LED. */
export function Mark({ kind, dim }: { kind: MarkKind; dim?: boolean }) {
  const { w, body } = MARKS[kind]
  const viewBox = `0 0 ${w} 240`
  return (
    <span className={cn('seg-mark', dim && 'dim')} style={{ width: `${w / 240}em` }}>
      <svg className="ghost" viewBox={viewBox} aria-hidden>
        {body}
      </svg>
      <svg className="lit" viewBox={viewBox} aria-hidden>
        {body}
      </svg>
    </span>
  )
}
