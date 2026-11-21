import { IMAGE_COMPONENT, IMAGE_RESIST } from '../constants/misc'
import { computeCounterScale } from './counterScale'
import { geometryFields, pointGeometry } from './geometry'
import type { ImageAssetRef } from '../types/asset'
import type { ComponentRecord } from '../types/base'

export const IMAGE_PLACE_MAX_SCREEN_PX = 480

export function imageScreenPxPerLocalUnit(zuiScale: number): number {
    const scale = Number.isFinite(zuiScale) && zuiScale > 0 ? zuiScale : 1
    return scale * computeCounterScale(scale, IMAGE_RESIST)
}

export const IMAGE_PLACE_MIN_SCREEN_PX = 20

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
    x: number
    y: number
    image: ImageAssetRef
    width: number
    height: number
    updatedBy: string | null
}

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
