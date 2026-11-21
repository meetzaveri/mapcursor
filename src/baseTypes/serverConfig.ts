import type { MapAnchor } from './types'

export interface ServerBaseRow {
    id?: string | null
    isPublic?: boolean | null
    mapAnchorLng?: unknown
    mapAnchorLat?: unknown
    mapAnchorZoom?: unknown
    landingLng?: unknown
    landingLat?: unknown
    landingZoom?: unknown
}

export interface ServerBaseConfig {
    mapAnchor: MapAnchor | null
    landing: MapAnchor | null
}

function finite(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

function triple(
    lng: unknown,
    lat: unknown,
    zoom: unknown
): MapAnchor | null {
    const l = finite(lng)
    const a = finite(lat)
    const z = finite(zoom)
    if (l === null || a === null || z === null) return null
    if (l < -180 || l > 180 || a < -90 || a > 90) return null
    return { lngLat: [l, a], zoom: z }
}

export function normalizeServerBaseConfig(
    row: ServerBaseRow | null | undefined
): ServerBaseConfig | null {
    if (!row) return null
    return {
        mapAnchor: triple(row.mapAnchorLng, row.mapAnchorLat, row.mapAnchorZoom),
        landing: triple(row.landingLng, row.landingLat, row.landingZoom),
    }
}
