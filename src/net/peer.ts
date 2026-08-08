import type { DataConnection, Peer as PeerType } from 'peerjs'

/**
 * The signalling library is a hundred kilobytes and most people never open a
 * room, so it is fetched the moment somebody actually wants one and not before.
 */
const loadPeer = () => import('peerjs').then((m) => m.Peer)

/**
 * Two people, one game, no server of ours.
 *
 * A lobby is a direct connection between two browsers. One side opens a room
 * and gets a code; the other side pastes the code, or follows a link with the
 * code already in it. The only thing in the middle is a public signalling
 * broker that introduces the two of you and then gets out of the way, which is
 * why this works on a site that is nothing but static files.
 *
 * Everything after the handshake travels straight between the two machines.
 */

/** Room codes avoid the letters and digits people mistype reading them out. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newRoomCode(len = 5): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** The broker hands out ids globally, so ours carry a name nobody else uses. */
const peerIdFor = (room: string) => `karrieresim-${room.toUpperCase()}`

export type LinkState =
  | 'idle'
  | 'opening'
  | 'waiting'
  | 'connecting'
  | 'open'
  | 'closed'
  | 'error'

/** Anything either side can say. The games agree on the payloads themselves. */
export interface Wire {
  t: string
  [key: string]: unknown
}

export interface Link {
  /** the code you read out, or put in a link */
  room: string
  /** true for the side that opened the room; it owns the seed and goes first */
  host: boolean
  send: (msg: Wire) => void
  close: () => void
}

export interface LinkHandlers {
  onState: (state: LinkState, detail?: string) => void
  onMessage: (msg: Wire) => void
}

/**
 * Open a room and wait for somebody to walk in.
 *
 * The room code is the peer id, so the invite link is the whole handshake: the
 * other browser knows exactly who to ask for.
 */
export function host(room: string, h: LinkHandlers): Link {
  let peer: PeerType | null = null
  let conn: DataConnection | null = null
  let shut = false

  h.onState('opening')

  loadPeer().then((Peer) => {
    if (shut) return
    peer = new Peer(peerIdFor(room), { debug: 0 })

    peer.on('open', () => {
      if (!shut) h.onState('waiting')
    })

    peer.on('connection', (c) => {
      // one guest at a time; a second knock is turned away rather than queued
      if (conn) {
        c.close()
        return
      }
      conn = c
      wire(c, h, () => {
        conn = null
      })
    })

    peer.on('error', (err) => {
      if (shut) return
      h.onState('error', err.type === 'unavailable-id' ? 'taken' : err.type)
    })
  })

  return {
    room,
    host: true,
    send: (msg) => conn?.open && conn.send(msg),
    close: () => {
      shut = true
      conn?.close()
      peer?.destroy()
      h.onState('closed')
    },
  }
}

/** Walk into somebody else's room. */
export function join(room: string, h: LinkHandlers): Link {
  let peer: PeerType | null = null
  let conn: DataConnection | null = null
  let shut = false

  h.onState('connecting')

  loadPeer().then((Peer) => {
    if (shut) return
    peer = new Peer({ debug: 0 })

    peer.on('open', () => {
      if (shut || !peer) return
      const c = peer.connect(peerIdFor(room), { reliable: true })
      conn = c
      wire(c, h, () => {
        conn = null
      })
    })

    peer.on('error', (err) => {
      if (shut) return
      h.onState('error', err.type === 'peer-unavailable' ? 'noroom' : err.type)
    })
  })

  return {
    room,
    host: false,
    send: (msg) => conn?.open && conn.send(msg),
    close: () => {
      shut = true
      conn?.close()
      peer?.destroy()
      h.onState('closed')
    },
  }
}

function wire(c: DataConnection, h: LinkHandlers, onGone: () => void) {
  c.on('open', () => h.onState('open'))
  c.on('data', (data) => {
    if (data && typeof data === 'object') h.onMessage(data as Wire)
  })
  c.on('close', () => {
    onGone()
    h.onState('closed')
  })
  c.on('error', () => {
    onGone()
    h.onState('error', 'dropped')
  })
}

/** The link you send a friend: this page, with the room in it. */
export function inviteLink(room: string, game: 'grid' | 'guess'): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = `?room=${room}&game=${game}`
  return url.toString()
}

/** A room code sitting in the address bar, if somebody arrived by link. */
export function roomFromUrl(): { room: string; game: 'grid' | 'guess' } | null {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room')
  if (!room) return null
  const game = params.get('game') === 'guess' ? 'guess' : 'grid'
  return { room: room.toUpperCase(), game }
}

/** Take the room out of the address bar once it has been used. */
export function clearUrlRoom() {
  const url = new URL(window.location.href)
  url.search = ''
  window.history.replaceState({}, '', url.toString())
}
