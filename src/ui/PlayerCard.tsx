import { useEffect, useRef, useState } from 'react'
import { CLUB_BY_ID } from '../data/clubs'
import { LEAGUE_BY_ID } from '../data/leagues'
import { NATION_BY_NAME } from '../data/nations'
import { totals } from '../engine/career'
import { legacyOf } from '../engine/legacy'
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
  const over = career.phase === 'retired' || player.retired
  const legacy = legacyOf(career)
  /*
   * A career in progress is worth what it is worth today; a career that is
   * over is worth what it got to. A thirty-eight year old finishes on a rating
   * in the forties whatever he did at twenty-eight, and a card that says
   * BRONZE 41 is not the card of the career you actually played.
   */
  const shown = over ? Math.max(stats.peakOvr, player.ovr) : player.ovr

  const body = (
    <>
      <div className="pc-top">
        <div className="pc-rating">
          <span className="pc-ovr">{shown}</span>
          <span className="pc-pos">{t(`pos.${player.position}` as StringKey)}</span>
          <span className="pc-tier">{t(`rar.${rarityOf(shown)}` as StringKey)}</span>
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

      {/* A finished career's card stops being a status and becomes a verdict:
          the class of career it turned out to be, printed on the thing you
          keep. Nothing is unlocked by it; it is simply what happened. */}
      {over && <div className="pc-final">{t(`legacy.tier.${legacy.tier}` as StringKey)}</div>}

      <div className="pc-stats">
        <span>
          <i>{over ? t('summary.retiredAtShort') : t('card.age')}</i>
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

  const className = `pcard pcard--${size} ${rarityClass(shown)}${over ? ' pcard--over' : ''}`
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
  const stats = totals(career)
  const over = career.phase === 'retired' || player.retired
  // the same rule as the card on the page: a finished career shows what it got to
  const shown = over ? Math.max(stats.peakOvr, player.ovr) : player.ovr
  const ink = RARITY_INK[rarityOf(shown)]
  const keeper = isKeeper(player.position)

  // The page's own two faces, with the same fallbacks the stylesheet uses, so
  // a card drawn before the webfonts land is still the right card.
  const poster = "'Anton', 'Arial Narrow', Impact, sans-serif"
  const doc = "'IBM Plex Sans', system-ui, sans-serif"

  // ground
  ctx.fillStyle = '#0e100e'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 250, 20, W / 2, 300, 520)
  glow.addColorStop(0, `${ink}26`)
  glow.addColorStop(1, '#0e100e00')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // frame
  ctx.strokeStyle = ink
  ctx.lineWidth = 3
  ctx.strokeRect(24, 24, W - 48, H - 48)
  ctx.globalAlpha = 0.3
  ctx.strokeRect(34, 34, W - 68, H - 68)
  ctx.globalAlpha = 1

  const centre = (text: string, y: number, font: string, colour: string) => {
    ctx.font = font
    ctx.fillStyle = colour
    ctx.textAlign = 'center'
    ctx.fillText(text, W / 2, y)
  }
  const rule = (y: number, inset: number, colour: string, width = 2) => {
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(inset, y)
    ctx.lineTo(W - inset, y)
    ctx.stroke()
  }

  // the wordmark, so a card that leaves the browser says where it came from
  centre(labels.wordmark.toUpperCase(), 82, `500 15px ${doc}`, '#87847d')
  rule(100, 120, '#2a2d29')

  centre(String(shown), 250, `400 150px ${poster}`, ink)
  centre(labels.position.toUpperCase(), 296, `600 26px ${doc}`, '#f4f2ec')
  centre(labels.tier.toUpperCase(), 332, `500 18px ${doc}`, `${ink}cc`)

  rule(372, 120, `${ink}66`)

  // The name is the one thing that must never be cut off, so it shrinks until
  // it fits rather than running past the frame.
  let nameSize = 62
  ctx.font = `400 ${nameSize}px ${poster}`
  while (ctx.measureText(player.name).width > W - 140 && nameSize > 24) {
    nameSize -= 2
    ctx.font = `400 ${nameSize}px ${poster}`
  }
  centre(player.name.toUpperCase(), 448, `400 ${nameSize}px ${poster}`, '#f4f2ec')
  centre(labels.identity, 490, `500 20px ${doc}`, '#b9b6ad')
  centre(labels.span, 534, `400 30px ${poster}`, '#87847d')

  const cells: [string, string][] = [
    [labels.apps, String(stats.apps + stats.natApps)],
    [
      keeper ? labels.cleanSheets : labels.goals,
      String(keeper ? stats.cleanSheets : stats.goals + stats.natGoals),
    ],
    [
      labels.trophies,
      String(career.trophies.filter((tr) => MAJOR_TROPHIES.includes(tr.id)).length),
    ],
  ]
  const colW = (W - 120) / cells.length
  cells.forEach(([key, value], i) => {
    const x = 60 + colW * i + colW / 2
    ctx.textAlign = 'center'
    ctx.font = `500 15px ${doc}`
    ctx.fillStyle = '#87847d'
    ctx.fillText(key.toUpperCase(), x, 620)
    ctx.font = `400 46px ${poster}`
    ctx.fillStyle = '#f4f2ec'
    ctx.fillText(value, x, 672)
  })

  rule(722, 120, `${ink}44`, 1)

  // the one number two careers can be put in an order on
  centre(labels.legacy.toUpperCase(), 762, `600 14px ${doc}`, '#87847d')
  centre(labels.score, 818, `400 62px ${poster}`, ink)
  centre(labels.verdict.toUpperCase(), 852, `500 17px ${doc}`, '#b9b6ad')
}

interface CardLabels {
  wordmark: string
  position: string
  tier: string
  /** club, country and position on one line */
  identity: string
  /** the years it ran, as two ages */
  span: string
  apps: string
  goals: string
  cleanSheets: string
  trophies: string
  legacy: string
  score: string
  verdict: string
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
  const [done, setDone] = useState<'saved' | 'copied' | 'shared' | null>(null)
  const club = CLUB_BY_ID[career.player.clubId]
  const nation = NATION_BY_NAME[career.player.nation]
  const legacy = legacyOf(career)
  const first = career.history[0]
  const over = career.phase === 'retired' || career.player.retired
  const cardOvr = over ? Math.max(totals(career).peakOvr, career.player.ovr) : career.player.ovr

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const identity = [club?.name ?? t('card.freeAgent'), nation ? country(nation.name) : '']
      .filter(Boolean)
      .join(' · ')
    const draw = () =>
      drawCard(canvas, career, {
        wordmark: t('app.name'),
        position: t(`pos.${career.player.position}` as StringKey),
        tier: t(`rar.${rarityOf(cardOvr)}` as StringKey),
        identity,
        span: `${first ? first.age : 16} → ${career.player.age}`,
        apps: t('table.apps'),
        goals: t('table.goals'),
        cleanSheets: t('table.cleanSheets'),
        trophies: t('hof.col.trophies'),
        legacy: t('legacy.score'),
        score: num(legacy.total),
        verdict: t(`legacy.tier.${legacy.tier}` as StringKey),
      })

    draw()
    // The two faces arrive over the network. Redrawing once they are here is
    // the difference between the card and a picture of the card in Arial.
    void document.fonts?.ready.then(draw)
  }, [career, t, country, num, club, nation, legacy, first])

  const withBlob = (then: (blob: Blob) => void) => {
    canvasRef.current?.toBlob((blob) => blob && then(blob), 'image/png')
  }

  const fileName = `${career.player.name.replace(/\s+/g, '-').toLowerCase()}-${seasonLabel(
    career.season,
  )}.png`

  const save = () =>
    withBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      setDone('saved')
    })

  /*
   * Sharing, in whatever way this browser actually supports.
   *
   * A phone hands the card to whatever the person shares things with; a
   * desktop puts it on the clipboard; anything that can do neither still has
   * the save button and the picture on the page. Nothing here is a dependency
   * and nothing here fails loudly.
   */
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare
  const share = () =>
    withBlob((blob) => {
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        void navigator
          .share({ files: [file], title: career.player.name })
          .then(() => setDone('shared'))
          .catch(() => undefined)
        return
      }
      const item = new ClipboardItem({ 'image/png': blob })
      void navigator.clipboard
        ?.write([item])
        .then(() => setDone('copied'))
        .catch(() => undefined)
    })

  return (
    <div className="cardsheet" role="dialog" aria-modal="true">
      <div className="cardsheet-box">
        <div className="cardsheet-head">
          <h2>{t('share.title')}</h2>
          <button
            className="act act--quiet act--icon"
            onClick={onClose}
            aria-label={t('app.close')}
          >
            ✕
          </button>
        </div>
        <canvas ref={canvasRef} className="share-canvas" style={{ width: 320, height: 450 }} />
        <p className="hint">{t('share.hint')}</p>
        <div className="act-row">
          <button className="act act--primary" onClick={save}>
            {done === 'saved' ? t('share.saved') : t('share.save')}
          </button>
          {canShare && (
            <button className="act" onClick={share}>
              {done === 'shared' || done === 'copied' ? t('share.shared') : t('share.share')}
            </button>
          )}
          <button className="act act--quiet" onClick={onClose}>
            {t('app.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
