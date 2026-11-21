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
        expect(ring).toHaveLength(5)
        expect(ring[0]).toEqual(ring[4])
        expect(geometryPositions(geometry)).toHaveLength(4)

        const reclosed = polygonGeometry(ring)
        expect(reclosed.coordinates[0]).toHaveLength(5)
    })

    test('a translate moves the coordinates and the x/y cache together', () => {
        const record = geometryFields(lineGeometry(LINE))
        const moved = translateGeometry(record, 120, 90)

        expect(moved.x).toBe(record.x + 120)
        expect(moved.y).toBe(record.y + 90)
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
