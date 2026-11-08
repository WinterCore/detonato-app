/** A local calendar day, `yyyy-mm-dd`. Days run midnight to midnight. */
export type DayKey = string

const pad = (n: number) => String(n).padStart(2, '0')

/** The local day `date` falls on. */
export function dayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parts(k: DayKey): [number, number, number] {
  const [y, m, d] = k.split('-').map(Number)
  return [y, m, d]
}

/** Local midnight of the day. */
export function toDate(k: DayKey): Date {
  const [y, m, d] = parts(k)
  return new Date(y, m - 1, d)
}

// Day arithmetic runs on UTC epochs built from the key's own y/m/d, so a DST
// shift in the local zone can never turn a day into 23 or 25 hours.
const epochDay = (k: DayKey) => {
  const [y, m, d] = parts(k)
  return Date.UTC(y, m - 1, d) / 864e5
}

export function addDays(k: DayKey, n: number): DayKey {
  const t = new Date((epochDay(k) + n) * 864e5)
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** a − b in days. */
export function diffDays(a: DayKey, b: DayKey): number {
  return epochDay(a) - epochDay(b)
}

/** 0 = Sunday … 6 = Saturday, as `Date.getDay()` numbers them. */
export function weekday(k: DayKey): number {
  return (epochDay(k) + 4) % 7 // 1970-01-01 was a Thursday
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** «5 November». */
export function longDate(k: DayKey): string {
  const [, m, d] = parts(k)
  return `${d} ${MONTHS[m - 1]}`
}

/** «November». */
export function monthName(k: DayKey): string {
  const [, m] = parts(k)
  return MONTHS[m - 1]
}

/** The first day of `k`'s month. */
export function monthStart(k: DayKey): DayKey {
  return `${k.slice(0, 8)}01`
}

const SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/** «Th», for a weekday number (0 = Sunday). */
export const weekdayShort = (wd: number): string => SHORT[wd]

/** «Thursday». */
export const weekdayName = (k: DayKey): string => WEEKDAYS[weekday(k)]

/** The 7 weekdays in order from `start` (6 = Saturday first). */
export function weekOrder(start: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (start + i) % 7)
}

/** How long until the next local midnight, in ms: when "today" moves on. */
export function msToMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}
