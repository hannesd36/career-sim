import { LEAGUE_BY_ID, type League } from '../data/leagues'
import { clubsInLeague } from '../data/clubs'
import { NATION_BY_NAME } from '../data/nations'
import { Rng, clamp } from './rng'
import type { Archetype, Club, Player, Position, SeasonRecord, SquadRole, Trophy } from './types'

/**
 * Per-90 output an average player of that position produces in a division
 * whose strength equals his own rating. Everything else scales off these.
 */
interface Profile {
  goals: number
  assists: number
  keyPasses: number
  tackles: number
  cards: number
}

const PROFILE: Record<Position, Profile> = {
  GK: { goals: 0.0, assists: 0.01, keyPasses: 0.05, tackles: 0.05, cards: 0.03 },
  CB: { goals: 0.055, assists: 0.03, keyPasses: 0.25, tackles: 2.6, cards: 0.2 },
  LB: { goals: 0.035, assists: 0.13, keyPasses: 0.9, tackles: 2.4, cards: 0.16 },
  RB: { goals: 0.035, assists: 0.13, keyPasses: 0.9, tackles: 2.4, cards: 0.16 },
  CDM: { goals: 0.05, assists: 0.09, keyPasses: 0.8, tackles: 2.8, cards: 0.22 },
  CM: { goals: 0.11, assists: 0.16, keyPasses: 1.3, tackles: 1.9, cards: 0.16 },
  CAM: { goals: 0.21, assists: 0.22, keyPasses: 2.2, tackles: 0.9, cards: 0.1 },
  LW: { goals: 0.25, assists: 0.19, keyPasses: 1.8, tackles: 0.8, cards: 0.09 },
  RW: { goals: 0.25, assists: 0.19, keyPasses: 1.8, tackles: 0.8, cards: 0.09 },
  ST: { goals: 0.38, assists: 0.12, keyPasses: 1.0, tackles: 0.5, cards: 0.1 },
}

export const isKeeper = (p: Position) => p === 'GK'
export const isDefender = (p: Position) => p === 'CB' || p === 'LB' || p === 'RB'

/**
 * How much more a player produces than the division's average.
 *
 * Deliberately saturating: an extra rating point is worth a lot when you are
 * merely good and very little once you are already the best player on the
 * pitch, so a 99-rated striker lands near 1.1 goals a game rather than two.
 */
export function qualityMultiplier(ovr: number, leagueStrength: number): number {
  const edge = ovr - leagueStrength
  if (edge <= 0) return clamp(1 + edge * 0.075, 0.12, 1)
  return 1 + 1.9 * (1 - Math.exp(-edge / 13))
}

/**
 * Creativity scales more gently than finishing — an assist needs a teammate to
 * convert, so being brilliant lifts the number far less than it lifts goals.
 */
export function creativityMultiplier(ovr: number, leagueStrength: number): number {
  const edge = ovr - leagueStrength
  if (edge <= 0) return clamp(1 + edge * 0.06, 0.15, 1)
  return 1 + 1.45 * (1 - Math.exp(-edge / 13))
}

/** Divisions play wildly different fixture counts; 38 is a sane ceiling. */
export const leagueGamesOf = (l: League) => Math.min(38, (l.teams - 1) * 2)

// ---------------------------------------------------------------------------
// squad role
// ---------------------------------------------------------------------------

const ROLE_SHARE: Record<SquadRole, number> = {
  'Key player': 0.92,
  Starter: 0.79,
  Rotation: 0.54,
  'Squad player': 0.27,
  Benchwarmer: 0.08,
}

/** How much of the season a player of this rating gets at this club. */
export function projectRole(ovr: number, clubStrength: number, age: number): SquadRole {
  const edge = ovr - clubStrength
  let role: SquadRole
  if (edge >= 4) role = 'Key player'
  else if (edge >= 0) role = 'Starter'
  else if (edge >= -4) role = 'Rotation'
  else if (edge >= -9) role = 'Squad player'
  else role = 'Benchwarmer'

  // teenagers have to wait their turn even when the rating says otherwise
  if (age <= 18 && (role === 'Key player' || role === 'Starter')) {
    role = edge >= 6 ? 'Starter' : 'Rotation'
  }
  return role
}

export function roleShare(role: SquadRole, age: number): number {
  let share = ROLE_SHARE[role]
  if (age <= 18) share *= 0.82
  else if (age <= 19) share *= 0.92
  else if (age >= 35) share *= 0.88
  return share
}

// ---------------------------------------------------------------------------
// league table
// ---------------------------------------------------------------------------

export interface TableRow {
  club: Club
  position: number
  points: number
}

/** Same league, same season, same career: the same table, from anywhere. */
export function tableRng(careerSeed: number, season: number, leagueId: string): Rng {
  let h = 2166136261
  for (let i = 0; i < leagueId.length; i++) {
    h ^= leagueId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return new Rng(careerSeed ^ (season * 2654435761) ^ h)
}

/**
 * Ranks every club in the division by strength plus noise, so titles are won
 * by the clubs that deserve them without hard-coding a winner. A player who
 * outclasses his own squad drags it up the table.
 *
 * It runs on its own seeded stream rather than the season's, so the standings
 * screen can rebuild any table the career ever played in without storing one.
 */
export function simulateTable(
  league: League,
  playerClub: Club | null,
  playerOvr: number,
  rng: Rng,
): TableRow[] {
  const lift = playerClub ? clamp((playerOvr - playerClub.strength) * 0.3, -1.5, 4) : 0
  const rows = clubsInLeague(league.id).map((club) => ({
    club,
    score: club.strength + rng.gauss(0, 3.4) + (club.id === playerClub?.id ? lift : 0),
  }))
  rows.sort((a, b) => b.score - a.score)

  // Points exist so the screen reads like a table rather than a ranked list.
  const games = (rows.length - 1) * 2
  const top = 2.02 + rng.range(0, 0.22)
  const bottom = 0.78 + rng.range(0, 0.2)
  let previous = Infinity
  return rows.map((r, i) => {
    const rate = top - (top - bottom) * (i / Math.max(rows.length - 1, 1))
    const points = Math.min(previous, Math.round(games * rate + rng.range(-2, 2)))
    previous = points
    return { club: r.club, position: i + 1, points: Math.max(points, 4) }
  })
}

// ---------------------------------------------------------------------------
// season
// ---------------------------------------------------------------------------

export interface SeasonContext {
  player: Player
  club: Club
  season: number
  /** club is in its continental competition this year */
  continental: boolean
  rng: Rng
  /** the career seed, so the league table can be rebuilt later */
  tableSeed: number
}

/** Somebody has to be standing in the other half on the night. */
function rivalIn(leagueId: string, club: Club, rng: Rng): string {
  const others = clubsInLeague(leagueId).filter((c) => c.id !== club.id)
  if (!others.length) return club.name
  const strong = others.sort((a, b) => b.strength - a.strength).slice(0, 8)
  return strong[rng.int(0, strong.length - 1)].name
}

/** Binomial draw, normal-approximated — good enough and cheap. */
function binomial(n: number, p: number, rng: Rng): number {
  if (n <= 0) return 0
  const mean = n * p
  const sd = Math.sqrt(Math.max(n * p * (1 - p), 0.0001))
  return clamp(Math.round(rng.gauss(mean, sd)), 0, n)
}

export function simulateSeason(ctx: SeasonContext): SeasonRecord {
  const { player, club, season, continental, rng } = ctx
  const league = LEAGUE_BY_ID[club.leagueId]
  const profile = PROFILE[player.position]
  const ovr = player.ovr

  // --- fixtures ---------------------------------------------------------
  const leagueGames = leagueGamesOf(league)
  const cupGames = rng.int(1, club.strength > league.strength ? 6 : 4)
  const contGames = continental ? rng.int(6, 13) : 0
  const totalGames = leagueGames + cupGames + contGames

  // --- availability -----------------------------------------------------
  const role = projectRole(ovr, club.strength, player.age)
  const share = roleShare(role, player.age)

  const injuryRisk = 0.2 + Math.max(0, player.age - 29) * 0.035
  let gamesMissedInjured = 0
  if (rng.chance(injuryRisk)) gamesMissedInjured += rng.int(3, player.age >= 32 ? 24 : 18)
  const available = Math.max(0, totalGames - gamesMissedInjured)

  const minutes = Math.round(available * 90 * share * rng.range(0.9, 1.1))
  const perApp = 50 + 38 * share
  const apps = clamp(Math.round(minutes / perApp), 0, available)
  const nineties = minutes / 90

  // --- output scaling ---------------------------------------------------
  const quality = qualityMultiplier(ovr, league.strength)
  const creativity = creativityMultiplier(ovr, league.strength)
  // A strong side creates more; assists depend on teammates finishing.
  const teamGoal = clamp(1 + (club.strength - league.strength) * 0.02, 0.75, 1.18)
  const teamAssist = clamp(1 + (club.strength - league.strength) * 0.03, 0.72, 1.25)
  // A weak side defends more, so its defenders rack up tackles.
  const defLoad = clamp(1 + (league.strength - club.strength) * 0.02, 0.7, 1.35)

  const goals = rng.poisson(profile.goals * quality * teamGoal * nineties)
  const assists = rng.poisson(profile.assists * creativity * teamAssist * nineties)
  const keyPasses = rng.poisson(profile.keyPasses * creativity * nineties)
  const tackles = rng.poisson(profile.tackles * defLoad * nineties)
  const yellowCards = rng.poisson(profile.cards * nineties)
  const redCards = rng.chance(0.06 + yellowCards * 0.004) ? 1 : 0

  // --- goalkeeping / clean sheets --------------------------------------
  const keeper = isKeeper(player.position)
  const ownWeight = keeper ? 0.014 : 0.005
  const csRate = clamp(
    0.1 + (club.strength - league.strength) * 0.022 + (ovr - league.strength) * ownWeight,
    0.02,
    0.62,
  )
  const cleanSheets = keeper || isDefender(player.position) ? binomial(apps, csRate, rng) : 0

  let conceded = 0
  let saves = 0
  if (keeper) {
    const concededPer90 = clamp(
      1.75 - (club.strength - league.strength) * 0.055 - (ovr - league.strength) * 0.03,
      0.3,
      3.2,
    )
    conceded = rng.poisson(concededPer90 * nineties)
    const savesPer90 = clamp(4.4 - (club.strength - league.strength) * 0.085 + (ovr - league.strength) * 0.02, 1.5, 6.5)
    saves = rng.poisson(savesPer90 * nineties)
  }

  // --- match rating -----------------------------------------------------
  const per90 = (n: number) => (nineties > 0 ? n / nineties : 0)
  let rating: number
  if (keeper) {
    const concededPer90 = nineties > 0 ? conceded / nineties : 1.3
    rating = 6.4 + csRate * 1.9 + (ovr - league.strength) * 0.02 - (concededPer90 - 1.3) * 0.22
  } else {
    // performance measured against what this position normally produces
    const relGoals = clamp(per90(goals) / profile.goals - 1, -1, 3)
    const relAssists = clamp(per90(assists) / profile.assists - 1, -1, 3)
    rating = 6.55 + relGoals * 0.28 + relAssists * 0.18 + (ovr - league.strength) * 0.02
  }
  if (apps === 0) rating = 0
  else rating = clamp(rating + rng.gauss(0, 0.12), 4.8, 9.4)

  // --- club season ------------------------------------------------------
  const table = simulateTable(league, club, ovr, tableRng(ctx.tableSeed, season, league.id))
  const leaguePosition = table.find((r) => r.club.id === club.id)?.position ?? league.teams

  const trophies: Trophy[] = []
  const played = apps >= Math.max(5, totalGames * 0.15)

  if (leaguePosition === 1 && played) {
    trophies.push({ id: 'league', season, wonWith: club.name, leagueId: league.id })
  }

  // Knockout trophies are not awarded here. Reaching the final is what the
  // simulation decides; the final itself is one penalty, taken by the player.
  let finalIn: SeasonRecord['finalIn']
  const cupOdds = clamp(0.06 + (club.strength - league.strength) * 0.05, 0.01, 0.6)
  if (played && rng.chance(cupOdds)) {
    finalIn = { trophy: 'cup', opponent: rivalIn(league.id, club, rng) }
  }
  if (!finalIn && continental && played && league.continental) {
    const odds = clamp((club.strength - 76) / 32, 0.008, 0.45)
    if (rng.chance(odds)) finalIn = { trophy: 'continental', opponent: rivalIn(league.id, club, rng) }
  }

  return {
    season,
    age: player.age,
    clubId: club.id,
    clubName: club.name,
    badge: club.badge,
    leagueId: club.leagueId,
    onLoan: player.onLoan,
    ovrStart: ovr,
    ovrEnd: ovr,
    role,
    apps,
    goals,
    assists,
    cleanSheets,
    conceded,
    saves,
    tackles,
    keyPasses,
    yellowCards,
    redCards,
    rating: Math.round(rating * 100) / 100,
    minutes,
    gamesMissedInjured,
    leaguePosition,
    ceilingBefore: [player.potMin, player.potMax],
    ceilingAfter: [player.potMin, player.potMax],
    trophies,
    banned: false,
    finalIn,
    natApps: 0,
    natGoals: 0,
    natAssists: 0,
    natCleanSheets: 0,
  }
}

// ---------------------------------------------------------------------------
// international football
// ---------------------------------------------------------------------------

export const isWorldCupYear = (season: number) => season % 4 === 2
export const isContinentalYear = (season: number) => season % 4 === 0

export function simulateInternational(player: Player, record: SeasonRecord, season: number, rng: Rng) {
  const nation = NATION_BY_NAME[player.nation]
  if (!nation || player.age < 17) return

  // You need to be near the level of the shirt, and to be playing club football.
  const threshold = nation.strength - 7
  if (player.ovr < threshold || record.apps < 8) return

  const edge = player.ovr - nation.strength
  const share = edge >= 2 ? rng.range(0.85, 1) : edge >= -3 ? rng.range(0.55, 0.85) : rng.range(0.2, 0.5)
  const tournament = isWorldCupYear(season) || isContinentalYear(season)
  const games = tournament ? rng.int(9, 14) : rng.int(6, 9)
  const apps = Math.round(games * share)
  if (apps <= 0) return

  const profile = PROFILE[player.position]
  // International football is tighter than any league: the opposition is a
  // national side, so the same rating produces fewer goals than at club level.
  const quality = qualityMultiplier(player.ovr, 79)
  const creativity = creativityMultiplier(player.ovr, 79)
  const teammates = clamp(1 + (nation.strength - 79) * 0.025, 0.72, 1.25)
  const nineties = apps * rng.range(0.72, 0.95)

  record.natApps = apps
  record.natGoals = rng.poisson(profile.goals * quality * teammates * nineties)
  record.natAssists = rng.poisson(profile.assists * creativity * teammates * nineties)
  if (isKeeper(player.position) || isDefender(player.position)) {
    const csRate = clamp(0.18 + (nation.strength - 76) * 0.014, 0.04, 0.6)
    record.natCleanSheets = binomial(apps, csRate, rng)
  }

  if (!tournament) return
  // Squad members share in the trophy; fringe players still get the medal.
  if (isWorldCupYear(season)) {
    if (rng.chance(clamp((nation.strength - 66) / 90, 0.002, 0.26))) {
      record.trophies.push({ id: 'worldcup', season, wonWith: nation.name })
    }
  } else {
    if (rng.chance(clamp((nation.strength - 62) / 65, 0.004, 0.34))) {
      record.trophies.push({ id: 'continentalnation', season, wonWith: nation.name })
    }
  }
}

// ---------------------------------------------------------------------------
// individual awards
// ---------------------------------------------------------------------------

export function awardIndividual(player: Player, record: SeasonRecord, season: number, rng: Rng) {
  const league = LEAGUE_BY_ID[record.leagueId]
  const leagueGames = leagueGamesOf(league)
  const totalGames = Math.max(record.apps, 1)
  // Split club output back out into league-only numbers for the golden boot.
  const leagueShare = Math.min(1, leagueGames / Math.max(totalGames, leagueGames * 0.6))
  const leagueGoals = Math.round(record.goals * leagueShare)
  const leagueAssists = Math.round(record.assists * leagueShare)

  if (record.apps < 12) return

  // The rival everyone else has to beat, drawn per season.
  const topScorer = rng.gauss(13 + league.strength * 0.145, 3.4)
  if (leagueGoals > topScorer) {
    record.trophies.push({ id: 'goldenboot', season, leagueId: league.id })
  }
  const topAssist = rng.gauss(7 + league.strength * 0.085, 2.6)
  if (leagueAssists > topAssist) {
    record.trophies.push({ id: 'playmaker', season, leagueId: league.id })
  }
  if (isKeeper(player.position)) {
    const topCs = rng.gauss(8 + league.strength * 0.075, 2.6)
    if (record.cleanSheets > topCs) {
      record.trophies.push({ id: 'goldenglove', season, leagueId: league.id })
    }
  }

  const won = (id: string) => record.trophies.some((t) => t.id === id)
  if (record.rating >= 7.15 && player.ovr >= league.strength + 5 && rng.chance(0.45)) {
    record.trophies.push({ id: 'tots', season, leagueId: league.id })
  }
  if (player.age <= 21 && player.ovr >= 78 && record.rating >= 7.1 && rng.chance(0.5)) {
    record.trophies.push({ id: 'goldenboy', season })
  }

  // Ballon d'Or: an elite season at an elite club in an elite league.
  const bigTrophies = record.trophies.filter(
    (t) => t.id === 'league' || t.id === 'continental' || t.id === 'worldcup' || t.id === 'continentalnation',
  ).length
  const score =
    record.goals +
    record.assists * 0.8 +
    bigTrophies * 11 +
    (player.ovr - 82) * 2.2 +
    (league.strength - 70) * 0.9 +
    (won('goldenboot') ? 8 : 0)
  if (player.ovr >= 90 && score > rng.gauss(100, 8)) {
    record.trophies.push({ id: 'ballondor', season })
  }
}

// ---------------------------------------------------------------------------
// progression
// ---------------------------------------------------------------------------

function ageGrowth(age: number, archetype: Archetype): number {
  let base: number
  if (age <= 18) base = 5.4
  else if (age <= 20) base = 4.6
  else if (age <= 22) base = 3.4
  else if (age <= 24) base = 2.2
  else if (age <= 26) base = 1.2
  else if (age <= 28) base = 0.4
  else if (age <= 30) base = -0.4
  else if (age <= 32) base = -1.6
  else if (age <= 34) base = -2.8
  else if (age <= 36) base = -4.0
  else base = -5.2

  if (archetype === 'wonderkid' && age <= 21) base += 1.4
  if (archetype === 'late') {
    if (age <= 21) base -= 1.0
    else if (age <= 27) base += 1.3
  }
  return base
}

export interface Progression {
  ovrBefore: number
  ovrAfter: number
  potentialBefore: number
  potentialAfter: number
}

/**
 * Moves hidden potential first (this season's football changed what the player
 * could become), then moves the rating towards it.
 */
export function progress(player: Player, record: SeasonRecord, seasonsPlayed: number, rng: Rng): Progression {
  const league = LEAGUE_BY_ID[record.leagueId]
  const before = { ovr: player.ovr, pot: player.hiddenPotential }
  const minuteShare = clamp(record.apps > 0 ? record.minutes / (90 * 38) : 0, 0, 1.2)

  // --- potential drift --------------------------------------------------
  // Performance has to outweigh the division you play in, otherwise banging in
  // 27 goals in the third tier moves nothing and the rating sits frozen for a
  // decade. A weak league slows you down; it does not cap you.
  let drift =
    (record.rating > 0 ? record.rating - 6.7 : -1.2) * 1.35 +
    (minuteShare - 0.55) * 1.8 +
    (league.strength - 68) * 0.04
  if (record.gamesMissedInjured > 15) drift -= 1.5
  drift *= player.age <= 21 ? 1 : player.age <= 25 ? 0.6 : 0.25
  drift += rng.gauss(0, 0.5)
  // The very top of the scale has to stay hard to reach — otherwise twenty
  // good seasons drift everyone to 99.
  if (drift > 0) drift *= clamp((97 - player.hiddenPotential) / 15, 0, 1)
  player.hiddenPotential = clamp(player.hiddenPotential + drift, player.ovr, 97)

  // Past thirty the ceiling is behind you: it collapses back onto the rating,
  // so a declining veteran is not still shown a ceiling he can never reach.
  if (player.age >= 30) {
    player.hiddenPotential = Math.max(player.ovr, player.hiddenPotential - (player.age - 29) * 0.9)
  }

  // --- rating change ----------------------------------------------------
  let delta =
    ageGrowth(player.age, player.archetype) +
    (record.rating > 0 ? record.rating - 6.75 : -1) * 1.7 +
    (minuteShare - 0.55) * 2.2 +
    clamp((record.apps > 0 ? 0 : -1.5) + (league.strength - player.ovr) * 0.05, -1.5, 1)
  if (record.gamesMissedInjured > 12) delta -= 1.2
  else if (record.gamesMissedInjured > 5) delta -= 0.4
  delta += rng.gauss(0, 0.7)

  if (delta > 0) {
    // growth tapers as the ceiling approaches
    delta *= clamp((player.hiddenPotential - player.ovr) / 7, 0, 1)
  }
  player.ovr = clamp(Math.round(player.ovr + delta), 40, 99)
  player.hiddenPotential = clamp(player.hiddenPotential, player.ovr, 99)

  // --- the visible range narrows every season ---------------------------
  const width = Math.max(2, 28 * Math.pow(0.74, seasonsPlayed))
  const offset = rng.gauss(0, width * 0.18)
  let lo = Math.round(player.hiddenPotential - width / 2 + offset)
  let hi = Math.round(player.hiddenPotential + width / 2 + offset)
  lo = clamp(Math.min(lo, Math.floor(player.hiddenPotential)), player.ovr, 99)
  hi = clamp(Math.max(hi, Math.ceil(player.hiddenPotential)), lo + 1, 99)
  player.potMin = lo
  player.potMax = hi
  record.ceilingAfter = [lo, hi]

  return {
    ovrBefore: before.ovr,
    ovrAfter: player.ovr,
    potentialBefore: before.pot,
    potentialAfter: player.hiddenPotential,
  }
}

// ---------------------------------------------------------------------------
// market value
// ---------------------------------------------------------------------------

export function marketValue(player: Player, club: Club): number {
  const league = LEAGUE_BY_ID[club.leagueId]
  let value = Math.pow(player.ovr / 100, 9.5) * 260_000_000

  const age = player.age
  const ageMul =
    age <= 21 ? 1.35 : age <= 25 ? 1.2 : age <= 28 ? 1 : age <= 31 ? 0.7 : age <= 33 ? 0.42 : age <= 35 ? 0.22 : age <= 37 ? 0.1 : 0.04
  value *= ageMul

  if (age <= 23) value *= 1 + (player.hiddenPotential - player.ovr) * 0.03
  value *= clamp(0.7 + (league.strength - 66) * 0.03, 0.7, 1.35)

  // round to something a transfer market would print
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000
  if (value >= 100_000) return Math.round(value / 25_000) * 25_000
  return Math.max(10_000, Math.round(value / 5_000) * 5_000)
}
