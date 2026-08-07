/**
 * One-off data build: resolves a crest URL for every club in clubs.raw.json
 * via TheSportsDB and writes src/data/clubs.json.
 *
 * The free API key caps list endpoints at 10 results, so we look clubs up one
 * at a time by name and pick the match whose country fits the league.
 *
 * Results are cached in scripts/.badge-cache.json — re-runs only hit the
 * network for clubs that are still missing.
 *
 *   npm run fetch:badges
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const RAW = resolve(here, '../src/data/clubs.raw.json')
const OUT = resolve(here, '../src/data/clubs.json')
const CACHE = resolve(here, '.badge-cache.json')
const KEY = process.env.SPORTSDB_KEY || '3'
/** OFFLINE=1 rebuilds clubs.json from the cache without touching the network. */
const OFFLINE = process.env.OFFLINE === '1'
/** The free key allows roughly 30 requests a minute. */
const DELAY = Number(process.env.DELAY_MS || 2200)

/** Country each league sits in, so we can disambiguate same-named clubs. */
const LEAGUE_COUNTRY = {
  eng1: 'England', eng2: 'England', eng3: 'England',
  esp1: 'Spain', esp2: 'Spain',
  ger1: 'Germany', ger2: 'Germany', ger3: 'Germany',
  ita1: 'Italy', ita2: 'Italy',
  fra1: 'France', fra2: 'France',
  por1: 'Portugal', tur1: 'Turkey', ned1: 'Netherlands', bel1: 'Belgium',
  gre1: 'Greece', sco1: 'Scotland', aut1: 'Austria', sui1: 'Switzerland',
  den1: 'Denmark', cze1: 'Czech Republic', cro1: 'Croatia', pol1: 'Poland',
  nor1: 'Norway', bra1: 'Brazil', ksa1: 'Saudi Arabia', mex1: 'Mexico',
  arg1: 'Argentina', usa1: 'United States',
}

/** Names TheSportsDB spells differently than we do. */
const ALIASES = {
  'Wolverhampton Wanderers': 'Wolves',
  'Queens Park Rangers': 'QPR',
  'Borussia Monchengladbach': 'Borussia Moenchengladbach',
  'FC Koln': 'FC Cologne',
  'Nurnberg': 'Nuernberg',
  'Greuther Furth': 'Greuther Fuerth',
  'Fortuna Dusseldorf': 'Fortuna Duesseldorf',
  'Preussen Munster': 'Preussen Muenster',
  'Saarbrucken': 'Saarbruecken',
  'Munchen 1860': '1860 Munich',
  'Osnabruck': 'Osnabrueck',
  'Newells Old Boys': "Newell's Old Boys",
  'Club America': 'America',
  'Los Angeles FC': 'Los Angeles FC',
  'Bodo/Glimt': 'Bodo Glimt',
  'Termalica Nieciecza': 'Bruk-Bet Termalica',
  'Milton Keynes Dons': 'MK Dons',
  'Vukovar 1991': 'Vukovar',
  'Real Sociedad B': 'Real Sociedad B',
}

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(fc|cf|sc|ac|as|ss|afc|cd|ud|sv|vfb|vfl|tsv|fsv|1899|club|de|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '')

/**
 * Returns { ok, teams }. `ok: false` means the request itself failed — the
 * caller must not cache that as "this club has no crest", or a transient rate
 * limit would permanently blank out a club.
 */
async function search(name) {
  const url = `https://www.thesportsdb.com/api/v1/json/${KEY}/searchteams.php?t=${encodeURIComponent(name)}`
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'career-sim/0.1' } })
      if (res.status === 429) {
        const wait = 20000 * (attempt + 1)
        console.log(`\n  rate limited, waiting ${wait / 1000}s ...`)
        await sleep(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return { ok: true, teams: json.teams || [] }
    } catch (err) {
      if (attempt === 4) {
        console.warn(`\n  ! ${name}: ${err.message}`)
        return { ok: false, teams: [] }
      }
      await sleep(4000 * (attempt + 1))
    }
  }
  return { ok: false, teams: [] }
}

/** Prefer a soccer team from the right country whose name actually matches. */
function pick(teams, name, country) {
  const soccer = teams.filter((t) => t.strSport === 'Soccer' && t.strBadge)
  if (!soccer.length) return null
  const target = norm(name)
  const scored = soccer.map((t) => {
    let score = 0
    const cand = norm(t.strTeam)
    if (cand === target) score += 100
    else if (cand.startsWith(target) || target.startsWith(cand)) score += 60
    else if (cand.includes(target) || target.includes(cand)) score += 30
    if (t.strCountry === country) score += 50
    return { t, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0].score >= 30 ? scored[0].t : null
}

async function main() {
  const raw = JSON.parse(await readFile(RAW, 'utf8'))
  const cache = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {}

  const clubs = []
  const missing = []
  let fetched = 0

  for (const [leagueId, entries] of Object.entries(raw)) {
    if (leagueId.startsWith('_')) continue
    const country = LEAGUE_COUNTRY[leagueId]
    console.log(`\n${leagueId} (${entries.length} clubs)`)

    for (const entry of entries) {
      const [name, tierStr] = entry.split('|')
      const tier = Number(tierStr)
      const cacheKey = `${leagueId}:${name}`

      if (!(cacheKey in cache) && !OFFLINE) {
        const query = ALIASES[name] || name
        let { ok, teams } = await search(query)
        let hit = pick(teams, query, country)
        // second chance: drop a trailing sponsor year, e.g. "Paderborn 07"
        if (ok && !hit && /\s\d+$/.test(query)) {
          const short = query.replace(/\s\d+$/, '')
          await sleep(DELAY)
          const retry = await search(short)
          ok = retry.ok
          hit = pick(retry.teams, short, country)
        }
        // only a genuine "searched and found nothing" is worth remembering
        if (ok) cache[cacheKey] = hit ? { badge: hit.strBadge, matched: hit.strTeam } : null
        fetched++
        await sleep(DELAY)
        if (fetched % 10 === 0) await writeFile(CACHE, JSON.stringify(cache, null, 1))
      }

      const hit = cache[cacheKey]
      if (!hit) missing.push(`${leagueId}: ${name}`)
      clubs.push({
        id: `${leagueId}-${slug(name)}`,
        name,
        leagueId,
        tier,
        badge: hit?.badge ?? null,
      })
      process.stdout.write(hit ? '.' : 'x')
    }
  }

  await writeFile(CACHE, JSON.stringify(cache, null, 1))
  await writeFile(OUT, JSON.stringify(clubs, null, 1))

  console.log(`\n\n${clubs.length} clubs written to src/data/clubs.json`)
  console.log(`${clubs.length - missing.length} with crest, ${missing.length} without`)
  if (missing.length) console.log('missing:\n  ' + missing.join('\n  '))
}

main()
