import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { cohortRank } from './cohort'
import { judgeObjective, objectiveOf } from './objectives'
import { Rng } from './rng'
import { isKeeper } from './sim'
import type { Career, SeasonRecord } from './types'

/**
 * What the papers made of the season.
 *
 * A career is a column of numbers until somebody else says them out loud. The
 * press is the cheapest possible narrator: it reads the season that was just
 * played, picks the two or three facts a reporter would actually lead on, and
 * says them in the register of a match report rather than a tabloid.
 *
 * As everywhere else in the engine, nothing here is a sentence — a headline is
 * an id and the numbers that go in it, and the wording lives in the dictionary
 * so both languages read like they were written rather than translated.
 */
export type HeadlineId =
  | 'title'
  | 'silverware'
  | 'haul'
  | 'assists'
  | 'shutouts'
  | 'objective-met'
  | 'objective-missed'
  | 'breakthrough'
  | 'stalled'
  | 'injury'
  | 'relegated'
  | 'survived'
  | 'caught'
  | 'banned'
  | 'debut'
  | 'individual'
  | 'benched'
  | 'veteran'
  | 'best-of-generation'
  | 'linked'
  | 'loan-return'

export interface Headline {
  id: HeadlineId
  params: Record<string, string | number>
  tone: 'good' | 'bad' | 'neutral'
}

/**
 * Every line the season could carry, strongest first. Only the top few are
 * printed: a season that did six notable things is a season whose report
 * should lead on the two that mattered, not list all six.
 */
export function headlinesFor(career: Career, record: SeasonRecord): Headline[] {
  const club = CLUB_BY_ID[record.clubId]
  const league = LEAGUE_BY_ID[record.leagueId]
  const clubName = record.clubName
  const keeper = isKeeper(career.player.position)
  const out: { headline: Headline; weight: number }[] = []
  const say = (
    id: HeadlineId,
    weight: number,
    tone: Headline['tone'],
    params: Headline['params'] = {},
  ) => out.push({ headline: { id, params, tone }, weight })

  if (record.banned) {
    say('banned', 100, 'bad', { name: career.player.name })
    return [out[0].headline]
  }

  // --- what was won -----------------------------------------------------
  const titles = record.trophies.filter((t) => t.id === 'league')
  const individual = record.trophies.filter((t) =>
    ['ballondor', 'goldenboot', 'playmaker', 'goldenglove', 'goldenboy', 'tots'].includes(t.id),
  )
  const team = record.trophies.filter(
    (t) =>
      ![
        'ballondor',
        'goldenboot',
        'playmaker',
        'goldenglove',
        'goldenboy',
        'tots',
        'league',
      ].includes(t.id),
  )
  if (titles.length) say('title', 95, 'good', { club: clubName, league: league?.name ?? '' })
  for (const t of team) say('silverware', 88, 'good', { club: clubName, trophy: t.id })
  for (const t of individual)
    say('individual', 92, 'good', { name: career.player.name, trophy: t.id })

  // --- what was produced ------------------------------------------------
  const goals = record.goals + record.natGoals
  const assists = record.assists + record.natAssists
  const shutouts = record.cleanSheets + record.natCleanSheets
  if (!keeper && goals >= 15) say('haul', 60 + goals, 'good', { name: career.player.name, goals })
  if (assists >= 12) say('assists', 55 + assists, 'good', { name: career.player.name, assists })
  if (keeper && shutouts >= 12)
    say('shutouts', 60 + shutouts, 'good', { name: career.player.name, n: shutouts })

  // --- the club's own verdict ------------------------------------------
  const objective = objectiveOf(career, record)
  const verdict = judgeObjective(objective, record)
  if (objective && verdict === 'met') say('objective-met', 50, 'good', { club: clubName })
  if (objective && verdict === 'missed') say('objective-missed', 58, 'bad', { club: clubName })

  // --- how the season went ----------------------------------------------
  const jump = record.ovrEnd - record.ovrStart
  if (jump >= 5)
    say('breakthrough', 70, 'good', { name: career.player.name, n: jump, ovr: record.ovrEnd })
  else if (jump <= -3 && record.age >= 31)
    say('stalled', 52, 'bad', { name: career.player.name, ovr: record.ovrEnd })
  if (record.gamesMissedInjured >= 12)
    say('injury', 66, 'bad', { name: career.player.name, n: record.gamesMissedInjured })

  if (league) {
    const bottom = league.teams - 2
    if (record.leaguePosition >= bottom) say('relegated', 72, 'bad', { club: clubName })
    else if (record.leaguePosition >= league.teams - 5 && record.leaguePosition < bottom)
      say('survived', 40, 'neutral', { club: clubName })
  }

  if (record.caught) say('caught', 99, 'bad', { name: career.player.name })

  // first cap: no international minutes before this season
  const idx = career.history.indexOf(record)
  if (idx >= 0 && record.natApps > 0) {
    const capsBefore = career.history.slice(0, idx).reduce((s, r) => s + r.natApps, 0)
    if (capsBefore === 0)
      say('debut', 80, 'good', { name: career.player.name, nation: career.player.nation })
  }

  if (record.apps <= 6 && record.age >= 20)
    say('benched', 62, 'bad', { name: career.player.name, club: clubName })
  if (record.age >= 36 && record.apps >= 20)
    say('veteran', 45, 'good', { name: career.player.name, age: record.age })

  // Where the year group stands, but only once it means something: at
  // seventeen everybody is top of a table nobody has played in yet.
  if (idx >= 3) {
    const { rank } = cohortRank({ ...career, player: { ...career.player, age: record.age + 1 } })
    if (rank === 1) say('best-of-generation', 76, 'good', { name: career.player.name })
  }

  // A good season at a club below your level is a summer of speculation.
  if (
    club &&
    league &&
    record.rating >= 7.2 &&
    record.apps >= 15 &&
    record.ovrEnd > club.strength + 3
  ) {
    say('linked', 44, 'neutral', { name: career.player.name, club: clubName })
  }
  if (record.onLoan) say('loan-return', 30, 'neutral', { name: career.player.name, club: clubName })

  if (!out.length) return []

  // A stable order, then a little shuffle among equals so two similar seasons
  // do not read as the same page twice.
  const rng = new Rng((career.seed ^ (record.season * 7919)) >>> 0)
  out.sort((a, b) => b.weight - a.weight || rng.next() - 0.5)
  return out.slice(0, 3).map((o) => o.headline)
}
