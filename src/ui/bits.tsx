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
 * Eleven trophies, eleven drawings.
 *
 * They used to share five silhouettes, which meant a league title, a cup and a
 * European cup were the same picture: the cabinet said how much you had won
 * but never what. Each one is now its own shape, recognisable at thirteen
 * pixels, and each is a *type* of trophy rather than a copy of a real one — a
 * plate, a cup with handles, a cup with tall ears, a figure holding a globe.
 *
 * They are drawn in the current text colour, with a second path at reduced
 * opacity carrying the shading, so a trophy sits in a cabinet, a table row or
 * a note without ever needing a colour the palette does not have.
 */
interface Art {
  /** the silhouette */
  d: string
  /** highlights and shadow, drawn over it at low opacity */
  detail?: string
}

const TROPHY_ART: Record<TrophyId, Art> = {
  // a broad flat plate on a foot: the shield you hold above your head
  league: {
    d: 'M12 2c4.4 0 8 1.6 8 3.6S16.4 9.2 12 9.2 4 7.6 4 5.6 7.6 2 12 2m0 1.8c-3.2 0-5.6 1-5.6 1.8S8.8 7.4 12 7.4s5.6-1 5.6-1.8S15.2 3.8 12 3.8M11 10.4h2v6.4h-2zM7 18h10a1 1 0 0 1 1 1v2H6v-2a1 1 0 0 1 1-1',
    detail: 'M8.6 4.6c.8-.4 2-.6 3.4-.6v1.4c-1.2 0-2.2.1-2.8.4z',
  },
  // a two-handled cup: the domestic knockout
  cup: {
    d: 'M7 2h10v5.2a5 5 0 0 1-4 4.9v2.7h2.4a1 1 0 0 1 0 2H13v1.4h3.4a1 1 0 0 1 0 2H7.6a1 1 0 0 1 0-2H11v-1.4H8.6a1 1 0 0 1 0-2H11v-2.7A5 5 0 0 1 7 7.2zM5.4 3.4h1.2v4.2A3.4 3.4 0 0 1 5 4.8zm12 0h1.2v1.4a3.4 3.4 0 0 1-1.6 2.8z',
    detail: 'M9 3.6h1.6v3.8H9z',
  },
  // tall ears and a deep bowl: the continental cup
  continental: {
    d: 'M8 2h8v2.4c0 4-1.4 6.6-3 7.6v2.6h2.6a1 1 0 0 1 0 2H13v1.6h3.6a1 1 0 0 1 0 2H7.4a1 1 0 0 1 0-2H11v-1.6H8.4a1 1 0 0 1 0-2H11v-2.6C9.4 11 8 8.4 8 4.4zM6.6 3.2c-2 .6-3 2-2.6 3.6.4 1.4 1.8 2.2 3.4 2.2V7.2c-.8 0-1.4-.3-1.6-.9-.2-.6.2-1.1 1-1.4zm10.8 0v1.7c.8.3 1.2.8 1 1.4-.2.6-.8.9-1.6.9V9c1.6 0 3-.8 3.4-2.2.4-1.6-.6-3-2.6-3.6z',
    detail: 'M10 3.6h1.4v6.2c-.9-.9-1.4-2.6-1.4-5.4z',
  },
  // a figure holding up a globe: the world
  worldcup: {
    d: 'M12 2a3.2 3.2 0 0 1 3.2 3.2c0 1.3-.8 2.4-1.9 2.9l.9 5.5a10 10 0 0 1-4.4 0l.9-5.5A3.2 3.2 0 0 1 12 2m0 1.9a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6M9 15.2h6c.5 1.3 1.4 2.2 2.6 2.7v.7H6.4v-.7c1.2-.5 2.1-1.4 2.6-2.7M5.6 19.8h12.8a1 1 0 0 1 1 1v1.2H4.6v-1.2a1 1 0 0 1 1-1',
    detail: 'M10.4 8.9h1.2l-.7 4.4h-1.2z',
  },
  // a laurel around a low bowl: the continental title
  continentalnation: {
    d: 'M9 9h6v1.8a3 3 0 0 1-2 2.8v2.2h2.4a1 1 0 0 1 0 2H8.6a1 1 0 0 1 0-2H11v-2.2a3 3 0 0 1-2-2.8zM8 19.6h8a1 1 0 0 1 1 1v1.2H7v-1.2a1 1 0 0 1 1-1M6.4 2.4c2 .6 3.4 2.2 3.8 4.4l-1.8.4C8.1 5.7 7.3 4.7 6 4.2zm11.2 0 .4 1.8c-1.3.5-2.1 1.5-2.4 3l-1.8-.4c.4-2.2 1.8-3.8 3.8-4.4M12 3.4a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8',
  },
  // a ball on a plinth: the individual award
  ballondor: {
    d: 'M12 1.8a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8m0 1.9-2.6 1.9 1 3h3.2l1-3zm-4.2 3.1a3.5 3.5 0 0 0 .8 3.1l1.4-1zm8.4 0-2.2 2.1 1.4 1a3.5 3.5 0 0 0 .8-3.1M10.2 11l1.1.9h1.4l1.1-.9a3.5 3.5 0 0 1-3.6 0M11 13.6h2v3.6h-2zM7.6 18.6h8.8a1 1 0 0 1 1 1v2.4H6.6v-2.4a1 1 0 0 1 1-1',
    detail: 'M8.8 20.2h6.4v.8H8.8z',
  },
  // a boot, studs down: the scorer
  goldenboot: {
    d: 'M3 6.4h4.8c.5 0 .9.3 1.1.8l1 2.6 4.3.7 4.9 1.8a3.4 3.4 0 0 1 2.2 3.2v2.1H3zM3.4 20h17.2v2.2H3.4z',
    detail: 'M14.2 12.6 15 15h1.9l-.8-2.4zM10 11.4l.7 2.2h1.9l-.7-2.2z',
  },
  // a boot with a wing: the one who makes them
  playmaker: {
    d: 'M5 8.6h4.4c.5 0 .9.3 1.1.8l.9 2.4 3.9.6 4.4 1.6a3.1 3.1 0 0 1 2 2.9v1.9H5zM5.4 19.6h16.2v2.1H5.4zM2.2 3.4l6 2.6-6 1.2 2-1.9zM9.8 2l2.6 3.4-3.2-.6L9 3.6z',
  },
  // a keeper's glove, fingers spread
  goldenglove: {
    d: 'M7.4 6.2a1.5 1.5 0 0 1 1.5 1.5v2.6h.8V4.1a1.5 1.5 0 0 1 3 0v6.2h.8V5.3a1.5 1.5 0 0 1 3 0v5h.8V7.6a1.5 1.5 0 0 1 3 0v7.2a6.6 6.6 0 0 1-6.6 6.6h-1.8A6.6 6.6 0 0 1 5 14.8v-5a1.5 1.5 0 0 1 2.4-1.2z',
    detail: 'M8.4 13.4h7.8v1.6H8.4zM8.4 16.4h7.8V18H8.4z',
  },
  // a star over a young shoot: the best of the kids
  goldenboy: {
    d: 'M12 1.6 14.2 7l5.8.5-4.4 3.8 1.3 5.6L12 13.9l-4.9 3 1.3-5.6L4 7.5 9.8 7zM11 17.4h2V22h-2zM10.8 18.6c0 1-.7 1.8-2.2 2.2-.3-1.6.3-2.6 2.2-2.2m2.4 0c1.9-.4 2.5.6 2.2 2.2-1.5-.4-2.2-1.2-2.2-2.2',
  },
  // a shield with eleven: the team of the season
  tots: {
    d: 'M12 1.8 21 4v7.4c0 5-3.6 9.2-9 10.8-5.4-1.6-9-5.8-9-10.8V4zm0 2.1L5 5.6v5.8c0 3.9 2.7 7.2 7 8.7 4.3-1.5 7-4.8 7-8.7V5.6z',
    detail: 'M9.2 8.4h1.6v7.2H9.2zM12.8 8.4h1.6v7.2h-1.6zM7.8 8.4h1.4v1.4H7.8zM11.4 8.4h1.4v1.4h-1.4z',
  },
}

export function TrophyIcon({ id, size = 14 }: { id: TrophyId; size?: number }) {
  const art = TROPHY_ART[id] ?? TROPHY_ART.cup
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={art.d} />
      {art.detail && <path d={art.detail} opacity="0.45" />}
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
