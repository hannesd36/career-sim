/**
 * Second pass for the handful of clubs TheSportsDB spells differently than we
 * do. Tries a few candidate spellings each and writes the winners straight into
 * the badge cache, so `npm run fetch:badges` picks them up on the next build.
 *
 *   node scripts/probe-missing.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const CACHE = resolve(here, '.badge-cache.json')
const KEY = process.env.SPORTSDB_KEY || '3'
const DELAY = 2200

/** cacheKey -> spellings worth trying, best guess first */
const CANDIDATES = {
  'eng1:Nottingham Forest': ["Nott'm Forest", 'Nottingham', 'Forest'],
  'ger1:Borussia Monchengladbach': ['Borussia Monchengladbach', 'Monchengladbach', 'Gladbach'],
  'fra1:Paris Saint-Germain': ['Paris SG', 'PSG', 'Paris Saint Germain'],
  'fra1:Lille': ['Lille OSC', 'LOSC Lille', 'Lille'],
  'por1:Nacional': ['Nacional Madeira', 'CD Nacional', 'Nacional da Madeira'],
  'bel1:Union Saint-Gilloise': ['Union St. Gilloise', 'Royale Union Saint-Gilloise', 'Union SG'],
  'bel1:OH Leuven': ['Oud-Heverlee Leuven', 'Leuven', 'OH Leuven'],
  'bel1:Sint-Truiden': ['Sint-Truidense', 'STVV', 'St Truiden'],
  'aut1:Blau-Weiss Linz': ['Blau Weiss Linz', 'BW Linz', 'Blau-Weiss Linz'],
  'cze1:Dukla Prague': ['Dukla Praha', 'FK Dukla Praha', 'Dukla'],
  'pol1:Wisla Plock': ['Wisla Plock', 'Wisla Plotsk', 'Plock'],
  'pol1:Termalica Nieciecza': ['Bruk-Bet Termalica Nieciecza', 'Termalica Nieciecza', 'Nieciecza'],
  'ger2:Nurnberg': ['1. FC Nurnberg', 'Nurnberg', 'FC Nuremberg'],
  'ger2:Greuther Furth': ['SpVgg Greuther Furth', 'Greuther Furth', 'Furth'],
  'fra2:Saint-Etienne': ['St Etienne', 'AS Saint-Etienne', 'Saint Etienne'],
  'fra2:Reims': ['Stade de Reims', 'Stade Reims', 'Reims'],
  'ger3:Rot-Weiss Essen': ['Rot Weiss Essen', 'RW Essen', 'Rot-Weiß Essen'],
  'ger3:Ulm': ['SSV Ulm', 'SSV Ulm 1846', 'Ulm 1846'],
  'ksa1:Al Ittihad': ['Al-Ittihad', 'Al Ittihad Jeddah', 'Ittihad'],
  'ksa1:Al Shabab': ['Al-Shabab', 'Al Shabab Riyadh', 'Shabab'],
  'arg1:Estudiantes': ['Estudiantes de La Plata', 'Estudiantes La Plata', 'Estudiantes'],
  'arg1:San Lorenzo': ['San Lorenzo de Almagro', 'San Lorenzo', 'CA San Lorenzo'],
}

// TheSportsDB spells this one "Czechia", not "Czech Republic" — getting it
// wrong silently rejects every otherwise-correct match.
const COUNTRY = {
  eng1: 'England', ger1: 'Germany', fra1: 'France', por1: 'Portugal', bel1: 'Belgium',
  aut1: 'Austria', cze1: 'Czechia', pol1: 'Poland', ger2: 'Germany', fra2: 'France',
  ger3: 'Germany', ksa1: 'Saudi Arabia', arg1: 'Argentina',
}

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

/**
 * The country filter alone is not enough: searching "Paris SG" returns Torcy,
 * a French club that is emphatically not PSG. Require the names to overlap.
 */
function namesMatch(candidate, wanted) {
  const a = norm(candidate)
  const b = norm(wanted)
  return a === b || a.includes(b) || b.includes(a)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(name) {
  const url = `https://www.thesportsdb.com/api/v1/json/${KEY}/searchteams.php?t=${encodeURIComponent(name)}`
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'career-sim/0.1' } })
      if (res.status === 429) { await sleep(25000 * (attempt + 1)); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()).teams || []
    } catch {
      await sleep(4000 * (attempt + 1))
    }
  }
  return []
}

const cache = JSON.parse(await readFile(CACHE, 'utf8'))
let fixed = 0
const stillMissing = []

for (const [cacheKey, spellings] of Object.entries(CANDIDATES)) {
  if (cache[cacheKey]) continue
  const leagueId = cacheKey.split(':')[0]
  const country = COUNTRY[leagueId]
  let hit = null

  for (const spelling of spellings) {
    const teams = await search(spelling)
    await sleep(DELAY)
    const match = teams.find(
      (t) =>
        t.strSport === 'Soccer' &&
        t.strBadge &&
        (!country || t.strCountry === country) &&
        namesMatch(t.strTeam, spelling),
    )
    if (match) {
      hit = { badge: match.strBadge, matched: match.strTeam }
      console.log(`  ok  ${cacheKey}  <- "${spelling}"  (${match.strTeam})`)
      break
    }
  }

  if (hit) {
    cache[cacheKey] = hit
    fixed++
  } else {
    stillMissing.push(cacheKey)
    console.log(`  --  ${cacheKey}: no spelling worked`)
  }
  await writeFile(CACHE, JSON.stringify(cache, null, 1))
}

console.log(`\nresolved ${fixed}, still missing ${stillMissing.length}`)
if (stillMissing.length) console.log(stillMissing.join('\n'))
console.log('\nnow run:  npm run fetch:badges')
