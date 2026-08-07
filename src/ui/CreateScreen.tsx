import { useMemo, useState } from 'react'
import { NATIONS } from '../data/nations'
import { createCareer } from '../engine/career'
import { isDefender, isKeeper } from '../engine/sim'
import { POSITIONS, type Career, type Foot, type Position } from '../engine/types'
import { useI18n } from '../i18n'
import { Flag } from './bits'

interface Props {
  onStart: (career: Career) => void
  onCancel?: () => void
}

/**
 * Where a position lives on a pitch, as a percentage of the shown half. You
 * pick a position by pointing at the place you play, which is faster to read
 * than ten abbreviations in a row and says what the game is about before the
 * first season has been played.
 */
const SPOTS: Record<Position, { x: number; y: number }> = {
  ST: { x: 50, y: 10 },
  LW: { x: 15, y: 22 },
  RW: { x: 85, y: 22 },
  CAM: { x: 50, y: 31 },
  CM: { x: 50, y: 48 },
  CDM: { x: 50, y: 63 },
  LB: { x: 14, y: 58 },
  RB: { x: 86, y: 58 },
  CB: { x: 50, y: 78 },
  GK: { x: 50, y: 93 },
}

export function CreateScreen({ onStart, onCancel }: Props) {
  const { t, country, position: posName } = useI18n()
  const [name, setName] = useState('')
  const [nation, setNation] = useState('Germany')
  const [position, setPosition] = useState<Position>('ST')
  const [foot, setFoot] = useState<Foot>('Right')

  // sorted in the reader's own language, not in English
  const nations = useMemo(
    () => [...NATIONS].sort((a, b) => country(a.name).localeCompare(country(b.name))),
    [country],
  )
  const chosen = NATIONS.find((n) => n.name === nation)

  const start = () => onStart(createCareer({ name, nation, position, foot }))

  const posHint = isKeeper(position)
    ? t('create.posHintGK')
    : isDefender(position)
      ? t('create.posHintDEF')
      : t('create.posHintATT')

  return (
    <div className="signup">
      <p className="kicker kicker--loud">{t('create.blurb')}</p>
      <h1 className="signup-title">{t('create.title')}</h1>

      <div className="field signup-name" style={{ marginTop: 'var(--s6)' }}>
        <label htmlFor="name">{t('create.name')}</label>
        <input
          id="name"
          className="ruled"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) start()
          }}
          placeholder={t('create.namePlaceholder')}
          maxLength={28}
          autoFocus
        />
      </div>

      <div className="two-up">
        <div className="field">
          <label htmlFor="nation">{t('create.nation')}</label>
          <select
            id="nation"
            className="ruled"
            value={nation}
            onChange={(e) => setNation(e.target.value)}
          >
            {nations.map((n) => (
              <option key={n.name} value={n.name}>
                {country(n.name)}
              </option>
            ))}
          </select>
          {chosen && (
            <p className="hint">
              <Flag code={chosen.flag} />
              {t('create.nationHint', { threshold: chosen.strength - 7 })}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="foot">{t('create.foot')}</label>
          <select
            id="foot"
            className="ruled"
            value={foot}
            onChange={(e) => setFoot(e.target.value as Foot)}
          >
            <option value="Right">{t('create.footRight')}</option>
            <option value="Left">{t('create.footLeft')}</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>{t('create.position')}</label>
        <div className="pitchmap" role="group" aria-label={t('create.position')}>
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              className={`pitchspot${p === position ? ' pitchspot--on' : ''}`}
              style={{ left: `${SPOTS[p].x}%`, top: `${SPOTS[p].y}%` }}
              onClick={() => setPosition(p)}
              title={posName(p)}
              aria-pressed={p === position}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="hint">
          <b>{posName(position)}</b> · {posHint}
        </p>
      </div>

      <div className="act-row" style={{ marginTop: 'var(--s5)' }}>
        <button className="act act--primary" onClick={start} disabled={!name.trim()}>
          {t('create.start')}
        </button>
        {onCancel && (
          <button className="act act--quiet" onClick={onCancel}>
            {t('create.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
