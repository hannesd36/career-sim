import { Rng, clamp } from './rng'
import type { Club, Player, SeasonRecord } from './types'

/**
 * Career-defining decisions, deliberately built out of one currency.
 *
 * Every branch is "this many rating points, this often". A player can compare
 * two options in a second without learning what form, reputation or an offer
 * swing mean, and the screen needs no legend. The only thing that is not a
 * rating point is the doping storyline, which trades a big one now against a
 * test every season afterwards.
 */
export type EventId =
  | 'doping-offer'
  | 'doping-continue'
  | 'surgery'
  | 'extra-training'
  | 'transfer-strike'
  | 'agent-gamble'
  | 'captaincy'
  | 'coach-clash'
  | 'burnout'

export interface EventEffect {
  /** rating points, the only currency a decision spends */
  ovr?: number
  /** starts or stops the doping storyline */
  doping?: boolean
  /** seasons banned, counted from the coming season */
  ban?: number
  /** only a ban moves this; clubs remember it when they make offers */
  reputation?: number
}

export interface EventOutcome {
  /** relative weight against the other outcomes of the same choice */
  weight: number
  /** i18n key suffix for the result line */
  result: string
  effect: EventEffect
  tone: 'good' | 'bad' | 'neutral'
}

export interface EventChoice {
  /** i18n key suffix */
  key: string
  outcomes: EventOutcome[]
}

export interface GameEvent {
  id: EventId
  /** 0 means it cannot happen right now */
  weight: (ctx: EventContext) => number
  choices: EventChoice[]
}

export interface EventContext {
  player: Player
  club: Club
  last: SeasonRecord
  season: number
  seasonsPlayed: number
}

/** Chance of being caught, rising the longer the player keeps at it. */
export function dopingTestRisk(seasonsDoping: number): number {
  return clamp(0.1 + seasonsDoping * 0.045, 0.1, 0.4)
}

const nearCeiling = (p: Player) => p.hiddenPotential - p.ovr < 3

export const EVENTS: GameEvent[] = [
  // ---------------------------------------------------------------- doping
  {
    id: 'doping-offer',
    // Temptation arrives when you have stopped improving and time is short.
    weight: ({ player, last }) => {
      if (player.doping || player.bannedUntil !== null) return 0
      if (player.age < 19 || player.age > 34) return 0
      let w = 1
      if (nearCeiling(player)) w += 2.5
      if (player.age >= 28) w += 1.5
      if (last.apps < 15) w += 1
      return w
    },
    choices: [
      {
        key: 'accept',
        outcomes: [
          { weight: 1, result: 'accepted', tone: 'good', effect: { ovr: 9, doping: true } },
        ],
      },
      {
        key: 'refuse',
        outcomes: [{ weight: 1, result: 'refused', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'doping-continue',
    // Offered every season you are still on the programme.
    weight: ({ player }) => (player.doping && player.bannedUntil === null ? 6 : 0),
    choices: [
      {
        key: 'continue',
        outcomes: [{ weight: 1, result: 'continued', tone: 'neutral', effect: {} }],
      },
      {
        key: 'quit',
        outcomes: [
          { weight: 1, result: 'quit', tone: 'neutral', effect: { ovr: -6, doping: false } },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ the others
  {
    id: 'surgery',
    weight: ({ last }) => (last.gamesMissedInjured >= 14 ? 5 : 0),
    choices: [
      {
        key: 'operate',
        outcomes: [
          { weight: 58, result: 'clean', tone: 'good', effect: { ovr: 3 } },
          { weight: 42, result: 'botched', tone: 'bad', effect: { ovr: -6 } },
        ],
      },
      {
        key: 'rest',
        outcomes: [{ weight: 1, result: 'rested', tone: 'neutral', effect: { ovr: -1 } }],
      },
    ],
  },
  {
    id: 'extra-training',
    weight: ({ player, last }) => (player.age <= 27 && last.apps >= 12 ? 2.2 : 0),
    choices: [
      {
        key: 'grind',
        outcomes: [
          { weight: 72, result: 'paid-off', tone: 'good', effect: { ovr: 3 } },
          { weight: 28, result: 'overdid-it', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      { key: 'rest', outcomes: [{ weight: 1, result: 'rested', tone: 'neutral', effect: {} }] },
    ],
  },
  {
    id: 'transfer-strike',
    weight: ({ player, last }) =>
      player.age <= 29 && (last.role === 'Squad player' || last.role === 'Benchwarmer') ? 3 : 0,
    choices: [
      {
        key: 'strike',
        outcomes: [
          { weight: 52, result: 'forced-move', tone: 'good', effect: { ovr: 3 } },
          { weight: 48, result: 'frozen-out', tone: 'bad', effect: { ovr: -4 } },
        ],
      },
      { key: 'stay-quiet', outcomes: [{ weight: 1, result: 'stayed-quiet', tone: 'neutral', effect: {} }] },
    ],
  },
  {
    id: 'agent-gamble',
    weight: ({ player, last }) => (player.age >= 21 && player.age <= 30 && last.rating >= 6.9 ? 1.6 : 0),
    choices: [
      {
        key: 'wait',
        outcomes: [
          { weight: 45, result: 'giant-came', tone: 'good', effect: { ovr: 5 } },
          { weight: 55, result: 'nobody-came', tone: 'bad', effect: { ovr: -4 } },
        ],
      },
      { key: 'take-what-is-there', outcomes: [{ weight: 1, result: 'took-it', tone: 'neutral', effect: {} }] },
    ],
  },
  {
    id: 'captaincy',
    weight: ({ player, club, last }) =>
      player.age >= 24 && player.ovr >= club.strength + 2 && last.apps >= 22 ? 2 : 0,
    choices: [
      {
        key: 'take-armband',
        outcomes: [
          { weight: 66, result: 'led-well', tone: 'good', effect: { ovr: 2 } },
          { weight: 34, result: 'buckled', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      { key: 'decline-armband', outcomes: [{ weight: 1, result: 'declined', tone: 'neutral', effect: {} }] },
    ],
  },
  {
    id: 'coach-clash',
    weight: ({ last }) => (last.rating > 0 && last.rating < 6.5 ? 2.4 : 0),
    choices: [
      {
        key: 'push-back',
        outcomes: [
          { weight: 38, result: 'coach-sacked', tone: 'good', effect: { ovr: 3 } },
          { weight: 62, result: 'benched', tone: 'bad', effect: { ovr: -4 } },
        ],
      },
      { key: 'fall-in-line', outcomes: [{ weight: 1, result: 'fell-in-line', tone: 'neutral', effect: { ovr: 1 } }] },
    ],
  },
  {
    id: 'burnout',
    weight: ({ player, last }) => (player.age >= 30 && last.apps >= 45 ? 2 : 0),
    choices: [
      {
        key: 'play-through',
        outcomes: [
          { weight: 45, result: 'held-up', tone: 'good', effect: { ovr: 2 } },
          { weight: 55, result: 'broke-down', tone: 'bad', effect: { ovr: -5 } },
        ],
      },
      { key: 'take-a-break', outcomes: [{ weight: 1, result: 'took-break', tone: 'neutral', effect: { ovr: -1 } }] },
    ],
  },
]

export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
)

/** Picks an event for this summer, or nothing. `pressure` scales how often. */
export function rollEvent(ctx: EventContext, pressure: number, rng: Rng): GameEvent | null {
  const candidates = EVENTS.map((e) => ({ e, w: e.weight(ctx) })).filter((c) => c.w > 0)
  if (!candidates.length) return null

  // A doping decision, once live, always takes priority over small talk.
  const forced = candidates.find((c) => c.e.id === 'doping-continue')
  if (forced && rng.chance(0.75)) return forced.e

  if (!rng.chance(pressure)) return null

  const total = candidates.reduce((s, c) => s + c.w, 0)
  let roll = rng.next() * total
  for (const c of candidates) {
    roll -= c.w
    if (roll <= 0) return c.e
  }
  return candidates[candidates.length - 1].e
}

export function rollOutcome(choice: EventChoice, rng: Rng): EventOutcome {
  const total = choice.outcomes.reduce((s, o) => s + o.weight, 0)
  let roll = rng.next() * total
  for (const o of choice.outcomes) {
    roll -= o.weight
    if (roll <= 0) return o
  }
  return choice.outcomes[choice.outcomes.length - 1]
}

/** The odds printed next to a branch, so nothing is hidden from the player. */
export function outcomeOdds(choice: EventChoice, outcome: EventOutcome): number {
  const total = choice.outcomes.reduce((s, o) => s + o.weight, 0)
  return Math.round((outcome.weight / total) * 100)
}

export function applyEffect(player: Player, effect: EventEffect, season: number) {
  if (effect.ovr) player.ovr = clamp(player.ovr + effect.ovr, 40, 99)
  if (effect.doping !== undefined) {
    player.doping = effect.doping
    player.dopingSeasons = effect.doping ? player.dopingSeasons : 0
  }
  if (effect.ban) {
    player.bannedUntil = season + effect.ban
    player.doping = false
    player.dopingSeasons = 0
  }
  if (effect.reputation) player.reputation = clamp(player.reputation + effect.reputation, 0, 100)
  player.hiddenPotential = clamp(player.hiddenPotential, player.ovr, 99)
}

/** Clubs that would otherwise take you think twice after a ban. */
export function reputationPenalty(player: Player): number {
  return (player.reputation - 50) * 0.06
}
