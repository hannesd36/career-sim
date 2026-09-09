import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { totals } from './career'
import { countriesPlayedIn, isTopFive, majorCount } from './legacy'
import { rarityOf } from './rarity'
import type { Career, TrophyId } from './types'

/**
 * Named things to go and do, which outlive the career that does them.
 *
 * An ambition belongs to one career and is drawn from its seed; a challenge
 * belongs to the player and stays done forever. That is the whole difference,
 * and it is the difference between "what is this career for" and "what am I
 * doing with this game" — which is the question a second career needs an
 * answer to.
 *
 * Some of them are secret. Not to be coy: a list of thirty visible objectives
 * is a chore list, and half of these are things you should find out you did
 * rather than things you set out to do. A secret one shows its name the moment
 * it is earned and never goes back.
 *
 * As everywhere else, the *judging* is derived from the career and nothing
 * else. The only thing written down is which ones have ever been done, so a
 * deleted save cannot take a challenge away and a rule change re-judges every
 * career the next time one is finished.
 */
export type ChallengeId =
  // --- the rating ---
  | 'peak-80'
  | 'peak-90'
  | 'peak-99'
  // --- silverware ---
  | 'win-continental'
  | 'win-ballondor'
  | 'win-worldcup'
  | 'title-outside-top-five'
  | 'titles-three-clubs'
  // --- the shape of a career ---
  | 'three-countries'
  | 'capped'
  | 'captain'
  | 'play-to-forty'
  | 'apps-500'
  | 'goals-300'
  | 'rags-to-riches'
  | 'no-top-five'
  | 'finish-platinum'
  // --- the ones you find out about ---
  | 'journeyman'
  | 'one-club'
  | 'one-country'
  | 'late-bloomer'
  | 'wonderkid'
  | 'globetrotter'
  | 'legend'

export interface Challenge {
  id: ChallengeId
  /** hidden until it is earned */
  secret?: boolean
  /** a career still being played can only satisfy some of these */
  needsEnd?: boolean
  done: (c: Career, f: CareerFacts) => boolean
}

/**
 * Everything the judging needs, worked out once per career rather than
 * twenty-four times. None of it is stored.
 */
export interface CareerFacts {
  peak: number
  apps: number
  goals: number
  caps: number
  clubs: number
  countries: number
  seasons: number
  majors: number
  trophyClubs: number
  counts: Map<TrophyId, number>
  /** the tier of the division the first season was played in */
  startTier: number
  /** the rating the career actually started at */
  startOvr: number
  /** age at the season the best rating was reached */
  peakAge: number
  retiredAge: number
  /** ever played a season in a top-five first division */
  topFive: boolean
  /** the rating at the moment the boots went on the hook */
  finalOvr: number
  /** the armband, club or country */
  captain: boolean
  /** best rating held at twenty-one or younger */
  ovrAt21: number
}

export function factsOf(career: Career): CareerFacts {
  const stats = totals(career)
  const counts = new Map<TrophyId, number>()
  for (const tr of career.trophies) counts.set(tr.id, (counts.get(tr.id) ?? 0) + 1)

  const played = career.history.filter((s) => !s.banned)
  const first = played[0] ?? null
  const peak = stats.peakOvr
  const peakSeason = played.find((s) => s.ovrEnd === peak) ?? null

  // Clubs a trophy was actually won with, by name, because that is what a
  // trophy records. Individual awards are not won with anybody.
  const trophyClubs = new Set<string>()
  for (const tr of career.trophies) {
    if (tr.wonWith && tr.id !== 'ballondor' && tr.id !== 'worldcup') trophyClubs.add(tr.wonWith)
  }

  const captain = career.eventLog.some(
    (e) =>
      (e.id === 'captaincy' && e.choice === 'take-armband') ||
      (e.id === 'country-armband' && e.choice === 'lead-them'),
  )

  let ovrAt21 = 0
  for (const s of played) if (s.age <= 21) ovrAt21 = Math.max(ovrAt21, s.ovrEnd)

  return {
    peak,
    apps: stats.apps + stats.natApps,
    goals: stats.goals + stats.natGoals,
    caps: stats.natApps,
    clubs: stats.clubs,
    countries: countriesPlayedIn(career).length,
    seasons: career.history.length,
    majors: majorCount(career),
    trophyClubs: trophyClubs.size,
    counts,
    startTier: first ? (LEAGUE_BY_ID[first.leagueId]?.tier ?? 1) : 1,
    startOvr: first ? first.ovrStart : career.player.ovr,
    peakAge: peakSeason ? peakSeason.age : career.player.age,
    retiredAge: career.player.age,
    topFive: played.some((s) => isTopFive(s.leagueId)),
    finalOvr: career.player.ovr,
    captain,
    ovrAt21,
  }
}

/** A club trophy won somewhere the cameras do not normally go. */
function wonOutsideTheTopFive(career: Career): boolean {
  return career.trophies.some((tr) => {
    if (tr.id !== 'league' && tr.id !== 'cup' && tr.id !== 'continental') return false
    return !!tr.leagueId && !isTopFive(tr.leagueId)
  })
}

/** Whether every season of a finished career was played at the same club. */
function oneClub(career: Career): boolean {
  const clubs = new Set(career.history.filter((s) => !s.banned).map((s) => s.clubId))
  return clubs.size === 1 && career.history.length >= 6
}

export const CHALLENGES: Challenge[] = [
  { id: 'peak-80', done: (_, f) => f.peak >= 80 },
  { id: 'capped', done: (_, f) => f.caps >= 1 },
  { id: 'win-continental', done: (_, f) => (f.counts.get('continental') ?? 0) >= 1 },
  { id: 'peak-90', done: (_, f) => f.peak >= 90 },
  { id: 'three-countries', done: (_, f) => f.countries >= 3 },
  { id: 'captain', done: (_, f) => f.captain },
  { id: 'apps-500', done: (_, f) => f.apps >= 500 },
  { id: 'goals-300', done: (_, f) => f.goals >= 300 },
  { id: 'win-ballondor', done: (_, f) => (f.counts.get('ballondor') ?? 0) >= 1 },
  { id: 'win-worldcup', done: (_, f) => (f.counts.get('worldcup') ?? 0) >= 1 },
  { id: 'titles-three-clubs', done: (_, f) => f.trophyClubs >= 3 },
  { id: 'title-outside-top-five', done: (c) => wonOutsideTheTopFive(c) },
  { id: 'rags-to-riches', done: (_, f) => f.startTier >= 3 && f.peak >= 88 },
  { id: 'peak-99', done: (_, f) => f.peak >= 99 },
  { id: 'play-to-forty', needsEnd: true, done: (_, f) => f.retiredAge >= 40 },
  {
    id: 'no-top-five',
    needsEnd: true,
    done: (_, f) => !f.topFive && f.seasons >= 10 && f.peak >= 75,
  },
  {
    id: 'finish-platinum',
    needsEnd: true,
    done: (_, f) => rarityOf(f.finalOvr) === 'platinum' || rarityOf(f.finalOvr) === 'ultimate',
  },

  // --- the ones you find out about ---------------------------------------
  { id: 'wonderkid', secret: true, done: (_, f) => f.ovrAt21 >= 80 },
  { id: 'legend', secret: true, done: (_, f) => f.peak >= 99 },
  { id: 'journeyman', secret: true, done: (_, f) => f.clubs >= 10 },
  { id: 'globetrotter', secret: true, done: (_, f) => f.countries >= 5 },
  {
    id: 'late-bloomer',
    secret: true,
    needsEnd: true,
    done: (_, f) => f.peakAge >= 28 && f.peak >= 82,
  },
  { id: 'one-club', secret: true, needsEnd: true, done: (c) => oneClub(c) },
  {
    id: 'one-country',
    secret: true,
    needsEnd: true,
    done: (_, f) => f.countries === 1 && f.seasons >= 12,
  },
]

export const CHALLENGE_BY_ID = new Map<ChallengeId, Challenge>(CHALLENGES.map((c) => [c.id, c]))

/** Which of them this career satisfies as it currently stands. */
export function challengesMetBy(career: Career): ChallengeId[] {
  const facts = factsOf(career)
  const over = career.phase === 'retired' || career.player.retired
  return CHALLENGES.filter((ch) => (over || !ch.needsEnd) && ch.done(career, facts)).map(
    (ch) => ch.id,
  )
}

// ---------------------------------------------------------------------------
// what this browser has ever done
// ---------------------------------------------------------------------------

const KEY = 'career-sim:challenges'

export interface ChallengeRecord {
  /** when it was first done */
  at: number
  /** the player it was done by, so the list reads as a set of stories */
  by: string
  /** the club he was at when it landed */
  club?: string
}

export type ChallengeLog = Partial<Record<ChallengeId, ChallengeRecord>>

export function readChallenges(): ChallengeLog {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as ChallengeLog) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeChallenges(log: ChallengeLog) {
  try {
    localStorage.setItem(KEY, JSON.stringify(log))
  } catch {
    /* a full store must never stop a career being played */
  }
}

/**
 * Records everything this career has just earned and hands back the ones that
 * were not there before, so a screen can say so once and then forget about it.
 * Calling it twice does nothing the second time.
 */
export function recordChallenges(career: Career): ChallengeId[] {
  const log = readChallenges()
  const club = CLUB_BY_ID[career.player.clubId]?.name
  const fresh: ChallengeId[] = []
  for (const id of challengesMetBy(career)) {
    if (log[id]) continue
    log[id] = { at: Date.now(), by: career.player.name, club }
    fresh.push(id)
  }
  if (fresh.length) writeChallenges(log)
  return fresh
}

export const isChallengeDone = (id: ChallengeId, log: ChallengeLog = readChallenges()) => !!log[id]

export function challengesDone(log: ChallengeLog = readChallenges()): number {
  return CHALLENGES.filter((c) => log[c.id]).length
}

/**
 * The next few worth putting in front of somebody.
 *
 * Open, not secret, in the order they are listed — which is roughly the order
 * a player would meet them. A career in progress moves whatever it is closest
 * to up the list, so the home screen suggests the thing this run could
 * actually finish rather than the same three every time.
 */
export function openChallenges(
  log: ChallengeLog = readChallenges(),
  career: Career | null = null,
  count = 3,
): ChallengeId[] {
  const open = CHALLENGES.filter((c) => !c.secret && !log[c.id])
  if (!career) return open.slice(0, count).map((c) => c.id)

  const facts = factsOf(career)
  const near = open.filter((c) => !c.needsEnd && closeness(c, career, facts) > 0.5)
  const rest = open.filter((c) => !near.includes(c))
  return [...near, ...rest].slice(0, count).map((c) => c.id)
}

/** How close a career is to a challenge, roughly, for ordering only. */
function closeness(challenge: Challenge, career: Career, facts: CareerFacts): number {
  switch (challenge.id) {
    case 'peak-80':
      return facts.peak / 80
    case 'peak-90':
      return facts.peak / 90
    case 'peak-99':
      return facts.peak / 99
    case 'apps-500':
      return facts.apps / 500
    case 'goals-300':
      return facts.goals / 300
    case 'three-countries':
      return facts.countries / 3
    case 'titles-three-clubs':
      return facts.trophyClubs / 3
    default:
      return challenge.done(career, facts) ? 1 : 0
  }
}
