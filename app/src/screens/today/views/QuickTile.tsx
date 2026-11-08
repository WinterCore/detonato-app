import type { TodayView } from '@/screens/today/lib/todayView'
import { Tile, TileClock, TilePlay } from './Tile'

/** A session for no task: the default length, logged nowhere. Under way, it opens the timer. */
export function QuickTile({ quick, clock, onStart, onOpen }: { quick: TodayView['quick']; clock: string | null; onStart: () => void; onOpen: () => void }) {
  if (quick.session) {
    return (
      <Tile
        name="Quick session"
        meta={quick.line}
        end={<TileClock clock={clock} paused={quick.session === 'paused'} />}
        look="lit"
        open={{ label: `Quick session, ${quick.session}. Open the timer`, onClick: onOpen }}
      />
    )
  }
  const play = <TilePlay label="Start a quick session" disabled={!quick.canStart} onClick={onStart} />
  return <Tile name="Quick session" meta={quick.line} end={play} look="dashed" />
}
