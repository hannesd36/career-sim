import { useState } from 'react'
import {
  ATTRS_BY_FACET,
  attrsFor,
  facetSummary,
  facetsFor,
  standout,
  type AttrId,
  type Facet,
} from '../engine/attributes'
import { isDetailed, type Career } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

/** Where a number sits on the scale, for the colour band behind it. */
function band(value: number): string {
  if (value >= 85) return 'at--elite'
  if (value >= 75) return 'at--strong'
  if (value >= 62) return 'at--fair'
  return 'at--weak'
}

/**
 * The shape under the rating.
 *
 * Shows the six facet averages by default and the full set on demand, because
 * twenty nine numbers is what the detailed mode promised but not what anybody
 * wants to read every summer.
 */
export function AttributePanel({ career }: { career: Career }) {
  const { t, num } = useI18n()
  const [open, setOpen] = useState(false)
  const attrs = career.player.attributes
  if (!isDetailed(career) || !attrs) return null

  const position = career.player.position
  const summary = facetSummary(attrs, position)
  const { best, worst } = standout(attrs, position)

  return (
    <section className="attrs">
      <div className="attrs-head">
        <h3>{t('attr.title')}</h3>
        <button type="button" className="act act--quiet act--small" onClick={() => setOpen(!open)}>
          {open ? t('attr.hide') : t('attr.all')}
        </button>
      </div>

      <div className="attr-facets">
        {summary.map((row) => (
          <div key={row.facet} className={`attr-facet ${band(row.value)}`}>
            <span className="attr-facet-name">{t(`facet.${row.facet}` as StringKey)}</span>
            <b className="attr-facet-val">{num(row.value)}</b>
            <span className="attr-bar">
              <i style={{ width: `${row.value}%` }} />
            </span>
          </div>
        ))}
      </div>

      {!open && (
        <div className="attr-standout">
          <div>
            <span className="attr-standout-label">{t('attr.best')}</span>
            {best.map((id) => (
              <AttrChip key={id} id={id} value={attrs[id] ?? 0} />
            ))}
          </div>
          <div>
            <span className="attr-standout-label">{t('attr.worst')}</span>
            {worst.map((id) => (
              <AttrChip key={id} id={id} value={attrs[id] ?? 0} />
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="attr-full">
          {facetsFor(position).map((facet) => {
            const ids = ATTRS_BY_FACET[facet].filter((id) => attrsFor(position).includes(id))
            if (!ids.length) return null
            return (
              <div key={facet} className="attr-group">
                <h4>{t(`facet.${facet}` as StringKey)}</h4>
                {ids.map((id) => (
                  <div key={id} className={`attr-row ${band(attrs[id] ?? 0)}`}>
                    <span>{t(`at.${id}` as StringKey)}</span>
                    <b>{num(attrs[id] ?? 0)}</b>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function AttrChip({ id, value }: { id: AttrId; value: number }) {
  const { t, num } = useI18n()
  return (
    <span className={`attr-chip ${band(value)}`}>
      {t(`at.${id}` as StringKey)} <b>{num(value)}</b>
    </span>
  )
}

/**
 * What you work on over the summer, asked before the season is played.
 *
 * Deliberately sat next to the play button rather than behind a menu: it is one
 * of the few things in a detailed career you decide rather than receive, and it
 * is worthless if nobody notices it is there.
 */
export function TrainingPicker({
  career,
  onPick,
}: {
  career: Career
  onPick: (facet: Facet | null) => void
}) {
  const { t } = useI18n()
  if (!isDetailed(career)) return null
  const chosen = career.training ?? null

  return (
    <section className="training">
      <h3>{t('train.title')}</h3>
      <div className="training-row">
        <button
          type="button"
          className={`train${chosen === null ? ' train--on' : ''}`}
          onClick={() => onPick(null)}
          aria-pressed={chosen === null}
        >
          {t('train.none')}
        </button>
        {facetsFor(career.player.position).map((facet) => (
          <button
            key={facet}
            type="button"
            className={`train${chosen === facet ? ' train--on' : ''}`}
            onClick={() => onPick(facet)}
            aria-pressed={chosen === facet}
          >
            {t(`facet.${facet}` as StringKey)}
          </button>
        ))}
      </div>
      <p className="hint">{chosen === null ? t('train.noneHow') : t('train.hint')}</p>
    </section>
  )
}
