/**
 * The leaderboard client.
 *
 * The whole thing is optional. With no endpoint configured every call here
 * resolves to "off" and the screens that use it simply do not appear, so the
 * game is exactly the game it was before a server existed — which matters,
 * because the server is a free-tier worker somebody has to keep alive, and the
 * career simulator should never stop working the day it stops being paid for.
 *
 * There are no accounts. A browser makes itself an id, picks a name, and that
 * is the whole identity model. That does mean a determined person can post a
 * number they did not earn; the alternative is asking everybody to sign up for
 * a football game, which is a worse trade. The boards are for comparing runs
 * with people you know, not for adjudicating a world record.
 */
const ENDPOINT = (import.meta.env.VITE_LEADERBOARD_URL ?? '').replace(/\/$/, '')
const ID_KEY = 'career-sim:player-id'
const NAME_KEY = 'career-sim:player-name'
const GROUP_KEY = 'career-sim:group'

export const leaderboardEnabled = () => ENDPOINT.length > 0

export type BoardId = 'career' | 'guess' | 'crest' | 'grid' | `daily:${string}`

export interface Entry {
  rank: number
  name: string
  value: number
  /** whatever the board wants under the number — a club, a player, a run */
  detail?: string
  at: number
  /** this browser posted it */
  you: boolean
}

function randomId(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function playerId(): string {
  try {
    const saved = localStorage.getItem(ID_KEY)
    if (saved) return saved
    const made = randomId()
    localStorage.setItem(ID_KEY, made)
    return made
  } catch {
    return 'anonymous'
  }
}

export function playerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setPlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.slice(0, 24))
  } catch {
    /* ignore */
  }
}

/** The friend code this browser is currently comparing itself against. */
export function groupCode(): string {
  try {
    return localStorage.getItem(GROUP_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setGroupCode(code: string) {
  try {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (clean) localStorage.setItem(GROUP_KEY, clean)
    else localStorage.removeItem(GROUP_KEY)
  } catch {
    /* ignore */
  }
}

/** A pronounceable-enough code to read down a phone. No I, O, 0 or 1. */
export function makeGroupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!leaderboardEnabled()) return null
  try {
    const res = await fetch(`${ENDPOINT}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      // A leaderboard is never worth making somebody wait for.
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export interface SubmitInput {
  board: BoardId
  value: number
  detail?: string
  /** post to a friend code as well as the open board */
  group?: string
}

/** Posts a score. Returns the placing, or null when the board is unavailable. */
export async function submitScore(input: SubmitInput): Promise<{ rank: number; of: number } | null> {
  const name = playerName().trim()
  if (!name) return null
  return call<{ rank: number; of: number }>('/score', {
    method: 'POST',
    body: JSON.stringify({
      board: input.board,
      id: playerId(),
      name,
      value: Math.round(input.value),
      detail: input.detail ?? '',
      group: input.group ?? groupCode() ?? '',
    }),
  })
}

export async function fetchBoard(board: BoardId, opts: { group?: string; limit?: number } = {}) {
  const params = new URLSearchParams({ board, limit: String(opts.limit ?? 25) })
  const group = opts.group ?? groupCode()
  if (group) params.set('group', group)
  const rows = await call<{ entries: Omit<Entry, 'you'>[] }>(`/board?${params}`)
  if (!rows) return null
  const me = playerId()
  return rows.entries.map((e, i) => ({
    ...e,
    rank: e.rank || i + 1,
    you: (e as Entry & { id?: string }).id === me,
  })) as Entry[]
}
