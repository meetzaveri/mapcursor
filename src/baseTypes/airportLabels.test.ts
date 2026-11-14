import { describe, expect, it } from 'vitest'
import {
    featureFilter,
    validateStyleMin,
} from '@maplibre/maplibre-gl-style-spec'
import { AIRPORT_LABEL_LAYER_ID, airportLabelLayer } from './airportLabels'

/** A style with the given layers, each `[id, source, sourceLayer]`. */
const styleWith = (layers: [string, string, string][]) => ({
    getLayersOrder: (): string[] => layers.map(([id]) => id),
    getLayer: (id: string) => {
        const hit = layers.find(([lid]) => lid === id)
        return hit ? { source: hit[1], sourceLayer: hit[2] } : undefined
    },
})

// O'Hare, as it comes in CARTO's Protomaps tiles (decoded from z10–z14).
const OHARE = {
    type: 1,
    properties: {
        kind: 'aerodrome',
        kind_detail: 'international',
        iata: 'ORD',
        min_zoom: 11,
        name: "O'Hare International Airport",
        'name:en': "O'Hare International Airport",
    },
}

describe('airportLabelLayer', () => {
    it('reads the Protomaps pois layer from whichever source draws it', () => {
        const layer = airportLabelLayer(
            styleWith([
                ['water', 'protomaps', 'water'],
                ['poi_park', 'protomaps', 'pois'],
            ])
        )
        expect(layer).toMatchObject({
            id: AIRPORT_LABEL_LAYER_ID,
            source: 'protomaps',
            'source-layer': 'pois',
        })
    })

    it('falls back to the OpenMapTiles aerodrome layer', () => {
        const layer = airportLabelLayer(
            styleWith([['road', 'carto', 'transportation']])
        )
        expect(layer).toMatchObject({
            source: 'carto',
            'source-layer': 'aerodrome_label',
        })
    })

    it('is null before the style has loaded', () => {
        expect(
            airportLabelLayer({
                getLayersOrder: () => {
                    throw new Error('Style is not done loading')
                },
                getLayer: () => undefined,
            })
        ).toBeNull()
    })

    // The real test of the layer: MapLibre's own validator accepts it, and its
    // own filter evaluator shows O'Hare from its min_zoom and not before.
    it('is a valid layer that shows O’Hare from zoom 11', () => {
        const layer = airportLabelLayer(
            styleWith([['poi_park', 'protomaps', 'pois']])
        )
        const errors = validateStyleMin({
            version: 8,
            sources: { protomaps: { type: 'vector', tiles: ['x/{z}'] } },
            glyphs: 'x/{fontstack}/{range}.pbf',
            layers: [layer],
        } as never)
        expect(errors).toEqual([])

        const filter = featureFilter(layer?.filter as never, 'layers[0].filter')
        const at = (zoom: number): boolean =>
            filter.filter({ zoom } as never, OHARE as never)
        expect(at(10)).toBe(false)
        expect(at(11)).toBe(true)
        expect(at(16)).toBe(true)
    })

    it('leaves other points of interest alone', () => {
        const layer = airportLabelLayer(
            styleWith([['poi_park', 'protomaps', 'pois']])
        )
        const filter = featureFilter(layer?.filter as never, 'layers[0].filter')
        const cargo = {
            type: 1,
            properties: { kind: 'commercial', name: "O'Hare South Cargo" },
        }
        expect(filter.filter({ zoom: 14 } as never, cargo as never)).toBe(false)
    })
})
