import { useEffect, useState } from 'react'
import { NATION_BY_NAME } from '../data/nations'
import { rarityClass } from '../engine/rarity'
import { isKeeper } from '../engine/sim'
import type { Career, SeasonRecord } from '../engine/types'
import { useI18n } from '../i18n'
import { Crest, Delta, Flag, TrophyIcon, seasonLabel } from './bits'

/** Nobody plays past forty, so that is where the empty years stop. */
const LAST_AGE = 40

interface Spell {
  key: string
  clubId: string
  clubName: string
  badge: string | null
  onLoan: boolean
  age: number
  apps: number
  goals: number
  cleanSheets: number
  ovrEnd: number
  trophies: number
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
      last.trophies += s.trophies.length
      last.seasons.push(s)
      continue
    }
    out.push({
      key: `${s.clubId}-${s.season}`,
      clubId: s.clubId,
      clubName: s.clubName,
      badge: s.badge,
      onLoan: s.onLoan,
      age: s.age,
      apps: s.apps,
      goals: s.goals,
      cleanSheets: s.cleanSheets,
      ovrEnd: s.ovrEnd,
      trophies: s.trophies.length,
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
  const { t, country } = useI18n()
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

  const ahead: number[] = []
  for (let a = age + 2; a <= LAST_AGE; a += 2) ahead.push(a)

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

      {spells.map((spell) => (
        <div key={spell.key}>
          <button
            className={`yr yr--spell${open === spell.key ? ' yr--open' : ''}`}
            onClick={() => setOpen(open === spell.key ? null : spell.key)}
            aria-expanded={open === spell.key}
            title={t(open === spell.key ? 'rail.collapse' : 'rail.expand')}
          >
            <span className="yr-age">{spell.age}</span>
            <span className="yr-who">
              {spell.onLoan && (
                <span className="yr-loan" title={t('card.loan')} aria-hidden="true">
                  ↩
                </span>
              )}
              <Crest club={{ name: spell.clubName, badge: spell.badge }} />
              <span className="nm">{spell.clubName}</span>
              {spell.trophies > 0 && (
                <span className="yr-cup">
                  <TrophyIcon id="league" size={12} />
                  {spell.trophies > 1 && <b>{spell.trophies}</b>}
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
      ))}

      <button className="yr yr--now" onClick={onNow}>
        <span className="yr-age">{age}</span>
        <span className="yr-who">{t('rail.unwritten')}</span>
        <span className="yr-n" />
        <span className="yr-n" />
        <span className="yr-ovr">?</span>
      </button>

      {ahead.map((a) => (
        <div className="yr yr--ahead" key={a}>
          <span className="yr-age">{a}</span>
          <span className="yr-who" />
          <span className="yr-n" />
          <span className="yr-n" />
          <span className="yr-ovr" />
        </div>
      ))}
    </div>
  )
}
