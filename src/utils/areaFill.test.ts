import { describe, expect, it } from 'vitest'
import {
    areaFillFor,
    areaFillPatternId,
    areaFillPatternTransform,
    areaFillTilePath,
    areaHatchStep,
    areaOpacityOf,
    AREA_DEFAULT_OPACITY,
    areaFillTypeToDb,
    normalizeAreaFillType,
} from './areaFill'
import { strokeToAreaFill } from './misc'
import { polygonGeometry } from './geometry'

/** A square area `side` surface units across, as a record. */
const square = (side: number) => ({
    metadata: {
        geometry: polygonGeometry([
            { x: 0, y: 0 },
            { x: side, y: 0 },
            { x: side, y: side },
            { x: 0, y: side },
        ]),
        properties: {},
    },
})

describe('normalizeAreaFillType', () => {
    it('reads null, absent and unknown values as solid', () => {
        expect(normalizeAreaFillType(null)).toBe('solid')
        expect(normalizeAreaFillType(undefined)).toBe('solid')
        expect(normalizeAreaFillType('zigzag')).toBe('solid')
    })

    it('keeps the hatched kinds', () => {
        expect(normalizeAreaFillType('hachure')).toBe('hachure')
        expect(normalizeAreaFillType('cross-hatch')).toBe('cross-hatch')
    })
})

describe('areaFillTypeToDb', () => {
    it('stores solid as null, like strokeType', () => {
        expect(areaFillTypeToDb('solid')).toBeNull()
        expect(areaFillTypeToDb('hachure')).toBe('hachure')
    })
})

describe('areaFillPatternId', () => {
    it('is id-safe and shared per kind, colour, step and opacity', () => {
        expect(areaFillPatternId('hachure', '#A32D2D', 4, 0.5)).toBe(
            'mc-area-fill-hachure-a32d2d-s4-a50'
        )
        expect(areaFillPatternId('cross-hatch', 'rgb(1, 2, 3)', -2, 1)).toBe(
            'mc-area-fill-cross-hatch-rgb-1-2-3-s-2-a100'
        )
    })
})

describe('areaOpacityOf', () => {
    it('reads the column, then the legacy property', () => {
        expect(areaOpacityOf({ opacity: 0.8 })).toBe(0.8)
        expect(
            areaOpacityOf({ metadata: { properties: { opacity: 0.3 } } })
        ).toBe(0.3)
    })

    // Unchanged look for every area drawn before opacity meant the fill.
    it('defaults to the half-strength wash', () => {
        expect(areaOpacityOf({})).toBe(AREA_DEFAULT_OPACITY)
        expect(areaOpacityOf({ opacity: null })).toBe(AREA_DEFAULT_OPACITY)
        expect(AREA_DEFAULT_OPACITY).toBe(0.5)
    })

    it('clamps to 0–1 in whole percents', () => {
        expect(areaOpacityOf({ opacity: 1.4 })).toBe(1)
        expect(areaOpacityOf({ opacity: -1 })).toBe(0)
        expect(areaOpacityOf({ opacity: 0.4567 })).toBe(0.46)
    })
})

describe('areaHatchStep', () => {
    // ~20 lines across: a 640-unit square wants a 32-unit gap, i.e. 2^5.
    it('sizes the gap from the area itself', () => {
        expect(areaHatchStep(square(640))).toBe(5)
    })

    it('scales with the area, one step per doubling of its side', () => {
        expect(areaHatchStep(square(1280))).toBe(6)
        expect(areaHatchStep(square(320))).toBe(4)
    })

    it('goes below one surface unit for a tiny area', () => {
        expect(areaHatchStep(square(5))).toBeLessThan(0)
    })

    // Rounded to a power of two, so nudging a vertex does not re-space it.
    it('ignores a small reshape', () => {
        expect(areaHatchStep(square(660))).toBe(areaHatchStep(square(640)))
    })

    it('falls back to a gap of 8 with no usable geometry', () => {
        expect(areaHatchStep(null)).toBe(3)
        expect(areaHatchStep({ metadata: null })).toBe(3)
    })
})

describe('areaFillPatternTransform', () => {
    // Fixed per pattern: there is no camera in it, so the hatch scales with
    // the map like the area does.
    it("scales the 8-unit tile to the step's gap", () => {
        expect(areaFillPatternTransform(3)).toBe('scale(1) rotate(45)')
        expect(areaFillPatternTransform(5)).toBe('scale(4) rotate(45)')
        expect(areaFillPatternTransform(-1)).toBe('scale(0.0625) rotate(45)')
    })
})

describe('areaFillTilePath', () => {
    it('draws one line for hachure and two for cross-hatch', () => {
        expect(areaFillTilePath('hachure').match(/M/g)).toHaveLength(1)
        expect(areaFillTilePath('cross-hatch').match(/M/g)).toHaveLength(2)
    })
})

describe('areaFillFor', () => {
    it('paints solid as the stroke at the area\'s opacity', () => {
        expect(
            areaFillFor(null, '#ff0000', null, { ...square(100), opacity: 0.3 })
        ).toBe('rgba(255,0,0,0.3)')
    })

    // At 100% the interior must hide what is under it.
    it('is fully opaque at 100%', () => {
        expect(
            areaFillFor(null, '#ff0000', null, { ...square(100), opacity: 1 })
        ).toBe('rgba(255,0,0,1)')
    })

    it('keeps the old half-strength wash for an area with no opacity', () => {
        expect(areaFillFor(null, '#ff0000', null, square(100))).toBe(
            strokeToAreaFill('#ff0000')
        )
    })

    it('degrades a hatch to the wash when there is no renderer', () => {
        expect(
            areaFillFor(null, '#ff0000', 'hachure', {
                ...square(100),
                opacity: 0.7,
            })
        ).toBe('rgba(255,0,0,0.7)')
    })
})
