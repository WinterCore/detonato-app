import { Button, Sheet } from '@/ui'

/** A picked backup, confirmed before it replaces anything. */
export function RestoreSheet({
  restoring,
  onRestore,
  onCancel,
}: {
  restoring: { line: string } | null
  onRestore: () => void
  onCancel: () => void
}) {
  return (
    <Sheet open={!!restoring} onClose={onCancel} title="Restore this backup?" line={restoring?.line}>
      <div className="flex flex-col gap-2">
        <Button tone="led" onClick={onRestore}>
          Restore
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Sheet>
  )
}
