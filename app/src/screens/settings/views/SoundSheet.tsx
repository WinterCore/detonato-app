import type { SoundId } from '@/core/settings'
import type { Option } from '@/screens/settings/lib/settingsView'
import { Button, ChoiceRow, Sheet } from '@/ui'

/** «Sound»: what plays when a session ends. Each tap chooses it and plays it. */
export function SoundSheet({
  open,
  sounds,
  onPick,
  onClose,
}: {
  open: boolean
  sounds: Option<SoundId>[]
  onPick: (id: SoundId) => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Sound" line="Plays when a session ends. Tap one to hear it.">
      <div role="radiogroup" aria-label="Sound" className="flex flex-col gap-1">
        {sounds.map((o) => (
          <ChoiceRow key={o.value} checked={o.checked} label={o.label} onClick={() => onPick(o.value)} />
        ))}
      </div>
      <Button className="mt-5 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  )
}
