import { useEffect, useRef, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { NATION_BY_NAME } from '../data/nations'
import { careerScore, totals } from '../engine/career'
import { RARITY_INK, rarityClass, rarityOf } from '../engine/rarity'
import { isKeeper } from '../engine/sim'
import { MAJOR_TROPHIES, type Career } from '../engine/types'
import { useI18n } from '../i18n'
import type { StringKey } from '../i18n/strings'
import { Crest, Flag, seasonLabel } from './bits'

/**
 * The card.
 *
 * Everything else in the game is a report; this is the thing you are actually
 * playing for. It carries the four numbers a player is discussed in, the shirt
 * he is in, and the tier the rating belongs to — and it grows as the career
 * does, which is why it sits at the top of the career screen rather than only
 * on the screen you reach once it is over.
 */
export function PlayerCard({
  career,
  size = 'lg',
  onClick,
}: {
  career: Career
  size?: 'lg' | 'sm'
  onClick?: () => void
}) {
  const { t, country, num } = useI18n()
  const { player } = career
  const club = CLUB_BY_ID[player.clubId]
  const league = club ? LEAGUE_BY_ID[club.leagueId] : null
  const nation = NATION_BY_NAME[player.nation]
  const stats = totals(career)
  const keeper = isKeeper(player.position)
  const majors = career.trophies.filter((tr) => MAJOR_TROPHIES.includes(tr.id)).length

  const body = (
    <>
      <div className="pc-top">
        <div className="pc-rating">
          <span className="pc-ovr">{player.ovr}</span>
          <span className="pc-pos">{t(`pos.${player.position}` as StringKey)}</span>
          <span className="pc-tier">{t(`rar.${rarityOf(player.ovr)}` as StringKey)}</span>
        </div>
        <div className="pc-marks">
          {nation && <Flag code={nation.flag} title={country(nation.name)} />}
          {club && <Crest club={club} size="lg" eager />}
        </div>
      </div>

      <div className="pc-name">{player.name}</div>
      <div className="pc-club">
        {club ? club.name : t('card.freeAgent')}
        {league && <span className="pc-league">{league.name}</span>}
      </div>

      <div className="pc-stats">
        <span>
          <i>{t('card.age')}</i>
          <b>{player.age}</b>
        </span>
        <span>
          <i>{t('table.apps')}</i>
          <b>{num(stats.apps + stats.natApps)}</b>
        </span>
        <span>
          <i>{keeper ? t('table.cleanSheets') : t('table.goals')}</i>
          <b>{num(keeper ? stats.cleanSheets : stats.goals + stats.natGoals)}</b>
        </span>
        <span>
          <i>{t('hof.col.trophies')}</i>
          <b>{num(majors)}</b>
        </span>
      </div>
    </>
  )

  const className = `pcard pcard--${size} ${rarityClass(player.ovr)}`
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

/**
 * The card again, drawn rather than laid out, so it can leave the browser.
 *
 * It is redrawn on a canvas instead of being screenshotted because a crest and
 * a flag are remote images: pulling them onto a canvas taints it and the export
 * fails silently. Everything here is shapes and text — initials stand in for
 * the badge, exactly as they already do wherever a crest fails to load.
 */
function drawCard(canvas: HTMLCanvasElement, career: Career, labels: CardLabels) {
  const W = 640
  const H = 900
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const { player } = career
  const ink = RARITY_INK[rarityOf(player.ovr)]
  const stats = totals(career)
  const keeper = isKeeper(player.position)

  // ground
  ctx.fillStyle = '#0e100e'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 210, 20, W / 2, 260, 520)
  glow.addColorStop(0, `${ink}33`)
  glow.addColorStop(1, '#0e100e00')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // frame
  ctx.strokeStyle = ink
  ctx.lineWidth = 3
  ctx.strokeRect(24, 24, W - 48, H - 48)
  ctx.globalAlpha = 0.35
  ctx.strokeRect(34, 34, W - 68, H - 68)
  ctx.globalAlpha = 1

  const centre = (text: string, y: number, font: string, colour: string) => {
    ctx.font = font
    ctx.fillStyle = colour
    ctx.textAlign = 'center'
    ctx.fillText(text, W / 2, y)
  }

  centre(String(player.ovr), 250, '700 190px Georgia, serif', ink)
  centre(labels.position.toUpperCase(), 300, '600 30px system-ui, sans-serif', '#f4f2ec')
  centre(labels.tier.toUpperCase(), 340, '500 20px system-ui, sans-serif', `${ink}cc`)

  ctx.strokeStyle = `${ink}66`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(120, 380)
  ctx.lineTo(W - 120, 380)
  ctx.stroke()

  // The name is the one thing that must never be cut off, so it shrinks until
  // it fits rather than running past the frame.
  let nameSize = 52
  ctx.font = `700 ${nameSize}px Georgia, serif`
  while (ctx.measureText(player.name).width > W - 140 && nameSize > 22) {
    nameSize -= 2
    ctx.font = `700 ${nameSize}px Georgia, serif`
  }
  centre(player.name, 450, `700 ${nameSize}px Georgia, serif`, '#f4f2ec')
  centre(labels.club, 496, '500 26px system-ui, sans-serif', '#b9b6ad')
  centre(labels.nation, 532, '500 20px system-ui, sans-serif', '#87847d')

  const cells: [string, string][] = [
    [labels.age, String(player.age)],
    [labels.apps, String(stats.apps + stats.natApps)],
    [keeper ? labels.cleanSheets : labels.goals, String(keeper ? stats.cleanSheets : stats.goals + stats.natGoals)],
    [labels.trophies, String(career.trophies.filter((tr) => MAJOR_TROPHIES.includes(tr.id)).length)],
  ]
  const colW = (W - 120) / cells.length
  cells.forEach(([key, value], i) => {
    const x = 60 + colW * i + colW / 2
    ctx.textAlign = 'center'
    ctx.font = '500 17px system-ui, sans-serif'
    ctx.fillStyle = '#87847d'
    ctx.fillText(key.toUpperCase(), x, 620)
    ctx.font = '700 40px Georgia, serif'
    ctx.fillStyle = '#f4f2ec'
    ctx.fillText(value, x, 668)
  })

  ctx.beginPath()
  ctx.moveTo(120, 720)
  ctx.lineTo(W - 120, 720)
  ctx.strokeStyle = `${ink}44`
  ctx.stroke()

  centre(labels.summary, 772, '500 22px system-ui, sans-serif', '#b9b6ad')
  centre(labels.site, 828, '600 20px system-ui, sans-serif', `${ink}aa`)
}

interface CardLabels {
  position: string
  tier: string
  club: string
  nation: string
  age: string
  apps: string
  goals: string
  cleanSheets: string
  trophies: string
  summary: string
  site: string
}

/**
 * The card, plus the button that turns it into a file.
 *
 * The sandbox a published page runs in can refuse a script-driven download, so
 * the drawn card is also shown on the page: if saving does not work the picture
 * is still right there to be screenshotted, which is what most people do anyway.
 */
export function ShareCard({ career, onClose }: { career: Career; onClose: () => void }) {
  const { t, country, num } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [saved, setSaved] = useState(false)
  const club = CLUB_BY_ID[career.player.clubId]
  const nation = NATION_BY_NAME[career.player.nation]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawCard(canvas, career, {
      position: t(`pos.${career.player.position}` as StringKey),
      tier: t(`rar.${rarityOf(career.player.ovr)}` as StringKey),
      club: club?.name ?? t('card.freeAgent'),
      nation: nation ? country(nation.name) : '',
      age: t('card.age'),
      apps: t('table.apps'),
      goals: t('table.goals'),
      cleanSheets: t('table.cleanSheets'),
      trophies: t('hof.col.trophies'),
      summary: t('share.summary', {
        seasons: career.history.length,
        score: num(careerScore(career)),
      }),
      site: 'karriere-sim.de',
    })
  }, [career, t, country, num, club, nation])

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${career.player.name.replace(/\s+/g, '-').toLowerCase()}-${seasonLabel(career.season)}.png`
      a.click()
      URL.revokeObjectURL(url)
      setSaved(true)
    }, 'image/png')
  }

  return (
    <div className="cardsheet" role="dialog" aria-modal="true">
      <div className="cardsheet-box">
        <div className="cardsheet-head">
          <h2>{t('share.title')}</h2>
          <button className="act act--quiet act--icon" onClick={onClose} aria-label={t('app.close')}>
            ✕
          </button>
        </div>
        <canvas ref={canvasRef} className="share-canvas" style={{ width: 320, height: 450 }} />
        <p className="hint">{t('share.hint')}</p>
        <div className="act-row">
          <button className="act act--primary" onClick={save}>
            {saved ? t('share.saved') : t('share.save')}
          </button>
          <button className="act act--quiet" onClick={onClose}>
            {t('app.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
