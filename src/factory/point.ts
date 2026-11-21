import Main from './main'
import Two from 'two.js'
import {
    POINT_RADIUS,
    POINT_LABEL_GAP,
    POINT_COLOR,
    POINT_BORDER_COLOR,
    POINT_BORDER_WIDTH,
    POINT_LABEL_COLOR,
    POINT_SHADOW_LAYERS,
    POINT_SHADOW_OFFSET_Y,
    POINT_LABEL_FONT_SIZE,
    DEFAULT_TEXT_FONT_FAMILY,
} from '../constants/misc'
import { capCenterOffset } from '../utils/fontMetrics'
import { readProperties } from '../utils/geometry'
import type { ComponentMetadata } from '../types/base'

export interface PointProperties {
    fill?: string
    stroke?: string
    metadata?: ComponentMetadata | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export const POINT_CHROME_FLAG = '__mcPointChrome'

export const POINT_SHADOW_FLAG = '__mcPointShadow'

export function pointColorOf(record: ShapeLike): string {
    if (readProperties(record).category) return POINT_COLOR
    return record?.fill || record?.stroke || POINT_COLOR
}

export function pointFontFamilyOf(record: ShapeLike): string {
    const family = readProperties(record).textFontFamily
    return typeof family === 'string' && family
        ? family
        : DEFAULT_TEXT_FONT_FAMILY
}

export function pointFontSizeOf(record: ShapeLike): number {
    const size = readProperties(record).textFontSize
    return typeof size === 'number' && size > 0 ? size : POINT_LABEL_FONT_SIZE
}

export function pointLabelOf(record: ShapeLike): string {
    const label = readProperties(record).label
    return typeof label === 'string' ? label : ''
}

export function buildPointVisual(
    two: ShapeLike,
    group: ShapeLike,
    opts: {
        color?: string
        label?: string
        fontFamily?: string
        fontSize?: number
    }
): void {
    const color = opts.color || POINT_COLOR

    const existing: ShapeLike[] = [...(group.children || [])]
    existing.forEach((child: ShapeLike) => {
        if (child?.[POINT_CHROME_FLAG]) return
        group.remove(child)
    })

    const ringOuter = POINT_RADIUS + POINT_BORDER_WIDTH / 2
    POINT_SHADOW_LAYERS.forEach(({ spread, alpha }) => {
        const shadow = new (Two as ShapeLike).Circle(
            0,
            POINT_SHADOW_OFFSET_Y,
            ringOuter + spread
        )
        shadow.fill = `rgba(0,0,0,${alpha})`
        shadow.noStroke()
        shadow[POINT_SHADOW_FLAG] = true
        group.add(shadow)
    })

    const circle = new (Two as ShapeLike).Circle(0, 0, POINT_RADIUS)
    circle.fill = color
    circle.stroke = POINT_BORDER_COLOR
    circle.linewidth = POINT_BORDER_WIDTH
    group.add(circle)

    const family = opts.fontFamily || DEFAULT_TEXT_FONT_FAMILY
    const size = opts.fontSize || POINT_LABEL_FONT_SIZE

    const label = new (Two as ShapeLike).Text(
        opts.label ?? '',
        POINT_RADIUS + POINT_LABEL_GAP,
        capCenterOffset(family, size)
    )
    label.alignment = 'left'
    label.baseline = 'baseline'
    label.size = size
    label.family = family
    label.fill = POINT_LABEL_COLOR
    label.noStroke()
    group.add(label)
}

export function getPointCircle(group: ShapeLike): ShapeLike | null {
    const children = group?.children ?? []
    return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children.find(
            (c: any) => !c?.[POINT_CHROME_FLAG] && !c?.[POINT_SHADOW_FLAG]
        ) ?? null
    )
}

export function getPointLabelNode(group: ShapeLike): ShapeLike | null {
    const children = group?.children ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return children.find((c: any) => typeof c?.value === 'string') ?? null
}

export default class PointFactory extends Main<PointProperties> {
    group?: ShapeLike

    createElement(): { group: ShapeLike } {
        const two = this.two
        const group = two.makeGroup()

        buildPointVisual(two, group, {
            color: pointColorOf(this.properties),
            label: pointLabelOf(this.properties),
            fontFamily: pointFontFamilyOf(this.properties),
            fontSize: pointFontSizeOf(this.properties),
        })

        group.translation.x = parseInt(String(this.x))
        group.translation.y = parseInt(String(this.y))
        this.group = group
        return { group: this.group }
    }
}
