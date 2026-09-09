import { describe, expect, it } from 'vitest'
import { EVENTS, EVENT_BY_ID, outcomeOdds, rollEvent, rollOutcome } from '../events'
import { CLUB_BY_ID } from '../../data/clubs'
import { createCareer, playSeasons } from '../career'
import { DICT } from '../../i18n/strings'
import { Rng } from '../rng'
import type { EventContext } from '../events'

const opts = {
  name: 'Event Test',
  nation: 'Germany',
  position: 'ST' as const,
  foot: 'Right' as const,
}

/** A context built out of a real season, so nothing here is made up. */
function contextFor(seed: number): EventContext {
  const career = playSeasons(createCareer({ ...opts, seed }), 1)
  const record = career.history[career.history.length - 1]
  return {
    player: career.player,
    club: CLUB_BY_ID[career.player.clubId],
    last: record,
    season: career.season,
    seasonsPlayed: career.history.length,
    decided: new Set<string>(),
    pastClubs: [record.clubId],
    previous: null,
  }
}

describe('the decisions', () => {
  it('says every word of every one of them, in both languages', () => {
    for (const lang of ['en', 'de'] as const) {
      const dict = DICT[lang] as Record<string, string>
      for (const event of EVENTS) {
        expect(dict[`ev.${event.id}.title`], `${lang} ${event.id} title`).toBeTruthy()
        expect(dict[`ev.${event.id}.body`], `${lang} ${event.id} body`).toBeTruthy()
        for (const choice of event.choices) {
          expect(
            dict[`ev.${event.id}.${choice.key}`],
            `${lang} ${event.id}.${choice.key}`,
          ).toBeTruthy()
          for (const outcome of choice.outcomes) {
            const key = `ev.${event.id}.result.${outcome.result}`
            expect(dict[key], `${lang} ${key}`).toBeTruthy()
          }
        }
      }
    }
  })

  it('gives every decision two ways out and every branch a weight', () => {
    for (const event of EVENTS) {
      expect(event.choices.length, event.id).toBeGreaterThanOrEqual(2)
      for (const choice of event.choices) {
        expect(choice.outcomes.length, `${event.id}.${choice.key}`).toBeGreaterThanOrEqual(1)
        for (const outcome of choice.outcomes) expect(outcome.weight).toBeGreaterThan(0)
        // the odds printed on the screen have to add up to a hundred
        const total = choice.outcomes.reduce((sum, o) => sum + outcomeOdds(choice, o), 0)
        expect(Math.abs(total - 100), `${event.id}.${choice.key} odds`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('has a unique id for every one', () => {
    const ids = EVENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(EVENT_BY_ID).length).toBe(ids.length)
  })

  it('never fires an event whose conditions are not met', () => {
    const ctx = contextFor(4)
    for (let i = 0; i < 60; i++) {
      const event = rollEvent(ctx, 1, new Rng(i))
      if (event) expect(event.weight(ctx)).toBeGreaterThan(0)
    }
  })

  it('leaves an event that wants a history alone when there is none', () => {
    const ctx = { ...contextFor(9), pastClubs: undefined, previous: null }
    expect(EVENT_BY_ID['old-club-calls'].weight(ctx)).toBe(0)
    expect(EVENT_BY_ID['comeback'].weight(ctx)).toBe(0)
  })

  it('always lands on one of the outcomes it offered', () => {
    for (const event of EVENTS) {
      for (const choice of event.choices) {
        for (let i = 0; i < 20; i++) {
          expect(choice.outcomes).toContain(rollOutcome(choice, new Rng(i)))
        }
      }
    }
  })
})
