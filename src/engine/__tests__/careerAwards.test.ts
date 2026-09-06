import { describe, expect, it } from 'vitest'
import { computeCabinetStats, isCareerAwardEarned, newlyEarnedCareerAwards, CAREER_AWARDS } from '../careerAwards'
import { createCareer } from '../career'
import type { Career } from '../types'

const opts = { name: 'Cabinet Test', nation: 'Germany', position: 'ST' as const, foot: 'Right' as const }

function retiredCareer(overrides: Partial<Career> = {}): Career {
  const base = createCareer({ ...opts, seed: 1 })
  return { ...base, phase: 'retired', ...overrides }
}

describe('computeCabinetStats', () => {
  it('returns all zeros with no retired careers', () => {
    const active = createCareer({ ...opts, seed: 1 })
    const stats = computeCabinetStats([active]) // still 'season', not retired
    expect(stats.careersRetired).toBe(0)
    expect(stats.bestPeakOvr).toBe(0)
  })

  it('counts only retired careers, ignoring active ones', () => {
    const active = createCareer({ ...opts, seed: 2 })
    const retired = retiredCareer({ seed: 3 })
    const stats = computeCabinetStats([active, retired])
    expect(stats.careersRetired).toBe(1)
  })

  it('a career with a single club spell counts as one-club', () => {
    const base = createCareer({ ...opts, seed: 1 })
    const career = retiredCareer({
      history: [
        {
          season: 2026,
          age: 16,
          clubId: base.player.clubId,
          clubName: 'X',
          badge: null,
          leagueId: 'ger1',
          onLoan: false,
          ovrStart: 60,
          ovrEnd: 62,
          role: 'Starter',
          apps: 20,
          goals: 5,
          assists: 2,
          cleanSheets: 0,
          conceded: 0,
          saves: 0,
          tackles: 0,
          keyPasses: 0,
          yellowCards: 0,
          redCards: 0,
          rating: 7,
          minutes: 1800,
          gamesMissedInjured: 0,
          leaguePosition: 3,
          ceilingBefore: [60, 80],
          ceilingAfter: [60, 80],
          trophies: [],
          banned: false,
          natApps: 0,
          natGoals: 0,
          natAssists: 0,
          natCleanSheets: 0,
        },
      ],
    })
    const stats = computeCabinetStats([career])
    expect(stats.oneClubCareers).toBe(1)
    expect(stats.totalGoals).toBe(5)
  })
})

describe('newlyEarnedCareerAwards', () => {
  it('reports an award the moment its threshold is first reached', () => {
    const empty = computeCabinetStats([])
    const oneRetired = computeCabinetStats([retiredCareer({ seed: 9 })])
    const newly = newlyEarnedCareerAwards(empty, oneRetired)
    expect(newly.map((a) => a.id)).toContain('first-retirement')
  })

  it('never reports the same award twice once it is already earned', () => {
    const oneRetired = computeCabinetStats([retiredCareer({ seed: 9 })])
    const twoRetired = computeCabinetStats([retiredCareer({ seed: 9 }), retiredCareer({ seed: 10 })])
    const newly = newlyEarnedCareerAwards(oneRetired, twoRetired)
    expect(newly.map((a) => a.id)).not.toContain('first-retirement')
  })
})

describe('CAREER_AWARDS', () => {
  it('every award starts unearned against an empty ledger', () => {
    const empty = computeCabinetStats([])
    for (const award of CAREER_AWARDS) {
      expect(isCareerAwardEarned(award, empty)).toBe(false)
    }
  })
})
