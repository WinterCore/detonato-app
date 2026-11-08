import { CaretRightIcon } from '@phosphor-icons/react'
import { Display } from '@/components/segments'
import { LinkRow } from '@/ui'

/** «Style»: the chosen design, named and drawn, opening the picker. */
export function StyleRow({ line, onOpen }: { line: string; onOpen: () => void }) {
  return (
    <LinkRow
      label="Style"
      meta={line}
      onClick={onOpen}
      end={
        <>
          <span aria-hidden>
            <Display text="25" size="30px" />
          </span>
          <CaretRightIcon size={20} className="text-ink-3" />
        </>
      }
    />
  )
}
