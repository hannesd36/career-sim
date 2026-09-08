import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { clubSpells, totals } from './career'
import { Rng } from './rng'
import { isKeeper } from './sim'
import type { Career, TrophyId } from './types'

/**
 * The five things this career is for.
 *
 * A season objective is the club talking; an ambition is the player. They are
 * drawn once from the seed and never change, so from the first click there is
 * a list of named things still undone — which is the difference between a
 * career you are playing and a number you are watching go up.
 *
 * Like everything else round here they are derived, not stored: the same seed
 * always draws the same five, so an old save gets its list back without ever
 * having written one down.
 */
export type AmbitionId =
  | 'goals-50'
  | 'goals-150'
  | 'goals-300'
  | 'assists-100'
  | 'cleansheets-100'
  | 'cleansheets-200'
  | 'apps-200'
  | 'apps-500'
  | 'caps-25'
  | 'caps-75'
  | 'peak-80'
  | 'peak-88'
  | 'peak-93'
  | 'league-1'
  | 'league-3'
  | 'continental-1'
  | 'worldcup-1'
  | 'ballondor-1'
  | 'countries-3'
  | 'clubs-6'
  | 'loyal-150'

/** Roughly when in a career it comes into reach — the draw takes one of each. */
type Band = 'early' | 'mid' | 'late'

interface Ambition {
  id: AmbitionId
  band: Band
  /** false for a keeper, who is never asked for three hundred goals */
  outfieldOnly?: boolean
  keeperOnly?: boolean
  need: number
  have: (career: Career) => number
}

function trophyCount(career: Career, id: TrophyId): number {
  return career.trophies.filter((t) => t.id === id).length
}

function countriesPlayedIn(career: Career): number {
  const seen = new Set<string>()
  for (const s of career.history) {
    if (s.banned) continue
    const league = LEAGUE_BY_ID[s.leagueId]
    if (league) seen.add(league.country)
  }
  return seen.size
}

/** The longest single spell at one club, in appearances. */
function longestSpellApps(career: Career): number {
  return clubSpells(career).reduce((best, spell) => Math.max(best, spell.apps), 0)
}

const POOL: Ambition[] = [
  { id: 'goals-50', band: 'early', outfieldOnly: true, need: 50, have: (c) => totals(c).goals },
  { id: 'goals-150', band: 'mid', outfieldOnly: true, need: 150, have: (c) => totals(c).goals },
  { id: 'goals-300', band: 'late', outfieldOnly: true, need: 300, have: (c) => totals(c).goals },
  { id: 'assists-100', band: 'mid', outfieldOnly: true, need: 100, have: (c) => totals(c).assists },
  {
    id: 'cleansheets-100',
    band: 'mid',
    keeperOnly: true,
    need: 100,
    have: (c) => totals(c).cleanSheets,
  },
  {
    id: 'cleansheets-200',
    band: 'late',
    keeperOnly: true,
    need: 200,
    have: (c) => totals(c).cleanSheets,
  },
  { id: 'apps-200', band: 'early', need: 200, have: (c) => totals(c).apps },
  { id: 'apps-500', band: 'late', need: 500, have: (c) => totals(c).apps },
  { id: 'caps-25', band: 'mid', need: 25, have: (c) => totals(c).natApps },
  { id: 'caps-75', band: 'late', need: 75, have: (c) => totals(c).natApps },
  { id: 'peak-80', band: 'early', need: 80, have: (c) => totals(c).peakOvr },
  { id: 'peak-88', band: 'mid', need: 88, have: (c) => totals(c).peakOvr },
  { id: 'peak-93', band: 'late', need: 93, have: (c) => totals(c).peakOvr },
  { id: 'league-1', band: 'early', need: 1, have: (c) => trophyCount(c, 'league') },
  { id: 'league-3', band: 'mid', need: 3, have: (c) => trophyCount(c, 'league') },
  { id: 'continental-1', band: 'late', need: 1, have: (c) => trophyCount(c, 'continental') },
  { id: 'worldcup-1', band: 'late', need: 1, have: (c) => trophyCount(c, 'worldcup') },
  { id: 'ballondor-1', band: 'late', need: 1, have: (c) => trophyCount(c, 'ballondor') },
  { id: 'countries-3', band: 'mid', need: 3, have: countriesPlayedIn },
  { id: 'clubs-6', band: 'mid', need: 6, have: (c) => totals(c).clubs },
  { id: 'loyal-150', band: 'mid', need: 150, have: longestSpellApps },
]

const BY_ID = new Map<AmbitionId, Ambition>(POOL.map((a) => [a.id, a]))

export interface AmbitionProgress {
  id: AmbitionId
  have: number
  need: number
  done: boolean
  /** 0..1 */
  fraction: number
}

/**
 * The five drawn for this career: two reachable early, two in the middle of a
 * career, one that most careers will not manage. A list you finish by twenty‑two
 * stops being a reason to keep playing, and one you cannot start is just a wall.
 */
export function ambitionsOf(career: Career): AmbitionId[] {
  const keeper = isKeeper(career.player.position)
  const eligible = POOL.filter((a) => (keeper ? !a.outfieldOnly : !a.keeperOnly))
  const rng = new Rng((career.seed ^ 0xa11b1) >>> 0)
  const drawFrom = (band: Band, count: number, taken: Set<AmbitionId>): AmbitionId[] => {
    const bag = rng.shuffle(eligible.filter((a) => a.band === band && !taken.has(a.id)))
    const out = bag.slice(0, count).map((a) => a.id)
    for (const id of out) taken.add(id)
    return out
  }
  const taken = new Set<AmbitionId>()
  const picked = [
    ...drawFrom('early', 2, taken),
    ...drawFrom('mid', 2, taken),
    ...drawFrom('late', 1, taken),
  ]
  // A keeper's pool is thinner; top the list back up to five from anywhere.
  if (picked.length < 5) {
    const rest = rng.shuffle(eligible.filter((a) => !taken.has(a.id)))
    picked.push(...rest.slice(0, 5 - picked.length).map((a) => a.id))
  }
  return picked
}

export function ambitionProgress(career: Career, id: AmbitionId): AmbitionProgress {
  const ambition = BY_ID.get(id)
  if (!ambition) return { id, have: 0, need: 1, done: false, fraction: 0 }
  const have = ambition.have(career)
  return {
    id,
    have,
    need: ambition.need,
    done: have >= ambition.need,
    fraction: Math.max(0, Math.min(1, have / ambition.need)),
  }
}

/** The whole list, in draw order, with the finished ones sunk to the bottom. */
export function ambitionBoard(career: Career): AmbitionProgress[] {
  const rows = ambitionsOf(career).map((id) => ambitionProgress(career, id))
  return rows.sort((a, b) => Number(a.done) - Number(b.done) || b.fraction - a.fraction)
}

/**
 * The one to put in front of the play button: the nearest unfinished ambition,
 * measured by how close it is rather than by where it sits in the list.
 */
export function nextAmbition(career: Career): AmbitionProgress | null {
  const open = ambitionBoard(career).filter((a) => !a.done)
  if (!open.length) return null
  return open.reduce((best, a) => (a.fraction > best.fraction ? a : best))
}

/** Which of the five are done — used to decide whether one just landed. */
export function completedAmbitions(career: Career): AmbitionId[] {
  return ambitionBoard(career)
    .filter((a) => a.done)
    .map((a) => a.id)
}

/** Nations, for the "played in N countries" line to name where you have been. */
export function countriesOf(career: Career): string[] {
  const seen: string[] = []
  for (const s of career.history) {
    if (s.banned) continue
    const club = CLUB_BY_ID[s.clubId]
    const country = club ? LEAGUE_BY_ID[club.leagueId]?.country : undefined
    if (country && !seen.includes(country)) seen.push(country)
  }
  return seen
}
