import type { ReactNode } from 'react'

export interface SheetProps {
  open: boolean
  /** The backdrop's tap. */
  onClose: () => void
  title: string
  /** A line under the title. */
  line?: ReactNode
  children: ReactNode
}

/** A panel risen from the bottom over a dimmed screen. Tapping the backdrop closes it. */
export function Sheet({ open, onClose, title, line, children }: SheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 animate-fade-in bg-scrim" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="no-scrollbar absolute inset-x-0 bottom-0 mx-auto max-h-[88%] max-w-app animate-sheet-up overflow-y-auto rounded-t-sheet border-t border-edge bg-panel px-5 pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom))] shadow-sheet"
      >
        <div className="mx-auto mb-3.5 h-1.25 w-10 rounded-full bg-grabber" />
        <h2 className="text-lead font-medium text-ink">{title}</h2>
        {line && <p className="mt-1 text-small text-ink-2">{line}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
