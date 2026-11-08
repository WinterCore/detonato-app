import { describe, expect, it } from 'vitest'
import { createTask, deleteTask, draftOf, editTask, liveTasks, planOn, scheduledOn } from './tasks'
import { plan, snap, task } from './testkit'

const THU = '2026-11-05'
const draft = { name: '  Deep work ', days: [4, 1, 1], sessions: 3, length: 50 }

describe('createTask', () => {
  it('plans from today, with a clean name and days', () => {
    expect(createTask(draft, 'deep', THU, 7)).toEqual({
      id: 'deep',
      name: 'Deep work',
      plans: [{ from: THU, days: [1, 4], sessions: 3, length: 50 }],
      createdAt: 7,
    })
  })

  it('keeps sessions within 1–8', () => {
    expect(createTask({ ...draft, sessions: 12 }, 'x', THU, 0).plans[0].sessions).toBe(8)
    expect(createTask({ ...draft, sessions: 0 }, 'x', THU, 0).plans[0].sessions).toBe(1)
  })
})

describe('planOn', () => {
  const t = task('t', plan('2026-11-01', 1), plan('2026-11-04', 3))

  it('is the plan in effect that day', () => {
    expect(planOn(t, '2026-11-03')?.sessions).toBe(1)
    expect(planOn(t, '2026-11-04')?.sessions).toBe(3)
    expect(planOn(t, '2026-12-25')?.sessions).toBe(3)
  })

  it('reads the plans in any order', () => {
    const shuffled = task('t', plan('2026-11-04', 3), plan('2026-11-01', 1))
    expect(planOn(shuffled, '2026-11-03')?.sessions).toBe(1)
    expect(planOn(shuffled, '2026-11-04')?.sessions).toBe(3)
  })

  it('is none before the task was made, or from the day it was deleted', () => {
    expect(planOn(t, '2026-10-31')).toBeUndefined()
    const gone = deleteTask(t, THU)
    expect(planOn(gone, '2026-11-04')?.sessions).toBe(3)
    expect(planOn(gone, THU)).toBeUndefined()
  })
})

describe('editTask', () => {
  const t = createTask(draft, 'deep', '2026-11-01', 0)

  it('adds a plan from today, leaving the past its own', () => {
    const edited = editTask(t, { ...draft, name: 'Writing', sessions: 2 }, THU)
    expect(edited.name).toBe('Writing')
    expect(edited.plans.map((p) => [p.from, p.sessions])).toEqual([
      ['2026-11-01', 3],
      [THU, 2],
    ])
  })

  it('replaces the plan made earlier the same day', () => {
    const twice = editTask(editTask(t, { ...draft, sessions: 2 }, THU), { ...draft, sessions: 5 }, THU)
    expect(twice.plans.map((p) => [p.from, p.sessions])).toEqual([
      ['2026-11-01', 3],
      [THU, 5],
    ])
  })

  it('replaces the only plan when edited the day it was made', () => {
    expect(editTask(t, { ...draft, sessions: 1 }, '2026-11-01').plans).toHaveLength(1)
  })

  it('replaces a plan from a later day, made while the phone’s clock ran ahead', () => {
    const ahead = editTask(t, { ...draft, sessions: 2 }, '2026-11-09')
    const back = editTask(ahead, { ...draft, sessions: 4 }, THU)
    expect(back.plans.map((p) => [p.from, p.sessions])).toEqual([
      ['2026-11-01', 3],
      [THU, 4],
    ])
  })
})

describe('scheduledOn / liveTasks', () => {
  const weekdays = task('work', plan('2026-11-01', 2, [1, 2, 3, 4, 5]))
  const daily = task('read', plan('2026-11-01'))
  const s = snap([weekdays, daily])

  it('holds the tasks whose plan includes the weekday', () => {
    expect(scheduledOn(s, THU).map((r) => r.task.id)).toEqual(['work', 'read'])
    expect(scheduledOn(s, '2026-11-07').map((r) => r.task.id)).toEqual(['read']) // a Saturday
  })

  it('lists tasks until they are deleted', () => {
    const gone = snap([deleteTask(weekdays, THU), daily])
    expect(liveTasks(gone, '2026-11-04').map((t) => t.id)).toEqual(['work', 'read'])
    expect(liveTasks(gone, THU).map((t) => t.id)).toEqual(['read'])
  })
})

describe('draftOf', () => {
  it('opens the editor on the plan in effect', () => {
    const t = editTask(createTask(draft, 'deep', '2026-11-01', 0), { ...draft, sessions: 2, length: null }, THU)
    expect(draftOf(t, THU)).toEqual({ name: 'Deep work', days: [1, 4], sessions: 2, length: null })
  })
})
