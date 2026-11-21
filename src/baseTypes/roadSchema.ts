interface StyleReader {
    getLayersOrder(): string[]
    getLayer(id: string): { source?: string; sourceLayer?: string } | undefined
    getSource(id: string): unknown
}

interface RoadSchema {
    sourceLayer: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roadClass(props: Record<string, any>): string
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

const PROTOMAPS_NON_ROAD_KINDS = new Set(['rail', 'ferry', 'aeroway'])
const PROTOMAPS_NON_ROAD_DETAILS = new Set(['raceway', 'aerialway'])

const ROAD_SCHEMAS: readonly RoadSchema[] = [
    {
        sourceLayer: 'roads',
        roadClass: (p) => String(p.kind_detail ?? p.kind ?? ''),
        isExcluded: (p) =>
            PROTOMAPS_NON_ROAD_KINDS.has(String(p.kind ?? '')) ||
            PROTOMAPS_NON_ROAD_DETAILS.has(String(p.kind_detail ?? '')),
    },
    {
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

export function findRoadSource(map: StyleReader): RoadSourceMatch | null {
    const cached = cache.get(map)
    if (cached && map.getSource(cached.sourceId)) return cached

    let layerIds: string[]
    try {
        layerIds = map.getLayersOrder()
    } catch {
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
