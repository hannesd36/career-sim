import { CLUBS } from '../data/clubs'
import type { Rng } from './rng'
import type { Club } from './types'

export type CrestDifficulty = 'easy' | 'normal' | 'hard'

export const CREST_DIFFICULTIES: CrestDifficulty[] = ['easy', 'normal', 'hard']

/** How deep into a league's pyramid a round is willing to draw a club from. */
const POOL_TIER: Record<CrestDifficulty, number> = { easy: 1, normal: 2, hard: 99 }

export interface CrestRound {
  club: Club
  options: Club[]
}

/**
 * Clubs with a real crest to show, at or above this difficulty's tier floor.
 * A club with no crest would give itself away as the fallback initials, so it
 * can never be the answer, only wrong company for one.
 */
function pool(difficulty: CrestDifficulty): Club[] {
  const maxTier = POOL_TIER[difficulty]
  return CLUBS.filter((c) => c.badge && c.tier <= maxTier)
}

/**
 * One crest, one right answer hidden among three wrong ones drawn from the
 * same pool, so a round never gives itself away by being the only big name on
 * the screen. Returns null if the difficulty's pool has run too thin to draw
 * four distinct clubs from, which only happens once `exclude` has grown huge.
 */
export function buildCrestRound(
  rng: Rng,
  difficulty: CrestDifficulty,
  exclude: Set<string>,
): CrestRound | null {
  const clubs = pool(difficulty).filter((c) => !exclude.has(c.id))
  if (clubs.length < 4) return null

  const drawn = rng.shuffle(clubs).slice(0, 4)
  const club = drawn[0]
  const options = rng.shuffle(drawn)
  return { club, options }
}
