import { CLUB_BY_ID } from '../data/clubs'
import { NOW_YEAR } from '../data/legend'
import { LEAGUE_BY_ID } from '../data/leagues'
import { HONOURS, LEGENDS, confOf, type Honour, type Legend } from '../data/players'
import { Rng } from './rng'
import type { Position } from './types'

/**
 * The rules behind both quiz games.
 *
 * A *criterion* is one thing that can be asked of a player: a club he played
 * for, a country he plays for, a trophy he has won, a place on the pitch. The
 * grid game is nothing but nine intersections of two criteria; the guessing
 * game is the same facts read one at a time instead of two.
 *
 * Everything here is pure. Give the same seed twice and you get the same grid,
 * which is what lets two people play the same board.
 */

export type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

const POS_GROUP: Record<Position, PosGroup> = {
  GK: 'GK',
  CB: 'DEF',
  LB: 'DEF',
  RB: 'DEF',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  LW: 'ATT',
  RW: 'ATT',
  ST: 'ATT',
}

export const posGroup = (p: Position): PosGroup => POS_GROUP[p]

/** Things that are true about a career without being a club, a country or a cup. */
export type Trait =
  | 'oneclub'
  | 'globetrotter'
  | 'journeyman'
  | 'threecountries'
  | 'fourcountries'
  | 'onecountry'
  | 'retired'
  | 'playing'
  | 'young'
  | 'veteran'
  | 'decorated'

export const TRAITS: Trait[] = [
  'oneclub',
  'globetrotter',
  'journeyman',
  'threecountries',
  'fourcountries',
  'onecountry',
  'retired',
  'playing',
  'young',
  'veteran',
  'decorated',
]

/** The decade a man was born in, which is the closest thing to an era. */
export type Era = 'b1960s' | 'b1970s' | 'b1980s' | 'b1990s' | 'b2000s'

export const ERAS: Era[] = ['b1960s', 'b1970s', 'b1980s', 'b1990s', 'b2000s']

const ERA_FROM: Record<Era, number> = {
  b1960s: 1960,
  b1970s: 1970,
  b1980s: 1980,
  b1990s: 1990,
  b2000s: 2000,
}

export const eraStart = (e: Era) => ERA_FROM[e]

export type Criterion =
  | { kind: 'club'; id: string }
  | { kind: 'nation'; id: string }
  | { kind: 'league'; id: string }
  | { kind: 'pos'; id: PosGroup }
  | { kind: 'honour'; id: Honour }
  | { kind: 'trait'; id: Trait }
  | { kind: 'era'; id: Era }

export const criterionKey = (c: Criterion) => `${c.kind}:${c.id}`

/** The year everything about an age is measured against. */
export const NOW = NOW_YEAR

export function matches(c: Criterion, l: Legend): boolean {
  switch (c.kind) {
    case 'club':
      return l.careerClubs.includes(c.id)
    case 'nation':
      return l.nation === c.id
    case 'league':
      return l.leagueIds.includes(c.id)
    case 'pos':
      return posGroup(l.position) === c.id
    case 'honour':
      return l.honours.includes(c.id)
    case 'era': {
      const from = ERA_FROM[c.id]
      return l.born >= from && l.born < from + 10
    }
    case 'trait':
      switch (c.id) {
        case 'oneclub':
          // a generated career only lists the clubs this game has heard of, so
          // it can never prove that a man never played anywhere else
          return l.totalClubs === 1
        case 'globetrotter':
          return l.careerClubs.length >= 6
        case 'journeyman':
          return l.careerClubs.length >= 8
        case 'threecountries':
          return l.countries.length >= 3
        case 'fourcountries':
          return l.countries.length >= 4
        case 'onecountry':
          return l.totalClubs > 1 && l.totalClubs === l.careerClubs.length && l.countries.length === 1
        case 'retired':
          return l.retired
        case 'playing':
          return !l.retired
        case 'young':
          return !l.retired && NOW - l.born <= 23
        case 'veteran':
          return !l.retired && NOW - l.born >= 34
        case 'decorated':
          return l.honours.length >= 4
      }
  }
}

/**
 * The book, filed by every question it can be asked.
 *
 * With a thousand names you can afford to walk the whole list for every one of
 * the eight hundred criteria a board considers. With twenty thousand you
 * cannot: that is twenty million comparisons and a second of a frozen page. So
 * the book is indexed once, and rebuilt only when it grows — which happens
 * exactly once, when the generated half lands.
 */
type Index = Map<string, Legend[]>

let indexedAt = -1
const byClub: Index = new Map()
const byNation: Index = new Map()
const byLeague: Index = new Map()
const byPos: Index = new Map()
const byHonour: Index = new Map()
const byEra: Index = new Map()
const byTrait: Index = new Map()

const file = (index: Index, key: string, legend: Legend) => {
  const list = index.get(key)
  if (list) list.push(legend)
  else index.set(key, [legend])
}

function ensureIndex() {
  if (indexedAt === LEGENDS.length) return
  for (const index of [byClub, byNation, byLeague, byPos, byHonour, byEra, byTrait]) index.clear()

  for (const legend of LEGENDS) {
    for (const club of legend.careerClubs) file(byClub, club, legend)
    file(byNation, legend.nation, legend)
    for (const league of legend.leagueIds) file(byLeague, league, legend)
    file(byPos, posGroup(legend.position), legend)
    for (const honour of legend.honours) file(byHonour, honour, legend)
    for (const era of ERAS) if (matches({ kind: 'era', id: era }, legend)) file(byEra, era, legend)
    for (const trait of TRAITS)
      if (matches({ kind: 'trait', id: trait }, legend)) file(byTrait, trait, legend)
  }
  indexedAt = LEGENDS.length
}

const indexFor = (kind: Criterion['kind']): Index => {
  switch (kind) {
    case 'club':
      return byClub
    case 'nation':
      return byNation
    case 'league':
      return byLeague
    case 'pos':
      return byPos
    case 'honour':
      return byHonour
    case 'era':
      return byEra
    case 'trait':
      return byTrait
  }
}

/** Everyone in the book who satisfies a criterion. */
export function answersFor(c: Criterion): Legend[] {
  ensureIndex()
  return indexFor(c.kind).get(c.id) ?? []
}

/**
 * Everyone who satisfies both, which is what a square on the grid asks for.
 * Walk the shorter of the two lists: a square is usually one narrow question
 * against one wide one, and the narrow one is a tenth the length.
 */
export function answersForCell(a: Criterion, b: Criterion): Legend[] {
  const first = answersFor(a)
  const second = answersFor(b)
  return first.length <= second.length
    ? first.filter((l) => matches(b, l))
    : second.filter((l) => matches(a, l))
}

// ------------------------------------------------------------- the grid game

export type Difficulty = 'easy' | 'normal' | 'hard'

/**
 * Both games are played at one of three settings, and the word means the same
 * thing in each: how much of the book is fair game, and how much help you get.
 */
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

/**
 * What makes a board easy is not how many answers it has, it is how many of
 * them you have heard of.
 *
 * Counting bodies does not work once the book runs to twenty thousand names.
 * Pogon Szczecin has ninety men in it and clears any floor you like, and a
 * board headed by two Polish sides and a Dutch one is not an easy quiz, it is a
 * punishment with a wide answer sheet. So everything is counted in *nameable*
 * players instead: men a person could actually produce, taken as the number of
 * Wikipedias that wrote them up.
 *
 * At the easiest that bar is high and the floors are steep, which leaves the
 * hundred or so clubs everybody knows. At the hardest the bar is zero, every
 * name in the book counts for as much as any other, and the board is drawn from
 * all of it.
 */
const KNOWN: Record<Difficulty, number> = { easy: 45, normal: 45, hard: 0 }

/** How many nameable players a criterion must carry before it can head a line. */
const HEADER_FLOOR: Record<Difficulty, number> = { easy: 20, normal: 8, hard: 4 }
/** How many answers a square must have at all. */
const CELL_FLOOR: Record<Difficulty, number> = { easy: 4, normal: 2, hard: 1 }
/** And how many of those the reader is expected to be able to name. */
const CELL_KNOWN: Record<Difficulty, number> = { easy: 2, normal: 1, hard: 1 }

const nameable = (answers: Legend[], d: Difficulty) =>
  answers.reduce((n, l) => (l.fame >= KNOWN[d] ? n + 1 : n), 0)

export interface Grid {
  seed: number
  difficulty: Difficulty
  /** the three down the side */
  rows: Criterion[]
  /** the three along the top */
  cols: Criterion[]
}

export interface Pool {
  criterion: Criterion
  answers: Legend[]
}

function poolOf(kinds: Criterion[]): Pool[] {
  return kinds
    .map((criterion) => ({ criterion, answers: answersFor(criterion) }))
    .filter((p) => p.answers.length > 0)
}

/** Every club anybody in the book has played for. */
function clubCriteria(): Criterion[] {
  ensureIndex()
  return [...byClub.keys()].map((id) => ({ kind: 'club', id }) as Criterion)
}

function allCriteria(): Criterion[] {
  ensureIndex()
  const nations = byNation.keys()
  const leagues = byLeague.keys()
  return [
    ...clubCriteria(),
    ...[...nations].map((id) => ({ kind: 'nation', id }) as Criterion),
    ...[...leagues].map((id) => ({ kind: 'league', id }) as Criterion),
    ...(['GK', 'DEF', 'MID', 'ATT'] as PosGroup[]).map((id) => ({ kind: 'pos', id }) as Criterion),
    ...HONOURS.map((id) => ({ kind: 'honour', id }) as Criterion),
    ...TRAITS.map((id) => ({ kind: 'trait', id }) as Criterion),
    ...ERAS.map((id) => ({ kind: 'era', id }) as Criterion),
  ]
}

/**
 * Two criteria that ask the same question of the same people make a dead
 * square: "played for Barcelona" against "played in La Liga" is not a question.
 * So is a nation against the confederation it sits in, or a club against its
 * own division.
 */
function redundant(a: Criterion, b: Criterion): boolean {
  if (criterionKey(a) === criterionKey(b)) return true
  if (a.kind === b.kind && a.kind !== 'club') return true
  const club = a.kind === 'club' ? a : b.kind === 'club' ? b : null
  const league = a.kind === 'league' ? a : b.kind === 'league' ? b : null
  if (club && league) return CLUB_BY_ID[club.id]?.leagueId === league.id
  return false
}

/**
 * Build a board.
 *
 * The top of the grid is always three clubs, because a crest is the fastest
 * thing on the board to read and it is what these grids are for. Down the side
 * anything goes: another club, a country, a trophy, a position, a habit. Then
 * every one of the nine squares is checked to make sure somebody a person could
 * name answers it, and the whole thing is thrown away and redrawn if one does
 * not. That check is the difficulty: the same code deals a board of the clubs
 * everybody knows or a board of the ones only you do.
 */
export function buildGrid(seed: number, difficulty: Difficulty = 'normal'): Grid {
  const rng = new Rng(seed)
  const floor = CELL_FLOOR[difficulty]
  const cellKnown = CELL_KNOWN[difficulty]
  const headerFloor = HEADER_FLOOR[difficulty]

  const worthAsking = (p: Pool) => nameable(p.answers, difficulty) >= headerFloor
  const clubs = poolOf(clubCriteria()).filter(worthAsking)
  const wide = poolOf(allCriteria()).filter(worthAsking)
  // one bucket per flavour of question, so the side of the board can be made
  // of three different kinds of thing rather than three trophies in a row
  const buckets = new Map<Criterion['kind'], Pool[]>()
  for (const p of wide) {
    const list = buckets.get(p.criterion.kind)
    if (list) list.push(p)
    else buckets.set(p.criterion.kind, [p])
  }
  const kinds = [...buckets.keys()]

  for (let attempt = 0; attempt < 400; attempt++) {
    const cols = rng.shuffle(clubs).slice(0, 3)
    // a club, a country, a trophy: three different questions down the side
    const rows = rng
      .shuffle(kinds)
      .slice(0, 3)
      .map((k) => rng.pick(buckets.get(k)!))
    if (rows.length < 3) continue

    const picked = [...cols, ...rows]
    const keys = new Set(picked.map((p) => criterionKey(p.criterion)))
    if (keys.size !== 6) continue

    let ok = true
    for (const row of rows) {
      for (const col of cols) {
        if (redundant(row.criterion, col.criterion)) {
          ok = false
          break
        }
        const both = row.answers.filter((l) => matches(col.criterion, l))
        if (both.length < floor || nameable(both, difficulty) < cellKnown) {
          ok = false
          break
        }
      }
      if (!ok) break
    }
    if (!ok) continue

    return {
      seed,
      difficulty,
      rows: rows.map((p) => p.criterion),
      cols: cols.map((p) => p.criterion),
    }
  }

  // Nothing came together in four hundred tries, which only happens if the
  // book has been cut down. Fall back to the loosest board that always works.
  const fallback = poolOf(clubCriteria()).sort((a, b) => b.answers.length - a.answers.length)
  return {
    seed,
    difficulty,
    cols: fallback.slice(0, 3).map((p) => p.criterion),
    rows: [
      { kind: 'pos', id: 'ATT' },
      { kind: 'honour', id: 'ucl' },
      { kind: 'trait', id: 'threecountries' },
    ],
  }
}

// ------------------------------------------------------ the computer opponent

export type Mark = 'a' | 'b'

/** Nine squares, each empty or claimed with the player that took it. */
export interface Claim {
  by: Mark
  legendId: string
}

export type Board = (Claim | null)[]

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function winningLine(board: Board, mark: Mark): number[] | null {
  return LINES.find((line) => line.every((i) => board[i]?.by === mark)) ?? null
}

export function countFor(board: Board, mark: Mark): number {
  return board.filter((c) => c?.by === mark).length
}

/** How much of the game the computer is looking at when it chooses a square. */
const CPU_SIGHT: Record<Difficulty, { blocks: boolean; shape: boolean }> = {
  easy: { blocks: false, shape: false },
  normal: { blocks: true, shape: false },
  hard: { blocks: true, shape: true },
}

/**
 * Where the computer plays.
 *
 * It is not trying to be unbeatable, it is trying to play like somebody at the
 * setting you asked for. On a cup final board it takes the win, blocks the
 * loss, then takes the middle and the corners, which is the whole game. On a
 * matchday board it still sees both lines but has no feel for the shape of the
 * board, so it plays wherever it can answer. On a kickabout it will finish a
 * line of its own and never once notice yours.
 *
 * Squares are considered in the order they are handed over, so a caller who
 * wants the choice to vary shuffles the list first. Nothing in here rolls a die.
 */
export function pickCell(
  board: Board,
  mark: Mark,
  playable: number[],
  skill: Difficulty = 'hard',
): number {
  const sight = CPU_SIGHT[skill]
  const other: Mark = mark === 'a' ? 'b' : 'a'
  const open = playable.filter((i) => !board[i])
  if (!open.length) return -1

  const finisher = (who: Mark) =>
    open.find((i) => {
      const test = board.slice()
      test[i] = { by: who, legendId: '' }
      return winningLine(test, who) !== null
    })

  return (
    finisher(mark) ??
    (sight.blocks ? finisher(other) : undefined) ??
    (sight.shape && open.includes(4) ? 4 : undefined) ??
    (sight.shape ? open.find((i) => [0, 2, 6, 8].includes(i)) : undefined) ??
    open[0]
  )
}

// ---------------------------------------------------- the guessing game

export type Verdict = 'hit' | 'near' | 'miss'
export type Arrow = 'up' | 'down' | null

export interface Clue {
  key: 'nation' | 'position' | 'born' | 'league' | 'club' | 'clubs' | 'titles'
  verdict: Verdict
  arrow: Arrow
}

export interface GuessRow {
  legend: Legend
  clues: Clue[]
  correct: boolean
}

/**
 * A grid will take any name in the book, because a square with fifteen possible
 * answers is a better square. A hidden player will not: being asked to guess a
 * man three Wikipedias have heard of is not a game, it is a lottery. So a round
 * is drawn from the part of the book somebody could plausibly name, and how far
 * down that goes is what the difficulty mostly is.
 */
const GUESSABLE = 14
const WELL_KNOWN = 45
/**
 * The deep end. The generated half is already cut off at a handful of
 * Wikipedias when it is built, so the hardest setting is the one that does not
 * cut it a second time: roughly twenty thousand men rather than the couple of
 * thousand a kickabout hides, and some of them are a Ligue 2 left back.
 */
const ANYBODY = 5

export interface GuessRules {
  /** names you get before the man is gone */
  guesses: number
  /** how well known he has to be, as the number of Wikipedias that wrote him up */
  fame: number
  /** written clues in hand before your first guess; below zero, wrong names owed */
  clues: number
  /** how far off a count can be and still come back warm */
  near: { born: number; clubs: number; titles: number }
}

/**
 * How hard the man is to find.
 *
 * Four things move together, because moving one of them on its own barely
 * changes the game. How many names you get. How far down the book he can be
 * hidden. How soon the written clues start. And how generous amber is: a year
 * within five is warm on a kickabout and only a year within two on a cup final,
 * which is the difference between a chip that narrows him and a chip that names
 * him.
 */
export const GUESS_RULES: Record<Difficulty, GuessRules> = {
  easy: {
    guesses: 10,
    fame: WELL_KNOWN,
    clues: 1,
    near: { born: 5, clubs: 2, titles: 3 },
  },
  normal: {
    guesses: 8,
    fame: GUESSABLE,
    clues: 0,
    near: { born: 3, clubs: 1, titles: 2 },
  },
  hard: {
    guesses: 6,
    fame: ANYBODY,
    clues: -2,
    near: { born: 2, clubs: 1, titles: 1 },
  },
}

export const guessLimit = (d: Difficulty) => GUESS_RULES[d].guesses

const titlesOf = (l: Legend) => l.honours.length

/**
 * What a guess tells you about the man you are actually after.
 *
 * Green is right. Amber is warm in a way that is worth something: the same
 * confederation, the same part of the pitch, the same country's league, a
 * career that passed through the club he is at now, an age within a few years.
 * Grey is nothing.
 *
 * The three counted clues read the year, the clubs and the cabinet against a
 * band the difficulty sets, so the same guess against the same man says more on
 * an easy round than on a hard one.
 */
export function judge(guess: Legend, target: Legend, difficulty: Difficulty = 'normal'): GuessRow {
  const near = GUESS_RULES[difficulty].near
  const clues: Clue[] = []

  const gConf = confOf(guess.nation)
  clues.push({
    key: 'nation',
    verdict:
      guess.nation === target.nation
        ? 'hit'
        : gConf && gConf === confOf(target.nation)
          ? 'near'
          : 'miss',
    arrow: null,
  })

  clues.push({
    key: 'position',
    verdict:
      guess.position === target.position
        ? 'hit'
        : posGroup(guess.position) === posGroup(target.position)
          ? 'near'
          : 'miss',
    arrow: null,
  })

  // The year rather than the age, because a career in the book can be long over
  // and the arrow points at the year the answer is, not at how old he feels.
  const yearGap = target.born - guess.born
  clues.push({
    key: 'born',
    verdict: yearGap === 0 ? 'hit' : Math.abs(yearGap) <= near.born ? 'near' : 'miss',
    arrow: yearGap === 0 ? null : yearGap > 0 ? 'up' : 'down',
  })

  const gLeague = CLUB_BY_ID[guess.clubId]?.leagueId
  const tLeague = CLUB_BY_ID[target.clubId]?.leagueId
  clues.push({
    key: 'league',
    verdict:
      gLeague === tLeague
        ? 'hit'
        : gLeague && tLeague && LEAGUE_BY_ID[gLeague]?.country === LEAGUE_BY_ID[tLeague]?.country
          ? 'near'
          : 'miss',
    arrow: null,
  })

  clues.push({
    key: 'club',
    verdict:
      guess.clubId === target.clubId
        ? 'hit'
        : // a career that crossed his current club is worth saying so
          guess.careerClubs.includes(target.clubId) || target.careerClubs.includes(guess.clubId)
          ? 'near'
          : 'miss',
    arrow: null,
  })

  // how far he travelled, which narrows a man faster than anything but his club
  const clubGap = target.careerClubs.length - guess.careerClubs.length
  clues.push({
    key: 'clubs',
    verdict: clubGap === 0 ? 'hit' : Math.abs(clubGap) <= near.clubs ? 'near' : 'miss',
    arrow: clubGap === 0 ? null : clubGap > 0 ? 'up' : 'down',
  })

  const gap = titlesOf(target) - titlesOf(guess)
  clues.push({
    key: 'titles',
    verdict: gap === 0 ? 'hit' : Math.abs(gap) <= near.titles ? 'near' : 'miss',
    arrow: gap === 0 ? null : gap > 0 ? 'up' : 'down',
  })

  return { legend: guess, clues, correct: guess.id === target.id }
}

/**
 * A clue in words, handed over one per wrong guess. The order goes from the
 * broadest thing true about him to the one that gives him away.
 */
export type HintKind = 'confederation' | 'position' | 'era' | 'clubCount' | 'firstClub' | 'initials'

export const HINT_ORDER: HintKind[] = [
  'confederation',
  'position',
  'era',
  'clubCount',
  'firstClub',
  'initials',
]

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => `${w[0]}.`)
    .join(' ')
}

/**
 * The clues that are on the table after so many wrong names.
 *
 * A kickabout hands one over before you have typed anything, a matchday pays a
 * clue for every name you burn, and a cup final owes you two misses before it
 * says a word.
 */
export function cluesEarned(wrong: number, difficulty: Difficulty = 'normal'): HintKind[] {
  const earned = wrong + GUESS_RULES[difficulty].clues
  return HINT_ORDER.slice(0, Math.max(0, Math.min(earned, HINT_ORDER.length)))
}

/**
 * Which half of the book a round is drawn from.
 *
 * The whole book has a fifteen year old at Barcelona and a man who last kicked
 * a ball in 1966 in it, and not everybody wants both. `playing` is anyone still
 * on a pitch, `legends` is anyone who has finished, `famous` is the men with
 * something in the cabinet, which is the closest thing to an easy round.
 */
export type Pond = 'all' | 'playing' | 'legends' | 'famous'

/**
 * Which men can be hidden: the half of the book you asked for, cut off at the
 * fame the difficulty sets. The two choices are different questions, so they
 * stack. "Still playing" on a cup final board is every current professional the
 * book has heard of; the same choice on a kickabout is the ones on television.
 */
export function pondOf(pond: Pond, difficulty: Difficulty = 'normal'): Legend[] {
  const floor = GUESS_RULES[difficulty].fame
  switch (pond) {
    case 'playing':
      return LEGENDS.filter((l) => !l.retired && l.fame >= floor)
    case 'legends':
      return LEGENDS.filter((l) => l.retired && l.fame >= floor)
    case 'famous':
      // a cabinet is its own kind of fame, so it lets a man in on its own
      return LEGENDS.filter((l) => l.honours.length >= 2 || l.fame >= Math.max(floor, WELL_KNOWN))
    default:
      return LEGENDS.filter((l) => l.fame >= floor)
  }
}

/** A target worth guessing: seeded, so a shared seed is a shared puzzle. */
export function pickTarget(
  seed: number,
  exclude: string[] = [],
  pond: Pond = 'all',
  difficulty: Difficulty = 'normal',
): Legend {
  const rng = new Rng(seed)
  const skip = new Set(exclude)
  const pool = pondOf(pond, difficulty).filter((l) => !skip.has(l.id))
  return rng.pick(pool.length ? pool : LEGENDS)
}

// ------------------------------------------------------- one puzzle a day

/** Days since the first of January 2024, which is puzzle number one. */
export function dayNumber(d: Date = new Date()): number {
  const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((local - Date.UTC(2024, 0, 1)) / 86_400_000)
}

/** "2026-08-08", the key a day's result is filed under. */
export function dayKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * The seed everybody in the world gets today. Two different games must not run
 * the same board off the same day, so each carries its own salt.
 */
export function dailySeed(game: 'grid' | 'guess', d: Date = new Date()): number {
  const salt = game === 'grid' ? 7919 : 104_729
  return (dayNumber(d) + 1) * salt
}

// ------------------------------------------------------------- scoring

/**
 * What a name is worth.
 *
 * A square with twenty men in it is a gift and a square with one is a memory,
 * so the score is the share of the answer sheet you used up: one of one is a
 * hundred, one of twenty is five. It is the only way a solo board can be
 * played against yourself rather than against a clock.
 */
export function rarityPoints(poolSize: number): number {
  if (poolSize <= 0) return 0
  return Math.max(3, Math.min(100, Math.round(100 / poolSize)))
}

/** A whole board, out of nine hundred. */
export const boardPoints = (scores: number[]) => scores.reduce((a, b) => a + b, 0)

// --------------------------------------------------------------- sharing

const SQUARE = { a: '🟩', b: '🟥', none: '⬜' } as const

/**
 * A result you can paste into a group chat without giving the answers away.
 * Nine squares, and the number that matters. Nobody reads a paragraph.
 */
export function shareGrid(
  board: (Claim | null)[],
  opts: { title: string; day?: number; score?: number; you?: Mark },
): string {
  const rows: string[] = []
  for (let r = 0; r < 3; r++) {
    rows.push(
      board
        .slice(r * 3, r * 3 + 3)
        .map((c) => (c ? SQUARE[c.by] : SQUARE.none))
        .join(''),
    )
  }
  const head = opts.day !== undefined ? `${opts.title} #${opts.day}` : opts.title
  const tail = opts.score !== undefined ? `\n${opts.score}` : ''
  return `${head}\n${rows.join('\n')}${tail}`
}

const DOT = { hit: '🟩', near: '🟨', miss: '⬛' } as const

/** The same idea for the guessing game: one line per name you burned. */
export function shareGuess(
  rows: GuessRow[],
  opts: { title: string; day?: number; won: boolean; limit: number },
): string {
  const head = opts.day !== undefined ? `${opts.title} #${opts.day}` : opts.title
  const count = opts.won ? `${rows.length}/${opts.limit}` : `X/${opts.limit}`
  const lines = [...rows]
    .reverse()
    .map((r) => r.clues.map((c) => DOT[c.verdict]).join(''))
    .join('\n')
  return `${head} ${count}\n${lines}`
}

/** Put text on the clipboard, and say whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
