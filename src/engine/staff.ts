import { personName } from './cohort'
import { Rng, clamp } from './rng'
import type { Position, SeasonRecord, SquadRole } from './types'

/**
 * The people around the football: a manager who has a view of you, a dressing
 * room that has a view of you, and a handful of teammates who stay named for
 * as long as you share a pitch with them.
 *
 * None of this moves the simulation on its own. What it does is decide the
 * squad role you are given, which the simulation already cared about, and give
 * the decisions somewhere to land. A manager who does not rate you is the
 * reason you are on the bench, rather than a second invisible dice roll.
 */

export type ManagerStyle = 'attacking' | 'defensive' | 'possession' | 'direct' | 'rotator'

export interface Manager {
  name: string
  style: ManagerStyle
  /** how they see you, 0 to 100; 50 is arriving with no opinion */
  opinion: number
  /** the season they took the job */
  since: number
  /** how safe their job is, 0 to 100 */
  standing: number
}

export interface Teammate {
  name: string
  position: Position
  ovr: number
  /** below fifty is a rival, above is a friend */
  bond: number
  since: number
}

export interface Room {
  manager: Manager
  /** how the squad sees you, 0 to 100 */
  standing: number
  mates: Teammate[]
  /** true once you have the armband here */
  captain: boolean
}

const STYLES: ManagerStyle[] = ['attacking', 'defensive', 'possession', 'direct', 'rotator']

export function newManager(season: number, rng: Rng, nation: string, conf: string): Manager {
  return {
    name: personName(nation, conf, rng),
    style: rng.pick(STYLES),
    opinion: clamp(Math.round(rng.gauss(50, 12)), 20, 80),
    since: season,
    standing: clamp(Math.round(rng.gauss(60, 15)), 15, 95),
  }
}

/** A fresh dressing room, built when a player joins a club. */
export function newRoom(
  season: number,
  squadOvr: number,
  rng: Rng,
  nation: string,
  conf: string,
): Room {
  const count = rng.int(3, 4)
  const mates: Teammate[] = []
  for (let i = 0; i < count; i++) {
    mates.push({
      name: personName(nation, conf, rng),
      position: rng.pick([
        'GK',
        'CB',
        'LB',
        'RB',
        'CDM',
        'CM',
        'CAM',
        'LW',
        'RW',
        'ST',
      ] as Position[]),
      ovr: clamp(Math.round(rng.gauss(squadOvr, 5)), 45, 94),
      bond: clamp(Math.round(rng.gauss(52, 16)), 10, 90),
      since: season,
    })
  }
  return {
    manager: newManager(season, rng, nation, conf),
    standing: clamp(Math.round(rng.gauss(50, 10)), 20, 80),
    mates,
    captain: false,
  }
}

/**
 * How a style reads a position. A manager who plays direct football has more
 * use for a target man than for a passer, and says so in his team sheet.
 */
const STYLE_FIT: Record<ManagerStyle, Partial<Record<Position, number>>> = {
  attacking: { ST: 6, LW: 5, RW: 5, CAM: 5, CB: -3, CDM: -2 },
  defensive: { CB: 6, CDM: 5, LB: 3, RB: 3, GK: 3, LW: -3, RW: -3, CAM: -4 },
  possession: { CM: 6, CAM: 4, CDM: 3, CB: 2, ST: -2 },
  direct: { ST: 5, RW: 3, LW: 3, CB: 2, CAM: -3, CM: -2 },
  rotator: {},
}

export function styleFit(style: ManagerStyle, position: Position): number {
  return STYLE_FIT[style][position] ?? 0
}

/**
 * Where a manager's opinion lands after a season.
 *
 * Performance is most of it, but the fit between how he plays and where you
 * play is a standing thumb on the scale, and it is why a new manager can end a
 * spell without you having done anything wrong.
 */
export function updateOpinion(
  manager: Manager,
  record: SeasonRecord,
  position: Position,
  rng: Rng,
): Manager {
  const played = record.apps > 0
  const performance = played ? (record.rating - 670) / 100 : -1.5
  const fit = styleFit(manager.style, position) * 0.5
  const move = performance * 6 + fit + rng.gauss(0, 3)
  return {
    ...manager,
    opinion: clamp(Math.round(manager.opinion + move), 0, 100),
  }
}

/** The squad's view moves more slowly, and cares about different things. */
export function updateStanding(room: Room, record: SeasonRecord, rng: Rng): number {
  const played = clamp(record.apps / 30, 0, 1)
  const move = (played - 0.45) * 8 + (record.rating > 700 ? 3 : 0) + rng.gauss(0, 2.5)
  return clamp(Math.round(room.standing + move), 0, 100)
}

/**
 * Does the manager keep his job?
 *
 * A sacking is the event that can turn a career, so it needs to be possible
 * without being constant. A manager who has been there a while and is doing
 * badly is the one who goes.
 */
export function managerSurvives(
  manager: Manager,
  leaguePosition: number,
  season: number,
  rng: Rng,
): boolean {
  const years = season - manager.since
  const pressure = (leaguePosition - 8) * 0.022 + (years > 4 ? 0.08 : 0) - manager.standing * 0.0035
  return !rng.chance(clamp(pressure, 0.03, 0.6))
}

/**
 * The role the manager gives you, which is the one thing in here the
 * simulation reads. Opinion decides it; the rating you actually have is the
 * floor and the ceiling around it.
 */
export function roleFromOpinion(baseRole: SquadRole, opinion: number): SquadRole {
  const order: SquadRole[] = ['Benchwarmer', 'Squad player', 'Rotation', 'Starter', 'Key player']
  const at = order.indexOf(baseRole)
  if (at < 0) return baseRole
  const shift = opinion >= 78 ? 1 : opinion >= 62 ? 0 : opinion >= 40 ? 0 : opinion >= 25 ? -1 : -2
  return order[clamp(at + shift, 0, order.length - 1)]
}

/** How teammates drift over a season together. */
export function agedRoom(room: Room, rng: Rng): Room {
  return {
    ...room,
    mates: room.mates.map((m) => ({
      ...m,
      bond: clamp(Math.round(m.bond + rng.gauss(2, 6)), 0, 100),
    })),
  }
}

export type Mood = 'trusted' | 'liked' | 'tolerated' | 'doubted' | 'frozen'

export function moodOf(opinion: number): Mood {
  if (opinion >= 78) return 'trusted'
  if (opinion >= 62) return 'liked'
  if (opinion >= 40) return 'tolerated'
  if (opinion >= 22) return 'doubted'
  return 'frozen'
}

/** The friends and the rivals, for the screen that shows them. */
export function sortedMates(room: Room): { friends: Teammate[]; rivals: Teammate[] } {
  return {
    friends: room.mates.filter((m) => m.bond >= 60).sort((a, b) => b.bond - a.bond),
    rivals: room.mates.filter((m) => m.bond < 40).sort((a, b) => a.bond - b.bond),
  }
}
