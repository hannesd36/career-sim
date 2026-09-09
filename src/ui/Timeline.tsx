import { greatestMoment, highlightsOf, type Highlight } from '../engine/highlights'
import { legacyOf, type LegacyPart } from '../engine/legacy'
import type { Career, TrophyId } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { seasonLabel } from './bits'

/** The loudest handful. Everything else in a career is a table row. */
const LOUD = new Set<Highlight['id']>([
  'worldcup',
  'ballondor',
  'continental',
  'peak',
  'first-trophy',
])

/**
 * A career as the six or eight years it was actually about.
 *
 * The age is the left hand column because that is how a career is talked
 * about: not "in 2033" but "at twenty-nine". The line beside it is one
 * sentence, and the ones that would be in the first paragraph of an obituary
 * are the only ones allowed to be loud.
 */
export function CareerTimeline({ career, limit = 9 }: { career: Career; limit?: number }) {
  const rows = highlightsOf(career, limit)
  if (!rows.length) return null
  return (
    <ol className="timeline">
      {rows.map((h) => (
        <li className={`tl${LOUD.has(h.id) ? ' tl--loud' : ''}`} key={`${h.season}-${h.id}`}>
          <span className="tl-age">{h.age}</span>
          <span className="tl-what">
            <HighlightLine highlight={h} />
          </span>
          <span className="tl-season">{seasonLabel(h.season)}</span>
        </li>
      ))}
    </ol>
  )
}

/** One highlight, as a sentence in the reader's own language. */
export function HighlightLine({ highlight }: { highlight: Highlight }) {
  const { t, trophyShort } = useI18n()
  const params: Record<string, string | number> = { ...highlight.params }
  if (typeof params.trophy === 'string') params.trophy = trophyShort(params.trophy as TrophyId)
  return <>{t(`hl.${highlight.id}` as StringKey, params)}</>
}

/**
 * The one line the career would be remembered by. Absent rather than padded
 * when a career never did anything worth naming: an empty cabinet is a fact
 * about the career, and inventing a sentence for it would be a lie.
 */
export function GreatestMoment({ career }: { career: Career }) {
  const { t } = useI18n()
  const moment = greatestMoment(career)
  if (!moment) return null
  return (
    <div className="greatest">
      <span className="greatest-k">{t('recap.greatest')}</span>
      <strong className="greatest-what">
        <HighlightLine highlight={moment} />
      </strong>
      <span className="greatest-when">{seasonLabel(moment.season)}</span>
    </div>
  )
}

/**
 * The score, and the six things it is made of.
 *
 * A single number nobody can take apart is a number nobody trusts. The bars
 * under it are not decoration: they say which half of the career the score
 * came from, which is the difference between "you were rated highly" and "you
 * won things".
 */
export function LegacyBlock({ career, compact = false }: { career: Career; compact?: boolean }) {
  const { t, num } = useI18n()
  const legacy = legacyOf(career)
  const top = Math.max(1, ...legacy.parts.map((p) => p.points))

  return (
    <div className={`legacyscore${compact ? ' legacyscore--compact' : ''}`}>
      <div className="legacyscore-head">
        <span className="legacyscore-k">{t('legacy.score')}</span>
        <span className="legacyscore-num" key={legacy.total}>
          {num(legacy.total)}
        </span>
        <span className="legacyscore-tier">{t(`legacy.tier.${legacy.tier}` as StringKey)}</span>
      </div>
      {!compact && (
        <div className="legacyscore-parts">
          {legacy.parts.map((part) => (
            <LegacyRow key={part.id} part={part} top={top} />
          ))}
        </div>
      )}
    </div>
  )
}

function LegacyRow({ part, top }: { part: LegacyPart; top: number }) {
  const { t, num } = useI18n()
  return (
    <div className="legacypart">
      <span className="legacypart-k">{t(`legacy.part.${part.id}` as StringKey)}</span>
      <span className="legacypart-bar" aria-hidden="true">
        <i style={{ width: `${Math.round((part.points / top) * 100)}%` }} />
      </span>
      <span className="legacypart-n">{num(part.points)}</span>
    </div>
  )
}
