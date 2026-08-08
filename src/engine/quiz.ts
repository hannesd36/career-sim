import { CLUB_BY_ID } from '../data/clubs'
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
export const NOW = 2026

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
          return l.careerClubs.length === 1
        case 'globetrotter':
          return l.careerClubs.length >= 6
        case 'journeyman':
          return l.careerClubs.length >= 8
        case 'threecountries':
          return l.countries.length >= 3
        case 'fourcountries':
          return l.countries.length >= 4
        case 'onecountry':
          return l.countries.length === 1 && l.careerClubs.length >= 2
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

/** Everyone in the book who satisfies a criterion. */
export function answersFor(c: Criterion): Legend[] {
  return LEGENDS.filter((l) => matches(c, l))
}

/** Everyone who satisfies both, which is what a square on the grid asks for. */
export function answersForCell(a: Criterion, b: Criterion): Legend[] {
  return LEGENDS.filter((l) => matches(a, l) && matches(b, l))
}

// ------------------------------------------------------------- the grid game

export type Difficulty = 'easy' | 'normal' | 'hard'

/** How many valid answers a square must have before it is allowed on the board. */
const CELL_FLOOR: Record<Difficulty, number> = { easy: 4, normal: 2, hard: 1 }
/** How many players a criterion must cover before it is allowed to be a header. */
const HEADER_FLOOR: Record<Difficulty, number> = { easy: 12, normal: 7, hard: 4 }

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
  const seen = new Set<string>()
  for (const l of LEGENDS) for (const c of l.careerClubs) seen.add(c)
  return [...seen].map((id) => ({ kind: 'club', id }) as Criterion)
}

function allCriteria(): Criterion[] {
  const nations = new Set(LEGENDS.map((l) => l.nation))
  const leagues = new Set(LEGENDS.flatMap((l) => l.leagueIds))
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
 * every one of the nine squares is checked to make sure somebody actually
 * answers it, and the whole thing is thrown away and redrawn if one does not.
 */
export function buildGrid(seed: number, difficulty: Difficulty = 'normal'): Grid {
  const rng = new Rng(seed)
  const floor = CELL_FLOOR[difficulty]
  const headerFloor = HEADER_FLOOR[difficulty]

  const clubs = poolOf(clubCriteria()).filter((p) => p.answers.length >= headerFloor)
  const wide = poolOf(allCriteria()).filter((p) => p.answers.length >= headerFloor)
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
        if (both.length < floor) {
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

/**
 * Where the computer plays. It is not trying to be unbeatable, it is trying to
 * play like somebody who knows the game: take the win, block the loss, take
 * the middle, take a corner, and otherwise take whatever it can answer.
 */
export function pickCell(board: Board, mark: Mark, playable: number[]): number {
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
    finisher(other) ??
    (open.includes(4) ? 4 : undefined) ??
    open.find((i) => [0, 2, 6, 8].includes(i)) ??
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

export const GUESS_LIMIT = 8

const titlesOf = (l: Legend) => l.honours.length

/**
 * What a guess tells you about the man you are actually after.
 *
 * Green is right. Amber is warm in a way that is worth something: the same
 * confederation, the same part of the pitch, the same country's league, a
 * career that passed through the club he is at now, an age within three years.
 * Grey is nothing.
 */
export function judge(guess: Legend, target: Legend): GuessRow {
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
    verdict: yearGap === 0 ? 'hit' : Math.abs(yearGap) <= 3 ? 'near' : 'miss',
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
    verdict: clubGap === 0 ? 'hit' : Math.abs(clubGap) <= 1 ? 'near' : 'miss',
    arrow: clubGap === 0 ? null : clubGap > 0 ? 'up' : 'down',
  })

  const gap = titlesOf(target) - titlesOf(guess)
  clues.push({
    key: 'titles',
    verdict: gap === 0 ? 'hit' : Math.abs(gap) <= 2 ? 'near' : 'miss',
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
 * Which half of the book a round is drawn from.
 *
 * The whole book has a fifteen year old at Barcelona and a man who last kicked
 * a ball in 1966 in it, and not everybody wants both. `playing` is anyone still
 * on a pitch, `legends` is anyone who has finished, `famous` is the men with
 * something in the cabinet, which is the closest thing to an easy round.
 */
export type Pond = 'all' | 'playing' | 'legends' | 'famous'

export function pondOf(pond: Pond): Legend[] {
  switch (pond) {
    case 'playing':
      return LEGENDS.filter((l) => !l.retired)
    case 'legends':
      return LEGENDS.filter((l) => l.retired)
    case 'famous':
      return LEGENDS.filter((l) => l.honours.length >= 2)
    default:
      return LEGENDS
  }
}

/** A target worth guessing: seeded, so a shared seed is a shared puzzle. */
export function pickTarget(seed: number, exclude: string[] = [], pond: Pond = 'all'): Legend {
  const rng = new Rng(seed)
  const skip = new Set(exclude)
  const pool = pondOf(pond).filter((l) => !skip.has(l.id))
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
  opts: { title: string; day?: number; won: boolean },
): string {
  const head = opts.day !== undefined ? `${opts.title} #${opts.day}` : opts.title
  const count = opts.won ? `${rows.length}/${GUESS_LIMIT}` : `X/${GUESS_LIMIT}`
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
