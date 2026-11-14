// Airport names, which Positron never draws.
//
// The tiles carry them: since CARTO's 2026-10-26 switch to the Protomaps schema
// an airport is a point in the `pois` layer with `kind: "aerodrome"`, its name,
// IATA code and a `min_zoom` (11 for O'Hare). But Positron's only POI label
// layers are `poi_stadium` (stadium / cemetery / attraction) and `poi_park`, so
// the name sits in every tile and is simply never drawn. For a tool whose users
// mark up places, an unlabelled airport is the most conspicuous gap there is.
//
// So we add one label layer of our own over CARTO's source, leaving Positron's
// layers alone so a CARTO style update cannot break it.
//
// It is added LAST, at the top of the style, and that is load-bearing. MapLibre
// places labels from the top layer down, and a label that collides with one
// already placed is dropped. Below Positron's road and place names, an airport
// name loses to a motorway's at exactly the zooms you look at an airport. On
// top, it is placed first and they yield to it.
//
// CARTO changes schema without notice and the style.json is cached for a day,
// so both schemas can be live at once; the source is discovered from the style,
// as roadSchema.ts does for roads.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLibreMap = any

/** The slice of a maplibre Map the discovery needs. */
interface StyleReader {
    getLayersOrder(): string[]
    getLayer(id: string): { source?: string; sourceLayer?: string } | undefined
}

export const AIRPORT_LABEL_LAYER_ID = 'mc-airport-labels'

/** Below this, even an international airport is a dot in a city. */
const MIN_ZOOM = 10

interface AirportSchema {
    /** A source-layer whose presence in the style identifies the schema. */
    detectBy: string
    sourceLayer: string
    filter: unknown[]
}

const SCHEMAS: readonly AirportSchema[] = [
    {
        // Protomaps, CARTO since 2026-10-26. Each airport carries the zoom
        // the tiles think it is worth showing at, which keeps a private
        // airstrip from shouting at city zoom while O'Hare shows from 11.
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
        // OpenMapTiles, CARTO before 2026-10-26: airports have a layer of
        // their own.
        detectBy: 'transportation',
        sourceLayer: 'aerodrome_label',
        filter: ['has', 'name'],
    },
]

/**
 * The airport label layer for whichever schema the style uses, or null until
 * the style has loaded (or if it uses neither).
 */
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
                    // Positron's own label fonts, so the glyphs are already
                    // served and the name reads as part of the basemap.
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
                    // Positron's place-name grey, a shade darker so it holds
                    // against the pale aerodrome fill it sits on.
                    'text-color': '#5b6b78',
                    'text-halo-color': '#f5f5f3',
                    'text-halo-width': 1.2,
                },
            }
        }
    }
    return null
}

/**
 * Add the airport labels once the style has its source.
 *
 * Same contract as `paintWater` (mapBackdrop.ts): hooked to `styledata`, which
 * fires on every style mutation, so it checks before adding and is a no-op once
 * done. Must
 * never take the backdrop down: worst case the map has no airport names, as
 * before.
 */
export function addAirportLabels(map: MapLibreMap): void {
    try {
        if (map.getLayer(AIRPORT_LABEL_LAYER_ID)) return
        const layer = airportLabelLayer(map)
        // No beforeId: on top of every Positron layer, so it is placed first.
        if (layer) map.addLayer(layer)
    } catch (err) {
        console.error('Airport labels failed', err)
    }
}
