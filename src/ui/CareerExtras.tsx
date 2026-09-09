import { CLUB_BY_ID } from '../data/clubs'
import { ambitionBoard, nextAmbition, type AmbitionProgress } from '../engine/ambitions'
import { cohortTable } from '../engine/cohort'
import {
  judgeObjective,
  objectiveHave,
  objectiveOf,
  objectiveProgress,
  upcomingObjective,
  type SeasonObjective,
} from '../engine/objectives'
import { headlinesFor } from '../engine/press'
import { rarityClass, rarityOf } from '../engine/rarity'
import type { Career, SeasonRecord } from '../engine/types'
import { useI18n, type Translator } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag, ordinal } from './bits'

/**
 * How a demand is said out loud. The kind decides the sentence and the target
 * fills the blank, so "finish in the top four" and "score twelve" come out of
 * the same call and read like two different sentences rather than two rows of
 * the same table.
 */
export function objectiveText(objective: SeasonObjective, { t, lang }: Translator): string {
  if (objective.kind === 'finish') {
    return t('obj.finish', { position: ordinal(objective.target, lang) })
  }
  if (objective.kind === 'survive') {
    return t('obj.survive', { position: ordinal(objective.target, lang) })
  }
  if (objective.kind === 'rating') {
    return t('obj.rating', { rating: (objective.target / 100).toFixed(2) })
  }
  return t(`obj.${objective.kind}` as StringKey, { n: objective.target })
}

/** The number a demand is at, said the way the demand was said. */
function haveText(objective: SeasonObjective, record: SeasonRecord, lang: 'en' | 'de'): string {
  const have = objectiveHave(objective, record)
  if (objective.kind === 'rating') return (have / 100).toFixed(2)
  if (objective.kind === 'finish' || objective.kind === 'survive') return ordinal(have, lang)
  return String(have)
}

/**
 * What the club is asking for this season, before it is played.
 *
 * It sits directly above the button that plays the season, because the whole
 * point of it is to be read on the way past: a season you go into knowing what
 * is wanted of you is a different season from one you only score afterwards.
 */
export function ObjectiveBrief({ career }: { career: Career }) {
  const i18n = useI18n()
  const { t } = i18n
  const objective = upcomingObjective(career)
  if (!objective) return null
  const club = CLUB_BY_ID[career.player.clubId]

  return (
    <div className="brief">
      <span className="brief-k">{t('obj.thisSeason', { club: club?.name ?? '' })}</span>
      <strong className="brief-ask">{objectiveText(objective, i18n)}</strong>
    </div>
  )
}

/** The same demand afterwards, with what the season actually did about it. */
export function ObjectiveVerdict({ career, record }: { career: Career; record: SeasonRecord }) {
  const i18n = useI18n()
  const { t, lang } = i18n
  const objective = objectiveOf(career, record)
  const verdict = judgeObjective(objective, record)
  if (!objective || !verdict) return null

  const fraction = objectiveProgress(objective, record)
  return (
    <div className={`verdict verdict--${verdict}`}>
      <div className="verdict-top">
        <span className="verdict-ask">{objectiveText(objective, i18n)}</span>
        <span className="verdict-tag">{t(verdict === 'met' ? 'obj.met' : 'obj.missed')}</span>
      </div>
      <div className="verdict-bar">
        <i style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <div className="verdict-foot">
        {haveText(objective, record, lang)}
        <i>/</i>
        {objective.kind === 'rating'
          ? (objective.target / 100).toFixed(2)
          : objective.kind === 'finish' || objective.kind === 'survive'
            ? ordinal(objective.target, lang)
            : objective.target}
      </div>
    </div>
  )
}

/**
 * The five things this career is for, as a list you can watch fill up.
 *
 * Sorted so whatever is nearly done floats to the top and whatever is finished
 * sinks: the list should always open on the thing you could plausibly do next.
 */
export function Ambitions({ career, compact = false }: { career: Career; compact?: boolean }) {
  const { t } = useI18n()
  const rows = ambitionBoard(career)
  const shown = compact ? rows.filter((r) => !r.done).slice(0, 3) : rows

  return (
    <section className={`ambitions${compact ? ' ambitions--compact' : ''}`}>
      {!compact && (
        <div className="ambitions-head">
          <h3>{t('amb.title')}</h3>
          <span>{t('amb.done', { n: rows.filter((r) => r.done).length, of: rows.length })}</span>
        </div>
      )}
      {shown.map((row) => (
        <AmbitionRow key={row.id} row={row} />
      ))}
    </section>
  )
}

function AmbitionRow({ row }: { row: AmbitionProgress }) {
  const { t, num } = useI18n()
  return (
    <div className={`amb${row.done ? ' amb--done' : ''}`}>
      <span className="amb-mark" aria-hidden="true">
        {row.done ? '✓' : ''}
      </span>
      <span className="amb-what">{t(`amb.${row.id}` as StringKey)}</span>
      <span className="amb-nums">
        {num(row.have)}
        <i>/</i>
        {num(row.need)}
      </span>
      <span className="amb-bar">
        <i style={{ width: `${Math.round(row.fraction * 100)}%` }} />
      </span>
    </div>
  )
}

/**
 * The one line above the play button: the nearest thing still undone, and how
 * far away it is. It is the smallest possible version of a reason to click.
 */
export function NextUp({ career }: { career: Career }) {
  const { t, num } = useI18n()
  const next = nextAmbition(career)
  if (!next || next.have === 0) return null
  const left = next.need - next.have
  return (
    <div className="nextup">
      <span className="nextup-bar">
        <i style={{ width: `${Math.round(next.fraction * 100)}%` }} />
      </span>
      <span className="nextup-text">
        {t('amb.toGo', { n: num(left), what: t(`amb.${next.id}` as StringKey) })}
      </span>
    </div>
  )
}

/**
 * Your year group, ranked.
 *
 * Nine other players came through the same summer you did, and this is the only
 * screen in the game that says where a career stands relative to anybody else.
 * Your own row is always in it, and it is the row the table is really about.
 */
export function Cohort({ career }: { career: Career }) {
  const { t, country } = useI18n()
  const rows = cohortTable(career)

  return (
    <section className="cohort">
      <div className="cohort-head">
        <h3>{t('cohort.title')}</h3>
        <span>{t('cohort.age', { age: career.player.age })}</span>
      </div>
      <div className="cohort-rows">
        {rows.map((row) => {
          const club = row.clubId ? CLUB_BY_ID[row.clubId] : null
          return (
            <div className={`peer${row.you ? ' peer--you' : ''}`} key={`${row.name}-${row.rank}`}>
              <span className="peer-rank">{row.rank}</span>
              <span className="peer-who">
                {row.flag ? <Flag code={row.flag} title={country(row.nation)} /> : null}
                <span className="peer-name">{row.name}</span>
                {club && <Crest club={club} />}
              </span>
              <span className="peer-pos">{t(`pos.${row.position}` as StringKey)}</span>
              <span className="peer-goals">{row.goals || '·'}</span>
              <span
                className={`peer-ovr ovr ${rarityClass(row.ovr)}`}
                title={t(`rar.${rarityOf(row.ovr)}` as StringKey)}
                aria-label={`${row.ovr}, ${t(`rar.${rarityOf(row.ovr)}` as StringKey)}`}
              >
                {row.ovr}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * What the papers made of the season, in the register of a match report.
 *
 * The engine hands over ids and numbers; every word of it is written here, so
 * both languages read like somebody wrote them rather than like one was run
 * through the other.
 */
export function Press({ career, record }: { career: Career; record: SeasonRecord }) {
  const { t, country, trophyShort } = useI18n()
  const lines = headlinesFor(career, record)
  if (!lines.length) return null

  return (
    <div className="press">
      {lines.map((line, i) => {
        const params: Record<string, string | number> = { ...line.params }
        if (typeof params.trophy === 'string') {
          params.trophy = trophyShort(params.trophy as never)
        }
        if (typeof params.nation === 'string') params.nation = country(params.nation)
        return (
          <p className={`press-line press-line--${line.tone}`} key={`${line.id}-${i}`}>
            {t(`news.${line.id}` as StringKey, params)}
          </p>
        )
      })}
    </div>
  )
}
