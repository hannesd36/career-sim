import { CLUBS, CLUB_BY_ID } from '../data/clubs'
import { NATION_BY_NAME } from '../data/nations'
import { cohortOf, peerOvrAt, type Peer } from './cohort'
import { totals } from './career'
import { majorCount } from './legacy'
import { Rng, clamp } from './rng'
import { isKeeper } from './sim'
import type { Career, TrophyId } from './types'

/**
 * The one out of your year group who kept turning up.
 *
 * Every career already comes with nine other sixteen-year-olds; this picks one
 * of them out and follows him. He signs for people, he wins things, he gets
 * called up, he has the season of his life the year you tear a hamstring, and
 * at the end of it there is a straight question with two names under it.
 *
 * He is not simulated. Every season of his is worked out from the same curve
 * the year group table is drawn from plus one seeded roll, evaluated on
 * demand — so his whole career costs a loop over twenty numbers, it is the
 * same career every time it is asked for, and a save written before any of
 * this existed gets a rival the moment it is opened.
 *
 * Not every career gets one. A rival in every single run is a mechanic; a
 * rival in some of them is a story.
 */
export interface RivalSeason {
  age: number
  ovr: number
  clubId: string
  /** he moved clubs this summer */
  moved: boolean
  goals: number
  trophies: TrophyId[]
  /** first time his country called */
  firstCap: boolean
}

export interface RivalCareer {
  peer: Peer
  seasons: RivalSeason[]
  ovr: number
  peak: number
  goals: number
  clubId: string
  majors: number
  ballonDors: number
  continental: number
  capped: boolean
}

/** Clubs by strength, for putting a rating in a shirt that fits it. */
const BY_STRENGTH = [...CLUBS].sort((a, b) => b.strength - a.strength)

/** Whether this career has a rival at all, and who. */
export function rivalOf(career: Career): Peer | null {
  const roll = new Rng((career.seed ^ 0x81f0a1) >>> 0)
  // Roughly three careers in five. The rest are on their own, which is what
  // makes the ones with a rival feel like they were dealt one.
  if (!roll.chance(0.6)) return null
  const peers = cohortOf(career)
  if (!peers.length) return null
  /*
   * One of the three best of the year group, not always the best of them.
   *
   * Always handing over the generational talent makes the question at the end
   * of a career rhetorical: nobody beats him, so nobody asks. Drawing from the
   * top three means the rival is always somebody worth measuring against and
   * sometimes somebody you can actually catch.
   */
  const best = [...peers].sort((a, b) => b.ceiling - a.ceiling).slice(0, 3)
  return roll.pick(best)
}

/** A club that fits a rating, drawn from a band rather than picked exactly. */
function clubForOvr(ovr: number, rng: Rng): string {
  const band = BY_STRENGTH.filter((c) => Math.abs(c.strength - ovr) <= 3)
  const pool = band.length ? band : BY_STRENGTH.slice(0, 40)
  return rng.pick(pool).id
}

/** How many goals a season at that level is worth, by position. */
const RATE: Record<string, number> = {
  ST: 0.62,
  LW: 0.4,
  RW: 0.4,
  CAM: 0.34,
  CM: 0.17,
  CDM: 0.08,
  CB: 0.09,
  LB: 0.06,
  RB: 0.06,
  GK: 0,
}

/**
 * The rival's career up to the age the player's has reached.
 *
 * Everything is drawn from a stream seeded on the career and the age, so
 * asking for the same season twice gives the same answer and asking for
 * twenty seasons costs twenty rolls.
 */
export function rivalCareer(career: Career, throughAge = career.player.age): RivalCareer | null {
  const peer = rivalOf(career)
  if (!peer) return null

  const nation = NATION_BY_NAME[peer.nation]
  const callupAt = nation ? nation.strength - 7 : 74
  const seasons: RivalSeason[] = []

  let clubId = peer.clubId
  let goals = 0
  let peak = peer.start
  let capped = false
  let ballonDors = 0
  let continental = 0
  let majors = 0

  for (let age = 17; age <= throughAge; age++) {
    const rng = new Rng((career.seed ^ 0x51de ^ Math.imul(age, 2654435761)) >>> 0)
    const ovr = peerOvrAt(peer, age)
    const club = CLUB_BY_ID[clubId]
    const strength = club?.strength ?? 60

    // He moves when he has outgrown the shirt, which is what everybody in a
    // year group does the moment somebody better calls.
    const moved = ovr > strength + 3 && rng.chance(0.55)
    if (moved) clubId = clubForOvr(ovr - rng.int(0, 2), rng)
    const now = CLUB_BY_ID[clubId]
    const level = now?.strength ?? strength

    const scored = isKeeper(peer.position)
      ? 0
      : Math.round(RATE[peer.position] * clamp((ovr - 52) / 3.2, 0.2, 12))
    goals += scored

    const trophies: TrophyId[] = []
    if (rng.chance(clamp((level - 70) / 40, 0.01, 0.35))) trophies.push('league')
    if (rng.chance(clamp((level - 72) / 60, 0.005, 0.2))) trophies.push('cup')
    if (level >= 78 && rng.chance(clamp((level - 76) / 90, 0.01, 0.14))) {
      trophies.push('continental')
      continental += 1
    }
    if (ovr >= 92 && rng.chance(0.1)) {
      trophies.push('ballondor')
      ballonDors += 1
    }
    majors += trophies.filter((t) => t !== 'ballondor').length

    const firstCap = !capped && ovr >= callupAt
    if (firstCap) capped = true

    peak = Math.max(peak, ovr)
    seasons.push({ age, ovr, clubId, moved, goals: scored, trophies, firstCap })
  }

  return {
    peer,
    seasons,
    ovr: peerOvrAt(peer, throughAge),
    peak,
    goals,
    clubId,
    majors,
    ballonDors,
    continental,
    capped,
  }
}

// ---------------------------------------------------------------------------
// what he did this year
// ---------------------------------------------------------------------------

export type RivalNewsId =
  'moved' | 'trophy' | 'continental' | 'ballondor' | 'first-cap' | 'ahead' | 'behind' | 'fading'

export interface RivalNews {
  id: RivalNewsId
  name: string
  params: Record<string, string | number>
}

/**
 * One line about him, in the season report, and only when there is something
 * worth saying. He is a story, not a ticker: a line every year would make him
 * furniture, and furniture is not a rival.
 */
export function rivalNewsFor(career: Career, season: number): RivalNews | null {
  const record = career.history.find((s) => s.season === season)
  if (!record) return null
  const run = rivalCareer(career, record.age + 1)
  if (!run) return null

  const now = run.seasons.find((s) => s.age === record.age + 1)
  if (!now) return null
  const before = run.seasons.find((s) => s.age === record.age)
  const name = run.peer.name
  const club = CLUB_BY_ID[now.clubId]?.name ?? ''

  // Strongest thing first, and only one of them.
  if (now.trophies.includes('ballondor')) return { id: 'ballondor', name, params: { name } }
  if (now.trophies.includes('continental')) {
    return { id: 'continental', name, params: { name, club } }
  }
  if (now.firstCap) return { id: 'first-cap', name, params: { name } }
  if (now.trophies.length) return { id: 'trophy', name, params: { name, club } }
  if (now.moved) return { id: 'moved', name, params: { name, club } }

  // Then the only thing that really matters: which of you is in front.
  if (before) {
    const wasAhead = before.ovr > record.ovrStart
    const isAhead = now.ovr > record.ovrEnd
    if (!wasAhead && isAhead) return { id: 'ahead', name, params: { name, ovr: now.ovr } }
    if (wasAhead && !isAhead) return { id: 'behind', name, params: { name, ovr: now.ovr } }
    if (now.ovr < before.ovr - 2) return { id: 'fading', name, params: { name, ovr: now.ovr } }
  }
  return null
}

// ---------------------------------------------------------------------------
// the two of you, at the end
// ---------------------------------------------------------------------------

export interface RivalStanding {
  name: string
  ovr: number
  goals: number
  majors: number
  ballonDors: number
  continental: number
}

export interface RivalCompare {
  you: RivalStanding
  rival: RivalStanding
  /** who had the better career of it, on the same four things */
  verdict: 'you' | 'rival' | 'level'
}

/** One number each, out of the four things anybody would argue about. */
function weigh(s: RivalStanding): number {
  return s.ovr * 6 + s.majors * 22 + s.ballonDors * 80 + s.continental * 30 + s.goals * 0.5
}

export function rivalCompare(career: Career): RivalCompare | null {
  const run = rivalCareer(career)
  if (!run) return null
  const stats = totals(career)
  const counts = new Map<TrophyId, number>()
  for (const tr of career.trophies) counts.set(tr.id, (counts.get(tr.id) ?? 0) + 1)

  const you: RivalStanding = {
    name: career.player.name,
    ovr: stats.peakOvr,
    goals: stats.goals + stats.natGoals,
    majors: majorCount(career),
    ballonDors: counts.get('ballondor') ?? 0,
    continental: counts.get('continental') ?? 0,
  }
  const rival: RivalStanding = {
    name: run.peer.name,
    ovr: run.peak,
    goals: run.goals,
    majors: run.majors,
    ballonDors: run.ballonDors,
    continental: run.continental,
  }

  const mine = weigh(you)
  const theirs = weigh(rival)
  const verdict = Math.abs(mine - theirs) < 30 ? 'level' : mine > theirs ? 'you' : 'rival'
  return { you, rival, verdict }
}
