// Per-base viewport persistence.
//
// Key shape: `mapcursor_viewport_<baseId>`, or the mobile prefix instead.
// Desktop and mobile keep separate cameras — they have very different usable
// viewports — which is why the prefix differs rather than a suffix.

import {
    VIEWPORT_KEY_PREFIX,
    MOBILE_VIEWPORT_KEY_PREFIX,
    VIEWPORT_TTL_MS,
} from '../constants/misc'

export interface StoredViewport {
    scale: number
    tx: number
    ty: number
}

interface RawViewport extends StoredViewport {
    savedAt: number
}

/** Storage key for a base's camera. */
export function viewportKeyFor(baseId: string, isMobile: boolean): string {
    const prefix = isMobile ? MOBILE_VIEWPORT_KEY_PREFIX : VIEWPORT_KEY_PREFIX
    return `${prefix}${baseId}`
}

/** Read a base's saved camera, or null when absent, expired or malformed. */
export function readViewport(
    baseId: string,
    isMobile: boolean
): StoredViewport | null {
    if (!baseId) return null
    const key = viewportKeyFor(baseId, isMobile)
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<RawViewport>
        if (!parsed.savedAt || Date.now() - parsed.savedAt > VIEWPORT_TTL_MS) {
            localStorage.removeItem(key)
            return null
        }
        const { scale, tx, ty } = parsed
        if (
            !Number.isFinite(scale) ||
            !Number.isFinite(tx) ||
            !Number.isFinite(ty) ||
            (scale as number) <= 0
        ) {
            localStorage.removeItem(key)
            return null
        }
        return {
            scale: scale as number,
            tx: tx as number,
            ty: ty as number,
        }
    } catch {
        return null
    }
}

/** Persist a base's camera. Swallows quota/private-mode failures. */
export function writeViewport(
    baseId: string,
    isMobile: boolean,
    viewport: StoredViewport
): void {
    if (!baseId) return
    try {
        localStorage.setItem(
            viewportKeyFor(baseId, isMobile),
            JSON.stringify({ ...viewport, savedAt: Date.now() })
        )
    } catch {
        // Losing a camera preference must never block the interaction.
    }
}

/** The camera a base opens on when it has nothing saved. */
export const IDENTITY_VIEWPORT: StoredViewport = { scale: 1, tx: 0, ty: 0 }
