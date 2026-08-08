/**
 * Sanity check on the book of footballers.
 *
 *   npx tsx scripts/check-players.ts
 *
 * Every club has to exist, every man has to be one man, every country has to
 * have a flag, and every question a grid can ask has to have somebody who
 * answers it. Anything that fails here would be a broken square in a game.
 */
import { CLUB_BY_ID } from '../src/data/clubs'
import { HONOURS, LEGENDS, confOf, flagOf } from '../src/data/players'
import { TRAITS, answersFor, ERAS, type Criterion } from '../src/engine/quiz'

let bad = 0
const fail = (msg: string) => {
  bad++
  console.log('  ✗ ' + msg)
}

console.log(`${LEGENDS.length} players in the book`)

// ---- clubs ----
for (const l of LEGENDS) {
  for (const c of l.careerClubs) if (!CLUB_BY_ID[c]) fail(`${l.name}: no such club "${c}"`)
  if (!l.clubs.length) fail(`${l.name}: no clubs at all`)
}

// ---- one man, one entry ----
const seen = new Map<string, string>()
for (const l of LEGENDS) {
  const other = seen.get(l.id)
  if (other) fail(`duplicate id "${l.id}" (${other} / ${l.name})`)
  else seen.set(l.id, l.name)
}

// ---- countries ----
const nations = new Set(LEGENDS.map((l) => l.nation))
for (const n of nations) {
  if (flagOf(n) === 'un') fail(`no flag for "${n}"`)
  if (!confOf(n)) fail(`no confederation for "${n}"`)
}

// ---- how much each question covers ----
const counts: [string, number][] = []
for (const h of HONOURS) counts.push([`honour:${h}`, answersFor({ kind: 'honour', id: h }).length])
for (const t of TRAITS) counts.push([`trait:${t}`, answersFor({ kind: 'trait', id: t }).length])
for (const e of ERAS) counts.push([`era:${e}`, answersFor({ kind: 'era', id: e }).length])
for (const [name, n] of counts) {
  if (n < 4) fail(`${name} only has ${n} answers, which is too thin for a header`)
}
console.log(counts.map(([k, n]) => `  ${k}: ${n}`).join('\n'))

// ---- clubs deep enough to head a column ----
const clubTally = new Map<string, number>()
for (const l of LEGENDS) for (const c of l.careerClubs) clubTally.set(c, (clubTally.get(c) ?? 0) + 1)
const heads = [...clubTally].filter(([, n]) => n >= 12)
console.log(`${clubTally.size} clubs appear at all, ${heads.length} of them on twelve players or more`)

const nationTally = new Map<string, number>()
for (const l of LEGENDS) nationTally.set(l.nation, (nationTally.get(l.nation) ?? 0) + 1)
console.log(`${nationTally.size} countries`)

// ---- the honours patch has to land on somebody ----
const ids = new Set(LEGENDS.map((l) => l.id))
const { HONOUR_PATCH } = await import('../src/data/legends2')
for (const id of Object.keys(HONOUR_PATCH)) if (!ids.has(id)) fail(`honour patch: nobody with id "${id}"`)

// ---- every square a grid could deal has to be answerable at all ----
const sample: Criterion[] = [
  ...HONOURS.map((id) => ({ kind: 'honour', id }) as Criterion),
  ...TRAITS.map((id) => ({ kind: 'trait', id }) as Criterion),
]
for (const c of sample) if (!answersFor(c).length) fail(`nobody answers ${c.kind}:${c.id}`)

// ---- and the generated half, if it has been pulled ----
const { existsSync, readFileSync } = await import('node:fs')
const GENERATED = 'public/players.json'
if (existsSync(GENERATED)) {
  const book = JSON.parse(readFileSync(GENERATED, 'utf8'))
  console.log(`\ngenerated book: ${book.rows.length} players, pulled ${book.built}`)
  if (book.v !== 1) fail('the generated book is in a format this game cannot read')
  for (const id of book.clubs) if (!CLUB_BY_ID[id]) fail(`generated book: no such club "${id}"`)
  for (const [name, flag, conf] of book.nations) {
    if (!flag) fail(`generated book: no flag for "${name}"`)
    if (!['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'].includes(conf))
      fail(`generated book: "${name}" has confederation "${conf}"`)
  }
  const curated = new Set(LEGENDS.map((l) => l.name))
  const overlap = book.rows.filter((r: [string]) => curated.has(r[0])).length
  console.log(`  ${overlap} of them are also written by hand, and the hand written one wins`)

  // how well known the generated half is, which is what decides who can be
  // hidden in the guessing game and which clubs are allowed to head a grid
  const steps = [100, 60, 40, 30, 20, 14, 8]
  const fame = book.rows.map((r: unknown[]) => Number(r[4]))
  console.log(
    '  ' +
      steps
        .map((s) => `${s}+: ${fame.filter((f: number) => f >= s).length}`)
        .join('   '),
  )
} else {
  console.log('\nno generated book yet (run npm run fetch:players)')
}

console.log(bad ? `\n${bad} problems` : '\nall clear')
process.exit(bad ? 1 : 0)
