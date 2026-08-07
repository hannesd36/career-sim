import type { Club } from '../engine/types'
import { LEAGUE_BY_ID, clubStrength } from './leagues'
import rawClubs from './clubs.json'

interface RawClub {
  id: string
  name: string
  leagueId: string
  tier: number
  badge: string | null
}

export const CLUBS: Club[] = (rawClubs as RawClub[]).map((c) => ({
  ...c,
  strength: clubStrength(c.leagueId, c.tier),
}))

export const CLUB_BY_ID: Record<string, Club> = Object.fromEntries(CLUBS.map((c) => [c.id, c]))

const byLeague = new Map<string, Club[]>()
for (const club of CLUBS) {
  const list = byLeague.get(club.leagueId)
  if (list) list.push(club)
  else byLeague.set(club.leagueId, [club])
}

export function clubsInLeague(leagueId: string): Club[] {
  return byLeague.get(leagueId) ?? []
}

export function leagueOf(club: Club) {
  return LEAGUE_BY_ID[club.leagueId]
}

/** "Bundesliga · Germany" */
export function leagueLabel(leagueId: string): string {
  const l = LEAGUE_BY_ID[leagueId]
  return `${l.name} · ${l.country}`
}
