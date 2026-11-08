import type { CSSProperties } from 'react'
import { cn } from './cn'

/** A day's shade (`core/progress › Level`), or `none` for a day outside the record: not yet, or before any task. */
export type CellLevel = 'none' | 'rest' | 'l0' | 'l1' | 'l2' | 'l3' | 'l4'

const LEVELS: Record<CellLevel, string> = {
  none: 'bg-transparent',
  rest: 'shadow-rest',
  l0: 'bg-lvl-0',
  l1: 'bg-lvl-1',
  l2: 'bg-lvl-2',
  l3: 'bg-lvl-3',
  l4: 'glow-lit bg-lvl-4',
}

/** One day of a heatmap. Today wears an outline. */
export function Cell({ level, today, size }: { level: CellLevel; today?: boolean; size: number }) {
  const style: CSSProperties = { width: size, height: size }
  return <span className={cn('rounded-xs', LEVELS[level], today && 'outline-[1.5px] outline-offset-1 outline-ink')} style={style} />
}
