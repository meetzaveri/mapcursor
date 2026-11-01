import { describe, it, expect } from 'vitest'
import {
    buildImageRecord,
    imageLocalSize,
    imageScreenPxPerLocalUnit,
    imageSurfaceSize,
    IMAGE_PLACE_MAX_SCREEN_PX,
    IMAGE_PLACE_MIN_SCREEN_PX,
} from './imageRecord'
import { imageComponentSource } from './assetUses'
import { readGeometry } from './geometry'
import { computeCounterScale, resolveResist } from './counterScale'
import { IMAGE_RESIST } from '../constants/misc'
import type { ImageAssetRef } from '../types/asset'

const ref: ImageAssetRef = {
    assetId: 'hash-1',
    url: null,
    mimeType: 'image/webp',
    naturalWidth: 4000,
    naturalHeight: 3000,
}

describe('imageLocalSize', () => {
    // The point of the sizing: an image lands at the same on-screen size
    // whatever the zoom it is placed at. On screen = local × camera ×
    // counter-scale.
    it.each([0.06, 0.5, 1, 4, 64])(
        'places the long edge at the screen cap at zoom %s',
        (zuiScale) => {
            const local = imageLocalSize(4000, 3000, zuiScale)
            const pxPerUnit = imageScreenPxPerLocalUnit(zuiScale)
            const onScreen = local.width * pxPerUnit
            expect(onScreen).toBeCloseTo(IMAGE_PLACE_MAX_SCREEN_PX, 6)
            expect(local.width / local.height).toBeCloseTo(4 / 3, 1)
        }
    )

    it('never upscales a small image past its natural size on screen', () => {
        expect(imageLocalSize(100, 50, 1)).toEqual({ width: 100, height: 50 })
        // Zoomed out, the same bitmap still shows at 100x50 screen px.
        expect(imageLocalSize(100, 50, 0.5)).toEqual({ width: 200, height: 100 })
    })

    it('holds the minimum edge in screen px, not local units', () => {
        expect(imageLocalSize(4, 4, 64)).toEqual({
            width: IMAGE_PLACE_MIN_SCREEN_PX / 64,
            height: IMAGE_PLACE_MIN_SCREEN_PX / 64,
        })
    })
})

describe('imageScreenPxPerLocalUnit', () => {
    it('is just the camera, since an image does not resist zoom', () => {
        const s = 4
        expect(imageScreenPxPerLocalUnit(s)).toBeCloseTo(
            s * computeCounterScale(s, IMAGE_RESIST)
        )
        expect(imageScreenPxPerLocalUnit(s)).toBeCloseTo(s)
    })

    it('treats a missing camera as 1', () => {
        expect(imageScreenPxPerLocalUnit(0)).toBe(1)
        expect(imageScreenPxPerLocalUnit(Number.NaN)).toBe(1)
    })
})

describe('imageSurfaceSize', () => {
    it('is the local size times the counter-scale (1 for an image)', () => {
        const k = computeCounterScale(2, IMAGE_RESIST)
        expect(imageSurfaceSize({ width: 100, height: 50 }, 2)).toEqual({
            width: 100 * k,
            height: 50 * k,
        })
    })
})

describe('buildImageRecord', () => {
    const record = buildImageRecord({
        id: 'img-1',
        baseId: 'base-1',
        x: 10.7,
        y: -5.2,
        image: ref,
        width: 240,
        height: 180,
        updatedBy: 'u',
    })

    it('stores the position as a Point geometry, truncated', () => {
        expect(readGeometry(record)).toEqual({
            type: 'Point',
            coordinates: [10, -5],
        })
        expect(record.x).toBe(10)
        expect(record.y).toBe(-5)
    })

    it('is an image the asset scan finds, so cleanup keeps its bytes', () => {
        const uses = imageComponentSource({ [record.id]: record }).collect()
        expect(uses?.map((u) => u.assetId)).toEqual(['hash-1'])
    })

    it('is not zoom-resistant by default, so it scales with the map', () => {
        expect(resolveResist(record)).toBe(IMAGE_RESIST)
        expect(IMAGE_RESIST).toBe(0)
    })
})
