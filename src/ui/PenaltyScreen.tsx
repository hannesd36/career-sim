import { useEffect, useState } from 'react'
import type { Career, PenaltyCorner } from '../engine/types'
import { useI18n } from '../i18n'
import { Delta } from './bits'

interface Props {
  career: Career
  onTake: (corner: PenaltyCorner) => void
  onContinue: () => void
}

const CORNERS: PenaltyCorner[] = ['left', 'centre', 'right']

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The one moment in the game that is not a simulation. A final is not decided
 * by the numbers on your card; it is decided by which way you go and which way
 * he goes, and you find out in that order.
 *
 * The engine answers the moment you pick, but the screen holds the answer back
 * for the length of the kick: ball, dive, then verdict. Nothing about the
 * result changes, only when you are allowed to see it.
 */
export function PenaltyScreen({ career, onTake, onContinue }: Props) {
  const { t, trophyShort } = useI18n()
  const p = career.pendingPenalty
  const taken = p?.taken
  const [settled, setSettled] = useState(taken !== undefined)

  useEffect(() => {
    if (taken === undefined) {
      setSettled(false)
      return
    }
    if (reducedMotion()) {
      setSettled(true)
      return
    }
    const id = setTimeout(() => setSettled(true), 680)
    return () => clearTimeout(id)
  }, [taken])

  if (!p) return null
  const struck = taken !== undefined

  return (
    <section className="spot">
      <p className="kicker kicker--loud">{t('pen.final', { trophy: trophyShort(p.trophy) })}</p>
      <h2 className="spot-title">
        {p.club} <i>{t('pen.versus')}</i> {p.opponent}
      </h2>
      {!struck && <p className="spot-ask">{t('pen.body')}</p>}

      <div className="goal">
        <div className="goal-net" aria-hidden="true" />

        {/* he stands on the line until you have already hit it */}
        <div className={`keeper${struck ? ` keeper--${p.keeper}` : ''}`} aria-hidden="true">
          <svg viewBox="0 0 40 52" width="54" height="70" fill="currentColor">
            <circle cx="20" cy="8" r="7" />
            <path d="M12 17h16l6 15-5 2-3-7v23h-5V38h-2v12h-5V27l-3 7-5-2z" />
          </svg>
        </div>

        <div className="zones">
          {CORNERS.map((corner) => {
            const picked = taken === corner
            return (
              <button
                key={corner}
                className={`zone${picked ? ' zone--picked' : ''}`}
                onClick={() => onTake(corner)}
                disabled={struck}
              >
                <span className="zone-name">{t(`pen.${corner}`)}</span>
                {picked && (
                  <span
                    className={`ball${p.result === 'wide' ? ' ball--over' : ''}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="turf" aria-hidden="true" />

      {settled && (
        <div className={`verdict ${p.scored ? 'verdict--in' : 'verdict--out'}`} role="status">
          <strong>
            {p.scored ? t('pen.scored') : p.result === 'wide' ? t('pen.wide') : t('pen.saved')}
          </strong>
          <span>
            {p.scored
              ? t('pen.wonIt', { trophy: trophyShort(p.trophy) })
              : t('pen.lostIt', { opponent: p.opponent })}
          </span>
          {p.scored && <Delta value={1} />}
          <button className="act act--primary" onClick={onContinue}>
            {t('event.continue')}
          </button>
        </div>
      )}
    </section>
  )
}
