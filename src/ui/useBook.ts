import { useEffect, useSyncExternalStore } from 'react'
import { bookSnapshot, loadBook, subscribeBook } from '../data/book'

/**
 * How much of the book is currently in the room.
 *
 * Calling this anywhere starts the fetch; calling it in ten places does not
 * start ten fetches. Screens that need the whole book before they are fair —
 * both games — wait for `state` to settle before they let you kick off.
 */
export function useBook() {
  const snap = useSyncExternalStore(subscribeBook, bookSnapshot, bookSnapshot)
  useEffect(() => {
    void loadBook()
  }, [])
  return snap
}
