import { describe, it, expect } from 'vitest'
import { applyStrokeDashes, strokeDashPatternPx } from './strokeDashes'

/** What is SEEN for a round-capped [dash, gap]: caps add one width. */
const seenRound = ([dash, gap]: number[], w: number): [number, number] => [
    (dash ?? 0) + w,
    (gap ?? 0) - w,
]

describe('strokeDashPatternPx', () => {
    it('is solid for solid, null and unknown types', () => {
        expect(strokeDashPatternPx('solid', 2, true)).toEqual([])
        expect(strokeDashPatternPx(null, 2, true)).toEqual([])
        expect(strokeDashPatternPx('wavy', 2, true)).toEqual([])
    })

    it.each([1, 2, 4, 6, 8, 30])(
        'a round-capped dashed stroke %spx wide keeps visible gaps',
        (w) => {
            const [dash, gap] = seenRound(strokeDashPatternPx('dashed', w, true), w)
            // The bug: [8] with round caps closed up completely at w = 8.
            expect(gap).toBeGreaterThanOrEqual(6)
            expect(dash).toBeGreaterThan(gap * 0.9)
        }
    )

    it('round-capped dots are zero-length dashes, spaced by a gap', () => {
        const [dash, gap] = strokeDashPatternPx('dotted', 4, true)
        expect(dash).toBe(0)
        expect(seenRound([dash ?? 0, gap ?? 0], 4)[1]).toBeGreaterThanOrEqual(4)
    })

    it('butt caps use the visible lengths as-is', () => {
        expect(strokeDashPatternPx('dashed', 2, false)).toEqual([8, 6])
    })
})

describe('applyStrokeDashes', () => {
    it.each([1, 0.027, 0.004, 16])(
        'holds the on-screen pattern at camera %s',
        (camera) => {
            // A counter-scaled 2px stroke: its surface width is 2 / camera.
            const path = { linewidth: 2 / camera, cap: 'round', dashes: [] as number[] }
            applyStrokeDashes(path, 'dashed', camera)
            const onScreen = path.dashes.map((d) => d * camera)
            const expected = strokeDashPatternPx('dashed', 2, true)
            onScreen.forEach((px, i) => expect(px).toBeCloseTo(expected[i] ?? 0, 6))
        }
    )

    it('clears the pattern for solid', () => {
        const path = { linewidth: 2, cap: 'round', dashes: [8] }
        applyStrokeDashes(path, 'solid', 1)
        expect(path.dashes).toEqual([])
    })
})
