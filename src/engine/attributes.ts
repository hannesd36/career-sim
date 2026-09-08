import { Rng, clamp } from './rng'
import type { Position } from './types'

/**
 * The detailed mode's attributes, the full FIFA set: twenty nine for an
 * outfielder, five for a keeper.
 *
 * How this hangs together, because it matters if you touch it:
 *
 * The OVR is still what the simulation runs on. Nothing in here feeds back into
 * a season except through `shapeBonus`, and that is deliberately small. The
 * attributes are the *shape* of a player underneath his rating: two strikers on
 * 78 can be a poacher and a target man, and training decides which one you turn
 * into. Age reshapes without asking.
 *
 * So the budget is set by the OVR and the attributes are fitted into it. That
 * way the detailed mode can never drift out of step with the simple one, and a
 * career upgraded halfway through gets attributes that match what it already
 * achieved.
 */

export type AttrId =
  // pace
  | 'acceleration'
  | 'sprintSpeed'
  // shooting
  | 'positioning'
  | 'finishing'
  | 'shotPower'
  | 'longShots'
  | 'volleys'
  | 'penalties'
  // passing
  | 'vision'
  | 'crossing'
  | 'freeKick'
  | 'shortPassing'
  | 'longPassing'
  | 'curve'
  // dribbling
  | 'agility'
  | 'balance'
  | 'reactions'
  | 'ballControl'
  | 'dribbling'
  | 'composure'
  // defending
  | 'interceptions'
  | 'headingAccuracy'
  | 'defAwareness'
  | 'standingTackle'
  | 'slidingTackle'
  // physical
  | 'jumping'
  | 'stamina'
  | 'strength'
  | 'aggression'
  // goalkeeping
  | 'gkDiving'
  | 'gkHandling'
  | 'gkKicking'
  | 'gkPositioning'
  | 'gkReflexes'

export type Facet =
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'physical'
  | 'goalkeeping'

export const FACETS: Facet[] = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
]

/** A keeper trains the one facet that is his, split five ways underneath. */
export const GK_FACETS: Facet[] = ['goalkeeping', 'passing', 'physical']

export const ATTRS_BY_FACET: Record<Facet, AttrId[]> = {
  pace: ['acceleration', 'sprintSpeed'],
  shooting: ['positioning', 'finishing', 'shotPower', 'longShots', 'volleys', 'penalties'],
  passing: ['vision', 'crossing', 'freeKick', 'shortPassing', 'longPassing', 'curve'],
  dribbling: ['agility', 'balance', 'reactions', 'ballControl', 'dribbling', 'composure'],
  defending: [
    'interceptions',
    'headingAccuracy',
    'defAwareness',
    'standingTackle',
    'slidingTackle',
  ],
  physical: ['jumping', 'stamina', 'strength', 'aggression'],
  goalkeeping: ['gkDiving', 'gkHandling', 'gkKicking', 'gkPositioning', 'gkReflexes'],
}

export const OUTFIELD_ATTRS: AttrId[] = [
  ...ATTRS_BY_FACET.pace,
  ...ATTRS_BY_FACET.shooting,
  ...ATTRS_BY_FACET.passing,
  ...ATTRS_BY_FACET.dribbling,
  ...ATTRS_BY_FACET.defending,
  ...ATTRS_BY_FACET.physical,
]

export const GK_ATTRS: AttrId[] = [
  ...ATTRS_BY_FACET.goalkeeping,
  'reactions',
  'composure',
  'jumping',
  'strength',
  'shortPassing',
  'longPassing',
]

export type Attributes = Partial<Record<AttrId, number>>

/** Which attributes a position actually carries. */
export function attrsFor(position: Position): AttrId[] {
  return position === 'GK' ? GK_ATTRS : OUTFIELD_ATTRS
}

/** Which facets a position trains. */
export function facetsFor(position: Position): Facet[] {
  return position === 'GK' ? GK_FACETS : FACETS
}

// ---------------------------------------------------------------------------
// what each position is made of
// ---------------------------------------------------------------------------

/**
 * How much of a position's rating each facet carries. These are weights, not
 * percentages; they get normalised. A winger lives on pace and dribbling, a
 * centre-back on defending and physique, and everybody needs some passing.
 */
const POSITION_FACETS: Record<Position, Partial<Record<Facet, number>>> = {
  GK: { goalkeeping: 8, passing: 1, physical: 1 },
  CB: { defending: 5, physical: 3, pace: 1.5, passing: 1.5, dribbling: 1 },
  LB: { defending: 3, pace: 3, physical: 2, passing: 2.5, dribbling: 1.5 },
  RB: { defending: 3, pace: 3, physical: 2, passing: 2.5, dribbling: 1.5 },
  CDM: { defending: 4, passing: 3, physical: 3, dribbling: 1.5, pace: 1 },
  CM: { passing: 4, dribbling: 3, defending: 2, physical: 2, pace: 1.5, shooting: 1.5 },
  CAM: { passing: 4, dribbling: 4, shooting: 3, pace: 1.5, physical: 1 },
  LW: { pace: 4, dribbling: 4, passing: 2.5, shooting: 2.5, physical: 1 },
  RW: { pace: 4, dribbling: 4, passing: 2.5, shooting: 2.5, physical: 1 },
  ST: { shooting: 5, pace: 3, physical: 2.5, dribbling: 2, passing: 1 },
}

/** Normalised facet weights for a position, summing to one. */
export function facetWeights(position: Position): Partial<Record<Facet, number>> {
  const raw = POSITION_FACETS[position]
  const total = Object.values(raw).reduce((a, b) => a + (b ?? 0), 0)
  const out: Partial<Record<Facet, number>> = {}
  for (const [facet, weight] of Object.entries(raw)) {
    out[facet as Facet] = (weight ?? 0) / total
  }
  return out
}

/**
 * How each attribute answers to age. Plus one keeps improving into the
 * thirties, minus one is the first thing to go. This is the whole reason an
 * old player still has a career: the legs went, the head did not.
 */
const AGE_BIAS: Record<AttrId, number> = {
  acceleration: -1,
  sprintSpeed: -1,
  agility: -0.9,
  balance: -0.5,
  jumping: -0.8,
  stamina: -0.7,
  strength: 0.1,
  aggression: 0.2,
  reactions: -0.2,
  ballControl: 0.3,
  dribbling: -0.3,
  composure: 1,
  vision: 0.9,
  positioning: 0.9,
  defAwareness: 1,
  interceptions: 0.7,
  shortPassing: 0.7,
  longPassing: 0.8,
  crossing: 0.2,
  curve: 0.4,
  freeKick: 0.8,
  penalties: 0.7,
  finishing: 0.3,
  shotPower: -0.1,
  longShots: 0.2,
  volleys: 0.1,
  headingAccuracy: 0.1,
  standingTackle: 0.5,
  slidingTackle: -0.2,
  gkDiving: -0.4,
  gkHandling: 0.4,
  gkKicking: 0.2,
  gkPositioning: 1,
  gkReflexes: -0.2,
}

// ---------------------------------------------------------------------------
// building a set
// ---------------------------------------------------------------------------

/**
 * The rating an attribute set comes out at for a position: the weighted mean of
 * its facets. This is the inverse of `generate`, and the two have to agree or
 * the shape bonus drifts.
 */
export function ratingOf(attrs: Attributes, position: Position): number {
  const weights = facetWeights(position)
  let sum = 0
  let used = 0
  for (const [facet, weight] of Object.entries(weights)) {
    const ids = ATTRS_BY_FACET[facet as Facet]
    const vals = ids.map((id) => attrs[id]).filter((v): v is number => typeof v === 'number')
    if (!vals.length) continue
    sum += (vals.reduce((a, b) => a + b, 0) / vals.length) * (weight ?? 0)
    used += weight ?? 0
  }
  return used > 0 ? sum / used : 0
}

/**
 * Builds a set of attributes around a rating. The facets a position lives on
 * come out above the rating, the ones it does not come out below, and every
 * attribute gets a little noise so two players on the same rating are not the
 * same player.
 */
export function generate(ovr: number, position: Position, rng: Rng): Attributes {
  const weights = facetWeights(position)
  const ids = attrsFor(position)
  const attrs: Attributes = {}

  // The strongest facet sits about eight above the rating, an unused one about
  // sixteen below, scaled so a weak player is not handed a 20 anywhere.
  const spread = clamp(ovr * 0.32, 10, 26)

  for (const id of ids) {
    const facet = facetOf(id)
    const weight = weights[facet] ?? 0
    const lean = (weight - 0.2) * 2.6
    const base = ovr + lean * spread
    attrs[id] = clamp(Math.round(base + rng.gauss(0, 4.5)), 12, 99)
  }

  return fit(attrs, ovr, position)
}

/** Which facet an attribute belongs to. */
export function facetOf(id: AttrId): Facet {
  for (const facet of Object.keys(ATTRS_BY_FACET) as Facet[]) {
    if (ATTRS_BY_FACET[facet].includes(id)) return facet
  }
  return 'physical'
}

/**
 * Slides a whole set up or down until it reads as the given rating. Keeps the
 * shape and only moves the level, which is what lets the OVR stay in charge
 * while training and age decide what kind of player carries it.
 */
export function fit(attrs: Attributes, target: number, position: Position): Attributes {
  const out: Attributes = { ...attrs }
  for (let pass = 0; pass < 24; pass++) {
    const gap = target - ratingOf(out, position)
    if (Math.abs(gap) < 0.05) break
    for (const id of Object.keys(out) as AttrId[]) {
      out[id] = clamp(Math.round((out[id] ?? 0) + gap), 12, 99)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// a season's worth of change
// ---------------------------------------------------------------------------

/**
 * Reshapes a set for one season, then refits it to the new rating.
 *
 * Three things move it, and they are the three the player was promised: the
 * facet he chose to train, the shape his position pulls him towards on its own,
 * and what age does whether he likes it or not.
 */
export function advance(
  attrs: Attributes,
  opts: {
    position: Position
    age: number
    ovrAfter: number
    /** the facet trained over the summer, if the player picked one */
    training?: Facet | null
    /** how strongly the club's setup pulls him towards his position's shape */
    clubPull?: number
    rng: Rng
  },
): Attributes {
  const { position, age, ovrAfter, training, rng } = opts
  const weights = facetWeights(position)
  const out: Attributes = { ...attrs }

  for (const id of Object.keys(out) as AttrId[]) {
    const facet = facetOf(id)
    let move = 0

    // What you worked on over the summer. Spread across the facet's attributes,
    // so picking "shooting" is not a cheat code for finishing alone.
    if (training && facet === training) move += 2.4 + rng.gauss(0, 0.6)

    // Playing the position drags you towards its shape whether you train or not.
    const pull = opts.clubPull ?? 1
    move += ((weights[facet] ?? 0) - 0.16) * 1.6 * pull

    // Age. Nothing much happens before the late twenties, then the bias decides
    // who keeps what.
    if (age >= 27) {
      const severity = (age - 26) * 0.34
      move += -severity * (1 - AGE_BIAS[id]) * 0.5
    } else if (age <= 21) {
      move += 0.8
    }

    move += rng.gauss(0, 0.7)
    out[id] = clamp(Math.round((out[id] ?? 0) + move), 12, 99)
  }

  return fit(out, ovrAfter, position)
}

/**
 * How well a set fits the position it is played in, as a small rating nudge.
 * A striker who trained nothing but defending is worth slightly less than his
 * raw numbers say, and the other way round. Deliberately capped tight: this is
 * a lean on the simulation, not a second one running underneath it.
 */
export function shapeBonus(attrs: Attributes, position: Position): number {
  const weights = facetWeights(position)
  const ids = attrsFor(position)
  const all = ids.map((id) => attrs[id] ?? 0)
  if (!all.length) return 0
  const mean = all.reduce((a, b) => a + b, 0) / all.length

  // Weighted mean against flat mean: positive when the strength sits where the
  // position wants it.
  let weighted = 0
  let used = 0
  for (const [facet, weight] of Object.entries(weights)) {
    const vals = ATTRS_BY_FACET[facet as Facet]
      .map((id) => attrs[id])
      .filter((v): v is number => typeof v === 'number')
    if (!vals.length) continue
    weighted += (vals.reduce((a, b) => a + b, 0) / vals.length) * (weight ?? 0)
    used += weight ?? 0
  }
  if (!used) return 0
  return clamp((weighted / used - mean) * 0.18, -2, 2)
}

/** The facet averages, which is what a card shows rather than all twenty nine. */
export function facetSummary(attrs: Attributes, position: Position): { facet: Facet; value: number }[] {
  return facetsFor(position).map((facet) => {
    const vals = ATTRS_BY_FACET[facet]
      .map((id) => attrs[id])
      .filter((v): v is number => typeof v === 'number')
    return {
      facet,
      value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    }
  })
}

/** The three highest and three lowest, for a quick read of a player. */
export function standout(attrs: Attributes, position: Position) {
  const ids = attrsFor(position).filter((id) => typeof attrs[id] === 'number')
  const sorted = [...ids].sort((a, b) => (attrs[b] ?? 0) - (attrs[a] ?? 0))
  return { best: sorted.slice(0, 3), worst: sorted.slice(-3).reverse() }
}
