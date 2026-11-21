import Two from 'two.js'
import {
    CIRCLE_LABEL_COLOR,
    DEFAULT_TEXT_FONT_FAMILY,
    POINT_LABEL_FONT_SIZE,
} from '../constants/misc'
import { capCenterOffset } from '../utils/fontMetrics'
import { lineHeightFor, wrapText } from '../utils/textLayout'
import { usableTextWidth } from '../utils/shapeTextFit'
import { readProperties } from '../utils/geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export const CIRCLE_LABEL_FLAG = '__mcCircleLabel'

export function circleLabelOf(record: ShapeLike): string {
    const label = readProperties(record).label
    return typeof label === 'string' ? label : ''
}

export function circleLabelColorOf(record: ShapeLike): string {
    const color = record?.textColor
    return typeof color === 'string' && color ? color : CIRCLE_LABEL_COLOR
}

export function circleLabelFontFamilyOf(record: ShapeLike): string {
    const family = readProperties(record).textFontFamily
    return typeof family === 'string' && family
        ? family
        : DEFAULT_TEXT_FONT_FAMILY
}

export function circleLabelFontSizeOf(record: ShapeLike): number {
    const size = readProperties(record).textFontSize
    return typeof size === 'number' && size > 0 ? size : POINT_LABEL_FONT_SIZE
}

export function getCircleLabelGroup(group: ShapeLike): ShapeLike | null {
    const children = group?.children
    if (!children) return null
    return children.find((c: ShapeLike) => c?.[CIRCLE_LABEL_FLAG]) ?? null
}

export function getCircleLabelNodes(group: ShapeLike): ShapeLike[] {
    const layer = getCircleLabelGroup(group)
    if (!layer?.children) return []
    return Array.from(layer.children as ArrayLike<ShapeLike>).filter(
        (c: ShapeLike) => typeof c?.value === 'string'
    )
}

export interface CircleLabelOptions {
    text: string
    fontFamily: string
    fontSize: number
    color?: string
    width: number
}

const MIN_WRAP_EMS = 4

export function circleWrapWidth(width: number, size: number): number {
    return Math.max(usableTextWidth('circle', width), size * MIN_WRAP_EMS)
}

export function buildCircleLabel(
    two: ShapeLike,
    group: ShapeLike,
    opts: CircleLabelOptions
): ShapeLike | null {
    if (!group) return null

    let layer = getCircleLabelGroup(group)
    if (!layer) {
        layer = new (Two as ShapeLike).Group()
        layer[CIRCLE_LABEL_FLAG] = true
        layer.translation.set(0, 0)
        group.add(layer)
    }

    const family = opts.fontFamily || DEFAULT_TEXT_FONT_FAMILY
    const size = opts.fontSize || POINT_LABEL_FONT_SIZE
    const raw = opts.text ?? ''

    const lines = raw
        ? wrapText(raw, circleWrapWidth(opts.width, size), {
              family,
              size,
              weight: 'normal',
          })
        : []

    const lineH = lineHeightFor(size)
    const n = lines.length
    const capOffset = capCenterOffset(family, size)

    const existing = Array.from(
        (layer.children ?? []) as ArrayLike<ShapeLike>
    )

    for (let i = 0; i < n; i++) {
        let node = existing[i]
        if (!node) {
            node = new (Two as ShapeLike).Text(lines[i] ?? '', 0, 0)
            node.noStroke()
            layer.add(node)
        }
        node.value = lines[i] ?? ''
        node.alignment = 'center'
        node.baseline = 'baseline'
        node.size = size
        node.family = family
        node.fill = opts.color || CIRCLE_LABEL_COLOR
        node.translation.set(0, (i - (n - 1) / 2) * lineH + capOffset)
    }

    if (existing.length > n) {
        const surplus = existing.slice(n)
        if (surplus.length > 0) layer.remove(surplus)
    }

    return layer
}
