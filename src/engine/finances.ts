import { Rng, clamp } from './rng'

/**
 * What the money does once it has been earned.
 *
 * Everything here is in thousands of euros. The rule the whole file follows:
 * spending buys a *chance* or a *small edge*, never a guarantee, and never
 * enough to make money the way you get good. A rich bad player is still bad.
 */

export type SpendId = 'coach' | 'physio' | 'nutrition' | 'agent' | 'family' | 'invest'

export interface Spend {
  id: SpendId
  /** thousands a season, charged every season it stays on */
  cost: number
  recurring: boolean
}

export interface Finances {
  /** everything ever earned, thousands */
  earned: number
  /** what is left */
  balance: number
  /** the standing arrangements, by id */
  on: SpendId[]
  /** thousands put into investments */
  invested: number
  /** what the investments have returned so far, can be negative */
  returns: number
}

export const SPENDS: Spend[] = [
  { id: 'coach', cost: 260, recurring: true },
  { id: 'physio', cost: 200, recurring: true },
  { id: 'nutrition', cost: 120, recurring: true },
  { id: 'agent', cost: 300, recurring: true },
  { id: 'family', cost: 150, recurring: true },
]

export const SPEND_BY_ID: Record<SpendId, Spend | undefined> = Object.fromEntries(
  SPENDS.map((s) => [s.id, s]),
) as Record<SpendId, Spend | undefined>

export function emptyFinances(): Finances {
  return { earned: 0, balance: 0, on: [], invested: 0, returns: 0 }
}

export function has(finances: Finances | undefined, id: SpendId): boolean {
  return Boolean(finances?.on.includes(id))
}

/** Turning something on, if it can be afforded. */
export function toggle(finances: Finances, id: SpendId): Finances {
  const on = finances.on.includes(id)
    ? finances.on.filter((s) => s !== id)
    : [...finances.on, id]
  return { ...finances, on }
}

/** What the standing arrangements cost for one season. */
export function upkeep(finances: Finances): number {
  return finances.on.reduce((sum, id) => sum + (SPEND_BY_ID[id]?.cost ?? 0), 0)
}

/**
 * A season's books: wages in, upkeep out, and whatever the investments did.
 *
 * Arrangements that cannot be paid for are dropped rather than allowed to run
 * the balance negative, and the caller is told which ones went so it can say so.
 */
export function settleSeason(
  finances: Finances,
  earnings: number,
  rng: Rng,
): { finances: Finances; dropped: SpendId[]; investmentReturn: number } {
  let balance = finances.balance + earnings
  const earned = finances.earned + earnings

  // Investments move before the bills, so a bad year can genuinely hurt.
  let investmentReturn = 0
  if (finances.invested > 0) {
    // Roughly six percent a year, with real years where it goes backwards.
    const rate = rng.gauss(0.06, 0.14)
    investmentReturn = Math.round(finances.invested * rate * 10) / 10
  }

  let on = [...finances.on]
  const dropped: SpendId[] = []
  let bill = on.reduce((sum, id) => sum + (SPEND_BY_ID[id]?.cost ?? 0), 0)

  // Drop the most expensive first until the bill can be met.
  while (bill > balance && on.length) {
    const worst = [...on].sort(
      (a, b) => (SPEND_BY_ID[b]?.cost ?? 0) - (SPEND_BY_ID[a]?.cost ?? 0),
    )[0]
    on = on.filter((s) => s !== worst)
    dropped.push(worst)
    bill = on.reduce((sum, id) => sum + (SPEND_BY_ID[id]?.cost ?? 0), 0)
  }

  balance = Math.round((balance - bill) * 10) / 10

  return {
    finances: {
      earned: Math.round(earned * 10) / 10,
      balance,
      on,
      invested: finances.invested,
      returns: Math.round((finances.returns + investmentReturn) * 10) / 10,
    },
    dropped,
    investmentReturn,
  }
}

/** Moving money into or out of investments. */
export function invest(finances: Finances, amount: number): Finances {
  const moved = clamp(Math.round(amount), -finances.invested, Math.floor(finances.balance))
  return {
    ...finances,
    balance: Math.round((finances.balance - moved) * 10) / 10,
    invested: finances.invested + moved,
  }
}

/**
 * What the arrangements are worth, read by the season that is about to be
 * played. Small numbers on purpose.
 */
export interface Perks {
  /** multiplies the chance of picking up an injury */
  injury: number
  /** extra rating growth over a season */
  growth: number
  /** multiplies how fast an injury heals */
  recovery: number
  /** more clubs come looking in the summer */
  offers: number
  /** how much the private life steadies a bad run */
  settled: number
}

export function perksOf(finances: Finances | undefined): Perks {
  const on = finances?.on ?? []
  return {
    injury: (on.includes('physio') ? 0.72 : 1) * (on.includes('nutrition') ? 0.88 : 1),
    growth: (on.includes('coach') ? 0.5 : 0) + (on.includes('nutrition') ? 0.15 : 0),
    recovery: on.includes('physio') ? 0.75 : 1,
    offers: on.includes('agent') ? 1.5 : 0,
    settled: on.includes('family') ? 1 : 0,
  }
}

/** Prints as millions once the numbers stop being weekly-wage sized. */
export function money(thousands: number): { value: number; unit: 'k' | 'm' } {
  if (Math.abs(thousands) >= 1000) {
    return { value: Math.round(thousands / 100) / 10, unit: 'm' }
  }
  return { value: Math.round(thousands * 10) / 10, unit: 'k' }
}
