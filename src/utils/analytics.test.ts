import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const loadModule = async () => {
    vi.resetModules()
    return import('./analytics')
}

const installTracker = (): ReturnType<typeof vi.fn> => {
    const track = vi.fn()
    ;(window as Window).umami = { track }
    return track
}

describe('trackEvent', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        delete (window as Window).umami
        localStorage.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('sends straight through once the script is present', async () => {
        const track = installTracker()
        const { trackEvent } = await loadModule()

        trackEvent('tool_selected', { tool: 'pencil' })

        expect(track).toHaveBeenCalledWith('tool_selected', {
            tool: 'pencil',
            build: __BUILD_SHA__,
        })
    })

    it('stamps the build on every event, payload or not', async () => {
        const track = installTracker()
        const { trackEvent } = await loadModule()

        trackEvent('canvas_ready')

        expect(track).toHaveBeenCalledWith('canvas_ready', {
            build: __BUILD_SHA__,
        })
        expect(__BUILD_SHA__).toEqual(expect.any(String))
    })

    it('queues events fired before the script loads, then flushes them', async () => {
        const { trackEvent } = await loadModule()

        trackEvent('base_opened', { own: false })
        trackEvent('map_start_shown')

        const track = installTracker()
        expect(track).not.toHaveBeenCalled()

        vi.advanceTimersByTime(400)

        expect(track).toHaveBeenCalledTimes(2)
        expect(track).toHaveBeenNthCalledWith(1, 'base_opened', {
            own: false,
            build: __BUILD_SHA__,
        })
        expect(track).toHaveBeenNthCalledWith(2, 'map_start_shown', {
            build: __BUILD_SHA__,
        })
    })

    it('gives up after the timeout instead of polling forever', async () => {
        const { trackEvent } = await loadModule()

        trackEvent('share_clicked', { persisted: false })
        vi.advanceTimersByTime(20000)

        const track = installTracker()
        vi.advanceTimersByTime(5000)

        expect(track).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('swallows a throwing tracker', async () => {
        ;(window as Window).umami = {
            track: () => {
                throw new Error('blocked')
            },
        }
        const { trackEvent } = await loadModule()

        expect(() => trackEvent('share_failed', { reason: 'x' })).not.toThrow()
    })
})

describe('once-only funnel steps', () => {
    beforeEach(() => {
        localStorage.clear()
        sessionStorage.clear()
    })

    it('onceEver fires once and never again', async () => {
        const { onceEver } = await loadModule()

        expect(onceEver('first_element_drawn')).toBe(true)
        expect(onceEver('first_element_drawn')).toBe(false)
        expect(onceEver('something_else')).toBe(true)
    })

    it('onceEver survives a fresh module load', async () => {
        const first = await loadModule()
        expect(first.onceEver('first_element_drawn')).toBe(true)

        const second = await loadModule()
        expect(second.onceEver('first_element_drawn')).toBe(false)
    })

    it('oncePerSession resets when session storage does', async () => {
        const { oncePerSession } = await loadModule()

        expect(oncePerSession('first_tool_selected')).toBe(true)
        expect(oncePerSession('first_tool_selected')).toBe(false)

        sessionStorage.clear()

        expect(oncePerSession('first_tool_selected')).toBe(true)
    })

    it('over-counts rather than going silent when storage throws', async () => {
        const { onceEver } = await loadModule()
        const getItem = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
                throw new Error('denied')
            })

        expect(onceEver('first_element_drawn')).toBe(true)
        expect(onceEver('first_element_drawn')).toBe(true)

        getItem.mockRestore()
    })
})

describe('own-base bookkeeping', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('recognises a base this browser shared', async () => {
        const { rememberOwnBase, isOwnBase } = await loadModule()

        rememberOwnBase('abc')

        expect(isOwnBase('abc')).toBe(true)
        expect(isOwnBase('def')).toBe(false)
    })

    it('treats unparseable storage as "not mine" rather than throwing', async () => {
        localStorage.setItem('mapcursor_own_base_ids', 'not json')
        const { isOwnBase } = await loadModule()

        expect(isOwnBase('abc')).toBe(false)
    })
})
