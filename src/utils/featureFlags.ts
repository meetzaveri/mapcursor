import {
    DRAG_SCANS_ENABLED_KEY,
    VIEWPORT_CULLING_ENABLED_KEY,
} from '../constants/misc'

// Live, user-toggleable feature flags backed by localStorage.
//
// These are edited at runtime and must take effect on the already-running app.
// The value is cached in a module-level variable so the hot Two.js paths (all
// living inside `addZUI`'s stale-closure DOM handlers) can read it cheaply and
// live, without re-binding listeners or hitting localStorage every frame.

type Listener = (enabled: boolean) => void

// ── Drag-scan flag (perf testing) ─────────────────────────────────────────
// Same runtime/localStorage model. Gates the O(N) scene scans that ride along
// with dragging (the hover-detect endpoint scan, per rAF). Turn OFF to measure
// drag/paint cost with the scans removed on dense bases — this is a measurement
// lever, not a user feature.

// Default ON: normal behavior. Disable only for perf isolation runs.
const DEFAULT_DRAG_SCANS_ENABLED = true

let dragScansCached: boolean | null = null
const dragScansListeners = new Set<Listener>()

export function getDragScansEnabled(): boolean {
    if (dragScansCached === null) {
        const stored = localStorage.getItem(DRAG_SCANS_ENABLED_KEY)
        dragScansCached =
            stored === null ? DEFAULT_DRAG_SCANS_ENABLED : stored === 'true'
    }
    return dragScansCached
}

export function setDragScansEnabled(enabled: boolean): void {
    dragScansCached = enabled
    try {
        localStorage.setItem(DRAG_SCANS_ENABLED_KEY, String(enabled))
    } catch {
        // Persistence is best-effort; an in-memory toggle still works for the
        // current session even if storage is full/blocked.
    }
    dragScansListeners.forEach((fn) => fn(enabled))
}

// Subscribe to live changes. Returns an unsubscribe fn.
export function subscribeDragScansEnabled(fn: Listener): () => void {
    dragScansListeners.add(fn)
    return (): void => {
        dragScansListeners.delete(fn)
    }
}

// ── Viewport culling flag ─────────────────────────────────────────────────
// Same runtime/localStorage model. Gates the paint-cost optimisation that hides
// off-screen scene elements during pan/zoom (see `src/utils/viewportCulling.ts`).
// The hot camera handlers read `getViewportCullingEnabled()` cheaply per frame.

// Opt-in feature: default OFF while it's validated on real bases.
const DEFAULT_VIEWPORT_CULLING_ENABLED = true

let cullingCached: boolean | null = null
const cullingListeners = new Set<Listener>()

export function getViewportCullingEnabled(): boolean {
    if (cullingCached === null) {
        const stored = localStorage.getItem(VIEWPORT_CULLING_ENABLED_KEY)
        cullingCached =
            stored === null
                ? DEFAULT_VIEWPORT_CULLING_ENABLED
                : stored === 'true'
    }
    return cullingCached
}

export function setViewportCullingEnabled(enabled: boolean): void {
    cullingCached = enabled
    try {
        localStorage.setItem(VIEWPORT_CULLING_ENABLED_KEY, String(enabled))
    } catch {
        // Persistence is best-effort; an in-memory toggle still works for the
        // current session even if storage is full/blocked.
    }
    cullingListeners.forEach((fn) => fn(enabled))
}

// Subscribe to live changes. Returns an unsubscribe fn.
export function subscribeViewportCullingEnabled(fn: Listener): () => void {
    cullingListeners.add(fn)
    return (): void => {
        cullingListeners.delete(fn)
    }
}
