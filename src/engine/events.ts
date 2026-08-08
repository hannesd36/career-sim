import { LEAGUE_BY_ID } from '../data/leagues'
import { Rng, clamp } from './rng'
import { isDefender, isKeeper } from './sim'
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
  // --- the years before anybody knows your name ---
  | 'first-team-debut'
  | 'loan-move'
  | 'homesick'
  // --- the life around the football ---
  | 'boot-deal'
  | 'nightlife'
  | 'wage-holdout'
  | 'agent-switch'
  | 'documentary'
  // --- the football itself ---
  | 'new-manager'
  | 'position-switch'
  | 'penalty-duty'
  | 'derby-red'
  | 'dressing-room-split'
  | 'european-nights'
  // --- the body ---
  | 'winter-surgery'
  | 'injections'
  | 'preseason-weight'
  | 'sports-science'
  // --- what you play, specifically ---
  | 'keeper-coach'
  | 'striker-drought'
  | 'defender-cards'
  // --- the shirt with the badge on it ---
  | 'nation-switch'
  | 'country-armband'
  // --- the end of it ---
  | 'youth-mentor'
  | 'coaching-badges'

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
  /** a crossroads a career only reaches once, however long it lasts */
  once?: boolean
  choices: EventChoice[]
}

export interface EventContext {
  player: Player
  club: Club
  last: SeasonRecord
  season: number
  seasonsPlayed: number
  /** every decision already taken, so a one-off does not come round again */
  decided: Set<string>
}

/** Chance of being caught, rising the longer the player keeps at it. */
export function dopingTestRisk(seasonsDoping: number): number {
  return clamp(0.1 + seasonsDoping * 0.045, 0.1, 0.4)
}

const nearCeiling = (p: Player) => p.hiddenPotential - p.ovr < 3

const isAttacker = (p: Player) =>
  p.position === 'ST' || p.position === 'LW' || p.position === 'RW' || p.position === 'CAM'

/** Playing in a country that is not the one on your passport. */
const abroad = (p: Player, c: Club) => LEAGUE_BY_ID[c.leagueId]?.country !== p.nation

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

  // ------------------------------------- the years before anybody knows you
  {
    id: 'first-team-debut',
    once: true,
    weight: ({ player, seasonsPlayed, last }) =>
      player.age <= 18 && seasonsPlayed <= 2 && last.apps <= 12 ? 3 : 0,
    choices: [
      {
        key: 'go-up',
        outcomes: [
          { weight: 58, result: 'thrown-in', tone: 'good', effect: { ovr: 3 } },
          { weight: 42, result: 'carried-drinks', tone: 'neutral', effect: {} },
        ],
      },
      {
        key: 'stay-down',
        outcomes: [{ weight: 1, result: 'won-things', tone: 'neutral', effect: { ovr: 1 } }],
      },
    ],
  },
  {
    id: 'loan-move',
    weight: ({ player, last }) =>
      player.age <= 21 &&
      !player.onLoan &&
      (last.role === 'Benchwarmer' || last.role === 'Squad player')
        ? 2.6
        : 0,
    choices: [
      {
        key: 'drop-and-play',
        outcomes: [
          { weight: 70, result: 'every-week', tone: 'good', effect: { ovr: 4 } },
          { weight: 30, result: 'forgotten', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'stay-and-fight',
        outcomes: [
          { weight: 45, result: 'won-a-place', tone: 'good', effect: { ovr: 3 } },
          { weight: 55, result: 'sat', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
    ],
  },
  {
    id: 'homesick',
    weight: ({ player, club, seasonsPlayed }) =>
      player.age <= 21 && seasonsPlayed >= 1 && abroad(player, club) ? 2.4 : 0,
    choices: [
      {
        key: 'stick-it-out',
        outcomes: [
          { weight: 64, result: 'settled', tone: 'good', effect: { ovr: 3 } },
          { weight: 36, result: 'never-settled', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'ask-to-go-home',
        outcomes: [{ weight: 1, result: 'went-home', tone: 'neutral', effect: { ovr: -1 } }],
      },
    ],
  },

  // ----------------------------------------- the life around the football
  {
    id: 'boot-deal',
    weight: ({ player, last }) => (player.age >= 18 && last.apps >= 15 ? 1.6 : 0),
    choices: [
      {
        key: 'do-the-shoot',
        outcomes: [
          { weight: 60, result: 'harmless', tone: 'neutral', effect: {} },
          { weight: 40, result: 'missed-the-work', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'stay-in-camp',
        outcomes: [{ weight: 1, result: 'did-the-work', tone: 'good', effect: { ovr: 1 } }],
      },
    ],
  },
  {
    id: 'nightlife',
    weight: ({ player }) => (player.age >= 18 && player.age <= 27 ? 1.8 : 0),
    choices: [
      {
        key: 'front-up',
        outcomes: [
          { weight: 62, result: 'respected', tone: 'good', effect: { ovr: 1, reputation: 2 } },
          { weight: 38, result: 'made-it-worse', tone: 'bad', effect: { ovr: -2, reputation: -5 } },
        ],
      },
      {
        key: 'deny-it',
        outcomes: [
          { weight: 45, result: 'blew-over', tone: 'neutral', effect: {} },
          { weight: 55, result: 'more-came-out', tone: 'bad', effect: { ovr: -2, reputation: -7 } },
        ],
      },
    ],
  },
  {
    id: 'wage-holdout',
    weight: ({ player, club, last }) =>
      player.age >= 22 && player.ovr >= club.strength + 3 && last.apps >= 24 ? 2 : 0,
    choices: [
      {
        key: 'hold-firm',
        outcomes: [
          { weight: 55, result: 'they-paid', tone: 'good', effect: { ovr: 2 } },
          { weight: 45, result: 'benched-until-you-sign', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'sign-it',
        outcomes: [{ weight: 1, result: 'signed', tone: 'neutral', effect: { ovr: 1 } }],
      },
    ],
  },
  {
    id: 'agent-switch',
    weight: ({ player }) => (player.age >= 20 && player.age <= 30 ? 1.5 : 0),
    choices: [
      {
        key: 'switch',
        outcomes: [
          { weight: 50, result: 'better-doors', tone: 'good', effect: { ovr: 3 } },
          { weight: 50, result: 'burned-bridges', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'stay-loyal',
        outcomes: [{ weight: 1, result: 'stayed', tone: 'neutral', effect: { ovr: 1 } }],
      },
    ],
  },
  {
    id: 'documentary',
    weight: ({ player, last }) => (player.ovr >= 74 && player.age >= 23 && last.apps >= 20 ? 1.4 : 0),
    choices: [
      {
        key: 'let-them-in',
        outcomes: [
          { weight: 45, result: 'came-off-well', tone: 'good', effect: { ovr: 1, reputation: 4 } },
          { weight: 55, result: 'caught-everything', tone: 'bad', effect: { ovr: -2, reputation: -4 } },
        ],
      },
      {
        key: 'keep-the-door-shut',
        outcomes: [{ weight: 1, result: 'shut', tone: 'neutral', effect: {} }],
      },
    ],
  },

  // ------------------------------------------------------ the football itself
  {
    id: 'new-manager',
    weight: ({ last }) => (last.leaguePosition >= 12 || (last.rating > 0 && last.rating < 6.6) ? 2.2 : 0),
    choices: [
      {
        key: 'learn-the-system',
        outcomes: [
          { weight: 70, result: 'adapted', tone: 'good', effect: { ovr: 2 } },
          { weight: 30, result: 'never-fit', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'play-your-way',
        outcomes: [
          { weight: 38, result: 'he-adapted', tone: 'good', effect: { ovr: 4 } },
          { weight: 62, result: 'dropped', tone: 'bad', effect: { ovr: -4 } },
        ],
      },
    ],
  },
  {
    id: 'position-switch',
    weight: ({ player, last }) =>
      !isKeeper(player.position) && (player.age >= 27 || player.age <= 20) && last.apps >= 15
        ? 1.8
        : 0,
    choices: [
      {
        key: 'move',
        outcomes: [
          { weight: 62, result: 'second-career', tone: 'good', effect: { ovr: 3 } },
          { weight: 38, result: 'lost-at-sea', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'stay-where-you-are',
        outcomes: [{ weight: 1, result: 'stayed', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'penalty-duty',
    weight: ({ player, last }) =>
      !isKeeper(player.position) && (last.goals >= 5 || last.role === 'Key player') ? 1.6 : 0,
    choices: [
      {
        key: 'take-them',
        outcomes: [
          { weight: 68, result: 'never-missed', tone: 'good', effect: { ovr: 2 } },
          { weight: 32, result: 'missed-the-big-one', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'let-someone-else',
        outcomes: [{ weight: 1, result: 'passed', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'derby-red',
    weight: ({ last }) => (last.redCards >= 1 ? 2.4 : 0),
    choices: [
      {
        key: 'appeal',
        outcomes: [
          { weight: 40, result: 'rescinded', tone: 'good', effect: { ovr: 1 } },
          { weight: 60, result: 'extra-game', tone: 'bad', effect: { ovr: -2, reputation: -3 } },
        ],
      },
      {
        key: 'serve-it',
        outcomes: [{ weight: 1, result: 'served', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'dressing-room-split',
    weight: ({ last, seasonsPlayed }) => (seasonsPlayed >= 3 && last.leaguePosition >= 14 ? 2 : 0),
    choices: [
      {
        key: 'pick-a-side',
        outcomes: [
          { weight: 45, result: 'won-the-room', tone: 'good', effect: { ovr: 3 } },
          { weight: 55, result: 'wrong-side', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'stay-out-of-it',
        outcomes: [{ weight: 1, result: 'stayed-out', tone: 'neutral', effect: { ovr: 1 } }],
      },
    ],
  },
  {
    id: 'european-nights',
    weight: ({ player, last }) => (last.leaguePosition <= 4 && player.age >= 21 ? 2 : 0),
    choices: [
      {
        key: 'play-everything',
        outcomes: [
          { weight: 55, result: 'thrived', tone: 'good', effect: { ovr: 4 } },
          { weight: 45, result: 'ran-out-of-legs', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'be-rested',
        outcomes: [{ weight: 1, result: 'rested', tone: 'neutral', effect: { ovr: 1 } }],
      },
    ],
  },

  // ------------------------------------------------------------------ the body
  {
    id: 'winter-surgery',
    weight: ({ last }) => (last.gamesMissedInjured >= 5 && last.gamesMissedInjured < 14 ? 2.2 : 0),
    choices: [
      {
        key: 'get-it-done',
        outcomes: [
          { weight: 66, result: 'clean', tone: 'good', effect: { ovr: 2 } },
          { weight: 34, result: 'slow-back', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'manage-it',
        outcomes: [
          { weight: 50, result: 'held', tone: 'neutral', effect: {} },
          { weight: 50, result: 'got-worse', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
    ],
  },
  {
    id: 'injections',
    weight: ({ player, last }) => (player.age >= 28 && last.gamesMissedInjured >= 6 ? 2 : 0),
    choices: [
      {
        key: 'take-the-needle',
        outcomes: [
          { weight: 60, result: 'got-through-it', tone: 'good', effect: { ovr: 2 } },
          { weight: 40, result: 'real-damage', tone: 'bad', effect: { ovr: -5 } },
        ],
      },
      {
        key: 'sit-it-out',
        outcomes: [{ weight: 1, result: 'sat', tone: 'neutral', effect: { ovr: -1 } }],
      },
    ],
  },
  {
    id: 'preseason-weight',
    weight: ({ player, last }) => (player.age >= 26 && last.apps >= 20 ? 1.8 : 0),
    choices: [
      {
        key: 'crash-it-off',
        outcomes: [
          { weight: 70, result: 'flying', tone: 'good', effect: { ovr: 2 } },
          { weight: 30, result: 'pulled-something', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'work-into-it',
        outcomes: [{ weight: 1, result: 'slow-start', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'sports-science',
    weight: ({ player }) => (player.age >= 21 ? 1.4 : 0),
    choices: [
      {
        key: 'rebuild-everything',
        outcomes: [
          { weight: 66, result: 'marginal-gains', tone: 'good', effect: { ovr: 2 } },
          { weight: 34, result: 'lost-your-rhythm', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'keep-your-routine',
        outcomes: [{ weight: 1, result: 'kept-it', tone: 'neutral', effect: {} }],
      },
    ],
  },

  // ------------------------------------------------ what you play, specifically
  {
    id: 'keeper-coach',
    weight: ({ player, last }) => (isKeeper(player.position) && last.apps >= 15 ? 2.4 : 0),
    choices: [
      {
        key: 'rebuild-your-handling',
        outcomes: [
          { weight: 64, result: 'unbeatable', tone: 'good', effect: { ovr: 3 } },
          { weight: 36, result: 'thinking-too-much', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'trust-what-works',
        outcomes: [{ weight: 1, result: 'kept-it', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'striker-drought',
    weight: ({ player, last }) =>
      isAttacker(player) && last.apps >= 20 && last.goals <= 3 ? 2.6 : 0,
    choices: [
      {
        key: 'see-someone',
        outcomes: [
          { weight: 68, result: 'goals-came-back', tone: 'good', effect: { ovr: 3 } },
          { weight: 32, result: 'nothing-changed', tone: 'bad', effect: { ovr: -1 } },
        ],
      },
      {
        key: 'work-it-out-alone',
        outcomes: [
          { weight: 42, result: 'came-good', tone: 'good', effect: { ovr: 2 } },
          { weight: 58, result: 'another-year-of-it', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
    ],
  },
  {
    id: 'defender-cards',
    weight: ({ player, last }) =>
      isDefender(player.position) && last.yellowCards >= 8 ? 2.4 : 0,
    choices: [
      {
        key: 'change-your-game',
        outcomes: [
          { weight: 65, result: 'cleaner-and-better', tone: 'good', effect: { ovr: 2 } },
          { weight: 35, result: 'lost-your-edge', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'keep-going',
        outcomes: [
          { weight: 42, result: 'they-fear-you', tone: 'good', effect: { ovr: 2 } },
          { weight: 58, result: 'suspended-again', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
    ],
  },

  // ------------------------------------------ the shirt with the badge on it
  {
    id: 'nation-switch',
    once: true,
    weight: ({ player, club }) =>
      !player.natCapped && player.age >= 22 && abroad(player, club) ? 2 : 0,
    choices: [
      {
        key: 'switch',
        outcomes: [
          { weight: 60, result: 'capped-at-last', tone: 'good', effect: { ovr: 2 } },
          { weight: 40, result: 'never-belonged', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'hold-out',
        outcomes: [{ weight: 1, result: 'held-out', tone: 'neutral', effect: {} }],
      },
    ],
  },
  {
    id: 'country-armband',
    weight: ({ player, last }) => (player.natCapped && player.age >= 27 && last.natApps >= 4 ? 1.6 : 0),
    choices: [
      {
        key: 'lead-them',
        outcomes: [
          { weight: 62, result: 'carried-it', tone: 'good', effect: { ovr: 2, reputation: 3 } },
          { weight: 38, result: 'too-much', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'just-play',
        outcomes: [{ weight: 1, result: 'just-played', tone: 'neutral', effect: {} }],
      },
    ],
  },

  // --------------------------------------------------------- the end of it
  {
    id: 'youth-mentor',
    weight: ({ player, club }) => (player.age >= 29 && player.ovr >= club.strength ? 1.8 : 0),
    choices: [
      {
        key: 'bring-him-on',
        outcomes: [
          { weight: 68, result: 'they-remember-it', tone: 'good', effect: { ovr: 1, reputation: 3 } },
          { weight: 32, result: 'he-took-your-place', tone: 'bad', effect: { ovr: -3 } },
        ],
      },
      {
        key: 'keep-him-out',
        outcomes: [
          { weight: 48, result: 'held-on', tone: 'neutral', effect: {} },
          { weight: 52, result: 'looked-small', tone: 'bad', effect: { ovr: -2, reputation: -3 } },
        ],
      },
    ],
  },
  {
    id: 'coaching-badges',
    once: true,
    weight: ({ player }) => (player.age >= 30 ? 1.8 : 0),
    choices: [
      {
        key: 'start-them',
        outcomes: [
          { weight: 58, result: 'read-the-game', tone: 'good', effect: { ovr: 2 } },
          { weight: 42, result: 'head-elsewhere', tone: 'bad', effect: { ovr: -2 } },
        ],
      },
      {
        key: 'not-yet',
        outcomes: [{ weight: 1, result: 'later', tone: 'neutral', effect: {} }],
      },
    ],
  },
]

export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
)

/** Picks an event for this summer, or nothing. `pressure` scales how often. */
export function rollEvent(ctx: EventContext, pressure: number, rng: Rng): GameEvent | null {
  const candidates = EVENTS.map((e) => ({ e, w: e.weight(ctx) })).filter(
    (c) => c.w > 0 && !(c.e.once && ctx.decided.has(c.e.id)),
  )
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
