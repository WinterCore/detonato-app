import { Button, Sheet } from '@/ui'

/** A delete, confirmed: the task leaves the schedule from today, and its past stays. */
export function DeleteSheet({ name, onDelete, onCancel }: { name: string | null; onDelete: () => void; onCancel: () => void }) {
  return (
    <Sheet
      open={name !== null}
      onClose={onCancel}
      title={`Delete ${name ?? 'task'}?`}
      line="It leaves your schedule from today. Days already past keep its sessions."
    >
      <div className="grid gap-2">
        <Button className="text-warn" onClick={onDelete}>
          Delete
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Sheet>
  )
}
