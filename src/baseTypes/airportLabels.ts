// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLibreMap = any

interface StyleReader {
    getLayersOrder(): string[]
    getLayer(id: string): { source?: string; sourceLayer?: string } | undefined
}

export const AIRPORT_LABEL_LAYER_ID = 'mc-airport-labels'

const MIN_ZOOM = 10

interface AirportSchema {
    detectBy: string
    sourceLayer: string
    filter: unknown[]
}

const SCHEMAS: readonly AirportSchema[] = [
    {
        detectBy: 'pois',
        sourceLayer: 'pois',
        filter: [
            'all',
            ['==', ['get', 'kind'], 'aerodrome'],
            ['has', 'name'],
            ['>=', ['zoom'], ['coalesce', ['get', 'min_zoom'], 0]],
        ],
    },
    {
        detectBy: 'transportation',
        sourceLayer: 'aerodrome_label',
        filter: ['has', 'name'],
    },
]

export function airportLabelLayer(
    map: StyleReader
): Record<string, unknown> | null {
    let layerIds: string[]
    try {
        layerIds = map.getLayersOrder()
    } catch {
        return null
    }
    for (const schema of SCHEMAS) {
        for (const id of layerIds) {
            const layer = map.getLayer(id)
            if (layer?.sourceLayer !== schema.detectBy || !layer.source) {
                continue
            }
            return {
                id: AIRPORT_LABEL_LAYER_ID,
                type: 'symbol',
                source: layer.source,
                'source-layer': schema.sourceLayer,
                minzoom: MIN_ZOOM,
                filter: schema.filter,
                layout: {
                    'text-field': [
                        'coalesce',
                        ['get', 'name:en'],
                        ['get', 'name'],
                    ],
                    'text-font': [
                        'Montserrat SemiBold',
                        'Open Sans Bold',
                        'Noto Sans Regular',
                        'Noto Sans CJK JP Regular',
                    ],
                    'text-size': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10,
                        10,
                        14,
                        12,
                        17,
                        14,
                    ],
                    'text-max-width': 9,
                    'text-transform': 'uppercase',
                    'text-letter-spacing': 0.05,
                },
                paint: {
                    'text-color': '#5b6b78',
                    'text-halo-color': '#f5f5f3',
                    'text-halo-width': 1.2,
                },
            }
        }
    }
    return null
}

export function addAirportLabels(map: MapLibreMap): void {
    try {
        if (map.getLayer(AIRPORT_LABEL_LAYER_ID)) return
        const layer = airportLabelLayer(map)
        if (layer) map.addLayer(layer)
    } catch (err) {
        console.error('Airport labels failed', err)
    }
}
