import type { Confederation } from './nations'
import { fromParts, type Legend } from './legend'
import { LEGENDS, addLegends, registerNation } from './players'
import type { Position } from '../engine/types'

/**
 * The other ninety percent of the book, fetched rather than typed.
 *
 * `players.ts` is written by hand and always will be: it is what knows the
 * nicknames and the honours. Everything behind it comes out of Wikidata every
 * three months (see `scripts/fetch-players.mjs`) and lands here as one compact
 * file — names, countries, positions, birth years and the clubs each man
 * actually played for, in order.
 *
 * It is loaded *after* the page is up rather than compiled into it. The site
 * opens on the hand-written book, the rest arrives a moment later, and a phone
 * on a bad connection still gets a game it can play.
 */

interface Book {
  v: number
  built: string
  source: string
  minLinks: number
  pos: Position[]
  clubs: string[]
  /** name, flagcdn code, confederation */
  nations: [string, string, string][]
  /**
   * name, born, nation index, position index, fame, club indexes, year of his
   * last move, and how many senior clubs he had in total
   */
  rows: [string, number, number, number, number, number[], number, number?][]
}

export type BookState = 'idle' | 'loading' | 'ready' | 'failed'

let state: BookState = 'idle'
let built = ''
const listeners = new Set<() => void>()

/** React subscribes to this; everything else just reads `LEGENDS`. */
export function subscribeBook(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const tell = () => listeners.forEach((fn) => fn())

export interface BookSnapshot {
  state: BookState
  /** how many footballers the games can currently ask about */
  count: number
  /** the day the generated half was pulled, as a date */
  built: string
}

/** A snapshot cheap enough to hand `useSyncExternalStore` on every render. */
let snapshot: BookSnapshot = { state, count: LEGENDS.length, built }

export const bookSnapshot = () => snapshot

function settle(next: BookState) {
  state = next
  snapshot = { state, count: LEGENDS.length, built }
  tell()
}

/**
 * Pull the generated half in, once. Safe to call from anywhere and as often as
 * you like: the second caller gets the first one's promise.
 */
let running: Promise<void> | null = null

export function loadBook(): Promise<void> {
  if (running) return running
  if (state === 'ready') return Promise.resolve()

  settle('loading')
  running = (async () => {
    try {
      // A few megabytes of JSON parses far faster than the same few megabytes
      // of JavaScript, so it is fetched as a file rather than imported.
      const url = new URL('players.json', document.baseURI).toString()
      // A phone on a bad train line should get a smaller game rather than a
      // screen that says "fetching" until it is thrown out of the window.
      const stop = new AbortController()
      const giveUp = setTimeout(() => stop.abort(), 25_000)
      // Revalidate rather than trust the cache: a stale book would mean two
      // people getting different answers out of the same daily puzzle.
      const res = await fetch(url, { cache: 'no-cache', signal: stop.signal }).finally(() =>
        clearTimeout(giveUp),
      )
      if (!res.ok) throw new Error(`the book is not there (${res.status})`)
      const book = (await res.json()) as Book
      if (book?.v !== 1) throw new Error('a book this old is not readable')

      for (const [name, flag, conf] of book.nations)
        registerNation(name, flag, conf as Confederation)

      const made: Legend[] = []
      for (const [raw, born, nat, pos, fame, clubs, lastMove, total] of book.rows) {
        const path = clubs.map((i) => book.clubs[i]).filter(Boolean)
        if (!path.length) continue
        // belt and braces: an older book may still carry "(footballer, born
        // 1996)" on the end of a name, and nobody is ever going to type that
        const name = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
        if (!name) continue
        made.push(
          fromParts(
            name,
            book.nations[nat]?.[0] ?? '',
            book.pos[pos] ?? 'CM',
            born,
            path,
            fame,
            lastMove,
            total ?? 0,
          ),
        )
      }
      addLegends(made)
      built = book.built
      settle('ready')
    } catch {
      // A book that will not load is not a broken game: it is a smaller one.
      settle('failed')
    }
  })()
  return running
}
