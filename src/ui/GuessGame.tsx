import { useEffect, useMemo, useRef, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { clubName, confOf, flagOf, type Legend } from '../data/players'
import { markDaily, newlyEarned, readStats, writeStats, type Award } from '../engine/awards'
import {
  GUESS_LIMIT,
  HINT_ORDER,
  copyText,
  dailySeed,
  dayKey,
  dayNumber,
  initialsOf,
  judge,
  pickTarget,
  shareGuess,
  type Clue,
  type GuessRow,
  type HintKind,
  type Pond,
} from '../engine/quiz'
import { randomSeed } from '../engine/rng'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { roomFromUrl } from '../net/peer'
import { useLobby } from '../net/useLobby'
import { AwardToast } from './Awards'
import { LobbyPanel } from './LobbyPanel'
import { Crest, Flag } from './bits'
import { BookWait, GameTop, PlayerPicker } from './quizbits'
import { useBook } from './useBook'
import { TrophyRow } from './trophies'

const STREAK_KEY = 'career-sim:guess'

type Mode = 'random' | 'daily' | 'online'

const MODES: Mode[] = ['random', 'daily', 'online']
const PONDS: Pond[] = ['all', 'playing', 'legends', 'famous']

interface Streak {
  run: number
  best: number
}

function readStreak(): Streak {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Streak>) : null
    return { run: parsed?.run ?? 0, best: parsed?.best ?? 0 }
  } catch {
    return { run: 0, best: 0 }
  }
}

function writeStreak(s: Streak) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(s))
  } catch {
    // a browser with storage switched off still gets to play
  }
}

interface Props {
  onExit: () => void
  invited?: boolean
}

/**
 * One player, eight guesses, and every wrong name tells you something.
 *
 * Guessing here is not a coin flip. Each name you put in is measured against
 * the one being hidden on seven counts, and each count comes back lit, warm or
 * dead. Warm is the useful one: the same confederation, the same part of the
 * pitch, a career that passed through the club he is at now. Name four men and
 * the fifth is usually obvious, which is the whole game.
 *
 * It can be played against the day, against the book, or against one other
 * person who gets the same man and a race to find him.
 */
export function GuessGame({ onExit, invited }: Props) {
  const { t, position, num } = useI18n()
  const book = useBook()
  const [mode, setMode] = useState<Mode>(invited ? 'online' : 'random')
  const [pond, setPond] = useState<Pond>('all')
  const [seed, setSeed] = useState(randomSeed)
  const [rows, setRows] = useState<GuessRow[]>([])
  const [done, setDone] = useState<'won' | 'lost' | null>(null)
  const [streak, setStreak] = useState<Streak>(readStreak)
  const [shared, setShared] = useState(false)
  const [awards, setAwards] = useState<Award[]>([])
  /** what the other side is doing, when there is another side */
  const [rival, setRival] = useState<{ guesses: number; done?: 'won' | 'lost' } | null>(null)

  const remote = useRef<(msg: Record<string, unknown>) => void>(() => {})
  const lobby = useLobby('guess', (msg) => remote.current(msg))
  const online = mode === 'online'

  useEffect(() => {
    const found = roomFromUrl()
    if (found?.game === 'guess') lobby.enter(found.room)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const target = useMemo(() => pickTarget(seed, [], pond), [seed, pond])
  const left = GUESS_LIMIT - rows.length

  const settle = (outcome: 'won' | 'lost', count: number) => {
    setDone(outcome)
    const next =
      outcome === 'won'
        ? { run: streak.run + 1, best: Math.max(streak.best, streak.run + 1) }
        : { run: 0, best: streak.best }
    setStreak(next)
    writeStreak(next)

    const before = readStats()
    const after = { ...before, guessPlayed: before.guessPlayed + 1 }
    if (outcome === 'won') {
      after.guessWon += 1
      if (count === 1) after.guessOne += 1
      if (count <= 3) after.guessFast += 1
    }
    after.streakBest = Math.max(after.streakBest, next.best)
    if (online) {
      after.onlinePlayed += 1
      // a duel is won by finding him at all, and by finding him first
      if (outcome === 'won' && (!rival || rival.done !== 'won' || rival.guesses > count))
        after.onlineWon += 1
    }
    const final = mode === 'daily' ? markDaily(after, dayKey()) : after
    writeStats(final)
    setAwards(newlyEarned(before, final))
    if (online) lobby.send({ t: 'done', won: outcome === 'won', n: count })
  }

  const guess = (legend: Legend) => {
    if (done) return
    const row = judge(legend, target)
    const next = [row, ...rows]
    setRows(next)
    if (online) lobby.send({ t: 'progress', n: next.length })
    if (row.correct) settle('won', next.length)
    else if (next.length >= GUESS_LIMIT) settle('lost', next.length)
  }

  const restart = (nextSeed: number, tell = true) => {
    setSeed(nextSeed)
    setRows([])
    setDone(null)
    setShared(false)
    setAwards([])
    setRival(online ? { guesses: 0 } : null)
    if (tell && online && lobby.isHost) lobby.send({ t: 'setup', seed: nextSeed, pond })
  }

  const again = () => restart(mode === 'daily' ? dailySeed('guess') : randomSeed())

  remote.current = (msg) => {
    switch (msg.t) {
      case 'setup':
        setPond(String(msg.pond) as Pond)
        restart(Number(msg.seed), false)
        break
      case 'progress':
        setRival((r) => ({ guesses: Number(msg.n), done: r?.done }))
        break
      case 'done':
        setRival({ guesses: Number(msg.n), done: msg.won ? 'won' : 'lost' })
        break
      default:
        break
    }
  }

  // A clue for every wrong name, in the order they give the most away.
  const hints = HINT_ORDER.slice(0, Math.min(rows.length, HINT_ORDER.length))

  const hintText = (kind: HintKind): string => {
    switch (kind) {
      case 'confederation':
        return t('guess.hint.confederation', { conf: confOf(target.nation) ?? '—' })
      case 'position':
        return t('guess.hint.position', { position: position(target.position) })
      case 'era':
        return t('guess.hint.era', { decade: Math.floor(target.born / 10) * 10 })
      case 'clubCount':
        return t('guess.hint.clubCount', { n: target.careerClubs.length })
      case 'firstClub':
        return t('guess.hint.firstClub', { club: clubName(target.clubs[0]) })
      case 'initials':
        return t('guess.hint.initials', { initials: initialsOf(target.name) })
    }
  }

  const waitingForHost = online && (!lobby.connected || (!lobby.isHost && !rows.length && !rival))

  // the same rule as the grid: nobody is hidden out of half a book
  if (book.state === 'idle' || book.state === 'loading')
    return <BookWait title={t('guess.title')} onExit={onExit} />

  return (
    <div className="flow game">
      <GameTop title={t('guess.title')} onExit={onExit} />

      <div className="tempo tempo--wrap" role="group" aria-label={t('quiz.board')}>
        {MODES.map((m) => (
          <button
            key={m}
            className={m === mode ? 'on' : undefined}
            onClick={() => {
              setMode(m)
              if (m === 'daily') restart(dailySeed('guess'), false)
              else if (m === 'random') restart(randomSeed(), false)
            }}
          >
            {m === 'daily' ? t('quiz.daily', { n: dayNumber() }) : t(`guess.mode.${m}` as StringKey)}
          </button>
        ))}
      </div>

      {!online && (
        <div className="tempo tempo--wrap" role="group" aria-label={t('guess.pond')}>
          {PONDS.map((pd) => (
            <button
              key={pd}
              className={pd === pond ? 'on' : undefined}
              onClick={() => {
                setPond(pd)
                restart(mode === 'daily' ? dailySeed('guess') : randomSeed(), false)
              }}
            >
              {t(`guess.pond.${pd}` as StringKey)}
            </button>
          ))}
        </div>
      )}

      {online && <LobbyPanel lobby={lobby} hint={t('guess.duelBlurb')} />}

      {online && lobby.connected && lobby.isHost && !rows.length && (
        <div className="act-row">
          <button className="act act--primary" onClick={() => restart(randomSeed())}>
            {t('guess.duelStart')}
          </button>
        </div>
      )}

      <div className="tally">
        <span className="tally-turns">{t('guess.left', { n: left })}</span>
        {online ? (
          <span className="tally-turns">
            {rival?.done
              ? rival.done === 'won'
                ? t('guess.rivalGot', { n: rival.guesses })
                : t('guess.rivalFailed')
              : t('guess.rivalGuesses', { n: rival?.guesses ?? 0 })}
          </span>
        ) : (
          <span className="tally-turns">
            {t('guess.streak')} <b>{num(streak.run)}</b> · {t('guess.best')} <b>{num(streak.best)}</b>
          </span>
        )}
      </div>

      {!done && !waitingForHost && (
        <PlayerPicker
          label={t('guess.who')}
          placeholder={t('guess.placeholder')}
          exclude={rows.map((r) => r.legend.id)}
          onPick={guess}
          emptyLabel={t('grid.noMatch')}
        />
      )}

      {done && (
        <div className={`verdict ${done === 'won' ? 'verdict--in' : 'verdict--out'}`} role="status">
          <strong>{done === 'won' ? t('guess.won', { n: rows.length }) : t('guess.lost')}</strong>
          <Reveal legend={target} />
          <div className="act-row">
            <button className="act act--primary" onClick={again}>
              {t('guess.again')}
            </button>
            <button
              className="act act--quiet"
              onClick={async () => {
                const text = shareGuess(rows, {
                  title: t('guess.title'),
                  day: mode === 'daily' ? dayNumber() : undefined,
                  won: done === 'won',
                })
                if (await copyText(text)) setShared(true)
              }}
            >
              {shared ? t('quiz.copied') : t('quiz.share')}
            </button>
          </div>
        </div>
      )}

      {!done && hints.length > 0 && (
        <section className="clues">
          <div className="rule-head">
            <h2>{t('guess.clues')}</h2>
            <span className="aside">{hints.length}</span>
          </div>
          {hints.map((h) => (
            <p className="clue" key={h}>
              {hintText(h)}
            </p>
          ))}
        </section>
      )}

      {!done && !rows.length && <p className="hint">{t('guess.blurb')}</p>}

      <div className="guesses">
        {rows.map((row) => (
          <GuessCard key={row.legend.id} row={row} />
        ))}
      </div>

      {!done && rows.length > 0 && (
        <div className="act-row">
          <button className="act act--quiet" onClick={() => settle('lost', rows.length)}>
            {t('guess.giveUp')}
          </button>
        </div>
      )}

      <AwardToast awards={awards} onDone={() => setAwards([])} />
    </div>
  )
}

/** Who it was, where he went, and what he won. */
function Reveal({ legend }: { legend: Legend }) {
  const { country, t } = useI18n()
  return (
    <div className="reveal">
      <span className="reveal-name">
        <Flag code={flagOf(legend.nation)} title={country(legend.nation)} />
        {legend.name}
      </span>
      <span className="reveal-path">
        {legend.clubs.map((id, i) => {
          const club = CLUB_BY_ID[id]
          return (
            <span className="reveal-step" key={`${id}-${i}`}>
              {club && <Crest club={club} />}
              <b>{club?.name ?? id}</b>
            </span>
          )
        })}
      </span>
      <TrophyRow honours={legend.honours} label={(h) => t(`hon.${h}` as StringKey)} />
    </div>
  )
}

/** One guess: who you said, and what each of the counts came back as. */
function GuessCard({ row }: { row: GuessRow }) {
  const { t, country, position } = useI18n()
  const l = row.legend
  const club = CLUB_BY_ID[l.clubId]
  const league = club ? LEAGUE_BY_ID[club.leagueId] : undefined

  const value = (clue: Clue): string => {
    switch (clue.key) {
      case 'nation':
        return country(l.nation)
      case 'position':
        return l.position
      case 'born':
        return String(l.born)
      case 'league':
        return league?.name ?? '—'
      case 'club':
        return club?.name ?? '—'
      case 'clubs':
        return String(l.careerClubs.length)
      case 'titles':
        return String(l.honours.length)
    }
  }

  return (
    <div className={`guessrow${row.correct ? ' guessrow--right' : ''}`}>
      <div className="guessrow-who">
        {club && <Crest club={club} />}
        <b>{l.name}</b>
        <Flag code={flagOf(l.nation)} title={country(l.nation)} />
      </div>
      <div className="chips">
        {row.clues.map((clue) => (
          <span className={`chip chip--${clue.verdict}`} key={clue.key}>
            <i>{t(`guess.col.${clue.key}` as StringKey)}</i>
            <b title={clue.key === 'position' ? position(l.position) : undefined}>
              {value(clue)}
              {clue.arrow && (
                <span className="chip-arrow" aria-hidden="true">
                  {clue.arrow === 'up' ? '↑' : '↓'}
                </span>
              )}
            </b>
          </span>
        ))}
      </div>
    </div>
  )
}
