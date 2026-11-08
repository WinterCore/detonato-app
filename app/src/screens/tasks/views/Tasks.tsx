import { CaretLeftIcon, PlusIcon } from '@phosphor-icons/react'
import { useTasks } from '@/screens/tasks/hooks/useTasks'
import { cn, IconButton, panel, TopBar, WeekChips } from '@/ui'
import { DeleteSheet } from './DeleteSheet'
import { TaskEditor } from './TaskEditor'

/** «Tasks»: every task, its sessions and days; tap one to change it, + to add one. */
export function Tasks() {
  const t = useTasks()

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col pb-[calc(32px+env(safe-area-inset-bottom))]">
      <TopBar
        start={<IconButton icon={CaretLeftIcon} label="Back" onClick={t.back} />}
        title="Tasks"
        end={<IconButton icon={PlusIcon} label="New task" onClick={t.add} />}
      />

      <div className="grid content-start gap-2 px-4">
        {t.rows.length === 0 && <p className="px-1 py-6 text-center text-ink-3">No tasks yet. Add one with +.</p>}
        {t.rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className={cn('press-wide grid gap-3 p-4 text-start', panel())}
            aria-label={`Edit ${row.name}`}
            onClick={() => t.edit(row.id)}
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{row.name}</span>
              <span className="shrink-0 font-mono text-[12px] text-ink-3">{row.meta}</span>
            </span>
            <WeekChips days={row.days} />
          </button>
        ))}
      </div>

      <TaskEditor t={t} />
      <DeleteSheet name={t.deleting} onDelete={() => void t.confirmDelete()} onCancel={t.closeDelete} />
    </main>
  )
}
