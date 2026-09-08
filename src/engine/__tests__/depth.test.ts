import { describe, expect, it } from 'vitest'
import { CLUB_BY_ID, CLUBS } from '../../data/clubs'
import {
  acceptOffer,
  createCareer,
  moveInvestment,
  playSeasons,
  termsFor,
  toggleSpend,
  upgradeToDetailed,
} from '../career'
import {
  baseWage,
  isExpiring,
  offerTerms,
  promiseBroken,
  seasonEarnings,
  sign,
  yearsLeft,
} from '../contracts'
import { emptyFinances, invest, perksOf, settleSeason, toggle, upkeep } from '../finances'
import { INJURY_BY_ID, applyLasting, glassLevel, newBody, record, rollInjury } from '../injuries'
import { Rng } from '../rng'
import { moodOf, newRoom, roleFromOpinion, updateOpinion } from '../staff'
import { projectRole } from '../sim'
import { isDetailed, type Career, type SeasonRecord, type SquadRole } from '../types'

function make(detail: 'simple' | 'detailed', seed = 771): Career {
  return createCareer({
    name: 'Test',
    nation: 'Germany',
    position: 'ST',
    foot: 'Right',
    mode: 'normal',
    seed,
    detail,
  })
}

function run(career: Career, seasons: number): Career {
  let c = career
  for (let i = 0; i < seasons; i++) {
    if (c.phase === 'retired') break
    if (c.phase === 'season') c = playSeasons(c, 1)
    else if (c.phase === 'offers') c = { ...c, phase: 'season', offers: [] }
    else if (c.phase === 'event') c = { ...c, phase: 'season', pendingEvent: null }
    else if (c.phase === 'penalty') c = { ...c, phase: 'season', pendingPenalty: null }
  }
  return c
}

const bigClub = [...CLUBS].sort((a, b) => b.strength - a.strength)[0]
const smallClub = [...CLUBS].sort((a, b) => a.strength - b.strength)[0]

// ---------------------------------------------------------------- contracts

describe('wages', () => {
  it('pay more for a better player at a better club', () => {
    const c = make('detailed')
    const weak = { ...c.player, ovr: 55, age: 26 }
    const strong = { ...c.player, ovr: 88, age: 26 }
    expect(baseWage(strong, bigClub, 'Starter')).toBeGreaterThan(baseWage(weak, bigClub, 'Starter'))
    expect(baseWage(strong, bigClub, 'Starter')).toBeGreaterThan(
      baseWage(strong, smallClub, 'Starter'),
    )
    expect(baseWage(strong, bigClub, 'Key player')).toBeGreaterThan(
      baseWage(strong, bigClub, 'Benchwarmer'),
    )
  })

  it('never go to zero or below', () => {
    const c = make('detailed')
    for (const ovr of [30, 45, 99]) {
      for (const club of [smallClub, bigClub]) {
        const w = baseWage({ ...c.player, ovr }, club, 'Benchwarmer')
        expect(w).toBeGreaterThan(0)
      }
    }
  })

  it('pay a teenager and a veteran less than a player in his prime', () => {
    const c = make('detailed')
    const prime = baseWage({ ...c.player, ovr: 80, age: 27 }, bigClub, 'Starter')
    expect(baseWage({ ...c.player, ovr: 80, age: 18 }, bigClub, 'Starter')).toBeLessThan(prime)
    expect(baseWage({ ...c.player, ovr: 80, age: 35 }, bigClub, 'Starter')).toBeLessThan(prime)
  })
})

describe('terms', () => {
  it('offer four shapes that are genuinely different', () => {
    const c = make('detailed')
    const terms = offerTerms({ ...c.player, ovr: 78, age: 26 }, bigClub, 'Starter', new Rng(3))
    expect(terms.map((t) => t.id)).toEqual(['standard', 'long', 'incentive', 'short'])
    const byId = Object.fromEntries(terms.map((t) => [t.id, t]))
    // The long deal trades weekly money for years, the short one the reverse.
    expect(byId.long.wage).toBeLessThan(byId.standard.wage)
    expect(byId.long.years).toBeGreaterThan(byId.standard.years)
    expect(byId.short.wage).toBeGreaterThan(byId.standard.wage)
    expect(byId.short.years).toBe(1)
    // The incentivised one pays least up front and is the only one with bonuses.
    expect(byId.incentive.wage).toBeLessThan(byId.long.wage)
    expect(byId.incentive.bonuses.length).toBeGreaterThan(0)
    expect(byId.standard.bonuses).toHaveLength(0)
  })

  it('give a keeper clean sheets to earn from and an outfielder goals', () => {
    const c = make('detailed')
    const gk = offerTerms({ ...c.player, position: 'GK', ovr: 78 }, bigClub, 'Starter', new Rng(1))
    const st = offerTerms({ ...c.player, position: 'ST', ovr: 78 }, bigClub, 'Starter', new Rng(1))
    const kinds = (t: typeof gk) => t.find((x) => x.id === 'incentive')!.bonuses.map((b) => b.kind)
    expect(kinds(gk)).toContain('cleanSheet')
    expect(kinds(gk)).not.toContain('goal')
    expect(kinds(st)).toContain('goal')
  })

  it('do not promise a bench player a starting shirt', () => {
    const c = make('detailed')
    // A promise, when made, is always the role that was actually offered.
    for (let seed = 0; seed < 30; seed++) {
      for (const role of ['Benchwarmer', 'Squad player', 'Rotation'] as SquadRole[]) {
        for (const t of offerTerms({ ...c.player, ovr: 70 }, bigClub, role, new Rng(seed))) {
          if (t.promised) expect(t.promised).toBe(role)
        }
      }
    }
  })
})

describe('what a season pays', () => {
  const rec = (over: Partial<SeasonRecord>): SeasonRecord =>
    ({
      goals: 0,
      assists: 0,
      apps: 0,
      cleanSheets: 0,
      trophies: [],
      role: 'Starter',
      ...over,
    }) as SeasonRecord

  it('is the wage for a year when there are no bonuses', () => {
    const c = sign(
      { id: 'standard', wage: 10, years: 3, promised: null, bonuses: [] },
      bigClub,
      2026,
    )
    expect(seasonEarnings(c, rec({ goals: 20 }))).toBe(520)
  })

  it('adds the bonus sheet on top', () => {
    const c = sign(
      { id: 'incentive', wage: 10, years: 3, promised: null, bonuses: [{ kind: 'goal', per: 5 }] },
      bigClub,
      2026,
    )
    expect(seasonEarnings(c, rec({ goals: 4 }))).toBe(540)
  })

  it('pays nothing without a contract', () => {
    expect(seasonEarnings(null, rec({ goals: 30 }))).toBe(0)
  })
})

describe('contract length', () => {
  it('counts down and reports when it is running out', () => {
    const c = sign(
      { id: 'standard', wage: 5, years: 3, promised: null, bonuses: [] },
      bigClub,
      2026,
    )
    expect(c.until).toBe(2029)
    expect(yearsLeft(c, 2026)).toBe(4)
    expect(isExpiring(c, 2026)).toBe(false)
    expect(isExpiring(c, 2029)).toBe(true)
    expect(yearsLeft(c, 2030)).toBe(0)
    expect(yearsLeft(null, 2026)).toBe(0)
  })
})

describe('a promise broken', () => {
  const withRole = (role: SquadRole) => ({ role }) as SeasonRecord
  it('only counts when the club actually went back on it', () => {
    const promised = sign(
      { id: 'standard', wage: 5, years: 2, promised: 'Starter', bonuses: [] },
      bigClub,
      2026,
    )
    expect(promiseBroken(promised, withRole('Rotation'))).toBe(true)
    expect(promiseBroken(promised, withRole('Benchwarmer'))).toBe(true)
    expect(promiseBroken(promised, withRole('Starter'))).toBe(false)
    // Getting more than you were promised is not a grievance.
    expect(promiseBroken(promised, withRole('Key player'))).toBe(false)
  })

  it('cannot happen when nothing was promised', () => {
    const nothing = sign(
      { id: 'short', wage: 5, years: 1, promised: null, bonuses: [] },
      bigClub,
      2026,
    )
    expect(promiseBroken(nothing, withRole('Benchwarmer'))).toBe(false)
    expect(promiseBroken(null, withRole('Benchwarmer'))).toBe(false)
  })
})

// ---------------------------------------------------------------- finances

describe('money', () => {
  it('adds earnings and takes the upkeep', () => {
    let f = emptyFinances()
    f = toggle(f, 'coach')
    expect(upkeep(f)).toBe(260)
    const { finances: after } = settleSeason(f, 1000, new Rng(1))
    expect(after.earned).toBe(1000)
    expect(after.balance).toBe(740)
  })

  it('drops arrangements that cannot be paid for rather than going negative', () => {
    let f = emptyFinances()
    for (const id of ['coach', 'physio', 'nutrition', 'agent', 'family'] as const) f = toggle(f, id)
    const { finances: after, dropped } = settleSeason(f, 300, new Rng(1))
    expect(after.balance).toBeGreaterThanOrEqual(0)
    expect(dropped.length).toBeGreaterThan(0)
    // The dearest goes first.
    expect(dropped[0]).toBe('agent')
  })

  it('never lets the balance go below zero over a long poor career', () => {
    let f = emptyFinances()
    for (const id of ['coach', 'physio', 'agent'] as const) f = toggle(f, id)
    const rng = new Rng(5)
    for (let i = 0; i < 20; i++) {
      f = settleSeason(f, 50, rng).finances
      expect(f.balance).toBeGreaterThanOrEqual(0)
    }
  })

  it('only invests what is actually there', () => {
    const f = { ...emptyFinances(), balance: 100 }
    expect(invest(f, 500).invested).toBe(100)
    expect(invest(f, 500).balance).toBe(0)
    // and cannot pull out more than was put in
    const held = invest(f, 100)
    expect(invest(held, -500).invested).toBe(0)
  })

  it('turns spending into small edges, never into being good', () => {
    const none = perksOf(emptyFinances())
    expect(none.injury).toBe(1)
    expect(none.growth).toBe(0)
    let f = emptyFinances()
    for (const id of ['coach', 'physio', 'nutrition', 'agent', 'family'] as const) f = toggle(f, id)
    const all = perksOf(f)
    expect(all.injury).toBeLessThan(1)
    expect(all.growth).toBeLessThanOrEqual(1)
    expect(all.recovery).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------- injuries

describe('injuries', () => {
  it('never come back longer than the kind allows', () => {
    const rng = new Rng(9)
    let body = newBody(rng)
    for (let i = 0; i < 400; i++) {
      const injury = rollInjury(body, { age: 28, season: 2030, risk: 3, recovery: 1, rng })
      if (!injury) continue
      const kind = INJURY_BY_ID[injury.id]
      expect(injury.games).toBeGreaterThanOrEqual(1)
      expect(injury.games).toBeLessThanOrEqual(kind.games[1])
      body = record(body, injury)
    }
  })

  it('get more likely with age and less likely with a physio', () => {
    const count = (age: number, recoveryRisk: number) => {
      const rng = new Rng(4)
      const body = newBody(new Rng(4))
      let n = 0
      for (let i = 0; i < 300; i++) {
        if (rollInjury(body, { age, season: 2030, risk: recoveryRisk, recovery: 1, rng })) n++
      }
      return n
    }
    expect(count(35, 1)).toBeGreaterThan(count(22, 1))
    expect(count(28, 0.7)).toBeLessThan(count(28, 1))
  })

  it('leave a mark on the attributes that survives a refit', () => {
    const attrs = { acceleration: 70, sprintSpeed: 70, finishing: 70 }
    const hurt = applyLasting(attrs, {
      id: 'cruciate',
      season: 2030,
      games: 30,
      lasting: { attrs: ['acceleration', 'sprintSpeed'], amount: 3 },
    })
    expect(hurt.acceleration).toBe(67)
    expect(hurt.sprintSpeed).toBe(67)
    expect(hurt.finishing).toBe(70)
  })

  it('makes a body that keeps breaking down read as fragile', () => {
    let body = newBody(new Rng(2))
    const before = glassLevel(body)
    for (let i = 0; i < 6; i++) {
      body = record(body, { id: 'knee', season: 2030 + i, games: 22 })
    }
    const order = ['iron', 'sturdy', 'normal', 'fragile', 'glass']
    expect(order.indexOf(glassLevel(body))).toBeGreaterThan(order.indexOf(before))
  })

  it('keeps proneness inside its bounds no matter how bad it gets', () => {
    let body = newBody(new Rng(1))
    for (let i = 0; i < 60; i++) body = record(body, { id: 'cruciate', season: 2030, games: 40 })
    expect(body.proneness).toBeLessThanOrEqual(1.9)
  })
})

// ------------------------------------------------------------------- staff

describe('the manager', () => {
  it('gives a player he rates a bigger role, and one he does not a smaller', () => {
    expect(roleFromOpinion('Rotation', 90)).toBe('Starter')
    expect(roleFromOpinion('Rotation', 50)).toBe('Rotation')
    // Doubted costs one rung; frozen out costs two, which is the difference
    // between being out of favour and not being considered at all.
    expect(roleFromOpinion('Rotation', 30)).toBe('Squad player')
    expect(roleFromOpinion('Rotation', 10)).toBe('Benchwarmer')
    // and cannot push anybody off either end of the ladder
    expect(roleFromOpinion('Key player', 99)).toBe('Key player')
    expect(roleFromOpinion('Benchwarmer', 0)).toBe('Benchwarmer')
  })

  it('warms to a player who plays well and cools on one who does not play', () => {
    const room = newRoom(2026, 70, new Rng(1), 'Germany', 'UEFA')
    const good = updateOpinion(
      room.manager,
      { apps: 34, rating: 760 } as SeasonRecord,
      'ST',
      new Rng(2),
    )
    const absent = updateOpinion(
      room.manager,
      { apps: 0, rating: 0 } as SeasonRecord,
      'ST',
      new Rng(2),
    )
    expect(good.opinion).toBeGreaterThan(room.manager.opinion)
    expect(absent.opinion).toBeLessThan(room.manager.opinion)
  })

  it('describes itself in words, across the whole range', () => {
    expect(moodOf(95)).toBe('trusted')
    expect(moodOf(50)).toBe('tolerated')
    expect(moodOf(5)).toBe('frozen')
  })

  it('builds a room with named people in it', () => {
    const room = newRoom(2026, 70, new Rng(7), 'Germany', 'UEFA')
    expect(room.mates.length).toBeGreaterThanOrEqual(3)
    for (const m of room.mates) {
      expect(m.name).toMatch(/\S+ \S+/)
      expect(m.ovr).toBeGreaterThan(40)
    }
    expect(room.manager.name).toMatch(/\S+ \S+/)
  })
})

// ------------------------------------------------------- all of it together

describe('a detailed career end to end', () => {
  it('starts with a contract, a body, money and a dressing room', () => {
    const c = make('detailed')
    expect(c.contract).toBeTruthy()
    expect(c.contract!.wage).toBeGreaterThan(0)
    expect(c.player.body).toBeTruthy()
    expect(c.finances).toBeTruthy()
    expect(c.room?.manager.name).toBeTruthy()
  })

  it('gives a simple career none of it', () => {
    const c = run(make('simple'), 5)
    expect(c.contract ?? null).toBeNull()
    expect(c.player.body).toBeUndefined()
    expect(c.finances).toBeUndefined()
    expect(c.room).toBeUndefined()
  })

  it('earns money across seasons and never goes into the red', () => {
    const c = run(make('detailed'), 8)
    expect(c.finances!.earned).toBeGreaterThan(0)
    expect(c.finances!.balance).toBeGreaterThanOrEqual(0)
  })

  it('records injuries with names on the seasons they happened', () => {
    let seen = 0
    for (let seed = 400; seed < 430 && seen === 0; seed++) {
      const c = run(make('detailed', seed), 12)
      seen += c.history.filter((h) => h.injury).length
      for (const h of c.history) {
        if (h.injury) expect(h.gamesMissedInjured).toBeGreaterThan(0)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('keeps the attributes pinned to the rating even with injuries taking bites', () => {
    const c = run(make('detailed', 12345), 12)
    expect(c.player.attributes).toBeTruthy()
    for (const v of Object.values(c.player.attributes!)) {
      expect(v).toBeGreaterThanOrEqual(12)
      expect(v).toBeLessThanOrEqual(99)
    }
  })

  it('upgrades a simple career into a full detailed one mid-run', () => {
    const played = run(make('simple'), 6)
    const up = upgradeToDetailed(played)
    expect(isDetailed(up)).toBe(true)
    expect(up.contract?.clubId).toBe(up.player.clubId)
    expect(up.room).toBeTruthy()
    expect(up.finances?.earned).toBe(0)
    expect(up.player.body?.history).toEqual([])
  })

  it('offers real terms when a club comes in, and signing keeps them', () => {
    let c = make('detailed')
    for (let i = 0; i < 30 && c.phase !== 'offers'; i++) c = run(c, 1)
    if (c.phase !== 'offers' || !c.offers.length) return // no window reached, nothing to assert
    const offer = c.offers[0]
    const terms = termsFor(c, offer)
    expect(terms).toHaveLength(4)
    const signed = acceptOffer(c, offer, terms[0])
    expect(signed.contract!.wage).toBe(terms[0].wage)
    expect(signed.contract!.clubId).toBe(offer.club.id)
  })

  it('lets money be spent and invested through the career, not just the module', () => {
    let c = make('detailed')
    c = { ...c, finances: { ...c.finances!, balance: 5000 } }
    c = toggleSpend(c, 'coach')
    expect(c.finances!.on).toContain('coach')
    c = toggleSpend(c, 'coach')
    expect(c.finances!.on).not.toContain('coach')
    c = moveInvestment(c, 1000)
    expect(c.finances!.invested).toBe(1000)
    expect(c.finances!.balance).toBe(4000)
  })

  it('ignores all of it on a simple career', () => {
    const c = make('simple')
    expect(toggleSpend(c, 'coach')).toBe(c)
    expect(moveInvestment(c, 100)).toBe(c)
  })

  /*
   * A note on an invariant that deliberately no longer holds.
   *
   * While the detailed mode was only attributes, it could not move the
   * simulation at all, and a test asserted exactly that. Now a manager decides
   * the squad role and the body decides the injury, so a detailed career and a
   * simple one on the same seed genuinely diverge. That is the feature.
   *
   * What still has to be true is the other direction: the simple mode must not
   * have picked anything up. These two tests are what is left of the old one.
   */
  it('leaves the simple mode picking its role off the rating alone', () => {
    const c = run(make('simple', 5150), 8)
    for (const h of c.history) {
      if (h.banned) continue
      const club = CLUB_BY_ID[h.clubId]
      expect(h.role).toBe(projectRole(h.ovrStart, club.strength, h.age))
    }
  })

  it('keeps the simple mode deterministic on a seed', () => {
    const a = run(make('simple', 8080), 8)
    const b = run(make('simple', 8080), 8)
    expect(a.history.map((h) => h.goals)).toEqual(b.history.map((h) => h.goals))
    expect(a.player.ovr).toBe(b.player.ovr)
  })

  it('lets the manager, not the rating, decide the role in a detailed career', () => {
    // Somewhere across a career the manager's opinion has to have moved the
    // role off what the rating alone would have given. If it never does, the
    // whole dressing room is decoration.
    let moved = 0
    for (let seed = 600; seed < 640 && moved === 0; seed++) {
      const c = run(make('detailed', seed), 12)
      for (const h of c.history) {
        if (h.banned) continue
        const club = CLUB_BY_ID[h.clubId]
        if (h.role !== projectRole(h.ovrStart, club.strength, h.age)) moved++
      }
    }
    expect(moved).toBeGreaterThan(0)
  })
})
