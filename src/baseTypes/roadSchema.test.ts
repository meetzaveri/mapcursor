import { describe, expect, it } from 'vitest'
import { findRoadSource } from './roadSchema'

type Layer = { source?: string; sourceLayer?: string }

function fakeMap(layers: Record<string, Layer>, sources: string[]) {
    return {
        getLayersOrder: (): string[] => Object.keys(layers),
        getLayer: (id: string): Layer | undefined => layers[id],
        getSource: (id: string): unknown =>
            sources.includes(id) ? {} : undefined,
    }
}

describe('findRoadSource', () => {
    it('finds the Protomaps road layer in the current CARTO style', () => {
        const map = fakeMap(
            {
                water: { source: 'protomaps', sourceLayer: 'water' },
                roads_minor: { source: 'protomaps', sourceLayer: 'roads' },
            },
            ['protomaps']
        )
        const match = findRoadSource(map)
        expect(match?.sourceId).toBe('protomaps')
        expect(match?.schema.sourceLayer).toBe('roads')
    })

    it('still finds the OpenMapTiles layer in the older cached style', () => {
        const map = fakeMap(
            { road_minor: { source: 'carto', sourceLayer: 'transportation' } },
            ['carto']
        )
        const match = findRoadSource(map)
        expect(match?.sourceId).toBe('carto')
        expect(match?.schema.sourceLayer).toBe('transportation')
    })

    it('returns null when the style has no known road layer', () => {
        const map = fakeMap({ water: { source: 'x', sourceLayer: 'water' } }, [
            'x',
        ])
        expect(findRoadSource(map)).toBeNull()
    })

    it('excludes rail, ferry and aeroway but keeps paths in Protomaps tiles', () => {
        const map = fakeMap(
            { roads: { source: 'protomaps', sourceLayer: 'roads' } },
            ['protomaps']
        )
        const { schema } = findRoadSource(map)!
        expect(schema.isExcluded({ kind: 'rail', kind_detail: 'rail' })).toBe(
            true
        )
        expect(schema.isExcluded({ kind: 'ferry' })).toBe(true)
        expect(
            schema.isExcluded({ kind: 'aeroway', kind_detail: 'runway' })
        ).toBe(true)
        expect(
            schema.isExcluded({ kind: 'path', kind_detail: 'footway' })
        ).toBe(false)
        expect(
            schema.isExcluded({
                kind: 'minor_road',
                kind_detail: 'residential',
            })
        ).toBe(false)
        expect(
            schema.roadClass({ kind: 'major_road', kind_detail: 'primary' })
        ).toBe('primary')
    })

    it('excludes rail and ferry but keeps tracks in OpenMapTiles tiles', () => {
        const map = fakeMap(
            { t: { source: 'carto', sourceLayer: 'transportation' } },
            ['carto']
        )
        const { schema } = findRoadSource(map)!
        expect(schema.isExcluded({ class: 'rail' })).toBe(true)
        expect(schema.isExcluded({ class: 'ferry' })).toBe(true)
        expect(schema.isExcluded({ class: 'track' })).toBe(false)
    })
})
