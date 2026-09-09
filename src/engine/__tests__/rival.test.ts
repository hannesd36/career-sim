import { describe, expect, it } from 'vitest'
import { CLUB_BY_ID } from '../../data/clubs'
import { acceptOffer, closeEvent, closePenalty, createCareer, playSeasons } from '../career'
import { rivalCareer, rivalCompare, rivalNewsFor, rivalOf } from '../rival'
import type { Career } from '../types'

const opts = {
  name: 'Rival Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

function played(seed: number, seasons = 10): Career {
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

/** The first seed in a run that was dealt a rival at all. */
function withRival(from = 1): Career {
  for (let seed = from; seed < from + 40; seed++) {
    const career = played(seed)
    if (rivalOf(career)) return career
  }
  throw new Error('no career in forty was given a rival')
}

describe('the one from your year group', () => {
  it('is the same man every time the same career asks', () => {
    const career = withRival()
    expect(rivalOf(career)?.name).toBe(rivalOf(career)?.name)
    expect(rivalCareer(career)).toEqual(rivalCareer(career))
  })

  it('is not dealt to everybody', () => {
    const dealt = Array.from({ length: 30 }, (_, i) =>
      rivalOf(createCareer({ ...opts, seed: i + 1 })),
    )
    expect(dealt.some((r) => r === null)).toBe(true)
    expect(dealt.some((r) => r !== null)).toBe(true)
  })

  it('gives him a career that only ever moves forwards', () => {
    const run = rivalCareer(withRival())!
    expect(run.seasons.length).toBeGreaterThan(0)
    for (let i = 1; i < run.seasons.length; i++) {
      expect(run.seasons[i].age).toBe(run.seasons[i - 1].age + 1)
    }
    for (const season of run.seasons) {
      expect(CLUB_BY_ID[season.clubId]).toBeDefined()
      expect(season.ovr).toBeGreaterThan(30)
      expect(season.ovr).toBeLessThanOrEqual(99)
    }
    expect(run.peak).toBeGreaterThanOrEqual(run.ovr)
  })

  it('never says more than one thing about a season', () => {
    const career = withRival()
    for (const record of career.history) {
      const news = rivalNewsFor(career, record.season)
      if (news) expect(news.name).toBeTruthy()
    }
  })

  it('has nothing to say about a career it was not dealt to', () => {
    for (let seed = 1; seed < 40; seed++) {
      const career = played(seed, 4)
      if (!rivalOf(career)) {
        expect(rivalCareer(career)).toBeNull()
        expect(rivalCompare(career)).toBeNull()
        return
      }
    }
  })

  it('reaches a verdict out of the same numbers it shows', () => {
    const compare = rivalCompare(withRival())!
    expect(['you', 'rival', 'level']).toContain(compare.verdict)
    expect(compare.you.name).toBe('Rival Test')
    expect(compare.rival.name).toBeTruthy()
    expect(compare.rival.ovr).toBeGreaterThan(0)
  })
})
