import { useEffect, useMemo, useRef, useState } from 'react'
import { CLUB_BY_ID } from './data/clubs'
import { AWARDS, earnedCount, readStats } from './engine/awards'
import {
  acceptOffer,
  careerScore,
  closeEvent,
  closePenalty,
  playSeasons,
  setTraining,
  resolveEvent,
  retire,
  takePenalty,
  totals,
} from './engine/career'
import {
  CAREER_AWARDS,
  careerAwardsEarned,
  type CareerAward,
  computeCabinetStats,
  newlyEarnedCareerAwards,
} from './engine/careerAwards'
import {
  dailyBrief,
  dailyKey,
  dailyRecordFor,
  rememberDaily,
  untilNextDaily,
} from './engine/daily'
import { detectMilestonesForRun, type MilestoneId } from './engine/milestones'
import {
  deleteCareer,
  exportCareer,
  importCareer,
  listCareers,
  renameCareer,
  saveCareer,
} from './engine/storage'
import { readStreak, streakStrip, touchStreak, type Streak } from './engine/streak'
import {
  MODE_CONFIG,
  isDetailed,
  type Career,
  type Offer,
  type PenaltyCorner,
  type Phase,
} from './engine/types'
import { rarityClass } from './engine/rarity'
import { leaderboardEnabled, playerName, submitScore } from './net/leaderboard'
import { useI18n } from './i18n'
import type { StringKey } from './i18n/strings'
import { roomFromUrl } from './net/peer'
import { AwardsScreen } from './ui/Awards'
import { BoardsScreen } from './ui/Boards'
import { Book } from './ui/Book'
import { AttributePanel, TrainingPicker } from './ui/Attributes'
import { Ambitions, Cohort, NextUp, ObjectiveBrief } from './ui/CareerExtras'
import { CreateScreen } from './ui/CreateScreen'
import { CrestGame } from './ui/CrestGame'
import { EventScreen } from './ui/EventScreen'
import { GridGame } from './ui/GridGame'
import { GuessGame } from './ui/GuessGame'
import { CareerAwardToast, HallOfFameScreen, MilestoneToast } from './ui/HallOfFame'
import { Identity } from './ui/Identity'
import { LangSwitch } from './ui/LangSwitch'
import { LeagueTable } from './ui/LeagueTable'
import { OfferScreen } from './ui/OfferScreen'
import { PenaltyScreen } from './ui/PenaltyScreen'
import { PlayerCard, ShareCard } from './ui/PlayerCard'
import { Rail } from './ui/Rail'
import { SeasonPanel } from './ui/SeasonPanel'
import { SettingsPanel } from './ui/SettingsPanel'
import { SummaryScreen } from './ui/SummaryScreen'
import { Crest, careerStage, formatValue, seasonLabel, type Stage } from './ui/bits'
import { useBook } from './ui/useBook'
import { useTheme, type Theme } from './ui/useSettings'

type View =
  | 'home'
  | 'create'
  | 'daily'
  | 'career'
  | 'grid'
  | 'guess'
  | 'crest'
  | 'awards'
  | 'book'
  | 'hof'
  | 'boards'
type Standings = { clubId: string; season?: number }

const STEPS = [1, 3, 5]

/** A link with a room in it is somebody waiting, so it opens its game at once. */
const invite = roomFromUrl()

export default function App() {
  const { t } = useI18n()
  // the generated half of the book, pulled in once and shared by every screen
  useBook()
  const { theme, next, cycle, setTheme } = useTheme()
  const [view, setView] = useState<View>(invite ? invite.game : 'home')
  const [career, setCareer] = useState<Career | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [standings, setStandings] = useState<Standings | null>(null)
  const [saves, setSaves] = useState<Career[]>(() => listCareers())
  /** an old season picked off the rail, or null for the one just played */
  const [reading, setReading] = useState<number | null>(null)
  /** true once the player card has scrolled off the top of the window */
  const [perched, setPerched] = useState(false)
  const [milestoneToast, setMilestoneToast] = useState<MilestoneId[]>([])
  const [careerAwardToast, setCareerAwardToast] = useState<CareerAward[]>([])
  const [sharing, setSharing] = useState(false)
  const [streak, setStreak] = useState<Streak>(() => readStreak())
  const fileInput = useRef<HTMLInputElement>(null)
  const nowRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const prevPhase = useRef<Phase | undefined>(undefined)

  useEffect(() => {
    if (career) saveCareer(career)
  }, [career])

  // A blitz click can settle a whole batch behind one or two decisions before
  // it lands, so the moment to say what just happened is the phase actually
  // arriving at rest, not any one of the seasons along the way. Retiring gets
  // priority over the run's own milestones: it is the bigger thing that day.
  useEffect(() => {
    const prev = prevPhase.current
    const now = career?.phase
    if (career && now !== prev) {
      if (now === 'retired' && prev !== 'retired') {
        const others = listCareers().filter((c) => c.id !== career.id)
        const before = computeCabinetStats(others)
        const after = computeCabinetStats([...others, career])
        const newly = newlyEarnedCareerAwards(before, after)
        if (newly.length) setCareerAwardToast(newly)

        // A finished career is the only thing worth putting on a board, and a
        // daily one goes to its own day as well as to the all-time list.
        if (leaderboardEnabled() && playerName().trim()) {
          const score = careerScore(career)
          const detail = `${career.player.name} · ${totals(career).peakOvr}`
          void submitScore({ board: 'career', value: score, detail })
          if (career.daily) {
            void submitScore({ board: `daily:${career.daily}`, value: score, detail })
          }
        }
        if (career.daily) {
          rememberDaily({
            key: career.daily,
            careerId: career.id,
            score: careerScore(career),
            finished: true,
          })
        }
      } else if (now === 'offers' && prev !== 'offers') {
        const hits = detectMilestonesForRun(career)
        if (hits.length) setMilestoneToast(hits)
      }
    }
    prevPhase.current = now
  }, [career])

  // The bar takes the player over the moment the card leaves the window, and
  // hands him back when it returns. Watching the card itself rather than a
  // scroll offset means it stays right at any zoom, font size or layout.
  useEffect(() => {
    const card = cardRef.current
    if (!card) {
      setPerched(false)
      return
    }
    const watch = new IntersectionObserver(([entry]) => setPerched(!entry.isIntersecting), {
      // the topbar is about 80px tall, so the handover happens under it
      rootMargin: '-80px 0px 0px 0px',
    })
    watch.observe(card)
    return () => watch.disconnect()
  }, [view, career?.phase])

  // Whatever the career is waiting on is the point of the page, so a phase that
  // changes brings it into view. `nearest` does nothing when it already is.
  useEffect(() => {
    nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [career?.phase, career?.season])

  const openClub = (clubId: string, season?: number) => setStandings({ clubId, season })

  const open = (c: Career) => {
    setCareer(c)
    setSettingsOpen(false)
    setReading(null)
    setView('career')
    // Opening a career (including an already-retired one, from the hall of
    // fame) is not a phase transition — without this, merely viewing a
    // finished career would look like the moment it just retired.
    prevPhase.current = c.phase
    setMilestoneToast([])
    setCareerAwardToast([])
    setSharing(false)
  }

  const play = (seasons: number) => {
    if (!career) return
    setCareer(playSeasons(career, seasons))
    setReading(null)
    setStreak(touchStreak())
  }

  const accept = (offer: Offer) => {
    if (!career) return
    setCareer(acceptOffer(career, offer))
    setReading(null)
  }

  const backHome = () => {
    setSaves(listCareers())
    setView('home')
  }

  if (view === 'create') {
    return (
      <Frame label={t('app.name')}>
        <Topbar next={next} onTheme={cycle} />
        <CreateScreen onStart={open} onCancel={saves.length ? backHome : undefined} />
      </Frame>
    )
  }

  // Today's career: the brief is fixed, so the screen only asks for a name.
  if (view === 'daily') {
    const key = dailyKey()
    const brief = dailyBrief(key)
    return (
      <Frame label={t('daily.title')}>
        <Topbar next={next} onTheme={cycle} />
        <CreateScreen
          onStart={(c) => {
            rememberDaily({ key, careerId: c.id })
            setStreak(touchStreak())
            open(c)
          }}
          onCancel={backHome}
          fixed={{ ...brief, daily: key }}
        />
      </Frame>
    )
  }

  if (view === 'boards') {
    return (
      <Frame label={t('board.title')}>
        <Topbar next={next} onTheme={cycle} />
        <BoardsScreen onExit={backHome} />
      </Frame>
    )
  }

  // The two quizzes are their own thing. They share the ground, the type and
  // the crests, and nothing else — no career, no save, no season.
  if (view === 'grid') {
    return (
      <Frame label={t('game.grid')}>
        <Topbar next={next} onTheme={cycle} />
        <GridGame onExit={() => setView('home')} invited={invite?.game === 'grid'} />
      </Frame>
    )
  }

  if (view === 'guess') {
    return (
      <Frame label={t('game.guess')}>
        <Topbar next={next} onTheme={cycle} />
        <GuessGame onExit={() => setView('home')} invited={invite?.game === 'guess'} />
      </Frame>
    )
  }

  if (view === 'crest') {
    return (
      <Frame label={t('crest.title')}>
        <Topbar next={next} onTheme={cycle} />
        <CrestGame onExit={() => setView('home')} />
      </Frame>
    )
  }

  if (view === 'book') {
    return (
      <Frame label={t('book.title')}>
        <Topbar next={next} onTheme={cycle} />
        <Book onExit={() => setView('home')} />
      </Frame>
    )
  }

  if (view === 'awards') {
    return (
      <Frame label={t('award.title')}>
        <Topbar next={next} onTheme={cycle} />
        <AwardsScreen onExit={() => setView('home')} />
      </Frame>
    )
  }

  if (view === 'hof') {
    return (
      <Frame label={t('hof.title')}>
        <Topbar next={next} onTheme={cycle} />
        <HallOfFameScreen onExit={() => setView('home')} onOpen={open} />
      </Frame>
    )
  }

  if (view === 'home' || !career) {
    return (
      <Frame label={t('app.name')}>
        <Topbar next={next} onTheme={cycle} />
        <Home
          saves={saves}
          streak={streak}
          onNew={() => setView('create')}
          onDaily={() => setView('daily')}
          onOpen={open}
          onDelete={(id) => {
            deleteCareer(id)
            setSaves(listCareers())
          }}
          onRename={(id, name) => {
            renameCareer(id, name)
            setSaves(listCareers())
          }}
          onExport={exportCareer}
          onImport={() => fileInput.current?.click()}
          onGame={(game) => setView(game)}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const imported = await importCareer(file)
              setSaves(listCareers())
              open(imported)
            } catch {
              alert(t('home.badFile'))
            }
            e.target.value = ''
          }}
        />
      </Frame>
    )
  }

  const club = CLUB_BY_ID[career.player.clubId]
  // A detailed career asks something every summer, so it cannot be run five
  // seasons deep on one click. The pace control goes away rather than lying.
  const detailed = isDetailed(career)
  const steps = detailed ? 1 : MODE_CONFIG[career.mode].seasons
  const stage = careerStage(career)

  /*
   * Between seasons the page is a dossier: who you are, what you just did, and
   * one button. The moment the career is waiting on a decision it stops being a
   * dossier. The decision takes the top of the column, the player shrinks to
   * the one line it is happening to, and the season you just played becomes the
   * context underneath it rather than the thing you have to scroll past.
   */
  const waiting = career.phase !== 'season'

  const ask = (
    <div className="ask" ref={nowRef}>
      {career.phase === 'season' && (
        <>
          {/* Read on the way past: a season you go into knowing what is wanted
              of you is a different season from one you only score afterwards. */}
          <ObjectiveBrief career={career} />
          {/* One of the few things in a detailed career you decide rather than
              receive, so it sits in front of the button that spends it. */}
          <TrainingPicker
            career={career}
            onPick={(facet) => setCareer(setTraining(career, facet))}
          />
          <button className="kickoff" onClick={() => play(steps)}>
            {club && <Crest club={club} size="lg" eager />}
            <span className="kickoff-label">
              {steps > 1 && club
                ? t('season.playNAt', { n: steps, club: club.name })
                : club
                  ? t('season.playAt', {
                      season: seasonLabel(career.season),
                      club: club.name,
                    })
                  : t('season.play', { season: seasonLabel(career.season) })}
            </span>
            <span className="kickoff-go" aria-hidden="true">
              →
            </span>
          </button>
          {detailed ? (
            <p className="hint hint--pace">{t('detail.paceLocked')}</p>
          ) : (
            <div className="tempo" role="group" aria-label={t('mode.title')}>
              {STEPS.map((n) => (
                <button
                  key={n}
                  className={n === steps ? 'on' : undefined}
                  onClick={() => play(n)}
                  title={t('mode.seasonsPerClick', { n })}
                >
                  {t('mode.nSeasons', { n })}
                </button>
              ))}
            </div>
          )}
          <NextUp career={career} />
        </>
      )}

      {career.phase === 'event' && (
        <EventScreen
          career={career}
          onChoose={(choice) => setCareer(resolveEvent(career, choice))}
          onContinue={() => setCareer(closeEvent(career))}
        />
      )}

      {career.phase === 'penalty' && (
        <PenaltyScreen
          career={career}
          onTake={(corner: PenaltyCorner) => setCareer(takePenalty(career, corner))}
          onContinue={() => setCareer(closePenalty(career))}
        />
      )}

      {career.phase === 'offers' && (
        <OfferScreen
          career={career}
          onAccept={accept}
          onRetire={() => setCareer(retire(career))}
          onClub={openClub}
        />
      )}
    </div>
  )

  // The left hand column reads one season: the one just played, or the one you
  // went back to on the rail. The right hand column is the career.
  const shown =
    reading !== null
      ? (career.history.find((s) => s.season === reading) ?? null)
      : (career.history[career.history.length - 1] ?? null)

  return (
    <Frame
      stage={stage}
      label={`${seasonLabel(career.season)} · ${t(`stage.${stage}` as StringKey)}`}
    >
      <Topbar
        next={next}
        onTheme={cycle}
        onSettings={() => setSettingsOpen((v) => !v)}
        perch={perched ? career : null}
      >
        <button className="act act--quiet act--back" onClick={backHome} title={t('app.careers')}>
          {t('app.careers')}
        </button>
      </Topbar>

      {settingsOpen && (
        <SettingsPanel
          mode={career.mode}
          onMode={(mode) => setCareer({ ...career, mode })}
          theme={theme}
          onTheme={setTheme}
          onExport={() => exportCareer(career)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <MilestoneToast milestones={milestoneToast} onDone={() => setMilestoneToast([])} />
      <CareerAwardToast awards={careerAwardToast} onDone={() => setCareerAwardToast([])} />

      {career.phase === 'retired' ? (
        <SummaryScreen
          career={career}
          onPlayAgain={() => setView('create')}
          onBack={backHome}
          onClub={openClub}
          onShare={() => setSharing(true)}
        />
      ) : (
        <div className="spread">
          <div className="now">
            <div ref={cardRef}>
              <Identity
                career={career}
                onClub={openClub}
                variant={waiting ? 'strip' : 'full'}
              />
            </div>

            {waiting && ask}

            {shown && (
              <SeasonPanel
                career={career}
                record={shown}
                onClub={openClub}
                onBack={reading !== null ? () => setReading(null) : undefined}
              />
            )}

            {!waiting && ask}

            <AttributePanel career={career} />
            <Ambitions career={career} />
            <Cohort career={career} />
          </div>

          <aside className="rail">
            {/* The card sits in the sticky column, so the thing you are playing
                for is on screen the whole way down a career. */}
            <PlayerCard career={career} size="sm" onClick={() => setSharing(true)} />
            <Rail
              career={career}
              reading={reading}
              onRead={(season) => setReading(season)}
              onNow={() => nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          </aside>
        </div>
      )}

      {sharing && <ShareCard career={career} onClose={() => setSharing(false)} />}

      {standings && (
        <LeagueTable
          career={career}
          clubId={standings.clubId}
          season={standings.season}
          onClose={() => setStandings(null)}
        />
      )}
    </Frame>
  )
}

/**
 * The rail down the side of the window carries where the career currently is,
 * the way a tunnel or the spine of a matchday programme carries it. It is the
 * one piece of furniture on every screen, and it is deliberately not centred.
 */
function Frame({
  children,
  label,
  stage = 'unknown',
}: {
  children: React.ReactNode
  label: string
  stage?: Stage
}) {
  return (
    <div data-stage={stage}>
      <div className="spine">
        <span className="spine-mark" />
        <span className="spine-label">{label}</span>
      </div>
      <div className="shell">{children}</div>
    </div>
  )
}

function Topbar({
  children,
  next,
  onTheme,
  onSettings,
  perch,
}: {
  children?: React.ReactNode
  /** the ground the button moves to, named in its tooltip */
  next: Theme
  onTheme: () => void
  onSettings?: () => void
  /** the player, shown once the card has scrolled off the top */
  perch?: Career | null
}) {
  const { t, lang } = useI18n()
  const club = perch ? CLUB_BY_ID[perch.player.clubId] : null
  return (
    <div className="topbar">
      <div className="wordmark">{t('app.name')}</div>

      {/*
       * The player follows you down the page. Once the card is gone the bar
       * carries the four things you keep checking while you read a career:
       * who, how old, what you are worth, what you are rated.
       */}
      {perch && (
        <div className="perch">
          {club && <Crest club={club} eager />}
          <span className="perch-name">{perch.player.name}</span>
          <span className="perch-facts">
            <b>{perch.player.age}</b>
            <span className="dot" />
            <b>{formatValue(perch.player.value, lang)}</b>
          </span>
          <span className={`perch-ovr ${rarityClass(perch.player.ovr)}`}>{perch.player.ovr}</span>
        </div>
      )}

      <div className="topbar-tools">
        {children}
        <LangSwitch />
        <button
          className="act act--quiet act--icon"
          onClick={onTheme}
          title={t('theme.next', { theme: t(`theme.${next}` as StringKey) })}
          aria-label={t('theme.next', { theme: t(`theme.${next}` as StringKey) })}
        >
          {/* a cycler, so the mark is a ground half lit rather than a sun or a moon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2.2a7.8 7.8 0 0 1 0 15.6z" />
          </svg>
        </button>
        {onSettings && (
          <button
            className="act act--quiet act--icon"
            onClick={onSettings}
            title={t('set.title')}
            aria-label={t('set.title')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4M9.6 1.6h4.8l.5 2.6 1.6.9 2.5-.9 2.4 4.1-2 1.7v1.9l2 1.7-2.4 4.1-2.5-.9-1.6.9-.5 2.6H9.6l-.5-2.6-1.6-.9-2.5.9-2.4-4.1 2-1.7v-1.9l-2-1.7L5 4.2l2.5.9 1.6-.9z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/** A cup on a plinth, for the cabinet the two quizzes fill. */
function CabinetMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 3h8v5.5a4 4 0 0 1-8 0zM8 4.5H5.4v1.6a3 3 0 0 0 2.6 3M16 4.5h2.6v1.6a3 3 0 0 1-2.6 3" />
      <path d="M12 12.5V16M8.5 19.5h7l.8 1.8H7.7z" strokeLinejoin="round" />
    </svg>
  )
}

/** An open book, which is what the two quizzes are played out of. */
function BookMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 6.5C10.4 5.2 8.2 4.5 4 4.5v13c4.2 0 6.4.7 8 2 1.6-1.3 3.8-2 8-2v-13c-4.2 0-6.4.7-8 2z" strokeLinejoin="round" />
      <path d="M12 6.5v12" />
    </svg>
  )
}

/** Nine squares with a line through three of them. */
function GridMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18" opacity="0.55" />
      <path d="M4.5 4.5 19.5 19.5" strokeWidth="2.2" />
    </svg>
  )
}

/** A shirt with nobody's name on it. */
function GuessMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 3 4 5.5 5.6 10l2-.6V21h8.8V9.4l2 .6L20 5.5 15 3a3 3 0 0 1-6 0z" />
      <path d="M12 12.4v3.2M12 17.8v.2" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** A shield with nothing drawn on it, standing in for a crest not yet named. */
function CrestMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.5 19 6v6c0 4.4-3 7.4-7 8.5-4-1.1-7-4.1-7-8.5V6z" strokeLinejoin="round" />
      <path d="M12 3.5v17" opacity="0.55" />
    </svg>
  )
}

/** A star, for the careers that are over and worth remembering. */
function HofMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        d="M12 3.4 14.8 9l6.2.9-4.5 4.3 1.1 6.1L12 17.3l-5.6 3 1.1-6.1L3 9.9 9.2 9z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type SortMode = 'recent' | 'rating' | 'name'
const SORTS: SortMode[] = ['recent', 'rating', 'name']

/**
 * Today's career.
 *
 * The same seed for everybody, redrawn at midnight UTC, so it is the only run
 * two people can honestly compare. The card knows three states: not started,
 * in progress, and done, and says the same thing in all three — here is the
 * one career today that is not only yours.
 */
function DailyCard({
  onPlay,
  onOpen,
  saves,
}: {
  onPlay: () => void
  onOpen: (c: Career) => void
  saves: Career[]
}) {
  const { t } = useI18n()
  const key = dailyKey()
  const record = dailyRecordFor(key)
  const started = record ? (saves.find((c) => c.id === record.careerId) ?? null) : null
  const [left, setLeft] = useState(() => untilNextDaily())

  useEffect(() => {
    const tick = setInterval(() => setLeft(untilNextDaily()), 30_000)
    return () => clearInterval(tick)
  }, [])

  const hours = Math.floor(left / 3600)
  const minutes = Math.floor((left % 3600) / 60)
  const clock = `${hours}h ${String(minutes).padStart(2, '0')}m`

  return (
    <div className="daily">
      <div className="daily-top">
        <span className="daily-tag">{t('daily.tag')}</span>
        <span className="daily-clock">{t('daily.next', { time: clock })}</span>
      </div>
      <h3 className="daily-title">{t('daily.title')}</h3>
      <p className="daily-blurb">{t('daily.blurb')}</p>
      {started ? (
        <button className="act act--primary" onClick={() => onOpen(started)}>
          {started.phase === 'retired' ? t('home.view') : t('daily.continue')}
        </button>
      ) : (
        <button className="act act--primary" onClick={onPlay}>
          {t('daily.play')}
        </button>
      )}
      {started?.phase === 'retired' && <p className="daily-done">{t('daily.finished')}</p>}
    </div>
  )
}

/**
 * The last fortnight, as dots. It counts and it does nothing else: nothing is
 * locked behind it and nothing is lost by breaking it.
 */
function StreakStrip({ streak }: { streak: Streak }) {
  const { t } = useI18n()
  const days = streakStrip(14)
  return (
    <div className="streak">
      <div className="streak-top">
        <span className="streak-k">{t('streak.title')}</span>
        {streak.best > 0 && <span className="streak-best">{t('streak.best', { n: streak.best })}</span>}
      </div>
      <div className="streak-num">
        {streak.current > 0 ? t('streak.days', { n: streak.current }) : t('streak.none')}
      </div>
      <div className="streak-dots" aria-hidden="true">
        {days.map((d) => (
          <i key={d.day} className={d.played ? 'on' : undefined} />
        ))}
      </div>
    </div>
  )
}

/** A column chart with a rule across it, for the boards. */
function BoardMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V5M17 20v-9" strokeLinecap="round" />
    </svg>
  )
}

interface HomeProps {
  saves: Career[]
  streak: Streak
  onNew: () => void
  onDaily: () => void
  onOpen: (c: Career) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onExport: (c: Career) => void
  onImport: () => void
  onGame: (game: 'grid' | 'guess' | 'crest' | 'awards' | 'book' | 'hof' | 'boards') => void
}

function Home({
  saves,
  streak,
  onNew,
  onDaily,
  onOpen,
  onDelete,
  onRename,
  onExport,
  onImport,
  onGame,
}: HomeProps) {
  const { t, num } = useI18n()
  const book = useBook()
  const [sort, setSort] = useState<SortMode>('recent')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const rows = useMemo(() => {
    const built = saves.map((c) => ({ career: c, stats: totals(c), club: CLUB_BY_ID[c.player.clubId] }))
    // `saves` already arrives sorted by creation date, so 'recent' is a no-op sort.
    if (sort === 'rating') return [...built].sort((a, b) => b.career.player.ovr - a.career.player.ovr)
    if (sort === 'name') {
      return [...built].sort((a, b) => a.career.player.name.localeCompare(b.career.player.name))
    }
    return built
  }, [saves, sort])
  const cabinet = useMemo(() => earnedCount(readStats()), [])
  const hofCabinet = useMemo(() => careerAwardsEarned(computeCabinetStats(saves)), [saves])
  // The card at the top is the best career there is, finished or not: a run in
  // progress that has already beaten everything before it is the story now.
  const best = useMemo(
    () =>
      saves.length
        ? saves.reduce((top, c) => (careerScore(c) > careerScore(top) ? c : top))
        : null,
    [saves],
  )

  const startRename = (career: Career) => {
    setRenaming(career.id)
    setDraftName(career.player.name)
  }
  const commitRename = () => {
    const name = draftName.trim()
    if (renaming && name) onRename(renaming, name)
    setRenaming(null)
  }

  return (
    <div className="flow">
      <section>
        <h1 className="poster-title">{t('home.title')}</h1>

        <div className="act-row" style={{ marginTop: 'var(--s5)' }}>
          <button className="act act--primary" onClick={onNew}>
            {t('home.new')}
          </button>
          <button className="act act--quiet" onClick={onImport}>
            {t('home.import')}
          </button>
        </div>
      </section>

      {/* The best thing this browser has ever done, said at the size it
          deserves, next to the one career everybody is playing today. */}
      <section className="showcase">
        {best && (
          <div className="showcase-card">
            <span className="showcase-k">{t('home.bestCareer')}</span>
            <PlayerCard career={best} onClick={() => onOpen(best)} />
          </div>
        )}
        <div className="showcase-side">
          <DailyCard onPlay={onDaily} onOpen={onOpen} saves={saves} />
          <StreakStrip streak={streak} />
        </div>
      </section>

      {/*
       * The career is the point of the place, so it keeps the top of the page.
       * Underneath it are two games that need no save and no commitment: one
       * grid, one player to name, both played out of the same book.
       */}
      <section>
        <div className="rule-head">
          <h2>{t('home.games')}</h2>
          <span className="aside">{t('home.bookSize', { n: num(book.count) })}</span>
        </div>
        <div className="games">
          {(
            [
              { id: 'grid', title: t('game.grid'), blurb: t('game.gridBlurb'), go: t('game.play') },
              {
                id: 'guess',
                title: t('game.guess'),
                blurb: t('game.guessBlurb'),
                go: t('game.play'),
              },
              {
                id: 'crest',
                title: t('game.crest'),
                blurb: t('game.crestBlurb'),
                go: t('game.play'),
              },
              {
                id: 'awards',
                title: t('award.title'),
                blurb: t('award.blurb', { n: cabinet, of: AWARDS.length }),
                go: t('award.open'),
              },
              {
                id: 'hof',
                title: t('game.hof'),
                blurb: t('award.blurb', { n: hofCabinet, of: CAREER_AWARDS.length }),
                go: t('award.open'),
              },
              {
                id: 'book',
                title: t('book.title'),
                blurb: t('book.cardBlurb'),
                go: t('book.open'),
              },
              {
                id: 'boards',
                title: t('game.boards'),
                blurb: t('game.boardsBlurb'),
                go: t('award.open'),
              },
            ] as const
          ).map((g) => (
            <button key={g.id} className="gamecard" onClick={() => onGame(g.id)}>
              <span className="gamecard-mark" aria-hidden="true">
                {g.id === 'grid' ? (
                  <GridMark />
                ) : g.id === 'guess' ? (
                  <GuessMark />
                ) : g.id === 'crest' ? (
                  <CrestMark />
                ) : g.id === 'awards' ? (
                  <CabinetMark />
                ) : g.id === 'hof' ? (
                  <HofMark />
                ) : g.id === 'boards' ? (
                  <BoardMark />
                ) : (
                  <BookMark />
                )}
              </span>
              <span className="gamecard-title">{g.title}</span>
              <span className="gamecard-blurb">{g.blurb}</span>
              <span className="gamecard-go">{g.go} →</span>
            </button>
          ))}
        </div>
      </section>

      {rows.length > 0 && (
        <section>
          <div className="rule-head">
            <h2>{t('home.saved')}</h2>
            <span className="aside">{rows.length}</span>
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            {t('home.localOnly')}
          </p>
          {rows.length > 1 && (
            <div className="tempo" style={{ marginBottom: 'var(--s3)' }} role="group">
              {SORTS.map((s) => (
                <button
                  key={s}
                  className={s === sort ? 'on' : undefined}
                  onClick={() => setSort(s)}
                >
                  {t(`home.sort${s === 'recent' ? 'Recent' : s === 'rating' ? 'Rating' : 'Name'}` as StringKey)}
                </button>
              ))}
            </div>
          )}
          {rows.map(({ career, stats, club }) => (
            <div className="roster-row" key={career.id}>
              {club && <Crest club={club} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                {renaming === career.id ? (
                  <input
                    className="ruled"
                    style={{ fontFamily: 'var(--poster)', fontSize: '19px', textTransform: 'uppercase' }}
                    value={draftName}
                    autoFocus
                    maxLength={28}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                    onBlur={commitRename}
                  />
                ) : (
                  <div className="roster-who">{career.player.name}</div>
                )}
                <div className="roster-meta">
                  {career.phase === 'retired'
                    ? t('home.retiredMeta', { ovr: stats.peakOvr, apps: stats.apps })
                    : t('home.activeMeta', {
                        season: seasonLabel(career.season),
                        age: career.player.age,
                        ovr: career.player.ovr,
                        club: club?.name ?? '',
                      })}
                </div>
              </div>
              {renaming !== career.id && (
                <>
                  <button className="act" onClick={() => onOpen(career)}>
                    {career.phase === 'retired' ? t('home.view') : t('home.continue')}
                  </button>
                  <button
                    className="act act--quiet act--icon"
                    aria-label={t('home.rename')}
                    title={t('home.rename')}
                    onClick={() => startRename(career)}
                  >
                    ✎
                  </button>
                  <button
                    className="act act--quiet act--icon"
                    aria-label={t('home.export')}
                    title={t('home.export')}
                    onClick={() => onExport(career)}
                  >
                    ⇩
                  </button>
                  <button
                    className="act act--quiet act--icon"
                    aria-label={t('home.delete')}
                    title={t('home.delete')}
                    onClick={() => {
                      if (confirm(t('home.deleteConfirm', { name: career.player.name })))
                        onDelete(career.id)
                    }}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
