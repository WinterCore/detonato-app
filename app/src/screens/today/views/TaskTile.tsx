import { CheckIcon } from '@phosphor-icons/react'
import type { TaskCardView } from '@/screens/today/lib/todayView'
import { Pips } from '@/ui'
import { Tile, TileClock, TilePlay } from './Tile'

/**
 * One of today's tasks: its sessions as pips and its play button; the one
 * under way shows its countdown and opens the timer; a finished one is lit
 * and checked off.
 */
export function TaskTile({ card, clock, onStart, onOpen }: { card: TaskCardView; clock: string | null; onStart: () => void; onOpen: () => void }) {
  const foot = <Pips total={card.total} done={card.done} live={card.session !== null} size="lg" className="max-w-full flex-wrap" />
  // Under way comes first: a task cut to fewer sessions while one ran is complete, but its session still runs.
  if (card.session) {
    return (
      <Tile
        name={card.name}
        meta={card.meta}
        foot={foot}
        end={<TileClock clock={clock} paused={card.session === 'paused'} />}
        look="lit"
        open={{ label: `${card.name}, ${card.session}. Open the timer`, onClick: onOpen }}
      />
    )
  }
  if (card.complete) {
    const check = (
      <span className="grid size-11 place-items-center text-led" role="img" aria-label="Done">
        <CheckIcon size={22} weight="bold" />
      </span>
    )
    return <Tile name={card.name} meta={card.meta} foot={foot} end={check} look="filled" />
  }
  const play = <TilePlay label={`Start ${card.name}`} disabled={!card.canStart} onClick={onStart} />
  return <Tile name={card.name} meta={card.meta} foot={foot} end={play} look="plain" />
}
