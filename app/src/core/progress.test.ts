import { describe, expect, it } from 'vitest'
import { dayProgress, doneOn, firstDay, focusMinutes, levelOf, sessionOf, streak } from './progress'
import { deleteTask, editTask, planOn } from './tasks'
import { EVERY, plan, sessions, snap, task } from './testkit'
import { addDays, weekday } from './time/calendar'

const THU = '2026-11-05'

describe('dayProgress', () => {
  const deep = task('deep', plan('2026-11-01', 3))
  const read = task('read', plan('2026-11-01', 1))

  it('counts each task’s sessions up to its plan', () => {
    const p = dayProgress(snap([deep, read], [...sessions('deep', THU, 2), ...sessions('read', THU, 4)]), THU)
    expect(p).toMatchObject({ done: 3, total: 4, fraction: 0.75 })
    expect(p.rows.map((r) => [r.task.id, r.done])).toEqual([
      ['deep', 2],
      ['read', 4],
    ])
  })

  it('is null on a day with nothing scheduled', () => {
    const weekends = task('hike', plan('2026-11-01', 1, [0, 6]))
    expect(dayProgress(snap([weekends]), THU).fraction).toBeNull()
  })

  it('judges a past day by the plan it had then, after an edit', () => {
    const edited = editTask(deep, { name: 'deep', days: [0, 1, 2, 3, 4, 5, 6], sessions: 1, length: null }, THU)
    const log = sessions('deep', '2026-11-04', 1)
    expect(dayProgress(snap([edited], log), '2026-11-04')).toMatchObject({ done: 1, total: 3 })
    expect(dayProgress(snap([edited], sessions('deep', THU, 1)), THU)).toMatchObject({ done: 1, total: 1 })
  })
})

describe('doneOn', () => {
  it('counts one task’s sessions on one day', () => {
    const s = snap([], [...sessions('deep', THU, 2), ...sessions('deep', '2026-11-04', 1), ...sessions('read', THU, 1)])
    expect(doneOn(s, 'deep', THU)).toBe(2)
    expect(doneOn(s, 'read', '2026-11-04')).toBe(0)
  })
})

describe('sessionOf', () => {
  const deep = task('deep', plan('2026-11-01', 3))
  const of = (taskId: string | null, phase: 'running' | 'done', day = THU) => ({ taskId, day, phase })

  it('numbers a session under way after the ones logged', () => {
    expect(sessionOf(of('deep', 'running'), snap([deep], sessions('deep', THU, 1)))).toMatchObject({ task: deep, number: 2, label: 'Session 2 of 3' })
  })

  it('numbers a session done as the last logged, since it is', () => {
    expect(sessionOf(of('deep', 'done'), snap([deep], sessions('deep', THU, 2)))).toMatchObject({ number: 2, label: 'Session 2 of 3' })
  })

  it('counts by the day the session began, not today', () => {
    expect(sessionOf(of('deep', 'running', '2026-11-04'), snap([deep], sessions('deep', '2026-11-04', 2)))).toMatchObject({ number: 3, label: 'Session 3 of 3' })
  })

  it('never reads past the plan: a task cut while its session ran', () => {
    const cut = editTask(deep, { name: 'deep', days: EVERY, sessions: 2, length: null }, THU)
    expect(sessionOf(of('deep', 'running'), snap([cut], sessions('deep', THU, 2)))).toMatchObject({ number: 3, label: 'Extra session' })
  })

  it('is nothing for a quick session, or a task with no plan that day', () => {
    expect(sessionOf(of(null, 'running'), snap([deep]))).toBeNull()
    expect(sessionOf(of('deep', 'running', '2026-10-30'), snap([deep]))).toBeNull()
    expect(sessionOf(of('gone', 'running'), snap([deep]))).toBeNull()
  })
})

describe('levelOf', () => {
  it('shades in five steps, and marks days with nothing scheduled', () => {
    expect([null, 0, 0.2, 0.5, 0.9, 1].map(levelOf)).toEqual(['rest', 'l0', 'l1', 'l2', 'l3', 'l4'])
  })
})

describe('streak', () => {
  const daily = task('read', plan('2026-10-30', 1))

  it('counts full days back from yesterday, and today once cleared', () => {
    const log = ['2026-11-02', '2026-11-03', '2026-11-04'].flatMap((d) => sessions('read', d))
    expect(streak(snap([daily], log), THU)).toBe(3)
    expect(streak(snap([daily], [...log, ...sessions('read', THU)]), THU)).toBe(4)
  })

  it('stops at a day that wasn’t full', () => {
    const log = ['2026-11-01', '2026-11-03', '2026-11-04'].flatMap((d) => sessions('read', d))
    expect(streak(snap([daily], log), THU)).toBe(2)
  })

  it('steps over days with nothing scheduled', () => {
    const weekdays = task('work', plan('2026-10-26', 1, [1, 2, 3, 4, 5]))
    // Fri 30 Oct, then the weekend off, then Mon–Wed.
    const log = ['2026-10-30', '2026-11-02', '2026-11-03', '2026-11-04'].flatMap((d) => sessions('work', d))
    expect(streak(snap([weekdays], log), THU)).toBe(4)
  })

  it('is zero with no tasks', () => {
    expect(streak(snap([]), THU)).toBe(0)
  })
})

/*
 * What the user sees of the past must never change under them: a day's count,
 * its shade and the streak are worked out from the log each time, so every
 * edit and delete is checked here against the days before it.
 */
describe('the past, after an edit or a delete', () => {
  // One session a day from Mon 26 Oct, done every day up to yesterday, Wed 4 Nov: ten days.
  // The run crosses Sun 1 Nov, when New York's clocks go back (the tests run there).
  const MADE = '2026-10-26'
  const PAST = Array.from({ length: 10 }, (_, i) => addDays(MADE, i))
  const log = PAST.flatMap((d) => sessions('read', d))
  const one = task('read', plan(MADE, 1))
  const daily = { name: 'read', days: EVERY, sessions: 1, length: null }

  it('starts from ten full days in a row', () => {
    expect(PAST.at(-1)).toBe('2026-11-04')
    expect(streak(snap([one], log), THU)).toBe(10)
  })

  it('keeps every past day full, and the streak, when a task asks for more sessions', () => {
    const two = editTask(one, { ...daily, sessions: 2 }, THU)
    for (const d of PAST) expect(dayProgress(snap([two], log), d)).toMatchObject({ done: 1, total: 1, fraction: 1 })
    expect(streak(snap([two], log), THU)).toBe(10)
    // Today asks for two: one isn't enough yet, and doesn't break the run; two clears it.
    const oneToday = [...log, ...sessions('read', THU, 1)]
    expect(dayProgress(snap([two], oneToday), THU)).toMatchObject({ done: 1, total: 2 })
    expect(streak(snap([two], oneToday), THU)).toBe(10)
    expect(streak(snap([two], [...log, ...sessions('read', THU, 2)]), THU)).toBe(11)
  })

  it('changes only today when the edit comes after today’s session', () => {
    const oneToday = [...log, ...sessions('read', THU, 1)]
    expect(streak(snap([one], oneToday), THU)).toBe(11)
    const two = editTask(one, { ...daily, sessions: 2 }, THU)
    expect(dayProgress(snap([two], oneToday), THU)).toMatchObject({ done: 1, total: 2 })
    expect(streak(snap([two], oneToday), THU)).toBe(10)
  })

  it('never fills a past day when a task asks for fewer sessions', () => {
    const three = task('deep', plan(MADE, 3))
    const twoADay = PAST.flatMap((d) => sessions('deep', d, 2))
    const fewer = editTask(three, { ...daily, name: 'deep', sessions: 2 }, THU)
    expect(dayProgress(snap([fewer], twoADay), '2026-11-04')).toMatchObject({ done: 2, total: 3 })
    expect(streak(snap([fewer], twoADay), THU)).toBe(0)
    expect(streak(snap([fewer], [...twoADay, ...sessions('deep', THU, 2)]), THU)).toBe(1)
  })

  it('keeps past days on a weekday the task no longer takes', () => {
    // Daily until today, weekdays from today: last weekend still asked for a session, and it was skipped.
    const weekdays = editTask(one, { ...daily, days: [1, 2, 3, 4, 5] }, THU)
    const noWeekend = log.filter((s) => s.day !== '2026-10-31' && s.day !== '2026-11-01')
    expect(dayProgress(snap([weekdays], noWeekend), '2026-10-31')).toMatchObject({ done: 0, total: 1 })
    expect(streak(snap([weekdays], noWeekend), THU)).toBe(3)
    expect(dayProgress(snap([weekdays]), '2026-11-07').fraction).toBeNull()
  })

  it('leaves past days resting on a weekday the task takes on', () => {
    // Weekdays until today, daily from today: last weekend stays a rest day, stepped over.
    const work = task('work', plan(MADE, 1, [1, 2, 3, 4, 5]))
    const workLog = PAST.filter((d) => weekday(d) !== 0 && weekday(d) !== 6).flatMap((d) => sessions('work', d))
    const everyDay = editTask(work, { ...daily, name: 'work' }, THU)
    expect(dayProgress(snap([everyDay], workLog), '2026-11-01').fraction).toBeNull()
    expect(streak(snap([everyDay], workLog), THU)).toBe(8)
    expect(dayProgress(snap([everyDay]), '2026-11-07').total).toBe(1)
  })

  it('judges each day by its own plan across several edits', () => {
    // 1 a day from 26 Oct, 3 from 30 Oct, 2 from 3 Nov; two done every day.
    const t = editTask(editTask(one, { ...daily, sessions: 3 }, '2026-10-30'), { ...daily, sessions: 2 }, '2026-11-03')
    expect(['2026-10-29', '2026-10-30', '2026-11-02', '2026-11-03'].map((d) => planOn(t, d)?.sessions)).toEqual([1, 3, 3, 2])
    const twoADay = PAST.flatMap((d) => sessions('read', d, 2))
    expect(['2026-10-29', '2026-11-02', '2026-11-03'].map((d) => dayProgress(snap([t], twoADay), d).fraction)).toEqual([1, 2 / 3, 1])
    expect(streak(snap([t], twoADay), THU)).toBe(2)
  })

  it('keeps a deleted task in the days before it went, and drops it from today', () => {
    // Read done every day, write only the last two; write deleted today. Its missed days stay missed.
    const write = task('write', plan(MADE, 1))
    const both = [...log, ...['2026-11-03', '2026-11-04'].flatMap((d) => sessions('write', d))]
    const gone = deleteTask(write, THU)
    expect(dayProgress(snap([one, gone], both), '2026-11-02')).toMatchObject({ done: 1, total: 2 })
    expect(streak(snap([one, gone], both), THU)).toBe(2)
    expect(dayProgress(snap([one, gone], both), THU)).toMatchObject({ done: 0, total: 1 })
    expect(streak(snap([one, gone], [...both, ...sessions('read', THU)]), THU)).toBe(3)
  })

  it('rests today when the only task is deleted, and keeps the run', () => {
    const gone = deleteTask(one, THU)
    expect(dayProgress(snap([gone], log), THU).fraction).toBeNull()
    expect(streak(snap([gone], log), THU)).toBe(10)
  })

  it('counts nothing toward a day the task wasn’t scheduled', () => {
    const work = task('work', plan(MADE, 1, [1, 2, 3, 4, 5]))
    expect(dayProgress(snap([work], sessions('work', '2026-11-01', 3)), '2026-11-01').fraction).toBeNull()
  })

  it('never lets one task’s extra sessions make up for another’s', () => {
    const write = task('write', plan(MADE, 1))
    expect(dayProgress(snap([one, write], sessions('read', '2026-11-04', 3)), '2026-11-04')).toMatchObject({ done: 1, total: 2 })
  })

  it('starts the run at the first task’s first day, and never before', () => {
    const late = task('late', plan('2026-11-03', 1))
    expect(streak(snap([late], ['2026-11-03', '2026-11-04'].flatMap((d) => sessions('late', d))), THU)).toBe(2)
  })

  it('reads a task’s plans in any order, as a restored file might hold them', () => {
    const shuffled = { ...one, plans: [plan('2026-11-03', 1), plan(MADE, 1)] }
    expect(firstDay(snap([shuffled]))).toBe(MADE)
    expect(streak(snap([shuffled], log), THU)).toBe(10)
  })
})

describe('focusMinutes', () => {
  it('adds up the day’s sessions', () => {
    expect(focusMinutes(snap([], [...sessions('a', THU, 2), ...sessions('b', '2026-11-04', 1)]), THU)).toBe(50)
  })
})
