import type { MapAnchor } from '../baseTypes/types'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const RESULT_LIMIT = 5

const PLACE_ZOOM = 15

export interface PlaceResult {
    id: string
    label: string
    anchor: MapAnchor
}

interface NominatimRow {
    place_id?: number | string
    display_name?: string
    lat?: string
    lon?: string
}

export async function searchPlaces(
    query: string,
    signal?: AbortSignal
): Promise<PlaceResult[]> {
    const trimmed = query.trim()
    if (!trimmed) return []

    const url = `${NOMINATIM_URL}?format=jsonv2&limit=${RESULT_LIMIT}&q=${encodeURIComponent(trimmed)}`

    try {
        const response = await fetch(url, { signal })
        if (!response.ok) return []
        const rows: unknown = await response.json()
        if (!Array.isArray(rows)) return []

        return rows.flatMap((raw: NominatimRow, index): PlaceResult[] => {
            const lat = Number(raw?.lat)
            const lon = Number(raw?.lon)
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []
            return [
                {
                    id: String(raw.place_id ?? `${lat},${lon},${index}`),
                    label: raw.display_name ?? `${lat}, ${lon}`,
                    anchor: { lngLat: [lon, lat], zoom: PLACE_ZOOM },
                },
            ]
        })
    } catch {
        return []
    }
}
