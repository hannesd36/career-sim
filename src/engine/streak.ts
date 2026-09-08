/**
 * How many days in a row this browser has played.
 *
 * Kept deliberately toothless: it counts, and that is all it does. Nothing is
 * locked behind it, nothing is lost by breaking it, and it never asks to be
 * kept alive. A counter you can walk away from for a fortnight without being
 * punished is a counter, which is what was wanted; one that takes something
 * away is a job.
 */
const KEY = 'career-sim:streak'

export interface Streak {
  /** last day played, as YYYY-MM-DD */
  last: string
  current: number
  best: number
  /** days on which anything at all was played, newest last, capped */
  days: string[]
}

const EMPTY: Streak = { last: '', current: 0, best: 0, days: [] }

const dayKey = (d: Date = new Date()) => d.toISOString().slice(0, 10)

function daysBetween(a: string, b: string): number {
  const from = Date.parse(`${a}T00:00:00Z`)
  const to = Date.parse(`${b}T00:00:00Z`)
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY
  return Math.round((to - from) / 86_400_000)
}

export function readStreak(): Streak {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<Streak>
    return {
      last: typeof parsed.last === 'string' ? parsed.last : '',
      current: Number(parsed.current) || 0,
      best: Number(parsed.best) || 0,
      days: Array.isArray(parsed.days) ? parsed.days.filter((d) => typeof d === 'string') : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

/**
 * Records that something was played today and returns the streak as it now
 * stands. Calling it twice in a day is a no-op, so every screen can call it
 * without coordinating with any other screen.
 */
export function touchStreak(now: Date = new Date()): Streak {
  const today = dayKey(now)
  const streak = readStreak()
  if (streak.last === today) return streak

  const gap = streak.last ? daysBetween(streak.last, today) : Number.POSITIVE_INFINITY
  const current = gap === 1 ? streak.current + 1 : 1
  const next: Streak = {
    last: today,
    current,
    best: Math.max(streak.best, current),
    // eight weeks of dots is as much history as a strip can usefully show
    days: [...streak.days.filter((d) => d !== today), today].slice(-56),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage being unavailable must never break a click */
  }
  return next
}

/** True once today has already been counted — used to avoid a pointless write. */
export const playedToday = (now: Date = new Date()) => readStreak().last === dayKey(now)

/**
 * The last `n` days as a strip, newest last, saying which were played. Built
 * from the calendar rather than from the stored list so gaps show up as gaps.
 */
export function streakStrip(n = 14, now: Date = new Date()): { day: string; played: boolean }[] {
  const played = new Set(readStreak().days)
  const out: { day: string; played: boolean }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const day = dayKey(d)
    out.push({ day, played: played.has(day) })
  }
  return out
}
