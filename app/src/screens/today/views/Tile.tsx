import type { ReactNode } from 'react'
import { PlayIcon } from '@phosphor-icons/react'
import { Display } from '@/components/segments'
import { cn, panel, type PanelTone } from '@/ui'

const names: Record<PanelTone, string> = { plain: '', lit: '', filled: 'text-led', dashed: 'text-ink-2' }

export interface TileProps {
  name: string
  /** Under the name: «3 × 50 min». */
  meta: string
  /** Bottom left: the pips. When they and the end don't fit side by side, the end drops below them. */
  foot?: ReactNode
  /** Bottom right: play, the countdown, or a check. */
  end: ReactNode
  /** Lit while its session is under way, filled once done, dashed for the quick session. */
  look: PanelTone
  /** Under way, the whole tile opens the timer. */
  open?: { label: string; onClick: () => void }
}

/** A square on Today's grid: a task, or the quick session. */
export function Tile({ name, meta, foot, end, look, open }: TileProps) {
  const shell = cn('flex h-full min-h-34 w-full flex-col justify-between gap-3 p-4 text-start', panel(look))
  const body = (
    <>
      <span className="grid gap-0.5">
        <span className={cn('line-clamp-2 font-medium wrap-anywhere', names[look])}>{name}</span>
        <span className="font-mono text-caption text-ink-3">{meta}</span>
      </span>
      <span className="flex flex-wrap items-end justify-between gap-2">
        {foot}
        <span className="ms-auto shrink-0">{end}</span>
      </span>
    </>
  )
  if (open) {
    return (
      <button type="button" className={cn('press', shell)} aria-label={open.label} onClick={open.onClick}>
        {body}
      </button>
    )
  }
  return <div className={shell}>{body}</div>
}

/** A tile's play button. */
export function TilePlay({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="press grid size-11 place-items-center rounded-full bg-raised text-ink disabled:text-ink-3"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <PlayIcon size={18} weight="fill" />
    </button>
  )
}

/** The countdown on the tile under way; its colon blinks while held. */
export function TileClock({ clock, paused }: { clock: string | null; paused: boolean }) {
  if (!clock) return null
  return <Display text={clock} size="20px" label={`${clock} left`} className={paused ? 'blink' : undefined} />
}
