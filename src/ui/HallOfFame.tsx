import { useEffect, useMemo } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import {
  CAREER_AWARDS,
  careerAwardsEarned,
  computeCabinetStats,
  isCareerAwardEarned,
  type CareerAward,
  type CareerCabinetStats,
} from '../engine/careerAwards'
import { careerScore, totals } from '../engine/career'
import { listCareers } from '../engine/storage'
import type { Career } from '../engine/types'
import type { MilestoneId } from '../engine/milestones'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, seasonLabel } from './bits'
import { HonourTrophy } from './trophies'

/**
 * Every career you have ever retired in this browser, ranked, plus what that
 * adds up to across all of them. Nothing here is a save of its own: it reads
 * the same list the home screen does and recomputes the totals live, so a
 * deleted career quietly drops back out rather than leaving a stat behind
 * that nothing backs up any more.
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

      <p className="kicker kicker--loud">{t('award.blurb', { n: have, of: CAREER_AWARDS.length })}</p>

      <div className="cabinet">
        {CAREER_AWARDS.map((a) => (
          <Shelf key={a.id} award={a} stats={stats} />
        ))}
      </div>

      <div className="rule-head" style={{ marginTop: 'var(--s6)' }}>
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
                    {t(`pos.${career.player.position}` as StringKey)} · {seasonLabel(career.startYear)}
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

      <div className="rule-head" style={{ marginTop: 'var(--s6)' }}>
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
