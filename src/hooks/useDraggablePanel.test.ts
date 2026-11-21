import { describe, expect, it } from 'vitest'
import { clampPanelPosition } from './useDraggablePanel'

describe('clampPanelPosition', () => {
    it('leaves a position that fits alone', () => {
        expect(
            clampPanelPosition({ x: 100, y: 50 }, 260, 200, 1200, 800)
        ).toEqual({ x: 100, y: 50 })
    })

    it('keeps the whole panel on screen at every edge', () => {
        expect(
            clampPanelPosition({ x: -40, y: -10 }, 260, 200, 1200, 800)
        ).toEqual({ x: 0, y: 0 })
        expect(
            clampPanelPosition({ x: 1100, y: 750 }, 260, 200, 1200, 800)
        ).toEqual({ x: 940, y: 600 })
    })

    it('pins a panel larger than the viewport to the top-left', () => {
        expect(
            clampPanelPosition({ x: 300, y: 300 }, 260, 900, 1200, 800)
        ).toEqual({ x: 300, y: 0 })
        expect(
            clampPanelPosition({ x: 300, y: 300 }, 1400, 200, 1200, 800)
        ).toEqual({ x: 0, y: 300 })
    })

    it('rounds to whole pixels', () => {
        expect(
            clampPanelPosition({ x: 10.6, y: 20.2 }, 260, 200, 1200, 800)
        ).toEqual({ x: 11, y: 20 })
    })
})
