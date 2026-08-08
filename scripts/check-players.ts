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

console.log(bad ? `\n${bad} problems` : '\nall clear')
process.exit(bad ? 1 : 0)
