import { describe, expect, it } from 'vitest'
import {
  ATTRS_BY_FACET,
  advance,
  attrsFor,
  facetOf,
  facetSummary,
  facetWeights,
  fit,
  generate,
  ratingOf,
  shapeBonus,
  standout,
  type Facet,
} from '../attributes'
import { Rng } from '../rng'
import { POSITIONS } from '../types'

const OUTFIELD = POSITIONS.filter((p) => p !== 'GK')

describe('facet weights', () => {
  it('normalise to one for every position', () => {
    for (const pos of POSITIONS) {
      const total = Object.values(facetWeights(pos)).reduce((a, b) => a + (b ?? 0), 0)
      expect(total).toBeCloseTo(1, 6)
    }
  })

  it('put a keeper on goalkeeping and a centre-back on defending', () => {
    expect(facetWeights('GK').goalkeeping).toBeGreaterThan(0.6)
    const cb = facetWeights('CB')
    expect(cb.defending ?? 0).toBeGreaterThan(cb.shooting ?? 0)
    const st = facetWeights('ST')
    expect(st.shooting ?? 0).toBeGreaterThan(st.defending ?? 0)
  })
})

describe('generate', () => {
  it('produces a set that reads as the rating it was built for', () => {
    for (const pos of POSITIONS) {
      for (const ovr of [48, 62, 74, 88]) {
        const attrs = generate(ovr, pos, new Rng(ovr * 7 + pos.length))
        expect(ratingOf(attrs, pos)).toBeCloseTo(ovr, 0)
      }
    }
  })

  it('only fills the attributes the position carries', () => {
    const gk = generate(70, 'GK', new Rng(1))
    expect(Object.keys(gk).sort()).toEqual([...attrsFor('GK')].sort())
    expect(gk.gkReflexes).toBeDefined()
    expect(gk.slidingTackle).toBeUndefined()

    const st = generate(70, 'ST', new Rng(1))
    expect(st.gkReflexes).toBeUndefined()
    expect(st.finishing).toBeDefined()
  })

  it('leans a position towards what it lives on', () => {
    // Averaged over many players, a winger is faster than a centre-back on the
    // same rating. One roll could go either way; the shape should not.
    let wingerPace = 0
    let backPace = 0
    for (let i = 0; i < 40; i++) {
      const w = generate(75, 'LW', new Rng(i))
      const b = generate(75, 'CB', new Rng(i))
      wingerPace += ((w.acceleration ?? 0) + (w.sprintSpeed ?? 0)) / 2
      backPace += ((b.acceleration ?? 0) + (b.sprintSpeed ?? 0)) / 2
    }
    expect(wingerPace / 40).toBeGreaterThan(backPace / 40 + 4)
  })

  it('stays inside the scale even at the extremes', () => {
    for (const ovr of [30, 99]) {
      for (const pos of POSITIONS) {
        const attrs = generate(ovr, pos, new Rng(3))
        for (const v of Object.values(attrs)) {
          expect(v).toBeGreaterThanOrEqual(12)
          expect(v).toBeLessThanOrEqual(99)
        }
      }
    }
  })
})

describe('fit', () => {
  it('moves the level without destroying the shape', () => {
    const attrs = generate(70, 'ST', new Rng(11))
    const before = standout(attrs, 'ST').best
    const raised = fit(attrs, 84, 'ST')
    expect(ratingOf(raised, 'ST')).toBeCloseTo(84, 0)
    expect(standout(raised, 'ST').best).toEqual(before)
  })
})

describe('advance', () => {
  it('keeps the set pinned to the rating the simulation decided', () => {
    let attrs = generate(58, 'CM', new Rng(5))
    const rng = new Rng(9)
    let ovr = 58
    for (let age = 17; age <= 34; age++) {
      ovr = Math.min(90, ovr + (age < 27 ? 2 : -1))
      attrs = advance(attrs, { position: 'CM', age, ovrAfter: ovr, rng })
      expect(ratingOf(attrs, 'CM')).toBeCloseTo(ovr, 0)
    }
  })

  it('training a facet moves that facet relative to the rest', () => {
    // Same player, same rolls, same rating either side: only the choice differs.
    const start = generate(70, 'CM', new Rng(2))
    const trained = advance(start, {
      position: 'CM',
      age: 23,
      ovrAfter: 70,
      training: 'shooting',
      rng: new Rng(4),
    })
    const untrained = advance(start, {
      position: 'CM',
      age: 23,
      ovrAfter: 70,
      training: null,
      rng: new Rng(4),
    })
    const shootingOf = (a: typeof start) =>
      facetSummary(a, 'CM').find((f) => f.facet === 'shooting')?.value ?? 0
    expect(shootingOf(trained)).toBeGreaterThan(shootingOf(untrained))
  })

  it('takes the legs before it takes the head', () => {
    // A veteran held at the same rating should be redistributing, not just
    // sliding: pace down, composure up.
    let attrs = generate(80, 'ST', new Rng(6))
    const paceBefore = ((attrs.acceleration ?? 0) + (attrs.sprintSpeed ?? 0)) / 2
    const composureBefore = attrs.composure ?? 0
    const rng = new Rng(8)
    for (let age = 31; age <= 36; age++) {
      attrs = advance(attrs, { position: 'ST', age, ovrAfter: 80, rng })
    }
    const paceAfter = ((attrs.acceleration ?? 0) + (attrs.sprintSpeed ?? 0)) / 2
    expect(paceAfter).toBeLessThan(paceBefore)
    expect(attrs.composure ?? 0).toBeGreaterThan(composureBefore - paceBefore + paceAfter)
  })

  it('never leaves the scale over a whole career', () => {
    for (const pos of POSITIONS) {
      let attrs = generate(52, pos, new Rng(pos.length))
      const rng = new Rng(21)
      for (let age = 17; age <= 38; age++) {
        attrs = advance(attrs, {
          position: pos,
          age,
          ovrAfter: age < 28 ? Math.min(92, 52 + (age - 16) * 3) : Math.max(45, 92 - (age - 27) * 4),
          training: 'physical',
          rng,
        })
        for (const v of Object.values(attrs)) {
          expect(v).toBeGreaterThanOrEqual(12)
          expect(v).toBeLessThanOrEqual(99)
        }
      }
    }
  })
})

describe('shapeBonus', () => {
  it('is small, and rewards a shape that suits the position', () => {
    const striker = generate(78, 'ST', new Rng(13))
    expect(shapeBonus(striker, 'ST')).toBeGreaterThan(shapeBonus(striker, 'CB'))
    for (const pos of OUTFIELD) {
      const a = generate(78, pos, new Rng(2))
      expect(Math.abs(shapeBonus(a, pos))).toBeLessThanOrEqual(2)
    }
  })
})

describe('bookkeeping', () => {
  it('files every attribute under exactly one facet', () => {
    const seen = new Map<string, Facet[]>()
    for (const facet of Object.keys(ATTRS_BY_FACET) as Facet[]) {
      for (const id of ATTRS_BY_FACET[facet]) {
        seen.set(id, [...(seen.get(id) ?? []), facet])
      }
    }
    for (const [id, facets] of seen) {
      expect(facets, `${id} is filed under ${facets.join(' and ')}`).toHaveLength(1)
      expect(facetOf(id as never)).toBe(facets[0])
    }
  })

  it('gives every position a full summary with no empty facets', () => {
    for (const pos of POSITIONS) {
      const attrs = generate(70, pos, new Rng(1))
      for (const row of facetSummary(attrs, pos)) {
        expect(row.value, `${pos} ${row.facet}`).toBeGreaterThan(0)
      }
    }
  })
})
