import type { ReactNode } from 'react'

export type MarkKind = ':' | '/' | '.'

/** A colon, slash and point, drawn on a 240-unit-tall frame to match the designs. */
export const MARKS: Record<MarkKind, { w: number; body: ReactNode }> = {
  ':': {
    w: 40,
    body: (
      <>
        <rect x="6" y="64" width="28" height="28" rx="6" />
        <rect x="6" y="148" width="28" height="28" rx="6" />
      </>
    ),
  },
  '/': { w: 70, body: <polygon points="50,20 66,20 20,220 4,220" /> },
  '.': { w: 36, body: <rect x="4" y="200" width="28" height="28" rx="6" /> },
}

export const isMark = (ch: string): ch is MarkKind => ch in MARKS
