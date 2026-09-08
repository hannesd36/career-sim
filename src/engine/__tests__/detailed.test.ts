import { describe, expect, it } from 'vitest'
import { ratingOf } from '../attributes'
import * as careerModule from '../career'
import { createCareer, playSeasons, setTraining, upgradeToDetailed } from '../career'
import { detailOf, isDetailed, type Career } from '../types'

function make(detail: 'simple' | 'detailed', seed = 4242): Career {
  return createCareer({
    name: 'Test Spieler',
    nation: 'Germany',
    position: 'CM',
    foot: 'Right',
    mode: 'normal',
    seed,
    detail,
  })
}

/** Plays on regardless of what the career stops for, so a test can cover years. */
function run(career: Career, seasons: number): Career {
  let c = career
  for (let i = 0; i < seasons; i++) {
    if (c.phase === 'retired') break
    if (c.phase === 'season') c = playSeasons(c, 1)
    else if (c.phase === 'offers') c = { ...c, phase: 'season', offers: [] }
    else if (c.phase === 'event' && c.pendingEvent) {
      // Any choice will do; the point is to keep the years turning.
      c = { ...c, phase: 'season', pendingEvent: null }
    } else if (c.phase === 'penalty') {
      c = { ...c, phase: 'season', pendingPenalty: null }
    }
  }
  return c
}

describe('the two modes', () => {
  it('defaults to simple, and an old save with no field reads as simple', () => {
    expect(detailOf(make('simple'))).toBe('simple')
    expect(detailOf({})).toBe('simple')
    expect(isDetailed({ detail: undefined })).toBe(false)
  })

  it('gives a simple career no attributes at all', () => {
    const c = run(make('simple'), 6)
    expect(c.player.attributes).toBeUndefined()
  })

  it('gives a detailed career a shape that reads as its rating', () => {
    const c = make('detailed')
    expect(c.player.attributes).toBeDefined()
    expect(ratingOf(c.player.attributes!, c.player.position)).toBeCloseTo(c.player.ovr, 0)
  })
})

describe('the shape follows the rating', () => {
  it('stays pinned to the OVR across a whole career', () => {
    let c = make('detailed')
    for (let i = 0; i < 14; i++) {
      c = run(c, 1)
      if (c.phase === 'retired') break
      expect(ratingOf(c.player.attributes!, c.player.position)).toBeCloseTo(c.player.ovr, 0)
    }
  })

  it('leaves the attributes themselves unable to move the simulation', () => {
    /*
     * This used to assert that a detailed career and a simple one on the same
     * seed played identical football. That stopped being true once the manager
     * started choosing the squad role and the body started choosing the
     * injury, both of which are the point of those systems.
     *
     * What the attribute layer itself may still not do is feed back into the
     * rating. The shape is refitted to the OVR every season, so however far
     * training pushes a player one way, the number the simulation runs on is
     * the one it decided.
     */
    const shooters = run(setTraining(make('detailed', 77), 'shooting'), 8)
    const defenders = run(setTraining(make('detailed', 77), 'defending'), 8)
    expect(shooters.player.ovr).toBe(defenders.player.ovr)
    expect(shooters.history.map((h) => h.goals)).toEqual(defenders.history.map((h) => h.goals))
  })
})

describe('upgrading', () => {
  it('builds a shape around the rating the career already reached', () => {
    const played = run(make('simple'), 7)
    expect(played.player.attributes).toBeUndefined()

    const up = upgradeToDetailed(played)
    expect(isDetailed(up)).toBe(true)
    expect(up.player.attributes).toBeDefined()
    expect(ratingOf(up.player.attributes!, up.player.position)).toBeCloseTo(up.player.ovr, 0)
    expect(up.detailedFrom).toBe(played.season)
  })

  it('keeps the history and the player it was called with', () => {
    const played = run(make('simple'), 7)
    const up = upgradeToDetailed(played)
    expect(up.history).toEqual(played.history)
    expect(up.player.ovr).toBe(played.player.ovr)
    expect(up.player.name).toBe(played.player.name)
    expect(played.player.attributes).toBeUndefined() // not mutated
  })

  it('is a no-op on a career that is already detailed', () => {
    const c = make('detailed')
    expect(upgradeToDetailed(c)).toBe(c)
  })

  it('has no way back down', () => {
    // There is deliberately no downgrade function. If one ever appears, this
    // test should be the thing that makes somebody justify it.
    const exported = Object.keys(careerModule)
    expect(exported.some((k) => /downgrade|toSimple/i.test(k))).toBe(false)
  })
})

describe('training', () => {
  it('is ignored on a simple career', () => {
    const c = setTraining(make('simple'), 'shooting')
    expect(c.training).toBeFalsy()
  })

  it('sticks on a detailed one', () => {
    expect(setTraining(make('detailed'), 'shooting').training).toBe('shooting')
    expect(setTraining(make('detailed'), null).training).toBeNull()
  })

  it('changes what a player becomes without changing how good he is', () => {
    const base = make('detailed', 909)
    const shooters = run(setTraining(base, 'shooting'), 6)
    const defenders = run(setTraining(base, 'defending'), 6)

    // Same career, same rolls, same rating.
    expect(shooters.player.ovr).toBe(defenders.player.ovr)

    const finishing = (c: Career) => c.player.attributes?.finishing ?? 0
    const tackling = (c: Career) => c.player.attributes?.standingTackle ?? 0
    expect(finishing(shooters)).toBeGreaterThan(finishing(defenders))
    expect(tackling(defenders)).toBeGreaterThan(tackling(shooters))
  })
})
