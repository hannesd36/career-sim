import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { totals } from './career'
import { isTopFive } from './legacy'
import { isKeeper } from './sim'
import type { Career, SeasonRecord, TrophyId } from './types'

/**
 * The half-dozen years anybody would actually tell you about.
 *
 * A career table has twenty rows in it and every one of them is the same
 * shape, which is why nobody reads one twice. A career *story* has six or
 * eight moments in it, and the difference between the two is only ever the
 * editing. This is the editor: it reads the history that is already there,
 * works out which seasons were the ones, and hands back a line per season with
 * the numbers the sentence needs.
 *
 * Nothing is written to the career. Every highlight is derived, so a save made
 * before any of this existed gets its own story back the first time it is
 * opened, and changing what counts as a moment re-edits every career at once.
 */
export type HighlightId =
  | 'debut'
  | 'first-goal'
  | 'first-clean-sheet'
  | 'first-cap'
  | 'first-trophy'
  | 'continental'
  | 'worldcup'
  | 'ballondor'
  | 'big-move'
  | 'top-five'
  | 'peak'
  | 'surge'
  | 'slump'
  | 'homecoming'
  | 'century'
  | 'century-cs'
  | 'banned'
  | 'farewell'

export interface Highlight {
  id: HighlightId
  season: number
  age: number
  /** filled into the sentence; trophy ids are translated at draw time */
  params: Record<string, string | number>
  /** how loudly it wants to be shown when two land in the same summer */
  weight: number
}

/** How big a jump in squad strength counts as a move that changed a career. */
const BIG_MOVE = 6

/**
 * Every moment in a career, in the order they happened, at most one a season.
 *
 * `limit` is the number of lines the recap has room for. The trimming is done
 * by weight and then put back into chronological order, so a long career loses
 * its quiet years rather than its last decade.
 */
export function highlightsOf(career: Career, limit = 9): Highlight[] {
  const keeper = isKeeper(career.player.position)
  const found: Highlight[] = []
  const add = (h: Highlight) => found.push(h)

  let goals = 0
  let apps = 0
  let cleanSheets = 0
  let caps = 0
  let trophiesBefore = 0
  let previous: SeasonRecord | null = null
  let bestOvr = 0

  const homeCountry = career.player.nation

  for (const s of career.history) {
    const at = { season: s.season, age: s.age }

    if (s.banned) {
      add({ id: 'banned', ...at, params: {}, weight: 70 })
      previous = s
      continue
    }

    // --- the first time each thing happened ------------------------------
    if (apps === 0 && s.apps > 0) {
      add({ id: 'debut', ...at, params: { club: s.clubName }, weight: 95 })
    }
    if (!keeper && goals === 0 && s.goals > 0) {
      add({ id: 'first-goal', ...at, params: { club: s.clubName }, weight: 72 })
    }
    if (keeper && cleanSheets === 0 && s.cleanSheets > 0) {
      add({ id: 'first-clean-sheet', ...at, params: { club: s.clubName }, weight: 72 })
    }
    if (caps === 0 && s.natApps > 0) {
      add({ id: 'first-cap', ...at, params: {}, weight: 88 })
    }

    // --- silverware -------------------------------------------------------
    for (const tr of s.trophies) {
      if (tr.id === 'worldcup') {
        add({ id: 'worldcup', ...at, params: {}, weight: 100 })
      } else if (tr.id === 'ballondor') {
        add({ id: 'ballondor', ...at, params: {}, weight: 99 })
      } else if (tr.id === 'continental') {
        add({ id: 'continental', ...at, params: { club: s.clubName }, weight: 97 })
      }
    }
    if (trophiesBefore === 0 && s.trophies.length > 0) {
      const first = s.trophies[0]
      add({
        id: 'first-trophy',
        ...at,
        params: { club: s.clubName, trophy: first.id as TrophyId },
        weight: 90,
      })
    }

    // --- the moves --------------------------------------------------------
    if (previous && previous.clubId !== s.clubId) {
      const from = CLUB_BY_ID[previous.clubId]
      const to = CLUB_BY_ID[s.clubId]
      const wasTopFive = isTopFive(previous.leagueId)
      if (from && to && to.strength - from.strength >= BIG_MOVE) {
        add({ id: 'big-move', ...at, params: { club: s.clubName }, weight: 80 })
      }
      if (!wasTopFive && isTopFive(s.leagueId)) {
        const league = LEAGUE_BY_ID[s.leagueId]
        add({
          id: 'top-five',
          ...at,
          params: { club: s.clubName, league: league?.name ?? '' },
          weight: 78,
        })
      }
      // Going home late is the kind of thing a career gets remembered for.
      const country = LEAGUE_BY_ID[s.leagueId]?.country
      const leftHome = career.history.some(
        (older) => older.season < s.season && LEAGUE_BY_ID[older.leagueId]?.country !== homeCountry,
      )
      if (country === homeCountry && leftHome && s.age >= 28) {
        add({ id: 'homecoming', ...at, params: { club: s.clubName }, weight: 76 })
      }
    }

    // --- the round numbers ------------------------------------------------
    const scored = keeper ? cleanSheets : goals
    const after = keeper ? cleanSheets + s.cleanSheets : goals + s.goals
    for (const mark of [100, 200, 300, 400, 500]) {
      if (scored < mark && after >= mark) {
        add({
          id: keeper ? 'century-cs' : 'century',
          ...at,
          params: { n: mark },
          weight: 66 + mark / 100,
        })
      }
    }

    // --- what the season did to the rating --------------------------------
    const delta = s.ovrEnd - s.ovrStart
    if (delta >= 6) add({ id: 'surge', ...at, params: { n: delta, ovr: s.ovrEnd }, weight: 55 })
    if (delta <= -5) add({ id: 'slump', ...at, params: { n: -delta, ovr: s.ovrEnd }, weight: 52 })

    goals += s.goals
    apps += s.apps
    cleanSheets += s.cleanSheets
    caps += s.natApps
    trophiesBefore += s.trophies.length
    bestOvr = Math.max(bestOvr, s.ovrEnd)
    previous = s
  }

  // --- the top of the mountain, marked once -------------------------------
  const played = career.history.filter((s) => !s.banned)
  if (played.length >= 3 && bestOvr > 0) {
    const peakSeason = played.find((s) => s.ovrEnd === bestOvr)
    if (peakSeason) {
      add({
        id: 'peak',
        season: peakSeason.season,
        age: peakSeason.age,
        params: { ovr: bestOvr },
        weight: 93,
      })
    }
  }

  // --- and the end of it --------------------------------------------------
  const last = career.history[career.history.length - 1]
  if (last && (career.phase === 'retired' || career.player.retired)) {
    add({
      id: 'farewell',
      season: last.season,
      age: last.age + 1,
      params: { club: last.clubName },
      weight: 94,
    })
  }

  return trim(found, limit)
}

/**
 * One line a season, and no more lines than there is room for.
 *
 * Two things worth saying about the same summer is common — you win your first
 * league and cross a hundred goals doing it — and printing both makes a
 * timeline read like a table again. The louder one keeps the year.
 */
function trim(all: Highlight[], limit: number): Highlight[] {
  const bySeason = new Map<number, Highlight>()
  for (const h of all) {
    const held = bySeason.get(h.season)
    if (!held || h.weight > held.weight) bySeason.set(h.season, h)
  }
  return [...bySeason.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .sort((a, b) => a.season - b.season)
}

/**
 * The single line a career would be remembered by, if it only got one.
 *
 * Used by the recap and by the hall of fame, so the same career is described
 * the same way wherever it is shown.
 */
export function greatestMoment(career: Career): Highlight | null {
  const all = highlightsOf(career, 40)
  if (!all.length) return null
  // A debut is only the story of a career that never got anywhere else.
  const meaningful = all.filter((h) => h.id !== 'debut' && h.id !== 'farewell')
  const pool = meaningful.length ? meaningful : all
  return pool.reduce((best, h) => (h.weight > best.weight ? h : best))
}

/** The rating a career actually reached, kept next to the highlights for it. */
export function peakOf(career: Career): number {
  return totals(career).peakOvr
}
