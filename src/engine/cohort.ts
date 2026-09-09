import { CLUBS } from '../data/clubs'
import type { Legend } from '../data/legend'
import { NATION_BY_NAME, NATIONS } from '../data/nations'
import { LEGENDS } from '../data/players'
import { Rng, clamp } from './rng'
import { totals } from './career'
import { isKeeper } from './sim'
import type { Career, Club, Position } from './types'

/**
 * The rest of your year group.
 *
 * Nine other sixteen-year-olds come through in the same summer you do, and the
 * table they are in is the only place a career is ranked against somebody else
 * while it is still being played. Everything else in the game tells you how you
 * are doing; this tells you where you are.
 *
 * They are not simulated. A peer is a curve — a starting rating, a ceiling, an
 * age it peaks at — evaluated at whatever age you ask for, so the whole table
 * costs nothing to draw and can be asked about any season of the career,
 * including ones played before the feature existed.
 */
export interface Peer {
  id: number
  name: string
  nation: string
  flag: string
  position: Position
  /** rating at 16 */
  start: number
  /** the ceiling this one actually reaches */
  ceiling: number
  /** age the curve tops out at */
  peakAge: number
  /** the club they came through at, by strength band */
  clubId: string
  /** true when this is a real footballer out of the book */
  real: boolean
}

const FORENAMES: Record<string, string[]> = {
  latin: [
    'Mateo',
    'Bruno',
    'Diego',
    'Rafael',
    'Tomás',
    'Andrés',
    'Nico',
    'Iker',
    'Álvaro',
    'Rúben',
    'Joao',
    'Éder',
    'Vinícius',
    'Marcelo',
    'Sergio',
  ],
  germanic: [
    'Jonas',
    'Lukas',
    'Finn',
    'Niklas',
    'Tim',
    'Moritz',
    'Elias',
    'Jannik',
    'Bastian',
    'Sven',
    'Kai',
    'Lars',
    'Ole',
    'Rasmus',
    'Emil',
  ],
  anglo: [
    'Harry',
    'Jack',
    'Callum',
    'Reece',
    'Ethan',
    'Louis',
    'Kyle',
    'Owen',
    'Mason',
    'Declan',
    'Riley',
    'Josh',
    'Connor',
    'Zac',
    'Alfie',
  ],
  slavic: [
    'Milan',
    'Luka',
    'Ivan',
    'Tomasz',
    'Marek',
    'Nikola',
    'Stefan',
    'Dejan',
    'Piotr',
    'Andrej',
    'Vasyl',
    'Damir',
    'Filip',
    'Bojan',
    'Kiril',
  ],
  african: [
    'Youssef',
    'Amadou',
    'Kwame',
    'Sadio',
    'Ibrahim',
    'Moussa',
    'Chidi',
    'Samuel',
    'Riyad',
    'Achraf',
    'Bilal',
    'Kelechi',
    'Thabo',
    'Omar',
    'Seydou',
  ],
  asian: [
    'Takumi',
    'Hiroshi',
    'Minjae',
    'Sunwoo',
    'Kenji',
    'Daichi',
    'Jaehyun',
    'Ali',
    'Reza',
    'Kaito',
    'Wei',
    'Faisal',
    'Yusuf',
    'Arman',
    'Sota',
  ],
}

const SURNAMES: Record<string, string[]> = {
  latin: [
    'Silva',
    'Moreno',
    'Ferreira',
    'Castro',
    'Oliveira',
    'Navarro',
    'Ribeiro',
    'Sanchis',
    'Marchetti',
    'Bonucci',
    'Rossi',
    'Duarte',
    'Iglesias',
    'Barros',
    'Pereira',
  ],
  germanic: [
    'Bergmann',
    'Hofmann',
    'Vogel',
    'Keller',
    'Brandt',
    'Dahl',
    'Nyman',
    'Van Dijk',
    'De Vries',
    'Bakker',
    'Lindqvist',
    'Haaland',
    'Sørensen',
    'Reus',
    'Wagner',
  ],
  anglo: [
    'Whitfield',
    'Barnes',
    'Doyle',
    'Hughes',
    'Carter',
    'Mitchell',
    'Fletcher',
    'Reid',
    'Bennett',
    'Kavanagh',
    'Shaw',
    'Ellis',
    'Foster',
    'Wallace',
    'Nolan',
  ],
  slavic: [
    'Kovač',
    'Novák',
    'Petrović',
    'Wójcik',
    'Marković',
    'Horvat',
    'Dvořák',
    'Šimić',
    'Bogdan',
    'Lewandow',
    'Rakitić',
    'Zieliński',
    'Krstić',
    'Pavlenko',
    'Milić',
  ],
  african: [
    'Diallo',
    'Traoré',
    'Mensah',
    'Okafor',
    'Bakayoko',
    'Ndiaye',
    'Osei',
    'Boateng',
    'Toure',
    'Zerrouki',
    'Hakimi',
    'Adeyemi',
    'Sissoko',
    'Kone',
    'Mwangi',
  ],
  asian: [
    'Tanaka',
    'Nakamura',
    'Kim',
    'Park',
    'Watanabe',
    'Suzuki',
    'Choi',
    'Rahimi',
    'Yamamoto',
    'Lee',
    'Chen',
    'Al-Harbi',
    'Hosseini',
    'Kobayashi',
    'Sato',
  ],
}

/**
 * A person's name from a nation's own pool. Exported so the dressing room draws
 * its managers and teammates from the same lists the year group does, rather
 * than keeping a second copy of every surname in football.
 */
export function personName(nation: string, conf: string, rng: Rng): string {
  const culture = cultureOf(nation, conf)
  return `${rng.pick(FORENAMES[culture])} ${rng.pick(SURNAMES[culture])}`
}

/** Which name pool a nation draws from. Unlisted confederations fall back. */
function cultureOf(nation: string, conf: string): string {
  const latin = [
    'Spain',
    'Portugal',
    'Italy',
    'Brazil',
    'Argentina',
    'Uruguay',
    'Colombia',
    'Chile',
    'Mexico',
    'France',
    'Peru',
    'Ecuador',
  ]
  const germanic = [
    'Germany',
    'Netherlands',
    'Austria',
    'Switzerland',
    'Sweden',
    'Norway',
    'Denmark',
    'Belgium',
    'Iceland',
    'Finland',
  ]
  const anglo = [
    'England',
    'Scotland',
    'Wales',
    'Ireland',
    'Northern Ireland',
    'United States',
    'Canada',
    'Australia',
    'New Zealand',
  ]
  if (latin.includes(nation)) return 'latin'
  if (germanic.includes(nation)) return 'germanic'
  if (anglo.includes(nation)) return 'anglo'
  if (conf === 'CAF') return 'african'
  if (conf === 'AFC') return 'asian'
  if (conf === 'CONMEBOL' || conf === 'CONCACAF') return 'latin'
  return 'slavic'
}

/** Clubs sorted by strength once, so a peer's level maps to a real badge. */
/** How many birth years back the "youngest players" pool reaches. */
const REAL_WINDOW = 6

const BY_STRENGTH: Club[] = [...CLUBS].sort((a, b) => a.strength - b.strength)

function clubForLevel(level: number, rng: Rng): Club {
  const band = BY_STRENGTH.filter((c) => Math.abs(c.strength - level) <= 3)
  const pool = band.length ? band : BY_STRENGTH
  return rng.pick(pool)
}

const COHORT_SIZE = 9

/**
 * The nine, drawn once from the career seed.
 *
 * The spread is deliberate and not symmetric: most of a year group tops out
 * somewhere ordinary, one or two become the players a generation is named
 * after, and roughly one in five never gets near what he was supposed to be.
 * A table where everybody is good is a table with no story in it.
 */
/**
 * The youngest real footballers the book knows about.
 *
 * A sixteen year old starting in 2026 was born in 2010, and Wikidata has
 * nobody at all born that year: the book thins out at 2006 and stops at 2009.
 * So a literal same-birth-year cohort cannot be built out of real people, and
 * pretending otherwise would mean an empty table.
 *
 * What is real is the *generation*: the youngest players the book actually
 * carries, which is the group a sixteen year old is coming up behind. They are
 * drawn once per career from the seed, weighted towards the better known ones
 * so the table has names in it somebody might recognise.
 */
function realPool(): Legend[] {
  if (!LEGENDS.length) return []
  let youngest = 0
  for (const l of LEGENDS) if (l.born > youngest) youngest = l.born
  const floor = youngest - REAL_WINDOW
  return LEGENDS.filter((l) => l.born >= floor && !l.retired)
}

/** How a real player's fame maps onto the curve a peer is drawn as. */
function peerFromLegend(legend: Legend, id: number, rng: Rng): Peer {
  // A year group needs one who makes it and one who does not, whatever the
  // fame numbers say. The hand-written half of the book is all famous by
  // definition and would otherwise come out as nine identical prospects.
  const shape = id === 0 ? 1.5 : id === COHORT_SIZE - 1 ? -1.1 : rng.gauss(0, 1)
  // Fame is a sitelink count: a handful of young players are known everywhere
  // and most are known in one country. The log keeps that from turning the
  // best known teenager into a 99 and everybody else into a 60.
  const known = clamp(Math.log10(Math.max(1, legend.fame)) / 2.2, 0, 1)
  const start = clamp(Math.round(52 + known * 8 + rng.gauss(0, 2)), 46, 66)
  const ceiling = clamp(
    Math.round(start + 14 + known * 16 + shape * 7 + rng.gauss(0, 3)),
    start + 2,
    96,
  )
  const nation = NATION_BY_NAME[legend.nation]
  return {
    id,
    name: legend.name,
    nation: legend.nation,
    flag: nation?.flag ?? '',
    position: legend.position,
    start,
    ceiling,
    peakAge: rng.int(25, 30),
    clubId: clubForLevel(ceiling - rng.int(6, 14), rng).id,
    real: true,
  }
}

export function cohortOf(career: Career): Peer[] {
  const rng = new Rng((career.seed ^ 0xc0ff0f) >>> 0)
  const peers: Peer[] = []

  // Real players first, as many as the book can supply. It is fetched at
  // runtime, so early on this is the hand-written half and grows to the full
  // book a moment later; the table simply gets better names when it lands.
  const pool = realPool()
  const taken = new Set<string>()
  while (pool.length && peers.length < COHORT_SIZE) {
    // Weighted by fame, so the table is not nine names nobody has heard of.
    let best: Legend | null = null
    let bestScore = -1
    for (let tries = 0; tries < 12; tries++) {
      const pick = pool[rng.int(0, pool.length - 1)]
      if (taken.has(pick.id)) continue
      const score = Math.log10(Math.max(1, pick.fame)) + rng.next()
      if (score > bestScore) {
        best = pick
        bestScore = score
      }
    }
    if (!best) break
    taken.add(best.id)
    peers.push(peerFromLegend(best, peers.length, rng))
  }

  // Whatever the book could not fill is made up, so the table is always nine
  // deep even before the fetch lands or if it never does.
  for (let i = peers.length; i < COHORT_SIZE; i++) {
    const nation = rng.pick(NATIONS)
    const culture = cultureOf(nation.name, nation.conf)
    const name = `${rng.pick(FORENAMES[culture])} ${rng.pick(SURNAMES[culture])}`
    const position = rng.pick<Position>([
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
    ])

    const start = rng.int(50, 60)
    // one generational talent, one bust, the rest somewhere in between
    const shape = i === 0 ? 1.5 : i === COHORT_SIZE - 1 ? -1.1 : rng.gauss(0, 1)
    const ceiling = clamp(Math.round(start + 20 + shape * 7 + rng.gauss(0, 3)), start + 2, 96)
    peers.push({
      id: i,
      name,
      nation: nation.name,
      flag: nation.flag,
      position,
      start,
      ceiling,
      peakAge: rng.int(25, 30),
      clubId: clubForLevel(ceiling - rng.int(6, 14), rng).id,
      real: false,
    })
  }
  return peers
}

/**
 * A peer's rating at an age. Rises fast and then slower into the peak, holds
 * for a couple of years, and falls away from the mid-thirties — the shape a
 * real career has, drawn without simulating a single match.
 */
export function peerOvrAt(peer: Peer, age: number): number {
  if (age <= 16) return peer.start
  if (age <= peer.peakAge) {
    const t = (age - 16) / (peer.peakAge - 16)
    // ease-out: most of the growth happens in the early twenties
    const grown = 1 - Math.pow(1 - t, 1.7)
    return Math.round(peer.start + (peer.ceiling - peer.start) * grown)
  }
  const past = age - peer.peakAge
  const decline = past <= 2 ? past * 0.4 : 0.8 + (past - 2) * 1.5
  return Math.round(clamp(peer.ceiling - decline, 40, 99))
}

/** Career goals so far, from the curve rather than from a match anywhere. */
export function peerGoalsBy(peer: Peer, age: number): number {
  if (isKeeper(peer.position)) return 0
  const rate: Record<string, number> = {
    ST: 0.62,
    LW: 0.4,
    RW: 0.4,
    CAM: 0.34,
    CM: 0.17,
    CDM: 0.08,
    CB: 0.09,
    LB: 0.06,
    RB: 0.06,
    GK: 0,
  }
  let goals = 0
  for (let a = 17; a <= age; a++) {
    const ovr = peerOvrAt(peer, a)
    goals += rate[peer.position] * clamp((ovr - 52) / 3.2, 0.2, 12)
  }
  return Math.round(goals)
}

export interface CohortRow {
  rank: number
  name: string
  flag: string
  nation: string
  position: Position
  clubId: string | null
  ovr: number
  goals: number
  /** the row is the career being played */
  you: boolean
}

/**
 * The table as it stands at the age the career has reached, you included and
 * ranked on the same number as everybody else.
 */
export function cohortTable(career: Career): CohortRow[] {
  const age = career.player.age
  const stats = totals(career)
  const rows: CohortRow[] = cohortOf(career).map((peer) => ({
    rank: 0,
    name: peer.name,
    flag: peer.flag,
    nation: peer.nation,
    position: peer.position,
    clubId: peer.clubId,
    ovr: peerOvrAt(peer, age),
    goals: peerGoalsBy(peer, age),
    you: false,
  }))
  rows.push({
    rank: 0,
    name: career.player.name,
    flag: '',
    nation: career.player.nation,
    position: career.player.position,
    clubId: career.player.clubId,
    ovr: career.player.ovr,
    goals: stats.goals + stats.natGoals,
    you: true,
  })
  rows.sort((a, b) => b.ovr - a.ovr || b.goals - a.goals || a.name.localeCompare(b.name))
  rows.forEach((row, i) => (row.rank = i + 1))
  return rows
}

/** Where the career sits in its own year group right now. */
export function cohortRank(career: Career): { rank: number; of: number } {
  const rows = cohortTable(career)
  return { rank: rows.find((r) => r.you)?.rank ?? rows.length, of: rows.length }
}
