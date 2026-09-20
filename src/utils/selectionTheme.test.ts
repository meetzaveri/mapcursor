import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    selectionHandleRadiusPx,
    selectionHandleHitRadiusPx,
} from './selectionTheme'

const setPointer = (coarse: boolean): void => {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('coarse') ? coarse : !coarse,
        media: query,
    }))
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('selection handle sizing', () => {
    // The invariant the split exists to hold: a handle may be drawn smaller
    // than it is grabbed, but never the other way round, or there would be
    // visible dot with dead edges.
    it('never draws a dot larger than its grab target', () => {
        for (const coarse of [true, false]) {
            setPointer(coarse)
            expect(selectionHandleRadiusPx()).toBeLessThanOrEqual(
                selectionHandleHitRadiusPx()
            )
        }
    })

    it('shrinks the drawn dot on touch without shrinking the target', () => {
        setPointer(true)

        // The target is the value the dot itself used to be drawn at, so
        // nothing became harder to grab when the dot got smaller.
        expect(selectionHandleHitRadiusPx()).toBe(11)
        expect(selectionHandleRadiusPx()).toBeLessThan(11)
    })

    it('leaves the mouse with one number for both', () => {
        setPointer(false)

        expect(selectionHandleRadiusPx()).toBe(5)
        expect(selectionHandleHitRadiusPx()).toBe(5)
    })

    // matchMedia is missing in some embedded webviews and in SSR.
    it('falls back to the mouse sizes when matchMedia is absent', () => {
        vi.stubGlobal('matchMedia', undefined)

        expect(selectionHandleRadiusPx()).toBe(5)
        expect(selectionHandleHitRadiusPx()).toBe(5)
    })
})
