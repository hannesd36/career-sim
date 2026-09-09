import type { NextPrompt } from '../engine/prompt'
import type { Pace } from '../engine/records'
import { rarityClass } from '../engine/rarity'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

/**
 * The one line at the end of a career that starts the next one.
 *
 * Exactly one sentence, and exactly one thing being asked. A list of five
 * suggestions is a menu, and nobody starts a career off a menu; a single
 * unfinished thing said out loud is a reason.
 */
export function NextCareer({ prompt }: { prompt: NextPrompt }) {
  const { t } = useI18n()
  const params = { ...prompt.params }
  if (prompt.challenge) {
    params.challenge = t(`ch.${prompt.challenge}` as StringKey)
  }
  return (
    <div className="onemore">
      <span className="onemore-k">{t('next.title')}</span>
      <strong className="onemore-what">{t(`next.${prompt.id}` as StringKey, params)}</strong>
    </div>
  )
}

/**
 * Where this career stands against the best one you have ever played.
 *
 * Two numbers and a line, in the corner of the column, and nothing else. The
 * moment it is beaten it says so once and then goes on quietly saying by how
 * much: a record you are chasing is a reason to play the next season, and a
 * record you have broken is a reason to keep going rather than stop.
 */
export function PaceStrip({ pace }: { pace: Pace }) {
  const { t } = useI18n()
  const gap = pace.now - pace.best
  return (
    <div className={`pacer${pace.ahead ? ' pacer--ahead' : ''}`}>
      <span className="pacer-k">{t('pace.best')}</span>
      <span className={`pacer-n ovr ${rarityClass(pace.best)}`}>{pace.best}</span>
      <span className="pacer-k pacer-k--now">{t('pace.now')}</span>
      <span className={`pacer-n ovr ${rarityClass(pace.now)}`}>{pace.now}</span>
      <span className="pacer-say">
        {pace.ahead
          ? gap > 0
            ? t('pace.ahead', { n: gap })
            : t('pace.level')
          : t('pace.behind', { n: -gap })}
      </span>
    </div>
  )
}
