/**
 * The little bit of Wikidata plumbing both data scripts need.
 *
 * Wikidata is free, needs no key, and knows every club a footballer has ever
 * been registered at. It is also a public service, so this file is polite:
 * one request at a time, a real User-Agent, and a backoff that gives up slowly
 * rather than hammering.
 */

const UA = 'career-sim-data/1.0 (https://github.com/hannesd36/career-sim)'
const API = 'https://www.wikidata.org/w/api.php'

/**
 * Two endpoints answer the same questions about the same data.
 *
 * QLever is a public index of the Wikidata dump run by the University of
 * Freiburg, and it answers in a tenth of a second what Wikidata's own service
 * takes ten seconds and a two minute cooling off period to answer. It is tried
 * first for that reason alone. Wikidata's own endpoint is the fallback, and is
 * the only one that knows about anything newer than the last dump.
 *
 * Neither is asked for anything clever: no label service, no aggregation, just
 * triples. That is what keeps both of them quick and this script portable.
 */
const QLEVER = 'https://qlever.cs.uni-freiburg.de/api/wikidata'
const WDQS = 'https://query.wikidata.org/sparql'

/** QLever declares nothing for you, so every query carries its own prefixes. */
const PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX schema: <http://schema.org/>
PREFIX wikibase: <http://wikiba.se/ontology#>
`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Strip the entity URI down to the Q number. */
export const qid = (uri) => String(uri).split('/').pop()

/**
 * Run a SPARQL query and hand back the rows.
 *
 * The public endpoint answers most things in a second or two and times out on
 * anything that touches every footballer alive, so every query in here is
 * scoped to one club or one batch of people.
 */
/** Never two requests inside this window, whoever asked for them. */
const GAP_MS = 120
let lastCall = 0

async function queue() {
  const since = Date.now() - lastCall
  if (since < GAP_MS) await sleep(GAP_MS - since)
  lastCall = Date.now()
}

async function run(endpoint, query) {
  const res =
    endpoint === QLEVER
      ? await fetch(QLEVER, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sparql-query',
            Accept: 'application/sparql-results+json',
            'User-Agent': UA,
          },
          body: PREFIXES + query,
        })
      : await fetch(`${WDQS}?format=json&query=${encodeURIComponent(PREFIXES + query)}`, {
          headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
        })

  if (res.status === 429) {
    const after = Number(res.headers.get('retry-after')) || 60
    await sleep((after + 2) * 1000)
    throw new Error('rate limited')
  }
  if (!res.ok) throw new Error(`http ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const body = await res.text()
  if (!body.trim()) throw new Error('empty body (the query timed out)')
  return JSON.parse(body).results.bindings
}

export async function ask(query, { tries = 4, label = '' } = {}) {
  let wait = 2000
  for (let attempt = 1; attempt <= tries; attempt++) {
    // the fast one first, the authoritative one when it will not play
    const endpoint = attempt <= 2 ? QLEVER : WDQS
    await queue()
    try {
      return await run(endpoint, query)
    } catch (err) {
      if (attempt === tries) throw new Error(`${label || 'query'} failed: ${err.message}`)
      await sleep(wait)
      wait = Math.min(wait * 2, 60_000)
    }
  }
  return []
}

/** The same, but a failure is a shrug rather than the end of the run. */
export async function tryAsk(query, opts = {}) {
  try {
    return await ask(query, opts)
  } catch (err) {
    console.log(`  ! ${err.message}`)
    return []
  }
}

/** Wikidata's own search box, which forgives accents and abbreviations. */
export async function search(term, limit = 8) {
  const url = `${API}?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=${limit}&search=${encodeURIComponent(term)}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`http ${res.status}`)
      const json = await res.json()
      return (json.search ?? []).map((s) => ({ id: s.id, label: s.label, desc: s.description ?? '' }))
    } catch {
      await sleep(1500 * attempt)
    }
  }
  return []
}

/**
 * Wikidata's full text search, which is a different and much better animal
 * than the entity box above: it finds "UD Almería" for "Almeria", where the
 * entity box only ever matches the start of a label. `haswbstatement` narrows
 * it to things that are actually football clubs before we look at all.
 */
export async function fullText(term, statement = 'P31=Q476028', limit = 8) {
  const url = `${API}?action=query&format=json&list=search&srlimit=${limit}&srsearch=${encodeURIComponent(
    `${term} haswbstatement:${statement}`,
  )}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`http ${res.status}`)
      const json = await res.json()
      return (json.query?.search ?? []).map((s) => s.title)
    } catch {
      await sleep(1500 * attempt)
    }
  }
  return []
}

/** `VALUES ?x { wd:Q1 wd:Q2 }` */
export const values = (ids) => ids.map((i) => `wd:${i}`).join(' ')

/** Split a long list into chunks a single query can carry. */
export function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export { sleep }
