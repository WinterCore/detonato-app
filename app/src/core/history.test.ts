import { describe, expect, it } from 'vitest'
import { bestStreak, focusBetween, perfectDays, taskRates, yearFrom } from './history'
import { streak } from './progress'
import { deleteTask, editTask } from './tasks'
import { EVERY, plan, sessions, snap, task } from './testkit'
import { addDays } from './time/calendar'
import type { Snapshot } from './types'

/*
 * The same ten days as progress.test's: one session a day of «read» from
 * Mon 26 Oct to Wed 4 Nov, across the night New York's clocks go back
 * (1 Nov). Today is Thu 5 Nov. Every figure here must judge each day by the
 * plan it had then.
 */
const THU = '2026-11-05'
const MADE = '2026-10-26'
const PAST = Array.from({ length: 10 }, (_, i) => addDays(MADE, i))
const log = PAST.flatMap((d) => sessions('read', d))
const one = task('read', plan(MADE, 1))
const daily = { name: 'read', days: EVERY, sessions: 1, length: null }
const without = (...gone: string[]) => log.filter((s) => !gone.includes(s.day))

describe('yearFrom', () => {
  it('opens the window 364 days back, so it holds 365 with today', () => {
    expect(yearFrom(THU)).toBe('2025-11-06')
  })
})

describe('bestStreak', () => {
  it('is the run itself when there’s been one', () => {
    expect(bestStreak(snap([one], log), THU)).toBe(10)
  })

  it('remembers a longer run than the one going now', () => {
    // A miss on Mon 2 Nov: 26 Oct–1 Nov is seven, then two.
    const s = snap([one], without('2026-11-02'))
    expect(bestStreak(s, THU)).toBe(7)
    expect(streak(s, THU)).toBe(2)
  })

  it('steps over days with nothing scheduled', () => {
    const work = task('work', plan(MADE, 1, [1, 2, 3, 4, 5]))
    const workLog = PAST.filter((d) => d !== '2026-10-31' && d !== '2026-11-01').flatMap((d) => sessions('work', d))
    expect(bestStreak(snap([work], workLog), THU)).toBe(8)
  })

  it('isn’t broken by today not being over, and takes it in once cleared', () => {
    expect(bestStreak(snap([one], log), THU)).toBe(10)
    expect(bestStreak(snap([one], [...log, ...sessions('read', THU)]), THU)).toBe(11)
  })

  it('keeps past runs when a task asks for more from today', () => {
    const two = editTask(one, { ...daily, sessions: 2 }, THU)
    expect(bestStreak(snap([two], log), THU)).toBe(10)
    expect(bestStreak(snap([two], [...log, ...sessions('read', THU, 1)]), THU)).toBe(10)
  })

  it('keeps a deleted task in the days before it went', () => {
    // Write missed Mon 2 Nov, then was deleted today: that day stays short.
    const write = task('write', plan(MADE, 1))
    const both = [...log, ...PAST.filter((d) => d !== '2026-11-02').flatMap((d) => sessions('write', d))]
    expect(bestStreak(snap([one, deleteTask(write, THU)], both), THU)).toBe(7)
  })

  it('never lets one task’s extra sessions make up for another’s', () => {
    const write = task('write', plan(MADE, 1))
    expect(bestStreak(snap([one, write], PAST.flatMap((d) => sessions('read', d, 3))), THU)).toBe(0)
  })

  it('is never shorter than the streak', () => {
    const write = task('write', plan(MADE, 1))
    const cases: Snapshot[] = [
      snap([one], log),
      snap([one], without('2026-10-29')),
      snap([one], without('2026-11-04')),
      snap([one], [...log, ...sessions('read', THU)]),
      snap([editTask(one, { ...daily, sessions: 3 }, '2026-10-30')], log),
      snap([one, deleteTask(write, '2026-11-01')], log),
      snap([]),
    ]
    for (const s of cases) expect(bestStreak(s, THU)).toBeGreaterThanOrEqual(streak(s, THU))
  })

  it('is nothing with no tasks', () => {
    expect(bestStreak(snap([]), THU)).toBe(0)
  })
})

describe('perfectDays', () => {
  it('counts the full days in the window, today once it’s cleared', () => {
    expect(perfectDays(snap([one], log), yearFrom(THU), THU)).toBe(10)
    expect(perfectDays(snap([one], [...log, ...sessions('read', THU)]), yearFrom(THU), THU)).toBe(11)
  })

  it('counts only the days in the window', () => {
    expect(perfectDays(snap([one], log), '2026-11-01', THU)).toBe(4)
  })

  it('never counts a short day, a rest day, or a day before the first task', () => {
    const work = task('work', plan(MADE, 1, [1, 2, 3, 4, 5]))
    const workLog = [...PAST, '2026-10-20'].flatMap((d) => sessions('work', d))
    // Weekend sessions and one before the task existed: none of them full days.
    expect(perfectDays(snap([work], workLog), yearFrom(THU), THU)).toBe(8)
    expect(perfectDays(snap([one], without('2026-10-29')), yearFrom(THU), THU)).toBe(9)
  })

  it('keeps past days full after an edit asks for more', () => {
    const two = editTask(one, { ...daily, sessions: 2 }, '2026-11-03')
    // 3 and 4 Nov asked for two and got one; the eight before stay full.
    expect(perfectDays(snap([two], log), yearFrom(THU), THU)).toBe(8)
  })
})

describe('focusBetween', () => {
  it('adds the minutes logged on the days in the window', () => {
    expect(focusBetween(snap([one], log), yearFrom(THU), THU)).toBe(250)
    expect(focusBetween(snap([one], log), '2026-11-01', '2026-11-04')).toBe(100)
    expect(focusBetween(snap([one], log), THU, THU)).toBe(0)
  })

  it('keeps a deleted task’s minutes: the time was spent', () => {
    const write = deleteTask(task('write', plan(MADE, 1)), THU)
    expect(focusBetween(snap([one, write], [...log, ...sessions('write', '2026-11-04', 2)]), yearFrom(THU), THU)).toBe(300)
  })

  it('keeps sessions on days nothing was scheduled', () => {
    const work = task('work', plan(MADE, 1, [1, 2, 3, 4, 5]))
    expect(focusBetween(snap([work], sessions('work', '2026-11-01', 2)), yearFrom(THU), THU)).toBe(50)
  })
})

describe('taskRates', () => {
  it('counts the days before today, each by its plan then', () => {
    expect(taskRates(snap([one], log), THU, 10)).toEqual([{ task: one, done: 10, total: 10 }])
    // Two a day from Sat 31 Oct, one done: five days of 1/1, then five of 1/2.
    const two = editTask(one, { ...daily, sessions: 2 }, '2026-10-31')
    expect(taskRates(snap([two], log), THU, 10)).toEqual([{ task: two, done: 10, total: 15 }])
  })

  it('leaves today out, as it isn’t over', () => {
    expect(taskRates(snap([one], [...log, ...sessions('read', THU, 1)]), THU, 10)[0]).toMatchObject({ done: 10, total: 10 })
    expect(taskRates(snap([one], log), THU, 3)[0]).toMatchObject({ done: 3, total: 3 })
  })

  it('counts only the weekdays a task takes, and caps extra sessions', () => {
    const work = task('work', plan(MADE, 1, [1, 2, 3, 4, 5]))
    const workLog = PAST.flatMap((d) => sessions('work', d, 2))
    expect(taskRates(snap([work], workLog), THU, 10)).toEqual([{ task: work, done: 8, total: 8 }])
  })

  it('leaves out a task gone from the schedule, and one with no day yet', () => {
    const write = task('write', plan(MADE, 1))
    const fresh = task('fresh', plan(THU, 1))
    const rates = taskRates(snap([one, deleteTask(write, THU), fresh], log), THU, 10)
    expect(rates.map((r) => r.task.id)).toEqual(['read'])
  })
})
