import { describe, it, expect } from 'vitest'
import { moveGeometryTo, setProperties, readGeometry } from './geometry'

// The placeholder the canvas parks an element at when it is created before the
// click that positions it — the toolbar's Text and Point tools both do this.
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
    // Guards the trap that lost placed text: setProperties REBUILDS geometry
    // from its source, so the source has to be the copy that knows where the
    // element actually ended up — not a snapshot taken before it was placed.
    it('keeps the placement when committing from the placed record', () => {
        const atCreation = recordAt(PLACEHOLDER.x, PLACEHOLDER.y)

        const placement = moveGeometryTo(atCreation, 400, 250)
        expect(placement).not.toBeNull()

        // What the store (and group.elementData) holds after the click.
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

    // The failure mode itself, pinned so it stays visible: a stale source
    // silently reverts the placement while the edit appears to succeed.
    it('reverts the placement when committing from a pre-placement snapshot', () => {
        const frozenAtMount = recordAt(PLACEHOLDER.x, PLACEHOLDER.y)

        const commit = setProperties(frozenAtMount, { content: 'Hello' })

        // The text is committed, so nothing looks wrong — but it is now
        // anchored back at the placeholder and will load ~10k units away.
        expect(commit.metadata?.properties).toMatchObject({ content: 'Hello' })
        expect(readGeometry(commit)).toEqual({
            type: 'Point',
            coordinates: [PLACEHOLDER.x, PLACEHOLDER.y],
        })
    })
})
