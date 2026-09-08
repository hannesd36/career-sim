import type { AttrId, Attributes } from './attributes'
import { Rng, clamp } from './rng'

/**
 * Injuries that leave something behind.
 *
 * In the simple mode an injury is a number of games missed and nothing else.
 * Here it has a name, a length, and for the bad ones a mark on the attributes
 * it damaged. The point is that a career carries its history in its body: a
 * winger who did his knee at twenty six is a different player afterwards, and
 * you can see where it happened.
 */

export type InjuryId =
  | 'knock'
  | 'hamstring'
  | 'ankle'
  | 'groin'
  | 'shoulder'
  | 'back'
  | 'metatarsal'
  | 'knee'
  | 'cruciate'
  | 'achilles'

export interface InjuryKind {
  id: InjuryId
  /** how likely this one is, relative to the others */
  weight: number
  /** games missed, before anything modifies it */
  games: [number, number]
  /** what it permanently takes, if it takes anything */
  lasting?: { attrs: AttrId[]; amount: number; chance: number }
  /** raises the chance of the same thing happening again */
  recurrence: number
}

export const INJURY_KINDS: InjuryKind[] = [
  { id: 'knock', weight: 30, games: [1, 3], recurrence: 0 },
  {
    id: 'hamstring',
    weight: 20,
    games: [3, 8],
    lasting: { attrs: ['sprintSpeed', 'acceleration'], amount: 1, chance: 0.25 },
    recurrence: 0.35,
  },
  { id: 'ankle', weight: 14, games: [4, 10], recurrence: 0.2 },
  { id: 'groin', weight: 10, games: [4, 12], recurrence: 0.3 },
  { id: 'shoulder', weight: 6, games: [3, 9], recurrence: 0.1 },
  {
    id: 'back',
    weight: 6,
    games: [5, 14],
    lasting: { attrs: ['stamina', 'jumping'], amount: 1, chance: 0.3 },
    recurrence: 0.4,
  },
  {
    id: 'metatarsal',
    weight: 5,
    games: [10, 20],
    lasting: { attrs: ['agility', 'balance'], amount: 1, chance: 0.2 },
    recurrence: 0.15,
  },
  {
    id: 'knee',
    weight: 5,
    games: [12, 26],
    lasting: { attrs: ['acceleration', 'agility', 'balance'], amount: 2, chance: 0.55 },
    recurrence: 0.45,
  },
  {
    id: 'cruciate',
    weight: 2,
    games: [26, 40],
    lasting: {
      attrs: ['acceleration', 'sprintSpeed', 'agility', 'balance', 'jumping'],
      amount: 3,
      chance: 0.9,
    },
    recurrence: 0.5,
  },
  {
    id: 'achilles',
    weight: 2,
    games: [24, 38],
    lasting: {
      attrs: ['acceleration', 'sprintSpeed', 'jumping', 'stamina'],
      amount: 3,
      chance: 0.85,
    },
    recurrence: 0.4,
  },
]

export const INJURY_BY_ID: Record<InjuryId, InjuryKind> = Object.fromEntries(
  INJURY_KINDS.map((k) => [k.id, k]),
) as Record<InjuryId, InjuryKind>

/** One injury, as it goes into the record. */
export interface Injury {
  id: InjuryId
  season: number
  games: number
  /** what it permanently cost, if anything */
  lasting?: { attrs: AttrId[]; amount: number }
}

export interface Body {
  /** every injury this career has had */
  history: Injury[]
  /**
   * How brittle this player is, 0.7 to 1.6. Set once when the career starts and
   * nudged by what happens to him. Never shown as a number, only as a word.
   */
  proneness: number
}

export function newBody(rng: Rng): Body {
  return { history: [], proneness: clamp(rng.gauss(1, 0.16), 0.7, 1.6) }
}

/**
 * Rolls a season's injury.
 *
 * Age, how brittle the player is, and whatever the physio is worth all feed the
 * chance. Having done a thing before makes doing it again more likely, which is
 * what makes a hamstring career feel like a hamstring career.
 */
export function rollInjury(
  body: Body,
  opts: { age: number; season: number; risk: number; recovery: number; rng: Rng },
): Injury | null {
  const { age, season, risk, recovery, rng } = opts
  const chance = clamp(
    (0.2 + Math.max(0, age - 29) * 0.035) * body.proneness * risk,
    0.02,
    0.85,
  )
  if (!rng.chance(chance)) return null

  // Weight the draw, then lean it towards anything already in the history.
  const weights = INJURY_KINDS.map((k) => {
    const had = body.history.filter((h) => h.id === k.id).length
    return k.weight * (1 + had * k.recurrence)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng.next() * total
  let kind = INJURY_KINDS[0]
  for (let i = 0; i < INJURY_KINDS.length; i++) {
    roll -= weights[i]
    if (roll <= 0) {
      kind = INJURY_KINDS[i]
      break
    }
  }

  const raw = rng.int(kind.games[0], kind.games[1])
  const games = Math.max(1, Math.round(raw * recovery))

  const injury: Injury = { id: kind.id, season, games }
  if (kind.lasting && rng.chance(kind.lasting.chance)) {
    injury.lasting = { attrs: kind.lasting.attrs, amount: kind.lasting.amount }
  }
  return injury
}

/** Writes an injury into the body, nudging how brittle the player now is. */
export function record(body: Body, injury: Injury): Body {
  const bump = injury.games >= 20 ? 0.09 : injury.games >= 8 ? 0.04 : 0.01
  return {
    history: [...body.history, injury],
    proneness: clamp(body.proneness + bump, 0.7, 1.9),
  }
}

/**
 * Takes what an injury permanently took.
 *
 * Applied to the attributes *after* they have been refitted to the rating, so
 * the loss is real rather than immediately squeezed back out by the fit.
 */
export function applyLasting(attrs: Attributes, injury: Injury): Attributes {
  if (!injury.lasting) return attrs
  const out = { ...attrs }
  for (const id of injury.lasting.attrs) {
    if (typeof out[id] === 'number') {
      out[id] = clamp((out[id] ?? 0) - injury.lasting.amount, 12, 99)
    }
  }
  return out
}

/** Everything a career has permanently lost to injury, by attribute. */
export function lastingTotals(body: Body): Partial<Record<AttrId, number>> {
  const out: Partial<Record<AttrId, number>> = {}
  for (const injury of body.history) {
    if (!injury.lasting) continue
    for (const id of injury.lasting.attrs) {
      out[id] = (out[id] ?? 0) + injury.lasting.amount
    }
  }
  return out
}

export type Glass = 'iron' | 'sturdy' | 'normal' | 'fragile' | 'glass'

/**
 * How brittle a player looks from outside. A word, never the number, because
 * the number is not something anybody in football actually knows.
 */
export function glassLevel(body: Body): Glass {
  const seasons = new Set(body.history.map((i) => i.season)).size
  const heavy = body.history.filter((i) => i.games >= 15).length
  const score = body.proneness + heavy * 0.12 + (seasons > 6 ? 0.1 : 0)
  if (score < 0.85) return 'iron'
  if (score < 0.98) return 'sturdy'
  if (score < 1.18) return 'normal'
  if (score < 1.4) return 'fragile'
  return 'glass'
}

/** The worst injury a career has had, for the summary screen. */
export function worstInjury(body: Body): Injury | null {
  if (!body.history.length) return null
  return [...body.history].sort((a, b) => b.games - a.games)[0]
}
