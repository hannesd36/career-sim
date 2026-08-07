import { EVENT_BY_ID, dopingTestRisk, outcomeOdds } from '../engine/events'
import type { Career } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Delta, seasonLabel } from './bits'

interface Props {
  career: Career
  onChoose: (choiceKey: string) => void
  onContinue: () => void
}

/** Choices whose real cost is a test risk in every season that follows. */
function deferredRisk(eventId: string, choiceKey: string): boolean {
  return (
    (eventId === 'doping-offer' && choiceKey === 'accept') ||
    (eventId === 'doping-continue' && choiceKey === 'continue')
  )
}

/**
 * A decision has to interrupt the career, so it does: the panel bleeds past
 * the reading column, a claret rule lands across the top of the page, and the
 * answer is a fork with the two roads side by side rather than a list of
 * options in a form. The odds sit under each road, in the one currency the
 * whole game spends.
 */
export function EventScreen({ career, onChoose, onContinue }: Props) {
  const { t } = useI18n()
  const pending = career.pendingEvent
  if (!pending) return null
  const event = EVENT_BY_ID[pending.id]
  if (!event) return null

  const resolved = !!pending.outcome
  const chosen = event.choices.find((c) => c.key === pending.chosen)
  const landed = chosen?.outcomes.find((o) => o.result === pending.outcome?.result)
  const risk = Math.round(dopingTestRisk(career.player.dopingSeasons + 1) * 100)

  return (
    <section className="moment">
      <div className="moment-slab">
        <p className="kicker kicker--risk">
          {t('event.moment')} · {seasonLabel(pending.season)}
        </p>
        <h2 className="moment-title">{t(`ev.${pending.id}.title` as StringKey)}</h2>
        <p className="moment-body">{t(`ev.${pending.id}.body` as StringKey)}</p>
      </div>

      {!resolved ? (
        <div className="fork">
          {event.choices.map((choice) => (
            <button key={choice.key} className="fork-side" onClick={() => onChoose(choice.key)}>
              <span className="fork-name">
                {t(`ev.${pending.id}.${choice.key}` as StringKey)}
              </span>
              <span className="fork-odds">
                {choice.outcomes.map((outcome) => (
                  <span className="odd" key={outcome.result}>
                    <span className="odd-pct">{outcomeOdds(choice, outcome)}%</span>
                    <Delta value={outcome.effect.ovr ?? 0} />
                  </span>
                ))}
                {/* Taking the programme is certain; what follows it is not. */}
                {deferredRisk(pending.id, choice.key) && (
                  <span className="odd odd--risk">
                    <span className="odd-pct">{risk}%</span>
                    <span className="odd-note">{t('event.riskLater')}</span>
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="aftermath">
          <Delta value={landed?.effect.ovr ?? 0} size="lg" />
          <p>{t(`ev.${pending.id}.result.${pending.outcome!.result}` as StringKey)}</p>
          <button className="act act--primary" onClick={onContinue}>
            {t('event.continue')}
          </button>
        </div>
      )}
    </section>
  )
}
