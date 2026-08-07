export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST'

export const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

export type Foot = 'Left' | 'Right'

export type SquadRole = 'Key player' | 'Starter' | 'Rotation' | 'Squad player' | 'Benchwarmer'

export type Archetype = 'wonderkid' | 'normal' | 'late'

export interface Club {
  id: string
  name: string
  leagueId: string
  tier: number
  badge: string | null
  /** expected squad-average OVR */
  strength: number
}

export type TrophyId =
  | 'league'
  | 'cup'
  | 'continental'
  | 'worldcup'
  | 'continentalnation'
  | 'ballondor'
  | 'goldenboot'
  | 'playmaker'
  | 'goldenglove'
  | 'goldenboy'
  | 'tots'

/**
 * Trophies store what they were won with, never a rendered label — the label is
 * built at draw time so the whole cabinet can switch language.
 */
export interface Trophy {
  id: TrophyId
  season: number
  /** club or national team it was won with */
  wonWith?: string
  /** league the competition or award belongs to */
  leagueId?: string
}

/** One row of the career table. */
export interface SeasonRecord {
  season: number
  age: number
  clubId: string
  clubName: string
  badge: string | null
  leagueId: string
  onLoan: boolean
  ovrStart: number
  ovrEnd: number
  role: SquadRole
  apps: number
  goals: number
  assists: number
  /** goalkeepers and defenders */
  cleanSheets: number
  conceded: number
  saves: number
  tackles: number
  keyPasses: number
  yellowCards: number
  redCards: number
  rating: number
  minutes: number
  gamesMissedInjured: number
  leaguePosition: number
  /** the visible ceiling before and after this season, so the report can show the move */
  ceilingBefore: [number, number]
  ceilingAfter: [number, number]
  trophies: Trophy[]
  /** suspended for the whole season */
  banned: boolean
  /** a test came back positive at the end of this season */
  caught?: boolean
  /** the club reached this final; a shootout decides whether it is won */
  finalIn?: { trophy: TrophyId; opponent: string }
  /** international */
  natApps: number
  natGoals: number
  natAssists: number
  natCleanSheets: number
}

export interface Offer {
  club: Club
  loan: boolean
  projectedRole: SquadRole
  /** true if the club played continental football last season */
  continental: boolean
}

export type RetirementReason = 'forced' | 'bench' | 'legs' | 'borrowed'

export interface Player {
  name: string
  nation: string
  position: Position
  foot: Foot
  age: number
  ovr: number
  /** never shown to the player */
  hiddenPotential: number
  /** the visible range, narrowing every season */
  potMin: number
  potMax: number
  archetype: Archetype
  value: number
  clubId: string
  onLoan: boolean
  /** club the loan returns to */
  parentClubId: string | null
  retired: boolean
  natCapped: boolean

  // --- the gambling side of a career ---
  /** on a banned programme right now */
  doping: boolean
  /** how many seasons on it, which is what drives the testing risk */
  dopingSeasons: number
  /** season the player is free to play again, or null */
  bannedUntil: number | null
  /** 0-100, starts at 50; only a ban moves it, and clubs notice */
  reputation: number
}

export type Phase = 'create' | 'season' | 'event' | 'penalty' | 'offers' | 'retired'

/**
 * How fast the career runs. The mode sets how many seasons a click covers and
 * how often life gets in the way — a sprint should not stop every summer for a
 * decision, and a detailed run should stop constantly.
 */
export type GameMode = 'blitz' | 'quick' | 'normal' | 'story'

export interface ModeConfig {
  /** seasons a single click plays through */
  seasons: number
  /** chance per summer that a decision comes up */
  eventPressure: number
  /** how much the season report shows */
  detail: 'low' | 'mid' | 'high'
}

export const MODE_CONFIG: Record<GameMode, ModeConfig> = {
  blitz: { seasons: 5, eventPressure: 0.1, detail: 'low' },
  quick: { seasons: 3, eventPressure: 0.22, detail: 'mid' },
  normal: { seasons: 1, eventPressure: 0.42, detail: 'mid' },
  story: { seasons: 1, eventPressure: 0.8, detail: 'high' },
}

export interface PendingEvent {
  id: string
  season: number
  /** filled in once the player has picked, so the result can be shown */
  chosen?: string
  outcome?: { result: string; tone: 'good' | 'bad' | 'neutral' }
}

export type PenaltyCorner = 'left' | 'centre' | 'right'

/** A final that comes down to one kick, taken by the player. */
export interface PendingPenalty {
  season: number
  trophy: TrophyId
  club: string
  opponent: string
  taken?: PenaltyCorner
  keeper?: PenaltyCorner
  scored?: boolean
  /** a keeper who went the other way cannot have saved it */
  result?: 'scored' | 'saved' | 'wide'
}

export interface EventLogEntry {
  season: number
  id: string
  choice: string
  result: string
  tone: 'good' | 'bad' | 'neutral'
}

export interface Career {
  id: string
  seed: number
  startYear: number
  season: number
  player: Player
  history: SeasonRecord[]
  trophies: Trophy[]
  offers: Offer[]
  phase: Phase
  /** last simulated season, kept for the season report */
  lastSeason: SeasonRecord | null
  /** every season played by the most recent click — one entry, or five */
  lastRun: SeasonRecord[]
  /** seasons the current click still owes; a decision pauses a run, never ends it */
  runLeft: number
  mode: GameMode
  pendingEvent: PendingEvent | null
  pendingPenalty: PendingPenalty | null
  eventLog: EventLogEntry[]
  createdAt: number
}
