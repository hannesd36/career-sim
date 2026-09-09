import { NATION_BY_NAME } from '../data/nations'
import { isContinentalYear, isWorldCupYear } from './sim'
import type { Career, SeasonRecord } from './types'

/**
 * The national team, as a moment rather than a fixture list.
 *
 * The brief for this was deliberately narrow: a squad announcement you either
 * are in or are not, once a summer. No qualifying campaign, no tournament
 * bracket, no second manager to keep happy. The simulation already decides how
 * many caps a season produced; all this does is read that number back and say
 * what it meant, which is the part a career remembers.
 *
 * Everything here is derived from the season record. Nothing is stored, so a
 * save written before this existed reads exactly the same way.
 */

export type CallupId =
  | 'first-callup'
  | 'squad-named'
  | 'tournament-squad'
  | 'tournament-missed'
  | 'left-out'
  | 'dropped'
  | 'regular'
  | 'captain-material'
  | 'too-good-to-ignore'
  | 'retired-from-international'

export interface Callup {
  id: CallupId
  season: number
  nation: string
  /** caps that season, for the ones that quote a number */
  caps?: number
  tone: 'good' | 'bad' | 'neutral'
}

/** Was the player anywhere near the shirt this season? */
function inContention(record: SeasonRecord, nationStrength: number): boolean {
  return record.ovrEnd >= nationStrength - 12 && record.apps >= 8
}

/**
 * Reads one season and says what happened with the national team.
 *
 * The order matters: the rarest and largest thing that could have happened is
 * the one reported, so a first cap is never buried under "you played six
 * games".
 */
export function callupFor(
  career: Career,
  record: SeasonRecord,
  previous: SeasonRecord | null,
): Callup | null {
  const player = career.player
  const nation = NATION_BY_NAME[player.nation]
  if (!nation) return null
  if (record.banned) return null

  const season = record.season
  const caps = record.natApps
  const hadBefore = career.history.some((h) => h.season < season && h.natApps > 0)
  const tournament = isWorldCupYear(season) || isContinentalYear(season)
  const base = { season, nation: nation.name, caps }

  // --- the first time ---------------------------------------------------
  if (caps > 0 && !hadBefore) {
    return { ...base, id: 'first-callup', tone: 'good' }
  }

  // --- a tournament summer ----------------------------------------------
  if (tournament) {
    if (caps > 0) return { ...base, id: 'tournament-squad', tone: 'good' }
    if (hadBefore && inContention(record, nation.strength)) {
      return { ...base, id: 'tournament-missed', tone: 'bad' }
    }
  }

  // --- losing the shirt --------------------------------------------------
  if (caps === 0 && hadBefore) {
    const playedLast = (previous?.natApps ?? 0) > 0
    if (playedLast) return { ...base, id: 'dropped', tone: 'bad' }
    // Long gone, and old enough that it is not coming back.
    if (record.age >= 32) return { ...base, id: 'retired-from-international', tone: 'neutral' }
    if (inContention(record, nation.strength)) return { ...base, id: 'left-out', tone: 'bad' }
    return null
  }

  if (caps === 0) {
    // Never capped, but the season was good enough that it is now a question.
    if (!hadBefore && record.ovrEnd >= nation.strength - 2 && record.apps >= 20) {
      return { ...base, id: 'too-good-to-ignore', tone: 'bad' }
    }
    return null
  }

  // --- in the squad ------------------------------------------------------
  if (record.ovrEnd >= nation.strength + 4 && caps >= 6) {
    return { ...base, id: 'captain-material', tone: 'good' }
  }
  if (caps >= 6) return { ...base, id: 'regular', tone: 'good' }
  return { ...base, id: 'squad-named', tone: 'neutral' }
}

/** Every call-up moment across a career, for the retirement screen. */
export function callupHistory(career: Career): Callup[] {
  const out: Callup[] = []
  for (let i = 0; i < career.history.length; i++) {
    const hit = callupFor(career, career.history[i], i > 0 ? career.history[i - 1] : null)
    if (hit) out.push(hit)
  }
  return out
}

/** How a whole international career reads, in one line. */
export type CapsVerdict = 'never' | 'a-few' | 'regular' | 'mainstay' | 'legend'

export function capsVerdict(totalCaps: number): CapsVerdict {
  if (totalCaps === 0) return 'never'
  if (totalCaps < 10) return 'a-few'
  if (totalCaps < 35) return 'regular'
  if (totalCaps < 80) return 'mainstay'
  return 'legend'
}
