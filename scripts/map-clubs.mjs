/**
 * Work out which Wikidata item each of our clubs is, once, and write it down.
 *
 * A club is either an "association football club" or the football side of a
 * "sports club", because half of South America and most of Greece is modelled
 * as the second one and Boca Juniors is not going to change for us.
 *
 *   node scripts/map-clubs.mjs           # only the clubs still missing
 *   node scripts/map-clubs.mjs --all     # start again from nothing
 *
 * The map is committed as `scripts/wikidata-clubs.json`, so the quarterly
 * player refresh never has to solve this again and never silently drifts onto
 * a different Chelsea.
 *
 * Two passes. Most clubs are an exact Wikidata label or alias, which one bulk
 * query answers for a whole league at a time. The rest go through Wikidata's
 * search box, which forgives "Atletico Madrid" for "Atlético Madrid", and every
 * candidate is then checked: it has to be a football club, in the right
 * country, with a squad of real people behind it — that last test is what
 * throws out the women's side, the reserves and the futsal team.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunk, fullText, qid, search, sleep, tryAsk as ask, values } from './wikidata.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const CLUBS = resolve(here, '../src/data/clubs.json')
const OUT = resolve(here, 'wikidata-clubs.json')
const LEAGUES = resolve(here, '../src/data/leagues.ts')

const fresh = process.argv.includes('--all')

/**
 * How long this is allowed to take, in minutes.
 *
 * Mapping is a nicety: a club nobody has matched yet simply has no generated
 * players, and next quarter it gets another go. Pulling the players is the
 * actual job, so this stops itself rather than eating the hour that belongs to
 * the harvest.
 */
const budgetArg = process.argv.indexOf('--budget')
const BUDGET_MS = (budgetArg > -1 ? Number(process.argv[budgetArg + 1]) : 30) * 60_000
const startedAt = Date.now()
const outOfTime = () => Date.now() - startedAt > BUDGET_MS

/** Country each league is played in, read off leagues.ts so it cannot drift. */
function leagueCountries() {
  const src = readFileSync(LEAGUES, 'utf8')
  const out = {}
  for (const m of src.matchAll(/id:\s*'([a-z0-9]+)',\s*name:\s*'[^']*',\s*country:\s*'([^']+)'/g))
    out[m[1]] = m[2]
  return out
}

/**
 * The Wikidata item for each country our leagues are played in.
 *
 * Countries are compared as items rather than as words. It saves asking for a
 * label on every query, and it is the only way "England" and "United Kingdom"
 * can both be the right answer for Chelsea without a table of synonyms.
 */
const COUNTRY_Q = {
  England: ['Q21', 'Q145'],
  Scotland: ['Q22', 'Q145'],
  Wales: ['Q25', 'Q145'],
  'Northern Ireland': ['Q26', 'Q145'],
  Spain: ['Q29'],
  Germany: ['Q183'],
  Italy: ['Q38'],
  France: ['Q142'],
  Portugal: ['Q45'],
  Netherlands: ['Q55'],
  Belgium: ['Q31'],
  Türkiye: ['Q43'],
  Greece: ['Q41'],
  Austria: ['Q40'],
  Switzerland: ['Q39'],
  Denmark: ['Q35'],
  Czechia: ['Q213'],
  Croatia: ['Q224'],
  Poland: ['Q36'],
  Norway: ['Q20'],
  Brazil: ['Q155'],
  'Saudi Arabia': ['Q851'],
  Mexico: ['Q96'],
  Argentina: ['Q414'],
  USA: ['Q30'],
}

/** Which items count as "the right country" for a club in this league. */
const wantedCountries = (leagueId) => COUNTRY_Q[countryOf[leagueId]] ?? []

/** The handful no amount of string matching will ever get right. */
const OVERRIDES = {
  'eng1-chelsea': 'Q9616',
  'eng2-swansea-city': 'Q18711',
  'ger1-fc-koln': 'Q104770',
  'usa1-st-louis-city': 'Q106687227',
}

const clubs = JSON.parse(readFileSync(CLUBS, 'utf8'))
const countryOf = leagueCountries()
const map = !fresh && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}

const todo = clubs.filter((c) => !map[c.id])
console.log(`${clubs.length} clubs, ${clubs.length - todo.length} already mapped, ${todo.length} to do`)

for (const [id, q] of Object.entries(OVERRIDES)) {
  if (!map[id] && clubs.some((c) => c.id === id)) map[id] = q
}

// ---------------------------------------------------------------- pass one
// exact label or alias, a league at a time
const byLeague = new Map()
for (const c of todo) {
  if (map[c.id]) continue
  byLeague.set(c.leagueId, [...(byLeague.get(c.leagueId) ?? []), c])
}

for (const [leagueId, list] of byLeague) {
  for (const part of chunk(list, 40)) {
    const names = part.map((c) => `${JSON.stringify(c.name)}@en`).join(' ')
    const rows = await ask(
      `SELECT ?name ?club ?country WHERE {
         VALUES ?name { ${names} }
         { ?club rdfs:label ?name } UNION { ?club skos:altLabel ?name }
         VALUES ?type { wd:Q476028 wd:Q847017 }
         ?club wdt:P31/wdt:P279* ?type .
         OPTIONAL { ?club wdt:P17 ?country }
       }`,
      { label: `labels for ${leagueId}` },
    )
    const found = new Map()
    for (const row of rows) {
      const name = row.name.value
      found.set(name, [
        ...(found.get(name) ?? []),
        { q: qid(row.club.value), country: row.country ? qid(row.country.value) : null },
      ])
    }
    for (const club of part) {
      const hits = found.get(club.name)
      if (!hits?.length) continue
      const want = wantedCountries(club.leagueId)
      const right = hits.filter((h) => h.country && want.includes(h.country))
      const pick = right.length === 1 ? right[0] : right.length ? null : hits.length === 1 ? hits[0] : null
      if (pick) map[club.id] = pick.q
    }
    await sleep(400)
  }
}

writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n')
console.log(`after exact matching: ${Object.keys(map).length} mapped`)

// ---------------------------------------------------------------- pass two
// the search box, then prove the candidate is a first team with a squad
const stillMissing = clubs.filter((c) => !map[c.id])
console.log(`${stillMissing.length} left for the search box`)

const REJECT = /\b(women|femin|feminine|damen|reserves?|academy|youth|futsal|II|B team|under-\d+)\b/i

for (const club of stillMissing) {
  if (outOfTime()) {
    console.log('  (out of time, the rest can wait for next quarter)')
    break
  }
  const want = wantedCountries(club.leagueId)
  const seen = new Set()
  const candidates = []

  // full text first: it is the one that finds "UD Almería" for "Almeria" and
  // "VfL Bochum" for "Bochum", which is most of what is left by this point
  for (const statement of ['P31=Q476028', 'P31=Q847017']) {
    for (const id of await fullText(club.name, statement, 8)) {
      if (seen.has(id)) continue
      seen.add(id)
      candidates.push({ id, label: club.name, desc: '' })
    }
    await sleep(250)
  }
  for (const term of [club.name, `${club.name} FC`, `FC ${club.name}`]) {
    for (const hit of await search(term, 6)) {
      if (seen.has(hit.id) || REJECT.test(`${hit.label} ${hit.desc}`)) continue
      seen.add(hit.id)
      candidates.push(hit)
    }
    await sleep(250)
    if (candidates.length >= 14) break
  }
  if (!candidates.length) {
    console.log(`  ? ${club.id}: nothing found`)
    continue
  }

  // a first team has a country, is a football club, and has people in it
  const rows = await ask(
    `SELECT ?club ?country (COUNT(DISTINCT ?p) AS ?squad) WHERE {
       VALUES ?club { ${values(candidates.slice(0, 16).map((c) => c.id))} }
       VALUES ?type { wd:Q476028 wd:Q847017 }
       ?club wdt:P31/wdt:P279* ?type .
       OPTIONAL { ?club wdt:P17 ?country }
       OPTIONAL { ?p wdt:P54 ?club }
     } GROUP BY ?club ?country`,
    { label: `candidates for ${club.name}` },
  )
  const scored = rows
    .map((r) => ({
      q: qid(r.club.value),
      country: r.country ? qid(r.country.value) : null,
      squad: Number(r.squad?.value ?? 0),
    }))
    .filter((r) => r.country && want.includes(r.country) && r.squad >= 15)
    .sort((a, b) => b.squad - a.squad)

  if (scored.length) {
    map[club.id] = scored[0].q
    console.log(`  + ${club.id} → ${scored[0].q} (${scored[0].squad} players)`)
  } else {
    console.log(`  ? ${club.id}: no candidate stood up`)
  }
  writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n')
  await sleep(400)
}

writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n')

// -------------------------------------------------------------- pass three
// Ask a whole country for every football club it has, then match on our side.
// This is the one that gets Roma, Genk and Olympiacos: their Wikidata labels
// are "AS Roma", "KRC Genk" and "Olympiacos F.C.", which no search box hands
// back for a bare surname, but which fall out immediately once you hold the
// list and can strip the club-speak yourself.

/** Everything a club is called that is not its name. */
const NOISE =
  /\b(fc|cf|afc|ac|as|ss|ssd|sc|cd|ud|sd|sv|tsv|vfb|vfl|bsc|kv|kaa|krc|rc|rsc|us|usa|aca|ca|club|calcio|futbol|football|deportivo|associazione|association|sportiva|sporting|societa|società|spa|srl|1899|1900|e\.?v)\b/g

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’&-]/g, ' ')
    .replace(NOISE, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const left = clubs.filter((c) => !map[c.id])
const byCountry = new Map()
for (const club of left) {
  const country = countryOf[club.leagueId]
  byCountry.set(country, [...(byCountry.get(country) ?? []), club])
}

for (const [country, list] of byCountry) {
  if (outOfTime()) {
    console.log('  (out of time, the rest can wait for next quarter)')
    break
  }
  const cq = (COUNTRY_Q[country] ?? [])[0]
  if (!cq) {
    console.log(`  ? no Wikidata country for ${country}`)
    continue
  }
  const rows = await ask(
    `SELECT ?club ?name WHERE {
       VALUES ?type { wd:Q476028 wd:Q847017 }
       ?club wdt:P31/wdt:P279* ?type ; wdt:P17 wd:${cq} .
       { ?club rdfs:label ?name FILTER(lang(?name)='en') }
       UNION { ?club skos:altLabel ?name FILTER(lang(?name)='en') }
     }`,
    { label: `every club in ${country}` },
  )

  const names = new Map() // normalised name -> Set of QIDs
  for (const row of rows) {
    if (REJECT.test(row.name.value)) continue
    const key = norm(row.name.value)
    if (!key) continue
    if (!names.has(key)) names.set(key, new Set())
    names.get(key).add(qid(row.club.value))
  }

  const picks = []
  for (const club of list) {
    const key = norm(club.name)
    let hits = [...(names.get(key) ?? [])]
    if (!hits.length) {
      // a name that begins or ends with ours: "Genk" finds "Genk Racing"
      const near = [...names.entries()].filter(
        ([n]) => n === key || n.startsWith(key + ' ') || key.startsWith(n + ' ') || n.endsWith(' ' + key),
      )
      if (near.length === 1) hits = [...near[0][1]]
      else if (near.length > 1) hits = [...new Set(near.flatMap(([, set]) => [...set]))]
    }
    if (!hits.length) {
      // and finally ours as a whole word anywhere inside theirs, which is what
      // turns "Bochum" into "VfL Bochum 1848" and "Nice" into "OGC Nice"
      const inside = [...names.entries()].filter(([n]) =>
        new RegExp(`(^| )${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}( |$)`).test(n),
      )
      hits = [...new Set(inside.flatMap(([, set]) => [...set]))]
    }
    if (hits.length) picks.push({ club, hits })
  }
  if (!picks.length) {
    await sleep(500)
    continue
  }

  // a first team has a squad; a women's side or an under-19s does not
  const all = [...new Set(picks.flatMap((p) => p.hits))]
  const counts = new Map()
  for (const part of chunk(all, 120)) {
    const rows2 = await ask(
      `SELECT ?club (COUNT(DISTINCT ?p) AS ?squad) WHERE {
         VALUES ?club { ${values(part)} }
         OPTIONAL { ?p wdt:P54 ?club }
       } GROUP BY ?club`,
      { label: `squads in ${country}` },
    )
    for (const row of rows2) counts.set(qid(row.club.value), Number(row.squad?.value ?? 0))
    await sleep(300)
  }

  for (const { club, hits } of picks) {
    const best = hits.map((q) => ({ q, squad: counts.get(q) ?? 0 })).sort((a, b) => b.squad - a.squad)[0]
    if (best && best.squad >= 10) {
      map[club.id] = best.q
      console.log(`  + ${club.id} → ${best.q} (${best.squad} players)`)
    }
  }
  writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n')
  await sleep(500)
}

// --------------------------------------------------------------- pass four
// Whatever is left is a club whose Wikidata label is nothing like ours and
// which the country sweep missed. Wikidata describes almost every club as a
// "Greek association football club" or a "Danish football team", so the last
// pass searches the bare name and believes the description.

const ADJECTIVE = {
  England: 'English', Scotland: 'Scottish', Wales: 'Welsh', Spain: 'Spanish',
  Germany: 'German', Italy: 'Italian', France: 'French', Portugal: 'Portuguese',
  Netherlands: 'Dutch', Belgium: 'Belgian', Türkiye: 'Turkish', Greece: 'Greek',
  Austria: 'Austrian', Switzerland: 'Swiss', Denmark: 'Danish', Czechia: 'Czech',
  Croatia: 'Croatian', Poland: 'Polish', Norway: 'Norwegian', Brazil: 'Brazilian',
  'Saudi Arabia': 'Saudi', Mexico: 'Mexican', Argentina: 'Argentine', USA: 'American',
}

for (const club of clubs.filter((c) => !map[c.id])) {
  if (outOfTime()) {
    console.log('  (out of time, the rest can wait for next quarter)')
    break
  }
  const country = countryOf[club.leagueId]
  const adj = ADJECTIVE[country]
  const want = wantedCountries(club.leagueId)
  const hits = []
  for (const term of [club.name, `${club.name} ${adj ?? ''}`.trim()]) {
    for (const hit of await search(term, 8)) {
      if (REJECT.test(`${hit.label} ${hit.desc}`)) continue
      const desc = hit.desc.toLowerCase()
      const footballish = /football|soccer/.test(desc)
      const rightPlace = adj ? desc.includes(adj.toLowerCase()) : true
      if (footballish && rightPlace && !hits.some((h) => h.id === hit.id)) hits.push(hit)
    }
    await sleep(250)
  }
  if (!hits.length) continue

  const rows = await ask(
    `SELECT ?club ?country (COUNT(DISTINCT ?p) AS ?squad) WHERE {
       VALUES ?club { ${values(hits.map((h) => h.id))} }
       OPTIONAL { ?club wdt:P17 ?country }
       OPTIONAL { ?p wdt:P54 ?club }
     } GROUP BY ?club ?country`,
    { label: `last chance for ${club.name}` },
  )
  const best = rows
    .map((r) => ({
      q: qid(r.club.value),
      country: r.country ? qid(r.country.value) : null,
      squad: Number(r.squad?.value ?? 0),
    }))
    .filter((r) => (r.country ? want.includes(r.country) : true) && r.squad >= 8)
    .sort((a, b) => b.squad - a.squad)[0]
  if (best) {
    map[club.id] = best.q
    console.log(`  + ${club.id} → ${best.q} (${best.squad} players)`)
    writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n')
  }
  await sleep(350)
}

writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n')

const mapped = clubs.filter((c) => map[c.id]).length
console.log(`\n${mapped} of ${clubs.length} clubs mapped`)
const missing = clubs.filter((c) => !map[c.id])
if (missing.length) console.log('still missing:\n  ' + missing.map((c) => `${c.id} (${c.name})`).join('\n  '))
