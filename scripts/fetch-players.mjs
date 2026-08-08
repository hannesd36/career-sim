/**
 * Pull every footballer Wikidata knows about who ever played for one of our
 * clubs, and write them out as one compact file the game loads at runtime.
 *
 *   node scripts/fetch-players.mjs                 # the lot
 *   node scripts/fetch-players.mjs --clubs 20      # a quick smoke test
 *   node scripts/fetch-players.mjs --min-links 12  # a smaller, more famous book
 *
 * This is what runs every three months in `.github/workflows/refresh-players.yml`.
 * Nothing here is hand-maintained: the hand-written book in `players.ts` stays
 * as it is, keeps its nicknames and its honours, and always wins a name clash.
 * Everything this produces is the long tail behind it.
 *
 * How famous somebody is, is taken to be how many Wikipedias have written him
 * up. It is a blunt measure and a very good one: it puts Zidane above a Ligue 2
 * left back without anybody having to have an opinion.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunk, qid, sleep, tryAsk as ask, values } from './wikidata.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const CLUBS = resolve(here, '../src/data/clubs.json')
const MAP = resolve(here, 'wikidata-clubs.json')
const OUT = resolve(here, '../public/players.json')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? Number(process.argv[i + 1]) : fallback
}

/** How many language Wikipedias a man needs before he counts as findable. */
const MIN_LINKS = arg('min-links', 7)
/** The ceiling on the whole book, most famous first. */
const MAX_PLAYERS = arg('max', 24000)
/** Only look at this many clubs (for a smoke test). */
const CLUB_LIMIT = arg('clubs', 0)
/** Nobody born before this is worth a square. */
const OLDEST = 1930

// --------------------------------------------------------------- positions

/**
 * Wikidata is vaguer about where a man plays than a game needs to be, so the
 * vague answers land on the middle of the line they describe: a "defender" is
 * a centre back, a "winger" is a right winger, a "forward" is a striker.
 */
const POSITION = {
  Q201330: 'GK', Q179789: 'GK', Q172964: 'GK', Q1317534: 'GK',
  Q336286: 'CB', Q268258: 'CB', Q3664517: 'CB', Q1489923: 'CB', Q1109563: 'CB', Q285676: 'CB',
  Q90173132: 'RB', Q107213256: 'RB', Q124650007: 'LB',
  Q193592: 'CM', Q8025128: 'CM', Q6008848: 'CM', Q16501245: 'CM',
  Q18691898: 'CDM', Q90326494: 'CAM',
  Q114358125: 'LW', Q114358158: 'LW', Q11681748: 'RW', Q642259: 'RW', Q114358150: 'RW',
  Q280658: 'ST', Q9731197: 'ST', Q6037916: 'ST', Q3446915: 'ST', Q1642283: 'ST',
}

const POS_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

/** A man listed twice takes the more specific of the two. */
const POS_RANK = { CB: 1, RB: 2, LB: 2, CM: 1, CDM: 2, CAM: 2, ST: 1, RW: 2, LW: 2, GK: 3 }

// --------------------------------------------------------------- countries

/** What Wikidata calls a country, against what the game calls it. */
const COUNTRY_NAME = {
  'United States': 'USA',
  'United States of America': 'USA',
  Turkey: 'Türkiye',
  'Czech Republic': 'Czechia',
  Ireland: 'Republic of Ireland',
  'Democratic Republic of the Congo': 'DR Congo',
  'Republic of the Congo': 'Congo',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  'Korea, South': 'South Korea',
  'Republic of Korea': 'South Korea',
  'North Korea': 'North Korea',
  Curacao: 'Curaçao',
  'Kingdom of the Netherlands': 'Netherlands',
  'United Kingdom': 'England',
}

/** Flags for the places that have no ISO code of their own. */
const FLAG = {
  England: 'gb-eng',
  Scotland: 'gb-sct',
  Wales: 'gb-wls',
  'Northern Ireland': 'gb-nir',
  Kosovo: 'xk',
}

/** Which confederation a continent implies, before the exceptions. */
const CONF_BY_CONTINENT = {
  Q46: 'UEFA', // Europe
  Q15: 'CAF', // Africa
  Q48: 'AFC', // Asia
  Q49: 'CONCACAF', // North America
  Q18: 'CONMEBOL', // South America
  Q538: 'OFC', // Oceania
  Q3960: 'OFC', // Australia (continent)
}

/** Football does not draw its map the way geography does. */
const CONF_OVERRIDE = {
  Australia: 'AFC',
  Russia: 'UEFA',
  Türkiye: 'UEFA',
  Israel: 'UEFA',
  Kazakhstan: 'UEFA',
  Armenia: 'UEFA',
  Azerbaijan: 'UEFA',
  Georgia: 'UEFA',
  Cyprus: 'UEFA',
  Guyana: 'CONCACAF',
  Suriname: 'CONCACAF',
  'French Guiana': 'CONCACAF',
}

// ------------------------------------------------------------------- work

const clubs = JSON.parse(readFileSync(CLUBS, 'utf8'))
const clubMap = JSON.parse(readFileSync(MAP, 'utf8'))
const ourClub = new Map() // wikidata QID -> our club id
for (const club of clubs) if (clubMap[club.id]) ourClub.set(clubMap[club.id], club.id)

let targets = [...ourClub.keys()]
if (CLUB_LIMIT) targets = targets.slice(0, CLUB_LIMIT)
console.log(`${targets.length} clubs to sweep, keeping anybody with ${MIN_LINKS}+ Wikipedias`)

// ---- who ever played for one of them ----
//
// Eight clubs to a query rather than one. Wikidata is a public service and
// five hundred separate questions is rude enough that it starts asking you to
// wait two minutes between them; sixty is not.
const fame = new Map()
let done = 0
for (const part of chunk(targets, 8)) {
  const rows = await ask(
    `SELECT ?p ?links WHERE {
       VALUES ?club { ${values(part)} }
       ?p wdt:P54 ?club ; wikibase:sitelinks ?links .
       FILTER(?links >= ${MIN_LINKS})
     }`,
    { label: `squads of ${part.length} clubs` },
  )
  for (const row of rows) {
    const id = qid(row.p.value)
    const links = Number(row.links.value)
    if ((fame.get(id) ?? 0) < links) fame.set(id, links)
  }
  done += part.length
  if (done % 40 < 8) console.log(`  ${done}/${targets.length} clubs, ${fame.size} people so far`)
  await sleep(200)
}

const ranked = [...fame.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_PLAYERS)
console.log(`${fame.size} people found, keeping ${ranked.length}`)

// ---- which of the teams in a career are countries rather than clubs ----
//
// A generated career can only ever list the clubs this game has heard of, so
// "one club his whole career" would be a lie about most of them. Counting the
// senior clubs a man actually had needs the national teams taken back out.
const nationalTeams = new Set()
{
  const rows = await ask(
    `SELECT ?t WHERE { ?t wdt:P31/wdt:P279* wd:Q6979593 }`,
    { label: 'national teams' },
  )
  for (const row of rows) nationalTeams.add(qid(row.t.value))
  console.log(`${nationalTeams.size} national teams, which do not count as clubs`)
}

// ---- who they are ----
//
// Two light queries rather than one heavy one. The label service is what makes
// a query expensive, so it is used once, on the names, and never on the four
// thousand rows a hundred careers come back as.
const people = new Map()
let batch = 0
const facts = chunk(
  ranked.map(([id]) => id),
  200,
)
for (const part of facts) {
  const rows = await ask(
    `SELECT ?p ?name ?dob ?nat ?pos WHERE {
       VALUES ?p { ${values(part)} }
       ?p wdt:P569 ?dob ; rdfs:label ?name .
       FILTER(lang(?name) = 'en')
       OPTIONAL { ?p wdt:P1532 ?nat }
       OPTIONAL { ?p wdt:P413 ?pos }
     }`,
    { label: `who they are, batch ${batch}` },
  )
  for (const row of rows) {
    const id = qid(row.p.value)
    let rec = people.get(id)
    if (!rec) {
      rec = {
        name: row.name.value,
        born: Number(row.dob.value.slice(0, 4)),
        natQ: null,
        natViaTeam: false,
        pos: null,
        lastMove: 0,
        clubs: new Map(),
        allClubs: new Set(),
      }
      people.set(id, rec)
    }
    if (row.nat && !rec.natQ) {
      rec.natQ = qid(row.nat.value)
      rec.natViaTeam = true
    }
    if (row.pos) {
      const mapped = POSITION[qid(row.pos.value)]
      if (mapped && (!rec.pos || (POS_RANK[mapped] ?? 0) > (POS_RANK[rec.pos] ?? 0))) rec.pos = mapped
    }
  }
  batch++
  if (batch % 10 === 0) console.log(`  names ${batch}/${facts.length}`)
  await sleep(200)
}
console.log(`${people.size} of them have a name and a birthday`)

// ---- and everywhere they went ----
batch = 0
const careers = chunk([...people.keys()], 120)
for (const part of careers) {
  const rows = await ask(
    `SELECT ?p ?team ?start WHERE {
       VALUES ?p { ${values(part)} }
       ?p p:P54 ?st .
       ?st ps:P54 ?team .
       OPTIONAL { ?st pq:P580 ?start }
     }`,
    { label: `careers batch ${batch}` },
  )
  for (const row of rows) {
    const rec = people.get(qid(row.p.value))
    if (!rec) continue
    const team = qid(row.team.value)
    const start = row.start?.value?.slice(0, 10) ?? ''
    // the last move of any kind, club or country, dates the career
    const year = Number(start.slice(0, 4))
    if (year && year > rec.lastMove) rec.lastMove = year
    if (!nationalTeams.has(team)) rec.allClubs.add(team)
    const our = ourClub.get(team)
    if (our) {
      const had = rec.clubs.get(our)
      if (had === undefined || (start && (!had || start < had))) rec.clubs.set(our, start)
    }
  }
  batch++
  if (batch % 10 === 0) console.log(`  careers ${batch}/${careers.length}`)
  await sleep(200)
}

// ---- a second go at the ones with no country on them ----
//
// "Country for sport" is the right field and plenty of entries do not have it.
// The national team a man played for says the same thing and says it correctly
// for the four British ones, where citizenship would only ever say "United
// Kingdom"; plain citizenship is the last resort.
const homeless = [...people.entries()].filter(([, rec]) => !rec.natQ && rec.clubs.size)
if (homeless.length) {
  console.log(`${homeless.length} people with no country on them, asking again`)
  for (const part of chunk(homeless.map(([id]) => id), 120)) {
    const rows = await ask(
      `SELECT ?p ?nat ?viaTeam WHERE {
         VALUES ?p { ${values(part)} }
         {
           ?p wdt:P54 ?team .
           ?team wdt:P31/wdt:P279* wd:Q6979593 .
           ?team wdt:P17 ?nat .
           BIND(1 AS ?viaTeam)
         } UNION {
           ?p wdt:P27 ?nat .
           BIND(0 AS ?viaTeam)
         }
       }`,
      { label: 'countries, second go' },
    )
    for (const row of rows) {
      const rec = people.get(qid(row.p.value))
      if (!rec) continue
      const viaTeam = row.viaTeam?.value === '1'
      // citizenship of the United Kingdom tells you nothing a game can use:
      // it is the four home nations, and it is never one of them
      if (!viaTeam && qid(row.nat.value) === 'Q145') continue
      if (!rec.natQ || (viaTeam && !rec.natViaTeam)) {
        rec.natQ = qid(row.nat.value)
        rec.natViaTeam = viaTeam
      }
    }
    await sleep(150)
  }
}

// ---- the countries they play for ----
const natQs = [...new Set([...people.values()].map((p) => p.natQ).filter(Boolean))]
const natInfo = new Map()
for (const part of chunk(natQs, 120)) {
  const rows = await ask(
    `SELECT ?c ?cLabel ?iso ?cont WHERE {
       VALUES ?c { ${values(part)} }
       ?c rdfs:label ?cLabel .
       FILTER(lang(?cLabel) = 'en')
       OPTIONAL { ?c wdt:P297 ?iso }
       OPTIONAL { ?c wdt:P30 ?cont }
     }`,
    { label: 'countries' },
  )
  for (const row of rows) {
    const id = qid(row.c.value)
    const name = COUNTRY_NAME[row.cLabel.value] ?? row.cLabel.value
    const info = natInfo.get(id) ?? { name, flag: null, conf: null }
    info.name = name
    if (row.iso && !info.flag) info.flag = row.iso.value.toLowerCase()
    if (row.cont && !info.conf) info.conf = CONF_BY_CONTINENT[qid(row.cont.value)] ?? null
    natInfo.set(id, info)
  }
  await sleep(150)
}

// ------------------------------------------------------------------ write

const clubIndex = new Map()
const clubList = []
const nationIndex = new Map()
const nationList = []
const rows = []
let dropped = 0
let noPosition = 0

for (const [id, rec] of people) {
  const nat = rec.natQ ? natInfo.get(rec.natQ) : null
  // Wikidata disambiguates people it has two of: "Rodri (footballer, born
  // 1996)". Nobody types that, and the game only ever needs the name.
  const name = rec.name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (!name || /^Q\d+$/.test(name)) { dropped++; continue }
  if (!rec.clubs.size) { dropped++; continue }
  if (!Number.isFinite(rec.born) || rec.born < OLDEST) { dropped++; continue }
  if (!nat?.name) { dropped++; continue }

  const flag = FLAG[nat.name] ?? nat.flag
  if (!flag) { dropped++; continue }
  const conf = CONF_OVERRIDE[nat.name] ?? nat.conf ?? 'UEFA'

  let n = nationIndex.get(nat.name)
  if (n === undefined) {
    n = nationList.length
    nationIndex.set(nat.name, n)
    nationList.push([nat.name, flag, conf])
  }

  // undated spells keep their place at the end rather than pretending to a year
  const path = [...rec.clubs.entries()]
    .sort((a, b) => (a[1] || '9999').localeCompare(b[1] || '9999'))
    .map(([clubId]) => {
      let i = clubIndex.get(clubId)
      if (i === undefined) {
        i = clubList.length
        clubIndex.set(clubId, i)
        clubList.push(clubId)
      }
      return i
    })

  if (!rec.pos) noPosition++
  rows.push([
    name,
    rec.born,
    n,
    POS_ORDER.indexOf(rec.pos ?? 'CM'),
    fame.get(id) ?? 0,
    path,
    rec.lastMove,
    // zero when the national team list did not load, which means "nobody knows"
    nationalTeams.size ? rec.allClubs.size : 0,
  ])
}

rows.sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0]))

const out = {
  v: 1,
  built: new Date().toISOString().slice(0, 10),
  source: 'Wikidata (CC0), https://query.wikidata.org',
  minLinks: MIN_LINKS,
  pos: POS_ORDER,
  // rows are: name, born, nation, position, fame, our clubs, last move, clubs in total
  clubs: clubList,
  nations: nationList,
  rows,
}

writeFileSync(OUT, JSON.stringify(out))
const kb = (JSON.stringify(out).length / 1024).toFixed(0)
console.log(`\nwrote ${rows.length} players (${dropped} dropped), ${clubList.length} clubs, ${nationList.length} countries, ${kb} kB`)
