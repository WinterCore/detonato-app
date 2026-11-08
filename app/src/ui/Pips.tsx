import { cn } from './cn'

const sizes = { sm: 'size-2.25', lg: 'size-3' } as const

export interface PipsProps {
  total: number
  done: number
  /** The session under way: the pip after the done ones breathes. */
  live?: boolean
  size?: keyof typeof sizes
  className?: string
}

/** A task's sessions as small squares: lit for each one done. */
export function Pips({ total, done, live, size = 'sm', className }: PipsProps) {
  const pip = sizes[size]
  return (
    <span className={cn('inline-flex items-center gap-1.25', className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        if (i < done) return <span key={i} className={cn('glow-lit rounded-xs bg-led', pip)} />
        if (live && i === done) return <span key={i} className={cn('animate-breathe rounded-xs bg-led', pip)} />
        return <span key={i} className={cn('rounded-xs bg-lvl-0 shadow-pip', pip)} />
      })}
    </span>
  )
}
