import { NATION_BY_NAME } from '../data/nations'
import { totals } from '../engine/career'
import { isDefender, isKeeper } from '../engine/sim'
import type { Career, Position } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Delta, Flag, TierNum, TrophyIcon, seasonLabel } from './bits'

type Col = { key: string; label: StringKey }

function columnsFor(pos: Position): Col[] {
  if (isKeeper(pos)) {
    return [
      { key: 'apps', label: 'table.apps' },
      { key: 'cs', label: 'table.cleanSheets' },
      { key: 'con', label: 'table.conceded' },
      { key: 'saves', label: 'table.saves' },
    ]
  }
  if (isDefender(pos)) {
    return [
      { key: 'apps', label: 'table.apps' },
      { key: 'goals', label: 'table.goals' },
      { key: 'assists', label: 'table.assists' },
      { key: 'cs', label: 'table.cleanSheets' },
    ]
  }
  return [
    { key: 'apps', label: 'table.apps' },
    { key: 'goals', label: 'table.goals' },
    { key: 'assists', label: 'table.assists' },
    { key: 'kp', label: 'table.keyPasses' },
  ]
}

interface Props {
  career: Career
  onClub: (clubId: string, season: number) => void
}

/** Every season of a career, one row each, dense enough to scan in one look. */
export function CareerTable({ career, onClub }: Props) {
  const { t, trophy } = useI18n()
  const cols = columnsFor(career.player.position)
  const nation = NATION_BY_NAME[career.player.nation]
  const peak = totals(career).peakOvr

  const nat = career.history.reduce(
    (acc, s) => ({
      apps: acc.apps + s.natApps,
      goals: acc.goals + s.natGoals,
      assists: acc.assists + s.natAssists,
      cs: acc.cs + s.natCleanSheets,
    }),
    { apps: 0, goals: 0, assists: 0, cs: 0 },
  )

  if (career.history.length === 0) {
    return <p className="empty">{t('table.empty')}</p>
  }

  return (
    <div className="ledger-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th className="left">{t('table.season')}</th>
            <th className="left">{t('table.club')}</th>
            <th>{t('table.age')}</th>
            <th>{t('table.ovr')}</th>
            {cols.map((c) => (
              <th key={c.key}>{t(c.label)}</th>
            ))}
            <th>{t('table.rating')}</th>
          </tr>
        </thead>
        <tbody>
          {career.history.map((s) => {
            const values: Record<string, number> = {
              apps: s.apps,
              goals: s.goals,
              assists: s.assists,
              cs: s.cleanSheets,
              con: s.conceded,
              saves: s.saves,
              kp: s.keyPasses,
            }
            const delta = s.ovrEnd - s.ovrStart
            return (
              <tr key={s.season} className={s.ovrEnd === peak ? 'peak' : undefined}>
                <td className="left ledger-yr">{seasonLabel(s.season)}</td>
                <td className="left">
                  <button className="ledger-club" onClick={() => onClub(s.clubId, s.season)}>
                    <Crest club={{ name: s.clubName, badge: s.badge }} />
                    <span className="nm">{s.clubName}</span>
                    {s.banned && <span className="stamp stamp--out">{t('table.banned')}</span>}
                    {s.onLoan && <span className="stamp">{t('card.loan')}</span>}
                    {s.trophies.map((tr, i) => (
                      <span key={i} title={trophy(tr)}>
                        <TrophyIcon id={tr.id} size={13} />
                      </span>
                    ))}
                  </button>
                </td>
                <td>{s.age}</td>
                <td>
                  <TierNum value={s.ovrEnd} /> {delta !== 0 && <Delta value={delta} />}
                </td>
                {cols.map((c) => (
                  <td key={c.key}>{values[c.key]}</td>
                ))}
                <td>{s.rating > 0 ? s.rating.toFixed(2) : '·'}</td>
              </tr>
            )
          })}

          {nat.apps > 0 && nation && (
            <tr>
              <td className="left ledger-yr">
                <Flag code={nation.flag} />
              </td>
              <td className="left">
                <span className="nm">{t('table.national')}</span>
              </td>
              <td>·</td>
              <td>·</td>
              {cols.map((c) => (
                <td key={c.key}>
                  {c.key === 'apps'
                    ? nat.apps
                    : c.key === 'goals'
                      ? nat.goals
                      : c.key === 'assists'
                        ? nat.assists
                        : c.key === 'cs'
                          ? nat.cs
                          : '·'}
                </td>
              ))}
              <td>·</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
