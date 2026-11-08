import type { ReactNode } from 'react'

export interface TopBarProps {
  /** The start slot: back. */
  start?: ReactNode
  /** None on a screen that names itself in its body: the timer. */
  title?: string
  /** The end slot. */
  end?: ReactNode
}

/** The screen's header: back, then the title in small capitals. It carries the top safe area. */
export function TopBar({ start, title, end }: TopBarProps) {
  return (
    <div className="shrink-0 pt-[env(safe-area-inset-top)]">
      <div className="flex h-13 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-1">
          {start}
          {title && <h1 className="eyebrow truncate text-ink-2">{title}</h1>}
        </div>
        <div className="flex items-center">{end}</div>
      </div>
    </div>
  )
}
