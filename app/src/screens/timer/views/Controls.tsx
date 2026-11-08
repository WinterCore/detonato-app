import { ArrowCounterClockwiseIcon, PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react'
import { RoundButton } from '@/ui'

export interface ControlsProps {
  running: boolean
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onStop: () => void
}

/** Reset, pause or resume, and stop. */
export function Controls({ running, onPause, onResume, onReset, onStop }: ControlsProps) {
  return (
    <div className="grid grid-cols-3 items-center justify-items-center">
      <RoundButton icon={ArrowCounterClockwiseIcon} caption="Reset" onClick={onReset} />
      <RoundButton
        tone="led"
        icon={running ? PauseIcon : PlayIcon}
        aria-label={running ? 'Pause' : 'Resume'}
        onClick={running ? onPause : onResume}
      />
      <RoundButton icon={StopIcon} caption="Stop" onClick={onStop} />
    </div>
  )
}
