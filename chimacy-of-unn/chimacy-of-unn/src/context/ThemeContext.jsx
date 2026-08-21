import React, { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext(null)

/**
 * The app is white-theme-only by design now - no toggle, no reading the
 * device's dark-mode preference. This still provides the context/hook so
 * nothing else in the app needs to change, it just always resolves to
 * 'light' and never applies the `dark` class to <html>.
 */
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
