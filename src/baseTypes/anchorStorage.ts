// Per-base map-anchor persistence.
//
// Mirrors the viewport-key pattern (`mapcursor_viewport_<baseId>`): one key per
// base, a `savedAt` stamp, and the shared TTL sweep in base.tsx.
//
// The anchor is the georeference every element's x/y was measured against, so an
// unreadable entry must never throw a base open. Anything missing, expired or
// malformed reads back as `null`, and the backdrop falls back to a timezone
// guess the user can see is wrong and correct.

import { MAP_ANCHOR_KEY_PREFIX, VIEWPORT_TTL_MS } from '../constants/misc'
import type { MapAnchor, MapBackdropConfig } from './types'

interface StoredConfig extends MapBackdropConfig {
    savedAt: number
}

function keyFor(baseId: string): string {
    return `${MAP_ANCHOR_KEY_PREFIX}${baseId}`
}

function isMapAnchor(value: unknown): value is MapAnchor {
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

/** Read a base's persisted anchor. Never throws. */
export function readAnchorConfig(baseId: string): MapBackdropConfig {
    const fallback: MapBackdropConfig = { mapAnchor: null }
    if (!baseId) return fallback

    try {
        const raw = localStorage.getItem(keyFor(baseId))
        if (!raw) return fallback

        const parsed = JSON.parse(raw) as Partial<StoredConfig>
        if (!parsed.savedAt || Date.now() - parsed.savedAt > VIEWPORT_TTL_MS) {
            localStorage.removeItem(keyFor(baseId))
            return fallback
        }

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
