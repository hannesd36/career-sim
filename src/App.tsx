import { useEffect, useMemo, useRef, useState } from 'react'
import { CLUB_BY_ID } from './data/clubs'
import {
  acceptOffer,
  closeEvent,
  closePenalty,
  playSeasons,
  resolveEvent,
  retire,
  takePenalty,
  totals,
} from './engine/career'
import { deleteCareer, exportCareer, importCareer, listCareers, saveCareer } from './engine/storage'
import { MODE_CONFIG, type Career, type Offer, type PenaltyCorner } from './engine/types'
import { useI18n } from './i18n'
import type { StringKey } from './i18n/strings'
import { CreateScreen } from './ui/CreateScreen'
import { EventScreen } from './ui/EventScreen'
import { Identity } from './ui/Identity'
import { LangSwitch } from './ui/LangSwitch'
import { LeagueTable } from './ui/LeagueTable'
import { OfferScreen } from './ui/OfferScreen'
import { PenaltyScreen } from './ui/PenaltyScreen'
import { Rail } from './ui/Rail'
import { SeasonPanel } from './ui/SeasonPanel'
import { SettingsPanel } from './ui/SettingsPanel'
import { SummaryScreen } from './ui/SummaryScreen'
import { Crest, careerStage, seasonLabel, type Stage } from './ui/bits'
import { useTheme, type Theme } from './ui/useSettings'

type View = 'home' | 'create' | 'career'
type Standings = { clubId: string; season?: number }

const STEPS = [1, 3, 5]

export default function App() {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()
  const [view, setView] = useState<View>('home')
  const [career, setCareer] = useState<Career | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [standings, setStandings] = useState<Standings | null>(null)
  const [saves, setSaves] = useState<Career[]>(() => listCareers())
  /** an old season picked off the rail, or null for the one just played */
  const [reading, setReading] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const nowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (career) saveCareer(career)
  }, [career])

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
  }

  const play = (seasons: number) => {
    if (!career) return
    setCareer(playSeasons(career, seasons))
    setReading(null)
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
        <Topbar theme={theme} onTheme={toggle} />
        <CreateScreen onStart={open} onCancel={saves.length ? backHome : undefined} />
      </Frame>
    )
  }

  if (view === 'home' || !career) {
    return (
      <Frame label={t('app.name')}>
        <Topbar theme={theme} onTheme={toggle} />
        <Home
          saves={saves}
          onNew={() => setView('create')}
          onOpen={open}
          onDelete={(id) => {
            deleteCareer(id)
            setSaves(listCareers())
          }}
          onImport={() => fileInput.current?.click()}
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
  const steps = MODE_CONFIG[career.mode].seasons
  const stage = careerStage(career)

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
      <Topbar theme={theme} onTheme={toggle} onSettings={() => setSettingsOpen((v) => !v)}>
        <button className="act act--quiet" onClick={backHome}>
          {t('app.careers')}
        </button>
      </Topbar>

      {settingsOpen && (
        <SettingsPanel
          mode={career.mode}
          onMode={(mode) => setCareer({ ...career, mode })}
          onExport={() => exportCareer(career)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {career.phase === 'retired' ? (
        <SummaryScreen
          career={career}
          onPlayAgain={() => setView('create')}
          onBack={backHome}
          onClub={openClub}
        />
      ) : (
        <div className="spread">
          <div className="now">
            <Identity career={career} onClub={openClub} />

            {shown && (
              <SeasonPanel
                career={career}
                record={shown}
                onClub={openClub}
                onBack={reading !== null ? () => setReading(null) : undefined}
              />
            )}

            <div className="ask" ref={nowRef}>
              {career.phase === 'season' && (
                <>
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
          </div>

          <aside className="rail">
            <Rail
              career={career}
              reading={reading}
              onRead={(season) => setReading(season)}
              onNow={() => nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          </aside>
        </div>
      )}

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
  theme,
  onTheme,
  onSettings,
}: {
  children?: React.ReactNode
  theme: Theme
  onTheme: () => void
  onSettings?: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="topbar">
      <div className="wordmark">{t('app.name')}</div>
      <div className="topbar-tools">
        {children}
        <LangSwitch />
        <button
          className="act act--quiet act--icon"
          onClick={onTheme}
          title={t(theme === 'black' ? 'theme.white' : 'theme.black')}
          aria-label={t(theme === 'black' ? 'theme.white' : 'theme.black')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {theme === 'black' ? (
              <path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14m0 2.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2M11 1h2v2.8h-2zm0 19.2h2V23h-2zM1 11h2.8v2H1zm19.2 0H23v2h-2.8zM4.2 5.6l1.4-1.4 2 2-1.4 1.4zm12.2 12.2 1.4-1.4 2 2-1.4 1.4zm2-14.2 1.4 1.4-2 2-1.4-1.4zM4.2 18.4l2-2 1.4 1.4-2 2z" />
            ) : (
              <path d="M21 13.6A9 9 0 1 1 10.4 3a7.2 7.2 0 0 0 10.6 10.6" />
            )}
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

interface HomeProps {
  saves: Career[]
  onNew: () => void
  onOpen: (c: Career) => void
  onDelete: (id: string) => void
  onImport: () => void
}

function Home({ saves, onNew, onOpen, onDelete, onImport }: HomeProps) {
  const { t } = useI18n()
  const rows = useMemo(
    () => saves.map((c) => ({ career: c, stats: totals(c), club: CLUB_BY_ID[c.player.clubId] })),
    [saves],
  )

  return (
    <div className="flow">
      <section>
        <h1 className="poster-title">{t('home.title')}</h1>
        <p className="lede">{t('home.blurb')}</p>

        <div className="act-row" style={{ marginTop: 'var(--s5)' }}>
          <button className="act act--primary" onClick={onNew}>
            {t('home.new')}
          </button>
          <button className="act act--quiet" onClick={onImport}>
            {t('home.import')}
          </button>
        </div>
      </section>

      {rows.length > 0 && (
        <section>
          <div className="rule-head">
            <h2>{t('home.saved')}</h2>
            <span className="aside">{rows.length}</span>
          </div>
          {rows.map(({ career, stats, club }) => (
            <div className="roster-row" key={career.id}>
              {club && <Crest club={club} />}
              <div style={{ minWidth: 0 }}>
                <div className="roster-who">{career.player.name}</div>
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
              <div className="spacer" />
              <button className="act" onClick={() => onOpen(career)}>
                {career.phase === 'retired' ? t('home.view') : t('home.continue')}
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
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
