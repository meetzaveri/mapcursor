import {
    DRAG_SCANS_ENABLED_KEY,
    ROUTE_SNAP_ENABLED_KEY,
    VIEWPORT_CULLING_ENABLED_KEY,
} from '../constants/misc'

type Listener = (enabled: boolean) => void

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
    } catch {}
    dragScansListeners.forEach((fn) => fn(enabled))
}

export function subscribeDragScansEnabled(fn: Listener): () => void {
    dragScansListeners.add(fn)
    return (): void => {
        dragScansListeners.delete(fn)
    }
}

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
    } catch {}
    cullingListeners.forEach((fn) => fn(enabled))
}

export function subscribeViewportCullingEnabled(fn: Listener): () => void {
    cullingListeners.add(fn)
    return (): void => {
        cullingListeners.delete(fn)
    }
}

const DEFAULT_ROUTE_SNAP_ENABLED = true

let routeSnapCached: boolean | null = null
const routeSnapListeners = new Set<Listener>()

export function getRouteSnapEnabled(): boolean {
    if (routeSnapCached === null) {
        const stored = localStorage.getItem(ROUTE_SNAP_ENABLED_KEY)
        routeSnapCached =
            stored === null ? DEFAULT_ROUTE_SNAP_ENABLED : stored === 'true'
    }
    return routeSnapCached
}

export function setRouteSnapEnabled(enabled: boolean): void {
    routeSnapCached = enabled
    try {
        localStorage.setItem(ROUTE_SNAP_ENABLED_KEY, String(enabled))
    } catch {}
    routeSnapListeners.forEach((fn) => fn(enabled))
}

export function subscribeRouteSnapEnabled(fn: Listener): () => void {
    routeSnapListeners.add(fn)
    return (): void => {
        routeSnapListeners.delete(fn)
    }
}
