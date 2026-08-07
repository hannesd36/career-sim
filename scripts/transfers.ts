/**
 * Checks that transfer offers follow plausible routes rather than teleporting
 * players across the world. Prints, for a given starting club, where the offers
 * actually come from.
 *
 *   npx tsx scripts/transfers.ts
 */
import { CLUB_BY_ID } from '../src/data/clubs'
import { LEAGUE_BY_ID } from '../src/data/leagues'
import { generateOffers } from '../src/engine/career'
import { Rng } from '../src/engine/rng'
import type { Player } from '../src/engine/types'

function probe(label: string, clubId: string, ovr: number, age: number, nation = 'Germany') {
  const club = CLUB_BY_ID[clubId]
  if (!club) return console.log(`${label}: unknown club ${clubId}`)

  const counts = new Map<string, number>()
  const runs = 600
  for (let i = 0; i < runs; i++) {
    const player: Player = {
      name: 'Probe', nation, position: 'ST', foot: 'Right', age, ovr,
      hiddenPotential: ovr + 8, potMin: ovr, potMax: ovr + 10, archetype: 'normal',
      value: 0, clubId, onLoan: false, parentClubId: null, retired: false, natCapped: false,
    }
    for (const offer of generateOffers(player, null, new Rng(i * 7919 + 13))) {
      const l = LEAGUE_BY_ID[offer.club.leagueId]
      const key = `${l.name} (${l.country})`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
  console.log(`\n${label}  —  ${club.name}, ${LEAGUE_BY_ID[club.leagueId].name}, OVR ${ovr}, age ${age}`)
  for (const [league, n] of top) {
    const pct = ((n / total) * 100).toFixed(1)
    console.log(`   ${pct.padStart(5)}%  ${'█'.repeat(Math.round(Number(pct) / 2))} ${league}`)
  }
  const foreign = [...counts.entries()]
    .filter(([k]) => !k.includes('(Germany)'))
    .reduce((a, [, n]) => a + n, 0)
  if (nation === 'Germany') console.log(`   abroad: ${((foreign / total) * 100).toFixed(1)}%`)
}

probe('young 3. Liga player', 'ger3-waldhof-mannheim', 62, 20)
probe('2. Bundesliga regular', 'ger2-karlsruher-sc', 70, 24)
probe('Bundesliga starter', 'ger1-mainz-05', 79, 26)
probe('European star', 'ger1-bayern-munich', 89, 28)
probe('veteran star', 'ger1-bayern-munich', 86, 32)

// late-career markets: should be shut to a 24-year-old star, open to a 32-year-old
probe('star at 24', 'ger1-bayern-munich', 85, 24)
probe('star at 32', 'ger1-bayern-munich', 85, 32)
