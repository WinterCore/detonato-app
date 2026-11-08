import { CaretLeftIcon } from '@phosphor-icons/react'
import { Display } from '@/components/segments'
import { useStylePicker } from '@/screens/style/hooks/useStylePicker'
import { POSY_URL } from '@/lib/links'
import { IconButton, TextLink, TopBar } from '@/ui'
import { StyleTile } from './StyleTile'

/** «Display style»: every design on the sheet, the chosen one sweeping on in the preview above. */
export function StylePicker() {
  const p = useStylePicker()

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col pb-[calc(32px+env(safe-area-inset-bottom))]">
      {/* The preview stays in view while the list scrolls under it. */}
      <header className="sticky top-0 z-10 bg-bg">
        <TopBar start={<IconButton icon={CaretLeftIcon} label="Back" onClick={p.back} />} title="Display style" />
        <div className="px-4 pb-3">
          <div className="grid justify-items-center gap-3 rounded-xl bg-window px-3 pt-6 pb-4 shadow-window">
            <Display text="25:00" size="78px" sweepKey={p.styleId} />
            <span className="font-mono text-[12px] text-ink-2">{p.preview}</span>
          </div>
        </div>
      </header>

      <div role="radiogroup" aria-label="Display style" className="flex flex-col gap-5 px-4 pt-2">
        {p.sections.map((section) => (
          <section key={section.name} aria-label={section.name} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="eyebrow text-ink-2">{section.name}</h2>
              {section.note && <span className="text-end font-mono text-[11px] text-ink-3">{section.note}</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {section.tiles.map((tile) => (
                <StyleTile key={tile.id} tile={tile} onPick={() => p.pick(tile.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="px-5 pt-6 text-meta text-ink-3">
        All {p.count} designs are by <TextLink href={POSY_URL}>Posy (Michiel de Boer)</TextLink>, from his Segmented Display Designs Sheet v1.1.
      </p>
    </main>
  )
}
