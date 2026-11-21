const TOOLBAR_INTRO_KEY = 'mapcursor:onboarding:toolbarIntroSeen'

export function hasSeenToolbarIntro(): boolean {
    try {
        return localStorage.getItem(TOOLBAR_INTRO_KEY) === '1'
    } catch {
        return true
    }
}

export function markToolbarIntroSeen(): void {
    try {
        localStorage.setItem(TOOLBAR_INTRO_KEY, '1')
    } catch {
        return
    }
}
