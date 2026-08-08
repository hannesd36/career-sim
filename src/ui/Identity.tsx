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
import { Crest, Flag, Grade, Trajectory, TrophyIcon, formatValue } from './bits'

interface Props {
  career: Career
  onClub: (id: string) => void
  /**
   * `full` heads the career overview. `strip` is the same player reduced to the
   * one line a decision needs: this is who it is happening to.
   */
  variant?: 'full' | 'strip'
}

/**
 * The player, as the head of the reading column: who you are, what you are
 * rated, who you play for, where the career has been and what is in the
 * cabinet. Everything here holds for the whole career. Anything that only
 * describes one season belongs to that season instead.
 */
export function Identity({ career, onClub, variant = 'full' }: Props) {
  const { t, lang, country, trophyShort } = useI18n()
  const { player } = career
  const club = CLUB_BY_ID[player.clubId]
  const league = club ? LEAGUE_BY_ID[club.leagueId] : null
  const nation = NATION_BY_NAME[player.nation]
  const stats = totals(career)
  const keeper = isKeeper(player.position)
  const troubled = player.doping || player.bannedUntil !== null || player.reputation < 42

  if (variant === 'strip') {
    return (
      <header className="who">
        {club && <Crest club={club} size="lg" eager />}
        <span className="who-name">{player.name}</span>

        {/* Who it is, in small type. What state he is in, in big type: the two
            numbers a decision actually turns on are read, not squinted at. */}
        <span className="who-meta">
          {nation && <Flag code={nation.flag} title={country(nation.name)} />}
          <span>{t(`pos.${player.position}` as StringKey)}</span>
          {club && (
            <>
              <span className="dot" />
              <span className="who-club">{club.name}</span>
            </>
          )}
        </span>

        <span className="who-fact">
          <i>{t('card.age')}</i>
          <b>{player.age}</b>
        </span>
        <span className="who-fact who-fact--value">
          <i>{t('card.value')}</i>
          <b>{formatValue(player.value, lang)}</b>
        </span>
        <span className={`who-ovr ${rarityClass(player.ovr)}`}>{player.ovr}</span>
      </header>
    )
  }

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

      {/* The shirt you are actually in, said at the size a shirt deserves. */}
      <div className="card-club">
        {club ? (
          <button className="badge" onClick={() => onClub(club.id)} title={t('table.open')}>
            <Crest club={club} size="lg" eager />
            <span className="badge-text">
              <span className="badge-club">{club.name}</span>
              {league && (
                <span className="badge-where">
                  {league.name}, {country(league.country)}
                </span>
              )}
            </span>
          </button>
        ) : (
          <span className="badge-club">{t('card.freeAgent')}</span>
        )}
        {player.onLoan && <span className="tag">{t('card.loan')}</span>}
      </div>

      {/* Age and what you are worth are the two numbers a career is discussed
          in, so they are set at the size the rating is. */}
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

      <Ahead career={career} />

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
 * Where the career has been and where it could still go, as one graphic. The
 * heading names the wedge rather than the line, because the line is obvious and
 * the wedge is the thing you are playing for.
 */
function Ahead({ career }: { career: Career }) {
  const { t } = useI18n()
  const { player } = career
  const toNext = pointsToNextRarity(player.ovr)

  return (
    <div className="ahead">
      <div className="ahead-top">
        <span className="ahead-k">{t('card.ceiling')}</span>
        <span className="ahead-range">
          {player.potMin}
          <i>{t('card.rangeTo')}</i>
          {player.potMax}
        </span>
      </div>
      <Trajectory career={career} />
      {toNext && (
        <div className={`ahead-next ${rarityClass(player.ovr + toNext.points)}`}>
          <i />
          <b>{toNext.points}</b>
          {t('rar.toNext', { rarity: t(`rar.${toNext.rarity}` as StringKey) })}
        </div>
      )}
    </div>
  )
}
