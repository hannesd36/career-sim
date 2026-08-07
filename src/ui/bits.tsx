import { flagUrl } from '../data/nations'
import { RARITY_ORDER, rarityClass, rarityOf } from '../engine/rarity'
import type { Career, Club, SquadRole, TrophyId } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

// --------------------------------------------------------------- club marks

function initials(name: string) {
  const words = name
    .replace(/^(FC|AC|AS|SS|CD|UD|SV|VfB|VfL|TSV|SC)\s+/i, '')
    // founding years and squad numbers make terrible initials ("Mainz 05" -> "M0")
    .split(/\s+/)
    .filter((w) => !/^\d+$/.test(w))
  if (!words.length) return name.slice(0, 2).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function Crest({
  club,
  size = 'sm',
  /** the identity and the play bar carry theirs from the first paint; a table
      of twenty does not need to */
  eager = false,
}: {
  club: Pick<Club, 'name' | 'badge'>
  size?: 'sm' | 'lg'
  eager?: boolean
}) {
  const cls = size === 'lg' ? ' crest--lg' : ''
  if (!club.badge) {
    return (
      <span className={`crest-fallback${cls}`} title={club.name}>
        {initials(club.name)}
      </span>
    )
  }
  return (
    <img
      className={`crest${cls}`}
      src={club.badge}
      alt=""
      title={club.name}
      loading={eager ? 'eager' : 'lazy'}
    />
  )
}

export function Flag({ code, title }: { code: string; title?: string }) {
  return <img className="flagimg" src={flagUrl(code)} alt="" title={title} loading="lazy" />
}

// -------------------------------------------------------------- the rating

/**
 * The rating set as a monument rather than a badge: a numeral, a rule in the
 * colour of the tier it belongs to, and a six-notch ladder that shows how much
 * of the game is still above you. Remounting on every change (`key`) replays
 * the entrance, so a rating that moved says so.
 */
export function Grade({ ovr, size = 'lg' }: { ovr: number; size?: 'lg' | 'md' | 'sm' }) {
  const { t } = useI18n()
  const tier = rarityOf(ovr)
  const reached = RARITY_ORDER.indexOf(tier)

  return (
    <div className={`grade grade--${size} ${rarityClass(ovr)}`}>
      <span className="grade-num" key={ovr}>
        {ovr}
      </span>
      <span className="grade-rule" />
      <span className="grade-foot">
        <span className="grade-tier">{t(`rar.${tier}` as StringKey)}</span>
        <span className="grade-ladder" aria-hidden="true">
          {RARITY_ORDER.map((r, i) => (
            <i key={r} className={i <= reached ? 'on' : undefined} />
          ))}
        </span>
      </span>
    </div>
  )
}

/** The same idea at table size: a number underlined in its tier. */
export function TierNum({ value }: { value: number }) {
  return <span className={`tier-num ${rarityClass(value)}`}>{value}</span>
}

/**
 * A career only ever spends one currency, and this is what it looks like.
 * Every decision, every season and every final reports in the same signed
 * number, so two options can be compared without reading a word.
 */
export function Delta({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  return (
    <span className={`delta delta--${dir}${size === 'lg' ? ' delta--lg' : ''}`}>
      {value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0'}
    </span>
  )
}

// --------------------------------------------------------------- trophies

/**
 * Trophies are drawn as silhouettes in the current text colour. Eleven tinted
 * icons would be eleven colours the palette does not have, and the shape
 * already says which trophy it is.
 */
const TROPHY_SHAPE: Record<TrophyId, 'cup' | 'ball' | 'glove' | 'star' | 'boot'> = {
  league: 'cup',
  cup: 'cup',
  continental: 'cup',
  worldcup: 'cup',
  continentalnation: 'cup',
  ballondor: 'ball',
  goldenboot: 'boot',
  playmaker: 'star',
  goldenglove: 'glove',
  goldenboy: 'star',
  tots: 'star',
}

const SHAPES: Record<string, string> = {
  cup: 'M6 3h12v3a6 6 0 0 1-3.2 5.3l-.3.2v2.5h2.5a1 1 0 0 1 0 2h-2.5v1.5h3a1 1 0 0 1 0 2H8.5a1 1 0 0 1 0-2h3V16H9a1 1 0 0 1 0-2h2.5v-2.5l-.3-.2A6 6 0 0 1 8 6zM4 5h2v3a4 4 0 0 1-2-3.4zm14 0h2v-.4A4 4 0 0 1 18 8z',
  ball: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 3.2 3.4 2.5-1.3 4h-4.2l-1.3-4zM6.4 8.9l1.3 3.9-3 2.1A8 8 0 0 1 6.4 8.9m11.2 0a8 8 0 0 1 1.7 6l-3-2.1zM9.6 18l1.2-1h2.4l1.2 1-.9 2.5a8 8 0 0 1-3 0z',
  glove: 'M8 3a2 2 0 0 1 2 2v5h1V4a2 2 0 0 1 4 0v6h1V6a2 2 0 0 1 4 0v9a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6V9a2 2 0 0 1 3-1.7V5a2 2 0 0 1 0 0z',
  star: 'M12 2.5 15 9l7 .9-5.1 4.7 1.3 6.9L12 18.2 5.8 21.5l1.3-6.9L2 9.9 9 9z',
  boot: 'M3 7h5.5l1.2 3.2L14 11l6 2.2a3 3 0 0 1 2 2.8V19H3zM3 20h19v2H3z',
}

export function TrophyIcon({ id, size = 14 }: { id: TrophyId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={SHAPES[TROPHY_SHAPE[id] ?? 'cup']} />
    </svg>
  )
}

// ------------------------------------------------------------------- misc

export type Stage = 'unknown' | 'emerging' | 'established' | 'prime' | 'veteran' | 'legacy'

/**
 * Where a career currently sits, read straight off age and whether it is over.
 * Nothing is invented here: the spine and a handful of accents key off it so a
 * sixteen year old and a thirty-two year old do not look identical.
 */
export function careerStage(career: Career): Stage {
  if (career.player.retired || career.phase === 'retired') return 'legacy'
  const age = career.player.age
  if (age < 18) return 'unknown'
  if (age < 21) return 'emerging'
  if (age < 25) return 'established'
  if (age < 30) return 'prime'
  return 'veteran'
}

export function roleClass(role: SquadRole): string {
  switch (role) {
    case 'Key player':
      return 'tag--role-key'
    case 'Starter':
      return 'tag--role-starter'
    default:
      return ''
  }
}

export function formatValue(v: number, lang: 'en' | 'de' = 'en'): string {
  const dec = (n: number) => {
    const s = n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '')
    return lang === 'de' ? s.replace('.', ',') : s
  }
  if (v >= 1_000_000) return `${dec(v / 1_000_000)}${lang === 'de' ? ' Mio. €' : 'M €'}`
  if (v >= 1000) return `${Math.round(v / 1000)} ${lang === 'de' ? 'Tsd. €' : 'K €'}`
  return `${v} €`
}

/** The shape of a career, which the ledger answers slowly and a line answers at once. */
export function Arc({ values, height = 68 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null
  const W = 600
  const pad = 5
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1)
  const x = (i: number) => (i / (values.length - 1)) * (W - pad * 2) + pad
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const line = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(' ')
  const peak = values.indexOf(max)

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(peak)} cy={y(max)} r="4" fill="var(--flood)" />
    </svg>
  )
}

/** 2026 -> "2026/27" */
export function seasonLabel(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

export function ordinal(n: number, lang: 'en' | 'de' = 'en'): string {
  if (lang === 'de') return `${n}.`
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
