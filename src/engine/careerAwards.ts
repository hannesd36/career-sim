import type { Honour } from '../data/legend'
import { clubSpells, totals } from './career'
import { MAJOR_TROPHIES, type Career } from './types'

/**
 * What every career ever played and retired in this browser adds up to.
 *
 * Unlike the quiz cabinet, none of this is written to storage on its own —
 * it is recomputed from `listCareers()` every time the hall of fame is
 * opened. A career that gets deleted drops back out of the count on its own,
 * which is the honest behaviour: nothing here claims progress a save no
 * longer backs up.
 */
export interface CareerCabinetStats {
  careersRetired: number
  bestPeakOvr: number
  totalGoals: number
  totalApps: number
  totalMajors: number
  ballonDors: number
  worldCups: number
  oneClubCareers: number
  longestSeasons: number
  iconCareers: number
  cleanLegends: number
}

const EMPTY: CareerCabinetStats = {
  careersRetired: 0,
  bestPeakOvr: 0,
  totalGoals: 0,
  totalApps: 0,
  totalMajors: 0,
  ballonDors: 0,
  worldCups: 0,
  oneClubCareers: 0,
  longestSeasons: 0,
  iconCareers: 0,
  cleanLegends: 0,
}

/** Ever took the doping storyline, whatever came of it afterwards. */
function everDoped(career: Career): boolean {
  return career.eventLog.some((e) => e.id === 'doping-offer' && e.choice === 'accept')
}

export function computeCabinetStats(careers: Career[]): CareerCabinetStats {
  const retired = careers.filter((c) => c.phase === 'retired')
  if (!retired.length) return { ...EMPTY }

  const stats = { ...EMPTY, careersRetired: retired.length }
  for (const career of retired) {
    const t = totals(career)
    const counts = new Map<string, number>()
    for (const tr of career.trophies) counts.set(tr.id, (counts.get(tr.id) ?? 0) + 1)
    const majors = MAJOR_TROPHIES.reduce((s, id) => s + (counts.get(id) ?? 0), 0)

    stats.bestPeakOvr = Math.max(stats.bestPeakOvr, t.peakOvr)
    stats.totalGoals += t.goals + t.natGoals
    stats.totalApps += t.apps + t.natApps
    stats.totalMajors += majors
    stats.ballonDors += counts.get('ballondor') ?? 0
    stats.worldCups += counts.get('worldcup') ?? 0
    stats.longestSeasons = Math.max(stats.longestSeasons, career.history.length)
    if (t.peakOvr >= 99) stats.iconCareers += 1
    if (clubSpells(career).length === 1) stats.oneClubCareers += 1
    if (!everDoped(career) && t.peakOvr >= 75) stats.cleanLegends += 1
  }
  return stats
}

export interface CareerAward {
  id: string
  art: Honour
  progress: (s: CareerCabinetStats) => { at: number; of: number }
}

const done = (at: number, of: number) => ({ at: Math.min(at, of), of })

export const CAREER_AWARDS: CareerAward[] = [
  { id: 'first-retirement', art: 'goldcup', progress: (s) => done(s.careersRetired, 1) },
  { id: 'veteran', art: 'conference', progress: (s) => done(s.careersRetired, 10) },
  { id: 'platinum-career', art: 'ucl', progress: (s) => done(s.bestPeakOvr >= 90 ? 1 : 0, 1) },
  { id: 'icon-career', art: 'worldcup', progress: (s) => done(s.iconCareers, 1) },
  { id: 'goal-machine', art: 'goldenshoe', progress: (s) => done(s.totalGoals, 500) },
  { id: 'goal-legend', art: 'copa', progress: (s) => done(s.totalGoals, 2000) },
  { id: 'trophy-cabinet', art: 'clubwc', progress: (s) => done(s.totalMajors, 10) },
  { id: 'dynasty', art: 'libertadores', progress: (s) => done(s.totalMajors, 30) },
  { id: 'ballon-dor-collector', art: 'ballondor', progress: (s) => done(s.ballonDors, 3) },
  { id: 'world-champion', art: 'nationsleague', progress: (s) => done(s.worldCups, 1) },
  { id: 'one-club-legend', art: 'goldenboy', progress: (s) => done(s.oneClubCareers, 1) },
  { id: 'marathon-career', art: 'afcon', progress: (s) => done(s.longestSeasons, 20) },
  { id: 'clean-legend', art: 'euro', progress: (s) => done(s.cleanLegends, 1) },
  { id: 'iron-man', art: 'olympics', progress: (s) => done(s.totalApps, 1000) },
]

export const isCareerAwardEarned = (a: CareerAward, s: CareerCabinetStats) => {
  const { at, of } = a.progress(s)
  return at >= of
}

export const careerAwardsEarned = (s: CareerCabinetStats) =>
  CAREER_AWARDS.filter((a) => isCareerAwardEarned(a, s)).length

/** Awards that were not there before and are now, so a retirement can say so. */
export function newlyEarnedCareerAwards(
  before: CareerCabinetStats,
  after: CareerCabinetStats,
): CareerAward[] {
  return CAREER_AWARDS.filter((a) => !isCareerAwardEarned(a, before) && isCareerAwardEarned(a, after))
}
