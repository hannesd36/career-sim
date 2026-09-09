import { LEAGUE_BY_ID } from '../data/leagues'
import { callupFor } from '../engine/callup'
import { detectMilestones, isTierMilestone } from '../engine/milestones'
import { rarityClass, rarityOf } from '../engine/rarity'
import { isDefender, isKeeper } from '../engine/sim'
import type { Career, SeasonRecord } from '../engine/types'
import { useI18n, type Translator } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Delta, formatValue, ordinal, roleClass, seasonLabel } from './bits'
import { ObjectiveVerdict, Press } from './CareerExtras'
import { RivalNews } from './Rival'

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
  const { t, num, role, country, lang } = i18n
  const league = LEAGUE_BY_ID[record.leagueId]
  const keeper = isKeeper(career.player.position)
  const defender = isDefender(career.player.position)
  const delta = record.ovrEnd - record.ovrStart
  const crossed =
    rarityOf(record.ovrEnd) !== rarityOf(record.ovrStart) && record.ovrEnd > record.ovrStart

  // A tier crossing already gets the promotion banner below; this row is for
  // everything else worth stopping on, the season it actually happened.
  const seasonIndex = career.history.indexOf(record)
  const milestones =
    seasonIndex >= 0 ? detectMilestones(career, seasonIndex).filter((m) => !isTierMilestone(m)) : []

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

  /*
   * The price, and only when it moved enough to mean something.
   *
   * Saves written before the season started carrying a value have none, and
   * the block simply does not appear for them: an inferred number would be a
   * worse answer than no number.
   */
  const index = career.history.indexOf(record)
  const before = index > 0 ? career.history[index - 1].value : undefined
  const value =
    record.value === undefined || record.value <= 0
      ? null
      : (() => {
          const from = before === undefined ? null : before
          const ratio = from && from > 0 ? record.value! / from : Infinity
          // A price that barely moved is not news. A doubling is.
          if (from !== null && ratio < 1.6 && ratio > 0.65) return null
          return { from, to: record.value!, up: from === null || record.value! > from }
        })()

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

      {/* What the club had asked for, and what the season made of it. It sits
          above the numbers because it is the sentence they are an answer to. */}
      <ObjectiveVerdict career={career} record={record} />

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

      {/*
       * Crossing a tier is the loudest thing a rating ever does, so it is the
       * one place a season report is allowed to shout: the class you have just
       * joined, set as a headline, with the number that got you there. The top
       * of the scale gets its own line, because it happens once.
       */}
      {crossed && (
        <div
          className={`promotion ${rarityClass(record.ovrEnd)}${
            record.ovrEnd >= 99 ? ' promotion--top' : ''
          }`}
          key={record.ovrEnd}
        >
          <span className="promotion-k">{t('rar.newLevel')}</span>
          <strong className="promotion-tier">
            {t(`rar.${rarityOf(record.ovrEnd)}` as StringKey)}
          </strong>
          <span className="promotion-ovr">{record.ovrEnd}</span>
          <span className="promotion-sub">
            {record.ovrEnd >= 99 ? t('rar.theTop') : t('rar.promotedSub', { ovr: record.ovrEnd })}
          </span>
        </div>
      )}

      {/* What the market made of the year. Only a move worth noticing is
          shown: a career reads its own price as a signal, not as a ledger. */}
      {value && (
        <div className={`worth${value.up ? ' worth--up' : ''}`}>
          <span className="worth-k">{t('season.value')}</span>
          {value.from !== null && (
            <>
              <span className="worth-was">{formatValue(value.from, lang)}</span>
              <span className="worth-arrow" aria-hidden="true">
                →
              </span>
            </>
          )}
          <span className="worth-now">{formatValue(value.to, lang)}</span>
          <span className="worth-say">{t(value.up ? 'season.valueUp' : 'season.valueDown')}</span>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="milestones">
          {milestones.map((m) => (
            <span className="milestone-chip" key={m}>
              {t(`milestone.${m}` as StringKey)}
            </span>
          ))}
        </div>
      )}

      <Press career={career} record={record} />

      <div className="notes">
        {/* what the other one from your year group did with the same summer */}
        <RivalNews career={career} season={record.season} />
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

  /*
   * The national team, as a moment rather than a number.
   *
   * The squad announcement comes first because it is the thing that happened;
   * the caps and goals are the detail underneath it. A season that produced no
   * caps used to say nothing at all, which is exactly the season worth a line:
   * being dropped, being left out of a tournament, or having a year good
   * enough that the silence is the story.
   */
  const callup = callupFor(
    career,
    record,
    career.history.find((s) => s.season === record.season - 1) ?? null,
  )
  if (callup) {
    notes.push({
      text: t(`cu.${callup.id}` as StringKey, { nation: country(callup.nation) }),
      loud: callup.tone === 'bad',
    })
  }

  if (record.natApps > 0) {
    const nation = country(career.player.nation)
    // The first cap is already said above, so this is only ever the tally.
    const firstEver = !career.history.some((s) => s.season < record.season && s.natApps > 0)
    if (!firstEver || record.natGoals > 0) {
      notes.push({
        text:
          record.natGoals > 0
            ? t('season.capsGoals', { n: record.natApps, nation, goals: record.natGoals })
            : t('season.caps', { n: record.natApps, nation }),
      })
    }
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
