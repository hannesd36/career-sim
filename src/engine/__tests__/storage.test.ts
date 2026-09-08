import { beforeEach, describe, expect, it } from 'vitest'
import { createCareer } from '../career'
import { deleteCareer, listCareers, renameCareer, saveCareer } from '../storage'

/** A minimal in-memory Storage, since these tests run outside a browser. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
})

const opts = {
  name: 'Storage Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

describe('storage', () => {
  it('round-trips a career through save, list and delete', () => {
    const career = createCareer({ ...opts, seed: 1 })
    saveCareer(career)

    expect(listCareers().map((c) => c.id)).toContain(career.id)

    deleteCareer(career.id)
    expect(listCareers().map((c) => c.id)).not.toContain(career.id)
  })

  it('saving the same id twice updates it in place rather than duplicating it', () => {
    const career = createCareer({ ...opts, seed: 2 })
    saveCareer(career)
    saveCareer({ ...career, season: career.season + 1 })

    const matches = listCareers().filter((c) => c.id === career.id)
    expect(matches).toHaveLength(1)
    expect(matches[0].season).toBe(career.season + 1)
  })

  it('renameCareer changes only the player name of the matching save', () => {
    const career = createCareer({ ...opts, seed: 3 })
    saveCareer(career)
    renameCareer(career.id, 'New Name')

    const [saved] = listCareers().filter((c) => c.id === career.id)
    expect(saved.player.name).toBe('New Name')
  })

  it('renameCareer on an id that does not exist changes nothing', () => {
    const career = createCareer({ ...opts, seed: 4 })
    saveCareer(career)
    expect(() => renameCareer('does-not-exist', 'X')).not.toThrow()
    expect(listCareers()).toHaveLength(1)
  })

  it('recovers from a corrupted primary key using the mirrored backup', () => {
    const career = createCareer({ ...opts, seed: 5 })
    saveCareer(career)

    // simulate corruption of the live key — the mirror should still be intact
    localStorage.setItem('career-sim:saves', '{not valid json')

    const recovered = listCareers()
    expect(recovered.map((c) => c.id)).toContain(career.id)

    // the primary key should have self-healed for the next read
    expect(() => JSON.parse(localStorage.getItem('career-sim:saves')!)).not.toThrow()
  })

  it('returns an empty list rather than throwing when nothing has ever been saved', () => {
    expect(listCareers()).toEqual([])
  })

  it('returns an empty list rather than throwing when both keys are corrupted', () => {
    localStorage.setItem('career-sim:saves', '{not valid json')
    localStorage.setItem('career-sim:saves:backup', 'also not valid json')
    expect(listCareers()).toEqual([])
  })
})
