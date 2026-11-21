import { describe, it, expect } from 'vitest'
import { moveGeometryTo, setProperties, readGeometry } from './geometry'

const PLACEHOLDER = { x: -9999, y: -9999 }

const recordAt = (x: number, y: number) => ({
    id: 'text-1',
    x,
    y,
    metadata: {
        geometry: { type: 'Point' as const, coordinates: [x, y] },
        properties: { content: '' },
    },
})

describe('committing an edit after a deferred placement', () => {
    it('keeps the placement when committing from the placed record', () => {
        const atCreation = recordAt(PLACEHOLDER.x, PLACEHOLDER.y)

        const placement = moveGeometryTo(atCreation, 400, 250)
        expect(placement).not.toBeNull()

        const placed = { ...atCreation, ...placement }
        expect(readGeometry(placed)).toEqual({
            type: 'Point',
            coordinates: [400, 250],
        })

        const commit = setProperties(placed, { content: 'Hello' })

        expect(readGeometry(commit)).toEqual({
            type: 'Point',
            coordinates: [400, 250],
        })
        expect(commit.metadata?.properties).toMatchObject({ content: 'Hello' })
    })

    it('reverts the placement when committing from a pre-placement snapshot', () => {
        const frozenAtMount = recordAt(PLACEHOLDER.x, PLACEHOLDER.y)

        const commit = setProperties(frozenAtMount, { content: 'Hello' })

        expect(commit.metadata?.properties).toMatchObject({ content: 'Hello' })
        expect(readGeometry(commit)).toEqual({
            type: 'Point',
            coordinates: [PLACEHOLDER.x, PLACEHOLDER.y],
        })
    })
})
