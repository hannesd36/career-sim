/**
 * Balance harness: runs a lot of AI careers and prints the distributions that
 * matter, so the numbers can be tuned without clicking through the UI.
 *
 *   npx tsx scripts/balance.ts            all positions, 400 careers each
 *   npx tsx scripts/balance.ts ST 1000    one position
 *
 * The "AI" always takes the offer with the best mix of playing time and squad
 * quality, which is roughly what a sensible human does.
 */
import {
  acceptOffer,
  closeEvent,
  closePenalty,
  createCareer,
  playSeasons,
  resolveEvent,
  retirementHint,
  takePenalty,
  totals,
} from '../src/engine/career'
import { EVENT_BY_ID } from '../src/engine/events'
import { CLUB_BY_ID } from '../src/data/clubs'
import { LEAGUE_BY_ID } from '../src/data/leagues'
import {
  POSITIONS,
  type Career,
  type Offer,
  type PenaltyCorner,
  type Position,
} from '../src/engine/types'

/** The bot picks a corner without thinking about it, which is roughly fair. */
const PENALTY_CORNERS: PenaltyCorner[] = ['left', 'centre', 'right']

const ROLE_VALUE: Record<string, number> = {
  'Key player': 1,
  Starter: 0.95,
  Rotation: 0.6,
  'Squad player': 0.25,
  Benchwarmer: 0.05,
}

function chooseOffer(career: Career): Offer | null {
  if (!career.offers.length) return null
  let best = career.offers[0]
  let bestScore = -Infinity
  for (const o of career.offers) {
    const league = LEAGUE_BY_ID[o.club.leagueId]
    // minutes matter most while young, prestige more once developed
    const young = career.player.age <= 23
    const score =
      ROLE_VALUE[o.projectedRole] * (young ? 26 : 14) +
      o.club.strength * 0.55 +
      league.strength * 0.35 +
      (o.continental ? 3 : 0) +
      (o.loan && young ? 6 : 0)
    if (score > bestScore) {
      bestScore = score
      best = o
    }
  }
  return best
}

/**
 * How the bot answers a decision. "safe" always declines the gamble, which is
 * the baseline the balance numbers describe; "reckless" always takes it, which
 * is how the doping route gets measured.
 */
type Nerve = 'safe' | 'reckless'

const RISKY_CHOICE: Record<string, string> = {
  'doping-offer': 'accept',
  'doping-continue': 'continue',
  surgery: 'operate',
  'extra-training': 'grind',
  'transfer-strike': 'strike',
  'agent-gamble': 'wait',
  captaincy: 'take-armband',
  'coach-clash': 'push-back',
  burnout: 'play-through',
}

function answerEvent(career: ReturnType<typeof createCareer>, nerve: Nerve) {
  const id = career.pendingEvent!.id
  const event = EVENT_BY_ID[id]
  const risky = RISKY_CHOICE[id]
  // the safe branch is whichever choice is not the gamble
  const key =
    nerve === 'reckless'
      ? (risky ?? event.choices[0].key)
      : (event.choices.find((c) => c.key !== risky)?.key ?? event.choices[0].key)
  return closeEvent(resolveEvent(career, key))
}

function runCareer(position: Position, seed: number, nerve: Nerve = 'safe') {
  let career = createCareer({ name: 'Test', nation: 'Germany', position, foot: 'Right', seed })
  let guard = 0
  while (career.phase !== 'retired' && guard++ < 60) {
    career = playSeasons(career, 1)
    // a final and a decision can both land on the same summer
    while (career.phase === 'event' || career.phase === 'penalty') {
      career =
        career.phase === 'penalty'
          ? closePenalty(takePenalty(career, PENALTY_CORNERS[guard % 3]))
          : answerEvent(career, nerve)
    }
    if (career.phase === 'retired') break
    // A suspended or skipped summer has no window to negotiate — the season
    // just rolls on. Treating that as "no offers" would end the career.
    if (career.phase === 'season') continue
    // retire when the game says it is over and the offers are poor
    const hint = retirementHint(career)
    const offer = chooseOffer(career)
    if (!offer) break
    if (hint && career.player.age >= 36 && ROLE_VALUE[offer.projectedRole] < 0.6) break
    career = acceptOffer(career, offer)
  }
  return career
}

function pct(sorted: number[], p: number) {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

function summarise(position: Position, runs: number, nerve: Nerve = 'safe') {
  const peaks: number[] = []
  const goals: number[] = []
  const apps: number[] = []
  const seasons: number[] = []
  const majors: number[] = []
  const ballons: number[] = []
  const caps: number[] = []
  const topLeagueSeasons: number[] = []
  let bestValue = 0
  let bestLine = ''
  let banned = 0

  for (let i = 0; i < runs; i++) {
    const c = runCareer(position, 1000 + i * 7919, nerve)
    const t = totals(c)
    peaks.push(t.peakOvr)
    goals.push(t.goals + t.natGoals)
    apps.push(t.apps)
    seasons.push(c.history.length)
    caps.push(t.natApps)
    majors.push(
      c.trophies.filter((tr) =>
        ['league', 'continental', 'worldcup', 'continentalnation', 'cup'].includes(tr.id),
      ).length,
    )
    ballons.push(c.trophies.filter((tr) => tr.id === 'ballondor').length)
    topLeagueSeasons.push(
      c.history.filter((s) => LEAGUE_BY_ID[s.leagueId].strength >= 74).length,
    )
    if (c.history.some((h) => h.banned)) banned++
    if (t.peakOvr > bestValue) {
      bestValue = t.peakOvr
      const last = c.history[c.history.length - 1]
      bestLine = `peak ${t.peakOvr} · ${t.apps} apps · ${t.goals}g ${t.assists}a · ${c.trophies.length} trophies · finished at ${last ? CLUB_BY_ID[last.clubId]?.name : '?'}`
    }
  }

  const s = (a: number[]) => a.slice().sort((x, y) => x - y)
  const mean = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)
  const P = s(peaks)

  console.log(`\n=== ${position} (${runs} careers) ===`)
  console.log(
    `peak OVR   median ${pct(P, 0.5)}   p10 ${pct(P, 0.1)}  p90 ${pct(P, 0.9)}  max ${pct(P, 0.999)}`,
  )
  console.log(
    `seasons ${mean(seasons)}   apps ${mean(apps)}   goals ${mean(goals)}   caps ${mean(caps)}`,
  )
  console.log(
    `major trophies ${mean(majors)}   ballon d'or in ${(ballons.filter(Boolean).length / runs * 100).toFixed(1)}% of careers`,
  )
  console.log(`seasons in a top division ${mean(topLeagueSeasons)}`)
  console.log(`best run: ${bestLine}`)
  if (nerve === 'reckless') {
    console.log(`banned at some point: ${(banned / runs * 100).toFixed(1)}% of careers`)
  }
}

const arg = process.argv[2]
const runs = Number(process.argv[3] || 400)
const nerve: Nerve = process.argv[4] === 'reckless' ? 'reckless' : 'safe'
const list = arg && POSITIONS.includes(arg as Position) ? [arg as Position] : POSITIONS
for (const p of list) summarise(p, runs, nerve)
