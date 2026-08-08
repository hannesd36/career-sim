import { useEffect, useMemo, useRef, useState } from 'react'
import { LEGEND_BY_ID, type Legend } from '../data/players'
import { markDaily, newlyEarned, readStats, writeStats, type Award } from '../engine/awards'
import {
  answersForCell,
  boardPoints,
  buildGrid,
  copyText,
  countFor,
  dailySeed,
  dayKey,
  dayNumber,
  pickCell,
  rarityPoints,
  shareGrid,
  winningLine,
  type Board,
  type Difficulty,
  type Mark,
} from '../engine/quiz'
import { randomSeed } from '../engine/rng'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { roomFromUrl } from '../net/peer'
import { useLobby } from '../net/useLobby'
import { AwardToast } from './Awards'
import { LobbyPanel } from './LobbyPanel'
import { CriterionHead, PlayerPicker } from './quizbits'

type Mode = 'solo' | 'cpu' | 'friend' | 'online'

/** Turns the two of you share before the board is called as it stands. */
const TURN_BUDGET = 16
/** Names you get on your own before the board closes. */
const SOLO_TRIES = 9

/** How often the computer draws a blank, which is the only thing it is bad at. */
const CPU_MISS: Record<Difficulty, number> = { easy: 0.45, normal: 0.22, hard: 0.06 }

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']
const MODES: Mode[] = ['solo', 'cpu', 'friend', 'online']

interface Result {
  winner: Mark | null
  line: number[] | null
}

interface Props {
  onExit: () => void
  /** true when the page was opened from an invite link */
  invited?: boolean
}

/**
 * Nine squares, and each one is two questions at once.
 *
 * The grid game everyone already knows: three clubs along the top, three of
 * anything at all down the side, and a name that belongs in both. It is played
 * alone against the answer sheet, against the person next to you, against the
 * machine, or against somebody on the other side of the country who followed a
 * link you sent them. A wrong answer costs the turn rather than the square, so
 * the board keeps moving.
 */
export function GridGame({ onExit, invited }: Props) {
  const { t, num } = useI18n()
  const [mode, setMode] = useState<Mode>(invited ? 'online' : 'cpu')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [daily, setDaily] = useState(false)
  const [started, setStarted] = useState(false)

  const [seed, setSeed] = useState(randomSeed)
  const [board, setBoard] = useState<Board>(() => Array(9).fill(null))
  const [points, setPoints] = useState<number[]>(() => Array(9).fill(0))
  const [used, setUsed] = useState<string[]>([])
  const [turn, setTurn] = useState<Mark>('a')
  const [turns, setTurns] = useState(0)
  const [picking, setPicking] = useState<number | null>(null)
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [reveal, setReveal] = useState(false)
  const [shared, setShared] = useState(false)
  const [won, setWon] = useState<Award[]>([])
  const drawerRef = useRef<HTMLDivElement>(null)

  /*
   * Everything the other browser says arrives through one function, and that
   * function is rewritten on every render so it always sees the board as it is
   * now. The connection itself never notices, which is the point: you cannot
   * re-open a socket in the middle of somebody's turn.
   */
  const remote = useRef<(msg: Record<string, unknown>) => void>(() => {})
  const lobby = useLobby('grid', (msg) => remote.current(msg))

  const online = mode === 'online'
  /** which side of the board you are on when two browsers are playing */
  const me: Mark = online && !lobby.isHost ? 'b' : 'a'

  // An invite link is an instruction, not a suggestion: walk straight in.
  useEffect(() => {
    const found = roomFromUrl()
    if (found?.game === 'grid') lobby.enter(found.room)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On a phone the board fills the screen, so the square you just tapped opens
  // something you would otherwise have to go looking for.
  useEffect(() => {
    if (picking !== null) drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [picking])

  const grid = useMemo(() => buildGrid(seed, difficulty), [seed, difficulty])

  /** The nine answer sets, worked out once per board. */
  const answers = useMemo(
    () => grid.rows.flatMap((row) => grid.cols.map((col) => answersForCell(row, col))),
    [grid],
  )

  function resetBoard() {
    setBoard(Array(9).fill(null))
    setPoints(Array(9).fill(0))
    setUsed([])
    setTurn('a')
    setTurns(0)
    setPicking(null)
    setNote(null)
    setResult(null)
    setReveal(false)
    setShared(false)
    setWon([])
  }

  const fresh = (nextSeed = randomSeed()) => {
    setSeed(nextSeed)
    setDaily(false)
    resetBoard()
    if (online && lobby.isHost) lobby.send({ t: 'again', seed: nextSeed })
  }

  // Against the machine you are "you"; across a table you are both numbered.
  const nameOf = (mark: Mark) => {
    if (mode === 'cpu') return mark === 'a' ? t('grid.you') : t('grid.cpu')
    if (mode === 'online') return mark === me ? t('grid.you') : t('grid.them')
    return mark === 'a' ? t('grid.p1') : t('grid.p2')
  }

  /** Where the ledger is written once a board is over. */
  const settle = (next: Board, winner: Mark | null, scores: number[]) => {
    const before = readStats()
    const after = { ...before, gridPlayed: before.gridPlayed + 1 }
    after.gridSquares += next.filter((c) => c?.by === me).length
    if (mode === 'solo') {
      after.soloBest = Math.max(after.soloBest, boardPoints(scores))
      if (next.every(Boolean)) {
        after.soloPerfect += 1
        after.gridWon += 1
      }
    } else if (winner === me) {
      after.gridWon += 1
      if (mode === 'cpu' && difficulty === 'hard') after.hardWon += 1
    }
    if (online) {
      after.onlinePlayed += 1
      if (winner === me) after.onlineWon += 1
    }
    const final = daily ? markDaily(after, dayKey()) : after
    writeStats(final)
    setWon(newlyEarned(before, final))
  }

  /** Whatever a turn ended up being, this is what happens next. */
  const endTurn = (next: Board, tookIt: boolean, mark: Mark, scores: number[]) => {
    const played = turns + 1
    setTurns(played)

    if (mode === 'solo') {
      const full = next.every(Boolean)
      if (full || played >= SOLO_TRIES) {
        setResult({ winner: full ? 'a' : null, line: winningLine(next, 'a') })
        settle(next, full ? 'a' : null, scores)
      }
      return
    }

    const line = tookIt ? winningLine(next, mark) : null
    if (line) {
      setResult({ winner: mark, line })
      settle(next, mark, scores)
      return
    }
    if (next.every(Boolean) || played >= TURN_BUDGET) {
      const a = countFor(next, 'a')
      const b = countFor(next, 'b')
      const winner = a === b ? null : a > b ? 'a' : 'b'
      setResult({ winner, line: null })
      settle(next, winner, scores)
      return
    }
    setTurn(mark === 'a' ? 'b' : 'a')
  }

  const claim = (cell: number, legend: Legend, mark: Mark, worth: number, tell: boolean) => {
    const next = board.slice()
    next[cell] = { by: mark, legendId: legend.id }
    const scores = points.slice()
    scores[cell] = worth
    setBoard(next)
    setPoints(scores)
    setUsed((u) => [...u, legend.id])
    setNote({
      tone: 'good',
      text:
        mode === 'solo'
          ? t('grid.rightWorth', { name: legend.name, n: worth })
          : t('grid.right', { name: legend.name }),
    })
    if (tell && online) lobby.send({ t: 'move', cell, id: legend.id, by: mark, worth })
    endTurn(next, true, mark, scores)
  }

  const missed = (mark: Mark, text: string, tell: boolean, name?: string) => {
    setNote({ tone: 'bad', text })
    if (tell && online) lobby.send({ t: 'miss', by: mark, name })
    endTurn(board, false, mark, points)
  }

  const answer = (legend: Legend) => {
    const cell = picking
    if (cell === null) return
    setPicking(null)
    if (answers[cell].some((l) => l.id === legend.id))
      claim(cell, legend, turn, rarityPoints(answers[cell].length), true)
    else
      missed(
        turn,
        t(mode === 'solo' ? 'grid.wrongSolo' : 'grid.wrong', { name: legend.name }),
        true,
        legend.name,
      )
  }

  // ---- what the other browser says ----
  remote.current = (msg) => {
    switch (msg.t) {
      case 'setup':
        setSeed(Number(msg.seed))
        setDifficulty(String(msg.difficulty) as Difficulty)
        resetBoard()
        setStarted(true)
        break
      case 'move': {
        const legend = LEGEND_BY_ID[String(msg.id)]
        if (legend) claim(Number(msg.cell), legend, String(msg.by) as Mark, Number(msg.worth) || 0, false)
        break
      }
      case 'miss':
        missed(String(msg.by) as Mark, t('grid.wrong', { name: String(msg.name ?? '') }), false)
        break
      case 'again':
        setSeed(Number(msg.seed))
        resetBoard()
        break
      default:
        break
    }
  }

  // ---- the computer takes its turn a beat later, so you can see it happen ----
  const cpuTurn = mode === 'cpu' && turn === 'b' && !result && started
  useEffect(() => {
    if (!cpuTurn) return
    const timer = setTimeout(() => {
      const open = board.map((_, i) => i).filter((i) => !board[i])
      const answerable = open.filter((i) => answers[i].some((l) => !used.includes(l.id)))
      const cell = pickCell(board, 'b', answerable.length ? answerable : open)
      if (cell < 0) return
      const options = answers[cell].filter((l) => !used.includes(l.id))
      if (!options.length || Math.random() < CPU_MISS[difficulty]) {
        missed('b', t('grid.cpuBlank'), false)
        return
      }
      const pick = options[Math.floor(Math.random() * options.length)]
      claim(cell, pick, 'b', rarityPoints(answers[cell].length), false)
    }, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, board, used])

  const kickOff = () => {
    const nextSeed = daily ? dailySeed('grid') : randomSeed()
    setSeed(nextSeed)
    resetBoard()
    setStarted(true)
    if (online && lobby.isHost) lobby.send({ t: 'setup', seed: nextSeed, difficulty })
  }

  // ------------------------------------------------------------------ setup
  if (!started) {
    return (
      <div className="flow game">
        <GameTop title={t('grid.title')} onExit={onExit} />
        <p className="kicker kicker--loud">{t('grid.blurb')}</p>

        <section className="field">
          <label>{t('grid.opponent')}</label>
          <div className="tempo tempo--wrap" role="group" aria-label={t('grid.opponent')}>
            {MODES.map((m) => (
              <button key={m} className={m === mode ? 'on' : undefined} onClick={() => setMode(m)}>
                {t(`grid.mode.${m}` as StringKey)}
              </button>
            ))}
          </div>
          <p className="hint">{t(`grid.modeHint.${mode}` as StringKey)}</p>
        </section>

        <section className="field">
          <label>{t('grid.difficulty')}</label>
          <div className="tempo" role="group" aria-label={t('grid.difficulty')}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={d === difficulty ? 'on' : undefined}
                onClick={() => setDifficulty(d)}
              >
                {t(`grid.diff.${d}` as StringKey)}
              </button>
            ))}
          </div>
          <p className="hint">{t(`grid.diffHint.${difficulty}` as StringKey)}</p>
        </section>

        {!online && (
          <section className="field">
            <label>{t('quiz.board')}</label>
            <div className="tempo" role="group" aria-label={t('quiz.board')}>
              <button className={!daily ? 'on' : undefined} onClick={() => setDaily(false)}>
                {t('quiz.random')}
              </button>
              <button className={daily ? 'on' : undefined} onClick={() => setDaily(true)}>
                {t('quiz.daily', { n: dayNumber() })}
              </button>
            </div>
            <p className="hint">{t(daily ? 'quiz.dailyHint' : 'quiz.randomHint')}</p>
          </section>
        )}

        {online && <LobbyPanel lobby={lobby} />}

        <div className="act-row">
          <button
            className="act act--primary"
            onClick={kickOff}
            disabled={online && (!lobby.connected || !lobby.isHost)}
          >
            {t('grid.start')}
          </button>
        </div>
        {online && lobby.connected && !lobby.isHost && <p className="hint">{t('net.hostStarts')}</p>}
      </div>
    )
  }

  // ------------------------------------------------------------------ board
  const scoreA = countFor(board, 'a')
  const scoreB = countFor(board, 'b')
  const total = boardPoints(points)
  const yourTurn = mode === 'solo' || (online ? turn === me : !(mode === 'cpu' && turn === 'b'))
  const waiting = picking === null && !result && yourTurn

  return (
    <div className="flow game">
      <GameTop title={t('grid.title')} onExit={onExit} />

      {mode === 'solo' ? (
        <div className="tally">
          <span className="tally-turns">
            {t('grid.triesLeft', { n: Math.max(0, SOLO_TRIES - turns) })}
          </span>
          <span className="tally-score">
            {t('grid.points')} <b>{num(total)}</b>
          </span>
        </div>
      ) : (
        <div className="tally">
          <span className={`tally-side tally-side--a${turn === 'a' && !result ? ' on' : ''}`}>
            <i />
            {nameOf('a')}
            <b>{scoreA}</b>
          </span>
          <span className="tally-turns">
            {t('grid.turnsLeft', { n: Math.max(0, TURN_BUDGET - turns) })}
          </span>
          <span className={`tally-side tally-side--b${turn === 'b' && !result ? ' on' : ''}`}>
            <b>{scoreB}</b>
            {nameOf('b')}
            <i />
          </span>
        </div>
      )}

      <div className="board">
        <div className="board-corner" aria-hidden="true">
          {daily && <span className="board-day">#{dayNumber()}</span>}
        </div>
        {grid.cols.map((col, i) => (
          <div className="board-head board-head--col" key={`c${i}`}>
            <CriterionHead criterion={col} />
          </div>
        ))}

        {grid.rows.map((row, r) => (
          <Row key={`r${r}`}>
            <div className="board-head board-head--row">
              <CriterionHead criterion={row} />
            </div>
            {grid.cols.map((_, c) => {
              const i = r * 3 + c
              const claimed = board[i]
              const winning = result?.line?.includes(i)
              return (
                <button
                  key={i}
                  className={[
                    'square',
                    claimed ? `square--${claimed.by}` : '',
                    winning ? 'square--won' : '',
                    picking === i ? 'square--picking' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={!!claimed || !waiting}
                  onClick={() => {
                    setNote(null)
                    setPicking(i)
                  }}
                >
                  {claimed ? (
                    <>
                      <span className="square-name">{LEGEND_BY_ID[claimed.legendId]?.name}</span>
                      {mode === 'solo' && points[i] > 0 && (
                        <span className="square-worth">{points[i]}</span>
                      )}
                    </>
                  ) : reveal ? (
                    <span className="square-answers">
                      {answers[i]
                        .slice(0, 3)
                        .map((l) => l.name)
                        .join(', ')}
                      {answers[i].length > 3 && ` +${answers[i].length - 3}`}
                    </span>
                  ) : (
                    <>
                      <span className="square-plus" aria-hidden="true">
                        +
                      </span>
                      {mode === 'solo' && <span className="square-pool">{answers[i].length}</span>}
                    </>
                  )}
                </button>
              )
            })}
          </Row>
        ))}
      </div>

      {note && <p className={`note note--${note.tone}`}>{note.text}</p>}

      {!result && !note && waiting && mode !== 'solo' && (
        <p className="note">{t('grid.turn', { who: nameOf(turn) })}</p>
      )}
      {!result && mode === 'cpu' && turn === 'b' && <p className="note">{t('grid.cpuThinking')}</p>}
      {!result && online && turn !== me && <p className="note">{t('net.theirTurn')}</p>}
      {online && !lobby.connected && <p className="note note--bad">{t('net.lost')}</p>}

      {result && (
        <div className="verdict verdict--in" role="status">
          <strong>
            {mode === 'solo'
              ? board.every(Boolean)
                ? t('grid.soloAll')
                : t('grid.soloDone', { n: board.filter(Boolean).length })
              : result.winner
                ? t('grid.won', { who: nameOf(result.winner) })
                : t('grid.draw')}
          </strong>
          <span>
            {mode === 'solo'
              ? t('grid.finalPoints', { n: num(total) })
              : t('grid.finalScore', { a: scoreA, b: scoreB })}
          </span>
          <div className="act-row">
            <button className="act act--primary" onClick={() => fresh()}>
              {t('grid.new')}
            </button>
            {!reveal && (
              <button className="act act--quiet" onClick={() => setReveal(true)}>
                {t('grid.reveal')}
              </button>
            )}
            <button
              className="act act--quiet"
              onClick={async () => {
                const text = shareGrid(board, {
                  title: t('grid.title'),
                  day: daily ? dayNumber() : undefined,
                  score: mode === 'solo' ? total : undefined,
                })
                if (await copyText(text)) setShared(true)
              }}
            >
              {shared ? t('quiz.copied') : t('quiz.share')}
            </button>
          </div>
        </div>
      )}

      {!result && picking === null && (
        <div className="act-row">
          <button className="act act--quiet" onClick={() => fresh()}>
            {t('grid.new')}
          </button>
        </div>
      )}

      {picking !== null && (
        <div className="drawer" ref={drawerRef}>
          <div className="drawer-ask">
            <CriterionHead criterion={grid.rows[Math.floor(picking / 3)]} />
            <span className="drawer-x" aria-hidden="true">
              ×
            </span>
            <CriterionHead criterion={grid.cols[picking % 3]} />
          </div>
          <PlayerPicker
            label={t('grid.who')}
            placeholder={t('grid.placeholder')}
            exclude={used}
            onPick={answer}
            onCancel={() => setPicking(null)}
            cancelLabel={t('grid.cancel')}
            emptyLabel={t('grid.noMatch')}
          />
        </div>
      )}

      <AwardToast awards={won} onDone={() => setWon([])} />
    </div>
  )
}

/** A row of the grid is four cells wide; the fragment keeps the CSS grid flat. */
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function GameTop({ title, onExit }: { title: string; onExit: () => void }) {
  const { t } = useI18n()
  return (
    <div className="rule-head">
      <h2>{title}</h2>
      <button className="act act--quiet" onClick={onExit}>
        {t('quiz.back')}
      </button>
    </div>
  )
}
