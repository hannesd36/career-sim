import { useEffect } from 'react'
import {
  CHALLENGES,
  challengesDone,
  readChallenges,
  type ChallengeId,
  type ChallengeLog,
} from '../engine/challenges'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

/**
 * Everything there is to go and do, and what has already been done.
 *
 * The hidden ones are shown as a count rather than a row of question marks:
 * knowing there are six things you have not found is a reason to play, and
 * six identical blanks is just a gap in a grid. A hidden one that has been
 * earned comes out of hiding for good.
 */
export function ChallengeBoard({ log = readChallenges() }: { log?: ChallengeLog }) {
  const { t } = useI18n()
  const done = challengesDone(log)
  const open = CHALLENGES.filter((c) => !c.secret || log[c.id])
  const hidden = CHALLENGES.filter((c) => c.secret && !log[c.id]).length

  return (
    <>
      <p className="kicker kicker--loud">{t('ch.blurb', { n: done, of: CHALLENGES.length })}</p>
      <div className="challenges">
        {open.map((c) => {
          const record = log[c.id]
          return (
            <div className={`chal${record ? ' chal--done' : ''}`} key={c.id}>
              <span className="chal-mark" aria-hidden="true">
                {record ? '✓' : ''}
              </span>
              <span className="chal-name">{t(`ch.${c.id}` as StringKey)}</span>
              <span className="chal-how">{t(`ch.${c.id}.how` as StringKey)}</span>
              {record && <span className="chal-by">{t('ch.doneBy', { name: record.by })}</span>}
            </div>
          )
        })}
      </div>
      {hidden > 0 && (
        <p className="hint chal-hidden">
          <b>{t('ch.secretsLeft', { n: hidden })}</b> {t('ch.secretHow')}
        </p>
      )}
    </>
  )
}

/**
 * Three of them, in front of somebody who is deciding what to play.
 *
 * It is the whole of the retention argument in one strip: here are named
 * things you have not done yet, and one of them is nearly in reach.
 */
export function ChallengeStrip({
  ids,
  log = readChallenges(),
}: {
  ids: ChallengeId[]
  log?: ChallengeLog
}) {
  const { t } = useI18n()
  if (!ids.length) return <p className="note">{t('ch.allDone')}</p>
  return (
    <div className="aims">
      {ids.map((id) => (
        <div className={`aim${log[id] ? ' aim--done' : ''}`} key={id}>
          <span className="aim-name">{t(`ch.${id}` as StringKey)}</span>
          <span className="aim-how">{t(`ch.${id}.how` as StringKey)}</span>
        </div>
      ))}
    </div>
  )
}

/** A challenge landing, said once and got out of the way. */
export function ChallengeToast({ ids, onDone }: { ids: ChallengeId[]; onDone: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    if (!ids.length) return
    const timer = setTimeout(onDone, 5200)
    return () => clearTimeout(timer)
  }, [ids, onDone])

  if (!ids.length) return null

  return (
    <div className="toast" role="status">
      {ids.map((id) => (
        <div className="toast-row" key={id}>
          <span>
            <b>{t('ch.won')}</b>
            {t(`ch.${id}` as StringKey)}
          </span>
        </div>
      ))}
    </div>
  )
}
