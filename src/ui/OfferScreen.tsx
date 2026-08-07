import { LEAGUE_BY_ID } from '../data/leagues'
import { retirementHint } from '../engine/career'
import type { Career, Offer } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag, roleClass, seasonLabel } from './bits'

interface Props {
  career: Career
  onAccept: (offer: Offer) => void
  onRetire: () => void
  onClub: (clubId: string) => void
}

/**
 * The window is not six copies of the same row. The strongest squad that wants
 * you takes the top of the page with the room to make its case, and everything
 * else is a ruled list you run your eye down. The hierarchy is the point: one
 * of these clubs is a bigger deal than the others, and the screen says so
 * before you have read a word.
 */
export function OfferScreen({ career, onAccept, onRetire, onClub }: Props) {
  const { t, role, country, competition } = useI18n()
  const reason = retirementHint(career)

  if (career.offers.length === 0) return null

  // strongest squad first; a permanent deal beats a loan of the same standard
  const lead = career.offers.reduce((best, o) =>
    o.club.strength > best.club.strength ||
    (o.club.strength === best.club.strength && best.loan && !o.loan)
      ? o
      : best,
  )
  const rest = career.offers.filter((o) => o !== lead)

  return (
    <section className="market">
      <header className="market-head">
        <p className="kicker kicker--loud">{t('offers.count', { n: career.offers.length })}</p>
        <h2 className="market-title">{t('offers.window', { year: career.season + 1 })}</h2>
        <p className="market-ask">{t('offers.question')}</p>
      </header>

      {reason && (
        <p className="lede" style={{ marginBottom: 'var(--s5)' }}>
          {t(`retire.${reason}` as StringKey)}
        </p>
      )}

      <Lead career={career} offer={lead} onAccept={onAccept} onClub={onClub} />

      {rest.length > 0 && (
        <>
          <div className="rule-head" style={{ marginTop: 'var(--s6)' }}>
            <h2>{t('offers.rest')}</h2>
          </div>
          {rest.map((offer, i) => {
            const league = LEAGUE_BY_ID[offer.club.leagueId]
            const staying = offer.club.id === career.player.clubId && !offer.loan
            return (
              <div className="approach-row" key={`${offer.club.id}-${i}`}>
                <button className="approach" onClick={() => onAccept(offer)}>
                  <Crest club={offer.club} />
                  <span style={{ minWidth: 0 }}>
                    <span className="approach-name">{offer.club.name}</span>
                    <span className="approach-where">
                      <Flag code={league.flag} />
                      {league.name}, {country(league.country)}
                    </span>
                  </span>
                  <span className="approach-tags">
                    {staying && <span className="tag tag--home">{t('offers.stay')}</span>}
                    {offer.loan && <span className="tag">{t('offers.loan')}</span>}
                    <span className={`tag ${roleClass(offer.projectedRole)}`}>
                      {role(offer.projectedRole)}
                    </span>
                    {offer.continental && league.continental && (
                      <span className="tag tag--euro">{competition(league.continental)}</span>
                    )}
                  </span>
                  <span className="approach-squad">
                    <b>{Math.round(offer.club.strength)}</b>
                    {gapLabel(offer, career, t)}
                  </span>
                </button>
                <button
                  className="approach-table"
                  onClick={() => onClub(offer.club.id)}
                  title={t('table.open')}
                >
                  {t('table.short')}
                </button>
              </div>
            )
          })}
        </>
      )}

      {/* nobody hangs up their boots at nineteen */}
      {career.player.age >= 30 && (
        <div className="act-row" style={{ marginTop: 'var(--s5)' }}>
          <button
            className="act act--risk"
            onClick={() => {
              if (confirm(t('offers.retireConfirm'))) onRetire()
            }}
          >
            {t('offers.retire', { season: seasonLabel(career.season) })}
          </button>
        </div>
      )}
    </section>
  )
}

function Lead({
  career,
  offer,
  onAccept,
  onClub,
}: {
  career: Career
  offer: Offer
  onAccept: (o: Offer) => void
  onClub: (id: string) => void
}) {
  const { t, role, country, competition } = useI18n()
  const league = LEAGUE_BY_ID[offer.club.leagueId]
  const staying = offer.club.id === career.player.clubId && !offer.loan

  return (
    <div>
      <button className="approach approach--lead" onClick={() => onAccept(offer)}>
        <span className="approach-lead-crest">
          <Crest club={offer.club} size="lg" eager />
        </span>
        <span style={{ minWidth: 0 }}>
          {/* the reason this one is at the top of the page, said out loud */}
          <span className="kicker kicker--loud" style={{ display: 'block', margin: 0 }}>
            {t('offers.lead')}
          </span>
          <span className="approach-name">{offer.club.name}</span>
          <span className="approach-where">
            <Flag code={league.flag} />
            {league.name}, {country(league.country)}
          </span>
          <span className="approach-tags" style={{ marginLeft: 0, justifyContent: 'flex-start', marginTop: 'var(--s3)' }}>
            {staying && <span className="tag tag--home">{t('offers.stay')}</span>}
            {offer.loan && <span className="tag">{t('offers.loan')}</span>}
            <span className={`tag ${roleClass(offer.projectedRole)}`}>
              {role(offer.projectedRole)}
            </span>
            {offer.continental && league.continental && (
              <span className="tag tag--euro">{competition(league.continental)}</span>
            )}
          </span>
        </span>
        <span className="approach-lead-side">
          <span className="approach-squad">
            <b>{Math.round(offer.club.strength)}</b>
            {gapLabel(offer, career, t)}
          </span>
          <span className="approach-sign">
            {t('offers.sign')}
            <span aria-hidden="true">→</span>
          </span>
        </span>
      </button>
      <div className="act-row" style={{ marginTop: 'var(--s3)' }}>
        <button className="act act--quiet" onClick={() => onClub(offer.club.id)}>
          {t('table.open')}
        </button>
      </div>
    </div>
  )
}

/** How far the squad you would join sits above or below you today. */
function gapLabel(offer: Offer, career: Career, t: (k: StringKey, v?: Record<string, string | number>) => string) {
  const gap = Math.round(offer.club.strength - career.player.ovr)
  if (gap > 0) return t('offers.above', { n: gap })
  if (gap < 0) return t('offers.below', { n: -gap })
  return t('offers.level')
}
