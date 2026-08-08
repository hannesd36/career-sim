import { useEffect, useMemo, useRef, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { flagOf, searchLegends, type Legend } from '../data/players'
import type { Criterion } from '../engine/quiz'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag } from './bits'
import { HonourTrophy } from './trophies'

/** What a criterion is called, in the reader's language. */
export function useCriterionName() {
  const { t, country } = useI18n()
  return (c: Criterion): string => {
    switch (c.kind) {
      case 'club':
        return CLUB_BY_ID[c.id]?.name ?? c.id
      case 'nation':
        return country(c.id)
      case 'league': {
        const l = LEAGUE_BY_ID[c.id]
        // two divisions are called Bundesliga, so the country comes with it
        return l ? `${l.name} · ${country(l.country)}` : c.id
      }
      case 'pos':
        return t(`group.${c.id}` as StringKey)
      case 'honour':
        return t(`hon.${c.id}` as StringKey)
      case 'trait':
        return t(`trait.${c.id}` as StringKey)
      case 'era':
        return t(`era.${c.id}` as StringKey)
    }
  }
}

/**
 * A header on the grid: the mark first, then the words. A crest or a flag is
 * read before any label is, which is the whole reason these grids work at a
 * glance, so the mark is never dropped on small screens — the words are.
 */
export function CriterionHead({ criterion }: { criterion: Criterion }) {
  const name = useCriterionName()(criterion)
  const club = criterion.kind === 'club' ? CLUB_BY_ID[criterion.id] : null
  const league = criterion.kind === 'league' ? LEAGUE_BY_ID[criterion.id] : null

  return (
    <div className={`crit crit--${criterion.kind}`} title={name}>
      <span className="crit-mark">
        {club && <Crest club={club} eager />}
        {criterion.kind === 'nation' && <Flag code={flagOf(criterion.id)} title={name} />}
        {league && <Flag code={league.flag} title={name} />}
        {criterion.kind === 'honour' && <HonourTrophy honour={criterion.id} size={22} />}
        {criterion.kind === 'pos' && <span className="crit-pos">{criterion.id}</span>}
        {criterion.kind === 'era' && <span className="crit-era">{criterion.id.slice(1, 4)}</span>}
        {criterion.kind === 'trait' && <span className="crit-dot" aria-hidden="true" />}
      </span>
      <span className="crit-name">{name}</span>
    </div>
  )
}

/** One line about a player: where he is now, what he plays, where he is from. */
export function LegendLine({ legend }: { legend: Legend }) {
  const { position } = useI18n()
  const club = CLUB_BY_ID[legend.clubId]
  return (
    <>
      {club && <Crest club={club} />}
      <span className="pick-who">
        <b>{legend.name}</b>
        <span className="pick-meta">
          {position(legend.position)} · {club?.name ?? ''}
        </span>
      </span>
      <Flag code={flagOf(legend.nation)} title={legend.nation} />
    </>
  )
}

interface PickerProps {
  label: string
  placeholder: string
  /** ids already spent, kept out of the list so nobody wastes a turn */
  exclude?: string[]
  onPick: (legend: Legend) => void
  onCancel?: () => void
  cancelLabel?: string
  emptyLabel: string
}

/**
 * Typing a footballer's name.
 *
 * Nobody spells Kvaratskhelia. The list is the answer to that: three letters
 * and the man is on screen, and the only thing that is ever submitted is a
 * player picked off it, so a game is never lost to a keyboard.
 */
export function PlayerPicker({
  label,
  placeholder,
  exclude = [],
  onPick,
  onCancel,
  cancelLabel,
  emptyLabel,
}: PickerProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const hits = useMemo(() => searchLegends(query, 7, exclude), [query, exclude])

  useEffect(() => {
    setCursor(0)
  }, [query])

  useEffect(() => {
    input.current?.focus()
  }, [])

  const submit = (legend: Legend) => {
    setQuery('')
    onPick(legend)
  }

  return (
    <div className="picker">
      <label className="picker-label" htmlFor="picker-input">
        {label}
      </label>
      <input
        id="picker-input"
        ref={input}
        className="ruled"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setCursor((c) => Math.min(c + 1, hits.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setCursor((c) => Math.max(c - 1, 0))
          } else if (e.key === 'Enter' && hits[cursor]) {
            e.preventDefault()
            submit(hits[cursor])
          } else if (e.key === 'Escape' && onCancel) {
            onCancel()
          }
        }}
      />

      <div className="picks" role="listbox" aria-label={label}>
        {hits.map((legend, i) => (
          <button
            key={legend.id}
            className={`pick${i === cursor ? ' pick--on' : ''}`}
            role="option"
            aria-selected={i === cursor}
            onMouseEnter={() => setCursor(i)}
            onClick={() => submit(legend)}
          >
            <LegendLine legend={legend} />
          </button>
        ))}
        {query.trim() && !hits.length && <p className="picks-empty">{emptyLabel}</p>}
      </div>

      {onCancel && (
        <button className="act act--quiet" onClick={onCancel}>
          {cancelLabel}
        </button>
      )}
    </div>
  )
}
