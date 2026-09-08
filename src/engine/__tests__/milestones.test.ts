import { describe, expect, it } from 'vitest'
import { createCareer, playSeasons } from '../career'
import { detectMilestones, detectMilestonesForRun } from '../milestones'
import type { Career, SeasonRecord } from '../types'

const opts = {
  name: 'Milestone Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

/** A bare-bones season record so milestone math can be tested in isolation. */
function record(overrides: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 2026,
    age: 20,
    clubId: 'x',
    clubName: 'X',
    badge: null,
    leagueId: 'ger1',
    onLoan: false,
    ovrStart: 60,
    ovrEnd: 60,
    role: 'Starter',
    apps: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    conceded: 0,
    saves: 0,
    tackles: 0,
    keyPasses: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 7,
    minutes: 0,
    gamesMissedInjured: 0,
    leaguePosition: 1,
    ceilingBefore: [60, 80],
    ceilingAfter: [60, 80],
    trophies: [],
    banned: false,
    natApps: 0,
    natGoals: 0,
    natAssists: 0,
    natCleanSheets: 0,
    ...overrides,
  }
}

function careerWith(history: SeasonRecord[]): Career {
  const base = createCareer({ ...opts, seed: 1 })
  return { ...base, history, trophies: history.flatMap((s) => s.trophies) }
}

describe('detectMilestones', () => {
  it('fires first-goal the season a career scores its first', () => {
    const career = careerWith([record({ goals: 0 }), record({ goals: 1 })])
    expect(detectMilestones(career, 0)).not.toContain('first-goal')
    expect(detectMilestones(career, 1)).toContain('first-goal')
  })

  it('never fires the same threshold twice', () => {
    const career = careerWith([record({ goals: 60 }), record({ goals: 5 })])
    // fifty-goals was already crossed in season 0; season 1 only adds more on top
    expect(detectMilestones(career, 0)).toContain('fifty-goals')
    expect(detectMilestones(career, 1)).not.toContain('fifty-goals')
  })

  it('fires a rating tier only on the season that actually crosses it', () => {
    const career = careerWith([
      record({ ovrStart: 60, ovrEnd: 68 }),
      record({ ovrStart: 68, ovrEnd: 70 }),
    ])
    expect(detectMilestones(career, 0)).toContain('silver')
    expect(detectMilestones(career, 1)).not.toContain('silver')
  })

  it('does not credit bronze, since every career starts there', () => {
    const career = careerWith([record({ ovrStart: 50, ovrEnd: 55 })])
    expect(detectMilestones(career, 0)).toEqual([])
  })

  it('fires first-trophy only the season the cabinet goes from empty to not', () => {
    const trophy = { id: 'league' as const, season: 2026 }
    const career = careerWith([record({ trophies: [] }), record({ trophies: [trophy] })])
    expect(detectMilestones(career, 1)).toContain('first-trophy')
    expect(detectMilestones(career, 0)).not.toContain('first-trophy')
  })

  it('a banned season earns nothing, however the totals moved', () => {
    const career = careerWith([record({ goals: 0 }), record({ goals: 5, banned: true })])
    expect(detectMilestones(career, 1)).toEqual([])
  })

  it('a real playSeasons career never throws when scanned for milestones', () => {
    let career = createCareer({ ...opts, seed: 12 })
    for (let i = 0; i < 15 && career.phase !== 'retired'; i++) {
      career = playSeasons(career, 1)
      for (let idx = 0; idx < career.history.length; idx++) {
        expect(() => detectMilestones(career, idx)).not.toThrow()
      }
    }
  })
})

describe('detectMilestonesForRun', () => {
  it('collects milestones across every season in the most recent run, not just the last one', () => {
    const s0 = record({ goals: 0, season: 2026 })
    const s1 = record({ goals: 1, season: 2027 }) // first-goal here
    const s2 = record({ goals: 3, season: 2028 }) // nothing new
    const career: Career = { ...careerWith([s0, s1, s2]), lastRun: [s1, s2] }
    expect(detectMilestonesForRun(career)).toContain('first-goal')
  })
})
