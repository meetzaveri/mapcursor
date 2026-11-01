// Per-base map-anchor persistence.
//
// Mirrors the viewport-key pattern (`mapcursor_viewport_<baseId>`): one key per
// base and a `savedAt` stamp. But an anchor is NOT a cache like the camera. It
// is the georeference every element's x/y was measured against, so losing it
// moves the whole drawing to wherever the fallback lands (the timezone city).
//
// That is why reading never expires an anchor by age, and the TTL sweep in
// base.tsx skips the CURRENT local base's anchor (see isAnchorKeyExpired). It
// used to do neither: the anchor's `savedAt` is stamped once, when the place is
// picked, while the draft's timestamp renews on every save, so a canvas still
// being edited a month after it was placed lost its anchor and was redrawn
// over the browser's timezone city, with no prompt to correct it (the start-
// location prompt only opens on an empty canvas).
//
// An unreadable entry must still never throw a base open: anything missing or
// malformed reads back as `null`, and the backdrop falls back to the timezone
// guess.

import { MAP_ANCHOR_KEY_PREFIX, VIEWPORT_TTL_MS } from '../constants/misc'
import type { MapAnchor, MapBackdropConfig } from './types'

interface StoredConfig extends MapBackdropConfig {
    savedAt: number
}

function keyFor(baseId: string): string {
    return `${MAP_ANCHOR_KEY_PREFIX}${baseId}`
}

export function isMapAnchor(value: unknown): value is MapAnchor {
    if (!value || typeof value !== 'object') return false
    const anchor = value as Partial<MapAnchor>
    return (
        Array.isArray(anchor.lngLat) &&
        anchor.lngLat.length === 2 &&
        anchor.lngLat.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
        typeof anchor.zoom === 'number' &&
        Number.isFinite(anchor.zoom)
    )
}

/**
 * Read a base's persisted anchor. Never throws, and never expires it by age:
 * the base being opened is exactly the one whose anchor must survive.
 */
export function readAnchorConfig(baseId: string): MapBackdropConfig {
    const fallback: MapBackdropConfig = { mapAnchor: null }
    if (!baseId) return fallback

    try {
        const raw = localStorage.getItem(keyFor(baseId))
        if (!raw) return fallback

        const parsed = JSON.parse(raw) as Partial<StoredConfig>
        return {
            mapAnchor: isMapAnchor(parsed.mapAnchor) ? parsed.mapAnchor : null,
        }
    } catch {
        try {
            localStorage.removeItem(keyFor(baseId))
        } catch {
            // localStorage unavailable (private mode); nothing to clean up.
        }
        return fallback
    }
}

/**
 * Persist a base's anchor. A quota failure is swallowed: losing the anchor
 * preference is a better outcome than blocking the action the user just took.
 */
export function writeAnchorConfig(
    baseId: string,
    config: MapBackdropConfig
): void {
    if (!baseId) return
    try {
        const payload: StoredConfig = {
            mapAnchor: config.mapAnchor ?? null,
            savedAt: Date.now(),
        }
        localStorage.setItem(keyFor(baseId), JSON.stringify(payload))
    } catch {
        // Quota / private mode — the anchor still applies for this session.
    }
}

/**
 * May the TTL sweep remove this anchor key?
 *
 * Only an anchor that is old AND not protected. `protectedBaseIds` holds the
 * current local base's id(s): its anchor stays for as long as the canvas does,
 * however long ago the place was picked. Anchors of other ids (a local canvas
 * since rotated away by share/import/clear, or a shared base visited once) are
 * housekeeping and still expire. A key with no `savedAt` is treated as old.
 */
export function isAnchorKeyExpired(
    key: string,
    savedAt: number | undefined,
    now: number,
    protectedBaseIds: ReadonlySet<string>
): boolean {
    if (!key.startsWith(MAP_ANCHOR_KEY_PREFIX)) return false
    const baseId = key.slice(MAP_ANCHOR_KEY_PREFIX.length)
    if (protectedBaseIds.has(baseId)) return false
    return !savedAt || now - savedAt > VIEWPORT_TTL_MS
}
