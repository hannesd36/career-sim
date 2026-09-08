import { describe, expect, it } from 'vitest'
import { createCareer } from '../career'
import { cohortOf, cohortRank, cohortTable, peerGoalsBy, peerOvrAt } from '../cohort'
import { isKeeper } from '../sim'

const opts = {
  name: 'Cohort Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

describe('the year group', () => {
  it('draws the same nine for the same career', () => {
    const career = createCareer({ ...opts, seed: 21 })
    expect(cohortOf(career)).toEqual(cohortOf(career))
    expect(cohortOf(career)).toHaveLength(9)
  })

  it('draws a different nine for a different career', () => {
    const a = cohortOf(createCareer({ ...opts, seed: 1 }))
      .map((p) => p.name)
      .join()
    const b = cohortOf(createCareer({ ...opts, seed: 2 }))
      .map((p) => p.name)
      .join()
    expect(a).not.toBe(b)
  })

  it('gives everybody a real club and a real country', () => {
    for (const peer of cohortOf(createCareer({ ...opts, seed: 6 }))) {
      expect(peer.clubId).toBeTruthy()
      expect(peer.nation).toBeTruthy()
      expect(peer.flag).toBeTruthy()
      expect(peer.name.split(' ')).toHaveLength(2)
    }
  })

  it('rises to a peak and falls away after it', () => {
    for (const peer of cohortOf(createCareer({ ...opts, seed: 12 }))) {
      expect(peerOvrAt(peer, 16)).toBe(peer.start)
      expect(peerOvrAt(peer, peer.peakAge)).toBe(peer.ceiling)
      expect(peerOvrAt(peer, 20)).toBeGreaterThanOrEqual(peerOvrAt(peer, 18))
      expect(peerOvrAt(peer, 40)).toBeLessThan(peer.ceiling)
    }
  })

  it('never sends a rating outside the scale', () => {
    for (const peer of cohortOf(createCareer({ ...opts, seed: 30 }))) {
      for (let age = 16; age <= 45; age++) {
        const ovr = peerOvrAt(peer, age)
        expect(ovr).toBeGreaterThanOrEqual(40)
        expect(ovr).toBeLessThanOrEqual(99)
      }
    }
  })

  it('has a spread rather than nine of the same player', () => {
    const ceilings = cohortOf(createCareer({ ...opts, seed: 4 })).map((p) => p.ceiling)
    expect(Math.max(...ceilings) - Math.min(...ceilings)).toBeGreaterThan(8)
  })

  it('never gives a goalkeeper career goals', () => {
    for (const peer of cohortOf(createCareer({ ...opts, seed: 15 }))) {
      if (isKeeper(peer.position)) expect(peerGoalsBy(peer, 34)).toBe(0)
    }
  })

  it('accumulates goals rather than losing them', () => {
    const peer = cohortOf(createCareer({ ...opts, seed: 9 })).find((p) => !isKeeper(p.position))!
    expect(peerGoalsBy(peer, 30)).toBeGreaterThanOrEqual(peerGoalsBy(peer, 24))
  })

  it('puts the career in the table it is ranked against', () => {
    const career = createCareer({ ...opts, seed: 44 })
    const rows = cohortTable(career)
    expect(rows).toHaveLength(10)
    expect(rows.filter((r) => r.you)).toHaveLength(1)
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    // ranked on rating, best first
    for (let i = 1; i < rows.length; i++)
      expect(rows[i - 1].ovr).toBeGreaterThanOrEqual(rows[i].ovr)
  })

  it('agrees with itself about where the career stands', () => {
    const career = createCareer({ ...opts, seed: 88 })
    const { rank, of } = cohortRank(career)
    expect(of).toBe(10)
    expect(cohortTable(career).find((r) => r.you)!.rank).toBe(rank)
  })
})
