import { useEffect, useMemo } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { simulateTable, tableRng } from '../engine/sim'
import type { Career } from '../engine/types'
import { useI18n } from '../i18n'
import { Crest, Flag, seasonLabel } from './bits'

interface Props {
  career: Career
  clubId: string
  /** which season's table to show; defaults to the one being played */
  season?: number
  onClose: () => void
}

/**
 * The standings behind any club in the game. Nothing is stored: the table is
 * rebuilt from the career seed, the season and the league id, which is the
 * same stream the season itself ran on, so what you see here is what happened.
 *
 * It arrives from the edge rather than in the middle of the screen, so the
 * career you were reading stays where you left it.
 */
export function LeagueTable({ career, clubId, season, onClose }: Props) {
  const { t, country } = useI18n()
  const club = CLUB_BY_ID[clubId]
  const league = club ? LEAGUE_BY_ID[club.leagueId] : null

  // last completed season for this club, so a finished year shows its own table
  const year = season ?? career.season
  const played = career.history.find((h) => h.season === year && h.clubId === clubId)

  const rows = useMemo(() => {
    if (!league) return []
    const mine = career.player.clubId === clubId ? club : null
    return simulateTable(league, mine, career.player.ovr, tableRng(career.seed, year, league.id))
  }, [league, club, clubId, career.seed, career.player.clubId, career.player.ovr, year])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // A twenty-team table opens on row one; the row you came here for is
  // usually somewhere else entirely.
  useEffect(() => {
    document.querySelector('.standing--mine')?.scrollIntoView({ block: 'center' })
  }, [clubId, year])

  if (!league) return null

  const relegationFrom = league.below ? rows.length - 2 : -1

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="sheet-head">
          <div>
            <p className="kicker">
              {seasonLabel(year)} · {played ? t('table.final') : t('table.projected')}
            </p>
            <h3>
              <Flag code={league.flag} />
              {league.name}
            </h3>
            <p className="sheet-country">{country(league.country)}</p>
          </div>
          <button className="act act--quiet" onClick={onClose}>
            {t('table.close')}
          </button>
        </header>

        <div className="standings">
          {rows.map((row) => {
            const mine = row.club.id === clubId
            const euro = league.euroSpots > 0 && row.position <= league.euroSpots
            const drop = relegationFrom > 0 && row.position > relegationFrom
            return (
              <div
                key={row.club.id}
                className={`standing${mine ? ' standing--mine' : euro ? ' standing--euro' : drop ? ' standing--drop' : ''}`}
              >
                <span className="standing-pos">{row.position}</span>
                <Crest club={row.club} />
                <span className="standing-club">{row.club.name}</span>
                <span className="standing-pts">{row.points}</span>
              </div>
            )
          })}
        </div>

        <footer className="sheet-key">
          {league.euroSpots > 0 && (
            <span>
              <i className="euro" />
              {league.continental}
            </span>
          )}
          {league.below && (
            <span>
              <i className="drop" />
              {t('table.relegation')}
            </span>
          )}
          <span className="pts">{t('table.points')}</span>
        </footer>
      </div>
    </div>
  )
}
