export const E2E_HOOKS =
    import.meta.env.DEV || import.meta.env.VITE_E2E_HOOKS === 'true'

// Set by the Playwright fixture so specs don't wait on map tiles and the
// staggered chrome reveal before they can click the toolbar.
export const SKIP_CHROME_REVEAL =
    E2E_HOOKS &&
    typeof window !== 'undefined' &&
    window.__mcSkipChromeReveal === true
