import { useEffect } from 'react'
import {
  AWARDS,
  earnedCount,
  isEarned,
  readStats,
  type Award,
  type QuizStats,
} from '../engine/awards'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { HonourTrophy } from './trophies'

/**
 * The cabinet.
 *
 * Fifteen things worth doing in the two quizzes, each with the trophy it
 * borrows its shape from. A locked one still shows its drawing, greyed, because
 * knowing what is missing is the entire reason a cabinet has empty shelves.
 */
export function AwardsScreen({ onExit }: { onExit: () => void }) {
  const { t, num } = useI18n()
  const stats = readStats()
  const have = earnedCount(stats)

  return (
    <div className="flow game">
      <div className="rule-head">
        <h2>{t('award.title')}</h2>
        <button className="act act--quiet" onClick={onExit}>
          {t('quiz.back')}
        </button>
      </div>

      <p className="kicker kicker--loud">{t('award.blurb', { n: have, of: AWARDS.length })}</p>

      <div className="cabinet">
        {AWARDS.map((a) => (
          <Shelf key={a.id} award={a} stats={stats} />
        ))}
      </div>

      <div className="rule-head">
        <h2>{t('award.ledger')}</h2>
      </div>
      <div className="counts">
        {(
          [
            ['award.st.gridPlayed', stats.gridPlayed],
            ['award.st.gridWon', stats.gridWon],
            ['award.st.gridSquares', stats.gridSquares],
            ['award.st.soloBest', stats.soloBest],
            ['award.st.guessPlayed', stats.guessPlayed],
            ['award.st.guessWon', stats.guessWon],
            ['award.st.streakBest', stats.streakBest],
            ['award.st.onlineWon', stats.onlineWon],
            ['award.st.dailyDays', stats.dailyDays],
            ['award.st.dailyStreak', stats.dailyStreak],
          ] as [StringKey, number][]
        ).map(([key, value]) => (
          <div className="counts-row" key={key}>
            <span>{t(key)}</span>
            <b>{num(value)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function Shelf({ award, stats }: { award: Award; stats: QuizStats }) {
  const { t } = useI18n()
  const { at, of } = award.progress(stats)
  const got = isEarned(award, stats)
  return (
    <div className={`shelf${got ? ' shelf--won' : ''}`}>
      <span className="shelf-art">
        <HonourTrophy honour={award.art} size={40} />
      </span>
      <span className="shelf-name">{t(`award.${award.id}` as StringKey)}</span>
      <span className="shelf-how">{t(`award.${award.id}.how` as StringKey)}</span>
      {of > 1 && (
        <span className="shelf-bar" aria-hidden="true">
          <i style={{ width: `${Math.round((at / of) * 100)}%` }} />
        </span>
      )}
      {of > 1 && (
        <span className="shelf-count">
          {at} / {of}
        </span>
      )}
    </div>
  )
}

/**
 * The moment something is won, said once and then got out of the way. It is
 * deliberately not a dialog: nobody wants to dismiss a box mid game.
 */
export function AwardToast({ awards, onDone }: { awards: Award[]; onDone: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    if (!awards.length) return
    const timer = setTimeout(onDone, 5200)
    return () => clearTimeout(timer)
  }, [awards, onDone])

  if (!awards.length) return null

  return (
    <div className="toast" role="status">
      {awards.map((a) => (
        <div className="toast-row" key={a.id}>
          <HonourTrophy honour={a.art} size={30} />
          <span>
            <b>{t('award.won')}</b>
            {t(`award.${a.id}` as StringKey)}
          </span>
        </div>
      ))}
    </div>
  )
}
