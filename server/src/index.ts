/**
 * The leaderboard, as small as a leaderboard gets.
 *
 * One table, two routes, no accounts and no sessions. A browser invents an id
 * for itself, posts a number under a name it chose, and can ask for the top of
 * a board. That is the entire surface.
 *
 * It is deliberately not a system of record. Anybody who can read this file
 * can post a score they did not earn, and no amount of work short of accounts
 * and server-side simulation would change that. What it is for is comparing a
 * run with people you know — which is why the friend code exists and why the
 * open boards are presented as a curiosity rather than a ranking.
 */
export interface Env {
  DB: D1Database
  /** comma-separated list of origins allowed to post; empty means any */
  ALLOWED_ORIGINS?: string
}

const MAX_NAME = 24
const MAX_DETAIL = 48
const MAX_VALUE = 5_000_000
/** one write per id per board per this many milliseconds */
const WRITE_COOLDOWN = 5_000

/**
 * Whether this origin may talk to the worker.
 *
 * Any local dev server is allowed whatever port it landed on, because Vite
 * moves to the next free one the moment two are running and pinning 5173 makes
 * the boards mysteriously stop working on a second window.
 */
function isAllowed(origin: string | null, env: Env): boolean {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!allowed.length) return true
  // no Origin header at all is curl or another server, which CORS does not govern
  if (!origin) return true
  if (allowed.includes(origin)) return true
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

/**
 * An origin that is not allowed is told so, rather than handed somebody else's
 * domain in the header. Echoing the first configured origin back at a stranger
 * fails in the browser anyway, and it fails as a confusing mismatch rather than
 * as a refusal anyone can read.
 */
function cors(origin: string | null, env: Env): Record<string, string> {
  const ok = isAllowed(origin, env)
  return {
    'access-control-allow-origin': ok && origin ? origin : 'null',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    // the response body is the same for everybody, but the header is not
    vary: 'Origin',
  }
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

/** Boards are `career`, `guess`, `crest`, `grid`, or `daily:YYYY-MM-DD`. */
function validBoard(board: unknown): board is string {
  if (typeof board !== 'string' || board.length > 32) return false
  return /^(career|guess|crest|grid)$/.test(board) || /^daily:\d{4}-\d{2}-\d{2}$/.test(board)
}

const clean = (v: unknown, max: number) =>
  typeof v === 'string'
    ? v
        .replace(/[\p{C}]/gu, '')
        .trim()
        .slice(0, max)
    : ''

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin')
    const headers = cors(origin, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    const url = new URL(request.url)

    // --- read a board -------------------------------------------------
    if (request.method === 'GET' && url.pathname === '/board') {
      const board = url.searchParams.get('board')
      if (!validBoard(board)) return json({ error: 'bad board' }, 400, headers)
      const group = clean(url.searchParams.get('group'), 8).toUpperCase()
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 25))

      const { results } = await env.DB.prepare(
        `SELECT id, name, value, detail, at FROM scores
          WHERE board = ?1 AND grp = ?2
          ORDER BY value DESC, at ASC
          LIMIT ?3`,
      )
        .bind(board, group, limit)
        .all()

      const entries = (results ?? []).map((row, i) => ({ ...row, rank: i + 1 }))
      return json({ entries }, 200, headers)
    }

    // --- post a score ---------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/score') {
      let body: Record<string, unknown>
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        return json({ error: 'bad json' }, 400, headers)
      }

      const board = body.board
      if (!validBoard(board)) return json({ error: 'bad board' }, 400, headers)

      const id = clean(body.id, 32)
      const name = clean(body.name, MAX_NAME)
      const detail = clean(body.detail, MAX_DETAIL)
      const group = clean(body.group, 8).toUpperCase()
      const value = Math.round(Number(body.value))
      if (!id || !name) return json({ error: 'id and name required' }, 400, headers)
      if (!Number.isFinite(value) || value < 0 || value > MAX_VALUE) {
        return json({ error: 'bad value' }, 400, headers)
      }

      const now = Date.now()
      const existing = await env.DB.prepare(
        `SELECT value, at FROM scores WHERE board = ?1 AND grp = ?2 AND id = ?3`,
      )
        .bind(board, group, id)
        .first<{ value: number; at: number }>()

      // A browser that posts twice in five seconds is a bug or a script; either
      // way the second one is not new information.
      if (existing && now - existing.at < WRITE_COOLDOWN) {
        return json({ error: 'slow down' }, 429, headers)
      }

      // Boards keep a browser's best, never its latest: a bad run should never
      // cost somebody the good one they already posted.
      if (!existing || value > existing.value) {
        await env.DB.prepare(
          `INSERT INTO scores (board, grp, id, name, value, detail, at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT (board, grp, id) DO UPDATE SET
             name = excluded.name,
             value = excluded.value,
             detail = excluded.detail,
             at = excluded.at`,
        )
          .bind(board, group, id, name, value, detail, now)
          .run()
      }

      const best = Math.max(value, existing?.value ?? 0)
      const above = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM scores WHERE board = ?1 AND grp = ?2 AND value > ?3`,
      )
        .bind(board, group, best)
        .first<{ n: number }>()
      const total = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM scores WHERE board = ?1 AND grp = ?2`,
      )
        .bind(board, group)
        .first<{ n: number }>()

      // Daily boards would otherwise grow forever; a month back is more history
      // than anybody looks at, and the sweep is cheap enough to ride on a write.
      if (String(board).startsWith('daily:') && Math.random() < 0.02) {
        const cutoff = new Date(now - 30 * 86_400_000).toISOString().slice(0, 10)
        await env.DB.prepare(`DELETE FROM scores WHERE board LIKE 'daily:%' AND board < ?1`)
          .bind(`daily:${cutoff}`)
          .run()
      }

      return json({ rank: (above?.n ?? 0) + 1, of: total?.n ?? 1 }, 200, headers)
    }

    return json({ error: 'not found' }, 404, headers)
  },
}
