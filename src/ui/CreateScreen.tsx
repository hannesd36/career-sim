import { useMemo, useState } from 'react'
import { NATIONS } from '../data/nations'
import { createCareer } from '../engine/career'
import { computeCabinetStats } from '../engine/careerAwards'
import { MODIFIERS, isModifierUnlocked, type ModifierId } from '../engine/modifiers'
import { isDefender, isKeeper } from '../engine/sim'
import { listCareers } from '../engine/storage'
import {
  POSITIONS,
  type Career,
  type CareerDetail,
  type Foot,
  type Position,
} from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Flag } from './bits'

interface Props {
  onStart: (career: Career) => void
  onCancel?: () => void
  /** a fixed brief the career must be begun under, from the daily challenge */
  fixed?: { seed: number; nation: string; position: Position; foot: Foot; daily: string }
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

export function CreateScreen({ onStart, onCancel, fixed }: Props) {
  const { t, country, position: posName } = useI18n()
  const [name, setName] = useState('')
  const [nation, setNation] = useState(fixed?.nation ?? 'Germany')
  const [position, setPosition] = useState<Position>(fixed?.position ?? 'ST')
  const [foot, setFoot] = useState<Foot>(fixed?.foot ?? 'Right')
  const [modifier, setModifier] = useState<ModifierId>('standard')
  // The daily is the same run for everybody, so it is always the simple one:
  // two people on different modes are not playing the same career any more.
  const [detail, setDetail] = useState<CareerDetail>('simple')

  // What the hall of fame has opened up. Recomputed here rather than passed in,
  // so a career finished a minute ago is already reflected on this screen.
  const unlocked = useMemo(() => {
    const stats = computeCabinetStats(listCareers())
    return MODIFIERS.filter((m) => isModifierUnlocked(m, stats))
  }, [])

  // sorted in the reader's own language, not in English
  const nations = useMemo(
    () => [...NATIONS].sort((a, b) => country(a.name).localeCompare(country(b.name))),
    [country],
  )
  const chosen = NATIONS.find((n) => n.name === nation)

  const start = () =>
    onStart(
      createCareer(
        fixed
          ? { name, nation, position, foot, seed: fixed.seed, daily: fixed.daily }
          : { name, nation, position, foot, modifier, detail },
      ),
    )

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

      {fixed && (
        <p className="hint hint--fixed">
          {t('daily.fixedBrief', {
            nation: country(nation),
            position: posName(position),
            foot: t(`create.foot${foot}` as StringKey),
          })}
        </p>
      )}

      {!fixed && (
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
      )}

      {!fixed && (
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
      )}

      {/* A career begun under one of these is a different problem, not an
          easier one. The daily is played on the plain start by everybody. */}
      {!fixed && unlocked.length > 1 && (
        <div className="field">
          <label>{t('mod.title')}</label>
          <div className="mods">
            {unlocked.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mod${m.id === modifier ? ' mod--on' : ''}`}
                onClick={() => setModifier(m.id)}
                aria-pressed={m.id === modifier}
              >
                <b>{t(`mod.${m.id}` as StringKey)}</b>
                <span>{t(`mod.${m.id}.how` as StringKey)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How much of a career is on the table. The daily never asks: everybody
          has to be playing the same one for the board to mean anything. */}
      {!fixed && (
        <div className="field">
          <label>{t('detail.title')}</label>
          <div className="mods">
            {(['simple', 'detailed'] as CareerDetail[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`mod${d === detail ? ' mod--on' : ''}`}
                onClick={() => setDetail(d)}
                aria-pressed={d === detail}
              >
                <b>{t(`detail.${d}` as StringKey)}</b>
                <span>{t(`detail.${d}.how` as StringKey)}</span>
              </button>
            ))}
          </div>
          <p className="hint">
            {detail === 'detailed' ? t('detail.paceLocked') : t('detail.oneWay')}
          </p>
        </div>
      )}

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
