import { TrashIcon } from '@phosphor-icons/react'
import { Display } from '@/components/segments'
import type { useTasks } from '@/screens/tasks/hooks/useTasks'
import { Button, Field, Segmented, Sheet, Stepper, SwitchRow, WeekChips } from '@/ui'

type Tasks = ReturnType<typeof useTasks>

/** A task made or changed: its name, its days, its sessions, and their length. */
export function TaskEditor({ t }: { t: Tasks }) {
  const e = t.editor
  return (
    <Sheet open={e !== null} onClose={t.closeEditor} title={e?.isNew ? 'New task' : 'Edit task'}>
      {e && (
        <form
          className="grid gap-5"
          onSubmit={(ev) => {
            ev.preventDefault()
            void t.save()
          }}
        >
          <label className="grid gap-2">
            <span className="eyebrow text-ink-3">Name</span>
            <Field
              value={e.name}
              onChange={(ev) => t.setName(ev.target.value)}
              placeholder="Deep work"
              autoFocus={e.isNew}
              maxLength={60}
              enterKeyHint="done"
            />
          </label>

          <div className="grid gap-3">
            <span id="repeats" className="eyebrow text-ink-3">
              Repeats
            </span>
            <Segmented
              wide
              labelledBy="repeats"
              options={[
                { value: 'every', label: 'Every day', checked: e.every },
                { value: 'pick', label: 'Pick days', checked: !e.every },
              ]}
              onPick={(v) => t.setEvery(v === 'every')}
            />
            {!e.every && <WeekChips days={e.days} onToggle={t.toggleDay} />}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="grid">
              <span className="eyebrow text-ink-3">Sessions</span>
              <span className="text-small text-ink-3">Pomodoros to finish it</span>
            </span>
            <Stepper
              lessLabel="Fewer sessions"
              moreLabel="More sessions"
              onLess={t.fewer}
              onMore={t.more}
              atMin={e.sessions.atMin}
              atMax={e.sessions.atMax}
            >
              <Display text={e.sessions.text} size="34px" label={`${e.sessions.text} sessions`} />
            </Stepper>
          </div>

          <div className="grid gap-3">
            <SwitchRow checked={e.custom} label="Custom length" meta={e.lengthNote} onClick={t.toggleCustom} className="-mx-4" />
            {e.custom && (
              <div className="flex items-center justify-between rounded-xl bg-window p-3 shadow-window">
                <Stepper
                  lessLabel="Shorter"
                  moreLabel="Longer"
                  onLess={t.shorter}
                  onMore={t.longer}
                  atMin={e.length.atMin}
                  atMax={e.length.atMax}
                >
                  <span className="flex items-end gap-2 px-6">
                    <Display text={e.length.text} size="48px" label={`${e.length.text} minutes`} />
                    <span className="eyebrow pb-1 text-ink-3">min</span>
                  </span>
                </Stepper>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            {!e.isNew && (
              <Button className="flex items-center gap-2 text-warn" onClick={t.askDelete}>
                <TrashIcon size={18} />
                Delete
              </Button>
            )}
            <Button type="submit" tone="led" className="flex-1 disabled:opacity-40" disabled={!e.canSave}>
              Save
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
