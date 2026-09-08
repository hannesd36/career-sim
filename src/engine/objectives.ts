import { CLUB_BY_ID, clubsInLeague } from '../data/clubs'
import { LEAGUE_BY_ID, type League } from '../data/leagues'
import { NATION_BY_NAME } from '../data/nations'
import { Rng, clamp } from './rng'
import {
  PROFILE,
  creativityMultiplier,
  isContinentalYear,
  isDefender,
  isKeeper,
  isWorldCupYear,
  leagueGamesOf,
  projectRole,
  qualityMultiplier,
  roleShare,
} from './sim'
import type { Career, Club, Position, SeasonRecord } from './types'

/**
 * What the club wants out of you this season.
 *
 * A career only ever measured against its own past has no opponent in it. The
 * objective is the club's half of the deal: somebody else decides what good
 * looks like, before the season rather than after it, and the summer window is
 * where they say what they thought of the answer.
 *
 * Nothing about it is stored. It is rebuilt from the seed, the season and the
 * club, so the demand a season was judged against can still be asked for years
 * later — a career loaded from a file shows every season under the same
 * objective it was actually played under.
 */
export type ObjectiveKind =
  | 'finish'
  | 'survive'
  | 'goals'
  | 'assists'
  | 'apps'
  | 'cleansheets'
  | 'rating'
  | 'silverware'

export interface SeasonObjective {
  kind: ObjectiveKind
  /** league position to finish at or above, or the count to reach */
  target: number
}

/** Everything the demand is derived from, available before or after the fact. */
export interface ObjectiveInput {
  seed: number
  season: number
  clubId: string
  /** rating going into the season */
  ovr: number
  age: number
  position: Position
  /** the shirt he plays international football in, if he is picked */
  nation: string
}

function streamFor(input: ObjectiveInput): Rng {
  let h = 2166136261
  for (let i = 0; i < input.clubId.length; i++) {
    h ^= input.clubId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // A stream of its own, so asking for an objective never disturbs the
  // season's own rolls — the same season plays out identically either way.
  return new Rng((input.seed ^ (input.season * 40503) ^ h ^ 0x5eed1e) >>> 0)
}

/**
 * Where this squad belongs in its division on paper, 1 = title favourite.
 *
 * Club strength is derived from the division and the tier, so every club of a
 * tier is the same number and a whole band of them ties. The honest expectation
 * for one of eight identical sides is the middle of that band — reading it as
 * the top of the band would quietly ask every mid-table club to win its group
 * of eight, which is a demand disguised as a description.
 */
function paperPosition(clubId: string): number {
  const club = CLUB_BY_ID[clubId]
  if (!club) return 10
  const rivals = clubsInLeague(club.leagueId)
  if (!rivals.length) return 10
  const stronger = rivals.filter((c) => c.strength > club.strength).length
  const tied = rivals.filter((c) => c.strength === club.strength).length
  return stronger + Math.ceil(tied / 2)
}

interface ParSeason {
  games: number
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  rating: number
}

/**
 * The season this player would have at this club if nothing went unusually
 * well or badly.
 *
 * It is the same arithmetic `simulateSeason` runs, evaluated at its own means
 * instead of drawn from — which for the counted things is exact, because the
 * expectation of a Poisson draw is the rate it was drawn at. Guessing at these
 * numbers instead was what made a defender's clean sheets and a centre-half's
 * match rating into demands that could not be met: both of those baselines sit
 * well below a striker's, and a target set off a striker's is a fine, not an
 * objective.
 */
function parSeason(input: ObjectiveInput, club: Club, league: League, share: number): ParSeason {
  const profile = PROFILE[input.position]
  const keeper = isKeeper(input.position)
  const edge = input.ovr - league.strength

  // Fixtures, less the games an average season loses to the treatment table.
  // The cup run and the continental campaign have to be in here: a defender at
  // a club playing fifty-two games has a season half again as long as one at a
  // club playing thirty-eight, and a target set off the league alone quietly
  // asks the first of them for less than he will actually manage.
  const contProb =
    league.continental && league.euroSpots > 0
      ? club.tier === 1
        ? 0.88
        : club.tier === 2
          ? 0.5
          : club.tier === 3
            ? 0.14
            : 0.03
      : 0
  const games =
    leagueGamesOf(league) + (club.strength > league.strength ? 3.5 : 2.5) + contProb * 9.5
  const injuryLoss = (0.2 + Math.max(0, input.age - 29) * 0.035) * 10.5
  const available = Math.max(6, games - injuryLoss)
  const minutes = available * 90 * share
  const apps = Math.min(available, minutes / (50 + 38 * share))
  const nineties = minutes / 90

  const quality = qualityMultiplier(input.ovr, league.strength)
  const creativity = creativityMultiplier(input.ovr, league.strength)
  const teamGoal = clamp(1 + (club.strength - league.strength) * 0.02, 0.75, 1.18)
  const teamAssist = clamp(1 + (club.strength - league.strength) * 0.03, 0.72, 1.25)

  const goals = profile.goals * quality * teamGoal * nineties
  const assists = profile.assists * creativity * teamAssist * nineties
  const csRate = clamp(
    0.1 + (club.strength - league.strength) * 0.022 + edge * (keeper ? 0.014 : 0.005),
    0.02,
    0.62,
  )
  let goalsTotal = goals
  let assistsTotal = assists
  let cleanSheets = keeper || isDefender(input.position) ? apps * csRate : 0

  // International football counts towards the demand, so it has to count
  // towards the expectation as well. Left out, a defender's country quietly
  // added two clean sheets a season the target had never allowed for.
  const nation = NATION_BY_NAME[input.nation]
  if (nation && input.age >= 17 && input.ovr >= nation.strength - 7 && apps >= 8) {
    const edge = input.ovr - nation.strength
    const natShare = edge >= 2 ? 0.925 : edge >= -3 ? 0.7 : 0.35
    const tournament = isWorldCupYear(input.season) || isContinentalYear(input.season)
    const natApps = (tournament ? 11.5 : 7.5) * natShare
    const natNineties = natApps * 0.835
    const natQuality = qualityMultiplier(input.ovr, 79)
    const natCreativity = creativityMultiplier(input.ovr, 79)
    const teammates = clamp(1 + (nation.strength - 79) * 0.025, 0.72, 1.25)
    goalsTotal += profile.goals * natQuality * teammates * natNineties
    assistsTotal += profile.assists * natCreativity * teammates * natNineties
    if (keeper || isDefender(input.position)) {
      cleanSheets += natApps * clamp(0.18 + (nation.strength - 76) * 0.014, 0.04, 0.6)
    }
  }

  // The rating formula measures output against what the position normally
  // produces, so in expectation the relative terms are just the multipliers.
  let rating: number
  if (keeper) {
    const concededPer90 = clamp(
      1.75 - (club.strength - league.strength) * 0.055 - edge * 0.03,
      0.3,
      3.2,
    )
    rating = 6.4 + csRate * 1.9 + edge * 0.02 - (concededPer90 - 1.3) * 0.22
  } else {
    rating =
      6.55 +
      clamp(quality * teamGoal - 1, -1, 3) * 0.28 +
      clamp(creativity * teamAssist - 1, -1, 3) * 0.18 +
      edge * 0.02
  }

  return {
    games,
    apps,
    goals: goalsTotal,
    assists: assistsTotal,
    cleanSheets,
    rating: clamp(rating, 4.8, 9.4),
  }
}

/**
 * The demand for one season, at the club the season is played at.
 *
 * Every target is set off what this player at this club would be expected to
 * produce, using the same arithmetic the season itself runs on, and then asked
 * for a little more than that. A club never demands a number the squad it put
 * around you cannot reach, and never settles for one you would hit asleep.
 */
export function buildObjective(input: ObjectiveInput): SeasonObjective | null {
  const club = CLUB_BY_ID[input.clubId]
  if (!club) return null
  const league = LEAGUE_BY_ID[club.leagueId]
  if (!league) return null

  const rng = streamFor(input)
  const role = projectRole(input.ovr, club.strength, input.age)
  const share = roleShare(role, input.age)
  const par = parSeason(input, club, league, share)
  const games = par.games
  const keeper = isKeeper(input.position)
  const rank = paperPosition(input.clubId)
  const contender = rank <= 3
  const strugglers = rank >= Math.max(6, Math.round(league.teams * 0.75))
  const fringe = role === 'Benchwarmer' || role === 'Squad player'

  // What kind of demand fits the player and the club he is at. A squad player
  // is asked to play, not to score; a title side is asked for the title.
  const weights: [ObjectiveKind, number][] = []
  const add = (kind: ObjectiveKind, w: number) => {
    if (w > 0) weights.push([kind, w])
  }
  // Two demands only make sense once there is a season to make them of. A
  // sixteen-year-old keeper whose par is a shade over one clean sheet cannot be
  // asked for two, and a player who will barely be on the pitch cannot be
  // judged on his average mark. Both fall back to being asked to play instead.
  const canRate = par.apps >= 10
  const canShutOut = par.cleanSheets >= 2

  if (fringe) {
    add('apps', 6)
    add('rating', canRate ? 1 : 0)
    add(strugglers ? 'survive' : 'finish', 2)
  } else if (keeper) {
    add('cleansheets', canShutOut ? 5 : 0)
    add('apps', canShutOut ? 2 : 6)
    add(strugglers ? 'survive' : 'finish', 3)
  } else if (isDefender(input.position)) {
    add('cleansheets', canShutOut ? 4 : 0)
    add(strugglers ? 'survive' : 'finish', 3)
    add('apps', canShutOut ? 2 : 5)
    add('rating', canRate ? 1 : 0)
  } else {
    const profile = PROFILE[input.position]
    add('goals', profile.goals >= 0.2 ? 5 : 2)
    add('assists', profile.assists >= 0.15 ? 4 : 2)
    add('rating', canRate ? 2 : 0)
    add(strugglers ? 'survive' : 'finish', 3)
  }
  if (contender && !fringe) add('silverware', 3)

  const total = weights.reduce((s, [, w]) => s + w, 0)
  let roll = rng.next() * total
  let kind: ObjectiveKind = weights[0][0]
  for (const [k, w] of weights) {
    roll -= w
    if (roll <= 0) {
      kind = k
      break
    }
  }

  switch (kind) {
    case 'goals':
      return { kind, target: Math.max(2, Math.round(par.goals * rng.range(0.92, 1.12))) }
    case 'assists':
      return { kind, target: Math.max(2, Math.round(par.assists * rng.range(0.92, 1.12))) }
    case 'cleansheets':
      return { kind, target: Math.max(1, Math.round(par.cleanSheets * rng.range(0.88, 1.08))) }
    case 'apps':
      // The floor has to sit under what a benchwarmer actually manages. Held at
      // six it rounded every fringe season up to a number the bench could not
      // reach, and four unwinnable demands in a row is a fine, not an objective.
      return { kind, target: clamp(Math.round(par.apps * rng.range(0.9, 1.06)), 3, Math.round(games)) }
    case 'rating':
      return { kind, target: Math.round(par.rating * rng.range(0.994, 1.006) * 100) }
    case 'finish': {
      // Ambition is measured against the squad, not the trophy: a mid-table
      // side asking for the title would only ever be a fixed loss.
      const ask = Math.max(1, rank - (contender ? 0 : rng.int(0, 1)))
      return { kind, target: clamp(ask, 1, league.teams - 1) }
    }
    case 'survive':
      return { kind, target: Math.max(4, league.teams - 3) }
    case 'silverware':
      return { kind, target: 1 }
  }
}

/** The demand the coming season will be judged against. */
export function upcomingObjective(career: Career): SeasonObjective | null {
  const { player } = career
  if (player.bannedUntil !== null && career.season < player.bannedUntil) return null
  return buildObjective({
    seed: career.seed,
    season: career.season,
    clubId: player.clubId,
    ovr: player.ovr,
    age: player.age,
    position: player.position,
    nation: player.nation,
  })
}

/** The demand a season already played was judged against. */
export function objectiveOf(career: Career, record: SeasonRecord): SeasonObjective | null {
  if (record.banned) return null
  return buildObjective({
    seed: career.seed,
    season: record.season,
    clubId: record.clubId,
    ovr: record.ovrStart,
    age: record.age,
    position: career.player.position,
    nation: career.player.nation,
  })
}

/** How the season answered it. A season without a demand answers nothing. */
export function judgeObjective(
  objective: SeasonObjective | null,
  record: SeasonRecord,
): 'met' | 'missed' | null {
  if (!objective || record.banned) return null
  return objectiveProgress(objective, record) >= 1 ? 'met' : 'missed'
}

/** How far through the demand a season got, for a progress bar. 0..1 */
export function objectiveProgress(objective: SeasonObjective, record: SeasonRecord): number {
  switch (objective.kind) {
    case 'goals':
      return clamp((record.goals + record.natGoals) / objective.target, 0, 1)
    case 'assists':
      return clamp((record.assists + record.natAssists) / objective.target, 0, 1)
    case 'cleansheets':
      return clamp((record.cleanSheets + record.natCleanSheets) / objective.target, 0, 1)
    case 'apps':
      return clamp(record.apps / objective.target, 0, 1)
    case 'rating':
      return clamp(Math.round(record.rating * 100) / objective.target, 0, 1)
    case 'finish':
    case 'survive':
      return record.leaguePosition <= objective.target ? 1 : 0
    case 'silverware':
      return record.trophies.length >= objective.target ? 1 : 0
  }
}

/** The number the demand is being measured against, for "7 / 12" readouts. */
export function objectiveHave(objective: SeasonObjective, record: SeasonRecord): number {
  switch (objective.kind) {
    case 'goals':
      return record.goals + record.natGoals
    case 'assists':
      return record.assists + record.natAssists
    case 'cleansheets':
      return record.cleanSheets + record.natCleanSheets
    case 'apps':
      return record.apps
    case 'rating':
      return Math.round(record.rating * 100)
    case 'finish':
    case 'survive':
      return record.leaguePosition
    case 'silverware':
      return record.trophies.length
  }
}

/**
 * What answering the demand is worth in the summer.
 *
 * Deliberately modest. It moves which clubs come calling — a season that
 * delivered is worth about a rating point and a half of extra interest — and
 * it can never on its own end a career, because the one thing worse than no
 * objective is one that answers a run of bad luck by quietly removing every
 * offer worth taking.
 */
export function objectiveSwing(verdict: 'met' | 'missed' | null): number {
  if (verdict === 'met') return 2.2
  if (verdict === 'missed') return -2.6
  return 0
}
