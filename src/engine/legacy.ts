import { LEAGUE_BY_ID } from '../data/leagues'
import { CLUB_BY_ID } from '../data/clubs'
import { clubSpells, totals } from './career'
import { isKeeper } from './sim'
import { MAJOR_TROPHIES, type Career, type TrophyId } from './types'

/**
 * One number for a whole career, and the six things that make it up.
 *
 * The point of it is comparison, nothing else: two careers played by the same
 * person, or the same daily played by two people, need a single figure that
 * can be put in an order. A rating alone cannot do that — a ninety who won
 * nothing and a eighty-six with four European Cups are not the same career —
 * so the score is built out of the six things anybody would actually argue
 * about in a pub, and it says which of them it counted.
 *
 * Like everything else round here it is derived, never stored. An old save
 * scores itself the moment it is opened, and a rule change re-scores every
 * career in the hall of fame at once rather than leaving stale numbers behind.
 */
export type LegacyPartId = 'peak' | 'honours' | 'individual' | 'output' | 'country' | 'level'

export interface LegacyPart {
  id: LegacyPartId
  points: number
}

export type LegacyTier = 'brief' | 'journeyman' | 'solid' | 'great' | 'elite' | 'immortal'

export interface Legacy {
  total: number
  parts: LegacyPart[]
  tier: LegacyTier
}

/** What each trophy is worth. A European Cup is not a domestic cup. */
const TROPHY_POINTS: Record<TrophyId, number> = {
  worldcup: 60,
  continental: 45,
  continentalnation: 38,
  league: 24,
  cup: 12,
  ballondor: 85,
  goldenboot: 18,
  playmaker: 15,
  goldenglove: 15,
  goldenboy: 12,
  tots: 10,
}

const INDIVIDUAL: TrophyId[] = [
  'ballondor',
  'goldenboot',
  'playmaker',
  'goldenglove',
  'goldenboy',
  'tots',
]

/** Seasons weighted by the squad they were played in, as an average strength. */
export function averageClubStrength(career: Career): number {
  let weighted = 0
  let seasons = 0
  for (const s of career.history) {
    if (s.banned) continue
    const club = CLUB_BY_ID[s.clubId]
    if (!club) continue
    weighted += club.strength
    seasons += 1
  }
  return seasons ? weighted / seasons : 0
}

export function trophyCounts(career: Career): Map<TrophyId, number> {
  const counts = new Map<TrophyId, number>()
  for (const tr of career.trophies) counts.set(tr.id, (counts.get(tr.id) ?? 0) + 1)
  return counts
}

/** Honours weighty enough to be called honours. */
export function majorCount(career: Career): number {
  const counts = trophyCounts(career)
  return MAJOR_TROPHIES.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0)
}

export function legacyOf(career: Career): Legacy {
  const stats = totals(career)
  const counts = trophyCounts(career)
  const keeper = isKeeper(career.player.position)

  // Where the rating got to, which is still the biggest single thing about a
  // career, but no longer the only thing.
  const peak = Math.max(0, (stats.peakOvr - 50) * 8)

  let honours = 0
  let individual = 0
  for (const [id, n] of counts) {
    const points = (TROPHY_POINTS[id] ?? 10) * n
    if (INDIVIDUAL.includes(id)) individual += points
    else honours += points
  }

  // What you actually did on a pitch. Appearances are the floor under every
  // career: they are the one thing that never stops accumulating.
  const scoring = keeper ? stats.cleanSheets * 1.1 : (stats.goals + stats.natGoals) * 0.5
  const output = scoring + stats.assists * 0.3 + stats.apps * 0.15 + career.history.length * 4

  // The shirt with the badge on it, which a club career cannot buy.
  const country = stats.natApps * 0.8 + stats.natGoals * 1

  // Who you did it against. A hundred goals in the fifth tier is not a hundred
  // goals in the Bundesliga, and this is the only place the game says so.
  const level = Math.max(0, (averageClubStrength(career) - 60) * 5)

  const parts: LegacyPart[] = [
    { id: 'peak', points: Math.round(peak) },
    { id: 'honours', points: Math.round(honours) },
    { id: 'individual', points: Math.round(individual) },
    { id: 'output', points: Math.round(output) },
    { id: 'country', points: Math.round(country) },
    { id: 'level', points: Math.round(level) },
  ]
  const total = parts.reduce((sum, p) => sum + p.points, 0)

  return { total, parts, tier: legacyTier(total) }
}

export function legacyTier(total: number): LegacyTier {
  if (total >= 950) return 'immortal'
  if (total >= 700) return 'elite'
  if (total >= 480) return 'great'
  if (total >= 280) return 'solid'
  if (total >= 120) return 'journeyman'
  return 'brief'
}

/** The score on its own, for the boards and for putting careers in an order. */
export function careerScore(career: Career): number {
  return legacyOf(career).total
}

/**
 * The clubs a career was actually about, best first: the spells long enough or
 * decorated enough to be worth naming on a card.
 */
export function definingClubs(career: Career, limit = 3): string[] {
  return clubSpells(career)
    .slice()
    .sort((a, b) => b.trophies * 40 + b.apps - (a.trophies * 40 + a.apps))
    .slice(0, limit)
    .map((s) => s.club.name)
}

/** Did the career ever play a season in one of the five strongest countries? */
export function playedTopFive(career: Career): boolean {
  return career.history.some((s) => !s.banned && isTopFive(s.leagueId))
}

/** The five countries the game treats as the top of the pyramid. */
const TOP_FIVE = ['England', 'Spain', 'Germany', 'Italy', 'France']

export function isTopFive(leagueId: string): boolean {
  const league = LEAGUE_BY_ID[leagueId]
  return !!league && league.tier === 1 && TOP_FIVE.includes(league.country)
}

/** Countries a career put a shirt on in, in the order it wore them. */
export function countriesPlayedIn(career: Career): string[] {
  const seen: string[] = []
  for (const s of career.history) {
    if (s.banned) continue
    const country = LEAGUE_BY_ID[s.leagueId]?.country
    if (country && !seen.includes(country)) seen.push(country)
  }
  return seen
}
