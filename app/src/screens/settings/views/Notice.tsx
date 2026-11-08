import type { Icon } from '@phosphor-icons/react'
import { Button } from '@/ui'

/** Something the phone holds back that the user can set right: what, why it matters, and the way there. */
export function Notice({ icon: I, title, line, action, onOpen }: { icon: Icon; title: string; line: string; action: string; onOpen: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border border-led-ring bg-led-fill p-4">
      <div className="flex gap-3">
        <I size={22} className="mt-0.5 shrink-0 text-led" />
        <div className="flex flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{title}</span>
          <span className="text-small text-ink-2">{line}</span>
        </div>
      </div>
      <Button className="min-h-11" onClick={onOpen}>
        {action}
      </Button>
    </div>
  )
}
