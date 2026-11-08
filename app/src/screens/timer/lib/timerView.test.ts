import { describe, expect, it } from 'vitest'
import { glyphById } from '@/core/segments/glyphs'
import { DEFAULT_SETTINGS } from '@/core/settings'
import { plan, sessions, snap, task } from '@/core/testkit'
import { pauseTimer, resumeTimer, settleTimer, startTimer, type TimerState } from '@/core/timer'
import { clockSize, justStarted, timeOfDay, timerView } from './timerView'

const MIN = 60_000
const DAY = '2026-11-05'
// 9:00 AM in New York, where the tests run.
const T0 = new Date(2026, 10, 5, 9, 0).getTime()
const sports = glyphById('sports-1')
const deep = { ...task('deep', plan('2026-11-01', 3, undefined, 50)), name: 'Deep work' }
const read = { ...task('read', plan('2026-11-01', 2)), name: 'Arabic' }
type Session = Exclude<TimerState, { phase: 'idle' }>
const view = (t: TimerState, s = snap([deep, read]), left: number | null = null) =>
  timerView(t as Session, left, s, DEFAULT_SETTINGS, sports, 'h12')

describe('timerView, a task’s session', () => {
  const running = startTimer(50, T0, { taskId: 'deep', day: DAY })

  it('names the task and which session it is', () => {
    const v = view(running, snap([deep, read], sessions('deep', DAY, 1)), 25 * MIN)
    expect(v).toMatchObject({
      title: 'Deep work',
      label: 'Session 2 of 3',
      pips: { total: 3, done: 1 },
      clock: '25:00',
      status: 'Ends 9:50 AM',
    })
  })

  it('says what’s left once done, and offers the next session', () => {
    // The finished session is in the log by now.
    const done = settleTimer(running, T0 + 50 * MIN)
    const v = view(done, snap([deep, read], sessions('deep', DAY, 2)))
    expect(v.done).toEqual({
      heading: 'Session 2 of 3 done',
      line: '50 minutes logged. One session left today.',
      again: { label: 'Start session 3', minutes: 50, taskId: 'deep' },
    })
    expect(v).toMatchObject({ clock: '00:00', displayClass: 'flash', status: 'Ended 9:50 AM' })
  })

  it('offers nothing more once the task is done for the day', () => {
    const done = settleTimer(running, T0 + 50 * MIN)
    const v = view(done, snap([deep, read], sessions('deep', DAY, 3)))
    expect(v.done).toMatchObject({ heading: 'All 3 sessions done', again: null })
    expect(v.done.line).toBe('50 minutes logged. Done for today.')
  })

  it('calls a session past the plan an extra one, never «Session 4 of 3»', () => {
    const v = view(running, snap([deep, read], sessions('deep', DAY, 3)), 25 * MIN)
    expect(v).toMatchObject({ label: 'Extra session', pips: { total: 3, done: 3 } })
  })

  it('blinks while held', () => {
    const paused: TimerState = { phase: 'paused', length: 50 * MIN, left: 61_000, taskId: 'deep', day: DAY }
    expect(view(paused)).toMatchObject({ clock: '01:01', status: 'Paused', displayClass: 'blink' })
  })
})

describe('timerView, a quick session', () => {
  it('logs nothing and offers another', () => {
    const done = settleTimer(startTimer(25, T0, { taskId: null, day: DAY }), T0 + 25 * MIN)
    const v = view(done)
    expect(v).toMatchObject({ title: 'Quick session', pips: null })
    expect(v.done).toEqual({
      heading: 'Session done',
      line: '25 minutes of focus. Not logged.',
      again: { label: 'Start another', minutes: 25, taskId: null },
    })
  })
})

describe('timeOfDay', () => {
  it('tells the time in English, on the phone’s clock', () => {
    const t = new Date(2026, 10, 5, 13, 7).getTime()
    expect(timeOfDay(t, 'h12')).toBe('1:07 PM')
    expect(timeOfDay(t, 'h23')).toBe('13:07')
  })
})

describe('justStarted', () => {
  const of = { taskId: null, day: DAY }
  const running = startTimer(25, T0, of)

  it('is true as the screen opens on a session just started', () => {
    expect(justStarted(running, T0)).toBe(true)
    expect(justStarted(running, T0 + 1500)).toBe(true)
  })

  it('is false for a session carrying on: reopened later, resumed, held or done', () => {
    expect(justStarted(running, T0 + 5 * MIN)).toBe(false)
    const resumed = resumeTimer(pauseTimer(running, T0 + 5 * MIN), T0 + 9 * MIN)
    expect(justStarted(resumed, T0 + 9 * MIN)).toBe(false)
    expect(justStarted(pauseTimer(running, T0 + 1000), T0 + 1000)).toBe(false)
    expect(justStarted(settleTimer(running, T0 + 25 * MIN), T0 + 25 * MIN)).toBe(false)
  })
})

describe('clockSize', () => {
  it('caps the countdown at the mockup’s size, and shrinks it to fit a narrow phone', () => {
    expect(clockSize(sports)).toMatch(/^min\(112px, calc\(\(100vw - 56px\) \/ \d+\.\d{3}\)\)$/)
  })

  it('gives a wider design a smaller size at the same width', () => {
    const em = (s: string) => Number(/\/ ([\d.]+)\)\)$/.exec(s)![1])
    expect(em(clockSize(glyphById('14-segment-1')))).toBeGreaterThan(em(clockSize(sports)))
  })
})
