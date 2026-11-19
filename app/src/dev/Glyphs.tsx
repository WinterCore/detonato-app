import { Display } from '@/components/segments'
import { glyphName } from '@/core/segments/families'
import { GLYPHS } from '@/core/segments/glyphs'

const NUMBERS = Array.from({ length: 11 }, (_, number) => String(number))

/**
 * /dev/glyphs (dev only): 0–10 in every design, to check each digit map by
 * eye — and, for the designs with none yet, to map them by hand.
 */
export default function Glyphs() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex flex-col gap-2 pb-6">
        <p className="eyebrow text-ink-3">{GLYPHS.length} styles · 0–10</p>
        <h1 className="text-title font-semibold text-ink">Segment display inspection</h1>
        <p className="text-body text-ink-2">
          Each label shows the intended number. Report the style name or ID and any numbers that look wrong.
        </p>
      </header>
      {GLYPHS.map((g) => (
        <section key={g.id} aria-labelledby={`${g.id}-heading`} className="flex flex-col gap-3 border-t border-line py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={`${g.id}-heading`} className="text-lead font-medium text-ink">{glyphName(g, GLYPHS)}</h2>
            <p className="font-mono text-meta text-ink-3">
              {g.id} · {g.count} segments · {g.how ?? 'no map'}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
            {NUMBERS.map((number) => (
              <figure key={number} className="flex flex-col items-center gap-3 rounded-md bg-window py-3">
                <figcaption className="font-mono text-meta text-ink-3">{number}</figcaption>
                <Display text={number} size="48px" glyphId={g.id} />
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
