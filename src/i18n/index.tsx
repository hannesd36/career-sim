import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LEAGUE_BY_ID } from '../data/leagues'
import { CONTINENTAL_CUP, NATION_BY_NAME } from '../data/nations'
import type { Position, SquadRole, Trophy, TrophyId } from '../engine/types'
import { COUNTRY_DE, DICT, type Lang, type StringKey } from './strings'

const STORAGE_KEY = 'career-sim:lang'

function detect(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (saved === 'de' || saved === 'en') return saved
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('de') ? 'de' : 'en'
}

export interface Translator {
  lang: Lang
  setLang: (l: Lang) => void
  /** `t('offers.count', { n: 3 })`; a `_one` variant is used when n === 1 */
  t: (key: StringKey, vars?: Record<string, string | number>) => string
  country: (name: string) => string
  position: (p: Position) => string
  role: (r: SquadRole) => string
  competition: (name: string) => string
  /** full label, e.g. "Torschützenkönig (Bundesliga)" */
  trophy: (trophy: Trophy) => string
  /** cabinet label without the competition, e.g. "Torschützenkönig" */
  trophyShort: (id: TrophyId) => string
  /** 12345.6 -> "12.345,6" in German, "12,345.6" in English */
  num: (n: number) => string
}

const Ctx = createContext<Translator | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
    document.title = DICT[lang]['app.name']
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])

  const value = useMemo<Translator>(() => {
    const dict = DICT[lang]

    const t: Translator['t'] = (key, vars) => {
      // pick the singular wording when a count of exactly one is passed
      const one = vars && Number(vars.n) === 1 ? (`${key}_one` as StringKey) : null
      const raw = (one && dict[one]) || dict[key] || key
      if (!vars) return raw
      return raw.replace(/\{(\w+)\}/g, (m, name) =>
        name in vars ? String(vars[name as keyof typeof vars]) : m,
      )
    }

    const competition = (name: string) => t(`comp.${name}` as StringKey) || name

    const trophy: Translator['trophy'] = (tr) => {
      const league = tr.leagueId ? LEAGUE_BY_ID[tr.leagueId] : undefined
      // Continental national-team titles name the competition after the
      // confederation of the nation they were won with.
      const nation = tr.wonWith ? NATION_BY_NAME[tr.wonWith] : undefined
      return t(`trophy.${tr.id}` as StringKey, {
        league: league?.name ?? '',
        country: league
          ? lang === 'de'
            ? COUNTRY_DE[league.country] ?? league.country
            : league.country
          : '',
        competition:
          tr.id === 'continental'
            ? competition(league?.continental ?? '')
            : nation
              ? competition(CONTINENTAL_CUP[nation.conf])
              : '',
      })
    }

    return {
      lang,
      setLang,
      t,
      country: (name) => (lang === 'de' ? COUNTRY_DE[name] ?? name : name),
      position: (p) => t(`pos.${p}` as StringKey),
      role: (r) => t(`role.${r}` as StringKey),
      competition,
      trophy,
      trophyShort: (id) => t(`trophy.short.${id}` as StringKey),
      num: (n) => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB'),
    }
  }, [lang, setLang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): Translator {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
