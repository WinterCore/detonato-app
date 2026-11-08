import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { plan, sessions, task } from '@/core/testkit'
import { connect } from './connection'
import { createRepo } from './repo'

let n = 0
const fresh = () => createRepo(connect(`test-${n++}`))

describe('repo', () => {
  it('starts empty', async () => {
    expect(await fresh().loadSnapshot()).toEqual({ tasks: [], sessions: [] })
  })

  it('keeps tasks in the order they were made, and sessions in the order they ended', async () => {
    const repo = fresh()
    const late = { ...task('late', plan('2026-11-01')), createdAt: 2 }
    const early = { ...task('early', plan('2026-11-01')), createdAt: 1 }
    const [a, b] = sessions('early', '2026-11-05', 2)
    await repo.putTask(late)
    await repo.putTask(early)
    await repo.putSession(b)
    await repo.putSession(a)
    expect(await repo.loadSnapshot()).toEqual({ tasks: [early, late], sessions: [a, b] })
  })

  it('keeps one record for a session put twice', async () => {
    const repo = fresh()
    const [s] = sessions('deep', '2026-11-05')
    await repo.putSession(s)
    await repo.putSession(s)
    expect((await repo.loadSnapshot()).sessions).toEqual([s])
  })

  it('replaces everything on a restore', async () => {
    const repo = fresh()
    await repo.putTask(task('old', plan('2026-11-01')))
    await repo.putSession(sessions('old', '2026-11-04')[0])
    const restored = { tasks: [task('new', plan('2026-10-01'))], sessions: sessions('new', '2026-10-02') }
    await repo.replaceAll(restored)
    expect(await repo.loadSnapshot()).toEqual(restored)
  })
})
