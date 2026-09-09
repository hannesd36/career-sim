import { CLUB_BY_ID } from '../data/clubs'
import { NATION_BY_NAME } from '../data/nations'
import { totals } from '../engine/career'
import { rarityClass } from '../engine/rarity'
import { rivalCareer, rivalCompare, rivalNewsFor, type RivalStanding } from '../engine/rival'
import type { Career } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag } from './bits'

/**
 * The other one from your year.
 *
 * Two columns, four numbers each, and no commentary: the whole point of him is
 * that you can see in one glance whether you are winning. It only appears once
 * there is something to compare — before the first season there are two
 * sixteen year olds and no argument.
 */
export function RivalPanel({ career }: { career: Career }) {
  const { t, country } = useI18n()
  const run = rivalCareer(career)
  if (!run || career.history.length < 2) return null

  const stats = totals(career)
  const club = CLUB_BY_ID[run.clubId]
  const mine = CLUB_BY_ID[career.player.clubId]
  const nation = NATION_BY_NAME[run.peer.nation]
  const myNation = NATION_BY_NAME[career.player.nation]
  const ahead = run.ovr > career.player.ovr

  return (
    <section className="rival">
      <div className="rival-head">
        <h3>{t('rival.title')}</h3>
        <span>{t('rival.age', { age: career.player.age })}</span>
      </div>

      <div className="rival-pair">
        <RivalSide
          name={career.player.name}
          flag={myNation ? <Flag code={myNation.flag} title={country(myNation.name)} /> : null}
          club={mine ? <Crest club={mine} /> : null}
          clubName={mine?.name ?? ''}
          ovr={career.player.ovr}
          goals={stats.goals + stats.natGoals}
          trophies={career.trophies.length}
          you
          leading={!ahead}
        />
        <RivalSide
          name={run.peer.name}
          flag={nation ? <Flag code={nation.flag} title={country(nation.name)} /> : null}
          club={club ? <Crest club={club} /> : null}
          clubName={club?.name ?? ''}
          ovr={run.ovr}
          goals={run.goals}
          trophies={run.majors + run.ballonDors}
          leading={ahead}
        />
      </div>
    </section>
  )
}

function RivalSide({
  name,
  flag,
  club,
  clubName,
  ovr,
  goals,
  trophies,
  you = false,
  leading = false,
}: {
  name: string
  flag: React.ReactNode
  club: React.ReactNode
  clubName: string
  ovr: number
  goals: number
  trophies: number
  you?: boolean
  leading?: boolean
}) {
  const { t, num } = useI18n()
  return (
    <div
      className={`rival-side${you ? ' rival-side--you' : ''}${leading ? ' rival-side--up' : ''}`}
    >
      <span className="rival-who">
        {flag}
        <b>{you ? t('rival.you') : name}</b>
      </span>
      <span className="rival-club">
        {club}
        <span className="nm">{clubName}</span>
      </span>
      <span className={`rival-ovr ovr ${rarityClass(ovr)}`}>{ovr}</span>
      <span className="rival-nums">
        <span>
          {t('card.goals')}
          <b>{num(goals)}</b>
        </span>
        <span>
          {t('hof.col.trophies')}
          <b>{num(trophies)}</b>
        </span>
      </span>
    </div>
  )
}

/** What he did this year, in the season report, when he did anything. */
export function RivalNews({ career, season }: { career: Career; season: number }) {
  const { t } = useI18n()
  const news = rivalNewsFor(career, season)
  if (!news) return null
  return (
    <div className="note note--rival">{t(`rival.news.${news.id}` as StringKey, news.params)}</div>
  )
}

/**
 * The question the whole thing was for, asked once, at the end.
 *
 * It does answer it — a verdict you have to work out yourself is not a
 * verdict — but the numbers are right there next to it, so anybody who
 * disagrees can disagree with the evidence in front of them.
 */
export function RivalVerdict({ career }: { career: Career }) {
  const { t } = useI18n()
  const compare = rivalCompare(career)
  if (!compare) return null
  const { you, rival, verdict } = compare

  return (
    <section className="versus">
      <div className="versus-head">
        <span className="versus-k">{t('rival.versus')}</span>
        <h3 className="versus-ask">{t('rival.whoWasBetter')}</h3>
      </div>

      <div className="versus-grid">
        <span className="versus-label" />
        <span className={`versus-name${verdict === 'you' ? ' versus-name--won' : ''}`}>
          {you.name}
        </span>
        <span className={`versus-name${verdict === 'rival' ? ' versus-name--won' : ''}`}>
          {rival.name}
        </span>

        <Row k={t('summary.peak')} a={you} b={rival} pick={(s) => s.ovr} />
        <Row k={t('card.goals')} a={you} b={rival} pick={(s) => s.goals} />
        <Row k={t('recap.titles')} a={you} b={rival} pick={(s) => s.majors} />
        <Row k={t('trophy.short.continental')} a={you} b={rival} pick={(s) => s.continental} />
        <Row k={t('trophy.short.ballondor')} a={you} b={rival} pick={(s) => s.ballonDors} />
      </div>

      <p className="versus-verdict">
        {t(`rival.verdict.${verdict}` as StringKey, { name: rival.name })}
      </p>
    </section>
  )
}

function Row({
  k,
  a,
  b,
  pick,
}: {
  k: string
  a: RivalStanding
  b: RivalStanding
  pick: (s: RivalStanding) => number
}) {
  const { num } = useI18n()
  const left = pick(a)
  const right = pick(b)
  if (left === 0 && right === 0) return null
  return (
    <>
      <span className="versus-label">{k}</span>
      <span className={`versus-n${left > right ? ' versus-n--up' : ''}`}>{num(left)}</span>
      <span className={`versus-n${right > left ? ' versus-n--up' : ''}`}>{num(right)}</span>
    </>
  )
}
