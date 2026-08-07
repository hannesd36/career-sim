import { LEAGUE_BY_ID } from '../data/leagues'
import { rarityClass, rarityOf } from '../engine/rarity'
import { isDefender, isKeeper } from '../engine/sim'
import type { Career, SeasonRecord } from '../engine/types'
import { useI18n, type Translator } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Delta, ordinal, roleClass, seasonLabel } from './bits'

interface Props {
  career: Career
  record: SeasonRecord
  onClub: (clubId: string, season?: number) => void
  /** set when an old season is being read rather than the one just played */
  onBack?: () => void
}

/**
 * One season, in full, in the left hand column: what the year was, what it did
 * to the rating, and what you decided while it was going on. The rail decides
 * which season this is, so the same panel serves the one you have just lived
 * and the one you went back to look at.
 */
export function SeasonPanel({ career, record, onClub, onBack }: Props) {
  const i18n = useI18n()
  const { t, num, role, country } = i18n
  const league = LEAGUE_BY_ID[record.leagueId]
  const keeper = isKeeper(career.player.position)
  const defender = isDefender(career.player.position)
  const delta = record.ovrEnd - record.ovrStart
  const crossed =
    rarityOf(record.ovrEnd) !== rarityOf(record.ovrStart) && record.ovrEnd > record.ovrStart

  const stats = keeper
    ? [
        { k: t('card.apps'), v: record.apps },
        { k: t('card.cleanSheets'), v: record.cleanSheets },
        { k: t('season.conceded'), v: record.conceded },
        { k: t('season.saves'), v: record.saves },
        { k: t('season.rating'), v: record.rating > 0 ? record.rating.toFixed(2) : '·' },
      ]
    : [
        { k: t('card.apps'), v: record.apps },
        { k: t('card.goals'), v: record.goals },
        { k: t('card.assists'), v: record.assists },
        {
          k: defender ? t('season.tackles') : t('season.keyPasses'),
          v: defender ? record.tackles : record.keyPasses,
        },
        { k: t('season.rating'), v: record.rating > 0 ? record.rating.toFixed(2) : '·' },
      ]

  const decisions = career.eventLog.filter((e) => e.season === record.season)

  return (
    <section className="dispatch">
      <div className="dispatch-head">
        <div style={{ minWidth: 0 }}>
          <p className="kicker">{onBack ? t('rail.reading') : t('rail.justPlayed')}</p>
          <h2>{seasonLabel(record.season)}</h2>
          <div className="dispatch-sub">
            <button
              className="club-tag"
              onClick={() => onClub(record.clubId, record.season)}
              title={t('table.open')}
            >
              <Crest club={{ name: record.clubName, badge: record.badge }} />
              {record.clubName}
            </button>
            {!record.banned && (
              <span className={`tag ${roleClass(record.role)}`}>{role(record.role)}</span>
            )}
            <span>{t('season.minutes', { minutes: num(record.minutes) })}</span>
            <span className="dot" />
            <span>
              {league.name}, {country(league.country)}
            </span>
          </div>
        </div>
        <Delta value={delta} size="lg" />
      </div>

      {!record.banned && (
        <div className="readout" style={{ borderTop: 'none' }}>
          {stats.map((s) => (
            <div className="readout-cell" key={s.k}>
              <div className="readout-k">{s.k}</div>
              <div className="readout-v">{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {record.caught && (
        <div className="busted">
          <span>{t('season.caught')}</span>
          <Delta value={-12} />
          <span>{t('card.banned', { season: record.season + 3 })}</span>
        </div>
      )}

      {crossed && (
        <div className={`promotion ${rarityClass(record.ovrEnd)}`}>
          <strong>{t(`rar.${rarityOf(record.ovrEnd)}` as StringKey)}</strong>
          <span>{t('rar.promotedSub', { ovr: record.ovrEnd })}</span>
        </div>
      )}

      <div className="notes">
        {notesFor(career, record, i18n).map((n, i) => (
          <div className={`note${n.loud ? ' note--loud' : ''}`} key={i}>
            {n.text}
          </div>
        ))}

        {/* what you decided that year, said in the season it belongs to */}
        {decisions.map((d, i) => (
          <div className={`note note--turn${d.tone === 'bad' ? ' note--bad' : ''}`} key={`d${i}`}>
            {d.id === 'doping-test' ? (
              <b>{t('season.caught')}</b>
            ) : (
              <>
                <b>{t(`ev.${d.id}.${d.choice}` as StringKey)}</b>
                <span>{t(`ev.${d.id}.result.${d.result}` as StringKey)}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {onBack && (
        <div className="act-row" style={{ marginTop: 'var(--s4)' }}>
          <button className="act act--quiet" onClick={onBack}>
            {t('rail.back')}
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * What a season is worth saying out loud. Order matters: silverware, where the
 * club finished, what your body did, the national team, and last the ceiling,
 * which is the only number in the game that moves without you seeing it happen.
 */
function notesFor(
  career: Career,
  record: SeasonRecord,
  { t, lang, country, trophy }: Translator,
): { text: string; loud?: boolean }[] {
  const league = LEAGUE_BY_ID[record.leagueId]
  const notes: { text: string; loud?: boolean }[] = []

  if (record.banned) return [{ text: t('season.banned') }]

  for (const tr of record.trophies) {
    notes.push({ text: t('season.won', { trophy: trophy(tr) }), loud: true })
  }

  notes.push({
    text:
      record.leaguePosition === 1
        ? t('season.finishedTop', { club: record.clubName, league: league.name })
        : t('season.finishedNth', {
            club: record.clubName,
            position: ordinal(record.leaguePosition, lang),
            league: league.name,
          }),
  })

  if (record.gamesMissedInjured > 0) {
    notes.push({ text: t('season.injury', { n: record.gamesMissedInjured }) })
  }

  if (record.natApps > 0) {
    const capped = career.history.some((s) => s.season < record.season && s.natApps > 0)
    const nation = country(career.player.nation)
    notes.push({
      text: capped
        ? record.natGoals > 0
          ? t('season.capsGoals', { n: record.natApps, nation, goals: record.natGoals })
          : t('season.caps', { n: record.natApps, nation })
        : t('season.firstCap', { nation }),
    })
  }

  if (record.redCards > 0) notes.push({ text: t('season.sentOff', { n: record.redCards }) })

  const [beforeLo, beforeHi] = record.ceilingBefore
  const [afterLo, afterHi] = record.ceilingAfter
  const midBefore = (beforeLo + beforeHi) / 2
  const midAfter = (afterLo + afterHi) / 2
  if (Math.abs(midAfter - midBefore) >= 0.75) {
    notes.push({
      text: t(midAfter > midBefore ? 'season.ceilingUp' : 'season.ceilingDown', {
        min: afterLo,
        max: afterHi,
      }),
      loud: midAfter > midBefore,
    })
  } else if (afterHi - afterLo < beforeHi - beforeLo - 1) {
    notes.push({ text: t('season.ceilingSharp', { min: afterLo, max: afterHi }) })
  }

  const best =
    record.rating > 0 &&
    career.history.every((s) => s.season === record.season || s.rating <= record.rating)
  if (best && career.history.length > 2) notes.push({ text: t('season.best'), loud: true })

  return notes
}
