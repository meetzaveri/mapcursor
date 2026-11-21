import { describe, it, expect } from 'vitest'
import { rescaleTextSizeForResist } from './textResistToggle'
import { computeCounterScale } from './counterScale'
import { TEXT_RESIST } from '../constants/misc'

const onScreen = (size: number, camera: number, resist: number): number =>
    size * camera * computeCounterScale(camera, resist)

describe('rescaleTextSizeForResist', () => {
    it.each([0.004, 0.06, 0.5, 1, 4, 64])(
        'turning resistance OFF keeps the on-screen size at camera %s',
        (camera) => {
            const size = rescaleTextSizeForResist(18, camera, TEXT_RESIST, 0)
            expect(onScreen(size, camera, 0)).toBeCloseTo(
                onScreen(18, camera, TEXT_RESIST),
                1
            )
        }
    )

    it.each([0.004, 0.5, 4])(
        'turning resistance back ON keeps the on-screen size at camera %s',
        (camera) => {
            const size = rescaleTextSizeForResist(500, camera, 0, TEXT_RESIST)
            expect(onScreen(size, camera, TEXT_RESIST)).toBeCloseTo(
                onScreen(500, camera, 0),
                1
            )
        }
    )

    it('is a no-op at camera 1, where every counter-scale is 1', () => {
        expect(rescaleTextSizeForResist(18, 1, TEXT_RESIST, 0)).toBe(18)
    })

    it('grows the stored size when turned off zoomed out (the z8 bug)', () => {
        const size = rescaleTextSizeForResist(18, 0.004, TEXT_RESIST, 0)
        expect(size * 0.004).toBeGreaterThan(8)
    })

    it('leaves a size it cannot rescale untouched', () => {
        expect(rescaleTextSizeForResist(0, 0.5, TEXT_RESIST, 0)).toBe(0)
        expect(rescaleTextSizeForResist(18, 0, TEXT_RESIST, 0)).toBe(18)
    })
})
