import { CaretLeftIcon, SlidersHorizontalIcon, SunIcon } from '@phosphor-icons/react'
import { Navigate } from 'react-router-dom'
import { Display } from '@/components/segments'
import { useTimer } from '@/screens/timer/hooks/useTimer'
import { Button, IconButton, Pips, TopBar } from '@/ui'
import { Controls } from './Controls'

/** The timer: the task, its session counting down in segments, and what to do with it. */
export function Timer() {
  const t = useTimer()
  if (!t) return <Navigate to="/" replace />

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col">
      <TopBar
        start={<IconButton icon={CaretLeftIcon} label="Back" onClick={t.back} />}
        end={
          <>
            {t.awake && (
              <span className="flex items-center gap-1 pe-1 text-ink-3" title="The screen stays on">
                <SunIcon size={18} />
                <span className="eyebrow text-[10.5px]">Awake</span>
              </span>
            )}
            <IconButton icon={SlidersHorizontalIcon} label="Settings" onClick={t.openSettings} />
          </>
        }
      />

      <div className="flex flex-1 flex-col px-5 pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-6">
          <h1 className="max-w-full truncate text-body text-ink-3">{t.title}</h1>
          <Display text={t.clock} size={t.clockSize} className={t.displayClass} sweepKey={t.sweep} label={`${t.clock} left`} />
          <div className="flex items-center gap-3 font-mono text-meta text-ink-3">
            {t.pips && (
              <span role="img" aria-label={t.label}>
                <Pips total={t.pips.total} done={t.pips.done} live={t.phase !== 'done'} />
              </span>
            )}
            <span>{t.status}</span>
          </div>
        </div>

        {t.phase === 'done' ? (
          <div className="grid gap-3">
            <p className="text-center text-title font-semibold">{t.done.heading}</p>
            <p className="-mt-2 mb-3 text-center text-ink-2">{t.done.line}</p>
            {t.done.again && (
              <Button tone="led" onClick={() => t.again(t.done.again!)}>
                {t.done.again.label}
              </Button>
            )}
            <Button tone={t.done.again ? 'quiet' : 'led'} onClick={t.close}>
              Back to Today
            </Button>
          </div>
        ) : (
          <Controls running={t.phase === 'running'} onPause={t.pause} onResume={t.resume} onReset={t.reset} onStop={t.stop} />
        )}
      </div>
    </main>
  )
}
