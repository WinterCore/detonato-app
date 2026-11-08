import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/core/settings'
import { deleteTask, editTask } from '@/core/tasks'
import { EVERY, plan, sessions, snap, task } from '@/core/testkit'
import { IDLE, pauseTimer, startTimer } from '@/core/timer'
import { focusLabel, todayView } from './todayView'

const THU = '2026-11-05'
const WED = '2026-11-04'
const deep = { ...task('deep', plan('2026-11-01', 3, undefined, 50)), name: 'Deep work' }
const read = { ...task('read', plan('2026-11-01', 1)), name: 'Read' }
const hike = { ...task('hike', plan('2026-11-01', 1, [0, 6])), name: 'Hike' }
const view = (s = snap([deep, read, hike]), timer = IDLE) => todayView(s, THU, timer, DEFAULT_SETTINGS)

describe('todayView', () => {
  it('shows today’s date, sessions and streak', () => {
    const v = view(snap([deep, read, hike], [...sessions('read', WED, 1), ...sessions('deep', WED, 3), ...sessions('deep', THU, 1)]))
    expect(v).toMatchObject({ weekday: 'Thursday', date: '5 November', empty: false })
    expect(v.progress).toMatchObject({ label: '1 of 4 sessions done today', line: '1 of 4 · 25 min', rest: false, cleared: false })
    expect(v.streak).toEqual({ text: '1', label: '1 day streak' })
  })

  it('tiles what’s left, then what’s done, each with its sessions', () => {
    const v = view(snap([deep, read, hike], sessions('read', THU, 1)))
    expect(v.tasks.map((c) => [c.name, c.done, c.total, c.meta, c.complete])).toEqual([
      ['Deep work', 0, 3, '3 × 50 min', false],
      ['Read', 1, 1, '1 × 25 min', true],
    ])
    expect(v.tally).toBe('1 to do, 1 done')
  })

  it('takes Settings’ default for a task without its own length', () => {
    expect(view().tasks.find((c) => c.id === 'read')).toMatchObject({ meta: '1 × 25 min', minutes: 25 })
  })

  it('puts the task under way first, and holds every other start', () => {
    const v = view(undefined, startTimer(25, 0, { taskId: 'read', day: THU }))
    expect(v.tasks.map((c) => [c.id, c.session, c.canStart])).toEqual([
      ['read', 'running', false],
      ['deep', null, false],
    ])
    expect(v.quick.canStart).toBe(false)
  })

  it('lists tasks not scheduled today apart, with their days', () => {
    const v = view()
    expect(v.notToday.map((t) => t.name)).toEqual(['Hike'])
    expect(v.notToday[0].days.filter((d) => d.on).map((d) => d.label)).toEqual(['Sa', 'Su'])
  })

  it('clears the day once every session is done', () => {
    const v = view(snap([deep, read, hike], [...sessions('deep', THU, 3), ...sessions('read', THU, 1)]))
    expect(v.progress).toMatchObject({ line: '4 of 4 · 1 h 40 min', cleared: true })
    expect(v.streak.text).toBe('1')
    expect(v.tasks.every((c) => c.complete)).toBe(true)
  })

  it('rests on a day with nothing scheduled', () => {
    expect(view(snap([hike])).progress).toMatchObject({ rest: true, cleared: false })
  })

  it('offers the first task when there are none, or none left', () => {
    expect(view(snap([])).empty).toBe(true)
    expect(view(snap([deleteTask(read, '2026-11-02')])).empty).toBe(true)
  })
})

describe('todayView, the hero', () => {
  const T0 = new Date(2026, 10, 5, 9, 0).getTime()

  it('offers the first task still open, at its next session', () => {
    const v = view(snap([deep, read, hike], sessions('deep', THU, 1)))
    expect(v.hero).toMatchObject({
      kind: 'next',
      card: { id: 'deep' },
      line: 'Session 2 of 3 · 50 min',
      start: 'Start session 2',
      startLabel: 'Start session 2 of Deep work',
    })
  })

  it('passes over a task already done', () => {
    const v = view(snap([deep, read, hike], sessions('deep', THU, 3)))
    expect(v.hero).toMatchObject({ kind: 'next', card: { id: 'read' }, line: 'Session 1 of 1 · 25 min', start: 'Start session 1' })
  })

  it('shows the session under way, whichever task comes first', () => {
    const v = view(snap([deep, read, hike], sessions('deep', THU, 1)), startTimer(25, T0, { taskId: 'read', day: THU }))
    expect(v.hero).toEqual({ kind: 'session', phase: 'running', title: 'Read', line: 'Session 1 of 1 · 25 min' })
  })

  it('numbers a running session after the ones done, and gives its own length', () => {
    const v = view(snap([deep, read, hike], sessions('deep', THU, 2)), startTimer(50, T0, { taskId: 'deep', day: THU }))
    expect(v.hero).toMatchObject({ title: 'Deep work', line: 'Session 3 of 3 · 50 min' })
  })

  it('says when the session is held', () => {
    const paused = pauseTimer(startTimer(50, T0, { taskId: 'deep', day: THU }), T0 + 60_000)
    expect(view(undefined, paused).hero).toMatchObject({ kind: 'session', phase: 'paused', title: 'Deep work' })
  })

  it('counts a session begun yesterday by yesterday’s sessions, and leaves today’s tile waiting', () => {
    // Begun before midnight: it's yesterday's second, though today has none yet.
    const v = view(snap([deep, read, hike], sessions('deep', WED, 1)), startTimer(50, T0, { taskId: 'deep', day: WED }))
    expect(v.hero).toMatchObject({ title: 'Deep work', line: 'Session 2 of 3 · 50 min' })
    expect(v.tasks.find((c) => c.id === 'deep')).toMatchObject({ done: 0, session: null, canStart: false })
  })

  it('keeps a task cut to fewer sessions while one ran under way, first, as an extra session', () => {
    const cut = editTask(deep, { name: 'Deep work', days: EVERY, sessions: 2, length: 50 }, THU)
    const v = view(snap([cut, read, hike], sessions('deep', THU, 2)), startTimer(50, T0, { taskId: 'deep', day: THU }))
    expect(v.tasks.map((c) => [c.id, c.complete, c.session])).toEqual([
      ['deep', true, 'running'],
      ['read', false, null],
    ])
    expect(v.hero).toMatchObject({ title: 'Deep work', line: 'Extra session · 50 min' })
    expect(v.tally).toBe('2 to do, 0 done')
  })

  it('shows a quick session at the length it runs, not the default now', () => {
    const v = view(undefined, startTimer(10, T0, { taskId: null, day: THU }))
    expect(v.hero).toEqual({ kind: 'session', phase: 'running', title: 'Quick session', line: '10 min · not logged' })
    expect(v.quick).toEqual({ minutes: 10, line: '10 min · not logged', canStart: false, session: 'running' })
  })

  it('shows a session under way even with no tasks, or none today', () => {
    expect(view(snap([]), startTimer(25, T0, { taskId: null, day: THU })).hero.kind).toBe('session')
    expect(view(snap([hike]), startTimer(25, T0, { taskId: null, day: THU })).hero.kind).toBe('session')
  })

  it('clears the day with the minutes of focus', () => {
    const v = view(snap([deep, read, hike], [...sessions('deep', THU, 3), ...sessions('read', THU, 1)]))
    expect(v.hero).toEqual({ kind: 'cleared', line: '1 h 40 min of focus' })
  })

  it('rests on a day with nothing scheduled, and offers a first task when there are none', () => {
    expect(view(snap([hike])).hero).toEqual({ kind: 'rest' })
    expect(view(snap([])).hero).toEqual({ kind: 'empty' })
  })
})

describe('todayView, after an edit', () => {
  it('shows today by the new plan and the streak by the old days', () => {
    const more = editTask(read, { name: 'Read', days: EVERY, sessions: 2, length: null }, THU)
    const log = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', THU].flatMap((d) => sessions('read', d))
    const v = todayView(snap([more], log), THU, IDLE, DEFAULT_SETTINGS)
    expect(v.progress).toMatchObject({ label: '1 of 2 sessions done today', cleared: false })
    expect(v.streak.text).toBe('4')
    expect(v.tasks.map((c) => [c.name, c.done, c.total])).toEqual([['Read', 1, 2]])
    expect(v.hero).toMatchObject({ kind: 'next', line: 'Session 2 of 2 · 25 min' })
  })
})

describe('focusLabel', () => {
  it('reads minutes, and hours past an hour', () => {
    expect(focusLabel(45)).toBe('45 min')
    expect(focusLabel(125)).toBe('2 h 05 min')
  })
})
