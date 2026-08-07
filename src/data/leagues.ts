/** Football markets that move players between each other freely. */
export type Region =
  | 'dach'
  | 'britain'
  | 'iberia'
  | 'lowlands'
  | 'france'
  | 'italy'
  | 'nordic'
  | 'centraleast'
  | 'southeast'
  | 'northamerica'
  | 'southamerica'
  | 'gulf'

export type Continent = 'europe' | 'americas' | 'asia'

export interface League {
  id: string
  name: string
  country: string
  /** flagcdn.com country code */
  flag: string
  /** domestic pyramid level — 1 = top flight */
  tier: number
  /** average squad OVR of the division; the yardstick everything else is measured against */
  strength: number
  teams: number
  /** how many clubs reach continental competition */
  euroSpots: number
  /** continental competition label, if any */
  continental: string | null
  region: Region
  continent: Continent
  /**
   * Leagues players move to late in a career for money or lifestyle rather than
   * to push their level — the Saudi and North American markets.
   */
  lateCareer?: boolean
  /** id of the division below (relegation target) */
  below?: string
  /** id of the division above (promotion target) */
  above?: string
}

export const LEAGUES: League[] = [
  // ---------- Europe, top flights ----------
  { id: 'eng1', name: 'Premier League',      country: 'England',     flag: 'gb-eng', tier: 1, strength: 78, teams: 20, euroSpots: 7, continental: 'Champions League', region: 'britain',     continent: 'europe', below: 'eng2' },
  { id: 'esp1', name: 'La Liga',             country: 'Spain',       flag: 'es',     tier: 1, strength: 76, teams: 20, euroSpots: 7, continental: 'Champions League', region: 'iberia',      continent: 'europe', below: 'esp2' },
  { id: 'ger1', name: 'Bundesliga',          country: 'Germany',     flag: 'de',     tier: 1, strength: 76, teams: 18, euroSpots: 7, continental: 'Champions League', region: 'dach',        continent: 'europe', below: 'ger2' },
  { id: 'ita1', name: 'Serie A',             country: 'Italy',       flag: 'it',     tier: 1, strength: 76, teams: 20, euroSpots: 7, continental: 'Champions League', region: 'italy',       continent: 'europe', below: 'ita2' },
  { id: 'fra1', name: 'Ligue 1',             country: 'France',      flag: 'fr',     tier: 1, strength: 74, teams: 18, euroSpots: 6, continental: 'Champions League', region: 'france',      continent: 'europe', below: 'fra2' },
  { id: 'por1', name: 'Primeira Liga',       country: 'Portugal',    flag: 'pt',     tier: 1, strength: 71, teams: 18, euroSpots: 5, continental: 'Champions League', region: 'iberia',      continent: 'europe' },
  { id: 'tur1', name: 'Süper Lig',           country: 'Türkiye',     flag: 'tr',     tier: 1, strength: 71, teams: 19, euroSpots: 5, continental: 'Champions League', region: 'southeast',   continent: 'europe' },
  { id: 'ned1', name: 'Eredivisie',          country: 'Netherlands', flag: 'nl',     tier: 1, strength: 70, teams: 18, euroSpots: 5, continental: 'Champions League', region: 'lowlands',    continent: 'europe' },
  { id: 'bel1', name: 'Pro League',          country: 'Belgium',     flag: 'be',     tier: 1, strength: 69, teams: 16, euroSpots: 4, continental: 'Champions League', region: 'lowlands',    continent: 'europe' },
  { id: 'gre1', name: 'Super League',        country: 'Greece',      flag: 'gr',     tier: 1, strength: 67, teams: 14, euroSpots: 4, continental: 'Champions League', region: 'southeast',   continent: 'europe' },
  { id: 'sco1', name: 'Premiership',         country: 'Scotland',    flag: 'gb-sct', tier: 1, strength: 66, teams: 12, euroSpots: 4, continental: 'Champions League', region: 'britain',     continent: 'europe' },
  { id: 'aut1', name: 'Bundesliga',          country: 'Austria',     flag: 'at',     tier: 1, strength: 66, teams: 12, euroSpots: 4, continental: 'Champions League', region: 'dach',        continent: 'europe' },
  { id: 'sui1', name: 'Super League',        country: 'Switzerland', flag: 'ch',     tier: 1, strength: 66, teams: 12, euroSpots: 4, continental: 'Champions League', region: 'dach',        continent: 'europe' },
  { id: 'den1', name: 'Superliga',           country: 'Denmark',     flag: 'dk',     tier: 1, strength: 66, teams: 12, euroSpots: 4, continental: 'Champions League', region: 'nordic',      continent: 'europe' },
  { id: 'cze1', name: 'First League',        country: 'Czechia',     flag: 'cz',     tier: 1, strength: 65, teams: 16, euroSpots: 4, continental: 'Champions League', region: 'centraleast', continent: 'europe' },
  { id: 'cro1', name: 'HNL',                 country: 'Croatia',     flag: 'hr',     tier: 1, strength: 64, teams: 10, euroSpots: 3, continental: 'Champions League', region: 'centraleast', continent: 'europe' },
  { id: 'pol1', name: 'Ekstraklasa',         country: 'Poland',      flag: 'pl',     tier: 1, strength: 64, teams: 18, euroSpots: 4, continental: 'Champions League', region: 'centraleast', continent: 'europe' },
  { id: 'nor1', name: 'Eliteserien',         country: 'Norway',      flag: 'no',     tier: 1, strength: 64, teams: 16, euroSpots: 4, continental: 'Champions League', region: 'nordic',      continent: 'europe' },

  // ---------- Europe, second & third tiers ----------
  { id: 'eng2', name: 'Championship',        country: 'England',     flag: 'gb-eng', tier: 2, strength: 70, teams: 24, euroSpots: 0, continental: null, region: 'britain', continent: 'europe', above: 'eng1', below: 'eng3' },
  { id: 'esp2', name: 'Segunda División',    country: 'Spain',       flag: 'es',     tier: 2, strength: 68, teams: 22, euroSpots: 0, continental: null, region: 'iberia',  continent: 'europe', above: 'esp1' },
  { id: 'ger2', name: '2. Bundesliga',       country: 'Germany',     flag: 'de',     tier: 2, strength: 67, teams: 18, euroSpots: 0, continental: null, region: 'dach',    continent: 'europe', above: 'ger1', below: 'ger3' },
  { id: 'ita2', name: 'Serie B',             country: 'Italy',       flag: 'it',     tier: 2, strength: 67, teams: 20, euroSpots: 0, continental: null, region: 'italy',   continent: 'europe', above: 'ita1' },
  { id: 'fra2', name: 'Ligue 2',             country: 'France',      flag: 'fr',     tier: 2, strength: 66, teams: 18, euroSpots: 0, continental: null, region: 'france',  continent: 'europe', above: 'fra1' },
  { id: 'eng3', name: 'League One',          country: 'England',     flag: 'gb-eng', tier: 3, strength: 61, teams: 24, euroSpots: 0, continental: null, region: 'britain', continent: 'europe', above: 'eng2' },
  { id: 'ger3', name: '3. Liga',             country: 'Germany',     flag: 'de',     tier: 3, strength: 59, teams: 20, euroSpots: 0, continental: null, region: 'dach',    continent: 'europe', above: 'ger2' },

  // ---------- Rest of the world ----------
  { id: 'bra1', name: 'Série A',             country: 'Brazil',      flag: 'br',     tier: 1, strength: 72, teams: 20, euroSpots: 6, continental: 'Copa Libertadores',        region: 'southamerica', continent: 'americas' },
  { id: 'ksa1', name: 'Saudi Pro League',    country: 'Saudi Arabia',flag: 'sa',     tier: 1, strength: 71, teams: 18, euroSpots: 4, continental: 'AFC Champions League',     region: 'gulf',         continent: 'asia',     lateCareer: true },
  { id: 'mex1', name: 'Liga MX',             country: 'Mexico',      flag: 'mx',     tier: 1, strength: 70, teams: 18, euroSpots: 4, continental: 'CONCACAF Champions Cup',   region: 'northamerica', continent: 'americas' },
  { id: 'arg1', name: 'Primera División',    country: 'Argentina',   flag: 'ar',     tier: 1, strength: 69, teams: 28, euroSpots: 6, continental: 'Copa Libertadores',        region: 'southamerica', continent: 'americas' },
  { id: 'usa1', name: 'Major League Soccer', country: 'USA',         flag: 'us',     tier: 1, strength: 69, teams: 29, euroSpots: 4, continental: 'CONCACAF Champions Cup',   region: 'northamerica', continent: 'americas', lateCareer: true },
]

/**
 * Markets that trade with each other more than distance alone would suggest —
 * shared borders, shared languages, well-worn scouting routes.
 */
const NEIGHBOURS: Record<Region, Region[]> = {
  dach: ['france', 'italy', 'centraleast', 'lowlands'],
  britain: ['lowlands', 'nordic'],
  iberia: ['france', 'southamerica'],
  lowlands: ['dach', 'britain', 'france'],
  france: ['dach', 'lowlands', 'iberia', 'italy'],
  italy: ['france', 'dach', 'southeast'],
  nordic: ['britain', 'lowlands', 'centraleast'],
  centraleast: ['dach', 'southeast', 'nordic'],
  southeast: ['italy', 'centraleast'],
  northamerica: ['southamerica'],
  southamerica: ['iberia', 'northamerica'],
  gulf: ['southeast'],
}

export function areNeighbours(a: Region, b: Region): boolean {
  return NEIGHBOURS[a]?.includes(b) ?? false
}

export const LEAGUE_BY_ID: Record<string, League> = Object.fromEntries(
  LEAGUES.map((l) => [l.id, l]),
)

/** How far a club sits above or below its division's average squad rating. */
export const CLUB_TIER_OFFSET: Record<number, number> = {
  1: 7, // title contender / continental regular
  2: 3, // pushing for Europe
  3: 0, // solid mid-table
  4: -3, // lower mid-table
  5: -6, // relegation fodder
}

export function clubStrength(leagueId: string, tier: number): number {
  const league = LEAGUE_BY_ID[leagueId]
  return league.strength + (CLUB_TIER_OFFSET[tier] ?? 0)
}
