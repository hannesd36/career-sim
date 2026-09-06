import { describe, expect, it } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { buildCrestRound, type CrestDifficulty } from '../crestQuiz'
import { Rng } from '../rng'

describe('buildCrestRound', () => {
  it('always includes the target among its four distinct options', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as CrestDifficulty[]) {
      const round = buildCrestRound(new Rng(1), difficulty, new Set())
      expect(round).not.toBeNull()
      const ids = round!.options.map((o) => o.id)
      expect(new Set(ids).size).toBe(4)
      expect(ids).toContain(round!.club.id)
    }
  })

  it('never picks a target club without a real crest', () => {
    for (let seed = 0; seed < 30; seed++) {
      const round = buildCrestRound(new Rng(seed), 'hard', new Set())
      expect(round?.club.badge).toBeTruthy()
    }
  })

  it('easy never reaches below the top flight', () => {
    for (let seed = 0; seed < 30; seed++) {
      const round = buildCrestRound(new Rng(seed), 'easy', new Set())
      expect(round?.club.tier).toBe(1)
    }
  })

  it('is deterministic for a given seed', () => {
    const a = buildCrestRound(new Rng(42), 'normal', new Set())
    const b = buildCrestRound(new Rng(42), 'normal', new Set())
    expect(a).toEqual(b)
  })

  it('respects the exclude set', () => {
    const first = buildCrestRound(new Rng(3), 'hard', new Set())!
    const round = buildCrestRound(new Rng(3), 'hard', new Set([first.club.id]))
    expect(round?.club.id).not.toBe(first.club.id)
  })

  it('falls back gracefully when the exclude set would leave fewer than four clubs', () => {
    const everyone = new Set(CLUBS.map((c) => c.id))
    const round = buildCrestRound(new Rng(1), 'easy', everyone)
    // buildCrestRound itself returns null in this case; the UI is the one that retries
    expect(round).toBeNull()
  })
})
