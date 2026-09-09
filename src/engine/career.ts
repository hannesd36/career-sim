import { CLUB_BY_ID, CLUBS, clubsInLeague } from '../data/clubs'
import { LEAGUE_BY_ID, areNeighbours } from '../data/leagues'
import { NATION_BY_NAME as NATIONS_BY_NAME } from '../data/nations'
import { NATION_BY_NAME } from '../data/nations'
import {
  EVENT_BY_ID,
  applyEffect,
  dopingTestRisk,
  reputationPenalty,
  rollEvent,
  rollOutcome,
} from './events'
import * as attributes from './attributes'
import type { Facet } from './attributes'
import * as contracts from './contracts'
import type { Terms } from './contracts'
import * as finances from './finances'
import type { SpendId } from './finances'
import * as injuries from './injuries'
import * as staff from './staff'
import { effectsOf, type ModifierId } from './modifiers'
import { judgeObjective, objectiveOf, objectiveSwing } from './objectives'
import { Rng, clamp, randomSeed } from './rng'
import {
  awardIndividual,
  leagueGamesOf,
  marketValue,
  progress,
  projectRole,
  simulateInternational,
  simulateSeason,
} from './sim'
import {
  MODE_CONFIG,
  isDetailed,
  type Career,
  type CareerDetail,
  type Club,
  type Foot,
  type GameMode,
  type Offer,
  type Player,
  type PendingPenalty,
  type PenaltyCorner,
  type Position,
  type RetirementReason,
  type SeasonRecord,
  type SquadRole,
} from './types'

export interface CreateOptions {
  name: string
  nation: string
  position: Position
  foot: Foot
  mode?: GameMode
  seed?: number
  startYear?: number
  /** an unlocked start, if the career is being begun under one */
  modifier?: ModifierId
  /** the day this career was drawn for, if it came from the daily challenge */
  daily?: string
  /** simple or detailed; a career picks once and can only ever go up */
  detail?: CareerDetail
}

const START_AGE = 16

export function createCareer(opts: CreateOptions): Career {
  const seed = opts.seed ?? randomSeed()
  const rng = new Rng(seed)
  const nation = NATION_BY_NAME[opts.nation] ?? NATION_BY_NAME.Germany

  const effects = effectsOf(opts.modifier)

  // A youth product comes through at a modest club in his own country. A start
  // that demands an even smaller one pushes the floor down rather than moving
  // the player somewhere else: it is still his country, just further down it.
  const floor = Math.max(3, effects.startTierFloor ?? 3)
  const pool = nation.startLeagues.flatMap((id) => clubsInLeague(id)).filter((c) => c.tier >= floor)
  const fallback = CLUBS.filter((c) => c.tier >= Math.max(4, floor))
  const club = pool.length ? rng.pick(pool) : rng.pick(fallback.length ? fallback : CLUBS)

  const archetypeRoll = rng.next()
  const archetype = archetypeRoll < 0.12 ? 'wonderkid' : archetypeRoll < 0.3 ? 'late' : 'normal'

  // Start close enough to the bottom of the pyramid that the first transfer
  // window is a real choice rather than five variations on "you won't play".
  const ovr = clamp(
    rng.int(50, 58) + (archetype === 'wonderkid' ? 2 : 0) + effects.startOvr,
    42,
    70,
  )
  const potentialBoost = archetype === 'wonderkid' ? 7 : archetype === 'late' ? 3 : 0
  const hiddenPotential = clamp(
    ovr + rng.gauss(21, 9) + potentialBoost + effects.startPotential,
    ovr + 4,
    94,
  )

  const player: Player = {
    name: opts.name.trim() || 'New Player',
    nation: nation.name,
    position: opts.position,
    foot: opts.foot,
    age: START_AGE,
    ovr,
    hiddenPotential,
    potMin: 0,
    potMax: 0,
    archetype,
    value: 0,
    clubId: club.id,
    onLoan: false,
    parentClubId: null,
    retired: false,
    natCapped: false,
    doping: false,
    dopingSeasons: 0,
    bannedUntil: null,
    reputation: 50,
  }

  // opening estimate is deliberately vague
  const width = 28
  player.potMin = clamp(Math.round(hiddenPotential - width / 2 + rng.gauss(0, 4)), ovr, 99)
  player.potMax = clamp(
    Math.max(player.potMin + 1, Math.round(hiddenPotential + width / 2 + rng.gauss(0, 4))),
    player.potMin + 1,
    99,
  )
  if (player.potMin > hiddenPotential) player.potMin = Math.floor(hiddenPotential)
  if (player.potMax < hiddenPotential) player.potMax = Math.ceil(hiddenPotential)
  player.value = marketValue(player, club)

  const detail: CareerDetail = opts.detail === 'detailed' ? 'detailed' : 'simple'
  let contract: contracts.Contract | null = null
  let room: staff.Room | undefined
  let money: finances.Finances | undefined
  if (detail === 'detailed') {
    player.attributes = attributes.generate(player.ovr, player.position, rng)
    player.body = injuries.newBody(rng)
    // A youth product signs whatever the club puts in front of him.
    const role = projectRole(player.ovr, club.strength, player.age)
    const terms = contracts.offerTerms(player, club, role, rng)[0]
    contract = contracts.sign(terms, club, startYearOf(opts))
    room = staff.newRoom(startYearOf(opts), club.strength, rng, nation.name, nation.conf)
    money = finances.emptyFinances()
  }

  const startYear = startYearOf(opts)
  return {
    id: `${seed}-${Date.now()}`,
    seed,
    startYear,
    season: startYear,
    player,
    history: [],
    trophies: [],
    offers: [],
    phase: 'season',
    lastSeason: null,
    lastRun: [],
    runLeft: 0,
    mode: opts.mode ?? 'normal',
    pendingEvent: null,
    pendingPenalty: null,
    eventLog: [],
    createdAt: Date.now(),
    modifier: opts.modifier ?? 'standard',
    daily: opts.daily,
    detail,
    training: null,
    detailedFrom: detail === 'detailed' ? startYear : undefined,
    contract,
    finances: money,
    room,
  }
}

function startYearOf(opts: CreateOptions): number {
  return opts.startYear ?? 2026
}

/**
 * Turns a simple career into a detailed one, mid-run and one way only.
 *
 * The attributes are built around the rating the career already reached rather
 * than from scratch, so a thirty-year-old who arrives here gets the shape of
 * the player he actually became. A career already detailed is returned
 * untouched, which makes this safe to call from a button without guarding.
 */
export function upgradeToDetailed(career: Career): Career {
  if (isDetailed(career)) return career
  const rng = new Rng(career.seed ^ 0x5eed)
  const player = { ...career.player }
  player.attributes = attributes.generate(player.ovr, player.position, rng)
  player.body = injuries.newBody(rng)

  // The career already has a club and a standing at it, so the contract and the
  // dressing room are built to match where it actually got to rather than being
  // handed the terms of a sixteen year old.
  const club = CLUB_BY_ID[player.clubId]
  const nation = NATIONS_BY_NAME[player.nation] ?? NATIONS_BY_NAME.Germany
  const role = projectRole(player.ovr, club.strength, player.age)
  const terms = contracts.offerTerms(player, club, role, rng)[0]

  return {
    ...career,
    player,
    detail: 'detailed',
    detailedFrom: career.season,
    training: null,
    contract: contracts.sign(terms, club, career.season),
    finances: finances.emptyFinances(),
    room: staff.newRoom(career.season, club.strength, rng, nation.name, nation.conf),
  }
}

/** Turning a standing arrangement on or off. */
export function toggleSpend(career: Career, id: SpendId): Career {
  if (!isDetailed(career) || !career.finances) return career
  return { ...career, finances: finances.toggle(career.finances, id) }
}

/** Moving money into investments, or pulling it back out. */
export function moveInvestment(career: Career, amount: number): Career {
  if (!isDetailed(career) || !career.finances) return career
  return { ...career, finances: finances.invest(career.finances, amount) }
}

/** Sets what the player works on over the coming summer. */
export function setTraining(career: Career, facet: Facet | null): Career {
  if (!isDetailed(career)) return career
  return { ...career, training: facet }
}

// ---------------------------------------------------------------------------
// one season
// ---------------------------------------------------------------------------

/** Was this club playing continental football going into the season? */
function continentalEntry(club: Club, previous: SeasonRecord | null, rng: Rng): boolean {
  const league = LEAGUE_BY_ID[club.leagueId]
  if (!league.continental || league.euroSpots === 0) return false
  if (previous && previous.clubId === club.id) return previous.leaguePosition <= league.euroSpots
  const p = club.tier === 1 ? 0.88 : club.tier === 2 ? 0.5 : club.tier === 3 ? 0.14 : 0.03
  return rng.chance(p)
}

/** A suspended season: no football, and the rating falls away. */
function bannedSeason(player: Player, club: Club, season: number): SeasonRecord {
  return {
    season,
    age: player.age,
    clubId: club.id,
    clubName: club.name,
    badge: club.badge,
    leagueId: club.leagueId,
    onLoan: false,
    ovrStart: player.ovr,
    ovrEnd: player.ovr,
    role: 'Benchwarmer',
    apps: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    conceded: 0,
    saves: 0,
    tackles: 0,
    keyPasses: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 0,
    minutes: 0,
    gamesMissedInjured: 0,
    leaguePosition: 0,
    ceilingBefore: [player.potMin, player.potMax],
    ceilingAfter: [player.potMin, player.potMax],
    trophies: [],
    banned: true,
    natApps: 0,
    natGoals: 0,
    natAssists: 0,
    natCleanSheets: 0,
  }
}

/** Plays exactly one season and returns the record; mutates the player. */
function runOneSeason(career: Career, rng: Rng): SeasonRecord {
  const { player } = career
  const club = CLUB_BY_ID[player.clubId]
  const previous = career.history.length ? career.history[career.history.length - 1] : null

  if (player.bannedUntil !== null && career.season < player.bannedUntil) {
    const record = bannedSeason(player, club, career.season)
    // A year without football costs you more than a bad year with it.
    player.ovr = clamp(player.ovr - rng.int(4, 7), 40, 99)
    player.hiddenPotential = clamp(player.hiddenPotential - 2, player.ovr, 99)
    player.potMin = clamp(player.potMin, player.ovr, 99)
    player.potMax = clamp(Math.max(player.potMax, player.potMin + 1), player.potMin + 1, 99)
    record.ovrEnd = player.ovr
    record.ceilingAfter = [player.potMin, player.potMax]
    player.age += 1
    return record
  }

  const effects = effectsOf(career.modifier)
  const continental = continentalEntry(club, previous, rng)

  // --- what the detailed mode decides before a ball is kicked -----------
  // The role comes from what the manager thinks of you rather than from the
  // rating alone, and the injury is drawn from this body's own history. Both
  // are handed to the simulation; it does not know where they came from.
  const detailed = isDetailed(career)
  const perks = finances.perksOf(career.finances)
  let roleOverride: SquadRole | undefined
  let pendingInjury: injuries.Injury | null = null

  if (detailed && career.room) {
    const base = projectRole(player.ovr, club.strength, player.age)
    roleOverride = staff.roleFromOpinion(base, career.room.manager.opinion)
  }
  if (detailed && player.body) {
    pendingInjury = injuries.rollInjury(player.body, {
      age: player.age,
      season: career.season,
      risk: (effects.injury ?? 1) * perks.injury,
      recovery: perks.recovery,
      rng,
    })
  }

  const record = simulateSeason({
    player,
    club,
    season: career.season,
    continental,
    rng,
    tableSeed: career.seed,
    injuryScale: effects.injury,
    roleOverride,
    injuryGames: detailed ? (pendingInjury?.games ?? 0) : undefined,
  })

  simulateInternational(player, record, career.season, rng)
  awardIndividual(player, record, career.season, rng)
  if (record.natApps > 0) player.natCapped = true

  const prog = progress(player, record, career.history.length, rng)
  // A start that trades a steeper rise for a steeper fall reshapes the season's
  // own verdict rather than replacing it: the football that was played is the
  // football that was played, and this only changes what it did to the player.
  if (effects.growth !== 1 || effects.decline !== 1) {
    const delta = prog.ovrAfter - record.ovrStart
    const scaled = delta * (delta >= 0 ? effects.growth : effects.decline)
    player.ovr = clamp(Math.round(record.ovrStart + scaled), 40, 99)
    player.hiddenPotential = clamp(player.hiddenPotential, player.ovr, 99)
    player.potMin = clamp(player.potMin, player.ovr, 99)
    player.potMax = clamp(Math.max(player.potMax, player.potMin + 1), player.potMin + 1, 99)
    record.ceilingAfter = [player.potMin, player.potMax]
  }
  record.ovrEnd = player.ovr

  // The shape follows the rating, never the other way round: whatever the
  // simulation decided this season is, the attributes are refitted to it. What
  // the summer's training and the player's age get to decide is which parts of
  // him carry that number.
  if (detailed && player.attributes) {
    player.attributes = attributes.advance(player.attributes, {
      position: player.position,
      age: player.age,
      ovrAfter: player.ovr,
      training: career.training ?? null,
      rng,
    })
    // A bad injury takes something for good. Applied after the refit, so the
    // loss survives rather than being squeezed straight back out by it.
    if (pendingInjury?.lasting) {
      player.attributes = injuries.applyLasting(player.attributes, pendingInjury)
    }
  }

  if (detailed) {
    // --- the body remembers ---------------------------------------------
    if (pendingInjury && player.body) {
      player.body = injuries.record(player.body, pendingInjury)
      record.injury = pendingInjury
    }

    // --- the books ------------------------------------------------------
    const earned = contracts.seasonEarnings(career.contract ?? null, record)
    record.earned = earned
    if (career.finances) {
      career.finances = finances.settleSeason(career.finances, earned, rng).finances
    }

    // --- the people -----------------------------------------------------
    if (career.room) {
      let room = staff.agedRoom(career.room, rng)
      room = {
        ...room,
        manager: staff.updateOpinion(room.manager, record, player.position, rng),
        standing: staff.updateStanding(room, record, rng),
      }
      // A manager who has run out of road is replaced, and the new one arrives
      // with an opinion of his own. This is the moment a career can turn.
      if (!staff.managerSurvives(room.manager, record.leaguePosition, career.season, rng)) {
        const nation = NATIONS_BY_NAME[player.nation] ?? NATIONS_BY_NAME.Germany
        room = {
          ...room,
          manager: staff.newManager(career.season + 1, rng, nation.name, nation.conf),
        }
      }
      career.room = room
      record.managerOpinion = room.manager.opinion
    }

    // --- did they keep their word? ---------------------------------------
    if (contracts.promiseBroken(career.contract ?? null, record)) {
      career.promiseBroken = true
    }
  }

  player.age += 1
  const home = player.onLoan && player.parentClubId ? CLUB_BY_ID[player.parentClubId] : club
  player.value = marketValue(player, home)
  // Kept on the season as well as on the player, so a report can say what a
  // year did to your price rather than only what you are worth today.
  record.value = player.value

  if (player.onLoan && player.parentClubId) {
    player.clubId = player.parentClubId
    player.onLoan = false
    player.parentClubId = null
  }
  return record
}

/** A working copy, so a run never mutates the career it was called with. */
function fork(career: Career): Career {
  return {
    ...career,
    player: { ...career.player },
    history: [...career.history],
    trophies: [...career.trophies],
    eventLog: [...career.eventLog],
    lastRun: [...career.lastRun],
  }
}

/**
 * Plays `count` seasons at the current club and hands control back at the
 * summer window. A decision pauses the run rather than ending it: whatever is
 * left of the batch is played out by `closeEvent`, because clicking "five
 * seasons" and getting one is a broken promise.
 */
export function playSeasons(career: Career, count: number): Career {
  return runBatch({ ...fork(career), lastRun: [], runLeft: count })
}

function runBatch(start: Career): Career {
  let next = start
  while ((next.runLeft ?? 0) > 0) {
    const rng = new Rng(next.seed ^ (next.season * 2654435761))
    const record = runOneSeason(next, rng)

    next.history.push(record)
    next.trophies.push(...record.trophies)
    next.lastRun.push(record)
    next.lastSeason = record
    next.runLeft -= 1

    // --- the drug test, if there is anything to find --------------------
    if (next.player.doping) {
      next.player.dopingSeasons += 1
      if (rng.chance(dopingTestRisk(next.player.dopingSeasons))) {
        applyEffect(next.player, { ban: 2, ovr: -12, reputation: -45 }, next.season + 1)
        // The bust has to land on the season the player is looking at, or he
        // finds out a year later by simply not having a season to play.
        record.caught = true
        record.ovrEnd = next.player.ovr
        next.eventLog.push({
          season: next.season,
          id: 'doping-test',
          choice: 'caught',
          result: 'caught',
          tone: 'bad',
        })
      }
    }

    if (next.player.age >= 41) {
      next.phase = 'retired'
      next.offers = []
      next.runLeft = 0
      return next
    }

    // --- a final comes down to one kick ---------------------------------
    if (record.finalIn) {
      next.pendingPenalty = {
        season: next.season,
        trophy: record.finalIn.trophy,
        club: record.clubName,
        opponent: record.finalIn.opponent,
      }
      next.phase = 'penalty'
      return next
    }

    // --- does something demand a decision? ------------------------------
    const club = CLUB_BY_ID[next.player.clubId]
    const pressure = clamp(
      MODE_CONFIG[next.mode].eventPressure * effectsOf(next.modifier).eventPressure,
      0,
      0.95,
    )
    const event = record.banned
      ? null
      : rollEvent(
          {
            player: next.player,
            club,
            last: record,
            season: next.season,
            seasonsPlayed: next.history.length,
            decided: new Set(next.eventLog.map((e) => e.id)),
            // The clubs already behind you, and the season before this one:
            // the two things a career needs to remember for an event to be
            // about the career rather than about the season.
            pastClubs: [...new Set(next.history.map((s) => s.clubId))],
            previous: next.history[next.history.length - 2] ?? null,
          },
          pressure,
          rng,
        )

    if (event) {
      next.pendingEvent = { id: event.id, season: next.season }
      next.phase = 'event'
      return next
    }

    // The window only opens at the end of the batch. A fast-forward is time
    // passing at your club, never an agent moving you while you were not
    // looking: every transfer in a career is one the player chose.
    if (next.runLeft === 0) return advanceToWindow(next, rng)
    next = stayAnotherSeason(next)
  }
  return next
}

/** Rolls the year over and leaves the club alone. */
function stayAnotherSeason(career: Career): Career {
  return { ...career, season: career.season + 1, offers: [], phase: 'season' }
}

/** Generates offers for the coming summer and moves into the window. */
function advanceToWindow(career: Career, rng: Rng): Career {
  const player = career.player
  // A suspended player has nothing to negotiate; he just serves the ban.
  if (player.bannedUntil !== null && career.season + 1 < player.bannedUntil) {
    return { ...career, season: career.season + 1, offers: [], phase: 'season' }
  }

  // The summer is where the club says what it made of the season it set you.
  const last = career.lastSeason
  const swing = last ? objectiveSwing(judgeObjective(objectiveOf(career, last), last)) : 0
  const pastClubs = new Set(career.history.map((s) => s.clubId))
  const offers = generateOffers(player, last, rng, swing, pastClubs)
  return {
    ...career,
    offers,
    phase: offers.length === 0 ? 'retired' : 'offers',
  }
}

// ---------------------------------------------------------------------------
// the penalty
// ---------------------------------------------------------------------------

/**
 * One kick decides the final. The keeper picks a corner on a stream seeded by
 * the career and the season, so the outcome is fixed before the player clicks
 * and reloading cannot change it. Guessing right does not automatically save:
 * a good taker still beats a keeper who went the right way.
 */
export function takePenalty(career: Career, corner: PenaltyCorner): Career {
  const pending = career.pendingPenalty
  if (!pending || pending.taken) return career

  const rng = new Rng(career.seed ^ (pending.season * 91967) ^ 0x5bf03635)
  const corners: PenaltyCorner[] = ['left', 'centre', 'right']
  const keeper = corners[rng.int(0, 2)]

  const beatsAKeeperWhoGuessedRight = clamp(0.22 + (career.player.ovr - 60) / 190, 0.15, 0.55)
  const guessed = keeper === corner
  const scored = guessed ? rng.chance(beatsAKeeperWhoGuessedRight) : rng.chance(0.94)
  // A keeper who went the other way did not save it; you put it over the bar.
  const result: NonNullable<PendingPenalty['result']> = scored
    ? 'scored'
    : guessed
      ? 'saved'
      : 'wide'

  const player = { ...career.player }
  const trophies = [...career.trophies]
  if (scored) {
    // winning a final in front of everyone is worth something on its own
    player.ovr = clamp(player.ovr + 1, 40, 99)
    trophies.push({
      id: pending.trophy,
      season: pending.season,
      wonWith: pending.club,
      leagueId: CLUB_BY_ID[player.clubId]?.leagueId,
    })
  }

  const history = [...career.history]
  const last = history[history.length - 1]
  if (last && scored) {
    history[history.length - 1] = {
      ...last,
      ovrEnd: player.ovr,
      trophies: [...last.trophies, trophies[trophies.length - 1]],
    }
  }

  return {
    ...career,
    player,
    trophies,
    history,
    pendingPenalty: { ...pending, taken: corner, keeper, scored, result },
  }
}

/** Dismisses the finished penalty and carries on with whatever is left. */
export function closePenalty(career: Career): Career {
  const cleared: Career = { ...career, pendingPenalty: null }
  if ((cleared.runLeft ?? 0) > 0) return runBatch(stayAnotherSeason(fork(cleared)))
  const rng = new Rng(career.seed ^ (career.season * 7717))
  return advanceToWindow(cleared, rng)
}

/** Kept for callers that only ever want a single season. */
export function playSeason(career: Career): Career {
  return playSeasons(career, 1)
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

export function resolveEvent(career: Career, choiceKey: string): Career {
  const pending = career.pendingEvent
  if (!pending) return career
  const event = EVENT_BY_ID[pending.id]
  const choice = event?.choices.find((c) => c.key === choiceKey)
  if (!event || !choice) return career

  // Seeded on the event itself, so the same decision in the same career always
  // rolls the same way — no reloading your way to a better outcome.
  const rng = new Rng(career.seed ^ (pending.season * 40503) ^ (choiceKey.length * 7919))
  const outcome = rollOutcome(choice, rng)

  const player = { ...career.player }
  applyEffect(player, outcome.effect, career.season)

  const next: Career = {
    ...career,
    player,
    pendingEvent: {
      ...pending,
      chosen: choiceKey,
      outcome: { result: outcome.result, tone: outcome.tone },
    },
    eventLog: [
      ...career.eventLog,
      {
        season: pending.season,
        id: pending.id,
        choice: choiceKey,
        result: outcome.result,
        tone: outcome.tone,
      },
    ],
  }
  return next
}

/**
 * Dismisses the resolved event. If the click that triggered it still had
 * seasons to play, they are played now; otherwise the summer window opens.
 */
export function closeEvent(career: Career): Career {
  const cleared: Career = { ...career, pendingEvent: null }
  if ((cleared.runLeft ?? 0) > 0) return runBatch(stayAnotherSeason(fork(cleared)))
  const rng = new Rng(career.seed ^ (career.season * 7717))
  return advanceToWindow(cleared, rng)
}

// ---------------------------------------------------------------------------
// transfer offers
// ---------------------------------------------------------------------------

/**
 * How plausible a move is, on top of whether the club rates you.
 *
 * Real transfers follow scouting routes, not a global talent market: a third
 * division player in Mannheim goes up to the 2. Bundesliga, not to Major League
 * Soccer. Reputation is what unlocks distance — the better you are, the more of
 * the world is genuinely available to you, so the geography is damped rather
 * than removed as your level rises.
 */
export function transferAffinity(
  from: Club,
  to: Club,
  player: Player,
  level: number,
  /** clubs this career has already played for, which pull harder than strangers */
  pastClubs?: Set<string>,
): number {
  const a = LEAGUE_BY_ID[from.leagueId]
  const b = LEAGUE_BY_ID[to.leagueId]
  let affinity = 1

  // Weighted against the whole club pool, not pairwise: there are ten times as
  // many foreign clubs as domestic ones, so a merely-mild home bias still ends
  // up sending most players abroad.
  if (a.country === b.country) {
    affinity *= 5.5
    // the well-trodden path: one rung up or down your own pyramid
    if (b.id === a.above || b.id === a.below) affinity *= 2.2
  } else if (a.region === b.region) {
    affinity *= 2.2
  } else if (areNeighbours(a.region, b.region)) {
    affinity *= 0.9
  } else if (a.continent === b.continent) {
    affinity *= 0.35
  } else {
    affinity *= 0.08
  }

  // going home is always easier than going somewhere new
  const home = NATION_BY_NAME[player.nation]
  if (home && b.country === home.name && a.country !== home.name) affinity *= 1.7

  // A club you already played for knows exactly what it is getting, and the
  // supporters have not forgotten you. Going back is the most common story in
  // football and it was the one move the market could not make.
  if (pastClubs?.has(to.id)) affinity *= 2.4

  // teenagers rarely cross a border, and almost never an ocean
  if (player.age <= 19 && a.country !== b.country) {
    affinity *= a.continent === b.continent ? 0.55 : 0.15
  }

  // A player nobody has heard of moves locally; a star can move anywhere.
  const reach = clamp((level - 68) / 20, 0, 1)
  let result = Math.pow(affinity, 1 - 0.72 * reach)

  // Saudi and MLS buy reputation, not prospects. This is an age rule, not a
  // distance one, so it sits outside the reputation damping — otherwise being
  // a star would soften the very penalty that keeps 24-year-olds in Europe.
  if (b.lateCareer && a.country !== b.country) {
    result *= player.age >= 30 ? 2.4 : player.age >= 27 ? 0.85 : 0.12
  }
  return result
}

/** What the market thinks you're worth as a footballer, not just your rating. */
function marketLevel(player: Player, last: SeasonRecord | null, swing = 0): number {
  let level = player.ovr + swing
  if (last) {
    if (last.rating > 0) level += (last.rating - 6.8) * 3
    level += last.trophies.length * 0.7
    if (last.apps < 10) level -= 3.5
    if (last.banned) level -= 8
  }
  // clubs gamble on young players with room to grow
  if (player.age <= 21) level += (player.potMax - player.ovr) * 0.16
  else if (player.age >= 34) level -= (player.age - 33) * 1.6

  // a wrecked reputation follows you around, a clean one opens doors
  level += reputationPenalty(player)
  return level
}

function offerFor(club: Club, player: Player, loan: boolean, rng: Rng): Offer {
  const league = LEAGUE_BY_ID[club.leagueId]
  const role = projectRole(player.ovr, club.strength, player.age)
  const continental =
    !!league.continental &&
    league.euroSpots > 0 &&
    (club.tier === 1 ? rng.chance(0.88) : club.tier === 2 ? rng.chance(0.5) : rng.chance(0.12))
  return { club, loan, projectedRole: role, continental }
}

export function generateOffers(
  player: Player,
  last: SeasonRecord | null,
  rng: Rng,
  /** what answering the club's season objective was worth, in rating points */
  swing = 0,
  /** clubs already played for, so a homecoming is a move the market can make */
  pastClubs?: Set<string>,
): Offer[] {
  if (player.age >= 41) return []
  const level = marketLevel(player, last, swing)
  const current = CLUB_BY_ID[player.clubId]

  const candidates = CLUBS.filter((c) => c.id !== current.id)
    .map((club) => {
      const dist = club.strength - level
      // Clubs below your level always want you; interest falls away above it.
      let interest = dist <= 0 ? 1 : Math.exp(-Math.pow(dist / 6, 2))
      if (player.age <= 21) interest *= 1 + (player.potMax - player.ovr) * 0.04
      // Nobody drops five divisions for no reason.
      if (dist < -16) interest *= 0.05
      interest *= transferAffinity(current, club, player, level, pastClubs)
      return { club, dist, interest }
    })
    .filter((c) => c.interest > 0.02)

  const sample = (pool: typeof candidates, count: number, taken: Set<string>): Club[] => {
    const out: Club[] = []
    const bag = pool.filter((c) => !taken.has(c.club.id))
    for (let i = 0; i < count && bag.length; i++) {
      const total = bag.reduce((s, c) => s + c.interest, 0)
      let roll = rng.next() * total
      let idx = 0
      while (idx < bag.length - 1 && (roll -= bag[idx].interest) > 0) idx++
      const chosen = bag.splice(idx, 1)[0]
      taken.add(chosen.club.id)
      out.push(chosen.club)
    }
    return out
  }

  const taken = new Set<string>()
  const picked: Club[] = []

  /*
   * Nobody else wanting you is not the same thing as being finished.
   *
   * The market used to hand back an empty window the moment no other club was
   * interested, and an empty window ends a career on the spot: a nineteen year
   * old at a club perfectly happy to keep him would simply stop existing. So
   * the drawing of other clubs is skipped when there are none to draw, and the
   * club he is already at still gets to make its offer below.
   */
  if (candidates.length) {
    const stepUp = candidates.filter((c) => c.dist > 2.5)
    const lateral = candidates.filter((c) => c.dist <= 2.5 && c.dist >= -3.5)
    const stepDown = candidates.filter((c) => c.dist < -3.5)

    picked.push(
      ...sample(stepUp, 2, taken),
      ...sample(lateral, 2, taken),
      ...sample(stepDown, 1, taken),
    )
    if (picked.length < 4) picked.push(...sample(candidates, 4 - picked.length, taken))

    // The nearest realistic move should always be on the table: a player in
    // the 3. Liga must be able to see a 2. Bundesliga club, even on an
    // unlucky draw.
    const homeCountry = LEAGUE_BY_ID[current.leagueId].country
    if (!picked.some((c) => LEAGUE_BY_ID[c.leagueId].country === homeCountry)) {
      const domestic = candidates.filter(
        (c) => LEAGUE_BY_ID[c.club.leagueId].country === homeCountry,
      )
      const [replacement] = sample(domestic, 1, taken)
      if (replacement) picked[picked.length - 1] = replacement
    }
  }

  const offers = picked.map((club) => offerFor(club, player, false, rng))

  const stayRole = projectRole(player.ovr, current.strength, player.age)
  // A club keeps a player it can still use, and it always keeps a young one.
  // The last clause is what stops a quiet career being deleted rather than
  // played out: with nothing else on the table, staying is the career.
  if (stayRole !== 'Benchwarmer' || player.age <= 21 || offers.length === 0) {
    offers.unshift(offerFor(current, player, false, rng))
  }

  const wastingAway =
    player.age <= 21 && (stayRole === 'Squad player' || stayRole === 'Benchwarmer')
  if (wastingAway) {
    const loanPool = candidates.filter((c) => c.dist < -2 && c.dist > -14)
    for (const club of sample(loanPool, 2, taken)) {
      offers.push(offerFor(club, player, true, rng))
    }
  }

  return offers.sort((a, b) => b.club.strength - a.club.strength)
}

/** Accepts an offer and moves the career into the next season. */
export function acceptOffer(career: Career, offer: Offer, terms?: Terms): Career {
  const player = { ...career.player }
  if (offer.loan) {
    player.parentClubId = player.clubId
    player.clubId = offer.club.id
    player.onLoan = true
  } else {
    player.clubId = offer.club.id
    player.onLoan = false
    player.parentClubId = null
  }
  player.value = marketValue(player, offer.club)

  const next: Career = {
    ...career,
    player,
    season: career.season + 1,
    offers: [],
    phase: 'season',
    runLeft: 0,
  }

  // A detailed move is also a signing and a new dressing room. Staying put on
  // the same deal keeps both: only a move, or terms actually chosen, changes
  // the paperwork.
  if (isDetailed(career)) {
    const rng = new Rng(career.seed ^ (career.season * 40503))
    const moved = offer.club.id !== career.player.clubId
    if (terms) {
      next.contract = contracts.sign(terms, offer.club, career.season + 1)
    } else if (moved) {
      const chosen = contracts.offerTerms(player, offer.club, offer.projectedRole, rng)[0]
      next.contract = contracts.sign(chosen, offer.club, career.season + 1)
    }
    if (moved) {
      const nation = NATIONS_BY_NAME[player.nation] ?? NATIONS_BY_NAME.Germany
      next.room = staff.newRoom(
        career.season + 1,
        offer.club.strength,
        rng,
        nation.name,
        nation.conf,
      )
      next.promiseBroken = false
    }
  }
  return next
}

/** The terms a club will put on the table for an offer already on it. */
export function termsFor(career: Career, offer: Offer): Terms[] {
  const rng = new Rng(career.seed ^ (offer.club.id.length * 7919) ^ (career.season * 13))
  const terms = contracts.offerTerms(career.player, offer.club, offer.projectedRole, rng)
  // Nobody has to pay a fee for a player whose deal ran out, so the wages go up.
  if (contracts.yearsLeft(career.contract ?? null, career.season) === 0) {
    return terms.map((t) => ({ ...t, wage: contracts.freeAgentBump(t.wage) }))
  }
  return terms
}

export function retire(career: Career): Career {
  return {
    ...career,
    player: { ...career.player, retired: true },
    offers: [],
    phase: 'retired',
    runLeft: 0,
  }
}

/** The game nudges you towards hanging up the boots — it never forces it early. */
export function retirementHint(career: Career): RetirementReason | null {
  const { player, lastSeason } = career
  if (player.age >= 40) return 'forced'
  if (player.age < 33) return null
  if (lastSeason && lastSeason.apps < 10) return 'bench'
  if (player.ovr < 62) return 'legs'
  if (player.age >= 36) return 'borrowed'
  return null
}

// ---------------------------------------------------------------------------
// career totals
// ---------------------------------------------------------------------------

export interface CareerTotals {
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  natApps: number
  natGoals: number
  natAssists: number
  peakOvr: number
  clubs: number
}

export function totals(career: Career): CareerTotals {
  const t: CareerTotals = {
    apps: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    natApps: 0,
    natGoals: 0,
    natAssists: 0,
    peakOvr: 0,
    clubs: 0,
  }
  const clubIds = new Set<string>()
  for (const s of career.history) {
    t.apps += s.apps
    t.goals += s.goals
    t.assists += s.assists
    t.cleanSheets += s.cleanSheets + s.natCleanSheets
    t.natApps += s.natApps
    t.natGoals += s.natGoals
    t.natAssists += s.natAssists
    t.peakOvr = Math.max(t.peakOvr, s.ovrEnd)
    if (!s.banned) clubIds.add(s.clubId)
  }
  t.clubs = clubIds.size
  return t
}

/*
 * The one-number version of a career lives in `legacy.ts`, next to the six
 * things it is made of. It is not re-exported from here on purpose: a score
 * that can be imported from two places ends up meaning two things.
 */

/** Per-club breakdown for the end-of-career screen. */
export interface ClubSpell {
  club: Club
  apps: number
  goals: number
  assists: number
  cleanSheets: number
  trophies: number
  seasons: number
}

export function clubSpells(career: Career): ClubSpell[] {
  const map = new Map<string, ClubSpell>()
  for (const s of career.history) {
    if (s.banned) continue
    const club = CLUB_BY_ID[s.clubId]
    if (!club) continue
    const spell = map.get(s.clubId) ?? {
      club,
      apps: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      trophies: 0,
      seasons: 0,
    }
    spell.apps += s.apps
    spell.goals += s.goals
    spell.assists += s.assists
    spell.cleanSheets += s.cleanSheets
    spell.trophies += s.trophies.filter((tr) => tr.wonWith === club.name).length
    spell.seasons += 1
    map.set(s.clubId, spell)
  }
  return [...map.values()].sort((a, b) => b.apps - a.apps)
}

export { leagueGamesOf }
