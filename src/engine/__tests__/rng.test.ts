import { describe, expect, it } from 'vitest'
import { Rng, clamp, randomSeed } from '../rng'

describe('Rng', () => {
  it('is deterministic: the same seed always produces the same sequence', () => {
    const a = new Rng(12345)
    const b = new Rng(12345)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('different seeds diverge', () => {
    const a = new Rng(1)
    const b = new Rng(2)
    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('next() stays within [0, 1)', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 500; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int() is inclusive at both ends and never strays outside them', () => {
    const rng = new Rng(7)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 3)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(3)
      seen.add(v)
    }
    // over 500 draws from a 3-wide range, every value should turn up at least once
    expect(seen).toEqual(new Set([1, 2, 3]))
  })

  it('chance() respects extremes', () => {
    const rng = new Rng(9)
    expect(rng.chance(0)).toBe(false)
    expect(rng.chance(1)).toBe(true)
  })

  it('pick() only ever returns elements of the array', () => {
    const rng = new Rng(3)
    const pool = ['a', 'b', 'c']
    for (let i = 0; i < 50; i++) {
      expect(pool).toContain(rng.pick(pool))
    }
  })

  it('shuffle() is a permutation: same elements, not necessarily the same order', () => {
    const rng = new Rng(11)
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = rng.shuffle(original)
    expect(shuffled).not.toBe(original) // does not mutate in place
    expect([...shuffled].sort()).toEqual([...original].sort())
  })

  it('poisson() never returns a negative count', () => {
    const rng = new Rng(21)
    for (const lambda of [0, 0.5, 2, 10, 30]) {
      for (let i = 0; i < 50; i++) {
        expect(rng.poisson(lambda)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('gauss() is clamped at plus or minus three standard deviations', () => {
    const rng = new Rng(5)
    for (let i = 0; i < 1000; i++) {
      const v = rng.gauss(0, 1)
      expect(v).toBeGreaterThanOrEqual(-3)
      expect(v).toBeLessThanOrEqual(3)
    }
  })
})

describe('clamp', () => {
  it('leaves in-range values alone and pins out-of-range ones to the bound', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('randomSeed', () => {
  it('returns a non-negative integer', () => {
    const seed = randomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
  })
})
