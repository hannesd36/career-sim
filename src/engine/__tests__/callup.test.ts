import { describe, expect, it } from 'vitest'
import { NATION_BY_NAME } from '../../data/nations'
import { callupFor, callupHistory, capsVerdict } from '../callup'
import type { Career, SeasonRecord } from '../types'

const GERMANY = NATION_BY_NAME.Germany

/** A season record with only the fields the call-up reader looks at. */
function season(over: Partial<SeasonRecord>): SeasonRecord {
  return {
    season: 2030,
    age: 24,
    apps: 30,
    ovrEnd: GERMANY.strength,
    natApps: 0,
    banned: false,
    ...over,
  } as SeasonRecord
}

/** A career whose history is whatever the test needs it to be. */
function career(history: SeasonRecord[]): Career {
  return { player: { nation: 'Germany' }, history } as Career
}

describe('the first call-up', () => {
  it('is reported the season it happens and never again', () => {
    const first = season({ season: 2030, natApps: 4 })
    const later = season({ season: 2031, natApps: 6 })
    const c = career([first, later])

    expect(callupFor(c, first, null)?.id).toBe('first-callup')
    expect(callupFor(c, later, first)?.id).not.toBe('first-callup')
  })

  it('outranks everything else that could be said about that season', () => {
    // A tournament year and a first cap at once: the first cap is the story.
    const first = season({ season: 2032, natApps: 11 })
    expect(callupFor(career([first]), first, null)?.id).toBe('first-callup')
  })
})

describe('tournament summers', () => {
  // A World Cup falls on season % 4 === 2 and a continental on % 4 === 0, so
  // 2030 and 2032 are both tournament years and 2031 is not.
  it('says you are going when you are in the squad', () => {
    const rec = season({ season: 2032, natApps: 9 })
    const before = season({ season: 2031, natApps: 5 })
    const c = career([before, rec])
    expect(callupFor(c, rec, before)?.id).toBe('tournament-squad')
  })

  it('says you are not, when you were good enough and left out', () => {
    const before = season({ season: 2031, natApps: 5 })
    const rec = season({ season: 2032, natApps: 0, ovrEnd: GERMANY.strength })
    const c = career([before, rec])
    const hit = callupFor(c, rec, before)
    expect(hit?.id).toBe('tournament-missed')
    expect(hit?.tone).toBe('bad')
  })

  it('says nothing to somebody who was never in contention', () => {
    const rec = season({ season: 2032, natApps: 0, ovrEnd: 40, apps: 2 })
    expect(callupFor(career([rec]), rec, null)).toBeNull()
  })
})

describe('losing the shirt', () => {
  it('reports being dropped only when you played the season before', () => {
    const played = season({ season: 2030, natApps: 7 })
    const gone = season({ season: 2031, natApps: 0 })
    const c = career([played, gone])
    expect(callupFor(c, gone, played)?.id).toBe('dropped')
  })

  it('calls it a finished international career once you are old enough', () => {
    const capped = season({ season: 2028, natApps: 9 })
    const long = season({ season: 2029, natApps: 0 })
    const now = season({ season: 2038, natApps: 0, age: 34, ovrEnd: 40, apps: 20 })
    const c = career([capped, long, now])
    expect(callupFor(c, now, long)?.id).toBe('retired-from-international')
  })
})

describe('never getting the call', () => {
  it('says so when a season was plainly good enough', () => {
    const rec = season({ season: 2031, natApps: 0, ovrEnd: GERMANY.strength + 3, apps: 30 })
    const hit = callupFor(career([rec]), rec, null)
    expect(hit?.id).toBe('too-good-to-ignore')
    expect(hit?.tone).toBe('bad')
  })

  it('stays quiet about a player nowhere near it', () => {
    const rec = season({ season: 2031, natApps: 0, ovrEnd: 55, apps: 30 })
    expect(callupFor(career([rec]), rec, null)).toBeNull()
  })
})

describe('being in the squad', () => {
  // A tournament summer has its own line, so these use an ordinary year:
  // 2030 is a World Cup and 2032 a continental, 2031 is neither.
  it('separates a regular from somebody along for the ride', () => {
    const before = season({ season: 2030, natApps: 3 })
    const few = season({ season: 2031, natApps: 3 })
    const many = season({ season: 2031, natApps: 8 })
    const c = career([before, few])
    expect(callupFor(c, few, before)?.id).toBe('squad-named')
    expect(callupFor(career([before, many]), many, before)?.id).toBe('regular')
  })

  it('singles out the best player the country has', () => {
    const before = season({ season: 2030, natApps: 6 })
    const rec = season({ season: 2031, natApps: 9, ovrEnd: GERMANY.strength + 6 })
    expect(callupFor(career([before, rec]), rec, before)?.id).toBe('captain-material')
  })
})

describe('a suspended season', () => {
  it('says nothing at all', () => {
    const rec = season({ season: 2031, natApps: 0, banned: true })
    expect(callupFor(career([rec]), rec, null)).toBeNull()
  })
})

describe('the whole career', () => {
  it('reads every season in order and reports the first cap once', () => {
    const history = [
      season({ season: 2029, natApps: 0, ovrEnd: 55 }),
      season({ season: 2030, natApps: 4 }),
      season({ season: 2031, natApps: 8 }),
      season({ season: 2032, natApps: 10 }),
    ]
    const hits = callupHistory(career(history))
    expect(hits.filter((h) => h.id === 'first-callup')).toHaveLength(1)
    expect(hits[0].season).toBeLessThan(hits[hits.length - 1].season)
    for (const hit of hits) expect(hit.nation).toBe('Germany')
  })

  it('survives a career with no international football in it', () => {
    const history = [season({ season: 2030, natApps: 0, ovrEnd: 50, apps: 10 })]
    expect(callupHistory(career(history))).toEqual([])
  })
})

describe('the verdict on a whole international career', () => {
  it('grows with the caps and covers the ends', () => {
    expect(capsVerdict(0)).toBe('never')
    expect(capsVerdict(1)).toBe('a-few')
    expect(capsVerdict(9)).toBe('a-few')
    expect(capsVerdict(10)).toBe('regular')
    expect(capsVerdict(34)).toBe('regular')
    expect(capsVerdict(35)).toBe('mainstay')
    expect(capsVerdict(79)).toBe('mainstay')
    expect(capsVerdict(80)).toBe('legend')
    expect(capsVerdict(150)).toBe('legend')
  })
})
