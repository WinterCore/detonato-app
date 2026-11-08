import { useEffect } from 'react'
import { dismissToast, useApp } from '@/state'
import { Toast } from '@/ui'

const SHOWN_MS = 3600

/** The toast, over the bottom of every screen, until it times out or another takes its place. */
export function Toaster() {
  const toast = useApp((s) => s.toast)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dismissToast(toast.id), SHOWN_MS)
    return () => clearTimeout(timer)
  }, [toast])
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <Toast key={toast.id} text={toast.text} />
    </div>
  )
}
