import { totals } from './career'
import { openChallenges, readChallenges, type ChallengeId, type ChallengeLog } from './challenges'
import { careerScore } from './legacy'
import type { Career } from './types'

/**
 * The one reason to start another career.
 *
 * A finished career that ends in three buttons and a table is a finished
 * career. A finished career that ends in a sentence saying what is still out
 * there is the next one, which is the whole difference between a simulator and
 * a game you come back to. So this returns exactly one thing — never a list,
 * never a wall of suggestions — chosen by what this particular career just did.
 *
 * The order is deliberate: beating your own record is the strongest pull there
 * is, and an untouched daily is the weakest, because it is the one that will
 * still be there tomorrow.
 */
export type PromptId = 'record' | 'beat-best' | 'challenge' | 'daily' | 'first'

export interface NextPrompt {
  id: PromptId
  /** filled into the sentence */
  params: Record<string, string | number>
  /** the challenge being pointed at, when that is what this is */
  challenge?: ChallengeId
}

export interface PromptInput {
  career: Career
  /** every save, this one included */
  careers: Career[]
  log?: ChallengeLog
  /** whether today's career has already been finished */
  dailyDone?: boolean
}

export function nextPrompt({
  career,
  careers,
  log = readChallenges(),
  dailyDone = false,
}: PromptInput): NextPrompt {
  const others = careers.filter((c) => c.id !== career.id && c.history.length >= 3)
  const mine = totals(career).peakOvr
  const score = careerScore(career)

  // Did this one beat everything that came before it?
  if (others.length) {
    const best = others.reduce((top, c) => (careerScore(c) > careerScore(top) ? c : top))
    const bestPeak = totals(best).peakOvr
    if (score > careerScore(best)) {
      return { id: 'record', params: { ovr: mine } }
    }
    if (bestPeak > mine) {
      return { id: 'beat-best', params: { ovr: bestPeak, name: best.player.name } }
    }
  } else {
    return { id: 'first', params: { ovr: mine } }
  }

  const [next] = openChallenges(log, null, 1)
  if (next) return { id: 'challenge', params: {}, challenge: next }

  if (!dailyDone) return { id: 'daily', params: {} }
  return { id: 'first', params: { ovr: mine } }
}
