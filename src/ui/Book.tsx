import { useMemo, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEGENDS, flagOf, searchLegends, type Legend } from '../data/players'
import { NOW, posGroup, type PosGroup } from '../engine/quiz'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag } from './bits'
import { useBook } from './useBook'
import { TrophyRow } from './trophies'

type Sort = 'famous' | 'name' | 'clubs' | 'honours' | 'young'
type Filter = 'all' | PosGroup

const SORTS: Sort[] = ['famous', 'name', 'clubs', 'honours', 'young']
const FILTERS: Filter[] = ['all', 'GK', 'DEF', 'MID', 'ATT']

/** How many are drawn before the list asks you to be more specific. */
const PAGE = 60

/**
 * The book itself, open.
 *
 * Both quizzes are played out of one list of real footballers, and there is no
 * reason to keep it shut. You can look somebody up, see where he actually went
 * and what he actually won, and go back to the grid knowing one more name than
 * you did. It is also the fastest way to find out that the man you were sure
 * about never played there.
 */
export function Book({ onExit }: { onExit: () => void }) {
  const { t, country, position, num } = useI18n()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('famous')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const book = useBook()

  const list = useMemo(() => {
    const base = query.trim() ? searchLegends(query, 200) : LEGENDS
    const kept = filter === 'all' ? base : base.filter((l) => posGroup(l.position) === filter)
    const sorted = [...kept]
    // twenty thousand names sorted alphabetically opens on somebody nobody has
    // heard of, so the book opens on the men it is worth opening on
    if (sort === 'famous') sorted.sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name))
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'clubs') sorted.sort((a, b) => b.careerClubs.length - a.careerClubs.length)
    if (sort === 'honours') sorted.sort((a, b) => b.honours.length - a.honours.length)
    if (sort === 'young') sorted.sort((a, b) => b.born - a.born)
    return sorted
  }, [query, sort, filter, book.count])

  const shown = list.slice(0, PAGE)

  return (
    <div className="flow game">
      <div className="rule-head">
        <h2>{t('book.title')}</h2>
        <button className="act act--quiet" onClick={onExit}>
          {t('quiz.back')}
        </button>
      </div>

      <p className="kicker kicker--loud">{t('book.blurb', { n: num(book.count) })}</p>
      <p className="hint">
        {t('book.source')}{' '}
        {book.built ? t('book.built', { date: book.built }) : t('book.builtNever')}
      </p>

      <input
        className="ruled"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('book.search')}
        autoComplete="off"
        spellCheck={false}
        aria-label={t('book.search')}
      />

      <div className="tempo tempo--wrap" role="group" aria-label={t('book.filter')}>
        {FILTERS.map((f) => (
          <button key={f} className={f === filter ? 'on' : undefined} onClick={() => setFilter(f)}>
            {f === 'all' ? t('book.everyone') : t(`group.${f}` as StringKey)}
          </button>
        ))}
      </div>

      <div className="tempo tempo--wrap" role="group" aria-label={t('book.sort')}>
        {SORTS.map((s) => (
          <button key={s} className={s === sort ? 'on' : undefined} onClick={() => setSort(s)}>
            {t(`book.sort.${s}` as StringKey)}
          </button>
        ))}
      </div>

      <p className="hint">
        {list.length > PAGE
          ? t('book.showing', { n: PAGE, of: num(list.length) })
          : t('book.found', { n: list.length })}
      </p>

      <div className="book">
        {shown.map((l) => (
          <Entry
            key={l.id}
            legend={l}
            open={open === l.id}
            onToggle={() => setOpen(open === l.id ? null : l.id)}
            country={country}
            position={position}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

interface EntryProps {
  legend: Legend
  open: boolean
  onToggle: () => void
  country: (n: string) => string
  position: (p: Legend['position']) => string
  t: (k: StringKey, v?: Record<string, string | number>) => string
}

function Entry({ legend, open, onToggle, country, position, t }: EntryProps) {
  const club = CLUB_BY_ID[legend.clubId]
  return (
    <div className={`entry${open ? ' entry--open' : ''}`}>
      <button className="entry-head" onClick={onToggle} aria-expanded={open}>
        {club && <Crest club={club} />}
        <span className="entry-who">
          <b>{legend.name}</b>
          <span className="entry-meta">
            {position(legend.position)} · {club?.name ?? '—'} ·{' '}
            {legend.retired
              ? t('book.finished')
              : t('book.age', { n: NOW - legend.born })}
          </span>
        </span>
        <Flag code={flagOf(legend.nation)} title={country(legend.nation)} />
      </button>

      {open && (
        <div className="entry-body">
          <div className="entry-path">
            {legend.clubs.map((id, i) => {
              const c = CLUB_BY_ID[id]
              return (
                <span className="reveal-step" key={`${id}-${i}`}>
                  {c && <Crest club={c} />}
                  <b>{c?.name ?? id}</b>
                </span>
              )
            })}
          </div>
          <div className="entry-facts">
            <span>{country(legend.nation)}</span>
            <span>{t('book.born', { n: legend.born })}</span>
            <span>{t('book.clubs', { n: legend.careerClubs.length })}</span>
            <span>{t('book.countries', { n: legend.countries.length })}</span>
          </div>
          {legend.honours.length > 0 && (
            <TrophyRow honours={legend.honours} size={26} label={(h) => t(`hon.${h}` as StringKey)} />
          )}
        </div>
      )}
    </div>
  )
}
