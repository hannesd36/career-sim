import { useCallback, useEffect, useState } from 'react'

export type Theme = 'black' | 'white'

const KEY = 'career-sim:theme'

/** Applied to <html> so the palette swaps without re-rendering anything. */
export function useTheme() {
  // Floodlights by default: the game is played at night. Daylight is a
  // preference, not the house style.
  const [theme, setThemeState] = useState<Theme>(() =>
    localStorage.getItem(KEY) === 'white' ? 'white' : 'black',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = useCallback(() => setThemeState((t) => (t === 'black' ? 'white' : 'black')), [])
  return { theme, toggle }
}
