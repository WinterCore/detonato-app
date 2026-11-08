import { describe, expect, it } from 'vitest'
import { addDays, dayKey, diffDays, longDate, monthName, monthStart, msToMidnight, toDate, weekday, weekdayName, weekOrder } from './calendar'

describe('dayKey / toDate', () => {
  it('is the local day, zero-padded, and back', () => {
    expect(dayKey(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02')
    expect(dayKey(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05')
    expect(toDate('2026-11-05').getTime()).toBe(new Date(2026, 10, 5).getTime())
  })

  it('holds across a DST change', () => {
    // New York falls back on 2026-11-01.
    expect(dayKey(new Date(2026, 10, 1, 1, 30))).toBe('2026-11-01')
  })
})

describe('addDays / diffDays', () => {
  it('moves across months, years and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(diffDays('2026-11-05', '2026-10-29')).toBe(7)
    expect(diffDays('2026-03-09', '2026-03-08')).toBe(1)
  })
})

describe('weekday', () => {
  it('numbers days as Date.getDay() does', () => {
    expect(weekday('2026-11-05')).toBe(4) // a Thursday
    expect(weekday('2026-11-07')).toBe(6)
    expect(weekdayName('2026-11-08')).toBe('Sunday')
  })
})

describe('longDate', () => {
  it('names the day and month', () => {
    expect(longDate('2026-11-05')).toBe('5 November')
  })
})

describe('monthName / monthStart', () => {
  it('names a day’s month, and finds its first day', () => {
    expect(monthName('2026-11-05')).toBe('November')
    expect(monthStart('2026-11-05')).toBe('2026-11-01')
    expect(monthStart('2026-01-31')).toBe('2026-01-01')
  })
})

describe('weekOrder', () => {
  it('starts the week where Settings says', () => {
    expect(weekOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5])
    expect(weekOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})

describe('msToMidnight', () => {
  it('is the time left in the local day, on a 23-hour day too', () => {
    expect(msToMidnight(new Date(2026, 10, 5, 23, 59, 0))).toBe(60_000)
    expect(msToMidnight(new Date(2026, 2, 8, 0, 0))).toBe(23 * 3_600_000)
  })
})
