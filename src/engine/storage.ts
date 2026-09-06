import type { Career } from './types'

const KEY = 'career-sim:saves'
/** Mirrors the live key after every successful write. A corrupted or
 *  unreadable primary value recovers from here instead of just vanishing. */
const BACKUP_KEY = 'career-sim:saves:backup'
/** Whatever the primary key held the last time it could not be read, so a
 *  version bump or a stray edit never deletes a career without a trace. */
const UNREADABLE_KEY = 'career-sim:saves:unreadable'
/** Bumped when the save shape changes; older files are archived rather than crashing. */
const VERSION = 2

interface SaveFile {
  version: number
  careers: Career[]
}

function empty(): SaveFile {
  return { version: VERSION, careers: [] }
}

function parse(raw: string | null): SaveFile | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SaveFile
    if (parsed.version !== VERSION || !Array.isArray(parsed.careers)) return null
    return parsed
  } catch {
    return null
  }
}

function read(): SaveFile {
  const raw = localStorage.getItem(KEY)
  const primary = parse(raw)
  if (primary) return primary

  if (raw) {
    try {
      localStorage.setItem(UNREADABLE_KEY, raw)
    } catch {
      // best effort; losing the archive is no worse than the read that already failed
    }
  }

  const backup = parse(localStorage.getItem(BACKUP_KEY))
  if (backup) {
    try {
      localStorage.setItem(KEY, JSON.stringify(backup))
    } catch {
      // the recovered value is still returned even if it cannot be re-persisted yet
    }
    return backup
  }

  return empty()
}

function write(file: SaveFile) {
  const json = JSON.stringify(file)
  try {
    localStorage.setItem(KEY, json)
    localStorage.setItem(BACKUP_KEY, json)
  } catch (err) {
    console.warn('could not save career', err)
  }
}

export function listCareers(): Career[] {
  return read().careers.sort((a, b) => b.createdAt - a.createdAt)
}

export function saveCareer(career: Career) {
  const file = read()
  const idx = file.careers.findIndex((c) => c.id === career.id)
  if (idx >= 0) file.careers[idx] = career
  else file.careers.push(career)
  write(file)
}

export function renameCareer(id: string, name: string) {
  const file = read()
  const career = file.careers.find((c) => c.id === id)
  if (!career) return
  career.player.name = name
  write(file)
}

export function deleteCareer(id: string) {
  const file = read()
  file.careers = file.careers.filter((c) => c.id !== id)
  write(file)
}

export function exportCareer(career: Career) {
  const blob = new Blob([JSON.stringify(career, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${career.player.name.replace(/\s+/g, '-').toLowerCase()}-career.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importCareer(file: File): Promise<Career> {
  const text = await file.text()
  const career = JSON.parse(text) as Career
  if (!career?.player?.name || !Array.isArray(career.history)) {
    throw new Error('That does not look like a career file.')
  }
  career.id = `${career.seed}-${Date.now()}`
  saveCareer(career)
  return career
}
