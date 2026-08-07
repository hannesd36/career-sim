import { useCallback, useEffect, useState } from 'react'

export type Theme = 'black' | 'white' | 'pitch' | 'press'

/**
 * Four grounds to play on, in the order the button walks through them: two lit
 * and two printed. Every one of them is the same system with the surface and
 * the one loud colour swapped, never a different design.
 */
export const THEMES: Theme[] = ['black', 'white', 'pitch', 'press']

/** Which of them are dark, which the tier colours have to be re-lit for. */
export const LIGHT_THEMES: Theme[] = ['white', 'press']

const KEY = 'career-sim:theme'

/** Applied to <html> so the palette swaps without re-rendering anything. */
export function useTheme() {
  // Floodlights by default: the game is played at night. Anything else is a
  // preference, not the house style.
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY) as Theme | null
    return saved && THEMES.includes(saved) ? saved : 'black'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
  const cycle = useCallback(() => setTheme(next), [next])

  return { theme, next, cycle, setTheme }
}
