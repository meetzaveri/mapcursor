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
        }
        return fallback
    }
}

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
    }
}

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
