export type AnalyticsEvent =
    | 'base_opened'
    | 'map_start_shown'
    | 'map_start_answered'
    | 'first_element_drawn'
    | 'canvas_ready'
    | 'tool_selected'
    | 'first_tool_selected'
    | 'share_clicked'
    | 'share_succeeded'
    | 'share_failed'

export type AnalyticsPayload = Record<string, string | number | boolean>

interface QueuedEvent {
    name: AnalyticsEvent
    data?: AnalyticsPayload
}

const MAX_QUEUED = 50

const FLUSH_INTERVAL_MS = 400

const FLUSH_TIMEOUT_MS = 15000

const BUILD_SHA: string =
    typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'unknown'

let queue: QueuedEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let waitingSince = 0

const getTracker = (): typeof window.umami | undefined => {
    if (typeof window === 'undefined') return undefined
    return typeof window.umami?.track === 'function' ? window.umami : undefined
}

const send = ({ name, data }: QueuedEvent): void => {
    try {
        getTracker()?.track(name, data)
    } catch {}
}

const stopFlushing = (): void => {
    if (flushTimer !== null) {
        clearInterval(flushTimer)
        flushTimer = null
    }
}

const flush = (): void => {
    if (!getTracker()) {
        if (Date.now() - waitingSince > FLUSH_TIMEOUT_MS) {
            queue = []
            stopFlushing()
        }
        return
    }
    const pending = queue
    queue = []
    stopFlushing()
    pending.forEach(send)
}

const startFlushing = (): void => {
    if (flushTimer !== null) return
    waitingSince = Date.now()
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS)
}

export const trackEvent = (
    name: AnalyticsEvent,
    data?: AnalyticsPayload
): void => {
    if (typeof window === 'undefined') return
    const stamped: AnalyticsPayload = { ...data, build: BUILD_SHA }
    if (getTracker()) {
        send({ name, data: stamped })
        return
    }
    if (queue.length < MAX_QUEUED) queue.push({ name, data: stamped })
    startFlushing()
}

const ONCE_PREFIX = 'mapcursor_once_'

export const onceEver = (key: string): boolean => {
    try {
        const storageKey = `${ONCE_PREFIX}${key}`
        if (localStorage.getItem(storageKey)) return false
        localStorage.setItem(storageKey, '1')
        return true
    } catch {
        return true
    }
}

export const oncePerSession = (key: string): boolean => {
    try {
        const storageKey = `${ONCE_PREFIX}${key}`
        if (sessionStorage.getItem(storageKey)) return false
        sessionStorage.setItem(storageKey, '1')
        return true
    } catch {
        return true
    }
}

const OWN_BASES_KEY = 'mapcursor_own_base_ids'

const MAX_OWN_BASES = 50

const readOwnBases = (): string[] => {
    try {
        const raw = localStorage.getItem(OWN_BASES_KEY)
        if (!raw) return []
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === 'string')
            : []
    } catch {
        return []
    }
}

export const rememberOwnBase = (baseId: string): void => {
    try {
        const ids = readOwnBases().filter((id) => id !== baseId)
        ids.push(baseId)
        localStorage.setItem(
            OWN_BASES_KEY,
            JSON.stringify(ids.slice(-MAX_OWN_BASES))
        )
    } catch {}
}

export const isOwnBase = (baseId: string): boolean =>
    readOwnBases().includes(baseId)
