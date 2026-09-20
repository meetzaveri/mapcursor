// Custom-event tracking on top of Umami.
//
// The Umami script is loaded from index.html with `defer`, so `window.umami`
// does not exist while React mounts — and the earliest events we care about
// (a base opening, the start-location prompt) fire in exactly that window.
// Dropping them would silently bias the funnel towards its later steps, which
// is the one thing a funnel must not do, so early events are queued and
// flushed once the script lands.
//
// Three rules hold everywhere in this module:
//
//  1. It never throws. An analytics failure must not be able to break a
//     drawing session, so every call is wrapped and every error swallowed.
//  2. It never sends anything a user typed or drew. Event data is limited to
//     tool names, counts and enum-ish strings — never element content, place
//     names, or coordinates.
//  3. Nothing here blocks. Tracking is fire-and-forget by construction.

/**
 * The complete set of events. A union rather than free-form strings because
 * Umami has no schema of its own: a typo'd name silently becomes a new event
 * that quietly splits a funnel step in two.
 */
export type AnalyticsEvent =
    /** A persisted base was opened at /map/:id — the receiving end of a share. */
    | 'base_opened'
    /** The first-visit "where are you mapping?" prompt was displayed. */
    | 'map_start_shown'
    /** That prompt was answered, one way or another. */
    | 'map_start_answered'
    /** The first element this browser has ever drawn. Fires at most once. */
    | 'first_element_drawn'
    /**
     * The canvas is mounted and usable. The denominator every other step
     * divides by, and a far better "a real person arrived" signal than a
     * pageview: it waits on the MapLibre backdrop, which needs WebGL, so
     * headless scanners never reach it.
     */
    | 'canvas_ready'
    /** A drawing tool was made current, from the toolbar or a shortcut. */
    | 'tool_selected'
    /** The first tool picked in this session. One per session, unlike above. */
    | 'first_tool_selected'
    /** The share dialog was opened (intent, not outcome). */
    | 'share_clicked'
    /** A share completed and a link exists. */
    | 'share_succeeded'
    /** A share attempt threw. */
    | 'share_failed'

/** Umami only stores flat scalars, so the payload is flat scalars. */
export type AnalyticsPayload = Record<string, string | number | boolean>

interface QueuedEvent {
    name: AnalyticsEvent
    data?: AnalyticsPayload
}

/** Bounded so a blocked script can't grow the queue without limit. */
const MAX_QUEUED = 50

/** How often to look for the deferred script. */
const FLUSH_INTERVAL_MS = 400

/**
 * How long to wait for it before giving up. An ad blocker never delivers
 * `window.umami` at all, and polling forever in that (common) case would keep
 * a timer alive for the whole session for nothing.
 */
const FLUSH_TIMEOUT_MS = 15000

/**
 * The build that produced this bundle, baked in by vite.config.mjs and
 * attached to every event. It is what makes a funnel measured today
 * comparable to one measured after the next redesign — without it, events
 * from two different versions of the app are indistinguishable.
 *
 * Guarded because `trackEvent` must never throw, and a missing define would
 * otherwise be a ReferenceError on the first event of the session.
 */
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
    } catch {
        // Analytics must never surface to the user.
    }
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
            // Blocked or never loaded. Drop what we have rather than hold it.
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

/**
 * Record one funnel event. Safe to call from anywhere, at any time, including
 * before the analytics script has loaded and in environments that have no
 * `window` at all.
 */
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

// --- Firing a step at most once --------------------------------------------
//
// Funnel steps have to count people, not actions. `tool_selected` fires every
// time the current tool changes, which for one person drawing for ten minutes
// is dozens of events — useful for tool popularity, useless as a funnel step.
// These two keep the step versions honest.

const ONCE_PREFIX = 'mapcursor_once_'

/**
 * True the first time this browser ever asks, false forever after.
 *
 * On a storage failure it returns true, which over-counts rather than going
 * silent. A duplicated event is visible and can be reasoned about; a step that
 * quietly never fires looks exactly like a step nobody reaches, which is the
 * one conclusion a funnel must never invent.
 */
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

/** As `onceEver`, but resets when the tab closes. */
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

// --- Distinguishing a sharer from a recipient -------------------------------
//
// `base_opened` is only interesting if we can tell the two apart: the sharer's
// own browser opens the new link in a tab immediately after sharing (see
// shareLinkPopup), and the owner revisits their own base afterwards. Counting
// those as arrivals would make the share loop look like it works when nobody
// has actually followed a link.
//
// The base row carries `createdBy`, but the query that loads a base doesn't
// select it, and widening that query means a codegen round-trip against a live
// Hasura. This is the same answer for the price of a localStorage key.

const OWN_BASES_KEY = 'mapcursor_own_base_ids'

/** Keeps the key small; older ids fall off the front. */
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

/** Note that this browser created `baseId`, so a later open isn't an arrival. */
export const rememberOwnBase = (baseId: string): void => {
    try {
        const ids = readOwnBases().filter((id) => id !== baseId)
        ids.push(baseId)
        localStorage.setItem(
            OWN_BASES_KEY,
            JSON.stringify(ids.slice(-MAX_OWN_BASES))
        )
    } catch {
        // Private mode, or a full quota. The flag degrades to "not mine",
        // which over-counts arrivals rather than inventing them.
    }
}

/** Whether this browser is the one that shared `baseId`. */
export const isOwnBase = (baseId: string): boolean =>
    readOwnBases().includes(baseId)
