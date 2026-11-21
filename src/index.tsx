import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'
import * as serviceWorker from './serviceWorker'

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    enabled: import.meta.env.MODE !== 'development' ? true : false,
})

const PRELOAD_RELOAD_KEY = 'vite-preload-reloaded'

window.addEventListener('vite:preloadError', (event) => {
    if (sessionStorage.getItem(PRELOAD_RELOAD_KEY)) return
    event.preventDefault()
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1')
    window.location.reload()
})

window.addEventListener('load', () => {
    sessionStorage.removeItem(PRELOAD_RELOAD_KEY)
})

const rootEl = document.getElementById('root')
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<App />)
}

serviceWorker.unregister()
