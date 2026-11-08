import { Display } from '@/components/segments'
import type { StyleTile as Tile } from '@/screens/style/lib/styleView'
import { tileId } from '@/screens/style/hooks/useStylePicker'
import { cn } from '@/ui'

/** One design, drawn as a lit 8, with its variant under it. */
export function StyleTile({ tile, onPick }: { tile: Tile; onPick: () => void }) {
  return (
    <button
      id={tileId(tile.id)}
      type="button"
      role="radio"
      aria-checked={tile.selected}
      aria-label={tile.name}
      className={cn(
        'press grid justify-items-center gap-1 rounded-2xl border bg-panel pt-3 pb-2',
        tile.selected ? 'border-led shadow-selected' : 'border-line',
      )}
      onClick={onPick}
    >
      <span aria-hidden>
        <Display text="8" size="44px" glyphId={tile.id} />
      </span>
      <span className="font-mono text-micro text-ink-3">{tile.label}</span>
    </button>
  )
}
