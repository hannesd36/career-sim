import fs from 'node:fs'
import { describe, it } from 'vitest'
import { acceptOffer, closeEvent, closePenalty, createCareer, playSeasons, resolveEvent, takePenalty } from '../career'
import { EVENT_BY_ID } from '../events'
import type { Career } from '../types'

const OUT = 'C:/Users/wildf/AppData/Local/Temp/claude/c--Users-wildf-Fu-ball/590bca12-64dc-4200-8462-c61d0ea14c33/scratchpad/near-retire.json'

/** Temporary: builds a career one click short of retirement, for browser QA. */
describe('fixture', () => {
  it('writes a near-retirement save', () => {
    for (let seed = 900; seed < 1200; seed++) {
      let c: Career = createCareer({
        name: 'Alte Legende', nation: 'Germany', position: 'ST', foot: 'Right', seed,
      })
      let guard = 0
      while (c.phase !== 'retired' && guard++ < 400) {
        if (c.player.age >= 39 && c.phase === 'offers') break
        if (c.phase === 'season') c = playSeasons(c, 1)
        else if (c.phase === 'event') {
          const ev = EVENT_BY_ID[c.pendingEvent!.id]
          c = closeEvent(resolveEvent(c, ev.choices[0].key))
        } else if (c.phase === 'penalty') c = closePenalty(takePenalty(c, 'centre'))
        else if (c.phase === 'offers') {
          if (!c.offers.length) break
          const best = [...c.offers].sort((a, b) => b.club.strength - a.club.strength)[0]
          c = acceptOffer(c, best)
        } else break
      }
      if (c.player.age >= 39 && c.phase === 'offers' && c.offers.length) {
        fs.writeFileSync(OUT, JSON.stringify({ version: 2, careers: [c] }))
        console.log('FIXTURE age', c.player.age, 'phase', c.phase, 'seasons', c.history.length, 'seed', seed)
        return
      }
    }
    console.log('FIXTURE: no qualifying career found')
  })
})
