import {
    SHAPE_DEFAULT_STROKE,
    DEFAULT_TEXT_FONT_FAMILY,
} from '../constants/misc'
import { generateUUID } from './misc'
import { lineHeightFor, measureTextWidth, type FontSpec } from './textLayout'
import { reflowTextForShape } from './shapeTextFit'
import { isFontReady, runWhenFontReady } from './fontLoading'
import { scheduleRender } from './renderScheduler'
import { areaOpacityOf } from './areaFill'
import type { ComponentMetadata } from '../types/base'
import {
    geometryCenter,
    geometryFields,
    pointGeometry,
    readProperties,
    translateGeometry,
} from './geometry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZUILike = any

export const getGroupFill = (): string => {
    if (typeof document === 'undefined') return 'rgba(26, 22, 18, 0.1)'
    const isDark = document.documentElement.classList.contains('dark')
    const token = isDark ? '--color-ink' : '--color-topbar'
    const channels = getComputedStyle(document.documentElement)
        .getPropertyValue(token)
        .trim()
    const rgb = channels ? channels.split(/\s+/).join(', ') : '26, 22, 18'
    return `rgba(${rgb}, ${isDark ? 0.12 : 0.1})`
}

interface MouseLikeEvent {
    clientX: number
    clientY: number
}

interface ShapeStyleUpdate {
    fill?: string
    stroke?: string | null
    linewidth?: number
    opacity?: number
}

export function setArrowEndpointsVisible(
    shape: ShapeLike,
    visible: boolean
): void {
    const opacity = visible ? 1 : 0
    if (shape?.children?.[1]) shape.children[1].opacity = opacity
    if (shape?.children?.[2]) shape.children[2].opacity = opacity
}

export function readOpacity(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: any
): number {
    if (!source) return 1
    if (source.componentType === 'area') return areaOpacityOf(source)
    if (typeof source.opacity === 'number') return source.opacity
    const stored = readProperties(source).opacity
    if (typeof stored === 'number') return stored
    return 1
}

export function groupOpacityOf(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any
): number {
    if (record?.componentType === 'circle') return 1
    if (record?.componentType === 'area') return 1
    return readOpacity(record)
}

export function clientToSurface(
    zui: ZUILike,
    e: MouseLikeEvent
): { x: number; y: number } {
    return zui.clientToSurface(e.clientX, e.clientY)
}

export function applyShapeStyle(
    shape: ShapeLike,
    { fill, stroke, linewidth, opacity }: ShapeStyleUpdate = {}
): void {
    if (fill !== undefined) shape.fill = fill
    if (stroke !== undefined) shape.stroke = stroke || SHAPE_DEFAULT_STROKE
    if (linewidth !== undefined) shape.linewidth = linewidth
    if (opacity !== undefined) shape.opacity = opacity
}

interface ElementCloneSource {
    componentType: string
    objectClass?: 'shape' | 'geo'
    zoomResistant?: boolean | null
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    fill: string
    stroke: string | null
    strokeType: string | null
    fillType?: string | null
    linewidth: number | null
    textColor: string | null
    opacity?: number | null
    metadata: unknown
    children: unknown
    relativeX?: number
    relativeY?: number
    tailShapeId?: string | null
    tailEdge?: string | null
    tailPortIndex?: number | null
    headShapeId?: string | null
    headEdge?: string | null
    headPortIndex?: number | null
}

interface ClonedElement extends ElementCloneSource {
    id: string
    baseId: string
    x: number
    y: number
}

function moveCloneToCursor(
    src: ElementCloneSource,
    newX: number,
    newY: number
): { metadata: ComponentMetadata; x: number; y: number } {
    const center = geometryCenter(src)
    const moved = center
        ? translateGeometry(src, newX - center.x, newY - center.y)
        : null
    return moved ?? geometryFields(pointGeometry(newX, newY))
}

export function cloneElementData(
    src: ElementCloneSource,
    baseId: string,
    newX: number,
    newY: number
): ClonedElement {
    const cloned: ClonedElement = {
        id: generateUUID(),
        baseId,
        componentType: src.componentType,
        ...(src.objectClass ? { objectClass: src.objectClass } : {}),
        ...(src.zoomResistant != null
            ? { zoomResistant: src.zoomResistant }
            : {}),
        x1: src.x1,
        y1: src.y1,
        x2: src.x2,
        y2: src.y2,
        width: src.width,
        height: src.height,
        fill: src.fill,
        stroke: src.stroke,
        strokeType: src.strokeType,
        ...(src.fillType != null ? { fillType: src.fillType } : {}),
        linewidth: src.linewidth,
        textColor: src.textColor,
        opacity: readOpacity(src),
        ...moveCloneToCursor(src, newX, newY),
        children: src.children
            ? typeof structuredClone === 'function'
                ? structuredClone(src.children)
                : JSON.parse(JSON.stringify(src.children))
            : null,
    }
    if (src.relativeX !== undefined) cloned.relativeX = src.relativeX
    if (src.relativeY !== undefined) cloned.relativeY = src.relativeY
    if (src.componentType === 'arrowLine') {
        cloned.tailShapeId = src.tailShapeId ?? null
        cloned.tailEdge = src.tailEdge ?? null
        cloned.tailPortIndex = src.tailPortIndex ?? 0
        cloned.headShapeId = src.headShapeId ?? null
        cloned.headEdge = src.headEdge ?? null
        cloned.headPortIndex = src.headPortIndex ?? 0
    }
    return cloned
}

interface ResolveResult {
    shape: ShapeLike | null
    avoidDragging: boolean
}

export function resolveShapeFromPath(
    path: EventTarget[] | undefined,
    two: TwoLike
): ResolveResult {
    let shape: ShapeLike | null = null
    let avoidDragging = false

    if (!path) return { shape, avoidDragging }

    path.forEach((rawItem) => {
        const item = rawItem as HTMLElement
        const classList = item?.classList
        if (classList?.value?.includes('avoid-dragging')) {
            avoidDragging = true
            if (item.tagName === 'g' && shape == null) {
                shape =
                    two.scene.children.find(
                        (child: ShapeLike) => child.id === item.id
                    ) ?? null
            }
        }

        if (
            item.tagName === 'g' &&
            classList?.value?.includes('dragger-picker') &&
            shape == null
        ) {
            if (classList.value.includes('is-line-circle')) {
                const el = document.getElementById(item.id)
                const parentId = el?.getAttribute('data-parent-id')
                const lineId = el?.getAttribute('data-line-id')
                const direction = el?.getAttribute('data-direction')

                const getParentTwoData = two.scene.children.find(
                    (child: ShapeLike) => child.id === parentId
                )
                const getChildTwoData = getParentTwoData.children.find(
                    (child: ShapeLike) => child.id === item.id
                )
                const getSiblingChild = getParentTwoData.children.find(
                    (child: ShapeLike) =>
                        child.id !== item.id && child?.children?.length > 0
                )
                const getLineTwoData = getParentTwoData.children.find(
                    (child: ShapeLike) => child.id === lineId
                )

                shape = getChildTwoData
                shape.lineData = getLineTwoData
                shape.direction = direction
                shape.siblingCircle = getSiblingChild
                shape.opacity = 1
                shape.siblingCircle.opacity = 1
                shape.elementData = {
                    isGroupSelector: false,
                    isLineCircle: true,
                    lineData: getLineTwoData,
                    parentData: getParentTwoData,
                }
            } else {
                shape = two.scene.children.find(
                    (child: ShapeLike) => child.id === item.id
                )
                if (shape?.elementData?.componentType === 'arrowLine') {
                    setArrowEndpointsVisible(shape, true)
                }
            }
        }
    })

    return { shape, avoidDragging }
}

interface PollOptions {
    condition?: (el: ShapeLike) => boolean
    maxRetries?: number
    onTimeout?: () => void
}

export function pollUntilElement(
    two: TwoLike,
    id: string,
    onFound: (el: ShapeLike) => void,
    { condition = () => true, maxRetries = 300, onTimeout }: PollOptions = {}
): void {
    const attempt = (retries: number): void => {
        const el = two.scene.children.find(
            (child: ShapeLike) => child?.elementData?.id === id
        )
        if (el && condition(el)) {
            onFound(el)
        } else if (retries < maxRetries) {
            requestAnimationFrame(() => attempt(retries + 1))
        } else {
            onTimeout?.()
        }
    }
    requestAnimationFrame(() => attempt(0))
}

export interface ShapeTextStyle {
    fill: string
    size: number
    family: string
    weight?: string | number
    alignment?: 'center' | 'left' | 'right'
    baseline?: string
    lineHeight?: number
}

export function findShapeTextLayer(group: ShapeLike): ShapeLike | null {
    const children = group?.children
    if (!children) return null
    for (let i = 0; i < children.length; i++) {
        if (children[i]?.elementData?.isTextLayer === true) return children[i]
    }
    return null
}

export function getShapeTextNodes(group: ShapeLike): ShapeLike[] {
    const layer = findShapeTextLayer(group)
    const source = layer ? layer.children : group?.children
    if (!source) return []
    return Array.from(source as ArrayLike<ShapeLike>).filter(
        (c: ShapeLike) => typeof c?.value === 'string'
    )
}

export function focusSvgElement(el: Element | null | undefined): void {
    if (!el) return
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    const focusable = el as Element & {
        style?: CSSStyleDeclaration
        focus?: () => void
    }
    if (focusable.style) focusable.style.outline = 'none'
    focusable.focus?.()
}

export function syncTextHitRect(two: TwoLike, group: ShapeLike): void {
    const nodes = getShapeTextNodes(group)
    if (!nodes.length) return
    const size = nodes[0]?.size || 36
    const lineH = lineHeightFor(size)
    let maxW = 20
    nodes.forEach((nd) => {
        const w = measureTextWidth(nd?.value || '', {
            family: nd?.family || DEFAULT_TEXT_FONT_FAMILY,
            size: nd?.size || size,
            weight: nd?.weight,
        })
        maxW = Math.max(maxW, w)
    })
    const blockH = Math.max(nodes.length * lineH, size)

    let rect = Array.from(group.children as ArrayLike<ShapeLike>).find(
        (c: ShapeLike) => c?._isTextHitArea
    )
    if (!rect) {
        rect = two.makeRectangle(0, 0, maxW, blockH)
        rect.fill = 'rgba(0,0,0,0)'
        rect.noStroke()
        rect._isTextHitArea = true
        group.add(rect)
    }
    rect.width = maxW
    rect.height = blockH
    rect.translation.set(maxW / 2, 0)
}

export function layoutStandaloneText(
    two: TwoLike,
    group: ShapeLike,
    content: string,
    size: number
): void {
    const nodes = getShapeTextNodes(group)
    const first = nodes[0]
    if (!first) return
    const lines = (content || '').split('\n')
    const n = lines.length
    const lineH = lineHeightFor(size)

    first.value = lines[0] ?? ''
    first.size = size
    first.leading = size
    first.translation.set(0, (0 - (n - 1) / 2) * lineH)

    const extra = nodes.slice(1)
    for (let i = 1; i < n; i++) {
        let node = extra[i - 1]
        if (!node) {
            node = two.makeText(lines[i] ?? '', 0, 0)
            group.add(node)
        }
        node.value = lines[i] ?? ''
        node.fill = first.fill
        node.size = size
        node.leading = size
        node.family = first.family
        node.alignment = first.alignment
        node.baseline = first.baseline
        node.opacity = first.opacity
        node.translation.set(0, (i - (n - 1) / 2) * lineH)
    }

    if (extra.length > n - 1) {
        const surplus = extra.slice(n - 1)
        if (surplus.length) group.remove(surplus)
    }
}

export function renderShapeTextLayer(
    two: TwoLike,
    group: ShapeLike,
    lines: string[],
    style: ShapeTextStyle
): ShapeLike {
    let layer = findShapeTextLayer(group)
    if (!layer) {
        layer = two.makeGroup()
        layer.elementData = { isTextLayer: true }
        group.add(layer)
    }

    const lineH = style.lineHeight ?? lineHeightFor(style.size)
    const n = lines.length
    const alignment = style.alignment ?? 'left'

    let blockX = 0
    if (alignment === 'left') {
        const font: FontSpec = {
            family: style.family,
            size: style.size,
            weight: style.weight,
        }
        let maxW = 0
        for (const ln of lines) {
            const w = measureTextWidth(ln, font)
            if (w > maxW) maxW = w
        }
        blockX = -maxW / 2
    }

    for (let i = 0; i < n; i++) {
        const y = (i - (n - 1) / 2) * lineH
        let node = layer.children[i]
        if (!node || typeof node.value !== 'string') {
            node = two.makeText(lines[i] ?? '', blockX, y)
            layer.add(node)
        } else {
            node.value = lines[i] ?? ''
        }
        node.translation.set(blockX, y)
        node.fill = style.fill
        node.size = style.size
        node.family = style.family
        node.alignment = alignment
        node.baseline = style.baseline ?? 'middle'
        if (style.weight !== undefined) node.weight = style.weight
    }

    if (layer.children.length > n) {
        const extras = layer.children.slice(n)
        layer.remove(extras)
    }

    return layer
}

export function shapeTextStyleFromMeta(meta: ShapeLike): {
    style: ShapeTextStyle
    font: FontSpec
} {
    const family =
        meta?.textFontFamily || meta?.textFamily || DEFAULT_TEXT_FONT_FAMILY
    const size = meta?.textFontSize || 24
    const weight = meta?.textWeight || 'normal'
    return {
        style: {
            fill: meta?.textFill || SHAPE_DEFAULT_STROKE,
            size,
            family,
            weight,
            alignment: 'left',
            baseline: meta?.textBaseLine || 'middle',
        },
        font: { family, size, weight },
    }
}

export function applyShapeText(
    two: TwoLike,
    group: ShapeLike,
    kind: string,
    width: number,
    meta: ShapeLike
): void {
    if (!meta?.hasText) return
    const raw = typeof meta.textContent === 'string' ? meta.textContent : ''
    const { style, font } = shapeTextStyleFromMeta(meta)
    const { lines } = reflowTextForShape(kind, width, raw, font)
    renderShapeTextLayer(two, group, lines, style)

    if (isFontReady(font)) return
    runWhenFontReady(font, () => {
        if (!group?.parent) return
        const liveWidth = group.children?.[0]?.width ?? width
        const { lines: reflowed } = reflowTextForShape(
            kind,
            liveWidth,
            raw,
            font
        )
        renderShapeTextLayer(two, group, reflowed, style)
        scheduleRender(two)
    })
}
