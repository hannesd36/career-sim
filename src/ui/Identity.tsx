import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { NATION_BY_NAME } from '../data/nations'
import { totals } from '../engine/career'
import { dopingTestRisk } from '../engine/events'
import { pointsToNextRarity, rarityClass } from '../engine/rarity'
import { isKeeper } from '../engine/sim'
import type { Career, TrophyId } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag, Grade, TrophyIcon, formatValue } from './bits'

interface Props {
  career: Career
  onClub: (id: string) => void
}

/**
 * The player, as the card at the head of the left hand column: who you are,
 * what you are rated, who you play for, what you have done and what is in the
 * cabinet. Everything here holds for the whole career. Anything that only
 * describes one season belongs to that season instead.
 */
export function Identity({ career, onClub }: Props) {
  const { t, lang, country, trophyShort } = useI18n()
  const { player } = career
  const club = CLUB_BY_ID[player.clubId]
  const league = club ? LEAGUE_BY_ID[club.leagueId] : null
  const nation = NATION_BY_NAME[player.nation]
  const stats = totals(career)
  const keeper = isKeeper(player.position)
  const troubled = player.doping || player.bannedUntil !== null || player.reputation < 42

  const cabinet = new Map<TrophyId, number>()
  for (const tr of career.trophies) cabinet.set(tr.id, (cabinet.get(tr.id) ?? 0) + 1)

  return (
    <header className="card">
      <div className="card-top">
        <div style={{ minWidth: 0 }}>
          <h1 className="card-name">{player.name}</h1>
          <div className="card-line">
            {nation && <Flag code={nation.flag} title={country(nation.name)} />}
            <span className="pos">{t(`pos.${player.position}` as StringKey)}</span>
            <span className="dot" />
            <span>{t(`create.foot${player.foot}` as StringKey)}</span>
          </div>
        </div>
        <Grade ovr={player.ovr} size="md" />
      </div>

      <div className="card-club">
        {club ? (
          <button className="club-tag" onClick={() => onClub(club.id)} title={t('table.open')}>
            <Crest club={club} eager />
            {club.name}
          </button>
        ) : (
          <span>{t('card.freeAgent')}</span>
        )}
        {league && (
          <span className="card-where">
            {league.name}, {country(league.country)}
          </span>
        )}
        {player.onLoan && <span className="tag">{t('card.loan')}</span>}
      </div>

      {/* Age and what you are worth are the two numbers a career is discussed
          in, so they are set at the size the rating is, not tucked into a
          line of metadata. Everything you have produced follows them. */}
      <div className="card-figures">
        <div className="figure">
          <div className="figure-k">{t('card.age')}</div>
          <div className="figure-v">{player.age}</div>
        </div>
        <div className="figure">
          <div className="figure-k">{t('card.value')}</div>
          <div className="figure-v">{formatValue(player.value, lang)}</div>
        </div>
      </div>

      <div className="card-tally">
        <span>
          {t('table.apps')}
          <b>{stats.apps + stats.natApps}</b>
        </span>
        <span>
          {keeper ? t('table.cleanSheets') : t('table.goals')}
          <b>{keeper ? stats.cleanSheets : stats.goals + stats.natGoals}</b>
        </span>
        <span>
          {t('table.assists')}
          <b>{stats.assists + stats.natAssists}</b>
        </span>
      </div>

      <Ceiling career={career} />

      <div className="case">
        {cabinet.size === 0 ? (
          <span className="case-empty">{t('card.noSilverware')}</span>
        ) : (
          [...cabinet].map(([id, n]) => (
            <span className="case-item" key={id}>
              <TrophyIcon id={id} size={13} />
              {trophyShort(id)}
              {n > 1 && <b>×{n}</b>}
            </span>
          ))
        )}
      </div>

      {troubled && (
        <div className="alarms">
          {player.bannedUntil !== null && (
            <span className="alarm">{t('card.banned', { season: player.bannedUntil })}</span>
          )}
          {player.doping && player.bannedUntil === null && (
            <span className="alarm">
              {t('card.doping')}
              <b>{Math.round(dopingTestRisk(player.dopingSeasons + 1) * 100)}%</b>
            </span>
          )}
          {player.reputation < 42 && (
            <span className="alarm">
              {t('card.reputation')}
              <b>{player.reputation}</b>
            </span>
          )}
        </div>
      )}
    </header>
  )
}

/**
 * How good you can still get, at the size a permanent fixture can afford: the
 * range, where today falls inside it, and the points left to the next tier,
 * which is the number people actually play for.
 */
function Ceiling({ career }: { career: Career }) {
  const { t } = useI18n()
  const { player } = career
  const toNext = pointsToNextRarity(player.ovr)

  const lo = Math.min(player.potMin, player.ovr)
  const hi = Math.max(player.potMax, player.ovr + 1)
  const scaleLo = Math.max(40, lo - 6)
  const scaleHi = Math.min(99, hi + 4)
  const pct = (v: number) => ((v - scaleLo) / (scaleHi - scaleLo)) * 100

  return (
    <div className="ceiling">
      <div className="ceiling-top">
        <span className="ceiling-k">{t('card.ceiling')}</span>
        <span className="ceiling-range">
          {player.potMin}
          <i>{t('card.rangeTo')}</i>
          {player.potMax}
        </span>
      </div>
      <div className="ceiling-bar">
        <div
          className="ceiling-span"
          style={{ left: `${pct(lo)}%`, width: `${Math.max(2, pct(hi) - pct(lo))}%` }}
        />
        <div className="ceiling-now" style={{ left: `calc(${pct(player.ovr)}% - 1px)` }} />
      </div>
      {toNext && (
        <div className={`ceiling-next ${rarityClass(player.ovr + toNext.points)}`}>
          <i />
          <b>{toNext.points}</b>
          {t('rar.toNext', { rarity: t(`rar.${toNext.rarity}` as StringKey) })}
        </div>
      )}
    </div>
  )
}
