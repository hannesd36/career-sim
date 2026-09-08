import { useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { isExpiring, yearsLeft, type Bonus, type Terms } from '../engine/contracts'
import { SPENDS, money, perksOf, upkeep, type SpendId } from '../engine/finances'
import { glassLevel, worstInjury } from '../engine/injuries'
import { moodOf, sortedMates, styleFit } from '../engine/staff'
import { isDetailed, type Career } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'

/** Money, said the way a person would say it. */
function Money({ thousands }: { thousands: number }) {
  const { num } = useI18n()
  const { value, unit } = money(thousands)
  return (
    <span className="cash">
      {num(value)}
      <i>{unit === 'm' ? ' Mio. €' : 'k €'}</i>
    </span>
  )
}

function bonusLine(bonus: Bonus, t: ReturnType<typeof useI18n>['t'], num: (n: number) => string) {
  return t(`con.bonus.${bonus.kind}` as StringKey, { n: num(bonus.per) })
}

/**
 * The deal currently being played under.
 *
 * Sits in the dossier column next to the attributes, because a contract is a
 * fact about your situation in the same way your pace is.
 */
export function ContractPanel({ career }: { career: Career }) {
  const { t, num } = useI18n()
  const contract = career.contract
  if (!isDetailed(career) || !contract) return null

  const left = yearsLeft(contract, career.season)
  const club = CLUB_BY_ID[contract.clubId]

  return (
    <section className="deal">
      <div className="deal-head">
        <h3>{t('con.title')}</h3>
        <span className="deal-wage">
          <Money thousands={contract.wage} />
          <i>{t('con.perWeek')}</i>
        </span>
      </div>

      <p className={`deal-term${left <= 1 ? ' deal-term--short' : ''}`}>
        {left === 0
          ? t('con.expired')
          : isExpiring(contract, career.season)
            ? t('con.expiring')
            : t('con.until', { season: contract.until })}
      </p>

      <p className="hint">
        {contract.promised
          ? t('con.promised', { role: t(`role.${contract.promised}` as StringKey) })
          : t('con.nothingPromised')}
      </p>

      {career.promiseBroken && contract.promised && (
        <p className="deal-broken">
          {t('con.broken', {
            club: club?.name ?? '',
            role: t(`role.${contract.promised}` as StringKey),
          })}
        </p>
      )}

      {contract.bonuses.length > 0 && (
        <div className="deal-bonuses">
          <span className="deal-bonuses-label">{t('con.bonuses')}</span>
          {contract.bonuses.map((b) => (
            <span key={b.kind} className="deal-bonus">
              {bonusLine(b, t, num)}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * The four shapes a club will sign you on, shown at the moment of signing.
 *
 * They are not ordered best to worst on purpose: the long deal pays less and
 * the incentivised one might pay nothing, so the player is picking a shape
 * rather than reading down a list to the top number.
 */
export function TermsPicker({
  terms,
  chosen,
  onPick,
  freeAgent,
}: {
  terms: Terms[]
  chosen: Terms | null
  onPick: (terms: Terms) => void
  freeAgent: boolean
}) {
  const { t, num } = useI18n()
  return (
    <div className="terms">
      <div className="terms-head">
        <h4>{t('con.pick')}</h4>
        {freeAgent && <span className="terms-free">{t('con.freeBump')}</span>}
      </div>
      <div className="terms-row">
        {terms.map((term) => (
          <button
            key={term.id}
            type="button"
            className={`term${chosen?.id === term.id ? ' term--on' : ''}`}
            onClick={() => onPick(term)}
            aria-pressed={chosen?.id === term.id}
          >
            <b>{t(`con.terms.${term.id}` as StringKey)}</b>
            <span className="term-money">
              <Money thousands={term.wage} />
              <i>{t('con.perWeek')}</i>
            </span>
            <span className="term-years">
              {term.years === 1 ? t('con.years_one') : t('con.years', { n: term.years })}
            </span>
            {term.bonuses.length > 0 && (
              <span className="term-bonus">
                {term.bonuses.map((b) => bonusLine(b, t, num)).join(' · ')}
              </span>
            )}
            <span className="term-how">{t(`con.terms.${term.id}.how` as StringKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** The manager, the squad, and the handful of people you actually know. */
export function RoomPanel({ career }: { career: Career }) {
  const { t, num } = useI18n()
  const room = career.room
  if (!isDetailed(career) || !room) return null

  const { manager } = room
  const { friends, rivals } = sortedMates(room)
  const fit = styleFit(manager.style, career.player.position)

  return (
    <section className="room">
      <div className="room-head">
        <h3>{t('room.title')}</h3>
        {room.captain && <span className="room-armband">{t('room.captain')}</span>}
      </div>

      <div className="room-boss">
        <span className="room-role">{t('room.manager')}</span>
        <b className="room-name">{manager.name}</b>
        <span className="room-style">{t(`style.${manager.style}` as StringKey)}</span>
        <span className="room-since">
          {manager.since >= career.season
            ? t('room.new')
            : t('room.since', { season: manager.since })}
        </span>
      </div>

      <p className={`room-mood room-mood--${moodOf(manager.opinion)}`}>
        {t(`mood.${moodOf(manager.opinion)}` as StringKey)}
      </p>
      {fit !== 0 && <p className="hint">{fit > 0 ? t('style.fits') : t('style.against')}</p>}

      <div className="room-standing">
        <span>{t('room.standing')}</span>
        <b>{num(room.standing)}</b>
        <span className="attr-bar">
          <i style={{ width: `${room.standing}%` }} />
        </span>
      </div>

      {(friends.length > 0 || rivals.length > 0) && (
        <div className="room-mates">
          {friends.length > 0 && (
            <div>
              <span className="attr-standout-label">{t('room.friends')}</span>
              {friends.map((m) => (
                <span key={m.name} className="mate mate--friend">
                  {m.name} <i>{num(m.ovr)}</i>
                </span>
              ))}
            </div>
          )}
          {rivals.length > 0 && (
            <div>
              <span className="attr-standout-label">{t('room.rivals')}</span>
              {rivals.map((m) => (
                <span key={m.name} className="mate mate--rival">
                  {m.name} <i>{num(m.ovr)}</i>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/** What the body has been through, and what it says about the years left. */
export function BodyPanel({ career }: { career: Career }) {
  const { t, num } = useI18n()
  const body = career.player.body
  if (!isDetailed(career) || !body) return null

  const worst = worstInjury(body)
  const level = glassLevel(body)

  return (
    <section className="body-panel">
      <div className="attrs-head">
        <h3>{t('inj.title')}</h3>
        <span className={`glass glass--${level}`}>{t(`glass.${level}` as StringKey)}</span>
      </div>
      {!body.history.length ? (
        <p className="hint">{t('inj.none')}</p>
      ) : (
        <>
          <p className="hint">{t('inj.worst', { what: t(`inj.${worst!.id}` as StringKey) })}</p>
          <div className="injury-list">
            {[...body.history]
              .reverse()
              .slice(0, 8)
              .map((injury, i) => (
                <div key={`${injury.season}-${injury.id}-${i}`} className="injury">
                  <span className="injury-season">{injury.season}</span>
                  <span className="injury-what">
                    {injury.games === 1
                      ? t('inj.season_one', { what: t(`inj.${injury.id}` as StringKey) })
                      : t('inj.season', {
                          what: t(`inj.${injury.id}` as StringKey),
                          n: num(injury.games),
                        })}
                  </span>
                  {injury.lasting && <span className="injury-lasting">{t('inj.lasting')}</span>}
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  )
}

/**
 * Where the money goes.
 *
 * Its own screen, because deciding what to spend a career's earnings on is a
 * different kind of thinking from deciding which club to sign for, and putting
 * it in the same column would make both worse.
 */
export function LifeScreen({
  career,
  onToggle,
  onInvest,
}: {
  career: Career
  onToggle: (id: SpendId) => void
  onInvest: (amount: number) => void
}) {
  const { t, num } = useI18n()
  const [amount, setAmount] = useState(500)
  const f = career.finances
  if (!isDetailed(career) || !f) return null

  const perks = perksOf(f)
  const out = upkeep(f)

  return (
    <div className="life">
      <p className="kicker kicker--loud">{t('life.blurb')}</p>
      <h1 className="signup-title">{t('life.title')}</h1>

      <div className="life-figures">
        <div>
          <span>{t('life.earned')}</span>
          <b>
            <Money thousands={f.earned} />
          </b>
        </div>
        <div>
          <span>{t('life.balance')}</span>
          <b>
            <Money thousands={f.balance} />
          </b>
        </div>
        <div>
          <span>{t('life.upkeep')}</span>
          <b>
            <Money thousands={out} />
          </b>
        </div>
        <div>
          <span>{t('life.invested')}</span>
          <b>
            <Money thousands={f.invested} />
          </b>
        </div>
        <div>
          <span>{t('life.returns')}</span>
          <b className={f.returns < 0 ? 'down' : 'up'}>
            <Money thousands={f.returns} />
          </b>
        </div>
      </div>

      <h3 className="life-section">{t('life.spending')}</h3>
      <div className="mods">
        {SPENDS.map((spend) => {
          const on = f.on.includes(spend.id)
          const afford = on || f.balance >= spend.cost
          return (
            <button
              key={spend.id}
              type="button"
              className={`mod${on ? ' mod--on' : ''}`}
              onClick={() => afford && onToggle(spend.id)}
              aria-pressed={on}
              disabled={!afford}
            >
              <b>{t(`spend.${spend.id}` as StringKey)}</b>
              <span>{t(`spend.${spend.id}.how` as StringKey)}</span>
              <span className="mod-cost">
                {t('life.cost', { n: num(spend.cost) })} · {on ? t('life.on') : t('life.off')}
              </span>
              {!afford && <span className="mod-cost">{t('life.cantAfford')}</span>}
            </button>
          )
        })}
      </div>

      <h3 className="life-section">{t('life.invest')}</h3>
      <div className="invest-row">
        <input
          type="number"
          className="ruled invest-amount"
          value={amount}
          min={0}
          step={100}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
        />
        <button
          className="act act--primary"
          onClick={() => onInvest(amount)}
          disabled={amount <= 0 || f.balance < amount}
        >
          {t('life.invest')}
        </button>
        <button
          className="act act--quiet"
          onClick={() => onInvest(-amount)}
          disabled={amount <= 0 || f.invested < amount}
        >
          {t('life.withdraw')}
        </button>
      </div>
      <p className="hint">{t('life.investHint')}</p>

      {/* What the arrangements are actually buying, so the money is legible. */}
      {f.on.length > 0 && (
        <p className="hint">
          {[
            perks.injury < 1 ? t('spend.physio.how') : null,
            perks.growth > 0 ? t('spend.coach.how') : null,
            perks.offers > 0 ? t('spend.agent.how') : null,
          ]
            .filter(Boolean)
            .join(' ')}
        </p>
      )}
    </div>
  )
}
