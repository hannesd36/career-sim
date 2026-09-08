import { useEffect, useState } from 'react'
import { LEAGUE_BY_ID } from '../data/leagues'
import {
  CREST_DIFFICULTIES,
  buildCrestRound,
  type CrestDifficulty,
  type CrestRound,
} from '../engine/crestQuiz'
import { Rng, randomSeed } from '../engine/rng'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest } from './bits'
import { GameTop } from './quizbits'

const STREAK_KEY = 'career-sim:crest'
/** Kept out of the next few rounds so the same crest cannot repeat back to back. */
const MEMORY = 24

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
}

/**
 * A crest, four names, one of them right. The simplest of the three games:
 * no book to wait for, since a club's crest is already sitting in memory the
 * moment the page opens, and no daily or duel yet, since a round is over in
 * one click and there is nothing to keep in sync between two people.
 *
 * Difficulty is the same ladder as the other two games in spirit, but reads
 * off the club pyramid rather than fame: easy never leaves the top flight,
 * hard draws from anywhere with a crest to show.
 */
export function CrestGame({ onExit }: Props) {
  const { t, country } = useI18n()
  const [difficulty, setDifficulty] = useState<CrestDifficulty>('normal')
  const [round, setRound] = useState<CrestRound | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [streak, setStreak] = useState<Streak>(readStreak)
  const [sessionRight, setSessionRight] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  const deal = (nextDifficulty: CrestDifficulty, seenIds: string[]) => {
    const rng = new Rng(randomSeed())
    const next =
      buildCrestRound(rng, nextDifficulty, new Set(seenIds)) ??
      buildCrestRound(rng, nextDifficulty, new Set())
    setRound(next)
    setPicked(null)
  }

  useEffect(() => {
    deal(difficulty, recent)
    // difficulty change deals a fresh round; recent is intentionally not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty])

  if (!round) return null

  const locked = picked !== null
  const league = LEAGUE_BY_ID[round.club.leagueId]

  const answer = (clubId: string) => {
    if (locked) return
    const right = clubId === round.club.id
    setPicked(clubId)
    setSessionTotal((n) => n + 1)
    setSessionRight((n) => n + (right ? 1 : 0))
    const next: Streak = right
      ? { run: streak.run + 1, best: Math.max(streak.best, streak.run + 1) }
      : { run: 0, best: streak.best }
    setStreak(next)
    writeStreak(next)
  }

  const next = () => {
    const seen = [round.club.id, ...recent].slice(0, MEMORY)
    setRecent(seen)
    deal(difficulty, seen)
  }

  return (
    <div className="flow game">
      <GameTop title={t('crest.title')} onExit={onExit} />

      <div className="tempo" role="group" aria-label={t('quiz.difficulty')}>
        {CREST_DIFFICULTIES.map((d) => (
          <button
            key={d}
            className={d === difficulty ? 'on' : undefined}
            onClick={() => setDifficulty(d)}
          >
            {t(`quiz.diff.${d}` as StringKey)}
          </button>
        ))}
      </div>

      <div className="readout" style={{ marginTop: 'var(--s4)' }}>
        <div className="readout-cell">
          <div className="readout-k">{t('crest.streak')}</div>
          <div className="readout-v">{streak.run}</div>
        </div>
        <div className="readout-cell">
          <div className="readout-k">{t('crest.best')}</div>
          <div className="readout-v">{streak.best}</div>
        </div>
        <div className="readout-cell">
          <div className="readout-k">{t('crest.session')}</div>
          <div className="readout-v">
            {sessionRight}/{sessionTotal}
          </div>
        </div>
      </div>

      <div className="crestq" style={{ marginTop: 'var(--s5)' }}>
        <div className="crestq-badge">
          <Crest club={round.club} size="lg" eager />
        </div>

        <div className="crestq-grid">
          {round.options.map((opt) => {
            const isRight = opt.id === round.club.id
            const isPicked = opt.id === picked
            const cls = !locked
              ? undefined
              : isRight
                ? 'crestq-opt--right'
                : isPicked
                  ? 'crestq-opt--wrong'
                  : undefined
            return (
              <button
                key={opt.id}
                className={`crestq-opt${cls ? ` ${cls}` : ''}`}
                onClick={() => answer(opt.id)}
                disabled={locked}
              >
                {opt.name}
              </button>
            )
          })}
        </div>

        {locked && (
          <div className="crestq-reveal">
            <p className="hint">
              {round.club.name}
              {league && ` · ${league.name} · ${country(league.country)}`}
            </p>
            <button className="act act--primary" onClick={next}>
              {t('crest.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
