export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC'

export interface Nation {
  name: string
  flag: string
  /** roughly the OVR you need to be a regular starter for them */
  strength: number
  conf: Confederation
  /** divisions a youth product from this country is likely to come through */
  startLeagues: string[]
}

export const CONTINENTAL_CUP: Record<Confederation, string> = {
  UEFA: 'European Championship',
  CONMEBOL: 'Copa América',
  CONCACAF: 'Gold Cup',
  CAF: 'Africa Cup of Nations',
  AFC: 'Asian Cup',
}

export const NATIONS: Nation[] = [
  // UEFA
  { name: 'France', flag: 'fr', strength: 85, conf: 'UEFA', startLeagues: ['fra2', 'fra1'] },
  { name: 'Spain', flag: 'es', strength: 85, conf: 'UEFA', startLeagues: ['esp2', 'esp1'] },
  { name: 'England', flag: 'gb-eng', strength: 84, conf: 'UEFA', startLeagues: ['eng3', 'eng2'] },
  { name: 'Germany', flag: 'de', strength: 83, conf: 'UEFA', startLeagues: ['ger3', 'ger2'] },
  { name: 'Portugal', flag: 'pt', strength: 83, conf: 'UEFA', startLeagues: ['por1'] },
  { name: 'Italy', flag: 'it', strength: 81, conf: 'UEFA', startLeagues: ['ita2', 'ita1'] },
  { name: 'Netherlands', flag: 'nl', strength: 81, conf: 'UEFA', startLeagues: ['ned1'] },
  { name: 'Belgium', flag: 'be', strength: 80, conf: 'UEFA', startLeagues: ['bel1'] },
  { name: 'Croatia', flag: 'hr', strength: 79, conf: 'UEFA', startLeagues: ['cro1'] },
  { name: 'Switzerland', flag: 'ch', strength: 76, conf: 'UEFA', startLeagues: ['sui1'] },
  { name: 'Denmark', flag: 'dk', strength: 76, conf: 'UEFA', startLeagues: ['den1'] },
  { name: 'Austria', flag: 'at', strength: 75, conf: 'UEFA', startLeagues: ['aut1'] },
  { name: 'Türkiye', flag: 'tr', strength: 75, conf: 'UEFA', startLeagues: ['tur1'] },
  { name: 'Ukraine', flag: 'ua', strength: 74, conf: 'UEFA', startLeagues: ['pol1', 'cze1'] },
  { name: 'Serbia', flag: 'rs', strength: 74, conf: 'UEFA', startLeagues: ['cro1', 'gre1'] },
  { name: 'Poland', flag: 'pl', strength: 73, conf: 'UEFA', startLeagues: ['pol1'] },
  { name: 'Norway', flag: 'no', strength: 73, conf: 'UEFA', startLeagues: ['nor1'] },
  { name: 'Sweden', flag: 'se', strength: 72, conf: 'UEFA', startLeagues: ['nor1', 'den1'] },
  { name: 'Scotland', flag: 'gb-sct', strength: 71, conf: 'UEFA', startLeagues: ['sco1'] },
  { name: 'Czechia', flag: 'cz', strength: 71, conf: 'UEFA', startLeagues: ['cze1'] },
  { name: 'Greece', flag: 'gr', strength: 70, conf: 'UEFA', startLeagues: ['gre1'] },
  { name: 'Wales', flag: 'gb-wls', strength: 70, conf: 'UEFA', startLeagues: ['eng3', 'eng2'] },
  { name: 'Republic of Ireland', flag: 'ie', strength: 68, conf: 'UEFA', startLeagues: ['eng3', 'eng2'] },
  { name: 'Slovakia', flag: 'sk', strength: 68, conf: 'UEFA', startLeagues: ['cze1'] },
  { name: 'Slovenia', flag: 'si', strength: 68, conf: 'UEFA', startLeagues: ['cro1', 'aut1'] },
  { name: 'Romania', flag: 'ro', strength: 67, conf: 'UEFA', startLeagues: ['pol1', 'gre1'] },
  { name: 'Iceland', flag: 'is', strength: 64, conf: 'UEFA', startLeagues: ['nor1', 'den1'] },
  { name: 'Finland', flag: 'fi', strength: 64, conf: 'UEFA', startLeagues: ['nor1', 'den1'] },
  { name: 'Albania', flag: 'al', strength: 64, conf: 'UEFA', startLeagues: ['gre1', 'cro1'] },

  // CONMEBOL
  { name: 'Argentina', flag: 'ar', strength: 87, conf: 'CONMEBOL', startLeagues: ['arg1'] },
  { name: 'Brazil', flag: 'br', strength: 86, conf: 'CONMEBOL', startLeagues: ['bra1'] },
  { name: 'Uruguay', flag: 'uy', strength: 80, conf: 'CONMEBOL', startLeagues: ['arg1', 'bra1'] },
  { name: 'Colombia', flag: 'co', strength: 79, conf: 'CONMEBOL', startLeagues: ['arg1', 'bra1'] },
  { name: 'Ecuador', flag: 'ec', strength: 75, conf: 'CONMEBOL', startLeagues: ['bra1', 'arg1'] },
  { name: 'Chile', flag: 'cl', strength: 72, conf: 'CONMEBOL', startLeagues: ['arg1'] },
  { name: 'Paraguay', flag: 'py', strength: 71, conf: 'CONMEBOL', startLeagues: ['arg1'] },
  { name: 'Peru', flag: 'pe', strength: 69, conf: 'CONMEBOL', startLeagues: ['arg1', 'bra1'] },
  { name: 'Venezuela', flag: 've', strength: 66, conf: 'CONMEBOL', startLeagues: ['bra1', 'mex1'] },
  { name: 'Bolivia', flag: 'bo', strength: 62, conf: 'CONMEBOL', startLeagues: ['arg1'] },

  // CONCACAF
  { name: 'Mexico', flag: 'mx', strength: 75, conf: 'CONCACAF', startLeagues: ['mex1'] },
  { name: 'USA', flag: 'us', strength: 75, conf: 'CONCACAF', startLeagues: ['usa1'] },
  { name: 'Canada', flag: 'ca', strength: 73, conf: 'CONCACAF', startLeagues: ['usa1'] },
  { name: 'Costa Rica', flag: 'cr', strength: 66, conf: 'CONCACAF', startLeagues: ['mex1', 'usa1'] },
  { name: 'Jamaica', flag: 'jm', strength: 66, conf: 'CONCACAF', startLeagues: ['eng3', 'usa1'] },
  { name: 'Panama', flag: 'pa', strength: 65, conf: 'CONCACAF', startLeagues: ['mex1', 'usa1'] },

  // CAF
  { name: 'Morocco', flag: 'ma', strength: 79, conf: 'CAF', startLeagues: ['fra2', 'bel1'] },
  { name: 'Senegal', flag: 'sn', strength: 77, conf: 'CAF', startLeagues: ['fra2', 'bel1'] },
  { name: 'Egypt', flag: 'eg', strength: 74, conf: 'CAF', startLeagues: ['ksa1', 'tur1'] },
  { name: 'Nigeria', flag: 'ng', strength: 74, conf: 'CAF', startLeagues: ['bel1', 'por1'] },
  { name: 'Algeria', flag: 'dz', strength: 73, conf: 'CAF', startLeagues: ['fra2', 'tur1'] },
  { name: 'Ivory Coast', flag: 'ci', strength: 73, conf: 'CAF', startLeagues: ['fra2', 'bel1'] },
  { name: 'Ghana', flag: 'gh', strength: 71, conf: 'CAF', startLeagues: ['bel1', 'den1'] },
  { name: 'Cameroon', flag: 'cm', strength: 70, conf: 'CAF', startLeagues: ['fra2', 'bel1'] },
  { name: 'Tunisia', flag: 'tn', strength: 69, conf: 'CAF', startLeagues: ['fra2', 'tur1'] },
  { name: 'South Africa', flag: 'za', strength: 65, conf: 'CAF', startLeagues: ['bel1', 'ned1'] },

  // AFC
  { name: 'Japan', flag: 'jp', strength: 78, conf: 'AFC', startLeagues: ['bel1', 'ned1'] },
  { name: 'South Korea', flag: 'kr', strength: 75, conf: 'AFC', startLeagues: ['bel1', 'por1'] },
  { name: 'Iran', flag: 'ir', strength: 73, conf: 'AFC', startLeagues: ['ksa1', 'por1'] },
  { name: 'Australia', flag: 'au', strength: 71, conf: 'AFC', startLeagues: ['eng3', 'ned1'] },
  { name: 'Saudi Arabia', flag: 'sa', strength: 68, conf: 'AFC', startLeagues: ['ksa1'] },
  { name: 'Qatar', flag: 'qa', strength: 66, conf: 'AFC', startLeagues: ['ksa1'] },
  { name: 'China', flag: 'cn', strength: 58, conf: 'AFC', startLeagues: ['por1', 'bel1'] },
  { name: 'India', flag: 'in', strength: 52, conf: 'AFC', startLeagues: ['por1', 'bel1'] },
]

export const NATION_BY_NAME: Record<string, Nation> = Object.fromEntries(
  NATIONS.map((n) => [n.name, n]),
)

export const flagUrl = (code: string) => `https://flagcdn.com/w40/${code}.png`
