/**
 * Card tiers, in the shape players already know from FIFA: your rating is not
 * just a number, it is a material. Crossing 75 or 90 should feel like an event
 * in itself, which is why the thresholds are hard edges rather than a gradient.
 */
export type Rarity = 'bronze' | 'silver' | 'gold' | 'rare' | 'platinum' | 'ultimate'

export const RARITY_ORDER: Rarity[] = ['bronze', 'silver', 'gold', 'rare', 'platinum', 'ultimate']

export function rarityOf(ovr: number): Rarity {
  if (ovr >= 99) return 'ultimate'
  if (ovr >= 90) return 'platinum'
  if (ovr >= 85) return 'rare'
  if (ovr >= 75) return 'gold'
  if (ovr >= 65) return 'silver'
  return 'bronze'
}

/** Lowest rating that still belongs to the tier — used for "N to go" hints. */
export const RARITY_FLOOR: Record<Rarity, number> = {
  bronze: 0,
  silver: 65,
  gold: 75,
  rare: 85,
  platinum: 90,
  ultimate: 99,
}

export function nextRarity(r: Rarity): Rarity | null {
  const i = RARITY_ORDER.indexOf(r)
  return i >= 0 && i < RARITY_ORDER.length - 1 ? RARITY_ORDER[i + 1] : null
}

/** Points still needed to reach the next tier, or null at the top. */
export function pointsToNextRarity(ovr: number): { rarity: Rarity; points: number } | null {
  const next = nextRarity(rarityOf(ovr))
  if (!next) return null
  return { rarity: next, points: RARITY_FLOOR[next] - ovr }
}

/**
 * Colour is carried by CSS classes rather than inline styles, because the
 * higher tiers need shimmer and glow layers that a single background cannot do.
 */
export const rarityClass = (ovr: number) => `rar-${rarityOf(ovr)}`

/** Flat colour for places that cannot take a gradient — charts, chart strokes. */
export const RARITY_INK: Record<Rarity, string> = {
  bronze: '#c98b5e',
  silver: '#c9d0d8',
  gold: '#f0c14b',
  rare: '#ffd76e',
  platinum: '#8fe6ff',
  ultimate: '#ff8bf0',
}
