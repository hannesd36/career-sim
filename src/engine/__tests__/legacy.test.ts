import { describe, expect, it } from 'vitest'
import { acceptOffer, closeEvent, closePenalty, createCareer, playSeasons } from '../career'
import { highlightsOf, greatestMoment } from '../highlights'
import { careerScore, legacyOf, legacyTier, isTopFive, countriesPlayedIn } from '../legacy'
import type { Career } from '../types'

const opts = {
  name: 'Legacy Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

/**
 * A career run far enough to have a story in it. Whatever the summer stops
 * for, it takes the first way through and plays on, the way an impatient
 * player would.
 */
function played(seed: number, seasons = 12): Career {
  let career = createCareer({ ...opts, seed })
  for (let i = 0; i < seasons && career.phase !== 'retired'; i++) {
    career = playSeasons(career, 1)
    let guard = 0
    while (career.phase !== 'season' && career.phase !== 'retired' && guard++ < 8) {
      if (career.phase === 'event') career = closeEvent(career)
      else if (career.phase === 'penalty') career = closePenalty(career)
      else if (career.phase === 'offers') career = acceptOffer(career, career.offers[0])
    }
  }
  return career
}

describe('the legacy score', () => {
  it('adds up to exactly the sum of its parts', () => {
    const legacy = legacyOf(played(3))
    const sum = legacy.parts.reduce((total, p) => total + p.points, 0)
    expect(legacy.total).toBe(sum)
    expect(careerScore(played(3))).toBe(legacy.total)
  })

  it('never goes negative, however badly a career went', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const legacy = legacyOf(played(seed, 3))
      expect(legacy.total).toBeGreaterThanOrEqual(0)
      for (const part of legacy.parts) expect(part.points).toBeGreaterThanOrEqual(0)
    }
  })

  it('rates a longer career above the same career cut short', () => {
    const short = played(11, 4)
    const long = played(11, 16)
    expect(careerScore(long)).toBeGreaterThan(careerScore(short))
  })

  it('is the same number every time it is asked', () => {
    const career = played(9)
    expect(careerScore(career)).toBe(careerScore(career))
  })

  it('names a tier for every score', () => {
    expect(legacyTier(0)).toBe('brief')
    expect(legacyTier(1200)).toBe('immortal')
    expect(legacyTier(700)).toBe('elite')
    // the ladder never skips: every step is reachable
    const seen = new Set([0, 150, 300, 500, 800, 1000].map(legacyTier))
    expect(seen.size).toBe(6)
  })

  it('knows the five countries at the top of the pyramid', () => {
    expect(isTopFive('ger1')).toBe(true)
    expect(isTopFive('eng1')).toBe(true)
    expect(isTopFive('ger2')).toBe(false)
    expect(isTopFive('nope')).toBe(false)
  })

  it('lists the countries a career was played in, in order', () => {
    const career = played(7)
    const countries = countriesPlayedIn(career)
    expect(countries.length).toBeGreaterThan(0)
    expect(new Set(countries).size).toBe(countries.length)
  })
})

describe('career highlights', () => {
  it('never prints two lines for the same summer', () => {
    for (const seed of [2, 8, 21, 44]) {
      const rows = highlightsOf(played(seed))
      const seasons = rows.map((h) => h.season)
      expect(new Set(seasons).size).toBe(seasons.length)
    }
  })

  it('reads in the order it happened, and stays inside the limit', () => {
    const rows = highlightsOf(played(15), 5)
    expect(rows.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].season).toBeGreaterThan(rows[i - 1].season)
    }
  })

  it('opens on the debut, whatever else the career did', () => {
    const rows = highlightsOf(played(6), 40)
    const debut = rows.find((h) => h.id === 'debut')
    expect(debut).toBeDefined()
    expect(rows[0].season).toBeLessThanOrEqual(debut!.season)
  })

  it('has nothing to say about a career that has not been played', () => {
    expect(highlightsOf(createCareer({ ...opts, seed: 4 }))).toEqual([])
    expect(greatestMoment(createCareer({ ...opts, seed: 4 }))).toBeNull()
  })

  it('picks something other than the debut as the moment, once there is one', () => {
    const moment = greatestMoment(played(12))
    expect(moment).not.toBeNull()
    expect(moment!.id).not.toBe('debut')
  })
})
