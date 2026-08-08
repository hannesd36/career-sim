import { useId } from 'react'
import type { Honour } from '../data/players'

/**
 * The cabinet, drawn properly.
 *
 * The career simulator's trophies are line drawings in the current text colour,
 * because they sit inside sentences and tables at thirteen pixels. These are the
 * other kind: the actual cups, in metal, big enough to recognise across a room.
 * A European Cup has ears. A World Cup is two men holding up the earth. A Ballon
 * d'Or is a ball on a plinth and nothing else.
 *
 * Every one is an SVG rather than a photograph, so it weighs nothing, never
 * fails to load, and prints the same on a phone and on a projector.
 */

type Metal = 'gold' | 'silver' | 'bronze'

const METALS: Record<Metal, [string, string, string]> = {
  // dark, mid, light
  gold: ['#8a5a12', '#d8a431', '#ffe9a8'],
  silver: ['#6d7681', '#b9c2cc', '#f2f6fa'],
  bronze: ['#7a4420', '#c07a3e', '#f0c39a'],
}

interface ArtProps {
  /** the gradient the body is filled with */
  fill: string
  /** a darker line, for the parts that sit behind */
  shade: string
}

/** Every drawing is made inside this box, standing on the floor of it. */
const BOX = '0 0 48 64'

const PLINTH = (
  <>
    <rect x="14" y="55" width="20" height="4" rx="1.2" opacity="0.85" />
    <rect x="11" y="58.5" width="26" height="4.5" rx="1.6" />
  </>
)

/** The wide flat base the individual awards stand on. */
const BLOCK = (
  <>
    <rect x="13" y="52" width="22" height="5" rx="1.4" opacity="0.85" />
    <rect x="10" y="56.5" width="28" height="6.5" rx="2" />
  </>
)

type Draw = (p: ArtProps) => React.ReactNode

/** The European Cup: a deep bowl and two ears you could carry a piano with. */
const bigEars: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M15 6h18v10c0 9.4-3.2 15-6.6 17.4V44h5.2a1.8 1.8 0 0 1 0 3.6H26v3.6h-8v-3.6h-5.6a1.8 1.8 0 0 1 0-3.6H18v-10.6C14.4 31 12 25.4 12 16V6z"
    />
    <path
      fill={fill}
      d="M12 8.5C6.5 10 3.4 14.2 4.6 18.8 5.7 23 9.7 25.4 14.4 25.4v-4.6c-2.4 0-4.2-1-4.7-2.6-.5-1.8.6-3.3 2.9-4.1zM36 8.5v5.5c2.3.8 3.4 2.3 2.9 4.1-.5 1.6-2.3 2.6-4.7 2.6v4.6c4.7 0 8.7-2.4 9.8-6.6C45.2 14.2 42.1 10 36 8.5z"
    />
    <path fill={shade} opacity="0.35" d="M19 9h3.4v18.6c-2.3-2.4-3.4-7-3.4-14.6z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Europa League: a tall fluted cup with a lid you never see lifted. */
const tallCup: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M17 4h14l-1.4 5H18.4zM16 10h16v9.6c0 7.4-2.6 12.2-5.4 14v9h4.2a1.6 1.6 0 0 1 0 3.2H17.2a1.6 1.6 0 0 1 0-3.2h4.2v-9c-2.8-1.8-5.4-6.6-5.4-14z"
    />
    <path fill={shade} opacity="0.32" d="M20 12h3v20.6c-2-2.2-3-6.4-3-12.4z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Conference League: a shallow bowl with a wide collar. */
const bowl: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M11 14h26v3.6c0 8-4 13.4-8.2 15.2V44h4.6a1.6 1.6 0 0 1 0 3.2H14.6a1.6 1.6 0 0 1 0-3.2h4.6V32.8C15 31 11 25.6 11 17.6z"
    />
    <path fill={shade} opacity="0.3" d="M15 17.4h3.4v13.4C16.4 28.6 15 24.4 15 19.4z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Libertadores: a fat urn with two low handles. */
const urn: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M14 8h20v6c0 6.6-2.6 11.8-6.2 13.8V44h4.8a1.6 1.6 0 0 1 0 3.2H15.4a1.6 1.6 0 0 1 0-3.2h4.8V27.8C16.6 25.8 14 20.6 14 14z"
    />
    <path
      fill={fill}
      d="M14 12.4c-3.6.7-5.6 2.7-5.2 5.4.4 2.5 2.8 4 6 4.2v-4c-1.2-.2-2-.7-2.1-1.4-.1-.8.5-1.4 1.3-1.7zM34 12.4v2.5c.8.3 1.4.9 1.3 1.7-.1.7-.9 1.2-2.1 1.4v4c3.2-.2 5.6-1.7 6-4.2.4-2.7-1.6-4.7-5.2-5.4z"
    />
    <path fill={shade} opacity="0.3" d="M18 11h3v15.6c-1.9-2-3-5.6-3-10.6z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Club World Cup: the world itself, sitting in a cradle. */
const globeRing: Draw = ({ fill, shade }) => (
  <g>
    <circle cx="24" cy="19" r="11" fill={fill} />
    <path
      fill={shade}
      opacity="0.4"
      d="M24 8c2.8 3 4.2 6.8 4.2 11s-1.4 8-4.2 11c-2.8-3-4.2-6.8-4.2-11s1.4-8 4.2-11M13.4 15.4h21.2v2.2H13.4M13.4 20.6h21.2v2.2H13.4"
    />
    {/* the cradle: two arcs that carry it, the way the real one does */}
    <path
      fill={fill}
      d="M9.4 14.2h3.4c0 7.6 4.6 13.6 11.2 13.6v3.4c-8.6 0-14.6-7.4-14.6-17M35 14.2h3.6c0 9.6-6 17-14.6 17v-3.4c6.6 0 11-6 11-13.6"
    />
    <path fill={fill} d="M21.6 30h4.8V45h-4.8z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/**
 * The World Cup: the earth held up by two figures who are really one curve.
 * The silhouette is the whole trophy, so it is drawn as one leaf rather than
 * as anatomy nobody can read at thirty pixels.
 */
const worldCup: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M24 17.5c4.6 4.4 7 10.4 7 17 0 5.6-1.6 10.6-4.4 14.5h-5.2C18.6 45.1 17 40.1 17 34.5c0-6.6 2.4-12.6 7-17"
    />
    <path
      fill={fill}
      d="M13.6 30.4c1 6.4 3.6 12.4 7.4 16.8l-2.6 2.8c-4.6-4.8-7.6-11.4-8.6-18.6zM34.4 30.4l3.8 1c-1 7.2-4 13.8-8.6 18.6l-2.6-2.8c3.8-4.4 6.4-10.4 7.4-16.8"
    />
    <circle cx="24" cy="12.5" r="8.5" fill={fill} />
    <path
      fill={shade}
      opacity="0.42"
      d="M24 4c2.4 2.4 3.6 5.3 3.6 8.5S26.4 18.6 24 21c-2.4-2.4-3.6-5.3-3.6-8.5S21.6 6.4 24 4M15.9 8.8h16.2v1.9H15.9M15.5 14.3h17v1.9h-17"
    />
    <path fill={shade} opacity="0.3" d="M22.6 22.6h2.8v25h-2.8z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Henri Delaunay: a cup on a long stem, wide at the mouth. */
const delaunay: Draw = ({ fill, shade }) => (
  <g>
    <path fill={fill} d="M13 8h22v4.2c0 8.4-3.6 14.2-7.6 16.2V44h4.4a1.6 1.6 0 0 1 0 3.2H16.2a1.6 1.6 0 0 1 0-3.2h4.4V28.4C16.6 26.4 13 20.6 13 12.2z" />
    <path fill={fill} d="M12.2 5.6h23.6v2.8H12.2z" />
    <path fill={shade} opacity="0.3" d="M17.4 10h3.2v16.6c-2-2.4-3.2-6.6-3.2-11.6z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Copa América: a low, very wide cup on a fat base. */
const wideCup: Draw = ({ fill, shade }) => (
  <g>
    <path fill={fill} d="M9 12h30v2.6c0 8-4.8 13.6-9.4 15V44h5a1.6 1.6 0 0 1 0 3.2H13.4a1.6 1.6 0 0 1 0-3.2h5V29.6C13.8 28.2 9 22.6 9 14.6z" />
    <path fill={shade} opacity="0.3" d="M13.6 14.4h3.4v13.2c-2.2-2.2-3.4-6-3.4-10.2z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Africa Cup of Nations: a cup carried on three legs. */
const tripod: Draw = ({ fill, shade }) => (
  <g>
    <path fill={fill} d="M13 6h22v8.6c0 7.6-3.4 12.8-7.2 14.6V38h-7.6V29.2C16.4 27.4 13 22.2 13 14.6z" />
    <path fill={fill} d="M20.2 38h7.6l4.6 9.4H15.6zM12 47h24v3.4H12z" />
    <path fill={shade} opacity="0.32" d="M17 9h3.2v17.4C18.2 24.2 17 20 17 15z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** The Nations League: a cup with a spiral of national colours around it. */
const spiral: Draw = ({ fill, shade }) => (
  <g>
    <path fill={fill} d="M14 7h20v10.4c0 7.8-3.2 13-6.6 14.8V44h4.4a1.6 1.6 0 0 1 0 3.2H16.2a1.6 1.6 0 0 1 0-3.2h4.4V32.2C17.2 30.4 14 25.2 14 17.4z" />
    <path fill={shade} opacity="0.45" d="M14.4 12h19.2v2.6H14.4zM15.6 19h16.8v2.6H15.6zM18 26h12v2.6H18z" />
    <g fill={fill}>{PLINTH}</g>
  </g>
)

/** An Olympic gold: a medal on a ribbon, which is the only one you wear. */
const medal: Draw = ({ fill, shade }) => (
  <g>
    <path fill={shade} opacity="0.75" d="m16 4 7 20-5 2.6L11.2 6zM32 4l-7 20 5 2.6L36.8 6z" />
    <circle cx="24" cy="40" r="15" fill={fill} />
    <circle cx="24" cy="40" r="10.4" fill={shade} opacity="0.28" />
    <path fill={fill} d="m24 32.4 2.4 5.2 5.6.6-4.2 3.8 1.2 5.6-5-3-5 3 1.2-5.6-4.2-3.8 5.6-.6z" />
  </g>
)

/** The Gold Cup: a cup with a broad, flared mouth on a square block. */
const flared: Draw = ({ fill, shade }) => (
  <g>
    <path fill={fill} d="M12 9h24l-3.4 9.6c-1 5.6-3.4 9.4-6.2 10.8V44h4.4a1.6 1.6 0 0 1 0 3.2H17.2a1.6 1.6 0 0 1 0-3.2h4.4V29.4c-2.8-1.4-5.2-5.2-6.2-10.8z" />
    <path fill={shade} opacity="0.3" d="M17.6 12h3.2v15.4c-1.8-1.8-2.9-5-3.2-9.4z" />
    <g fill={fill}>{BLOCK}</g>
  </g>
)

/** The Ballon d'Or: a ball, and the only pedestal that matters. */
const ballOnPlinth: Draw = ({ fill, shade }) => (
  <g>
    <circle cx="24" cy="20" r="14" fill={fill} />
    <path
      fill={shade}
      opacity="0.42"
      d="m24 11 6.4 4.6-2.4 7.4h-8L17.6 15.6zm-9.6 6.4 5.2 5-3.4 2.4-3.2-2.4a9 9 0 0 1 1.4-5m19.2 0a9 9 0 0 1 1.4 5l-3.2 2.4-3.4-2.4zM19.4 27.4h9.2l2.4 3.2a9.4 9.4 0 0 1-14 0z"
    />
    <path fill={fill} d="M21 33.8h6V52h-6z" />
    <g fill={fill}>{BLOCK}</g>
  </g>
)

/** The Golden Boy: a boot in the air rather than on a floor. */
const risingBoot: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M9 18h11.4c1.2 0 2.2.7 2.7 1.8l2.4 6 10.4 1.7 8.6 3.6c1.9.8 3.1 2.6 3.1 4.6V40H9z"
    />
    <path fill={shade} opacity="0.35" d="m26 27.6 1.9 5.8h4.6L30.6 28zM19.4 25l1.7 5.2h4.6L24 25z" />
    <g fill={fill}>{BLOCK}</g>
  </g>
)

/** The Golden Shoe: the same boot, standing on the ball it earned. */
const bootOnBall: Draw = ({ fill, shade }) => (
  <g>
    <path
      fill={fill}
      d="M8 10h10.6c1.1 0 2.1.7 2.5 1.7l2.3 5.6 9.7 1.6 8 3.4c1.8.8 2.9 2.5 2.9 4.4v3.5H8z"
    />
    <path fill={shade} opacity="0.35" d="m24.6 19 1.8 5.4h4.3l-1.8-5.4zM18.4 16.6l1.6 4.8h4.3l-1.6-4.8z" />
    <circle cx="24" cy="44" r="12" fill={fill} />
    <path
      fill={shade}
      opacity="0.4"
      d="m24 36.4 5.4 4-2 6.2h-6.8l-2-6.2zm-8.2 5.4 4.4 4.2-2.8 2-2.6-2a7.6 7.6 0 0 1 1-4.2m16.4 0a7.6 7.6 0 0 1 1 4.2l-2.6 2-2.8-2z"
    />
  </g>
)

const ART: Record<Honour, Draw> = {
  ucl: bigEars,
  europa: tallCup,
  conference: bowl,
  libertadores: urn,
  clubwc: globeRing,
  worldcup: worldCup,
  euro: delaunay,
  copa: wideCup,
  afcon: tripod,
  nationsleague: spiral,
  olympics: medal,
  goldcup: flared,
  ballondor: ballOnPlinth,
  goldenboy: risingBoot,
  goldenshoe: bootOnBall,
}

/** Silverware is silver. Everything else in football is gold. */
const METAL_OF: Record<Honour, Metal> = {
  ucl: 'silver',
  europa: 'silver',
  conference: 'silver',
  libertadores: 'silver',
  clubwc: 'gold',
  worldcup: 'gold',
  euro: 'silver',
  copa: 'gold',
  afcon: 'gold',
  nationsleague: 'silver',
  olympics: 'gold',
  goldcup: 'gold',
  ballondor: 'gold',
  goldenboy: 'gold',
  goldenshoe: 'gold',
}

/**
 * One trophy, at whatever size the thing around it needs.
 *
 * The gradient has to be unique per drawing on the page or the browser hands
 * every copy the first one's colours, so the id comes from `useId`.
 */
export function HonourTrophy({
  honour,
  size = 28,
  title,
}: {
  honour: Honour
  size?: number
  title?: string
}) {
  const uid = useId().replace(/:/g, '')
  const metal = METAL_OF[honour]
  const [dark, mid, light] = METALS[metal]
  const draw = ART[honour]
  const grad = `t${uid}`

  return (
    <svg
      className="trophy-art"
      width={size}
      height={(size / 48) * 64}
      viewBox={BOX}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="38%" stopColor={mid} />
          <stop offset="72%" stopColor={dark} />
          <stop offset="100%" stopColor={mid} />
        </linearGradient>
      </defs>
      {draw({ fill: `url(#${grad})`, shade: dark })}
    </svg>
  )
}

/** A row of everything a man has won, in the order the game lists honours. */
export function TrophyRow({
  honours,
  size = 22,
  label,
}: {
  honours: Honour[]
  size?: number
  label?: (h: Honour) => string
}) {
  if (!honours.length) return null
  return (
    <span className="trophy-row">
      {honours.map((h) => (
        <span className="trophy-slot" key={h} title={label?.(h)}>
          <HonourTrophy honour={h} size={size} title={label?.(h)} />
        </span>
      ))}
    </span>
  )
}
