import { describe, expect, it } from 'vitest'
import { glyphById } from '@/core/segments/glyphs'
import { editTask } from '@/core/tasks'
import { EVERY, plan, sessions, snap, task } from '@/core/testkit'
import { addDays } from '@/core/time/calendar'
import { countAt, dayDetail, heatColumns, historyView, meterLit, monthLabels, rates, readout, streakSizes, weekdayLabels } from './historyView'

// Thursday 5 Nov 2026; tasks from Sunday 1 Nov.
const THU = '2026-11-05'
const read = { ...task('read', plan('2026-11-01', 1)), name: 'Read' }
const deep = { ...task('deep', plan('2026-11-01', 2, undefined, 50)), name: 'Deep work' }
const daysFrom = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i))

describe('heatColumns', () => {
  it('runs weeks from the week start, ending this week, today marked', () => {
    const cols = heatColumns(snap([read]), THU, 2, 6)
    expect(cols.map((c) => c[0].day)).toEqual(['2026-10-24', '2026-10-31'])
    const thisWeek = cols[1]
    expect(thisWeek.find((c) => c.today)?.day).toBe(THU)
    // Before the first task, and after today: nothing, and nothing to open.
    expect(cols[0][0]).toMatchObject({ level: 'none', open: false })
    expect(thisWeek.at(-1)).toMatchObject({ level: 'none', open: false })
    // Sunday 1 Nov onward: read was scheduled, nothing done.
    expect(thisWeek[1]).toMatchObject({ day: '2026-11-01', level: 'l0', open: true, label: 'Sunday 1 November: 0 of 1 sessions' })
  })

  it('keeps the past days’ shades after the task asks for more', () => {
    const more = editTask(read, { name: 'Read', days: EVERY, sessions: 3, length: null }, THU)
    const log = ['2026-11-02', '2026-11-03', '2026-11-04'].flatMap((d) => sessions('read', d))
    // Sat 31 Oct (before the task) to Fri 6 Nov (not yet): the three days done stay full; today asks for three.
    expect(heatColumns(snap([more], log), THU, 1, 6)[0].map((c) => c.level)).toEqual(['none', 'l0', 'l4', 'l4', 'l4', 'l0', 'none'])
  })

  it('shades nothing older than the 12 months', () => {
    const old = { ...task('old', plan('2024-01-01', 1)), name: 'Old' }
    const cols = heatColumns(snap([old]), THU, 53, 0)
    // 6 Nov 2025 is the window's first day.
    const cells = cols.flat()
    expect(cells.find((c) => c.day === '2025-11-05')).toMatchObject({ level: 'none', open: false })
    expect(cells.find((c) => c.day === '2025-11-06')).toMatchObject({ level: 'l0', open: true })
  })

  it('says a rest day is one', () => {
    const weekdays = { ...task('work', plan('2026-11-01', 1, [1, 2, 3, 4, 5])), name: 'Work' }
    expect(heatColumns(snap([weekdays]), THU, 1, 0)[0][0]).toMatchObject({ level: 'rest', label: 'Sunday 1 November: nothing scheduled' })
  })
})

describe('monthLabels / weekdayLabels', () => {
  it('names a month over the column its first day falls in', () => {
    const cols = heatColumns(snap([read]), THU, 6, 0)
    // Columns from Sun 27 Sep: 1 Oct falls in the first, 1 Nov (a Sunday) starts the last.
    expect(monthLabels(cols)).toEqual(['Oct', '', '', '', '', 'Nov'])
  })

  it('names every other weekday down the side, from the week start', () => {
    expect(weekdayLabels(6)).toEqual(['', 'Su', '', 'Tu', '', 'Th', ''])
    expect(weekdayLabels(1)).toEqual(['', 'Tu', '', 'Th', '', 'Sa', ''])
  })
})

describe('readout', () => {
  it('reads the streak, the best run, the full days and the focus, with their words', () => {
    // Read every day from 1 Nov but 2 Nov, today included: one, then three in a row.
    const log = ['2026-11-01', '2026-11-03', '2026-11-04', THU].flatMap((d) => sessions('read', d))
    expect(readout(snap([read], log), THU)).toEqual({
      current: 3,
      best: 3,
      perfect: 4,
      focus: 1,
      currentUnit: 'days',
      bestUnit: 'days',
      perfectUnit: 'days',
      focusUnit: 'hour',
      record: 'One more day sets a new best.',
      labels: {
        current: '3 day streak',
        best: 'Best streak: 3 days',
        perfect: '4 perfect days in 12 months',
        focus: '1 hour of focus in 12 months',
      },
    })
  })

  it('says how far the best is, counting the day that beats it', () => {
    // Four in a row to 30 Oct, a miss, then two.
    const r = { ...read, plans: [plan('2026-10-27', 1)] }
    const log = ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-11-03', '2026-11-04'].flatMap((d) => sessions('read', d))
    expect(readout(snap([r], log), THU)).toMatchObject({ current: 2, best: 4, record: '3 more days to beat your best.' })
  })

  it('speaks in ones, and in minutes under an hour', () => {
    const r = readout(snap([read], sessions('read', '2026-11-04')), THU)
    expect(r).toMatchObject({ current: 1, currentUnit: 'day', perfectUnit: 'day', focus: 25, focusUnit: 'min' })
    expect(r.labels.focus).toBe('25 min of focus in 12 months')
  })

  it('rounds focus down: 1 h 55 min is one hour', () => {
    const log = [...sessions('read', '2026-11-03'), ...sessions('deep', '2026-11-03', 2)].map((r) => ({ ...r, minutes: r.taskId === 'deep' ? 45 : 25 }))
    expect(readout(snap([read, deep], log), THU)).toMatchObject({ focus: 1, focusUnit: 'hour' })
  })

  it('asks for a first full day before there’s any streak', () => {
    expect(readout(snap([read]), THU)).toMatchObject({ current: 0, best: 0, record: 'Clear a day to start a streak.' })
  })
})

describe('streakSizes', () => {
  // What the browser makes of the size on a phone `vw` wide: the streak's px, and the row's width with Best beside it.
  const at = (vw: number, glyphId: string, current: number, best: number) => {
    const { current: size, best: bestSize } = streakSizes(glyphById(glyphId), current, best)
    const em = Number(/\/ ([\d.]+)\)\)$/.exec(size)![1])
    const px = Math.min(96, (Math.min(vw, 480) - 106) / em)
    expect(bestSize).toBe(`calc(${size} * 0.4167)`)
    return { px, row: px * em + 106 }
  }

  it('keeps a two-digit streak at full size, on any phone', () => {
    expect(at(320, 'sports-1', 23, 23).px).toBe(96)
    expect(at(320, '14-segment-1', 99, 99).px).toBe(96)
  })

  it('shrinks a longer streak so it and Best fit on the row', () => {
    for (const vw of [320, 375, 390]) {
      for (const id of ['sports-1', '14-segment-1']) {
        for (const [current, best] of [[300, 300], [300, 1000], [1000, 1000], [9999, 9999]]) {
          const { px, row } = at(vw, id, current, best)
          expect(row).toBeLessThanOrEqual(vw + 0.5)
          expect(px).toBeGreaterThan(30)
        }
      }
    }
    expect(at(320, 'sports-1', 300, 300).px).toBeLessThan(96)
  })

  it('shrinks more for a wider design', () => {
    expect(at(320, '14-segment-1', 300, 300).px).toBeLessThan(at(320, 'sports-1', 300, 300).px)
  })
})

describe('meterLit / countAt', () => {
  it('lights the meter by the run now against the best, rounding down', () => {
    expect(meterLit(0, 0)).toBe(0)
    expect(meterLit(3, 4)).toBe(15)
    expect(meterLit(19, 20)).toBe(19)
    expect(meterLit(5, 5)).toBe(20)
  })

  it('counts from nothing to the figure, and lands on it exactly', () => {
    expect(countAt(23, 0)).toBe(0)
    expect(countAt(23, 1)).toBe(23)
    expect(countAt(23, 0.5)).toBeGreaterThan(11)
    expect(countAt(23, 2)).toBe(23)
  })
})

describe('historyView', () => {
  it('is empty with no task ever', () => {
    expect(historyView(snap([]), THU, 0)).toMatchObject({ empty: true, rates: [] })
    expect(historyView(snap([read]), THU, 0).empty).toBe(false)
  })
})

describe('rates', () => {
  it('rounds down, so a task reads 100% only with every session done', () => {
    // 30 days from 6 Oct to 4 Nov: one missed.
    const r = { ...read, plans: [plan('2026-10-01', 1)] }
    const log = daysFrom('2026-10-06', 30).filter((d) => d !== '2026-10-20').flatMap((d) => sessions('read', d))
    expect(rates(snap([r], log), THU)).toEqual([{ id: 'read', name: 'Read', text: '96%', lit: 19 }])
    expect(rates(snap([r], [...log, ...sessions('read', '2026-10-20')]), THU)[0].text).toBe('100%')
  })
})

describe('dayDetail', () => {
  it('lists each task’s part of the day, by the plan it had then', () => {
    // Deep work asked for two on 4 Nov; it asks for three from today.
    const more = editTask(deep, { name: 'Deep work', days: EVERY, sessions: 3, length: 50 }, THU)
    const log = [...sessions('deep', '2026-11-04', 2), ...sessions('read', '2026-11-04', 1)]
    expect(dayDetail(snap([more, read], log), '2026-11-04')).toMatchObject({
      weekday: 'Wednesday',
      date: '4 November',
      rest: false,
      text: '03/03',
      label: '3 of 3 sessions done',
      percent: '100%',
      rows: [
        { name: 'Deep work', done: 2, total: 2, line: '2/2 · 50 min' },
        { name: 'Read', done: 1, total: 1, line: '1/1 · 25 min' },
      ],
      others: [],
    })
  })

  it('shows sessions past the plan, and their minutes, without counting them', () => {
    const d = dayDetail(snap([read], sessions('read', '2026-11-04', 3)), '2026-11-04')
    expect(d).toMatchObject({ text: '01/01', rows: [{ done: 1, total: 1, line: '1/1 +2 · 75 min' }] })
  })

  it('lists a task’s sessions on a day it wasn’t scheduled apart, outside the fill', () => {
    const work = { ...task('work', plan('2026-11-01', 1, [1, 2, 3, 4, 5])), name: 'Work' }
    const d = dayDetail(snap([work, read], [...sessions('work', '2026-11-01', 2), ...sessions('read', '2026-11-01')]), '2026-11-01')
    expect(d).toMatchObject({ text: '01/01', rows: [{ name: 'Read' }], others: [{ name: 'Work', line: '2 sessions · 50 min · not scheduled' }] })
  })

  it('rests a day with nothing scheduled', () => {
    const work = { ...task('work', plan('2026-11-01', 1, [1, 2, 3, 4, 5])), name: 'Work' }
    expect(dayDetail(snap([work]), '2026-11-01')).toMatchObject({ rest: true, rows: [], others: [] })
  })
})
