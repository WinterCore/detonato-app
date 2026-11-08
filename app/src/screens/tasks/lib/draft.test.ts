import { describe, expect, it } from 'vitest'
import { createTask } from '@/core/tasks'
import { blankDraft, draftFrom, editorView, stepDraftLength, stepSessions, toggleDay, toTaskDraft } from './draft'

const THU = '2026-11-05'

describe('the editor’s draft', () => {
  it('starts a new task on every day, one session, the default length', () => {
    expect(blankDraft(25)).toEqual({ name: '', every: true, days: [0, 1, 2, 3, 4, 5, 6], sessions: 1, custom: false, length: 25 })
  })

  it('opens an existing task on its plan', () => {
    const t = createTask({ name: 'Arabic', days: [1, 3], sessions: 2, length: 40 }, 'a', THU, 0)
    expect(draftFrom(t, THU, 25)).toEqual({ name: 'Arabic', every: false, days: [1, 3], sessions: 2, custom: true, length: 40 })
  })

  it('saves nothing without a name, or without a day', () => {
    expect(toTaskDraft(blankDraft(25))).toBeNull()
    expect(toTaskDraft({ ...blankDraft(25), name: '  ' })).toBeNull()
    expect(toTaskDraft({ ...blankDraft(25), name: 'Read', every: false, days: [] })).toBeNull()
  })

  it('saves every day as all seven, and the length only when it’s custom', () => {
    const d = { ...blankDraft(25), name: ' Read ', days: [2], length: 40 }
    expect(toTaskDraft(d)).toEqual({ name: 'Read', days: [0, 1, 2, 3, 4, 5, 6], sessions: 1, length: null })
    expect(toTaskDraft({ ...d, every: false, custom: true })).toEqual({ name: 'Read', days: [2], sessions: 1, length: 40 })
  })

  it('toggles days and steps within bounds', () => {
    const d = { ...blankDraft(25), every: false, days: [1] }
    expect(toggleDay(toggleDay(d, 3), 1).days).toEqual([3])
    expect(stepSessions({ ...d, sessions: 8 }, 1).sessions).toBe(8)
    expect(stepSessions({ ...d, sessions: 1 }, -1).sessions).toBe(1)
    expect(stepDraftLength({ ...d, length: 25 }, 1).length).toBe(30)
  })
})

describe('editorView', () => {
  it('says where the length comes from, and holds Save until it can', () => {
    const v = editorView(blankDraft(25), 6, 25)
    expect(v).toMatchObject({ lengthNote: 'Uses the default, 25 min', canSave: false, sessions: { text: '1', atMin: true } })
    expect(v.days.map((d) => d.label)).toEqual(['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'])
    expect(editorView({ ...blankDraft(25), name: 'x', custom: true, length: 1 }, 6, 25)).toMatchObject({
      lengthNote: 'Custom for this task',
      canSave: true,
      length: { text: '01', atMin: true },
    })
  })
})
