import { clubSpells, totals } from './career'
import { averageClubStrength, careerScore, isTopFive, majorCount, trophyCounts } from './legacy'
import type { Career } from './types'

/**
 * The best this browser has ever managed, one line per thing.
 *
 * Not a level, not a bar, not experience points. A hall of fame keeps records
 * the way a club does: the most goals anybody scored, the youngest debut, the
 * longest career, and whose it was. Every one of them names the career that
 * holds it, because a record with nobody's name on it is a statistic.
 *
 * Computed live from the saves, exactly like the cabinet, so nothing here can
 * ever claim a career that has been deleted.
 */
export type RecordId =
  | 'peak'
  | 'goals'
  | 'apps'
  | 'trophies'
  | 'clubs'
  | 'seasons'
  | 'debut-age'
  | 'value'
  | 'continental'
  | 'league'
  | 'ballondor'
  | 'score'
  | 'rise'
  | 'fall'
  | 'no-top-five'
  | 'small-club'
  | 'decisions'

export interface PersonalRecord {
  id: RecordId
  value: number
  /** the career that holds it */
  by: string
  careerId: string
  /** true when a lower number is the better one */
  lower?: boolean
}

interface Candidate {
  id: RecordId
  value: number
  lower?: boolean
}

/** Everything one career is worth to the record book. */
function candidatesOf(career: Career): Candidate[] {
  const stats = totals(career)
  const counts = trophyCounts(career)
  const played = career.history.filter((s) => !s.banned)

  let rise = 0
  let fall = 0
  for (const s of played) {
    const delta = s.ovrEnd - s.ovrStart
    rise = Math.max(rise, delta)
    fall = Math.min(fall, delta)
  }

  const debut = played.find((s) => s.apps > 0)
  // What the market ever said, not what it says now: a thirty-eight year old
  // is worth a fraction of what he was worth at twenty-seven, and the record
  // is about the career rather than about the last day of it.
  const peakValue = played.reduce((best, s) => Math.max(best, s.value ?? 0), career.player.value)
  const strength = averageClubStrength(career)
  const everTopFive = played.some((s) => isTopFive(s.leagueId))
  const score = careerScore(career)

  const out: Candidate[] = [
    { id: 'peak', value: stats.peakOvr },
    { id: 'goals', value: stats.goals + stats.natGoals },
    { id: 'apps', value: stats.apps + stats.natApps },
    { id: 'trophies', value: majorCount(career) },
    { id: 'clubs', value: stats.clubs },
    { id: 'seasons', value: career.history.length },
    { id: 'value', value: peakValue },
    { id: 'continental', value: counts.get('continental') ?? 0 },
    { id: 'league', value: counts.get('league') ?? 0 },
    { id: 'ballondor', value: counts.get('ballondor') ?? 0 },
    { id: 'score', value: score },
    { id: 'rise', value: rise },
    { id: 'fall', value: Math.abs(fall) },
    { id: 'decisions', value: career.eventLog.length },
  ]
  if (debut) out.push({ id: 'debut-age', value: debut.age, lower: true })
  // The two "best career under a handicap" records: they are the same number
  // as the score, offered only by the careers that qualify for them.
  if (!everTopFive && played.length >= 5) out.push({ id: 'no-top-five', value: score })
  if (strength > 0 && strength < 70 && played.length >= 5) {
    out.push({ id: 'small-club', value: score })
  }
  return out
}

/**
 * The record book, in a fixed order, holders included. Records nobody has ever
 * set are simply absent: an empty row saying zero is worse than no row.
 */
export function personalBests(careers: Career[]): PersonalRecord[] {
  const best = new Map<RecordId, PersonalRecord>()
  for (const career of careers) {
    if (!career.history.length) continue
    for (const candidate of candidatesOf(career)) {
      if (candidate.value <= 0) continue
      const held = best.get(candidate.id)
      const better = !held
        ? true
        : candidate.lower
          ? candidate.value < held.value
          : candidate.value > held.value
      if (better) {
        best.set(candidate.id, {
          id: candidate.id,
          value: candidate.value,
          by: career.player.name,
          careerId: career.id,
          lower: candidate.lower,
        })
      }
    }
  }
  return ORDER.filter((id) => best.has(id)).map((id) => best.get(id)!)
}

const ORDER: RecordId[] = [
  'score',
  'peak',
  'goals',
  'apps',
  'trophies',
  'continental',
  'league',
  'ballondor',
  'seasons',
  'clubs',
  'debut-age',
  'value',
  'rise',
  'fall',
  'no-top-five',
  'small-club',
  'decisions',
]

/** The single best career this browser has, finished or not. */
export function bestCareer(careers: Career[]): Career | null {
  if (!careers.length) return null
  return careers.reduce((top, c) => (careerScore(c) > careerScore(top) ? c : top))
}

/**
 * Where a career in progress stands against the best one there has ever been.
 *
 * Deliberately only two numbers and a difference: it is a nudge in the corner
 * of a screen, not a scoreboard. `null` when there is nothing to compare
 * against, which is the whole of a first career.
 */
export interface Pace {
  best: number
  now: number
  /** the career holding the record */
  by: string
  /** ahead of the record it is chasing */
  ahead: boolean
}

export function paceAgainstBest(career: Career, careers: Career[]): Pace | null {
  const others = careers.filter((c) => c.id !== career.id && c.history.length >= 3)
  if (!others.length) return null
  const record = others.reduce((top, c) => (totals(c).peakOvr > totals(top).peakOvr ? c : top))
  const best = totals(record).peakOvr
  const now = Math.max(career.player.ovr, totals(career).peakOvr)
  if (best <= 0) return null
  return { best, now, by: record.player.name, ahead: now >= best }
}

/** The clubs a career is remembered for, for the hall of fame's summary line. */
export function definingSpells(career: Career, limit = 3) {
  return clubSpells(career).slice(0, limit)
}
