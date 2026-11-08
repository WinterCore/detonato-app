import type { ReactNode } from 'react'

/** A row's words: its label, and a second, quieter line saying what it does. */
export function RowText({ label, meta, id }: { label: ReactNode; meta?: ReactNode; id?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span id={id} className="text-body text-ink">
        {label}
      </span>
      {meta && <span className="text-meta text-ink-3 text-pretty">{meta}</span>}
    </span>
  )
}
