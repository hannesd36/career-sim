import { NATIONS } from '../data/nations'
import { Rng } from './rng'
import type { Foot, Position } from './types'
import { POSITIONS } from './types'

/**
 * One career a day, drawn the same way for everybody.
 *
 * Everything that makes a career different — the seed, the country, the
 * position, the foot — is fixed by the date, so two people who play it get the
 * same player, the same clubs, the same decisions in the same summers and the
 * same penalty in the same final. The only variable left is what you did with
 * it, which is the only thing worth putting in a table.
 *
 * The day is taken in UTC on purpose: a leaderboard where Berlin and Buenos
 * Aires are playing different careers under the same heading is not a
 * leaderboard.
 */
const KEY = 'career-sim:daily'

export function dailyKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** A stable 32-bit seed from the date, so no two days share a career. */
export function dailySeed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface DailyBrief {
  key: string
  seed: number
  nation: string
  position: Position
  foot: Foot
}

export function dailyBrief(key: string = dailyKey()): DailyBrief {
  const seed = dailySeed(key)
  const rng = new Rng(seed)
  // Drawn from the countries that actually produce players, so the daily is
  // never a career that starts with no route into a first team.
  const nation = rng.pick(NATIONS.filter((n) => n.startLeagues.length > 0))
  return {
    key,
    seed,
    nation: nation.name,
    position: rng.pick(POSITIONS),
    foot: rng.next() < 0.24 ? 'Left' : 'Right',
  }
}

export interface DailyRecord {
  key: string
  careerId: string
  /** filled in once the career reaches its end */
  score?: number
  finished?: boolean
}

function readAll(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as DailyRecord[]) : []
  } catch {
    return []
  }
}

function writeAll(rows: DailyRecord[]) {
  try {
    // A fortnight of history is plenty: the table only ever asks about today.
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-14)))
  } catch {
    /* a full or blocked store must never stop a career being played */
  }
}

export function dailyRecordFor(key: string = dailyKey()): DailyRecord | null {
  return readAll().find((r) => r.key === key) ?? null
}

export function rememberDaily(record: DailyRecord) {
  const rows = readAll().filter((r) => r.key !== record.key)
  rows.push(record)
  writeAll(rows)
}

/** Seconds until the next draw, for the countdown under the button. */
export function untilNextDaily(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.max(0, Math.round((next - now.getTime()) / 1000))
}
