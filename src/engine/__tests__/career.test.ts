import { describe, expect, it } from 'vitest'
import { CLUB_BY_ID } from '../../data/clubs'
import { LEAGUE_BY_ID } from '../../data/leagues'
import { createCareer, generateOffers, playSeasons, transferAffinity } from '../career'
import { Rng } from '../rng'
import type { Club } from '../types'

const opts = {
  name: 'Test Player',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

describe('createCareer', () => {
  it('starts a sixteen year old at a real club with a sane potential range', () => {
    const career = createCareer({ ...opts, seed: 1 })
    const { player } = career

    expect(player.age).toBe(16)
    expect(player.retired).toBe(false)
    expect(CLUB_BY_ID[player.clubId]).toBeDefined()

    // the invariants createCareer's own clamping is supposed to guarantee
    expect(player.potMin).toBeGreaterThanOrEqual(player.ovr)
    expect(player.potMin).toBeLessThan(player.potMax)
    expect(player.hiddenPotential).toBeGreaterThanOrEqual(player.potMin)
    expect(player.hiddenPotential).toBeLessThanOrEqual(player.potMax)
    expect(player.potMax).toBeLessThanOrEqual(99)
  })

  it('is fully determined by its seed', () => {
    const a = createCareer({ ...opts, seed: 777, startYear: 2030 })
    const b = createCareer({ ...opts, seed: 777, startYear: 2030 })
    expect(a.player).toEqual(b.player)
    expect(a.season).toBe(b.season)
  })

  it('different seeds land on different players (statistically, not by construction)', () => {
    const a = createCareer({ ...opts, seed: 1 })
    const b = createCareer({ ...opts, seed: 2 })
    // extremely unlikely to collide across every field if the seed were not wired in
    expect(a.player).not.toEqual(b.player)
  })
})

describe('playSeasons', () => {
  it('never mutates the career it was called with', () => {
    const career = createCareer({ ...opts, seed: 5 })
    const startingAge = career.player.age
    const startingHistoryLength = career.history.length

    playSeasons(career, 1)

    expect(career.player.age).toBe(startingAge)
    expect(career.history.length).toBe(startingHistoryLength)
  })

  it('always ages the player by exactly one year and adds one season, regardless of what interrupts it', () => {
    // Try a spread of seeds so the assertion holds whether or not a decision
    // or a penalty fires along the way — both still play exactly one season.
    for (let seed = 0; seed < 25; seed++) {
      const career = createCareer({ ...opts, seed })
      const next = playSeasons(career, 1)
      expect(next.player.age).toBe(career.player.age + 1)
      expect(next.history.length).toBe(career.history.length + 1)
    }
  })

  it('replays identically from the same seed and season', () => {
    const career = createCareer({ ...opts, seed: 99 })
    const a = playSeasons(career, 3)
    const b = playSeasons(career, 3)
    expect(a.history).toEqual(b.history)
    expect(a.player).toEqual(b.player)
  })
})

describe('transferAffinity', () => {
  const clubIn = (leagueId: string): Club => ({
    id: `test-${leagueId}`,
    name: 'Test Club',
    leagueId,
    tier: 2,
    badge: null,
    strength: LEAGUE_BY_ID[leagueId].strength,
  })

  it('favours a domestic move over a cross-continent one for an unproven player', () => {
    const career = createCareer({ ...opts, seed: 1 })
    const player = { ...career.player, age: 24, nation: 'Germany' }

    const from = clubIn('ger2')
    const domestic = clubIn('ger1')
    const distant = clubIn('bra1') // different continent entirely

    // level 55 keeps the player well below the "a star can move anywhere" threshold
    const domesticAffinity = transferAffinity(from, domestic, player, 55)
    const distantAffinity = transferAffinity(from, distant, player, 55)

    expect(domesticAffinity).toBeGreaterThan(distantAffinity)
  })

  it('damps the distance penalty as the player is rated higher', () => {
    const career = createCareer({ ...opts, seed: 1 })
    const player = { ...career.player, age: 27, nation: 'Germany' }
    const from = clubIn('ger1')
    const distant = clubIn('bra1')

    const lowLevel = transferAffinity(from, distant, player, 55)
    const highLevel = transferAffinity(from, distant, player, 90)

    expect(highLevel).toBeGreaterThan(lowLevel)
  })
})

describe('the summer window', () => {
  const clubIn = (leagueId: string): Club => ({
    id: `test-${leagueId}`,
    name: 'Test Club',
    leagueId,
    tier: LEAGUE_BY_ID[leagueId].tier,
    badge: null,
    strength: LEAGUE_BY_ID[leagueId].strength,
  })

  it('always leaves a player somewhere to play, however little anybody wants him', () => {
    // A career nobody is interested in used to be handed an empty window,
    // which ends it on the spot. The club he is already at still gets to keep
    // him, so a quiet career is played out rather than deleted.
    const career = createCareer({ ...opts, seed: 3 })
    for (const age of [19, 24, 31, 38]) {
      const player = { ...career.player, age, ovr: 42, potMin: 42, potMax: 43 }
      const offers = generateOffers(player, null, new Rng(age))
      expect(offers.length, `age ${age}`).toBeGreaterThan(0)
    }
  })

  it('stops offering anything at all once the boots are done', () => {
    const career = createCareer({ ...opts, seed: 3 })
    expect(generateOffers({ ...career.player, age: 41 }, null, new Rng(1))).toEqual([])
  })

  it('pulls a career back towards a club it already played for', () => {
    const career = createCareer({ ...opts, seed: 8 })
    const player = { ...career.player, age: 29, nation: 'Germany' }
    const from = clubIn('ita1')
    const old = clubIn('ger1')
    const stranger = { ...clubIn('ger1'), id: 'test-stranger' }

    const known = transferAffinity(from, old, player, 74, new Set([old.id]))
    const unknown = transferAffinity(from, stranger, player, 74)
    expect(known).toBeGreaterThan(unknown)
  })
})
