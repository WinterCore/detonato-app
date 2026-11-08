import { CalendarDotsIcon, ListIcon, SlidersHorizontalIcon } from '@phosphor-icons/react'
import { Display } from '@/components/segments'
import { useToday } from '@/screens/today/hooks/useToday'
import { IconButton, TopBar } from '@/ui'
import { DayBar } from './DayBar'
import { Hero } from './Hero'
import { NotToday } from './NotToday'
import { QuickTile } from './QuickTile'
import { TaskTile } from './TaskTile'

/** «Today»: the home screen. The date and the streak; the session under way or the next; the day's bar; a tile per task. */
export function Today() {
  const t = useToday()

  return (
    <main className="mx-auto flex min-h-dvh max-w-app flex-col pb-[calc(32px+env(safe-area-inset-bottom))]">
      <TopBar
        end={
          <>
            <IconButton icon={CalendarDotsIcon} label="History" onClick={t.openHistory} />
            <IconButton icon={ListIcon} label="All tasks" onClick={t.openTasks} />
            <IconButton icon={SlidersHorizontalIcon} label="Settings" onClick={t.openSettings} />
          </>
        }
      />
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4">
        <div className="grid">
          <span className="eyebrow text-ink-3">{t.weekday}</span>
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight">{t.date}</h1>
        </div>
        {!t.empty && (
          <button type="button" className="press grid justify-items-end gap-1 pt-1" aria-label={`${t.streak.label}. Open History`} onClick={t.openHistory}>
            <Display text={t.streak.text} size="26px" label={t.streak.label} sweepKey={t.sweep} />
            <span className="eyebrow text-ink-3">Day streak</span>
          </button>
        )}
      </header>

      <div className="flex flex-col gap-4 px-4">
        <Hero hero={t.hero} clock={t.clock} onStart={t.startNext} onOpen={t.openTimer} onAdd={t.addTask} />
        {!t.progress.rest && <DayBar progress={t.progress} />}

        <section aria-labelledby="tiles">
          <h2 id="tiles" className="sr-only">
            Tasks: {t.tally}
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {t.tasks.map((card) => (
              <li key={card.id}>
                <TaskTile card={card} clock={card.session ? t.clock : null} onStart={() => t.start(card)} onOpen={t.openTimer} />
              </li>
            ))}
            <li>
              <QuickTile quick={t.quick} clock={t.quick.session ? t.clock : null} onStart={t.startQuick} onOpen={t.openTimer} />
            </li>
          </ul>
        </section>

        <NotToday tasks={t.notToday} open={t.notTodayOpen} onToggle={t.toggleNotToday} />
      </div>
    </main>
  )
}
