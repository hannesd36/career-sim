import { beforeEach, describe, expect, it } from 'vitest'
import { acceptOffer, closeEvent, closePenalty, createCareer, playSeasons } from '../career'
import {
  CHALLENGES,
  challengesDone,
  challengesMetBy,
  factsOf,
  openChallenges,
  readChallenges,
  recordChallenges,
} from '../challenges'
import { personalBests, bestCareer, paceAgainstBest } from '../records'
import { nextPrompt } from '../prompt'
import type { Career } from '../types'

const opts = {
  name: 'Challenge Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

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

/** A minimal in-memory Storage, since these tests run outside a browser. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
})

describe('challenges', () => {
  it('has a unique id and a way of being judged for every one of them', () => {
    const ids = CHALLENGES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of CHALLENGES) expect(typeof c.done).toBe('function')
  })

  it('never claims one a career has not earned', () => {
    const fresh = createCareer({ ...opts, seed: 1 })
    expect(challengesMetBy(fresh)).toEqual([])
  })

  it('keeps the ones that need an ending until there is one', () => {
    const career = played(5, 6)
    // A career still in progress cannot have retired at forty, whatever else
    // it has done.
    expect(challengesMetBy(career)).not.toContain('play-to-forty')
  })

  it('writes a challenge down once and never again', () => {
    const career = played(2, 14)
    const first = recordChallenges(career)
    const second = recordChallenges(career)
    expect(second).toEqual([])
    expect(challengesDone()).toBe(first.length)
    for (const id of first) expect(readChallenges()[id]?.by).toBe(career.player.name)
  })

  it('suggests only open, unhidden challenges', () => {
    const career = played(2, 14)
    recordChallenges(career)
    const log = readChallenges()
    for (const id of openChallenges(log, career, 3)) {
      expect(log[id]).toBeUndefined()
      expect(CHALLENGES.find((c) => c.id === id)?.secret).toBeFalsy()
    }
  })

  it('reads the facts of a career without touching it', () => {
    const career = played(8, 8)
    const before = JSON.stringify(career)
    const facts = factsOf(career)
    expect(JSON.stringify(career)).toBe(before)
    expect(facts.seasons).toBe(career.history.length)
    expect(facts.peak).toBeGreaterThan(0)
  })
})

describe('the record book', () => {
  it('is empty until something has been played', () => {
    expect(personalBests([])).toEqual([])
    expect(bestCareer([])).toBeNull()
  })

  it('names the career that holds each record', () => {
    const careers = [played(1, 8), played(2, 12)]
    const records = personalBests(careers)
    expect(records.length).toBeGreaterThan(0)
    for (const r of records) {
      expect(careers.some((c) => c.id === r.careerId)).toBe(true)
      expect(r.value).toBeGreaterThan(0)
    }
  })

  it('treats the youngest debut as the best one', () => {
    const careers = [played(1, 8), played(2, 12)]
    const debut = personalBests(careers).find((r) => r.id === 'debut-age')
    if (debut) expect(debut.lower).toBe(true)
  })

  it('has nothing to compare a first career against', () => {
    const only = played(3, 6)
    expect(paceAgainstBest(only, [only])).toBeNull()
  })

  it('compares a career against the best of the others', () => {
    const a = played(1, 14)
    const b = played(2, 6)
    const pace = paceAgainstBest(b, [a, b])
    expect(pace).not.toBeNull()
    expect(pace!.best).toBeGreaterThan(0)
    expect(pace!.ahead).toBe(pace!.now >= pace!.best)
  })
})

describe('the reason to go again', () => {
  it('always has exactly one thing to say', () => {
    const a = played(1, 12)
    const b = played(2, 12)
    for (const careers of [[a], [a, b]]) {
      const prompt = nextPrompt({ career: careers[0], careers })
      expect(prompt.id).toBeTruthy()
    }
  })

  it('points at the record when there is a better career to chase', () => {
    const great = played(1, 18)
    const poor = played(4, 3)
    const prompt = nextPrompt({ career: poor, careers: [great, poor] })
    expect(['beat-best', 'challenge', 'daily', 'first']).toContain(prompt.id)
  })
})
