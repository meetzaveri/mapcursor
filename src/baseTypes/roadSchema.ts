// Which vector layer holds the roads, and which of its features are roads a
// route can be drawn along.
//
// The basemap is CARTO's hosted Positron style, and CARTO changes its tileset
// without notice. Until October 2026 it served OpenMapTiles (source `carto`,
// layer `transportation`, property `class`). The 2026-10-26 tiles switched to
// the Protomaps schema (source `protomaps`, layer `roads`, properties `kind` /
// `kind_detail`). The style.json is cached for a day, so both are live at once
// during a rollover. Hard-coding either one silently turns snapping off for
// whoever has the other, so the source is discovered from the style instead.

/** The slice of a maplibre Map this module needs. Type-only, so no chunk pull. */
interface StyleReader {
    getLayersOrder(): string[]
    getLayer(id: string): { source?: string; sourceLayer?: string } | undefined
    getSource(id: string): unknown
}

interface RoadSchema {
    sourceLayer: string
    /** The road's class, used for exclusion and reported in the debug probe. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roadClass(props: Record<string, any>): string
    /**
     * Not roads a route can follow. Rail, aerialways and ferries cross the road
     * network constantly but share no junctions with it, so they would capture
     * a cursor that strays over a level crossing. Paths and tracks are KEPT: a
     * walking route down a footpath is exactly what the feature is for.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isExcluded(props: Record<string, any>): boolean
}

const OMT_NON_ROAD_CLASSES = new Set([
    'rail',
    'transit',
    'aerialway',
    'ferry',
    'raceway',
])

// Protomaps `kind` values seen in CARTO's tiles: highway, major_road,
// minor_road, other, path, rail, ferry, aeroway (runways and taxiways).
const PROTOMAPS_NON_ROAD_KINDS = new Set(['rail', 'ferry', 'aeroway'])
const PROTOMAPS_NON_ROAD_DETAILS = new Set(['raceway', 'aerialway'])

/** Newest first: the first schema whose layer the style uses wins. */
const ROAD_SCHEMAS: readonly RoadSchema[] = [
    {
        // Protomaps, CARTO since 2026-10-26.
        sourceLayer: 'roads',
        roadClass: (p) => String(p.kind_detail ?? p.kind ?? ''),
        isExcluded: (p) =>
            PROTOMAPS_NON_ROAD_KINDS.has(String(p.kind ?? '')) ||
            PROTOMAPS_NON_ROAD_DETAILS.has(String(p.kind_detail ?? '')),
    },
    {
        // OpenMapTiles, CARTO before 2026-10-26.
        sourceLayer: 'transportation',
        roadClass: (p) => String(p.class ?? ''),
        isExcluded: (p) => OMT_NON_ROAD_CLASSES.has(String(p.class ?? '')),
    },
]

export interface RoadSourceMatch {
    sourceId: string
    schema: RoadSchema
}

const cache = new WeakMap<object, RoadSourceMatch>()

/**
 * Find the vector source + schema the current style draws roads from, by
 * looking at which source its road layers read. `null` until the style has
 * loaded, or if no known road layer is present.
 */
export function findRoadSource(map: StyleReader): RoadSourceMatch | null {
    const cached = cache.get(map)
    if (cached && map.getSource(cached.sourceId)) return cached

    let layerIds: string[]
    try {
        layerIds = map.getLayersOrder()
    } catch {
        // Style not loaded yet.
        return null
    }

    for (const schema of ROAD_SCHEMAS) {
        for (const id of layerIds) {
            const layer = map.getLayer(id)
            if (layer?.sourceLayer === schema.sourceLayer && layer.source) {
                const match = { sourceId: layer.source, schema }
                cache.set(map, match)
                return match
            }
        }
    }
    return null
}
