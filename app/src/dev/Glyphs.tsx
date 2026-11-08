import { Display } from '@/components/segments'
import { glyphName } from '@/core/segments/families'
import { GLYPHS } from '@/core/segments/glyphs'

/**
 * /dev/glyphs (dev only): 0–9 in every design, to check each digit map by
 * eye — and, for the designs with none yet, to map them by hand.
 */
export default function Glyphs() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col px-4 py-6">
      <h1 className="eyebrow pb-4 text-ink-2">Digit maps · {GLYPHS.length} designs</h1>
      {GLYPHS.map((g) => (
        <div key={g.id} className="grid grid-cols-1 items-center gap-x-5 gap-y-2 border-t border-line py-2.5 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-col">
            <span className="text-body text-ink">{glyphName(g, GLYPHS)}</span>
            <span className="font-mono text-meta text-ink-3">
              {g.id} · {g.count} seg · {g.how ?? 'no map'}
            </span>
          </div>
          <div className="no-scrollbar min-w-0 overflow-x-auto rounded-md bg-window px-3.5 py-2.5">
            <Display text="0123456789" size="40px" glyphId={g.id} />
          </div>
        </div>
      ))}
    </main>
  )
}
