import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)

// A relative path, not '/sw.js': the build can land at a domain root or a
// subfolder (a NAS, a stick, a GitHub Pages project site), and the worker has
// to resolve against wherever index.html actually is. Dev-only would break
// nothing here either way, but the dev server has no built assets to offer a
// service worker anything worth caching, so it stays production-only.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // offline play is a bonus, not a requirement; a failed registration
      // should never be the reason the game does not load
    })
  })
}
