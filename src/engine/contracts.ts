import { Rng, clamp } from './rng'
import type { Club, Player, SeasonRecord, SquadRole } from './types'

/**
 * Contracts and what they pay, for the detailed mode.
 *
 * Money is in thousands of euros a week, which is the unit footballers are
 * actually talked about in. Nothing in here touches the simulation: a contract
 * decides what you are paid and what you were promised, and the only way it
 * reaches the pitch is through the promise being broken, which is a decision
 * the player then gets to make.
 */

export type BonusKind = 'goal' | 'assist' | 'app' | 'cleanSheet' | 'trophy'

export interface Bonus {
  kind: BonusKind
  /** thousands per event */
  per: number
}

export interface Contract {
  clubId: string
  /** thousands a week */
  wage: number
  /** the last season this contract covers */
  until: number
  /** what the club said your role would be, or null if nothing was promised */
  promised: SquadRole | null
  bonuses: Bonus[]
  signed: number
  /** a contract taken on lower base pay in exchange for the bonus sheet */
  incentivised: boolean
}

/** How the four terms on the table differ from one another. */
export type TermsId = 'standard' | 'long' | 'incentive' | 'short'

export interface Terms {
  id: TermsId
  wage: number
  years: number
  promised: SquadRole | null
  bonuses: Bonus[]
}

const ROLE_MULTIPLIER: Record<SquadRole, number> = {
  'Key player': 1.55,
  Starter: 1.15,
  Rotation: 0.8,
  'Squad player': 0.55,
  Benchwarmer: 0.35,
}

/**
 * The going rate, before any negotiating.
 *
 * A club pays for two things at once: how good you are and how good it is.
 * The curve on the rating is steep on purpose, because the gap between a good
 * player and a great one is not twenty percent in real money.
 */
export function baseWage(player: Player, club: Club, role: SquadRole): number {
  const level = Math.pow(Math.max(0, player.ovr - 44) / 24, 2.35)
  const clubPull = Math.pow(Math.max(0, club.strength - 40) / 26, 1.5)
  const prime = player.age <= 20 ? 0.55 : player.age <= 23 ? 0.8 : player.age >= 34 ? 0.65 : 1
  const wage = 1.4 + level * 118 * clubPull * ROLE_MULTIPLIER[role] * prime
  return Math.max(0.6, Math.round(wage * 10) / 10)
}

/**
 * The four sets of terms a club will put on the table.
 *
 * They are deliberately not strictly ordered: the long deal pays less per week
 * but for longer, and the incentivised one can beat everything or nothing. The
 * player is choosing a shape, not a number.
 */
export function offerTerms(
  player: Player,
  club: Club,
  role: SquadRole,
  rng: Rng,
): Terms[] {
  const base = baseWage(player, club, role)
  const keen = clamp((club.strength - player.ovr) / 20, -0.5, 0.5)

  // A club that wants you badly promises the role; one signing you as cover
  // will not put it in writing.
  const willPromise = role === 'Key player' || role === 'Starter' || rng.chance(0.4)

  const standard: Terms = {
    id: 'standard',
    wage: Math.round(base * (1 + keen * 0.1) * 10) / 10,
    years: 3,
    promised: willPromise ? role : null,
    bonuses: [],
  }

  const long: Terms = {
    id: 'long',
    wage: Math.round(base * 0.86 * 10) / 10,
    years: player.age >= 31 ? 3 : 5,
    promised: willPromise ? role : null,
    bonuses: [],
  }

  const short: Terms = {
    id: 'short',
    wage: Math.round(base * 1.14 * 10) / 10,
    years: 1,
    promised: null,
    bonuses: [],
  }

  const incentive: Terms = {
    id: 'incentive',
    wage: Math.round(base * 0.58 * 10) / 10,
    years: 3,
    promised: willPromise ? role : null,
    bonuses: bonusSheet(player, base),
  }

  return [standard, long, incentive, short].map((t) => ({
    ...t,
    wage: Math.max(0.6, t.wage),
  }))
}

/** What a player gets paid per goal, per game and so on, scaled to his wage. */
function bonusSheet(player: Player, base: number): Bonus[] {
  const unit = Math.max(0.4, base * 0.06)
  if (player.position === 'GK') {
    return [
      { kind: 'cleanSheet', per: Math.round(unit * 22) / 10 },
      { kind: 'app', per: Math.round(unit * 7) / 10 },
      { kind: 'trophy', per: Math.round(unit * 260) / 10 },
    ]
  }
  const attacking = ['ST', 'LW', 'RW', 'CAM'].includes(player.position)
  return [
    { kind: 'goal', per: Math.round(unit * (attacking ? 20 : 34)) / 10 },
    { kind: 'assist', per: Math.round(unit * (attacking ? 14 : 20)) / 10 },
    { kind: 'app', per: Math.round(unit * 7) / 10 },
    { kind: 'trophy', per: Math.round(unit * 260) / 10 },
  ]
}

/** Turns chosen terms into the contract that gets stored. */
export function sign(terms: Terms, club: Club, season: number): Contract {
  return {
    clubId: club.id,
    wage: terms.wage,
    until: season + terms.years,
    promised: terms.promised,
    bonuses: terms.bonuses,
    signed: season,
    incentivised: terms.id === 'incentive',
  }
}

/** What a season actually paid: wages for the year, plus whatever was earned. */
export function seasonEarnings(contract: Contract | null, record: SeasonRecord): number {
  if (!contract) return 0
  let total = contract.wage * 52
  for (const bonus of contract.bonuses) {
    if (bonus.kind === 'goal') total += bonus.per * record.goals
    else if (bonus.kind === 'assist') total += bonus.per * record.assists
    else if (bonus.kind === 'app') total += bonus.per * record.apps
    else if (bonus.kind === 'cleanSheet') total += bonus.per * record.cleanSheets
    else if (bonus.kind === 'trophy') total += bonus.per * record.trophies.length
  }
  return Math.round(total * 10) / 10
}

/** Seasons left to run, counting the one about to be played. */
export function yearsLeft(contract: Contract | null, season: number): number {
  if (!contract) return 0
  return Math.max(0, contract.until - season + 1)
}

export function isExpiring(contract: Contract | null, season: number): boolean {
  return yearsLeft(contract, season) <= 1
}

/**
 * Did the club keep its word?
 *
 * Only a promise clearly broken counts. Being asked to rotate when you were
 * promised a starting shirt is the case this exists for; a key player who was
 * promised a start has nothing to complain about.
 */
const ROLE_RANK: SquadRole[] = [
  'Benchwarmer',
  'Squad player',
  'Rotation',
  'Starter',
  'Key player',
]

export function promiseBroken(contract: Contract | null, record: SeasonRecord): boolean {
  if (!contract?.promised) return false
  const promised = ROLE_RANK.indexOf(contract.promised)
  const got = ROLE_RANK.indexOf(record.role)
  if (promised < 0 || got < 0) return false
  return promised - got >= 1
}

/**
 * What a free agent is worth to himself: with no fee to pay, a club can put the
 * money into wages instead. This is the reason running a contract down is a
 * real strategy rather than just a risk.
 */
export function freeAgentBump(base: number): number {
  return Math.round(base * 1.22 * 10) / 10
}
