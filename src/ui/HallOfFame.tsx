import { useEffect, useMemo } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { NATION_BY_NAME } from '../data/nations'
import {
  CAREER_AWARDS,
  careerAwardsEarned,
  computeCabinetStats,
  isCareerAwardEarned,
  type CareerAward,
  type CareerCabinetStats,
} from '../engine/careerAwards'
import { readChallenges } from '../engine/challenges'
import { totals } from '../engine/career'
import { careerScore, majorCount, trophyCounts } from '../engine/legacy'
import { bestCareer, personalBests, type PersonalRecord } from '../engine/records'
import { listCareers } from '../engine/storage'
import { isKeeper } from '../engine/sim'
import type { Career } from '../engine/types'
import type { MilestoneId } from '../engine/milestones'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag, TrophyIcon, formatValue, seasonLabel } from './bits'
import { ChallengeBoard } from './Challenges'
import { PlayerCard } from './PlayerCard'
import { GreatestMoment, LegacyBlock } from './Timeline'
import { HonourTrophy } from './trophies'

/**
 * The archive.
 *
 * Every career this browser has ever played, what the best of them was, what
 * has been asked of you that you have not yet done, and the records the whole
 * lot of them add up to. Nothing here is a save of its own: it reads the same
 * list the home screen does and recomputes everything live, so a deleted
 * career quietly drops back out rather than leaving a number behind that
 * nothing backs up any more.
 */
export function HallOfFameScreen({
  onExit,
  onOpen,
}: {
  onExit: () => void
  onOpen: (career: Career) => void
}) {
  const { t, num } = useI18n()
  const careers = useMemo(() => listCareers(), [])
  const retired = useMemo(() => careers.filter((c) => c.phase === 'retired'), [careers])
  const stats = useMemo(() => computeCabinetStats(careers), [careers])
  const records = useMemo(() => personalBests(careers), [careers])
  const best = useMemo(() => bestCareer(careers), [careers])
  const log = useMemo(() => readChallenges(), [])
  const have = careerAwardsEarned(stats)

  const ranked = useMemo(
    () =>
      [...retired]
        .map((career) => ({ career, score: careerScore(career), stats: totals(career) }))
        .sort((a, b) => b.score - a.score),
    [retired],
  )

  return (
    <div className="flow game">
      <div className="rule-head">
        <h2>{t('hof.title')}</h2>
        <button className="act act--quiet" onClick={onExit}>
          {t('quiz.back')}
        </button>
      </div>

      {best ? (
        <LegacyHero career={best} onOpen={() => onOpen(best)} />
      ) : (
        <p className="note">{t('hof.empty')}</p>
      )}

      <section>
        <div className="rule-head">
          <h2>{t('ch.title')}</h2>
        </div>
        <ChallengeBoard log={log} />
      </section>

      {records.length > 0 && (
        <section>
          <div className="rule-head">
            <h2>{t('rec.title')}</h2>
            <span className="aside">{records.length}</span>
          </div>
          <div className="records">
            {records.map((r) => (
              <RecordRow key={r.id} record={r} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="rule-head">
          <h2>{t('hof.legends')}</h2>
          <span className="aside">{ranked.length}</span>
        </div>

        {ranked.length === 0 ? (
          <p className="note">{t('hof.empty')}</p>
        ) : (
          <div className="legends">
            {ranked.map(({ career, score, stats: s }, i) => {
              const club = CLUB_BY_ID[career.player.clubId]
              return (
                <button className="legend-row" key={career.id} onClick={() => onOpen(career)}>
                  <span className="legend-rank">{i + 1}</span>
                  {club && <Crest club={club} />}
                  <span className="legend-who">
                    <span className="legend-name">{career.player.name}</span>
                    <span className="legend-meta">
                      {t(`pos.${career.player.position}` as StringKey)} ·{' '}
                      {seasonLabel(career.startYear)}
                      {'–'}
                      {seasonLabel(career.season)}
                    </span>
                  </span>
                  <span className="legend-nums">
                    <b>{s.peakOvr}</b>
                    <b>{num(career.trophies.length)}</b>
                    <b>{num(career.history.length)}</b>
                    <b>{num(score)}</b>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="rule-head">
          <h2>{t('award.title')}</h2>
          <span className="aside">{t('award.blurb', { n: have, of: CAREER_AWARDS.length })}</span>
        </div>
        <div className="cabinet">
          {CAREER_AWARDS.map((a) => (
            <Shelf key={a.id} award={a} stats={stats} />
          ))}
        </div>
      </section>

      <section>
        <div className="rule-head">
          <h2>{t('hof.ledger')}</h2>
        </div>
        <div className="counts">
          {(
            [
              ['hof.st.careersRetired', stats.careersRetired],
              ['hof.st.bestPeakOvr', stats.bestPeakOvr],
              ['hof.st.totalGoals', stats.totalGoals],
              ['hof.st.totalApps', stats.totalApps],
              ['hof.st.totalMajors', stats.totalMajors],
              ['hof.st.ballonDors', stats.ballonDors],
              ['hof.st.worldCups', stats.worldCups],
              ['hof.st.oneClubCareers', stats.oneClubCareers],
              ['hof.st.longestSeasons', stats.longestSeasons],
              ['hof.st.iconCareers', stats.iconCareers],
              ['hof.st.cleanLegends', stats.cleanLegends],
            ] as [StringKey, number][]
          ).map(([key, value]) => (
            <div className="counts-row" key={key}>
              <span>{t(key)}</span>
              <b>{num(value)}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/**
 * The best career there has ever been, given the room a headline deserves.
 *
 * It is the answer to the only question somebody opens this screen with, so it
 * is the first thing on it: the card, the five numbers a career is quoted in,
 * what it won, and the one line it would be remembered by.
 */
export function LegacyHero({ career, onOpen }: { career: Career; onOpen?: () => void }) {
  const { t, num, country } = useI18n()
  const stats = totals(career)
  const nation = NATION_BY_NAME[career.player.nation]
  const keeper = isKeeper(career.player.position)
  const counts = trophyCounts(career)
  const first = career.history[0]
  const majors = majorCount(career)

  // The honours worth naming out loud, biggest first, at most three of them.
  const named = [...counts.entries()]
    .filter(([id]) => id === 'ballondor' || id === 'worldcup' || id === 'continental')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const figures: { k: string; v: string }[] = [
    { k: t('table.ovr'), v: String(stats.peakOvr) },
    {
      k: keeper ? t('recap.cleanSheets') : t('recap.goals'),
      v: num(keeper ? stats.cleanSheets : stats.goals + stats.natGoals),
    },
    { k: t('recap.apps'), v: num(stats.apps + stats.natApps) },
    { k: t('recap.titles'), v: num(majors) },
    { k: t('recap.clubs'), v: num(stats.clubs) },
  ]

  return (
    <section className="hero">
      <div className="hero-card">
        <PlayerCard career={career} onClick={onOpen} />
      </div>

      <div className="hero-body">
        <p className="kicker kicker--loud">{t('hof.yourLegacy')}</p>
        <h2 className="hero-name">{career.player.name}</h2>
        <div className="hero-id">
          {nation && <Flag code={nation.flag} title={country(nation.name)} />}
          <span>{t(`pos.${career.player.position}` as StringKey)}</span>
          {nation && <span className="dot" />}
          {nation && <span>{country(nation.name)}</span>}
          <span className="dot" />
          <span>
            {first ? first.age : 16} → {career.player.age}
          </span>
        </div>

        <div className="hero-figures">
          {figures.map((f) => (
            <div className="hero-fig" key={f.k}>
              <b>{f.v}</b>
              <i>{f.k}</i>
            </div>
          ))}
        </div>

        {named.length > 0 && (
          <div className="hero-honours">
            {named.map(([id, n]) => (
              <span className="hero-honour" key={id}>
                <TrophyIcon id={id} size={14} />
                <b>{n}×</b>
                {t(`trophy.short.${id}` as StringKey)}
              </span>
            ))}
          </div>
        )}

        <LegacyBlock career={career} compact />
        <GreatestMoment career={career} />
      </div>
    </section>
  )
}

function RecordRow({ record }: { record: PersonalRecord }) {
  const { t, num, lang } = useI18n()
  const value =
    record.id === 'value'
      ? formatValue(record.value, lang)
      : record.id === 'debut-age'
        ? t('rec.atAge', { age: record.value })
        : num(record.value)
  return (
    <div className="record">
      <span className="record-k">{t(`rec.${record.id}` as StringKey)}</span>
      <span className="record-v">{value}</span>
      <span className="record-by">{record.by}</span>
    </div>
  )
}

function Shelf({ award, stats }: { award: CareerAward; stats: CareerCabinetStats }) {
  const { t } = useI18n()
  const { at, of } = award.progress(stats)
  const got = isCareerAwardEarned(award, stats)
  return (
    <div className={`shelf${got ? ' shelf--won' : ''}`}>
      <span className="shelf-art">
        <HonourTrophy honour={award.art} size={40} />
      </span>
      <span className="shelf-name">{t(`hof.award.${award.id}` as StringKey)}</span>
      <span className="shelf-how">{t(`hof.award.${award.id}.how` as StringKey)}</span>
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

/** The moment a retirement adds a new shelf to the hall of fame. */
export function CareerAwardToast({
  awards,
  onDone,
}: {
  awards: CareerAward[]
  onDone: () => void
}) {
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
            {t(`hof.award.${a.id}` as StringKey)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * What just happened, said once and out of the way. A blitz click can play
 * five seasons at once, so this lists everything the whole batch crossed
 * rather than only whatever the currently open season panel happens to show.
 */
export function MilestoneToast({
  milestones,
  onDone,
}: {
  milestones: MilestoneId[]
  onDone: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    if (!milestones.length) return
    const timer = setTimeout(onDone, 5200)
    return () => clearTimeout(timer)
  }, [milestones, onDone])

  if (!milestones.length) return null

  return (
    <div className="toast" role="status">
      {milestones.map((m, i) => (
        <div className="toast-row" key={`${m}-${i}`}>
          <span>
            <b>{t('milestone.won')}</b>
            {t(`milestone.${m}` as StringKey)}
          </span>
        </div>
      ))}
    </div>
  )
}
