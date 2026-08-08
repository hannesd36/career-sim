import type { Honour } from '../data/players'

/**
 * What the quizzes remember about you.
 *
 * A grid is over in four minutes and forgotten in five, so the games keep a
 * small ledger: what you have played, what you have won, and the handful of
 * things worth putting in a cabinet. It lives in this browser and nowhere else,
 * and it is deliberately a dozen numbers rather than a history.
 */
export interface QuizStats {
  gridPlayed: number
  gridWon: number
  /** squares taken with a correct name, over every board ever played */
  gridSquares: number
  /** best score on a board played alone, where rarity is the whole point */
  soloBest: number
  /** boards filled to all nine */
  soloPerfect: number
  /** boards won against the computer at cup final difficulty */
  hardWon: number
  onlinePlayed: number
  onlineWon: number
  guessPlayed: number
  guessWon: number
  /** got him with the first name typed */
  guessOne: number
  /** got him inside three */
  guessFast: number
  streakBest: number
  /** days a daily puzzle has been finished */
  dailyDays: number
  dailyStreak: number
  lastDaily: string | null
}

const EMPTY: QuizStats = {
  gridPlayed: 0,
  gridWon: 0,
  gridSquares: 0,
  soloBest: 0,
  soloPerfect: 0,
  hardWon: 0,
  onlinePlayed: 0,
  onlineWon: 0,
  guessPlayed: 0,
  guessWon: 0,
  guessOne: 0,
  guessFast: 0,
  streakBest: 0,
  dailyDays: 0,
  dailyStreak: 0,
  lastDaily: null,
}

const KEY = 'career-sim:quiz-stats'

export function readStats(): QuizStats {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<QuizStats>) }
  } catch {
    return { ...EMPTY }
  }
}

export function writeStats(s: QuizStats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // a browser with storage switched off still gets to play
  }
}

/** Yesterday's key, so a daily streak knows whether it survived the night. */
function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Mark a daily as done, keeping the run honest across midnight. */
export function markDaily(s: QuizStats, today: string): QuizStats {
  if (s.lastDaily === today) return s
  const carried = s.lastDaily === dayBefore(today)
  return {
    ...s,
    dailyDays: s.dailyDays + 1,
    dailyStreak: carried ? s.dailyStreak + 1 : 1,
    lastDaily: today,
  }
}

// ------------------------------------------------------------- the cabinet

export interface Award {
  id: string
  /** the trophy drawn for it */
  art: Honour
  /** how far along you are, and what finishes it */
  progress: (s: QuizStats) => { at: number; of: number }
}

const done = (at: number, of: number) => ({ at: Math.min(at, of), of })

export const AWARDS: Award[] = [
  { id: 'firstwin', art: 'goldcup', progress: (s) => done(s.gridWon, 1) },
  { id: 'gridten', art: 'europa', progress: (s) => done(s.gridWon, 10) },
  { id: 'cupfinal', art: 'ucl', progress: (s) => done(s.hardWon, 1) },
  { id: 'perfect', art: 'clubwc', progress: (s) => done(s.soloPerfect, 1) },
  { id: 'obscure', art: 'libertadores', progress: (s) => done(s.soloBest, 400) },
  { id: 'century', art: 'afcon', progress: (s) => done(s.gridSquares, 100) },
  { id: 'sniper', art: 'ballondor', progress: (s) => done(s.guessOne, 1) },
  { id: 'quick', art: 'goldenboy', progress: (s) => done(s.guessFast, 5) },
  { id: 'streakfive', art: 'goldenshoe', progress: (s) => done(s.streakBest, 5) },
  { id: 'streakten', art: 'worldcup', progress: (s) => done(s.streakBest, 10) },
  { id: 'daily', art: 'conference', progress: (s) => done(s.dailyDays, 1) },
  { id: 'dailyweek', art: 'nationsleague', progress: (s) => done(s.dailyStreak, 7) },
  { id: 'online', art: 'euro', progress: (s) => done(s.onlineWon, 1) },
  { id: 'onlinefive', art: 'copa', progress: (s) => done(s.onlineWon, 5) },
  {
    id: 'marathon',
    art: 'olympics',
    progress: (s) => done(s.gridPlayed + s.guessPlayed, 50),
  },
]

export const isEarned = (a: Award, s: QuizStats) => {
  const { at, of } = a.progress(s)
  return at >= of
}

export const earnedCount = (s: QuizStats) => AWARDS.filter((a) => isEarned(a, s)).length

/** Awards that were not there before and are now, so the game can say so. */
export function newlyEarned(before: QuizStats, after: QuizStats): Award[] {
  return AWARDS.filter((a) => !isEarned(a, before) && isEarned(a, after))
}
