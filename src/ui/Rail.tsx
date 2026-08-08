import { useEffect, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { NATION_BY_NAME } from '../data/nations'
import { rarityClass } from '../engine/rarity'
import { isKeeper } from '../engine/sim'
import type { Career, SeasonRecord, TrophyId } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Delta, Flag, LAST_AGE, STAGE_AT, TrophyIcon, seasonLabel } from './bits'

interface Spell {
  key: string
  clubId: string
  clubName: string
  badge: string | null
  leagueId: string
  onLoan: boolean
  age: number
  apps: number
  goals: number
  cleanSheets: number
  ovrEnd: number
  /** what was won here, so the cabinet shows up in the timeline */
  trophies: TrophyId[]
  seasons: SeasonRecord[]
}

/**
 * Consecutive seasons at one club are one line in a career, the way anybody
 * would say it out loud: three years at Bielefeld, then two on loan. Coming
 * back to a club years later is a second spell, not an amendment to the first.
 */
function spellsOf(history: SeasonRecord[]): Spell[] {
  const out: Spell[] = []
  for (const s of history) {
    const last = out[out.length - 1]
    if (last && last.clubId === s.clubId && last.onLoan === s.onLoan) {
      last.apps += s.apps
      last.goals += s.goals
      last.cleanSheets += s.cleanSheets
      last.ovrEnd = s.ovrEnd
      last.trophies.push(...s.trophies.map((tr) => tr.id))
      last.seasons.push(s)
      continue
    }
    out.push({
      key: `${s.clubId}-${s.season}`,
      clubId: s.clubId,
      clubName: s.clubName,
      badge: s.badge,
      leagueId: s.leagueId,
      onLoan: s.onLoan,
      age: s.age,
      apps: s.apps,
      goals: s.goals,
      cleanSheets: s.cleanSheets,
      ovrEnd: s.ovrEnd,
      trophies: s.trophies.map((tr) => tr.id),
      seasons: [s],
    })
  }
  return out
}

interface Props {
  career: Career
  /** the season currently being read in the left column, if it is an old one */
  reading: number | null
  onRead: (season: number) => void
  /** jump to whatever the career is waiting on */
  onNow: () => void
}

/**
 * The career as a column of years.
 *
 * It is keyed on age rather than season because that is the number a career is
 * actually measured in, and it runs to forty whether you get there or not: the
 * empty rows at the bottom are the part still to be played, and they are the
 * whole point of the thing. A career is not a list of what you did, it is a
 * fixed number of years and how many you have spent.
 */
export function Rail({ career, reading, onRead, onNow }: Props) {
  const { t, country, trophyShort } = useI18n()
  const keeper = isKeeper(career.player.position)
  const spells = spellsOf(career.history)
  const nation = NATION_BY_NAME[career.player.nation]
  const age = career.player.age

  const nat = career.history.reduce(
    (a, s) => ({
      apps: a.apps + s.natApps,
      goals: a.goals + s.natGoals,
      cs: a.cs + s.natCleanSheets,
    }),
    { apps: 0, goals: 0, cs: 0 },
  )

  // The spell you are in comes open; opening another closes it.
  const current = spells.length ? spells[spells.length - 1].key : null
  const [open, setOpen] = useState<string | null>(current)
  useEffect(() => setOpen(current), [current])

  // The years still to play. Every age a career changes character at is always
  // on the list and says what it is, so the empty half of the column reads as
  // the plan rather than as padding.
  const ahead: number[] = []
  for (let a = age + 2; a <= LAST_AGE; a += 2) ahead.push(a)
  for (const s of STAGE_AT) if (s.age > age && !ahead.includes(s.age)) ahead.push(s.age)
  ahead.sort((a, b) => a - b)

  return (
    <div className="years">
      <div className="years-head">
        <span>{t('rail.age')}</span>
        <span>{t('rail.career')}</span>
        <span>{t('table.apps')}</span>
        <span>{keeper ? t('table.cleanSheets') : t('table.goals')}</span>
        <span>{t('table.ovr')}</span>
      </div>

      {nation && (
        <div className="yr yr--nation">
          <span className="yr-age">·</span>
          <span className="yr-who">
            <Flag code={nation.flag} />
            <span className="nm">{country(nation.name)}</span>
          </span>
          <span className="yr-n">{nat.apps}</span>
          <span className="yr-n">{keeper ? nat.cs : nat.goals}</span>
          <span className="yr-ovr">·</span>
        </div>
      )}

      {spells.map((spell, i) => {
        const move = i > 0 ? stepBetween(spells[i - 1], spell) : null
        return (
        <div key={spell.key}>
          <button
            className={`yr yr--spell${open === spell.key ? ' yr--open' : ''}`}
            onClick={() => setOpen(open === spell.key ? null : spell.key)}
            aria-expanded={open === spell.key}
            title={t(open === spell.key ? 'rail.collapse' : 'rail.expand')}
          >
            <span className="yr-age">{spell.age}</span>
            <span className="yr-who">
              {/* a move up or down the pyramid is the loudest thing a career
                  does, and it is invisible if every club reads the same */}
              {move && (
                <span className={`yr-move yr-move--${move.dir}`} title={move.title}>
                  {move.dir === 'up' ? '↑' : '↓'}
                </span>
              )}
              {spell.onLoan && (
                <span className="yr-loan" title={t('card.loan')} aria-hidden="true">
                  ↩
                </span>
              )}
              <Crest club={{ name: spell.clubName, badge: spell.badge }} />
              <span className="nm">{spell.clubName}</span>
              {spell.trophies.length > 0 && (
                <span className="yr-cup" title={spell.trophies.map((id) => trophyShort(id)).join(', ')}>
                  {/* two at most, then a count: a shelf, not a parade */}
                  {spell.trophies.slice(0, 2).map((id, i) => (
                    <TrophyIcon id={id} size={13} key={i} />
                  ))}
                  {spell.trophies.length > 2 && <b>{spell.trophies.length}</b>}
                </span>
              )}
            </span>
            <span className="yr-n">{spell.apps}</span>
            <span className="yr-n">{keeper ? spell.cleanSheets : spell.goals}</span>
            <span className={`yr-ovr ovr ${rarityClass(spell.ovrEnd)}`}>{spell.ovrEnd}</span>
          </button>

          {open === spell.key &&
            spell.seasons.map((s) => {
              const delta = s.ovrEnd - s.ovrStart
              return (
                <button
                  className={`sub${reading === s.season ? ' sub--on' : ''}`}
                  key={s.season}
                  onClick={() => onRead(s.season)}
                >
                  <span className="sub-yr">{seasonLabel(s.season)}</span>
                  <span className="sub-what">
                    {s.banned ? (
                      <span className="sub-out">{t('table.banned')}</span>
                    ) : (
                      <>
                        {s.apps} {t('table.apps')} · {keeper ? s.cleanSheets : s.goals}{' '}
                        {keeper ? t('table.cleanSheets') : t('table.goals')}
                      </>
                    )}
                  </span>
                  <span className="sub-num">
                    {s.ovrEnd}
                    {delta !== 0 && <Delta value={delta} />}
                  </span>
                </button>
              )
            })}
        </div>
        )
      })}

      <button className="yr yr--now" onClick={onNow}>
        <span className="yr-age">{age}</span>
        <span className="yr-who">{t('rail.unwritten')}</span>
        <span className="yr-n" />
        <span className="yr-n" />
        <span className="yr-ovr">?</span>
      </button>

      {ahead.map((a) => {
        const opens = STAGE_AT.find((s) => s.age === a)
        return (
          <div className={`yr yr--ahead${opens ? ' yr--chapter' : ''}`} key={a}>
            <span className="yr-age">{a}</span>
            <span className="yr-who">
              {opens && <span className="yr-stage">{t(`stage.${opens.stage}` as StringKey)}</span>}
            </span>
            <span className="yr-n" />
            <span className="yr-n" />
            <span className="yr-ovr" />
          </div>
        )
      })}
    </div>
  )
}

/**
 * Whether a transfer was a step up, a step down, or a move across.
 *
 * It is read off the two squads rather than the two divisions, because a title
 * side in a smaller league is a bigger move than a relegation side in a bigger
 * one, and the divisions alone would call that a demotion. The tooltip still
 * names the leagues, which is how anybody would describe the move out loud.
 */
function stepBetween(from: Spell, to: Spell): { dir: 'up' | 'down'; title: string } | null {
  const leagueA = LEAGUE_BY_ID[from.leagueId]
  const leagueB = LEAGUE_BY_ID[to.leagueId]
  if (!leagueA || !leagueB) return null
  const a = CLUB_BY_ID[from.clubId]?.strength ?? leagueA.strength
  const b = CLUB_BY_ID[to.clubId]?.strength ?? leagueB.strength
  const gap = b - a
  if (Math.abs(gap) < 2) return null
  return { dir: gap > 0 ? 'up' : 'down', title: `${leagueA.name} → ${leagueB.name}` }
}
