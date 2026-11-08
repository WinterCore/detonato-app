import { describe, expect, it } from 'vitest'
import {
  clockText,
  IDLE,
  minutesLabel,
  parseCommands,
  parseTimer,
  pauseTimer,
  replay,
  resetTimer,
  resumeTimer,
  sessionRecord,
  settleTimer,
  startTimer,
  timeLeft,
  type TimerState,
} from './timer'

const MIN = 60_000
const T0 = Date.UTC(2026, 10, 5, 9, 0)
const OF = { taskId: 'deep', day: '2026-11-05' }
const QUICK = { taskId: null, day: '2026-11-05' }

describe('startTimer', () => {
  it('runs a session that ends its length from now', () => {
    expect(startTimer(25, T0, OF)).toEqual({ phase: 'running', length: 25 * MIN, endsAt: T0 + 25 * MIN, ...OF })
  })

  it('runs a quick session for no task', () => {
    expect(startTimer(25, T0, QUICK)).toMatchObject({ taskId: null })
  })
})

describe('pauseTimer / resumeTimer', () => {
  it('holds the time that was left, and runs it again', () => {
    const running = startTimer(25, T0, OF)
    const paused = pauseTimer(running, T0 + 10 * MIN)
    expect(paused).toEqual({ phase: 'paused', length: 25 * MIN, left: 15 * MIN, ...OF })
    // An hour away changes nothing while it's held.
    expect(resumeTimer(paused, T0 + 70 * MIN)).toEqual({ phase: 'running', length: 25 * MIN, endsAt: T0 + 85 * MIN, ...OF })
  })

  it('makes a session done instead of pausing it past its end', () => {
    expect(pauseTimer(startTimer(25, T0, OF), T0 + 30 * MIN)).toEqual({ phase: 'done', length: 25 * MIN, endedAt: T0 + 25 * MIN, ...OF })
  })

  it('leaves states it can’t pause or resume alone', () => {
    expect(pauseTimer(IDLE, T0)).toBe(IDLE)
    const running = startTimer(25, T0, OF)
    expect(resumeTimer(running, T0)).toBe(running)
  })
})

describe('resetTimer', () => {
  it('goes back to the full length, held', () => {
    expect(resetTimer(startTimer(25, T0, OF))).toEqual({ phase: 'paused', length: 25 * MIN, left: 25 * MIN, ...OF })
    expect(resetTimer({ phase: 'paused', length: 25 * MIN, left: 3 * MIN, ...OF })).toEqual({ phase: 'paused', length: 25 * MIN, left: 25 * MIN, ...OF })
  })

  it('leaves an idle or done timer alone', () => {
    const done: TimerState = { phase: 'done', length: 25 * MIN, endedAt: T0, ...OF }
    expect(resetTimer(done)).toBe(done)
    expect(resetTimer(IDLE)).toBe(IDLE)
  })
})

describe('settleTimer', () => {
  const running = startTimer(25, T0, OF)

  it('keeps a session running until its end', () => {
    expect(settleTimer(running, T0 + 25 * MIN - 1)).toBe(running)
  })

  it('ends it when its end was due, however late it’s looked at', () => {
    const done = { phase: 'done', length: 25 * MIN, endedAt: T0 + 25 * MIN, ...OF }
    expect(settleTimer(running, T0 + 25 * MIN)).toEqual(done)
    expect(settleTimer(running, T0 + 9 * 60 * MIN)).toEqual(done)
  })
})

describe('timeLeft', () => {
  it('counts down a running session, never below zero', () => {
    const running = startTimer(25, T0, OF)
    expect(timeLeft(running, T0 + MIN, 0)).toBe(24 * MIN)
    expect(timeLeft(running, T0 + 99 * MIN, 0)).toBe(0)
  })

  it('shows the next session’s length while idle, and nothing once done', () => {
    expect(timeLeft(IDLE, T0, 30 * MIN)).toBe(30 * MIN)
    expect(timeLeft({ phase: 'done', length: MIN, endedAt: T0, ...OF }, T0, 30 * MIN)).toBe(0)
  })
})

describe('clockText', () => {
  it('shows minutes and seconds', () => {
    expect(clockText(25 * MIN)).toBe('25:00')
    expect(clockText(95 * MIN)).toBe('95:00')
    expect(clockText(61_000)).toBe('01:01')
  })

  it('rounds seconds up, so 00:00 shows only at the end', () => {
    expect(clockText(25 * MIN - 1)).toBe('25:00')
    expect(clockText(1)).toBe('00:01')
    expect(clockText(0)).toBe('00:00')
    expect(clockText(-5)).toBe('00:00')
  })
})

describe('parseTimer', () => {
  it('reads back every state', () => {
    const states: TimerState[] = [
      IDLE,
      startTimer(25, T0, OF),
      { phase: 'paused', length: 25 * MIN, left: 5 * MIN, ...OF },
      { phase: 'done', length: 25 * MIN, endedAt: T0, ...QUICK },
    ]
    for (const s of states) expect(parseTimer(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('is idle for anything broken', () => {
    expect(parseTimer(null)).toEqual(IDLE)
    expect(parseTimer({ phase: 'running', length: 25 * MIN })).toEqual(IDLE)
    expect(parseTimer({ phase: 'running', length: -1, endsAt: T0, ...OF })).toEqual(IDLE)
    expect(parseTimer({ phase: 'paused', length: MIN, left: 2 * MIN, ...OF })).toEqual(IDLE)
    expect(parseTimer({ phase: 'running', length: 500 * MIN, endsAt: T0, ...OF })).toEqual(IDLE)
    expect(parseTimer({ phase: 'lost' })).toEqual(IDLE)
    // From before sessions belonged to tasks: no day to count it on.
    expect(parseTimer({ phase: 'running', length: 25 * MIN, endsAt: T0 })).toEqual(IDLE)
  })
})

describe('sessionRecord', () => {
  it('logs a finished task session under the day it started', () => {
    const done = settleTimer(startTimer(25, T0, OF), T0 + 25 * MIN)
    expect(sessionRecord(done)).toEqual({ id: `deep@${T0 + 25 * MIN}`, taskId: 'deep', day: '2026-11-05', endedAt: T0 + 25 * MIN, minutes: 25 })
  })

  it('logs nothing for a quick session, or one not done', () => {
    expect(sessionRecord(settleTimer(startTimer(25, T0, QUICK), T0 + 25 * MIN))).toBeNull()
    expect(sessionRecord(startTimer(25, T0, OF))).toBeNull()
  })
})

describe('replay', () => {
  const running = startTimer(25, T0, OF)

  it('pauses where the notification paused it, and resumes from there', () => {
    const paused = replay(running, [{ move: 'pause', at: T0 + 10 * MIN }])
    expect(paused).toEqual({ phase: 'paused', length: 25 * MIN, left: 15 * MIN, ...OF })
    // Resumed a while later: the end moves on by the time it was held.
    const resumed = replay(running, [
      { move: 'pause', at: T0 + 10 * MIN },
      { move: 'resume', at: T0 + 40 * MIN },
    ])
    expect(resumed).toEqual({ phase: 'running', length: 25 * MIN, endsAt: T0 + 55 * MIN, ...OF })
  })

  it('keeps a session paused before its end from ending, however late the app opens', () => {
    const paused = replay(running, [{ move: 'pause', at: T0 + 10 * MIN }])
    expect(settleTimer(paused, T0 + 9 * 60 * MIN)).toBe(paused)
  })

  it('calls a stopped session off', () => {
    expect(replay(running, [{ move: 'stop', at: T0 + 5 * MIN }])).toBe(IDLE)
  })

  it('leaves a session that ended before a move done', () => {
    const done = { phase: 'done', length: 25 * MIN, endedAt: T0 + 25 * MIN, ...OF }
    expect(replay(running, [{ move: 'stop', at: T0 + 30 * MIN }])).toEqual(done)
    expect(replay(running, [{ move: 'pause', at: T0 + 30 * MIN }, { move: 'resume', at: T0 + 31 * MIN }])).toEqual(done)
  })

  it('changes nothing with no moves', () => {
    expect(replay(running, [])).toBe(running)
  })
})

describe('parseCommands', () => {
  it('reads the moves the phone hands over', () => {
    const moves = [
      { move: 'pause', at: T0 },
      { move: 'stop', at: T0 + MIN },
    ]
    expect(parseCommands(JSON.parse(JSON.stringify(moves)))).toEqual(moves)
  })

  it('reads nothing from anything broken', () => {
    expect(parseCommands(null)).toEqual([])
    expect(parseCommands([{ move: 'skip', at: T0 }])).toEqual([])
    expect(parseCommands([{ move: 'pause' }])).toEqual([])
  })
})

describe('minutesLabel', () => {
  it('counts minutes', () => {
    expect(minutesLabel(1)).toBe('1 minute')
    expect(minutesLabel(25)).toBe('25 minutes')
  })
})
