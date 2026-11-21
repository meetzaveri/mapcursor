import { DEFAULT_RESIST, IMAGE_RESIST, TEXT_RESIST } from '../constants/misc'
import { CIRCLE_LABEL_FLAG } from '../factory/circleLabel'
import { readProperties } from './geometry'
import { applyStrokeDashes } from './strokeDashes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export function computeCounterScale(
    zuiScale: number,
    resist: number = DEFAULT_RESIST
): number {
    if (!Number.isFinite(zuiScale) || zuiScale <= 0) return 1
    return 1 / Math.pow(zuiScale, resist)
}

const GROUP_SCALED_TYPES: ReadonlySet<string> = new Set([
    'point',
    'text',
    'image',
])
const STROKE_SCALED_TYPES: ReadonlySet<string> = new Set(['area', 'route'])

function defaultResistFor(type: string): number {
    if (type === 'image') return IMAGE_RESIST
    return type === 'text' ? TEXT_RESIST : DEFAULT_RESIST
}

export function resolveResist(item: ShapeLike): number {
    const type = item?.componentType
    if (type === 'text' && item?.zoomResistant === false) return 0
    const resist = readProperties(item).resist
    return typeof resist === 'number' ? resist : defaultResistFor(type)
}

export function circleLabelScale(
    item: ShapeLike,
    zuiScale: number | undefined
): number {
    const camera = readProperties(item).labelCameraScale
    if (typeof camera === 'number' && Number.isFinite(camera) && camera > 0) {
        return 1 / camera
    }
    return computeCounterScale(zuiScale ?? 1, TEXT_RESIST)
}

export function isStrokeScaled(item: ShapeLike): boolean {
    const type = item?.componentType
    if (STROKE_SCALED_TYPES.has(type)) return true
    return type === 'pencil'
}

export function applyCounterScaleToCopy(
    copy: ShapeLike,
    item: ShapeLike,
    zuiScale: number | undefined
): void {
    if (!copy || !zuiScale) return
    const type = item?.componentType
    const isCircle = type === 'circle'
    if (!GROUP_SCALED_TYPES.has(type) && !isStrokeScaled(item) && !isCircle) {
        return
    }

    const factor = computeCounterScale(zuiScale, resolveResist(item))

    if (GROUP_SCALED_TYPES.has(type)) {
        copy.scale = factor
        return
    }

    const base = item?.linewidth ?? 2
    const labelFactor = circleLabelScale(item, zuiScale)
    copy.children?.forEach((child: ShapeLike) => {
        if (child?.[CIRCLE_LABEL_FLAG]) {
            child.scale = labelFactor
            return
        }
        if (isCircle) return
        if (typeof child?.linewidth === 'number') {
            child.linewidth = base * factor
            if (typeof child?.value !== 'string') {
                applyStrokeDashes(child, item?.strokeType, zuiScale)
            }
        }
    })
}

export function applyCounterScaleToCopies(
    group: ShapeLike,
    zuiScale: number | undefined
): void {
    group?.children?.forEach((child: ShapeLike) => {
        if (child?.elementData) {
            applyCounterScaleToCopy(child, child.elementData, zuiScale)
        }
    })
}
