import { beforeEach, describe, expect, it } from 'vitest'
import { createCareer } from '../career'
import {
  dailyBrief,
  dailyKey,
  dailyRecordFor,
  dailySeed,
  rememberDaily,
  untilNextDaily,
} from '../daily'
import { playedToday, readStreak, streakStrip, touchStreak } from '../streak'

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

describe('the daily challenge', () => {
  it('names the day in UTC, so everybody is playing the same one', () => {
    expect(dailyKey(new Date('2026-09-06T23:30:00Z'))).toBe('2026-09-06')
    expect(dailyKey(new Date('2026-09-07T00:30:00Z'))).toBe('2026-09-07')
  })

  it('draws the same brief for the same day and a different one for the next', () => {
    expect(dailyBrief('2026-09-06')).toEqual(dailyBrief('2026-09-06'))
    expect(dailySeed('2026-09-06')).not.toBe(dailySeed('2026-09-07'))
  })

  it('draws a playable brief every day for a year', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 365; i++) {
      const day = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
      const brief = dailyBrief(day)
      expect(brief.nation).toBeTruthy()
      expect(brief.position).toBeTruthy()
      expect(['Left', 'Right']).toContain(brief.foot)
      seen.add(`${brief.nation}-${brief.position}`)
    }
    // a year of the same player would be a bug, not a challenge
    expect(seen.size).toBeGreaterThan(50)
  })

  it('builds the same career from the same day, for two different people', () => {
    const brief = dailyBrief('2026-09-06')
    const a = createCareer({ ...brief, name: 'Anna', foot: brief.foot })
    const b = createCareer({ ...brief, name: 'Ben', foot: brief.foot })
    expect(a.player.clubId).toBe(b.player.clubId)
    expect(a.player.ovr).toBe(b.player.ovr)
    expect(a.player.hiddenPotential).toBe(b.player.hiddenPotential)
  })

  it('remembers the run for today and forgets old ones', () => {
    rememberDaily({ key: '2026-09-06', careerId: 'abc' })
    expect(dailyRecordFor('2026-09-06')?.careerId).toBe('abc')
    expect(dailyRecordFor('2026-09-05')).toBeNull()

    rememberDaily({ key: '2026-09-06', careerId: 'abc', score: 900, finished: true })
    expect(dailyRecordFor('2026-09-06')?.score).toBe(900)
  })

  it('counts down to the next draw', () => {
    const seconds = untilNextDaily(new Date('2026-09-06T23:00:00Z'))
    expect(seconds).toBe(3600)
  })
})

describe('the play streak', () => {
  it('starts at nothing', () => {
    expect(readStreak().current).toBe(0)
    expect(playedToday()).toBe(false)
  })

  it('counts consecutive days and ignores a second visit the same day', () => {
    expect(touchStreak(new Date('2026-09-01T10:00:00Z')).current).toBe(1)
    expect(touchStreak(new Date('2026-09-01T22:00:00Z')).current).toBe(1)
    expect(touchStreak(new Date('2026-09-02T09:00:00Z')).current).toBe(2)
    expect(touchStreak(new Date('2026-09-03T09:00:00Z')).current).toBe(3)
  })

  it('starts over after a missed day but keeps the best', () => {
    touchStreak(new Date('2026-09-01T10:00:00Z'))
    touchStreak(new Date('2026-09-02T10:00:00Z'))
    touchStreak(new Date('2026-09-03T10:00:00Z'))
    const broken = touchStreak(new Date('2026-09-06T10:00:00Z'))
    expect(broken.current).toBe(1)
    expect(broken.best).toBe(3)
  })

  it('shows the last fortnight as played and unplayed days', () => {
    touchStreak(new Date('2026-09-05T10:00:00Z'))
    touchStreak(new Date('2026-09-06T10:00:00Z'))
    const strip = streakStrip(14, new Date('2026-09-06T12:00:00Z'))
    expect(strip).toHaveLength(14)
    expect(strip[strip.length - 1]).toEqual({ day: '2026-09-06', played: true })
    expect(strip[strip.length - 2]).toEqual({ day: '2026-09-05', played: true })
    expect(strip[0].played).toBe(false)
  })

  it('survives a storage that refuses to write', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      },
      configurable: true,
      writable: true,
    })
    expect(() => touchStreak()).not.toThrow()
    expect(readStreak().current).toBe(0)
  })
})
