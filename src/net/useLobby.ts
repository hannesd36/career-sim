import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearUrlRoom,
  host as openRoom,
  inviteLink,
  join as enterRoom,
  newRoomCode,
  type Link,
  type LinkState,
  type Wire,
} from './peer'

export interface Lobby {
  state: LinkState
  /** why it failed, when it failed: "taken", "noroom", "dropped" */
  detail?: string
  room: string | null
  isHost: boolean
  connected: boolean
  /** open a room and get a code to hand out */
  start: () => void
  /** walk into a room somebody read out to you */
  enter: (code: string) => void
  leave: () => void
  send: (msg: Wire) => void
  link: string | null
}

/**
 * A lobby that lives as long as the screen it is on.
 *
 * The message handler is held in a ref so a component can re-render as much as
 * it likes without tearing down the connection underneath it, which is the one
 * thing you cannot do halfway through a game.
 */
export function useLobby(game: 'grid' | 'guess', onMessage: (msg: Wire) => void): Lobby {
  const [state, setState] = useState<LinkState>('idle')
  const [detail, setDetail] = useState<string | undefined>()
  const [room, setRoom] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const linkRef = useRef<Link | null>(null)
  const handler = useRef(onMessage)
  handler.current = onMessage

  const handlers = {
    onState: (s: LinkState, d?: string) => {
      setState(s)
      setDetail(d)
    },
    onMessage: (m: Wire) => handler.current(m),
  }

  const start = useCallback(() => {
    linkRef.current?.close()
    const code = newRoomCode()
    setRoom(code)
    setIsHost(true)
    linkRef.current = openRoom(code, handlers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enter = useCallback((code: string) => {
    const clean = code.trim().toUpperCase()
    if (!clean) return
    linkRef.current?.close()
    setRoom(clean)
    setIsHost(false)
    linkRef.current = enterRoom(clean, handlers)
    clearUrlRoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const leave = useCallback(() => {
    linkRef.current?.close()
    linkRef.current = null
    setRoom(null)
    setIsHost(false)
    setState('idle')
    setDetail(undefined)
  }, [])

  const send = useCallback((msg: Wire) => linkRef.current?.send(msg), [])

  // the connection outlives renders, not the screen
  useEffect(() => () => linkRef.current?.close(), [])

  return {
    state,
    detail,
    room,
    isHost,
    connected: state === 'open',
    start,
    enter,
    leave,
    send,
    link: room && isHost ? inviteLink(room, game) : null,
  }
}
