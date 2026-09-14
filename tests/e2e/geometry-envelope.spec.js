// The geometry envelope's own arithmetic.
//
// Every element record carries `metadata: { geometry, properties }`, and the
// two rules that make it work are asserted here rather than through the UI:
//
//   1. `geometry` is the single source of truth for position; `x`/`y` are a
//      cache every writer derives from it, so the two cannot come apart. This
//      is the invariant that replaced the old "move the origin, leave the
//      vertices, watch the shape snap back on reload" bug class.
//   2. A polygon's ring is STORED closed (RFC 7946) but RENDERED open, because
//      `factory/area.ts` builds its path with `closed = true` and closes the
//      shape itself.
//
// These are pure functions, so they are asserted in NODE — imported at the top
// of the spec, never through `page.evaluate`. Serving raw TypeScript is a Vite
// dev-server behaviour; against the production bundle CI runs on, an
// `import('/src/**.ts')` inside the page 404s.

import { test, expect } from './helpers/test.js'
import {
    geometryCenter,
    geometryFields,
    geometryOrigin,
    geometryPositions,
    lineGeometry,
    pointGeometry,
    polygonGeometry,
    readGeometry,
    readProperties,
    replaceProperties,
    scaleGeometry,
    setGeometry,
    setProperties,
    translateGeometry,
} from '../../src/utils/geometry.ts'

const SQUARE = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 260 },
    { x: 100, y: 260 },
]

const LINE = [
    { x: 10, y: 20 },
    { x: 60, y: 90 },
    { x: 110, y: 20 },
]

test.describe('geometry envelope', () => {
    test('derives x/y from the geometry rather than taking them on trust', () => {
        expect(geometryFields(pointGeometry(820, -410))).toMatchObject({
            x: 820,
            y: -410,
        })
        // For a multi-point geometry the origin is the FIRST coordinate — the
        // point the factory rebuilds the path relative to.
        expect(geometryFields(lineGeometry(LINE))).toMatchObject({
            x: 10,
            y: 20,
        })
        expect(geometryFields(polygonGeometry(SQUARE))).toMatchObject({
            x: 100,
            y: 100,
        })
    })

    test('stores a polygon ring closed but renders it open', () => {
        const geometry = polygonGeometry(SQUARE)
        const ring = geometry.coordinates[0]
        // Closed on the way in, per RFC 7946 — 4 corners become 5 positions.
        expect(ring).toHaveLength(5)
        expect(ring[0]).toEqual(ring[4])
        // Open on the way out: a duplicate final vertex on a `closed = true`
        // Two.Path draws a zero-length segment and stacks a grab handle on top
        // of the first one.
        expect(geometryPositions(geometry)).toHaveLength(4)

        // And closing is idempotent — passing an already-closed ring back in
        // must not grow it, or every round-trip would add a position.
        const reclosed = polygonGeometry(ring)
        expect(reclosed.coordinates[0]).toHaveLength(5)
    })

    test('a translate moves the coordinates and the x/y cache together', () => {
        const record = geometryFields(lineGeometry(LINE))
        const moved = translateGeometry(record, 120, 90)

        expect(moved.x).toBe(record.x + 120)
        expect(moved.y).toBe(record.y + 90)
        // The cache still equals the geometry's own origin. Persisting the new
        // origin ALONE used to be worse than persisting nothing: the factory
        // rebuilt the path against an origin its coordinates disagreed with and
        // the shape landed back where the drag started.
        expect(geometryOrigin(moved)).toEqual({ x: moved.x, y: moved.y })

        const before = geometryPositions(readGeometry(record))
        const after = geometryPositions(readGeometry(moved))
        after.forEach(([x, y], i) => {
            expect(x).toBe(before[i][0] + 120)
            expect(y).toBe(before[i][1] + 90)
        })
    })

    test('a translate keeps a polygon ring closed', () => {
        const record = geometryFields(polygonGeometry(SQUARE))
        const ring = readGeometry(translateGeometry(record, 5, 5))
            .coordinates[0]
        expect(ring).toHaveLength(5)
        expect(ring[0]).toEqual(ring[4])
    })

    test('a translate leaves per-point widths alone and length-matched', () => {
        // Pencil keeps its pressure widths in `properties.widths`, parallel to
        // the coordinates. Every geometry operation is length-preserving, which
        // is exactly what stops the two arrays from desyncing.
        const widths = [1, 4, 2]
        const record = geometryFields(lineGeometry(LINE), { widths })
        const moved = translateGeometry(record, -30, 15)

        expect(readProperties(moved).widths).toEqual(widths)
        expect(readProperties(moved).widths).toHaveLength(
            geometryPositions(readGeometry(moved)).length
        )
    })

    test('round-tripping a geometry through setGeometry is stable', () => {
        const record = geometryFields(polygonGeometry(SQUARE), { resist: 0.85 })
        const again = setGeometry(record, readGeometry(record))

        expect(again.x).toBe(record.x)
        expect(again.y).toBe(record.y)
        expect(again.metadata).toEqual(record.metadata)
    })

    test('centre is the bounding box, not the origin', () => {
        // Paste lands the clone's MIDDLE under the cursor. The origin will not
        // do: for a route it is wherever the first click happened to fall, so
        // pasting by it drops the shape a corner's-worth from the pointer.
        const record = geometryFields(lineGeometry(LINE))
        expect(geometryCenter(record)).toEqual({ x: 60, y: 55 })
        expect(geometryOrigin(record)).toEqual({ x: 10, y: 20 })
    })

    test('setProperties merges, replaceProperties does not', () => {
        const record = geometryFields(pointGeometry(0, 0), {
            label: 'The Old Peacock',
            textFontSize: 18,
        })

        const merged = setProperties(record, { textFontSize: 32 })
        expect(readProperties(merged)).toEqual({
            label: 'The Old Peacock',
            textFontSize: 32,
        })

        // Undo needs the other one: a revert is as often the removal of a key
        // as a change to one, so merging the reverted bag over the current one
        // would leave a newly-added key standing.
        const replaced = replaceProperties(record, { label: 'The Old Peacock' })
        expect(readProperties(replaced)).toEqual({
            label: 'The Old Peacock',
        })
    })

    test('both property writers keep the geometry untouched', () => {
        const record = geometryFields(polygonGeometry(SQUARE))
        expect(readGeometry(setProperties(record, { a: 1 }))).toEqual(
            readGeometry(record)
        )
        expect(readGeometry(replaceProperties(record, { a: 1 }))).toEqual(
            readGeometry(record)
        )
    })

    test('properties are copied, never aliased', () => {
        // `setGeometry` feeds the SOURCE record's bag through, so sharing the
        // reference would tie a pasted clone to the original it came from.
        const record = geometryFields(pointGeometry(0, 0), { label: 'a' })
        const clone = translateGeometry(record, 10, 10)
        clone.metadata.properties.label = 'b'
        expect(readProperties(record).label).toBe('a')
    })

    test('a scale moves the origin with the shape', () => {
        const record = geometryFields(lineGeometry(LINE))
        const scaled = scaleGeometry(record, 2, { x: 0, y: 0 })
        expect(geometryOrigin(scaled)).toEqual({ x: scaled.x, y: scaled.y })
        expect(geometryPositions(readGeometry(scaled))[1]).toEqual([120, 180])
    })

    test('a malformed record yields null rather than a guessed position', () => {
        // There is no legacy shape to fall through to, so callers skip such a
        // record instead of inventing coordinates for it.
        for (const bad of [
            null,
            {},
            { metadata: null },
            { metadata: {} },
            { metadata: { geometry: { type: 'Point' } } },
            { metadata: { geometry: { type: 'Circle', coordinates: [0, 0] } } },
            { metadata: [{ x: 1, y: 2 }] },
        ]) {
            expect(readGeometry(bad)).toBeNull()
            expect(geometryOrigin(bad)).toBeNull()
            expect(translateGeometry(bad, 1, 1)).toBeNull()
            expect(setProperties(bad, { a: 1 })).toEqual({})
        }
    })

    test('an unrounded translate keeps its fractional part', () => {
        // The group overlay remaps members unrounded: pencil's Chaikin
        // smoothing reads the fractional part, and rounding squares the stroke
        // off visibly.
        const record = geometryFields(lineGeometry([{ x: 0, y: 0 }]))
        expect(
            geometryPositions(
                readGeometry(translateGeometry(record, 0.5, 0.25))
            )[0]
        ).toEqual([1, 0])
        expect(
            geometryPositions(
                readGeometry(
                    translateGeometry(record, 0.5, 0.25, { round: false })
                )
            )[0]
        ).toEqual([0.5, 0.25])
    })
})
