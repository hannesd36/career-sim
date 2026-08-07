import type { Career } from './types'

const KEY = 'career-sim:saves'
/** Bumped when the save shape changes; older files are discarded rather than crashing. */
const VERSION = 2

interface SaveFile {
  version: number
  careers: Career[]
}

function read(): SaveFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { version: VERSION, careers: [] }
    const parsed = JSON.parse(raw) as SaveFile
    if (parsed.version !== VERSION || !Array.isArray(parsed.careers)) {
      return { version: VERSION, careers: [] }
    }
    return parsed
  } catch {
    return { version: VERSION, careers: [] }
  }
}

function write(file: SaveFile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
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
