import { describe, it, expect } from 'vitest'
import { clampTextSizeOnScreen } from './textResize'

describe('clampTextSizeOnScreen', () => {
    it('passes a size through when it renders inside the bounds', () => {
        expect(clampTextSizeOnScreen(36, 1)).toBe(36)
    })

    it('lets text grow past 300 units when zoomed out', () => {
        // Scale 1/8: 2000 units would render at 250px — allowed.
        expect(clampTextSizeOnScreen(2000, 1 / 8)).toBe(2000)
        // But not past 300 screen px.
        expect(clampTextSizeOnScreen(4000, 1 / 8)).toBe(2400)
    })

    it('lets text shrink below 8 units when zoomed in', () => {
        // Scale 8: 2 units renders at 16px — allowed.
        expect(clampTextSizeOnScreen(2, 8)).toBe(2)
        // Floored at 8 screen px.
        expect(clampTextSizeOnScreen(0.5, 8)).toBe(1)
    })
})
