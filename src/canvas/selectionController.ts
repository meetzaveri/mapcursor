import Two from 'two.js'
import {
    findShapeTextLayer,
    getShapeTextNodes,
    renderShapeTextLayer,
    shapeTextStyleFromMeta,
    syncTextHitRect,
} from '../utils/canvasUtils'
import { reflowTextForShape, minShapeWidthForText } from '../utils/shapeTextFit'
import {
    lineHeightFor,
    measureTextWidth,
    type FontSpec,
} from '../utils/textLayout'
import { DEFAULT_TEXT_FONT_FAMILY } from '../constants/misc'
import type { ComponentMetadata } from '../types/base'
import { pointGeometry, setGeometry } from '../utils/geometry'
import { markSelectionChrome } from '../utils/svgExportShared'
import { clampTextSizeOnScreen } from '../utils/textResize'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
} from '../factory/circleLabel'
import {
    getSelectionStroke,
    selectionHandleRadiusPx,
    selectionHandleHitRadiusPx,
    HANDLE_STROKE,
    SELECTION_BOX_LINEWIDTH_PX,
    SELECTION_HANDLE_FILL,
    SELECTION_HANDLE_LINEWIDTH_PX,
} from '../utils/selectionTheme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GroupLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiLike = any

interface ShapeAdapter {
    getLocalSize: (shape: ShapeLike) => { width: number; height: number }
    applySize: (shape: ShapeLike, width: number, height: number) => void
    resizable: boolean
    minWidth: number
    minHeight: number
    resizeMode?: 'dimension' | 'font'
    lockAspect?: boolean
    storedSize?: (shape: ShapeLike) => { width: number; height: number }
}

function textNodeFontSpec(node: ShapeLike): FontSpec {
    return {
        family: node?.family || DEFAULT_TEXT_FONT_FAMILY,
        size: node?.size || 36,
        weight: node?.weight,
    }
}

function textBlockLocalSize(group: ShapeLike): {
    width: number
    height: number
} {
    const nodes = getShapeTextNodes(group)
    if (!nodes.length) return { width: 60, height: 36 }
    const size = nodes[0]?.size || 36
    let maxW = 0
    nodes.forEach((nd) => {
        maxW = Math.max(
            maxW,
            measureTextWidth(nd?.value || '', textNodeFontSpec(nd))
        )
    })
    return {
        width: Math.max(maxW, 20),
        height: Math.max(nodes.length * lineHeightFor(size), size),
    }
}

const DEFAULT_ADAPTER: ShapeAdapter = {
    getLocalSize: (shape) => ({
        width: shape.width,
        height: shape.height,
    }),
    applySize: (shape, width, height) => {
        shape.width = width
        shape.height = height
    },
    resizable: true,
    minWidth: 20,
    minHeight: 20,
}

const TEXT_ADAPTER: ShapeAdapter = {
    getLocalSize: (shape) => textBlockLocalSize(shape?.parent ?? shape),
    applySize: () => {},
    resizable: true,
    resizeMode: 'font',
    minWidth: 20,
    minHeight: 20,
}

const groupScaleOf = (shape: ShapeLike): number => {
    const scale = shape?.parent?.scale
    return typeof scale === 'number' && scale > 0 ? scale : 1
}

const IMAGE_ADAPTER: ShapeAdapter = {
    getLocalSize: (shape) => {
        const k = groupScaleOf(shape)
        return { width: shape.width * k, height: shape.height * k }
    },
    applySize: (shape, width, height) => {
        const k = groupScaleOf(shape)
        shape.width = width / k
        shape.height = height / k
    },
    storedSize: (shape) => ({ width: shape.width, height: shape.height }),
    resizable: true,
    minWidth: 20,
    minHeight: 20,
}

const CIRCLE_ADAPTER: ShapeAdapter = {
    ...DEFAULT_ADAPTER,
    lockAspect: true,
}

const SHAPE_ADAPTERS: Record<string, ShapeAdapter> = {
    rectangle: DEFAULT_ADAPTER,
    circle: CIRCLE_ADAPTER,
    diamond: DEFAULT_ADAPTER,
    newText: TEXT_ADAPTER,
    image: IMAGE_ADAPTER,
}

function handleScreenPx(): number {
    return selectionHandleRadiusPx() * 2
}
const HANDLE_HIT_SLOP_MOUSE = 3
const HANDLE_HIT_SLOP_TOUCH = 8
const MIN_SCALE_DIMENSION = 20
export const SELECTION_PADDING = 5

interface ToolbarState {
    element: Record<string, ShapeLike>
    group: { id: string; data: GroupLike }
    shape: { type: string | undefined; id: string; data: ShapeLike }
    text: { data: ShapeLike }
    icon: { data: Record<string, unknown> }
}

export function buildToolbarState(
    group: GroupLike,
    shape: ShapeLike
): ToolbarState {
    const componentType = group?.elementData?.componentType
    const textChild = getShapeTextNodes(group)[0]
    return {
        element: {
            [shape.id]: shape,
            [group.id]: group,
        },
        group: {
            id: group.id,
            data: group,
        },
        shape: {
            type: componentType,
            id: shape.id,
            data: shape,
        },
        text: { data: textChild || {} },
        icon: { data: {} },
    }
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx
    const dy = ay - by
    return dx * dx + dy * dy
}

interface SelectionControllerOptions {
    two: TwoLike
    zui: ZuiLike
    domElement: HTMLElement
    onSelect?: (state: ToolbarState) => void
    onDeselect?: () => void
    commit?: (
        id: string,
        patch: {
            width: number
            height: number
            x: number
            y: number
            metadata: ComponentMetadata
        }
    ) => void
    recordHistory?: () => void
    onDelete?: (group: GroupLike) => void
    onTransform?: (group: GroupLike) => void
}

interface HitResult {
    mode: 'scale' | 'rotate'
    corner: CornerHandle
}

interface CornerHandle {
    name: string
    point: { x: number; y: number }
}

interface ScaleInteraction {
    mode: 'scale'
    corner: CornerHandle
    startSurface: { x: number; y: number }
    initialWidth: number
    initialHeight: number
    initialPosition: { x: number; y: number }
    initialRotation: number
    initialFontSize?: number
}

interface RotateInteraction {
    mode: 'rotate'
    corner: CornerHandle
    startSurface: { x: number; y: number }
    initialRotation: number
    center: { x: number; y: number }
}

type Interaction = ScaleInteraction | RotateInteraction

export default class SelectionController {
    two: TwoLike
    zui: ZuiLike
    domElement: HTMLElement
    callbacks: Required<
        Pick<
            SelectionControllerOptions,
            | 'onSelect'
            | 'onDeselect'
            | 'commit'
            | 'recordHistory'
            | 'onDelete'
            | 'onTransform'
        >
    >

    rotationEnabled = false

    targets: Set<GroupLike> = new Set()
    currentGroup: GroupLike = null
    currentShape: ShapeLike = null
    currentAdapter: ShapeAdapter | null = null
    currentTextChild: ShapeLike = null
    currentTextLayer: ShapeLike = null

    interaction: Interaction | null = null

    ui!: ShapeLike
    box!: ShapeLike
    handles: ShapeLike[] = []

    private _halfW = 0
    private _halfH = 0

    private _onUpdate: (() => void) | null = null
    private _onClearSelector: (() => void) | null = null
    private _onKeyDown: ((e: KeyboardEvent) => void) | null = null
    private _onMove: ((ev: MouseEvent) => void) | null = null
    private _onUp: ((ev: MouseEvent) => void) | null = null
    private _onHover: ((ev: MouseEvent) => void) | null = null

    constructor({
        two,
        zui,
        domElement,
        onSelect,
        onDeselect,
        commit,
        recordHistory,
        onDelete,
        onTransform,
    }: SelectionControllerOptions) {
        this.two = two
        this.zui = zui
        this.domElement = domElement
        this.callbacks = {
            onSelect: onSelect ?? ((): void => {}),
            onDeselect: onDeselect ?? ((): void => {}),
            commit: commit ?? ((): void => {}),
            recordHistory: recordHistory ?? ((): void => {}),
            onDelete: onDelete ?? ((): void => {}),
            onTransform: onTransform ?? ((): void => {}),
        }

        this._buildUi()
        this._bindExternal()
    }

    private _buildUi(): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ui = new (Two as any).Group()
        ui.visible = false

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const box = new (Two as any).Rectangle(0, 0, 0, 0)
        box.noFill()
        box.stroke = getSelectionStroke()
        box.linewidth = SELECTION_BOX_LINEWIDTH_PX

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleLayer = new (Two as any).Group()
        this.handles = [0, 1, 2, 3].map(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dot = new (Two as any).Circle(0, 0, handleScreenPx() / 2)
            dot.fill = SELECTION_HANDLE_FILL
            dot.stroke = HANDLE_STROKE
            dot.linewidth = SELECTION_HANDLE_LINEWIDTH_PX
            handleLayer.add(dot)
            return dot
        })

        ui.add(box, handleLayer)
        this.two.add(ui)

        this.ui = ui
        this.box = box
    }

    private _bindExternal(): void {
        this._onUpdate = (): void => this.syncToTarget()
        this.two.bind('update', this._onUpdate)

        this._onClearSelector = (): void => this.detach()
        window.addEventListener('clearSelector', this._onClearSelector, false)

        this._onKeyDown = (e: KeyboardEvent): void => {
            if (!this.currentGroup) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            if (e.keyCode === 8 || e.keyCode === 46) {
                this.callbacks.onDelete(this.currentGroup)
                this.detach()
            }
        }
        window.addEventListener('keydown', this._onKeyDown, false)
    }

    destroy(): void {
        if (this._onUpdate) this.two.unbind('update', this._onUpdate)
        if (this._onClearSelector) {
            window.removeEventListener(
                'clearSelector',
                this._onClearSelector,
                false
            )
        }
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown, false)
        }
        this._detachPointerStream()
        this.two.remove(this.ui)
    }

    canHandle(group: GroupLike): boolean {
        const type = group?.elementData?.componentType
        return !!SHAPE_ADAPTERS[type]
    }

    private _bringToFront(): void {
        const scene = this.two.scene
        const idx = scene.children.indexOf(this.ui)
        if (idx === -1) {
            this.two.add(this.ui)
            return
        }
        if (idx !== scene.children.length - 1) {
            scene.children.splice(idx, 1)
            scene.children.push(this.ui)
        }
    }

    bringSelectionToFront(): void {
        if (!this.currentGroup) return
        this._bringToFront()
    }

    attach(group: GroupLike, shape?: ShapeLike): boolean {
        const type = group?.elementData?.componentType
        const adapter = SHAPE_ADAPTERS[type]
        if (!adapter) return false

        if (this.currentGroup && this.currentGroup !== group) {
            this.targets.clear()
        }

        this.currentGroup = group
        this.currentShape = shape || group.children[0]
        this.currentAdapter = adapter
        this.currentTextLayer = findShapeTextLayer(group)
        this.currentTextChild = getShapeTextNodes(group)[0] || null
        this.targets.add(group)

        this._bringToFront()
        this.ui.visible = true
        this.domElement.classList.add('shape-selected')
        this.syncToTarget()
        this.two.update()
        markSelectionChrome(this.ui)

        this._attachHoverListener()
        this.callbacks.onSelect(
            buildToolbarState(this.currentGroup, this.currentShape)
        )
        return true
    }

    detach(): void {
        if (!this.currentGroup) return
        this._detachPointerStream()
        this._detachHoverListener()
        this.targets.clear()
        this.currentGroup = null
        this.currentShape = null
        this.currentAdapter = null
        this.currentTextChild = null
        this.currentTextLayer = null
        this.ui.visible = false
        this.domElement.classList.remove('shape-selected')
        this.domElement.style.cursor = ''
        this.two.update()
        this.callbacks.onDeselect()
    }

    resync(): void {
        if (this.currentGroup) {
            this.syncToTarget()
            this.two.update()
        }
    }

    applyThemeStroke(): void {
        if (this.box) this.box.stroke = getSelectionStroke()
        this.two.update()
    }

    getChromeDragHandle(group: GroupLike): {
        node: SVGGraphicsElement
        baseX: number
        baseY: number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shape: any
    } | null {
        if (!this.currentGroup || this.currentGroup !== group) return null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const node = (this.ui as any)?._renderer?.elem as
            SVGGraphicsElement | undefined
        if (!node) return null
        return {
            node,
            baseX: this.ui.position.x,
            baseY: this.ui.position.y,
            shape: this.ui,
        }
    }

    syncToTarget(): void {
        if (!this.currentGroup || !this.currentShape || !this.currentAdapter)
            return

        const scale = this.zui.scale || 1
        this.box.linewidth = SELECTION_BOX_LINEWIDTH_PX / scale
        const radius = handleScreenPx() / 2 / scale
        const dotLinewidth = SELECTION_HANDLE_LINEWIDTH_PX / scale

        const { width, height } = this.currentAdapter.getLocalSize(
            this.currentShape
        )
        const pad = SELECTION_PADDING
        this.box.width = width + pad * 2
        this.box.height = height + pad * 2

        const anchorOffsetX =
            this.currentAdapter?.resizeMode === 'font' ? width / 2 : 0
        this.ui.position.set(
            this.currentGroup.translation.x + anchorOffsetX,
            this.currentGroup.translation.y
        )
        this.ui.rotation = this.currentGroup.rotation || 0

        this._halfW = (width + pad * 2) / 2
        this._halfH = (height + pad * 2) / 2

        const corners: readonly [number, number][] = [
            [-this._halfW, -this._halfH],
            [this._halfW, -this._halfH],
            [this._halfW, this._halfH],
            [-this._halfW, this._halfH],
        ]
        this.handles.forEach((dot, i) => {
            const corner = corners[i]
            if (!corner) return
            dot.translation.set(corner[0], corner[1])
            dot.radius = radius
            dot.linewidth = dotLinewidth
        })
    }

    hitTest(clientX: number, clientY: number): HitResult | null {
        if (!this.currentGroup || !this.ui.visible) return null
        if (this.currentAdapter && !this.currentAdapter.resizable) return null

        const surface = this.zui.clientToSurface(clientX, clientY)
        const scale = this.zui.scale || 1
        const hitRadiusPx = selectionHandleHitRadiusPx() + this._hitSlopPx()
        const hitLimit = hitRadiusPx / scale

        const corner = this._atCorner(surface, hitLimit)
        if (corner) {
            const isOnInnerRing = this._withinCornerRadius(
                surface,
                corner,
                hitLimit
            )
            const mode =
                isOnInnerRing && this.rotationEnabled ? 'rotate' : 'scale'
            return { mode, corner }
        }

        const isRect =
            this.currentGroup?.elementData?.componentType === 'rectangle'
        if (isRect) {
            const edge = this._atEdge(surface, hitLimit)
            if (edge) return { mode: 'scale', corner: edge }
        }

        return null
    }

    private _vertexToSurface(v: { x: number; y: number }): {
        x: number
        y: number
    } {
        const rot = this.ui.rotation || 0
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        return {
            x: this.ui.position.x + v.x * cos - v.y * sin,
            y: this.ui.position.y + v.x * sin + v.y * cos,
        }
    }

    private _atCorner(
        point: { x: number; y: number },
        limit: number
    ): CornerHandle | null {
        const verts = this.box.vertices
        const sq = limit * limit
        const corners: CornerHandle[] = [
            { name: 'nw-resize', point: verts[0] },
            { name: 'ne-resize', point: verts[1] },
            { name: 'se-resize', point: verts[2] },
            { name: 'sw-resize', point: verts[3] },
        ]
        for (const c of corners) {
            const p = this._vertexToSurface(c.point)
            if (distSq(point.x, point.y, p.x, p.y) < sq) return c
        }
        return null
    }

    private _atEdge(
        point: { x: number; y: number },
        limit: number
    ): CornerHandle | null {
        const rot = this.ui.rotation || 0
        const dx = point.x - this.ui.position.x
        const dy = point.y - this.ui.position.y
        const cos = Math.cos(-rot)
        const sin = Math.sin(-rot)
        const lx = dx * cos - dy * sin
        const ly = dx * sin + dy * cos
        const hw = this.box.width / 2
        const hh = this.box.height / 2
        const withinX = lx >= -hw - limit && lx <= hw + limit
        const withinY = ly >= -hh - limit && ly <= hh + limit
        if (withinX && Math.abs(ly + hh) <= limit) {
            return { name: 'n-resize', point: { x: 0, y: -hh } }
        }
        if (withinY && Math.abs(lx - hw) <= limit) {
            return { name: 'e-resize', point: { x: hw, y: 0 } }
        }
        if (withinX && Math.abs(ly - hh) <= limit) {
            return { name: 's-resize', point: { x: 0, y: hh } }
        }
        if (withinY && Math.abs(lx + hw) <= limit) {
            return { name: 'w-resize', point: { x: -hw, y: 0 } }
        }
        return null
    }

    private _withinCornerRadius(
        point: { x: number; y: number },
        corner: CornerHandle,
        limit: number
    ): boolean {
        const p = this._vertexToSurface(corner.point)
        return distSq(point.x, point.y, p.x, p.y) < limit * limit
    }

    private _hitSlopPx(): number {
        const coarse =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(pointer: coarse)')?.matches
        return coarse ? HANDLE_HIT_SLOP_TOUCH : HANDLE_HIT_SLOP_MOUSE
    }

    private _withinBody(point: { x: number; y: number }): boolean {
        const rot = this.ui.rotation || 0
        const dx = point.x - this.ui.position.x
        const dy = point.y - this.ui.position.y
        const cos = Math.cos(-rot)
        const sin = Math.sin(-rot)
        const lx = dx * cos - dy * sin
        const ly = dx * sin + dy * cos
        return (
            Math.abs(lx) <= this.box.width / 2 &&
            Math.abs(ly) <= this.box.height / 2
        )
    }

    beginInteraction(e: MouseEvent, hit: HitResult | null): boolean {
        if (!this.currentGroup || !hit) return false
        if (hit.mode === 'scale') return this._beginScale(e, hit.corner)
        if (hit.mode === 'rotate' && this.rotationEnabled) {
            return this._beginRotate(e, hit.corner)
        }
        return false
    }

    private _beginScale(e: MouseEvent, corner: CornerHandle): boolean {
        if (!this.currentAdapter) return false
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        const { width, height } = this.currentAdapter.getLocalSize(
            this.currentShape
        )

        this.interaction = {
            mode: 'scale',
            corner,
            startSurface: { x: surface.x, y: surface.y },
            initialWidth: width,
            initialHeight: height,
            initialPosition: {
                x: this.currentGroup.translation.x,
                y: this.currentGroup.translation.y,
            },
            initialRotation: this.currentGroup.rotation || 0,
            initialFontSize: this.currentShape?.size ?? 36,
        }
        this._attachPointerStream()
        return true
    }

    private _beginRotate(e: MouseEvent, corner: CornerHandle): boolean {
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        this.interaction = {
            mode: 'rotate',
            corner,
            startSurface: { x: surface.x, y: surface.y },
            initialRotation: this.currentGroup.rotation || 0,
            center: {
                x: this.currentGroup.translation.x,
                y: this.currentGroup.translation.y,
            },
        }
        this._attachPointerStream()
        return true
    }

    private _attachPointerStream(): void {
        this._onMove = (ev): void => this._onPointerMove(ev)
        this._onUp = (ev): void => this._onPointerUp(ev)
        this.domElement.addEventListener('mousemove', this._onMove, false)
        this.domElement.addEventListener('mouseup', this._onUp, false)
    }

    private _detachPointerStream(): void {
        if (this._onMove) {
            this.domElement.removeEventListener(
                'mousemove',
                this._onMove,
                false
            )
            this._onMove = null
        }
        if (this._onUp) {
            this.domElement.removeEventListener('mouseup', this._onUp, false)
            this._onUp = null
        }
    }

    private _attachHoverListener(): void {
        if (this._onHover) return
        this._onHover = (ev): void => {
            if (this.interaction) return
            const surface = this.zui.clientToSurface(ev.clientX, ev.clientY)
            const hit = this.hitTest(ev.clientX, ev.clientY)
            if (!hit) {
                this.domElement.style.cursor = this._withinBody(surface)
                    ? 'move'
                    : ''
                return
            }
            if (hit.mode === 'rotate') {
                this.domElement.style.cursor = 'alias'
                return
            }
            const name = hit.corner?.name
            if (name === 'nw-resize' || name === 'se-resize') {
                this.domElement.style.cursor = 'nwse-resize'
            } else if (name === 'ne-resize' || name === 'sw-resize') {
                this.domElement.style.cursor = 'nesw-resize'
            } else if (name === 'n-resize' || name === 's-resize') {
                this.domElement.style.cursor = 'ns-resize'
            } else if (name === 'e-resize' || name === 'w-resize') {
                this.domElement.style.cursor = 'ew-resize'
            }
        }
        this.domElement.addEventListener('mousemove', this._onHover, false)
    }

    private _detachHoverListener(): void {
        if (!this._onHover) return
        this.domElement.removeEventListener('mousemove', this._onHover, false)
        this._onHover = null
    }

    private _onPointerMove(e: MouseEvent): void {
        if (!this.interaction) return
        if (this.interaction.mode === 'scale') this._scaleMove(e)
        else if (this.interaction.mode === 'rotate') this._rotateMove(e)
    }

    private _scaleMove(e: MouseEvent): void {
        if (!this.interaction || this.interaction.mode !== 'scale') return
        if (!this.currentAdapter) return
        if (this.currentAdapter.resizeMode === 'font') {
            this._fontScaleMove(e)
            return
        }
        const {
            corner,
            startSurface,
            initialWidth,
            initialHeight,
            initialPosition,
            initialRotation,
        } = this.interaction
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)

        let deltaX = surface.x - startSurface.x
        let deltaY = surface.y - startSurface.y

        if (initialRotation !== 0) {
            const cos = Math.cos(-initialRotation)
            const sin = Math.sin(-initialRotation)
            const rx = deltaX * cos - deltaY * sin
            const ry = deltaX * sin + deltaY * cos
            deltaX = rx
            deltaY = ry
        }

        let newWidth = initialWidth
        let newHeight = initialHeight
        switch (corner.name) {
            case 'se-resize':
                newWidth = initialWidth + deltaX
                newHeight = initialHeight + deltaY
                break
            case 'sw-resize':
                newWidth = initialWidth - deltaX
                newHeight = initialHeight + deltaY
                break
            case 'ne-resize':
                newWidth = initialWidth + deltaX
                newHeight = initialHeight - deltaY
                break
            case 'nw-resize':
                newWidth = initialWidth - deltaX
                newHeight = initialHeight - deltaY
                break
            case 'n-resize':
                newHeight = initialHeight - deltaY
                break
            case 's-resize':
                newHeight = initialHeight + deltaY
                break
            case 'e-resize':
                newWidth = initialWidth + deltaX
                break
            case 'w-resize':
                newWidth = initialWidth - deltaX
                break
            default:
                break
        }

        let scaleX = newWidth / initialWidth
        let scaleY = newHeight / initialHeight

        const isEdgeOnly = [
            'n-resize',
            's-resize',
            'e-resize',
            'w-resize',
        ].includes(corner.name)
        if (this.currentAdapter.lockAspect || (e.shiftKey && !isEdgeOnly)) {
            const isVerticalEdge =
                corner.name === 'n-resize' || corner.name === 's-resize'
            const ratio = isEdgeOnly
                ? Math.abs(isVerticalEdge ? scaleY : scaleX)
                : Math.min(Math.abs(scaleX), Math.abs(scaleY))
            scaleX = scaleX >= 0 ? ratio : -ratio
            scaleY = scaleY >= 0 ? ratio : -ratio
            newWidth = initialWidth * scaleX
            newHeight = initialHeight * scaleY
        }

        const minW = this.currentAdapter.minWidth ?? MIN_SCALE_DIMENSION
        const minH = this.currentAdapter.minHeight ?? MIN_SCALE_DIMENSION

        const meta = this.currentGroup?.elementData?.metadata
        const rawText =
            meta && typeof meta.textContent === 'string' ? meta.textContent : ''
        const hasShapeText =
            !!this.currentTextLayer && !!meta?.hasText && rawText.length > 0

        if (hasShapeText) {
            const kind = this.currentGroup?.elementData?.componentType
            const { style, font } = shapeTextStyleFromMeta(meta)
            const textMinW = minShapeWidthForText(kind, rawText, font)
            if (Math.abs(newWidth) < Math.max(minW, textMinW)) return

            const reflow = reflowTextForShape(
                kind,
                Math.abs(newWidth),
                rawText,
                font
            )
            const signH = newHeight < 0 ? -1 : 1
            newHeight =
                signH * Math.max(Math.abs(newHeight), reflow.requiredHeight)
            scaleX = newWidth / initialWidth
            scaleY = newHeight / initialHeight

            renderShapeTextLayer(
                this.two,
                this.currentGroup,
                reflow.lines,
                style
            )
        } else if (Math.abs(newWidth) < minW || Math.abs(newHeight) < minH) {
            return
        }

        const anchorOffsetX = (initialWidth * (scaleX - 1)) / 2
        const anchorOffsetY = (initialHeight * (scaleY - 1)) / 2

        let adjustX = 0
        let adjustY = 0
        switch (corner.name) {
            case 'nw-resize':
                adjustX = -anchorOffsetX
                adjustY = -anchorOffsetY
                break
            case 'ne-resize':
                adjustX = anchorOffsetX
                adjustY = -anchorOffsetY
                break
            case 'sw-resize':
                adjustX = -anchorOffsetX
                adjustY = anchorOffsetY
                break
            case 'se-resize':
                adjustX = anchorOffsetX
                adjustY = anchorOffsetY
                break
            case 'n-resize':
                adjustX = 0
                adjustY = -anchorOffsetY
                break
            case 's-resize':
                adjustX = 0
                adjustY = anchorOffsetY
                break
            case 'e-resize':
                adjustX = anchorOffsetX
                adjustY = 0
                break
            case 'w-resize':
                adjustX = -anchorOffsetX
                adjustY = 0
                break
            default:
                break
        }

        let nextX: number, nextY: number
        if (initialRotation !== 0) {
            const cos = Math.cos(initialRotation)
            const sin = Math.sin(initialRotation)
            nextX = initialPosition.x + (adjustX * cos - adjustY * sin)
            nextY = initialPosition.y + (adjustX * sin + adjustY * cos)
        } else {
            nextX = initialPosition.x + adjustX
            nextY = initialPosition.y + adjustY
        }

        if (e.altKey) {
            nextX = initialPosition.x
            nextY = initialPosition.y
        }

        this.currentAdapter.applySize(this.currentShape, newWidth, newHeight)
        this.currentGroup.translation.set(nextX, nextY)
        if (this.currentGroup.elementData?.componentType === 'circle') {
            buildCircleLabel(this.two, this.currentGroup, {
                text: circleLabelOf(this.currentGroup.elementData),
                fontFamily: circleLabelFontFamilyOf(
                    this.currentGroup.elementData
                ),
                fontSize: circleLabelFontSizeOf(this.currentGroup.elementData),
                color: circleLabelColorOf(this.currentGroup.elementData),
                width: newWidth,
            })
        }
        this.syncToTarget()
        this.two.update()
        this.callbacks.onTransform(this.currentGroup)
    }

    private _fontScaleMove(e: MouseEvent): void {
        if (!this.interaction || this.interaction.mode !== 'scale') return
        const { startSurface, initialPosition, initialFontSize, initialWidth } =
            this.interaction
        const center = {
            x: initialPosition.x + (initialWidth ?? 0) / 2,
            y: initialPosition.y,
        }
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        const startDist = Math.hypot(
            startSurface.x - center.x,
            startSurface.y - center.y
        )
        const curDist = Math.hypot(surface.x - center.x, surface.y - center.y)
        const factor = curDist / Math.max(startDist, 1)
        const base = initialFontSize ?? 36
        const groupScale =
            typeof this.currentGroup.scale === 'number'
                ? this.currentGroup.scale
                : 1
        const newSize = clampTextSizeOnScreen(
            base * factor,
            this.two.scene.scale * groupScale
        )
        this._applyTextFontSize(this.currentGroup, newSize)
        this.syncToTarget()
        this.two.update()
        this.callbacks.onTransform(this.currentGroup)
    }

    private _applyTextFontSize(group: ShapeLike, size: number): void {
        const nodes = getShapeTextNodes(group)
        const n = nodes.length
        const lineH = lineHeightFor(size)
        nodes.forEach((nd, i) => {
            nd.size = size
            nd.leading = size
            nd.translation.set(0, (i - (n - 1) / 2) * lineH)
        })
        syncTextHitRect(this.two, group)
    }

    private _rotateMove(e: MouseEvent): void {
        if (!this.interaction || this.interaction.mode !== 'rotate') return
        const { center, startSurface, initialRotation } = this.interaction
        const surface = this.zui.clientToSurface(e.clientX, e.clientY)
        const startAngle = Math.atan2(
            startSurface.y - center.y,
            startSurface.x - center.x
        )
        const currentAngle = Math.atan2(
            surface.y - center.y,
            surface.x - center.x
        )
        this.currentGroup.rotation =
            initialRotation + (currentAngle - startAngle)
        this.syncToTarget()
        this.two.update()
        this.callbacks.onTransform(this.currentGroup)
    }

    private _onPointerUp(_e: MouseEvent): void {
        if (!this.interaction) {
            this._detachPointerStream()
            return
        }

        const componentId = this.currentGroup?.elementData?.id
        if (
            this.interaction.mode === 'scale' &&
            componentId &&
            this.currentAdapter
        ) {
            const { width, height } = (
                this.currentAdapter.storedSize ??
                this.currentAdapter.getLocalSize
            )(this.currentShape)
            const elementData = this.currentGroup?.elementData
            const geometryPatch = setGeometry(
                elementData,
                pointGeometry(
                    parseInt(String(this.currentGroup.translation.x)),
                    parseInt(String(this.currentGroup.translation.y))
                )
            )
            const patch: {
                width: number
                height: number
                x: number
                y: number
                metadata: ComponentMetadata
            } = {
                width: parseInt(String(width)),
                height: parseInt(String(height)),
                ...geometryPatch,
            }
            if (this.currentAdapter.resizeMode === 'font') {
                const nodes = getShapeTextNodes(this.currentGroup)
                const size = this.currentShape?.size
                patch.metadata = {
                    geometry: geometryPatch.metadata.geometry,
                    properties: {
                        ...geometryPatch.metadata.properties,
                        fontSize: size,
                        content: nodes.map((nd) => nd?.value ?? '').join('\n'),
                    },
                }
            }
            if (elementData) elementData.metadata = patch.metadata
            this.callbacks.commit(componentId, patch)
        }

        this.interaction = null
        this._detachPointerStream()
    }
}
