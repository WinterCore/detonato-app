import type { ReactNode } from 'react'
import { Display } from '@/components/segments'
import type { Hero as HeroView } from '@/screens/today/lib/todayView'
import { Button, cn, panel } from '@/ui'

function Shell({ lit, children }: { lit: boolean; children: ReactNode }) {
  return <div className={cn('grid grid-cols-1 gap-5 p-5', panel(lit ? 'lit' : 'plain'))}>{children}</div>
}

function Heading({ eyebrow, lit, title, line }: { eyebrow: string; lit: boolean; title?: string; line?: string }) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <span className={cn('eyebrow', lit ? 'text-led' : 'text-ink-3')}>{eyebrow}</span>
      {title && <span className="text-title font-semibold wrap-anywhere">{title}</span>}
      {line && <span className="text-small text-ink-3">{line}</span>}
    </div>
  )
}

export interface HeroProps {
  hero: HeroView
  clock: string | null
  onStart: () => void
  onOpen: () => void
  onAdd: () => void
}

/** Today's big card: the session under way and its countdown, the task to start next, or the day's state. */
export function Hero({ hero, clock, onStart, onOpen, onAdd }: HeroProps) {
  switch (hero.kind) {
    case 'session':
      return (
        <Shell lit>
          <Heading eyebrow={hero.phase === 'running' ? 'In progress' : 'Paused'} lit title={hero.title} line={hero.line} />
          {/* A wide design on a narrow phone leaves no room beside the countdown: Open drops below it. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            {clock && <Display text={clock} size="58px" label={`${clock} left`} className={hero.phase === 'paused' ? 'blink' : undefined} />}
            <Button className="ms-auto min-h-11 px-4" onClick={onOpen}>
              Open
            </Button>
          </div>
        </Shell>
      )
    case 'next':
      return (
        <Shell lit>
          <Heading eyebrow="Up next" lit title={hero.card.name} line={hero.line} />
          <Button tone="led" aria-label={hero.startLabel} onClick={onStart}>
            {hero.start}
          </Button>
        </Shell>
      )
    case 'cleared':
      return (
        <Shell lit>
          <Heading eyebrow="Day cleared" lit title="Every session done" line={hero.line} />
        </Shell>
      )
    case 'rest':
      return (
        <Shell lit={false}>
          <Heading eyebrow="Rest day" lit={false} title="Nothing scheduled today" />
        </Shell>
      )
    case 'empty':
      return (
        <Shell lit={false}>
          <Heading
            eyebrow="No tasks yet"
            lit={false}
            line="Add what you want to do every day, or on chosen days, and how many sessions it takes."
          />
          <Button tone="led" onClick={onAdd}>
            Add a task
          </Button>
        </Shell>
      )
  }
}
