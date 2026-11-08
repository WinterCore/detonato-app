import { describe, expect, it } from 'vitest'
import { endNotice } from './notice'
import { plan, sessions, snap, task } from './testkit'

const DAY = '2026-11-05'
const deep = { ...task('deep', plan('2026-11-01', 3)), name: 'Deep work' }
const running = { phase: 'running' as const, day: DAY, length: 50 * 60_000 }

describe('endNotice', () => {
  it('names the task and the session under way', () => {
    expect(endNotice({ ...running, taskId: 'deep' }, snap([deep], sessions('deep', DAY, 1)))).toEqual({
      title: 'Deep work',
      body: 'Session 2 of 3 done · 50 minutes',
    })
  })

  it('never counts past the plan', () => {
    expect(endNotice({ ...running, taskId: 'deep' }, snap([deep], sessions('deep', DAY, 3))).body).toBe('Extra session done · 50 minutes')
  })

  it('tells a quick session’s minutes', () => {
    expect(endNotice({ ...running, taskId: null, length: 25 * 60_000 }, snap([deep]))).toEqual({
      title: 'Session done',
      body: '25 minutes of focus.',
    })
  })
})
