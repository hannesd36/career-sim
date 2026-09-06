import { rarityOf, RARITY_ORDER, type Rarity } from './rarity'
import { totals } from './career'
import type { Career } from './types'

/**
 * Moments worth stopping for inside a career that is still being played,
 * as opposed to the trophies and honours that already interrupt a season on
 * their own. Nothing here is stored on the career: every one of them is
 * derived from the history that is already there, by comparing the totals
 * before a season to the totals after it. That means a milestone can be
 * asked about any season, at any time, including one played five clicks ago
 * in a single blitz batch, without the engine having to remember anything.
 */
export type MilestoneId =
  | 'first-goal'
  | 'fifty-goals'
  | 'century-goals'
  | 'double-century-goals'
  | 'fifty-apps'
  | 'century-apps'
  | 'double-century-apps'
  | 'first-cap'
  | 'ten-caps'
  | 'fifty-caps'
  | 'first-trophy'
  | Rarity

function totalsThrough(career: Career, count: number): ReturnType<typeof totals> {
  return totals({ ...career, history: career.history.slice(0, count) })
}

/**
 * What was crossed by the season at this index, comparing the totals up to
 * and including it against the totals just before it. A banned season earns
 * nothing: nobody stops to celebrate a suspension.
 */
export function detectMilestones(career: Career, seasonIndex: number): MilestoneId[] {
  const record = career.history[seasonIndex]
  if (!record || record.banned) return []

  const before = totalsThrough(career, seasonIndex)
  const after = totalsThrough(career, seasonIndex + 1)
  const hit: MilestoneId[] = []

  const cross = (id: MilestoneId, b: number, a: number, threshold: number) => {
    if (b < threshold && a >= threshold) hit.push(id)
  }
  cross('first-goal', before.goals, after.goals, 1)
  cross('fifty-goals', before.goals, after.goals, 50)
  cross('century-goals', before.goals, after.goals, 100)
  cross('double-century-goals', before.goals, after.goals, 200)
  cross('fifty-apps', before.apps, after.apps, 50)
  cross('century-apps', before.apps, after.apps, 100)
  cross('double-century-apps', before.apps, after.apps, 200)
  cross('first-cap', before.natApps, after.natApps, 1)
  cross('ten-caps', before.natApps, after.natApps, 10)
  cross('fifty-caps', before.natApps, after.natApps, 50)

  // trophies won this season vs. the ones already in the cabinet before it
  const trophiesBefore = career.trophies.length - record.trophies.length
  if (trophiesBefore === 0 && record.trophies.length > 0) hit.push('first-trophy')

  // bronze is index 0, so it can never be the "after" side of a forward crossing
  const tierBefore = rarityOf(record.ovrStart)
  const tierAfter = rarityOf(record.ovrEnd)
  if (RARITY_ORDER.indexOf(tierAfter) > RARITY_ORDER.indexOf(tierBefore)) hit.push(tierAfter)

  return hit
}

const TIER_IDS = new Set<string>(RARITY_ORDER)

/**
 * A tier crossing already gets its own banner on the season it happened
 * (`SeasonPanel`'s promotion block), so the per-season chip row skips it and
 * leaves that to keep saying it. The run-wide toast still wants it, though:
 * a blitz click can cross a tier on a season nobody ever scrolls back to.
 */
export const isTierMilestone = (id: MilestoneId): boolean => TIER_IDS.has(id)

/** Every milestone hit across a batch of seasons, in the order they happened. */
export function detectMilestonesForRun(career: Career): MilestoneId[] {
  const out: MilestoneId[] = []
  for (const record of career.lastRun) {
    const idx = career.history.indexOf(record)
    if (idx >= 0) out.push(...detectMilestones(career, idx))
  }
  return out
}
