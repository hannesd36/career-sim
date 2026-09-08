import { describe, expect, it } from 'vitest'
import { ambitionBoard, ambitionProgress, ambitionsOf, nextAmbition } from '../ambitions'
import { createCareer, playSeasons } from '../career'
import type { Career } from '../types'

const opts = { name: 'Ambition Test', nation: 'Germany', foot: 'Right' as const }

describe('career ambitions', () => {
  it('draws the same five for the same career, every time', () => {
    const career = createCareer({ ...opts, position: 'ST', seed: 77 })
    expect(ambitionsOf(career)).toEqual(ambitionsOf(career))
    expect(ambitionsOf(career)).toHaveLength(5)
  })

  it('draws different lists for different careers', () => {
    const lists = new Set<string>()
    for (let seed = 1; seed <= 25; seed++) {
      lists.add(ambitionsOf(createCareer({ ...opts, position: 'ST', seed })).join(','))
    }
    expect(lists.size).toBeGreaterThan(5)
  })

  it('never asks a goalkeeper for goals', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const drawn = ambitionsOf(createCareer({ ...opts, position: 'GK', seed }))
      expect(drawn).toHaveLength(5)
      expect(drawn.some((id) => id.startsWith('goals-') || id === 'assists-100')).toBe(false)
    }
  })

  it('never asks an outfielder for clean sheets', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const drawn = ambitionsOf(createCareer({ ...opts, position: 'ST', seed }))
      expect(drawn.some((id) => id.startsWith('cleansheets-'))).toBe(false)
    }
  })

  it('draws no duplicates', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const drawn = ambitionsOf(createCareer({ ...opts, position: 'CM', seed }))
      expect(new Set(drawn).size).toBe(drawn.length)
    }
  })

  it('starts a fresh career with everything still to do', () => {
    const career = createCareer({ ...opts, position: 'ST', seed: 5 })
    for (const row of ambitionBoard(career)) {
      expect(row.done).toBe(false)
      expect(row.fraction).toBe(0)
    }
    expect(nextAmbition(career)).not.toBeNull()
  })

  it('moves as a career is played', () => {
    let career: Career = createCareer({ ...opts, position: 'ST', seed: 11 })
    const before = ambitionBoard(career).reduce((s, a) => s + a.fraction, 0)
    for (let i = 0; i < 6 && career.phase !== 'retired'; i++) {
      career = playSeasons(career, 1)
      if (career.phase === 'offers' && career.offers.length) {
        career = { ...career, season: career.season + 1, phase: 'season', offers: [] }
      } else if (career.phase !== 'season') break
    }
    const after = ambitionBoard(career).reduce((s, a) => s + a.fraction, 0)
    expect(after).toBeGreaterThan(before)
  })

  it('reports progress against the number it asked for', () => {
    const career = createCareer({ ...opts, position: 'ST', seed: 3 })
    const stubbed: Career = {
      ...career,
      history: [
        {
          season: 2026, age: 20, clubId: career.player.clubId, clubName: 'X', badge: null,
          leagueId: 'ger1', onLoan: false, ovrStart: 60, ovrEnd: 60, role: 'Starter',
          apps: 40, goals: 60, assists: 0, cleanSheets: 0, conceded: 0, saves: 0, tackles: 0,
          keyPasses: 0, yellowCards: 0, redCards: 0, rating: 7, minutes: 3000,
          gamesMissedInjured: 0, leaguePosition: 1, ceilingBefore: [60, 80] as [number, number],
          ceilingAfter: [60, 80] as [number, number], trophies: [], banned: false,
          natApps: 0, natGoals: 0, natAssists: 0, natCleanSheets: 0,
        },
      ],
    }
    const fifty = ambitionProgress(stubbed, 'goals-50')
    expect(fifty.have).toBe(60)
    expect(fifty.need).toBe(50)
    expect(fifty.done).toBe(true)
    expect(fifty.fraction).toBe(1)
  })

  it('puts what is finished at the bottom of the list', () => {
    const career = createCareer({ ...opts, position: 'ST', seed: 8 })
    const rows = ambitionBoard(career)
    const firstDone = rows.findIndex((r) => r.done)
    if (firstDone >= 0) expect(rows.slice(firstDone).every((r) => r.done)).toBe(true)
  })
})
