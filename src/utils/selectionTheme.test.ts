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

        expect(selectionHandleHitRadiusPx()).toBe(11)
        expect(selectionHandleRadiusPx()).toBeLessThan(11)
    })

    it('leaves the mouse with one number for both', () => {
        setPointer(false)

        expect(selectionHandleRadiusPx()).toBe(5)
        expect(selectionHandleHitRadiusPx()).toBe(5)
    })

    it('falls back to the mouse sizes when matchMedia is absent', () => {
        vi.stubGlobal('matchMedia', undefined)

        expect(selectionHandleRadiusPx()).toBe(5)
        expect(selectionHandleHitRadiusPx()).toBe(5)
    })
})
