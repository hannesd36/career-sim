import { describe, expect, it } from 'vitest'
import { createCareer, playSeasons } from '../career'
import {
  buildObjective,
  judgeObjective,
  objectiveHave,
  objectiveOf,
  objectiveProgress,
  objectiveSwing,
  upcomingObjective,
} from '../objectives'
import type { Career, SeasonRecord } from '../types'

const opts = {
  name: 'Objective Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

function record(overrides: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    season: 2026,
    age: 22,
    clubId: 'x',
    clubName: 'X',
    badge: null,
    leagueId: 'ger1',
    onLoan: false,
    ovrStart: 70,
    ovrEnd: 70,
    role: 'Starter',
    apps: 30,
    goals: 10,
    assists: 5,
    cleanSheets: 0,
    conceded: 0,
    saves: 0,
    tackles: 0,
    keyPasses: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 7,
    minutes: 2400,
    gamesMissedInjured: 0,
    leaguePosition: 5,
    ceilingBefore: [70, 85],
    ceilingAfter: [70, 85],
    trophies: [],
    banned: false,
    natApps: 0,
    natGoals: 0,
    natAssists: 0,
    natCleanSheets: 0,
    ...overrides,
  }
}

describe('season objectives', () => {
  it('gives the same demand every time it is asked for the same season', () => {
    const career = createCareer({ ...opts, seed: 4242 })
    const a = upcomingObjective(career)
    const b = upcomingObjective(career)
    expect(a).toEqual(b)
    expect(a).not.toBeNull()
  })

  it('gives different careers different demands', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const objective = upcomingObjective(createCareer({ ...opts, seed }))
      if (objective) seen.add(`${objective.kind}:${objective.target}`)
    }
    expect(seen.size).toBeGreaterThan(3)
  })

  it('never demands something a career cannot express', () => {
    for (let seed = 1; seed <= 120; seed++) {
      for (const position of ['GK', 'CB', 'CM', 'ST'] as const) {
        const career = createCareer({ ...opts, position, seed })
        const objective = upcomingObjective(career)
        expect(objective).not.toBeNull()
        expect(objective!.target).toBeGreaterThan(0)
        // a keeper is never asked for goals or assists
        if (position === 'GK') {
          expect(['goals', 'assists']).not.toContain(objective!.kind)
        }
      }
    }
  })

  it('asks for a reachable number rather than a round one', () => {
    // Across many careers the demand should be met sometimes and missed
    // sometimes — an objective that is always met or never met is not one.
    let met = 0
    let missed = 0
    for (let seed = 1; seed <= 40; seed++) {
      let career: Career = createCareer({ ...opts, seed })
      career = playSeasons(career, 1)
      const last = career.lastSeason
      if (!last) continue
      const verdict = judgeObjective(objectiveOf(career, last), last)
      if (verdict === 'met') met++
      if (verdict === 'missed') missed++
    }
    expect(met).toBeGreaterThan(2)
    expect(missed).toBeGreaterThan(2)
  })

  it('judges a season against the demand it was actually set', () => {
    const objective = { kind: 'goals' as const, target: 12 }
    expect(judgeObjective(objective, record({ goals: 12 }))).toBe('met')
    expect(judgeObjective(objective, record({ goals: 11 }))).toBe('missed')
    // international goals count towards it
    expect(judgeObjective(objective, record({ goals: 10, natGoals: 2 }))).toBe('met')
  })

  it('judges a league finish the right way round', () => {
    const objective = { kind: 'finish' as const, target: 4 }
    expect(judgeObjective(objective, record({ leaguePosition: 2 }))).toBe('met')
    expect(judgeObjective(objective, record({ leaguePosition: 9 }))).toBe('missed')
  })

  it('says nothing about a season spent suspended', () => {
    const objective = { kind: 'goals' as const, target: 12 }
    expect(judgeObjective(objective, record({ banned: true, goals: 40 }))).toBeNull()
    expect(objectiveSwing(null)).toBe(0)
  })

  it('reports progress and the number behind it consistently', () => {
    const objective = { kind: 'apps' as const, target: 20 }
    const half = record({ apps: 10 })
    expect(objectiveProgress(objective, half)).toBeCloseTo(0.5)
    expect(objectiveHave(objective, half)).toBe(10)
    expect(objectiveProgress(objective, record({ apps: 90 }))).toBe(1)
  })

  it('rebuilds the same demand for a season played long ago', () => {
    let career: Career = createCareer({ ...opts, seed: 99 })
    career = playSeasons(career, 1)
    const first = career.history[0]
    const asked = objectiveOf(career, first)
    // play on, then ask again about that very first season
    career = playSeasons({ ...career, phase: 'season', season: career.season + 1 }, 2)
    expect(objectiveOf(career, first)).toEqual(asked)
  })

  it('moves the market by a couple of rating points, not by a career', () => {
    expect(objectiveSwing('met')).toBeGreaterThan(0)
    expect(objectiveSwing('missed')).toBeLessThan(0)
    expect(Math.abs(objectiveSwing('met'))).toBeLessThan(4)
    expect(Math.abs(objectiveSwing('missed'))).toBeLessThan(4)
  })

  it('has no demand for a club it has never heard of', () => {
    expect(
      buildObjective({
        seed: 1,
        season: 2026,
        clubId: 'nope',
        ovr: 70,
        age: 22,
        position: 'ST',
        nation: 'Germany',
      }),
    ).toBeNull()
  })
})
