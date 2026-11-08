import type { ReactNode } from 'react'

/** A titled group of settings: its label, its card, and any notes under them. */
export function Section({ id, title, notes = [], children }: { id: string; title: string; notes?: string[]; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="eyebrow px-1 pt-2 text-ink-3">
        {title}
      </h2>
      {children}
      {notes.map((n) => (
        <p key={n} className="px-1 text-meta text-ink-3">
          {n}
        </p>
      ))}
    </section>
  )
}
