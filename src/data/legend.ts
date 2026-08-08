import type { Position } from '../engine/types'
import { LEAGUE_BY_ID } from './leagues'

/**
 * What a footballer looks like to the quizzes, and the one function that builds
 * one. The roster itself lives next door in `players.ts` and `legends2.ts`; this
 * file is only the shape and the rules, so both rosters can share it without
 * either importing the other.
 *
 * Two rules keep the book honest:
 *   1. Only senior clubs that exist in `clubs.json`, in the order they were
 *      played for. The last one is where the career sits now.
 *   2. Only honours that are unambiguous. "Won the Champions League" is a fact.
 *      "Was world class" is an argument.
 */
export type Honour =
  | 'ucl'
  | 'europa'
  | 'conference'
  | 'libertadores'
  | 'clubwc'
  | 'worldcup'
  | 'euro'
  | 'copa'
  | 'afcon'
  | 'nationsleague'
  | 'olympics'
  | 'goldcup'
  | 'ballondor'
  | 'goldenboy'
  | 'goldenshoe'

export const HONOURS: Honour[] = [
  'ucl',
  'europa',
  'conference',
  'libertadores',
  'clubwc',
  'worldcup',
  'euro',
  'copa',
  'afcon',
  'nationsleague',
  'olympics',
  'goldcup',
  'ballondor',
  'goldenboy',
  'goldenshoe',
]

export interface Legend {
  id: string
  name: string
  nation: string
  position: Position
  born: number
  /** senior clubs in order played for; a return spell appears twice */
  clubs: string[]
  /** every club once, which is what "played for" questions mean */
  careerClubs: string[]
  /** where the career sits now, or finished */
  clubId: string
  leagueIds: string[]
  /** the countries those divisions are played in, which is the travelled bit */
  countries: string[]
  honours: Honour[]
  retired: boolean
  /** spellings the search should also accept */
  alt: string[]
  /** name and alternates, folded down for matching */
  keys: string[]
  /**
   * How well known he is, as the number of Wikipedias that have written him up.
   * Hand-written entries are all famous by definition and sit at a hundred; the
   * generated half carries its real number, which is what keeps a Ligue 2 left
   * back out of the guessing game without keeping him off a grid.
   */
  fame: number
  /** true for the hand-written half, which is checked and carries its honours */
  curated: boolean
  /**
   * Senior clubs the man had in total, including the ones this game has never
   * heard of. Zero means nobody knows, which is the honest answer for most of
   * the generated half and the reason it is never asked "one club his whole
   * career".
   */
  totalClubs: number
}

/** The year an age is measured against, everywhere. */
export const NOW_YEAR = 2026

/** Lowercase, strip accents and anything that is not a letter or a digit. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    // combining marks, so "Özil" and "Ozil" are the same word to type
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[øØ]/g, 'o')
    .replace(/[đĐ]/g, 'd')
    .replace(/[ıİ]/g, 'i')
    .replace(/[ł]/g, 'l')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const slug = (name: string) => fold(name).replace(/ /g, '-')

interface Extra {
  retired?: boolean
  alt?: string[]
}

export function p(
  name: string,
  nation: string,
  position: Position,
  born: number,
  clubs: string,
  honours: Honour[] = [],
  extra: Extra = {},
): Legend {
  const list = clubs.split(' ').filter(Boolean)
  const careerClubs = [...new Set(list)]
  const leagueIds = [...new Set(careerClubs.map((c) => c.split('-')[0]))]
  const alt = extra.alt ?? []
  return {
    id: slug(name),
    name,
    nation,
    position,
    born,
    clubs: list,
    careerClubs,
    clubId: list[list.length - 1],
    leagueIds,
    countries: [...new Set(leagueIds.map((id) => LEAGUE_BY_ID[id]?.country).filter(Boolean))],
    honours,
    retired: extra.retired ?? false,
    alt,
    keys: [fold(name), ...alt.map(fold)],
    fame: 100,
    curated: true,
    totalClubs: careerClubs.length,
  }
}

/**
 * The same thing, built from what a database can actually tell you: a name, a
 * country, a position, a year and a list of clubs in the order he was at them.
 *
 * No nicknames, because a database does not have them, and no honours, because
 * "won the Champions League" is a team fact that Wikidata models a dozen
 * different ways and gets wrong in all of them. Whether he has finished is read
 * off his age and the year he last signed anywhere, which is right about almost
 * everybody and wrong about the odd forty year old goalkeeper.
 */
export function fromParts(
  name: string,
  nation: string,
  position: Position,
  born: number,
  clubList: string[],
  fame: number,
  /** the year of his last move, which is the only clue a database gives */
  lastMove = 0,
  /** every senior club he had, ours and everybody else's; 0 when unknown */
  totalClubs = 0,
): Legend {
  const careerClubs = [...new Set(clubList)]
  const leagueIds = [...new Set(careerClubs.map((c) => c.split('-')[0]))]
  return {
    id: slug(name),
    name,
    nation,
    position,
    born,
    clubs: clubList,
    careerClubs,
    clubId: clubList[clubList.length - 1],
    leagueIds,
    countries: [...new Set(leagueIds.map((id) => LEAGUE_BY_ID[id]?.country).filter(Boolean))],
    honours: [],
    // Wikidata does not say whether a man has stopped, so age and the date of
    // his last move say it for him: past forty, or past thirty three and
    // nobody has signed him in four years.
    retired:
      NOW_YEAR - born >= 40 ||
      (NOW_YEAR - born >= 33 && lastMove > 0 && NOW_YEAR - lastMove >= 4),
    alt: [],
    keys: [fold(name)],
    fame,
    curated: false,
    totalClubs,
  }
}
