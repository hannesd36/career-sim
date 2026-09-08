import type { CareerCabinetStats } from './careerAwards'

/**
 * Ways to start a career that are not the ordinary one.
 *
 * Every one of them is a trade rather than a bonus: a bigger head start pays
 * for itself with a shorter peak, a bigger ceiling pays for it with a body
 * that keeps breaking. The point of unlocking one is not to make the next
 * career easier, it is to make the next career a different problem — which is
 * the only kind of unlock worth filling a hall of fame for.
 *
 * The `standard` route is always available and always neutral, so nothing here
 * can make the plain game worse.
 */
export type ModifierId =
  'standard' | 'wonderkid' | 'latebloomer' | 'maverick' | 'ironman' | 'minnow' | 'nomad'

export interface ModifierEffects {
  /** added to the rating a career is created at */
  startOvr: number
  /** added to the hidden ceiling at creation */
  startPotential: number
  /** multiplier on a season that improved the rating */
  growth: number
  /** multiplier on a season that cost rating; above 1 means it costs more */
  decline: number
  /** multiplier on how often a summer brings a decision */
  eventPressure: number
  /** multiplier on the injury risk inside a season */
  injury: number
  /** forces the starting club to be no stronger than this tier (1 = elite) */
  startTierFloor: number | null
}

const NEUTRAL: ModifierEffects = {
  startOvr: 0,
  startPotential: 0,
  growth: 1,
  decline: 1,
  eventPressure: 1,
  injury: 1,
  startTierFloor: null,
}

export interface Modifier {
  id: ModifierId
  effects: ModifierEffects
  /** null for the one that is always there */
  unlock: ((s: CareerCabinetStats) => { at: number; of: number }) | null
}

const at = (have: number, need: number) => ({ at: Math.min(have, need), of: need })

export const MODIFIERS: Modifier[] = [
  { id: 'standard', effects: NEUTRAL, unlock: null },
  {
    // Everything arrives early and leaves early: a career spent at the top
    // from nineteen, and over before most careers have started.
    id: 'wonderkid',
    effects: { ...NEUTRAL, startOvr: 7, startPotential: 5, growth: 1.15, decline: 1.5 },
    unlock: (s) => at(s.careersRetired, 1),
  },
  {
    // The opposite bet. Nothing works for years and then everything does.
    id: 'latebloomer',
    effects: { ...NEUTRAL, startOvr: -5, startPotential: 9, growth: 0.82, decline: 0.55 },
    unlock: (s) => at(s.careersRetired, 3),
  },
  {
    // A career that will not be quiet. Twice the decisions, and every one of
    // them lands on a player who improves faster than he should.
    id: 'maverick',
    effects: { ...NEUTRAL, startPotential: 4, growth: 1.2, decline: 1.25, eventPressure: 2 },
    unlock: (s) => at(s.totalMajors, 5),
  },
  {
    // Never injured, never spectacular.
    id: 'ironman',
    effects: { ...NEUTRAL, growth: 0.92, decline: 0.7, injury: 0.35 },
    unlock: (s) => at(s.totalApps, 400),
  },
  {
    // The hardest start in the game: nobody is watching, and you have to be
    // good enough that somebody has to.
    id: 'minnow',
    effects: { ...NEUTRAL, startOvr: -4, startPotential: 7, growth: 1.1, startTierFloor: 5 },
    unlock: (s) => at(s.bestPeakOvr >= 85 ? 1 : 0, 1),
  },
  {
    // A career that never settles. The summer always brings somebody asking.
    id: 'nomad',
    effects: { ...NEUTRAL, startPotential: 3, eventPressure: 1.5, decline: 0.85 },
    unlock: (s) => at(s.careersRetired, 5),
  },
]

export const MODIFIER_BY_ID = new Map<ModifierId, Modifier>(MODIFIERS.map((m) => [m.id, m]))

export function effectsOf(id: ModifierId | undefined): ModifierEffects {
  return (id && MODIFIER_BY_ID.get(id)?.effects) || NEUTRAL
}

export function isModifierUnlocked(m: Modifier, stats: CareerCabinetStats): boolean {
  if (!m.unlock) return true
  const { at: have, of } = m.unlock(stats)
  return have >= of
}

export function unlockedModifiers(stats: CareerCabinetStats): Modifier[] {
  return MODIFIERS.filter((m) => isModifierUnlocked(m, stats))
}

/** Newly available starts, so finishing a career can announce one. */
export function newlyUnlockedModifiers(
  before: CareerCabinetStats,
  after: CareerCabinetStats,
): Modifier[] {
  return MODIFIERS.filter((m) => !isModifierUnlocked(m, before) && isModifierUnlocked(m, after))
}
