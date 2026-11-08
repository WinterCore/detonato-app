import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/core/settings'
import { deleteTask } from '@/core/tasks'
import { plan, snap, task } from '@/core/testkit'
import { taskRows } from './tasksView'

describe('taskRows', () => {
  it('lists live tasks with their sessions, length and days', () => {
    const rows = taskRows(snap([task('deep', plan('2026-11-01', 3, [1, 2], 50)), task('read', plan('2026-11-01'))]), '2026-11-05', DEFAULT_SETTINGS)
    expect(rows.map((r) => [r.id, r.meta])).toEqual([
      ['deep', '3 × 50 min'],
      ['read', '1 × 25 min · default'],
    ])
    expect(rows[0].days.filter((d) => d.on).map((d) => d.label)).toEqual(['Mo', 'Tu'])
  })

  it('leaves deleted tasks out', () => {
    expect(taskRows(snap([deleteTask(task('x', plan('2026-11-01')), '2026-11-03')]), '2026-11-05', DEFAULT_SETTINGS)).toEqual([])
  })
})
