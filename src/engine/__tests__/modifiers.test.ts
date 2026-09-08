import { describe, expect, it } from 'vitest'
import { createCareer, playSeasons } from '../career'
import type { CareerCabinetStats } from '../careerAwards'
import {
  MODIFIERS,
  effectsOf,
  isModifierUnlocked,
  newlyUnlockedModifiers,
  unlockedModifiers,
} from '../modifiers'
import { headlinesFor } from '../press'
import type { Career } from '../types'

const opts = {
  name: 'Modifier Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

const stats = (over: Partial<CareerCabinetStats> = {}): CareerCabinetStats => ({
  careersRetired: 0,
  bestPeakOvr: 0,
  totalGoals: 0,
  totalApps: 0,
  totalMajors: 0,
  ballonDors: 0,
  worldCups: 0,
  oneClubCareers: 0,
  longestSeasons: 0,
  iconCareers: 0,
  cleanLegends: 0,
  ...over,
})

describe('start modifiers', () => {
  it('always leaves the ordinary start available', () => {
    const open = unlockedModifiers(stats())
    expect(open.map((m) => m.id)).toContain('standard')
    expect(effectsOf('standard')).toEqual(effectsOf(undefined))
  })

  it('locks the rest until something has been finished', () => {
    expect(unlockedModifiers(stats())).toHaveLength(1)
    expect(unlockedModifiers(stats({ careersRetired: 1 })).length).toBeGreaterThan(1)
  })

  it('is a trade rather than a free upgrade', () => {
    for (const m of MODIFIERS) {
      if (m.id === 'standard') continue
      const e = m.effects
      const helps =
        e.startOvr > 0 || e.startPotential > 0 || e.growth > 1 || e.decline < 1 || e.injury < 1
      const costs =
        e.startOvr < 0 ||
        e.growth < 1 ||
        e.decline > 1 ||
        e.eventPressure > 1 ||
        e.startTierFloor !== null
      expect(helps, `${m.id} gives nothing`).toBe(true)
      expect(costs, `${m.id} costs nothing`).toBe(true)
    }
  })

  it('says which starts have just opened up', () => {
    const before = stats({ careersRetired: 0 })
    const after = stats({ careersRetired: 1 })
    expect(newlyUnlockedModifiers(before, after).map((m) => m.id)).toEqual(['wonderkid'])
    expect(newlyUnlockedModifiers(after, after)).toHaveLength(0)
  })

  it('unlocks nothing twice', () => {
    const rich = stats({ careersRetired: 20, totalMajors: 50, totalApps: 5000, bestPeakOvr: 99 })
    expect(newlyUnlockedModifiers(rich, rich)).toHaveLength(0)
    expect(unlockedModifiers(rich)).toHaveLength(MODIFIERS.length)
    for (const m of MODIFIERS) expect(isModifierUnlocked(m, rich)).toBe(true)
  })

  it('starts a wonderkid ahead of an ordinary player on the same seed', () => {
    const plain = createCareer({ ...opts, seed: 500 })
    const early = createCareer({ ...opts, seed: 500, modifier: 'wonderkid' })
    expect(early.player.ovr).toBeGreaterThan(plain.player.ovr)
    expect(early.modifier).toBe('wonderkid')
  })

  it('starts a minnow further down the pyramid', () => {
    let deeper = 0
    for (let seed = 1; seed <= 30; seed++) {
      const plain = createCareer({ ...opts, seed })
      const small = createCareer({ ...opts, seed, modifier: 'minnow' })
      expect(small.player.ovr).toBeLessThan(plain.player.ovr)
      if (small.player.clubId !== plain.player.clubId) deeper++
    }
    expect(deeper).toBeGreaterThan(0)
  })

  it('treats a save written before starts existed as an ordinary one', () => {
    const career = createCareer({ ...opts, seed: 3 })
    const old: Career = { ...career }
    delete old.modifier
    expect(() => playSeasons(old, 1)).not.toThrow()
    expect(effectsOf(old.modifier).growth).toBe(1)
  })

  it('still plays a whole career under every start', () => {
    for (const m of MODIFIERS) {
      let career: Career = createCareer({ ...opts, seed: 31, modifier: m.id })
      for (let i = 0; i < 30 && career.phase !== 'retired'; i++) {
        career = playSeasons(career, 1)
        if (career.phase === 'offers' && career.offers.length) {
          career = { ...career, season: career.season + 1, phase: 'season', offers: [] }
        } else if (career.phase !== 'season') break
      }
      expect(career.history.length, `${m.id} played nothing`).toBeGreaterThan(0)
      for (const s of career.history) {
        expect(s.ovrEnd).toBeGreaterThanOrEqual(40)
        expect(s.ovrEnd).toBeLessThanOrEqual(99)
      }
    }
  })
})

describe('the press', () => {
  it('says nothing about a career that has not been played', () => {
    const career = createCareer({ ...opts, seed: 2 })
    expect(career.history).toHaveLength(0)
  })

  it('leads on at most three things', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let career: Career = createCareer({ ...opts, seed })
      career = playSeasons(career, 1)
      const last = career.lastSeason
      if (!last) continue
      const lines = headlinesFor(career, last)
      expect(lines.length).toBeLessThanOrEqual(3)
      for (const line of lines) {
        expect(line.id).toBeTruthy()
        expect(['good', 'bad', 'neutral']).toContain(line.tone)
      }
    }
  })

  it('leads on the suspension and nothing else when there was one', () => {
    let career: Career = createCareer({ ...opts, seed: 12 })
    career = playSeasons(career, 1)
    const banned = { ...career.history[0], banned: true }
    const lines = headlinesFor({ ...career, history: [banned] }, banned)
    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe('banned')
  })

  it('reads the same season the same way twice', () => {
    let career: Career = createCareer({ ...opts, seed: 66 })
    career = playSeasons(career, 1)
    const last = career.lastSeason!
    expect(headlinesFor(career, last)).toEqual(headlinesFor(career, last))
  })
})
