// Building an image element's record, and sizing it. Pure, so it is unit
// tested (imageRecord.test.ts) away from the drop pipeline.

import { IMAGE_COMPONENT, IMAGE_RESIST } from '../constants/misc'
import { computeCounterScale } from './counterScale'
import { geometryFields, pointGeometry } from './geometry'
import type { ImageAssetRef } from '../types/asset'
import type { ComponentRecord } from '../types/base'

// Long edge of a freshly placed image, in SCREEN px. Ported from craftbase's
// IMAGE_DROP_MAX_SCREEN_PX.
export const IMAGE_PLACE_MAX_SCREEN_PX = 480

/**
 * How many screen px one LOCAL unit of an image covers at camera `zuiScale`.
 *
 * A local unit is scaled twice: by the camera, then by the group's own
 * counter-scale at IMAGE_RESIST (utils/counterScale.ts). The product is
 * `zuiScale ^ (1 - resist)` — with IMAGE_RESIST = 0, just the camera.
 */
export function imageScreenPxPerLocalUnit(zuiScale: number): number {
    const scale = Number.isFinite(zuiScale) && zuiScale > 0 ? zuiScale : 1
    return scale * computeCounterScale(scale, IMAGE_RESIST)
}

// Shortest edge of a freshly placed image, in SCREEN px, so a 1px bitmap is
// still something to grab.
export const IMAGE_PLACE_MIN_SCREEN_PX = 20

/**
 * Local width/height for a newly placed image, so that on screen, at the
 * camera it is placed under, it shows at its natural pixel size, shrunk to fit
 * IMAGE_PLACE_MAX_SCREEN_PX on its long edge and never under
 * IMAGE_PLACE_MIN_SCREEN_PX.
 *
 * Every clamp is in SCREEN px and converted once at the end. The image scales
 * with the map (IMAGE_RESIST = 0), so a local unit is a surface unit, not a
 * screen px — clamping or rounding in local units would make a placement at
 * zoom 64 land a 20-unit minimum as 1280px on screen. Not rounded, for the
 * same reason: the columns are float8.
 */
export function imageLocalSize(
    naturalWidth: number,
    naturalHeight: number,
    zuiScale: number
): { width: number; height: number } {
    const pxPerUnit = imageScreenPxPerLocalUnit(zuiScale)
    const longEdge = Math.max(naturalWidth, naturalHeight, 1)
    const fit = Math.min(1, IMAGE_PLACE_MAX_SCREEN_PX / longEdge)
    const toLocal = (natural: number): number =>
        Math.max(IMAGE_PLACE_MIN_SCREEN_PX, natural * fit) / pxPerUnit
    return { width: toLocal(naturalWidth), height: toLocal(naturalHeight) }
}

/** Surface size of a local size at `zuiScale`, for the loading placeholder. */
export function imageSurfaceSize(
    local: { width: number; height: number },
    zuiScale: number
): { width: number; height: number } {
    const k = computeCounterScale(zuiScale, IMAGE_RESIST)
    return { width: local.width * k, height: local.height * k }
}

export interface ImageRecordInput {
    id: string
    baseId: string
    /** Centre, in surface units. */
    x: number
    y: number
    image: ImageAssetRef
    width: number
    height: number
    updatedBy: string | null
}

/**
 * A new image element. Position goes through geometry.ts (a Point at the
 * centre); the asset reference rides `metadata.properties.image`.
 */
export function buildImageRecord(input: ImageRecordInput): ComponentRecord {
    return {
        id: input.id,
        componentType: IMAGE_COMPONENT,
        ...geometryFields(
            pointGeometry(Math.trunc(input.x), Math.trunc(input.y)),
            { image: input.image }
        ),
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
        width: input.width,
        height: input.height,
        fill: 'transparent',
        stroke: null,
        linewidth: null,
        strokeType: null,
        textColor: null,
        opacity: 1,
        baseId: input.baseId,
        baseName: null,
        children: {},
        isDummy: null,
        updatedBy: input.updatedBy,
        createdAt: null,
    }
}
