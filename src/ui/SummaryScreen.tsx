import { NATION_BY_NAME } from '../data/nations'
import { clubSpells, totals } from '../engine/career'
import { legacyOf } from '../engine/legacy'
import { isKeeper } from '../engine/sim'
import type { Career, TrophyId } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import {
  Crest,
  Flag,
  Grade,
  OutputBars,
  Trajectory,
  TrophyIcon,
  formatValue,
  seasonLabel,
} from './bits'
import { CareerTable } from './CareerTable'
import { RivalVerdict } from './Rival'
import { CareerTimeline, GreatestMoment, LegacyBlock } from './Timeline'

interface Props {
  career: Career
  onPlayAgain: () => void
  onBack: () => void
  onClub: (clubId: string, season: number) => void
  /** opens the card, so a finished career can leave the browser as a picture */
  onShare?: () => void
  /** the same brief again: same country, same position, same first club */
  onReplay?: () => void
  /** the one reason to start another career, worked out by the caller */
  nextUp?: React.ReactNode
}

const MAJOR: TrophyId[] = ['worldcup', 'continentalnation', 'continental', 'league', 'cup']

/**
 * The end of a career.
 *
 * It is the only screen in the game given room to breathe, and it has one job:
 * to be the moment a career becomes a story you would tell somebody. So it
 * opens the way anybody would open that story — a name, the years it ran, how
 * good he got — then the six or eight years that were actually about
 * something, then what the whole thing was worth. The tables are still all
 * there underneath, because the numbers are the evidence; they are simply no
 * longer the first thing you meet.
 */
export function SummaryScreen({
  career,
  onPlayAgain,
  onBack,
  onClub,
  onShare,
  onReplay,
  nextUp,
}: Props) {
  const { t, lang, num, country, trophyShort } = useI18n()
  const stats = totals(career)
  const nation = NATION_BY_NAME[career.player.nation]
  const keeper = isKeeper(career.player.position)
  const legacy = legacyOf(career)

  const counts = new Map<TrophyId, number>()
  for (const tr of career.trophies) counts.set(tr.id, (counts.get(tr.id) ?? 0) + 1)
  const majors = MAJOR.reduce((s, id) => s + (counts.get(id) ?? 0), 0)
  const ordered = [
    ...MAJOR.filter((id) => counts.has(id)),
    ...[...counts.keys()].filter((id) => !MAJOR.includes(id)),
  ]

  // the years a shirt was actually worn, so the spells read as a timeline
  const years = new Map<string, { from: number; to: number }>()
  for (const s of career.history) {
    if (s.banned) continue
    const span = years.get(s.clubId)
    if (span) span.to = s.season + 1
    else years.set(s.clubId, { from: s.season, to: s.season + 1 })
  }

  // The engine ranks spells by appearances; a career reads in the order it was
  // lived, so the board is put back into the order the shirts were worn.
  const spells = [...clubSpells(career)].sort(
    (a, b) => (years.get(a.club.id)?.from ?? 0) - (years.get(b.club.id)?.from ?? 0),
  )

  const first = career.history[0]
  const last = career.history[career.history.length - 1]
  const startAge = first ? first.age : 16
  const endAge = career.player.age

  // Staying on the programme for seven summers is one decision taken seven
  // times, not seven entries in a list nobody reads to the bottom of.
  const decisions = career.eventLog.reduce<
    {
      season: number
      until: number | null
      id: string
      choice: string
      tone: string
      times: number
    }[]
  >((acc, e) => {
    const prev = acc[acc.length - 1]
    if (prev && prev.id === e.id && prev.choice === e.choice) {
      prev.times += 1
      prev.until = e.season
      return acc
    }
    acc.push({ season: e.season, until: null, id: e.id, choice: e.choice, tone: e.tone, times: 1 })
    return acc
  }, [])

  const verdict: StringKey =
    stats.peakOvr >= 88 && majors >= 5
      ? 'legacy.icon'
      : stats.peakOvr >= 82 || majors >= 3
        ? 'legacy.great'
        : stats.peakOvr >= 72
          ? 'legacy.solid'
          : 'legacy.quiet'

  const figures: { k: string; v: string }[] = [
    { k: t('recap.apps'), v: num(stats.apps + stats.natApps) },
    {
      k: keeper ? t('recap.cleanSheets') : t('recap.goals'),
      v: num(keeper ? stats.cleanSheets : stats.goals + stats.natGoals),
    },
    { k: t('recap.titles'), v: num(majors) },
    { k: t('recap.clubs'), v: num(stats.clubs) },
  ]

  return (
    <div className="flow">
      <header className="legacy-top">
        <p className="kicker kicker--loud">{t('recap.title')}</p>
        <h1 className="legacy-name">{career.player.name}</h1>

        {/* the years it ran, set as the headline number a career really is */}
        <div className="recap-span">
          <span className="recap-span-num">{startAge}</span>
          <span className="recap-span-rule" aria-hidden="true" />
          <span className="recap-span-num">{endAge}</span>
        </div>

        <div className="legacy-span">
          {nation && <Flag code={nation.flag} title={country(nation.name)} />}
          <span>{t(`pos.${career.player.position}` as StringKey)}</span>
          {nation && <span className="dot" />}
          {nation && <span>{country(nation.name)}</span>}
          <span className="dot" />
          <span>{t('summary.meta', { seasons: career.history.length, clubs: stats.clubs })}</span>
        </div>

        <div className="legacy-close">
          <p className="legacy-verdict">{t(verdict)}</p>
          <div className="legacy-grade">
            <span className="legacy-peak">{t('summary.peak')}</span>
            <Grade ovr={stats.peakOvr} />
          </div>
        </div>

        <div className="recap-figures">
          {figures.map((f) => (
            <div className="recap-fig" key={f.k}>
              <b>{f.v}</b>
              <i>{f.k}</i>
            </div>
          ))}
        </div>
      </header>

      {/* What the career was actually about, in the order it happened. */}
      <section>
        <div className="rule-head">
          <h2>{t('recap.highlights')}</h2>
          <span className="aside">
            {first ? seasonLabel(first.season) : ''}
            {last ? `–${seasonLabel(last.season)}` : ''}
          </span>
        </div>
        <CareerTimeline career={career} />
      </section>

      {/* What it was all worth, and the one clear reason to go again. */}
      <section>
        <div className="rule-head">
          <h2>{t('recap.legacy')}</h2>
        </div>
        <LegacyBlock career={career} />
        <GreatestMoment career={career} />
        <RivalVerdict career={career} />
        {nextUp}
        <div className="act-row" style={{ marginTop: 'var(--s5)' }}>
          <button className="act act--primary" onClick={onPlayAgain}>
            {t('recap.newCareer')}
          </button>
          {onReplay && (
            <button className="act" onClick={onReplay} title={t('recap.replayHint')}>
              {t('recap.replay')}
            </button>
          )}
          {onShare && (
            <button className="act act--quiet" onClick={onShare}>
              {t('share.open')}
            </button>
          )}
        </div>
      </section>

      <section>
        {/* the whole thing as one line: sixteen to the day you stopped */}
        {career.history.length >= 2 && <Trajectory career={career} height={150} />}

        <div className="readout" style={{ marginTop: 'var(--s5)' }}>
          <div className="readout-cell">
            <div className="readout-k">{t('card.apps')}</div>
            <div className="readout-v">{stats.apps + stats.natApps}</div>
          </div>
          <div className="readout-cell">
            <div className="readout-k">{keeper ? t('card.cleanSheets') : t('card.goals')}</div>
            <div className="readout-v">
              {keeper ? stats.cleanSheets : stats.goals + stats.natGoals}
            </div>
          </div>
          <div className="readout-cell">
            <div className="readout-k">{t('card.assists')}</div>
            <div className="readout-v">{stats.assists + stats.natAssists}</div>
          </div>
          <div className="readout-cell">
            <div className="readout-k">{t('summary.caps')}</div>
            <div className="readout-v">{stats.natApps}</div>
          </div>
          <div className="readout-cell">
            <div className="readout-k">{t('summary.score')}</div>
            <div className="readout-v">{legacy.total}</div>
          </div>
        </div>

        {career.history.length >= 2 && (
          <div style={{ marginTop: 'var(--s5)' }}>
            <p className="hint" style={{ marginTop: 0, marginBottom: 'var(--s2)' }}>
              {t('summary.output')}
            </p>
            <OutputBars career={career} height={72} />
          </div>
        )}
      </section>

      <section>
        <div className="rule-head">
          <h2>{t('summary.honours')}</h2>
          <span className="aside">
            {career.trophies.length === 0 ? t('summary.empty') : t('summary.majors', { n: majors })}
          </span>
        </div>
        {career.trophies.length > 0 && (
          <div className="honours-roll">
            {ordered.map((id) => (
              <div className={`honour${MAJOR.includes(id) ? ' honour--major' : ''}`} key={id}>
                <TrophyIcon id={id} size={15} />
                {trophyShort(id)}
                <span className="honour-count">×{counts.get(id)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="rule-head">
          <h2>{t('summary.clubs')}</h2>
        </div>
        <div className="spells">
          {spells.map((s) => {
            const span = years.get(s.club.id)
            return (
              <div className="spell" key={s.club.id}>
                <span className="spell-yr">
                  {span ? (span.to - span.from > 1 ? `${span.from}–${span.to}` : span.from) : ''}
                </span>
                <span className="spell-club">
                  <Crest club={s.club} />
                  {s.club.name}
                </span>
                <span className="spell-nums">
                  <span>
                    {t('table.apps')}
                    <b>{s.apps}</b>
                  </span>
                  <span>
                    {keeper ? t('table.cleanSheets') : t('table.goals')}
                    <b>{keeper ? s.cleanSheets : s.goals}</b>
                  </span>
                  <span>
                    {t('table.assists')}
                    <b>{s.assists}</b>
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {decisions.length > 0 && (
        <section>
          <div className="rule-head">
            <h2>{t('summary.decisions')}</h2>
          </div>
          {decisions.map((entry, i) => (
            <div className={`logline${entry.tone === 'bad' ? ' logline--bad' : ''}`} key={i}>
              <span className="logline-yr">
                {seasonLabel(entry.season)}
                {entry.until !== null && ` ${t('card.rangeTo')} ${seasonLabel(entry.until)}`}
              </span>
              <span className="logline-what">
                {entry.id === 'doping-test'
                  ? t('season.caught')
                  : t(`ev.${entry.id}.${entry.choice}` as StringKey)}
              </span>
              {entry.times > 1 && <span className="logline-times">×{entry.times}</span>}
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="rule-head">
          <h2>{t('summary.seasonBySeason')}</h2>
          <span className="aside">
            {t('summary.scoreMeta', {
              seed: career.seed,
              value: formatValue(career.player.value, lang),
            })}
          </span>
        </div>
        <CareerTable career={career} onClub={onClub} />
      </section>

      <div className="act-row">
        <button className="act act--quiet" onClick={onBack}>
          {t('summary.back')}
        </button>
      </div>
    </div>
  )
}
