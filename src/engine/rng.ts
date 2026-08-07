/**
 * Seeded RNG so a career can be replayed from its seed.
 * mulberry32 — small, fast, good enough for a game.
 */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** integer in [min, max] */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** Box-Muller, clamped at ±3σ so freak results stay believable. */
  gauss(mean = 0, sd = 1): number {
    const u = Math.max(this.next(), 1e-9)
    const v = this.next()
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    return mean + sd * Math.max(-3, Math.min(3, z))
  }

  /** Draws a count from a per-event probability, e.g. goals from chances. */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0
    // Normal approximation for large lambda keeps this cheap.
    if (lambda > 25) return Math.max(0, Math.round(this.gauss(lambda, Math.sqrt(lambda))))
    const limit = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= this.next()
    } while (p > limit)
    return k - 1
  }

  shuffle<T>(arr: T[]): T[] {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
