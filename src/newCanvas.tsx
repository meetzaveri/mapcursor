import React, {
    useEffect,
    useState,
    useRef,
    useCallback,
    Suspense,
    type MutableRefObject,
    type ReactNode,
} from 'react'
import Two from 'two.js'

import { ZUI } from 'two.js/extras/jsm/zui'
import { useBaseContext } from './views/Base/baseContext'
import { useMediaQueryUtils } from './constants/exportHooks'
import { BASE_ROOT_ID } from './hooks/useMapBackdrop'
import { readViewport, writeViewport } from './utils/viewportStorage'
import type { StoredViewport } from './utils/viewportStorage'
import { isUrlBasePath } from './utils/baseRoutes'
import type { MapAnchor } from './baseTypes/types'

import {
    GROUP_COMPONENT,
    IMAGE_COMPONENT,
    componentTypes,
    RUBBER_MODE_KEY,
    VIEWPORT_KEY_PREFIX,
    MOBILE_VIEWPORT_KEY_PREFIX,
    VIEWPORT_TTL_MS,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
    PENCIL_DEFAULT_COLOR,
    SHAPE_DEFAULT_STROKE,
    HOVER_THRESHOLD,
    HOVER_COLOR,
    SELECTION_PREVIEW_STROKE,
    DEFAULT_PREVIEW_OPACITY,
    LINE_HEIGHT_MULTIPLIER,
    PENCIL_DISTANCE_THROTTLE,
    DEFAULT_TEXT_SIZE,
    DRAW_MODE_KEY,
    DRAW_TYPE_KEY,
    DRAW_PROPS_KEY,
    POINT_PLACE_MODE_KEY,
    SELECT_COMPONENT_EVENT,
    MIN_VERTICES,
    DEFAULT_RESIST,
    PREVIEW_DOT_PX,
    PREVIEW_MIN_STROKE_PX,
    PREVIEW_SEGMENT_OPACITY,
    PREVIEW_RUBBER_OPACITY,
    ROUTE_SNAP_MIN_MOVE_PX,
    DEFAULT_TEXT_FONT_FAMILY,
    ERASER_SIZE_KEY,
    ERASER_SIZE_RADIUS,
    ERASER_DOT_PX,
    DEFAULT_ERASER_SIZE,
    type EraserSize,
} from './constants/misc'
import { createEraserTrail } from './utils/eraserTrail'
import Spinner from './components/common/spinner'

import { elementModules } from './elementModules'

import Loader from './components/utils/loader'
import SelectionController, {
    buildToolbarState,
    SELECTION_PADDING,
} from './canvas/selectionController'
import { updateX1Y1Vertices, updateX2Y2Vertices } from './utils/updateVertices'
import {
    armedPresetPatch,
    readArmedPreset,
} from './utils/armedLegendPreset'
import { applyPresetToElement } from './utils/applyLegendPreset'
import { isLegendPresetType } from './types/legend'
import type { LegendPresetType } from './types/legend'
import { generateUUID } from './utils/misc'
import {
    geometryFields,
    lineGeometry,
    moveGeometryTo,
    pointGeometry,
    polygonGeometry,
    readGeometry,
    readProperties,
    setGeometry,
    setProperties,
    translateGeometry,
} from './utils/geometry'
import {
    getDragScansEnabled,
    getRouteSnapEnabled,
    getViewportCullingEnabled,
} from './utils/featureFlags'
import {
    createRouteSnapper,
    invalidateRoadGraph,
    type RouteSnapper,
    type RouteSnapPreview,
} from './utils/roadSnap'
import {
    cullToViewport,
    uncullViewport,
    CULLED_FLAG,
} from './utils/viewportCulling'
import {
    createDrawPreview,
    updateDrawPreview,
    removeDrawPreview,
    type DrawPreviewKind,
} from './utils/drawPreviewOverlay'
import {
    velocityToLinewidth,
    smoothLinewidth,
    chaikinSmooth,
} from './utils/pencilHelper'
import {
    setArrowEndpointsVisible,
    pollUntilElement,
    cloneElementData,
    resolveShapeFromPath,
    findShapeTextLayer,
    getShapeTextNodes,
    applyShapeText,
    shapeTextStyleFromMeta,
    getGroupFill,
} from './utils/canvasUtils'
import { growShapeToFitText, usableTextWidth } from './utils/shapeTextFit'
import { isSelectPanMode, isPanMode } from './utils/drawModeUtils'
import { wheelZoomStep } from './utils/wheelZoom'
import { scheduleRender } from './utils/renderScheduler'
import { installRenderOrigin } from './canvas/renderOrigin'
import { E2E_HOOKS } from './utils/e2eHooks'
import { SELECTION_CHROME_ATTR } from './utils/svgExportShared'
import { computeCounterScale } from './utils/counterScale'
import { applyStrokeDashes } from './utils/strokeDashes'
import { MAP_ZOOM_LIMITS } from './baseTypes/zoomLimits'
import { lngLatToSurface, scaleForMapZoom } from './baseTypes/mercator'
import { useCanvasClipboard } from './hooks/useCanvasClipboard'
import { useImageDrop } from './hooks/useImageDrop'
import type { HistoryEntry } from './hooks/useComponentHistory'
import { exportSelectionAsSvg } from './utils/exportSelectionAsSvg'
import CanvasContextMenu from './components/canvasContextMenu'
import PerfOverlay from './components/dev/PerfOverlay'
import {
    ElementRenderWrapper,
    GroupRenderWrapper,
} from './components/utils/elementRenderWrappers'
import type {
    CameraChangeEvent,
    ComponentRecord,
    ComponentStore,
    SelectedComponent,
    CurrentElement,
} from './types/base'

const lazyElementCache = new Map<string, React.ComponentType<unknown>>()

const getLazyElement = (
    componentType: string,
    moduleLoader: () => Promise<{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        default: React.ComponentType<any>
    }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): React.ComponentType<any> => {
    const cached = lazyElementCache.get(componentType)
    if (cached) return cached
    const lazy = React.lazy(moduleLoader)
    lazyElementCache.set(componentType, lazy as React.ComponentType<unknown>)
    return lazy
}

const isLineLikeType = (t?: string | null): boolean =>
    t === 'arrowLine' || t === 'line'

interface CanvasProps {
    pointerToggle: boolean
    isPencilMode: boolean
    selectPanMode: boolean
    baseId: string
    selectedComponent: SelectedComponent | null
    lastAddedElement: ComponentRecord | null
    componentStore: ComponentStore
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultFillType: string | null
    defaultStrokeColor: string
    defaultTextSize: number
    onCameraChange?: (event: CameraChangeEvent) => void
    renderBackground?: () => ReactNode
    reorderSelectedRef?: MutableRefObject<
        ((op: 'front' | 'forward' | 'backward' | 'back') => void) | null
    >
    fitToContentRef?: MutableRefObject<(() => boolean) | null>
    initialMapLanding?: {
        anchor: MapAnchor
        lngLat: [number, number]
        zoom: number
    } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiHandle = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UpdateToGlobalStateFn = (newShapeData: any, oldShapeData: any) => void
type UpdateComponentVerticesFn = (id: string, x: number, y: number) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetOnGroupHandlerFn = (obj: any) => void

let isDrawing: boolean = false
let isPencilStrokeActive: boolean = false
const PENCIL_DOT_SEGMENT = 0.5
let defaultLinewidthValue: number = 1
let defaultStrokeTypeValue: string | null = null
let defaultFillTypeValue: string | null = null
let defaultStrokeColorValue: string = PENCIL_DEFAULT_COLOR
let defaultTextSizeValue: number = DEFAULT_TEXT_SIZE

const isReorderableElementChild = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    child: any,
    store: ComponentStore
): boolean => {
    const id = child?.elementData?.id
    if (!id) return false
    if (child.elementData.componentType === GROUP_COMPONENT) return false
    return Object.prototype.hasOwnProperty.call(store, id)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compareByZOrder = (a: any, b: any): number => {
    const pa = Number.isFinite(a?.position) ? a.position : 0
    const pb = Number.isFinite(b?.position) ? b.position : 0
    if (pa !== pb) return pa - pb
    const ca = Number.isFinite(a?.createdAt) ? a.createdAt : 0
    const cb = Number.isFinite(b?.createdAt) ? b.createdAt : 0
    if (ca !== cb) return ca - cb
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
}

function addZUI(
    props: CanvasProps,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    two: any,
    updateToGlobalState: UpdateToGlobalStateFn,
    updateComponentVertices: UpdateComponentVerticesFn,
    setOnGroupHandler: SetOnGroupHandlerFn,
    addToLocalComponentStore: (
        id: string,
        type: string,
        componentInfo: ComponentRecord,
        skipHistory?: boolean
    ) => void,
    setSelectedComponentInBase: (component: SelectedComponent | null) => void,
    setArrowDrawModeOff: () => void,
    setTextDrawModeOff: () => void,
    setPointerElement: (
        element: CurrentElement | null,
        options?: { select?: boolean }
    ) => void,
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        update: Partial<ComponentRecord>,
        skipDbWrite?: boolean
    ) => void,
    deleteComponentFromLocalStore: (id: string) => void,
    isPencilModeRef: MutableRefObject<boolean>,
    createTextAtSurfaceRef: MutableRefObject<
        ((x: number, y: number) => void) | null
    >,
    onCameraChangeRef: MutableRefObject<
        ((event: CameraChangeEvent) => void) | undefined
    >
): ZuiHandle {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shape: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastSelectedShape: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeGroupRef: { current: any } = { current: null }
    const domElement: HTMLElement = two.renderer.domElement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zui: any = new ZUI(two.scene, domElement)
    const mouse = new Two.Vector()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let touches: Record<string, any> = {}
    let distance = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastTouch: any = null
    let touchStartX = 0
    let touchStartY = 0
    let twoFingerMidX = 0
    let twoFingerMidY = 0
    let lastTapTime = 0
    let lastTapX = 0
    let lastTapY = 0
    let isWheeling = false
    let wheelSettleTimer: number | null = null
    let hoverFrame: number | null = null
    let hoverPendingEvent: MouseEvent | null = null
    let cullSettleTimer: number | null = null

    function cullOnCameraChange(): void {
        if (!getViewportCullingEnabled()) return
        cullToViewport(two)
        if (cullSettleTimer !== null) window.clearTimeout(cullSettleTimer)
        cullSettleTimer = window.setTimeout(() => {
            cullSettleTimer = null
            uncullViewport(two)
            scheduleRender(two)
        }, 200)
    }
    let isSinglePanning = false
    let panLastX = 0
    let panLastY = 0
    let isMousePanning = false
    let mousePanLastX = 0
    let mousePanLastY = 0
    let dragging = false
    let isResizeEvent = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentPath: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastAddedPath: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paths: any[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pencilGroup: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pencilPath: any = null
    let pencilPreviewOrigin = { x: 0, y: 0 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pencilRawPoints: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastPencilPoint: any = null
    let lastPencilTime = 0
    let lastPencilLinewidth: number | null = null

    let viewportSaveTimer: ReturnType<typeof setTimeout> | null = null
    let scenario: string | null = null
    const SCENARIO_JUST_ADDED_ELEMENT = 'justAddedElement'
    const SCENARIO_PENCIL_MODE = 'pencilMode'
    const SCENARIO_ARROW_DRAW = 'arrowDraw'
    const SCENARIO_DRAW_SHAPE = 'drawShape'
    const SCENARIO_TEXT_DRAW = 'textDraw'
    const SCENARIO_RUBBER_MODE = 'rubberMode'
    const SCENARIO_GEO_POINT = 'geoPoint'
    const SCENARIO_GEO_DRAW = 'geoDraw'
    const SCENARIO_DEFAULT = null

    const pendingDeletionSet = new Set<string>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let arrowDrawElement: any = null
    let arrowDrawTailShapeId: string | null = null
    let arrowDrawTailPort: {
        anchor: { x: number; y: number }
        edge: string
        index: number
    } | null = null
    let pendingPortConnection: {
        arrowId: string
        endpoint: 'head' | 'tail'
        edge: string
        shapeId: string
    } | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let textDrawElement: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawOrigin: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawCurrentCoords: any = null
    let drawPreviewActive = false
    let drawScreenOriginX = 0
    let drawScreenOriginY = 0
    let cssMoveActive = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cssMoveEl: any = null
    let cssMoveNode: SVGGraphicsElement | null = null
    let cssMoveChrome: {
        node: SVGGraphicsElement
        baseX: number
        baseY: number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shape: any
    } | null = null
    let cssMoveBaseX = 0
    let cssMoveBaseY = 0
    let cssMoveStartClientX = 0
    let cssMoveStartClientY = 0
    let cssMoveLastDxWorld = 0
    let cssMoveLastDyWorld = 0
    let cssMoveRejected = false

    const cssMoveTransform = (
        x: number,
        y: number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scale?: any
    ): string => {
        const sx = typeof scale === 'number' ? scale : (scale?.x ?? 1)
        const sy = typeof scale === 'number' ? scale : (scale?.y ?? 1)
        return `matrix(${sx} 0 0 ${sy} ${x} ${y})`
    }

    const clearCssMove = (): void => {
        if (cssMoveNode) cssMoveNode.removeAttribute('transform')
        if (cssMoveEl) cssMoveEl._flagMatrix = true
        if (cssMoveChrome) {
            cssMoveChrome.node.removeAttribute('transform')
            if (cssMoveChrome.shape) cssMoveChrome.shape._flagMatrix = true
        }
        cssMoveActive = false
        cssMoveEl = null
        cssMoveNode = null
        cssMoveChrome = null
        cssMoveRejected = false
    }
    let drawShapeType: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawShapeProps: any = null
    const isRadialDraw = (type: string | null): boolean => type === 'circle'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastPlacedElement: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pendingGroupSelectorOrigin: any = null

    let geoDrawType: 'area' | 'route' | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoDrawProps: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoArmedStyle: any = null
    let geoVertices: { x: number; y: number }[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoDots: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoLines: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoPreviewLine: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoCurvedPreview: any = null

    let routeSnapper: RouteSnapper | null = null
    let routeSnapPending: RouteSnapPreview | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let routeSnapPreview: any = null
    let lastGeoRunLength = 0
    let lastRouteProbe: { x: number; y: number } | null = null

    let geoPreviewOrigin: { x: number; y: number } | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let geoPreviewGroup: any = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ensureGeoPreviewGroup = (x: number, y: number): any => {
        if (!geoPreviewGroup) {
            geoPreviewOrigin = { x: Math.floor(x), y: Math.floor(y) }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const g = new (Two as any).Group()
            g.translation.set(geoPreviewOrigin.x, geoPreviewOrigin.y)
            two.add(g)
            geoPreviewGroup = g
        }
        return geoPreviewGroup
    }

    const rel = (x: number, y: number): { x: number; y: number } => {
        const o = geoPreviewOrigin
        return o ? { x: x - o.x, y: y - o.y } : { x, y }
    }

    const toSurface = (e: { clientX: number; clientY: number }) =>
        zui.clientToSurface(e.clientX, e.clientY)
    zui.addLimits(0.06, 8)

    const setRootCursor = (cursor: string) => {
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = cursor
    }

    const pencilPreviewLinewidth = (): number => {
        const base = defaultLinewidthValue
        const scale = zui.scale || two.scene.scale || 1
        return base * computeCounterScale(scale, DEFAULT_RESIST)
    }

    const geoPreviewStyle = () => {
        const scale = zui.scale || two.scene.scale || 1
        const lw =
            geoArmedStyle?.linewidth ||
            defaultLinewidthValue ||
            geoDrawProps?.linewidth ||
            2
        return {
            stroke:
                geoArmedStyle?.stroke ||
                defaultStrokeColorValue ||
                geoDrawProps?.stroke ||
                SHAPE_DEFAULT_STROKE,
            lw: Math.max(lw, PREVIEW_MIN_STROKE_PX) / scale,
            dotRadius: PREVIEW_DOT_PX / scale,
        }
    }

    const refreshGeoPreviewScale = () => {
        if (!geoDrawType) return
        const { lw, dotRadius } = geoPreviewStyle()
        geoDots.forEach((dot) => {
            dot.radius = dotRadius
        })
        geoLines.forEach((line) => {
            line.linewidth = lw
        })
        if (geoPreviewLine) geoPreviewLine.linewidth = lw
        if (geoCurvedPreview) geoCurvedPreview.linewidth = lw
        if (routeSnapPreview) routeSnapPreview.linewidth = lw
        two.update()
    }
    window.addEventListener('zoomChanged', refreshGeoPreviewScale)
    window.addEventListener('zoomChanged', invalidateRoadGraph)

    const rebuildCurvedPreview = (cursor?: { x: number; y: number }) => {
        if (geoCurvedPreview) {
            geoPreviewGroup?.remove(geoCurvedPreview)
            geoCurvedPreview = null
        }
        const pts = cursor ? [...geoVertices, cursor] : [...geoVertices]
        if (pts.length < 2) return
        const { stroke, lw } = geoPreviewStyle()
        const g = ensureGeoPreviewGroup(pts[0]!.x, pts[0]!.y)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anchors = pts.map((p) => {
            const r = rel(p.x, p.y)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new (Two as any).Anchor(r.x, r.y)
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const path = new (Two as any).Path(anchors, false, true)
        path.noFill()
        path.stroke = stroke
        path.linewidth = lw
        path.cap = 'round'
        path.join = 'round'
        path.opacity = PREVIEW_SEGMENT_OPACITY
        g.add(path)
        geoCurvedPreview = path
    }

    const addGeoVertex = (x: number, y: number) => {
        geoVertices.push({ x, y })
        const { stroke, lw, dotRadius } = geoPreviewStyle()
        const g = ensureGeoPreviewGroup(x, y)
        const r = rel(x, y)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dot = new (Two as any).Circle(r.x, r.y, dotRadius)
        dot.fill = stroke
        dot.noStroke()
        g.add(dot)
        geoDots.push(dot)
        if (geoVertices.length >= 2) {
            const prev = geoVertices[geoVertices.length - 2]!
            const rp = rel(prev.x, prev.y)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const line = new (Two as any).Line(rp.x, rp.y, r.x, r.y)
            g.add(line)
            line.stroke = stroke
            line.linewidth = lw
            line.cap = 'round'
            line.opacity = PREVIEW_SEGMENT_OPACITY
            geoLines.push(line)
        }
        lastGeoRunLength = 1
        two.update()
    }

    const addGeoVertexRun = (pts: { x: number; y: number }[]) => {
        const run = pts.slice(1)
        if (run.length === 0) {
            lastGeoRunLength = 0
            return
        }
        const { stroke, lw, dotRadius } = geoPreviewStyle()
        const g = ensureGeoPreviewGroup(pts[0]!.x, pts[0]!.y)
        run.forEach((p, i) => {
            const prev = geoVertices[geoVertices.length - 1]
            geoVertices.push({ x: p.x, y: p.y })
            const r = rel(p.x, p.y)
            if (prev) {
                const rp = rel(prev.x, prev.y)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const line = new (Two as any).Line(rp.x, rp.y, r.x, r.y)
                g.add(line)
                line.stroke = stroke
                line.linewidth = lw
                line.cap = 'round'
                line.opacity = PREVIEW_SEGMENT_OPACITY
                geoLines.push(line)
            }
            if (i === run.length - 1) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dot = new (Two as any).Circle(r.x, r.y, dotRadius)
                dot.fill = stroke
                dot.noStroke()
                g.add(dot)
                geoDots.push(dot)
            }
        })
        lastGeoRunLength = run.length
        two.update()
    }

    const clearRouteSnapPreview = () => {
        if (routeSnapPreview) {
            geoPreviewGroup?.remove(routeSnapPreview)
            routeSnapPreview = null
        }
        routeSnapPending = null
    }

    const updateRouteSnapPreview = (preview: RouteSnapPreview) => {
        if (routeSnapPreview) geoPreviewGroup?.remove(routeSnapPreview)
        const { stroke, lw } = geoPreviewStyle()
        const first = preview.path[0]!
        const g = ensureGeoPreviewGroup(first.x, first.y)
        const anchors = preview.path.map((p) => {
            const r = rel(p.x, p.y)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new (Two as any).Anchor(r.x, r.y)
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const path = new (Two as any).Path(anchors, false, false)
        path.noFill()
        path.stroke = stroke
        path.linewidth = lw
        path.cap = 'round'
        path.join = 'round'
        path.opacity = PREVIEW_RUBBER_OPACITY
        g.add(path)
        routeSnapPreview = path
        routeSnapPending = preview
    }

    const commitGeoClick = (
        pt: { x: number; y: number },
        straight: boolean
    ) => {
        const snapper = routeSnapper
        if (!snapper || straight) {
            addGeoVertex(pt.x, pt.y)
            snapper?.acceptPoint(pt)
            clearRouteSnapPreview()
            lastRouteProbe = null
            return
        }

        if (snapper.hasAnchor()) {
            const preview = snapper.preview(pt)
            if (preview) {
                addGeoVertexRun(preview.path)
                snapper.accept(preview)
            } else {
                addGeoVertex(pt.x, pt.y)
                snapper.acceptPoint(pt)
            }
            clearRouteSnapPreview()
            lastRouteProbe = null
            return
        }

        const snapped = snapper.start(pt)
        if (snapped) {
            addGeoVertex(snapped.x, snapped.y)
        } else {
            addGeoVertex(pt.x, pt.y)
            snapper.acceptPoint(pt)
        }
        clearRouteSnapPreview()
        lastRouteProbe = null
    }

    const updateGeoPreview = (sx: number, sy: number) => {
        if (!geoDrawType || geoVertices.length === 0) return
        const { stroke, lw } = geoPreviewStyle()
        const last = geoVertices[geoVertices.length - 1]!
        const g = ensureGeoPreviewGroup(last.x, last.y)
        const a = rel(last.x, last.y)
        const b = rel(sx, sy)
        if (geoPreviewLine) {
            geoPreviewLine.vertices[0].set(a.x, a.y)
            geoPreviewLine.vertices[1].set(b.x, b.y)
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            geoPreviewLine = new (Two as any).Line(a.x, a.y, b.x, b.y)
            geoPreviewLine.stroke = stroke
            geoPreviewLine.cap = 'round'
            geoPreviewLine.opacity = PREVIEW_RUBBER_OPACITY
            g.add(geoPreviewLine)
        }
        geoPreviewLine.linewidth = lw
        two.update()
    }

    const clearGeoPreviewArtifacts = () => {
        clearRouteSnapPreview()
        const g = geoPreviewGroup
        if (g) {
            geoDots.forEach((d) => g.remove(d))
            geoLines.forEach((l) => g.remove(l))
            if (geoPreviewLine) g.remove(geoPreviewLine)
            if (geoCurvedPreview) g.remove(geoCurvedPreview)
            two.remove(g)
        }
        geoPreviewGroup = null
        geoPreviewOrigin = null
        geoDots = []
        geoLines = []
        geoPreviewLine = null
        geoCurvedPreview = null
        try {
            two.update()
        } catch (err) {
            console.error('Preview teardown render failed', err)
            two.scene.subtractions.length = 0
            two.scene._flagSubtractions = false
        }
    }

    const resetGeoDrawState = () => {
        geoDrawType = null
        geoDrawProps = null
        geoArmedStyle = null
        geoVertices = []
        routeSnapper = null
        routeSnapPending = null
        lastRouteProbe = null
        lastGeoRunLength = 0
        localStorage.removeItem(DRAW_MODE_KEY)
        localStorage.removeItem(DRAW_TYPE_KEY)
        localStorage.removeItem(DRAW_PROPS_KEY)
        domElement.removeEventListener('mousemove', mousemove, false)
    }

    const hideMultiClickHint = () => {
        window.dispatchEvent(new CustomEvent('multiClickDrawEnd'))
    }

    const cancelGeoDraw = () => {
        clearGeoPreviewArtifacts()
        resetGeoDrawState()
        hideMultiClickHint()
        setRootCursor('auto')
    }

    const finishGeoDraw = ({
        dropLast = false,
    }: { dropLast?: boolean } = {}) => {
        if (!geoDrawType) return
        let verts = geoVertices.slice()
        const dropCount = dropLast ? Math.min(lastGeoRunLength, verts.length) : 0
        if (dropCount > 0) verts = verts.slice(0, -dropCount)

        if (verts.length < MIN_VERTICES[geoDrawType]) {
            cancelGeoDraw()
            setPointerElement('pointer', { select: true })
            return
        }

        const type = geoDrawType
        const finalId = generateUUID()
        const rounded = verts.map((v) => ({
            x: Math.round(v.x),
            y: Math.round(v.y),
        }))
        const finalShapeData = {
            ...(geoDrawProps || {}),
            id: finalId,
            componentType: type,
            stroke:
                defaultStrokeColorValue ||
                geoDrawProps?.stroke ||
                SHAPE_DEFAULT_STROKE,
            linewidth: defaultLinewidthValue || geoDrawProps?.linewidth || 2,
            strokeType: defaultStrokeTypeValue,
            ...(type === 'area' && defaultFillTypeValue
                ? { fillType: defaultFillTypeValue }
                : {}),
            ...geometryFields(
                type === 'area'
                    ? polygonGeometry(rounded)
                    : lineGeometry(rounded)
            ),
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 0,
            width: 0,
            height: 0,
            isDummy: null,
            createdAt: null,
            children: {},
            ...armedPresetPatch(type as LegendPresetType),
        }

        clearGeoPreviewArtifacts()
        resetGeoDrawState()
        hideMultiClickHint()
        addToLocalComponentStore(
            finalId,
            type,
            finalShapeData as unknown as ComponentRecord
        )
        setSelectedComponentInBase(null)
        setRootCursor('auto')
        setPointerElement('pointer', { select: true })
    }

    window.addEventListener('cancelGeoDraw', () => {
        cancelGeoDraw()
    })

    window.addEventListener('finishGeoDraw', () => {
        if (geoDrawType) finishGeoDraw({})
    })

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (!geoDrawType) return
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault()
            finishGeoDraw({})
        }
    })

    const selectionController = new SelectionController({
        two,
        zui,
        domElement,
        onSelect: (toolbarState) => {
            setSelectedComponentInBase(toolbarState)
        },
        onDeselect: () => {
            setSelectedComponentInBase(null)
        },
        commit: (id, patch) => {
            updateComponentBulkPropertiesInLocalStore(id, patch)
            const g = selectionController.currentGroup
            if (g?.elementData) Object.assign(g.elementData, patch)
        },
        onDelete: (group) => {
            const id = group?.elementData?.id
            if (id) deleteComponentFromLocalStore(id)
            two.remove([group])
            two.update()
        },
    })

    const selectComponentById = (id: string): void => {
        const group = two.scene.children.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c?.elementData?.id === id
        )
        if (!group) return

        selectionController.detach()
        if (selectionController.attach(group)) {
            lastSelectedShape = group
            return
        }

        const shape = group.children?.[0]
        if (!shape) return
        const el = document.getElementById(group.id)
        el?.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true })
        )
        lastSelectedShape = group
        setSelectedComponentInBase(buildToolbarState(group, shape))
        two.update()
    }

    const onSelectComponentRequest = ((
        e: CustomEvent<{ id?: string }>
    ): void => {
        const id = e.detail?.id
        if (id) selectComponentById(id)
    }) as EventListener
    window.addEventListener(SELECT_COMPONENT_EVENT, onSelectComponentRequest)

    const KEY_DELETABLE_HERE: ReadonlySet<string> = new Set([
        'curvedLine',
        'route',
        'area',
        'point',
    ])
    const onOrphanDeleteKeyDown = (e: KeyboardEvent): void => {
        if (e.keyCode !== 8 && e.keyCode !== 46) return
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if ((document.activeElement as HTMLElement | null)?.isContentEditable) {
            return
        }
        if (geoDrawType || selectionController.currentGroup) return
        const grp = lastSelectedShape
        const type = grp?.elementData?.componentType
        if (!type || !KEY_DELETABLE_HERE.has(type)) return
        const id = grp.elementData.id
        if (!id) return
        deleteComponentFromLocalStore(id)
        two.remove([grp])
        two.update()
        lastSelectedShape = null
        setSelectedComponentInBase(null)
    }
    window.addEventListener('keydown', onOrphanDeleteKeyDown, false)

    window.addEventListener('elementRemoved', ((e: CustomEvent) => {
        const id = e.detail?.id
        if (!id) return
        if (selectionController.currentGroup?.elementData?.id === id) {
            selectionController.detach()
        }
        if (lastSelectedShape?.elementData?.id === id) {
            lastSelectedShape = null
        }
        if (activeGroupRef.current?.elementData?.id === id) {
            activeGroupRef.current = null
        }
    }) as EventListener)

    domElement.addEventListener('mousedown', mousedown, false)
    domElement.addEventListener('mousemove', hoverDetectMove, false)
    domElement.addEventListener('dblclick', dblclick, false)
    const canvasWheel = (e: WheelEvent) => {
        if (e.target instanceof Node && domElement.contains(e.target)) {
            mousewheel(e)
        }
    }
    window.addEventListener('wheel', canvasWheel, { passive: false })

    domElement.addEventListener('touchstart', touchstart, { passive: false })
    domElement.addEventListener('touchmove', touchmove, { passive: false })
    domElement.addEventListener('touchend', touchend, false)
    domElement.addEventListener('touchcancel', touchend, false)

    window.addEventListener('groupFocused', ((e: CustomEvent) => {
        activeGroupRef.current = e.detail?.group ?? null
    }) as EventListener)
    window.addEventListener('groupBlurred', () => {
        activeGroupRef.current = null
    })

    function dblclick(e: MouseEvent) {
        if (geoDrawType) {
            finishGeoDraw({ dropLast: true })
            return
        }
        if (isPanMode()) return
        shape = null
        mouse.x = e.clientX
        mouse.y = e.clientY
        let avoidDragging = false
        two.scene.children.forEach((child: any) => {
            if (isLineLikeType(child?.elementData?.componentType)) {
                setArrowEndpointsVisible(child, false)
            }
        })

        const path =
            (e as MouseEvent & { path?: EventTarget[] }).path ||
            (e.composedPath && e.composedPath())
        ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

        if (avoidDragging) {
            shape = {}
        }

        if (!avoidDragging && (!shape || Object.keys(shape).length === 0)) {
            const inDrawMode =
                isPencilModeRef?.current === true ||
                arrowDrawElement !== null ||
                localStorage.getItem(RUBBER_MODE_KEY) === 'true' ||
                localStorage.getItem(TEXT_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(ARROW_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(POINT_PLACE_MODE_KEY) === 'true' ||
                localStorage.getItem(PENDING_SHAPE_TYPE_KEY) !== null
            if (!inDrawMode && createTextAtSurfaceRef?.current) {
                const surfaceCoords = toSurface(e)
                createTextAtSurfaceRef.current(surfaceCoords.x, surfaceCoords.y)
                return
            }
        }

        const showTextInput = (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            group: any,
            componentId: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentMetadata: any
        ) => {
            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            const shapeKind = group?.elementData?.componentType
            const rectChild = group.children.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) =>
                    typeof c.value !== 'string' &&
                    typeof c.width === 'number' &&
                    typeof c.height === 'number'
            )

            const anchorElem =
                rectChild?._renderer?.elem ?? (groupDomElem as Element)
            const screenRect = anchorElem.getBoundingClientRect()

            const textLayer = findShapeTextLayer(group)
            const layerElem = textLayer?._renderer?.elem as
                HTMLElement | undefined
            if (layerElem) layerElem.style.display = 'none'
            two.update()

            const stored = readProperties(group.elementData)
            const rawLiveMeta: Record<string, unknown> =
                Object.keys(stored).length > 0
                    ? stored
                    : (currentMetadata ?? {})
            const liveMeta: Record<string, unknown> = {
                ...rawLiveMeta,
                textFontSize: rawLiveMeta.textFontSize ?? defaultTextSizeValue,
            }
            const { style: textStyle } = shapeTextStyleFromMeta(liveMeta)
            const fontSize = textStyle.size || DEFAULT_TEXT_SIZE
            const sceneScale = two?.scene?.scale || 1
            let cssFontSize = fontSize * sceneScale
            let lineH = Math.ceil(cssFontSize * LINE_HEIGHT_MULTIPLIER)
            let vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `new-text-input-area-${randomId}`
            input.value =
                typeof liveMeta.textContent === 'string'
                    ? liveMeta.textContent
                    : ''
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = `${vertPad}px 8px`
            input.style.color = textStyle.fill || '#000'
            input.style.fontSize = `${cssFontSize}px`
            input.style.fontFamily =
                textStyle.family || DEFAULT_TEXT_FONT_FAMILY
            input.style.fontWeight = String(textStyle.weight ?? 'normal')
            input.style.lineHeight = `${lineH}px`
            input.style.letterSpacing = '0px'
            input.style.textAlign = 'left'
            input.style.position = 'absolute'
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'hidden'
            input.style.whiteSpace = 'pre-wrap'
            input.style.overflowWrap = 'anywhere'
            input.style.boxSizing = 'border-box'
            input.className = 'temp-input-area'

            const startTranslationY = group.translation.y
            const startHeight = rectChild?.height

            let centerX = screenRect.left + screenRect.width / 2
            let centerY = screenRect.top + screenRect.height / 2

            const rectScreen =
                rectChild?._renderer?.elem?.getBoundingClientRect()
            let zoom =
                rectChild && rectScreen && rectChild.width
                    ? rectScreen.width / rectChild.width
                    : 1

            document.getElementById('main-two-root')?.append(input)

            const surfaceW = rectChild?.width || screenRect.width / zoom
            let usableScreenW = Math.max(
                Math.round(usableTextWidth(shapeKind, surfaceW) * zoom),
                Math.ceil(cssFontSize)
            )
            const PAD_X = 8

            const measureSpan = document.createElement('span')
            measureSpan.style.position = 'absolute'
            measureSpan.style.visibility = 'hidden'
            measureSpan.style.display = 'inline-block'
            measureSpan.style.whiteSpace = 'pre-wrap'
            measureSpan.style.overflowWrap = 'anywhere'
            measureSpan.style.width = `${usableScreenW}px`
            measureSpan.style.fontSize = `${cssFontSize}px`
            measureSpan.style.fontFamily =
                textStyle.family || DEFAULT_TEXT_FONT_FAMILY
            measureSpan.style.fontWeight = String(textStyle.weight ?? 'normal')
            measureSpan.style.lineHeight = `${lineH}px`
            measureSpan.style.letterSpacing = '0px'
            measureSpan.style.padding = '0'
            measureSpan.style.boxSizing = 'content-box'
            document.body.appendChild(measureSpan)

            const recomputeGeometry = () => {
                const scale = two?.scene?.scale || 1
                cssFontSize = fontSize * scale
                lineH = Math.ceil(cssFontSize * LINE_HEIGHT_MULTIPLIER)
                vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4
                const liveRect = (
                    rectChild?._renderer?.elem ?? groupDomElem
                )?.getBoundingClientRect()
                if (liveRect) {
                    centerX = liveRect.left + liveRect.width / 2
                    centerY = liveRect.top + liveRect.height / 2
                }
                const rs = rectChild?._renderer?.elem?.getBoundingClientRect()
                zoom =
                    rectChild && rs && rectChild.width
                        ? rs.width / rectChild.width
                        : 1
                const sw =
                    rectChild?.width ||
                    (liveRect ? liveRect.width / zoom : surfaceW)
                usableScreenW = Math.max(
                    Math.round(usableTextWidth(shapeKind, sw) * zoom),
                    Math.ceil(cssFontSize)
                )
                input.style.fontSize = `${cssFontSize}px`
                input.style.lineHeight = `${lineH}px`
                input.style.padding = `${vertPad}px 8px`
                measureSpan.style.fontSize = `${cssFontSize}px`
                measureSpan.style.lineHeight = `${lineH}px`
                measureSpan.style.width = `${usableScreenW}px`
            }

            const placeEditor = () => {
                const val = input.value || 'M'
                measureSpan.textContent = val
                const measuredH = measureSpan.offsetHeight

                const contentWidth = usableScreenW + PAD_X * 2
                const contentHeight = Math.max(
                    measuredH + vertPad * 2,
                    lineH + vertPad * 2
                )

                input.style.width = `${contentWidth}px`
                input.style.height = `${contentHeight}px`
                input.style.left = `${centerX - contentWidth / 2}px`
                input.style.top = `${centerY - contentHeight / 2}px`
            }

            const growShapeToFit = () => {
                if (!rectChild) return
                const val = input.value || 'M'
                measureSpan.textContent = val
                const measuredH = measureSpan.offsetHeight
                const textSurfaceH = measuredH / zoom
                const { h: nextH } = growShapeToFitText(
                    shapeKind,
                    rectChild.width,
                    rectChild.height,
                    0,
                    textSurfaceH
                )
                if (rectChild.height < nextH) {
                    const dh = nextH - rectChild.height
                    rectChild.height = nextH
                    two.update()
                }
            }

            const repositionEditor = () => {
                recomputeGeometry()
                placeEditor()
            }

            const onTextInput = () => {
                growShapeToFit()
                placeEditor()
            }

            repositionEditor()
            two.bind('update', repositionEditor)

            input.addEventListener('input', onTextInput)

            input.focus()

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) {
                        return
                    }
                    event.preventDefault()
                    input.blur()
                }
                if (event.key === 'Escape') {
                    event.preventDefault()
                    input.blur()
                }
            })

            input.addEventListener('blur', () => {
                two.unbind('update', repositionEditor)
                input.removeEventListener('input', onTextInput)
                if (measureSpan.parentNode) {
                    measureSpan.parentNode.removeChild(measureSpan)
                }

                if (layerElem) layerElem.style.display = ''
                if (selectionController.currentGroup) {
                    selectionController.ui.visible = true
                    selectionController.syncToTarget()
                }
                two.update()

                const newContent = input.value

                if (componentId) {
                    const latestMeta = readProperties(group.elementData)
                    const updatedProps = {
                        ...latestMeta,
                        hasText: true,
                        textContent: newContent,
                        textFill: latestMeta.textFill || textStyle.fill,
                        textFontSize: latestMeta.textFontSize || textStyle.size,
                        textFamily: latestMeta.textFamily || textStyle.family,
                        textFontFamily:
                            latestMeta.textFontFamily || textStyle.family,
                        textBaseLine:
                            latestMeta.textBaseLine ||
                            textStyle.baseline ||
                            'middle',
                    }
                    applyShapeText(
                        two,
                        group,
                        shapeKind,
                        rectChild?.width || screenRect.width,
                        updatedProps
                    )
                    two.update()

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const persistPayload: any = {
                        ...setProperties(group.elementData, updatedProps),
                    }
                    if (rectChild) {
                        persistPayload.width = Math.round(rectChild.width)
                        persistPayload.height = Math.round(rectChild.height)
                    }
                    if (group.translation.y !== startTranslationY) {
                        Object.assign(
                            persistPayload,
                            setGeometry(
                                { metadata: persistPayload.metadata },
                                pointGeometry(
                                    Math.round(group.translation.x),
                                    Math.round(group.translation.y)
                                )
                            )
                        )
                    }
                    updateComponentBulkPropertiesInLocalStore(
                        componentId,
                        persistPayload
                    )
                    if (group.elementData) {
                        group.elementData.metadata = persistPayload.metadata
                        if (rectChild) {
                            group.elementData.width = persistPayload.width
                            group.elementData.height = persistPayload.height
                        }
                        if (persistPayload.y !== undefined) {
                            group.elementData.y = persistPayload.y
                        }
                    }

                    if (
                        persistPayload.y !== undefined ||
                        (rectChild && rectChild.height !== startHeight)
                    ) {
                        two.update()
                    }
                }

                input.remove()
            })
        }
    }

    function getEraserSize(): EraserSize {
        const stored = localStorage.getItem(
            ERASER_SIZE_KEY
        ) as EraserSize | null
        return stored && stored in ERASER_SIZE_RADIUS
            ? stored
            : DEFAULT_ERASER_SIZE
    }

    function getEraserRadius(): number {
        return ERASER_SIZE_RADIUS[getEraserSize()]
    }

    const eraserTrail = createEraserTrail(
        two,
        () => ERASER_DOT_PX[getEraserSize()],
        () => zui.scale || 1
    )

    function componentElementFor(el: Element): Element | null {
        let target: Element | null = el
        while (target && target !== document.body) {
            if (target.getAttribute?.('data-component-id')) return target
            target = target.parentElement
        }
        return null
    }

    function componentIdAtPoint(
        x: number,
        y: number,
        skipImages: boolean
    ): string | null {
        const stack = skipImages
            ? document.elementsFromPoint(x, y)
            : [document.elementFromPoint(x, y)]
        for (const el of stack) {
            if (!el) continue
            const component = componentElementFor(el)
            if (!component) continue
            if (
                skipImages &&
                component.getAttribute('data-component-type') ===
                    IMAGE_COMPONENT
            ) {
                continue
            }
            return component.getAttribute('data-component-id')
        }
        return null
    }

    const ERASER_SAMPLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

    function eraseElementAtPoint(x: number, y: number, keepImages: boolean) {
        const radius = getEraserRadius()
        const points: Array<[number, number]> =
            radius > 0
                ? [
                      [x, y],
                      ...ERASER_SAMPLE_ANGLES.map((deg): [number, number] => {
                          const rad = (deg * Math.PI) / 180
                          return [
                              x + radius * Math.cos(rad),
                              y + radius * Math.sin(rad),
                          ]
                      }),
                  ]
                : [[x, y]]

        const componentIds = new Set<string>()
        for (const [px, py] of points) {
            const id = componentIdAtPoint(px, py, keepImages)
            if (id && !pendingDeletionSet.has(id)) componentIds.add(id)
        }
        if (componentIds.size === 0) return

        for (const componentId of componentIds) {
            eraseComponent(componentId)
        }
    }

    function eraseComponent(componentId: string) {
        const group = two.scene.children.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => c?.elementData?.id === componentId
        )
        if (!group) return

        pendingDeletionSet.add(componentId)
        group.opacity = 0.3
        two.update()

        setTimeout(() => {
            two.remove([group])
            two.update()
            deleteComponentFromLocalStore(componentId)
            pendingDeletionSet.delete(componentId)
        }, 1000)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastHoveredCircleGroup: any = null

    const hoverCircle = two.makeCircle(0, 0, 6)
    hoverCircle.fill = HOVER_COLOR
    hoverCircle.noStroke()
    hoverCircle.opacity = 0

    function hoverDetectMove(e: MouseEvent) {
        if (isWheeling) return

        hoverPendingEvent = e
        if (hoverFrame !== null) return

        hoverFrame = requestAnimationFrame(() => {
            hoverFrame = null
            const pendingEvent = hoverPendingEvent
            hoverPendingEvent = null
            if (pendingEvent) runHoverDetect(pendingEvent)
        })
    }

    function runHoverDetect(e: MouseEvent) {
        if (
            isMousePanning ||
            geoDrawType ||
            localStorage.getItem(POINT_PLACE_MODE_KEY) === 'true'
        ) {
            return
        }
        if (!isSelectPanMode(isPencilModeRef.current)) {
            if (lastHoveredCircleGroup) {
                hoverCircle.opacity = 0
                scheduleRender(two)
                lastHoveredCircleGroup = null
            }
            return
        }
        if (!getDragScansEnabled()) {
            if (lastHoveredCircleGroup) {
                hoverCircle.opacity = 0
                scheduleRender(two)
                lastHoveredCircleGroup = null
            }
            return
        }

        const worldPos = toSurface(e)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let found: any = null
        let foundWx = 0
        let foundWy = 0

        for (const child of two.scene.children) {
            if (!isLineLikeType(child?.elementData?.componentType)) continue
            const gx = child.translation.x
            const gy = child.translation.y
            for (const circleGroup of [child.children[1], child.children[2]]) {
                if (!circleGroup) continue
                const wx = gx + circleGroup.translation.x
                const wy = gy + circleGroup.translation.y
                const dist = Math.sqrt(
                    (worldPos.x - wx) ** 2 + (worldPos.y - wy) ** 2
                )
                if (dist < HOVER_THRESHOLD) {
                    found = circleGroup
                    foundWx = wx
                    foundWy = wy
                    break
                }
            }
            if (found) break
        }

        if (found) {
            const moved =
                hoverCircle.translation.x !== foundWx ||
                hoverCircle.translation.y !== foundWy
            hoverCircle.translation.x = foundWx
            hoverCircle.translation.y = foundWy
            if (found !== lastHoveredCircleGroup) hoverCircle.opacity = 1
            if (moved || found !== lastHoveredCircleGroup) scheduleRender(two)
        } else if (lastHoveredCircleGroup) {
            hoverCircle.opacity = 0
            scheduleRender(two)
        }
        lastHoveredCircleGroup = found ?? null
    }

    function beginMousePan(e: MouseEvent) {
        isMousePanning = true
        mousePanLastX = e.clientX
        mousePanLastY = e.clientY
        const root = document.getElementById('main-two-root')
        if (root) root.classList.add('panning')
        window.addEventListener('mousemove', mousemove, false)
        window.addEventListener('mouseup', mouseup, false)
    }

    function mousedown(e: MouseEvent) {
        if (isPanMode()) {
            beginMousePan(e)
            return
        }

        const lastAddedElementId = localStorage.getItem(
            LAST_ADDED_ELEMENT_ID_KEY
        )

        const inCreateMode =
            isDrawing === true ||
            localStorage.getItem(ARROW_DRAW_MODE_KEY) === 'true' ||
            localStorage.getItem(TEXT_DRAW_MODE_KEY) === 'true' ||
            localStorage.getItem(POINT_PLACE_MODE_KEY) === 'true' ||
            localStorage.getItem(DRAW_MODE_KEY) === 'true' ||
            localStorage.getItem(PENDING_SHAPE_TYPE_KEY) !== null

        if (inCreateMode) {
            if (selectionController.currentGroup) selectionController.detach()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            two.scene.children.forEach((child: any) => {
                if (isLineLikeType(child?.elementData?.componentType)) {
                    setArrowEndpointsVisible(child, false)
                }
            })
        } else if (selectionController.currentGroup) {
            const hit = selectionController.hitTest(e.clientX, e.clientY)
            if (hit) {
                selectionController.beginInteraction(e, hit)
                return
            }
        }

        if (
            (e?.srcElement as Element & { lastChild?: Element })?.lastChild
                ?.id === 'two-0'
        ) {
            let evt = new CustomEvent('clearSelector', {})
            window.dispatchEvent(evt)
            setSelectedComponentInBase(null)
        }

        scenario = SCENARIO_DEFAULT

        if (drawPreviewActive) {
            removeDrawPreview()
            drawPreviewActive = false
        }
        if (cssMoveActive) clearCssMove()
        cssMoveRejected = false
        if (drawOrigin) {
            drawOrigin = null
            drawCurrentCoords = null
            drawShapeType = null
            drawShapeProps = null
            domElement.removeEventListener('mousemove', mousemove, false)
            domElement.removeEventListener('mouseup', mouseup, false)
        }

        if (isDrawing === true) {
            scenario = SCENARIO_PENCIL_MODE
        }

        const arrowDrawMode = localStorage.getItem(ARROW_DRAW_MODE_KEY)
        const textDrawMode = localStorage.getItem(TEXT_DRAW_MODE_KEY)
        const pendingShapeType = localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
        const rubberMode = localStorage.getItem(RUBBER_MODE_KEY)
        const geoPointPlaceMode = localStorage.getItem(POINT_PLACE_MODE_KEY)
        const geoDrawMode = localStorage.getItem(DRAW_MODE_KEY)
        if (rubberMode === 'true') {
            scenario = SCENARIO_RUBBER_MODE
        } else if (arrowDrawMode === 'true') {
            scenario = SCENARIO_ARROW_DRAW
        } else if (textDrawMode === 'true') {
            scenario = SCENARIO_TEXT_DRAW
        } else if (geoPointPlaceMode === 'true') {
            scenario = SCENARIO_GEO_POINT
        } else if (geoDrawMode === 'true') {
            scenario = SCENARIO_GEO_DRAW
        } else if (pendingShapeType !== null) {
            scenario = SCENARIO_DRAW_SHAPE
        } else if (lastAddedElementId !== null) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW: {
                const surfaceCoords = toSurface(e)
                const arrowId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
                localStorage.removeItem(ARROW_DRAW_MODE_KEY)

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                setRootCursor('crosshair')

                pollUntilElement(
                    two,
                    arrowId ?? '',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (el: any) => {
                        arrowDrawElement = el
                        arrowDrawElement.position.x = surfaceCoords.x
                        arrowDrawElement.position.y = surfaceCoords.y

                        const line = arrowDrawElement.children[0]
                        const pointCircle1Group = arrowDrawElement.children[1]
                        const pointCircle2Group = arrowDrawElement.children[2]

                        updateX1Y1Vertices(
                            Two,
                            line,
                            0,
                            0,
                            pointCircle1Group,
                            two
                        )
                        updateX2Y2Vertices(
                            Two,
                            line,
                            0,
                            0,
                            pointCircle2Group,
                            two
                        )
                        two.update()
                    },
                    { maxRetries: 30 }
                )

                break
            }
            case SCENARIO_TEXT_DRAW: {
                const surfaceCoords = toSurface(e)
                const textId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)

                textDrawElement = two.scene.children.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (child: any) => child?.elementData?.id === textId
                )

                if (textDrawElement && textId) {
                    textDrawElement.position.x = surfaceCoords.x
                    textDrawElement.position.y = surfaceCoords.y
                    two.update()

                    updateComponentVertices(
                        textId,
                        surfaceCoords.x,
                        surfaceCoords.y
                    )
                }

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
                localStorage.removeItem(TEXT_DRAW_MODE_KEY)

                domElement.addEventListener('mouseup', mouseup, false)
                setRootCursor('auto')
                break
            }
            case SCENARIO_GEO_POINT: {
                const surfaceCoords = toSurface(e)
                const pointId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
                localStorage.removeItem(POINT_PLACE_MODE_KEY)

                if (pointId) {
                    pollUntilElement(
                        two,
                        pointId,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (el: any) => {
                            el.position.x = surfaceCoords.x
                            el.position.y = surfaceCoords.y
                            two.update()
                            updateComponentVertices(
                                pointId,
                                surfaceCoords.x,
                                surfaceCoords.y
                            )
                            const armed = readArmedPreset('point')
                            if (armed) {
                                applyPresetToElement(
                                    {
                                        twoJSInstance: two,
                                        updateComponentBulkPropertiesInLocalStore,
                                    },
                                    pointId,
                                    armed,
                                    true
                                )
                            }
                            window.dispatchEvent(
                                new CustomEvent('triggerTextInput', {
                                    detail: { elementId: pointId },
                                })
                            )
                        },
                        { maxRetries: 30 }
                    )
                }

                setSelectedComponentInBase(null)
                setPointerElement('pointer', { select: true })
                setRootCursor('auto')
                break
            }
            case SCENARIO_GEO_DRAW: {
                const surfaceCoords = toSurface(e)
                if (!geoDrawType) {
                    geoDrawType = localStorage.getItem(DRAW_TYPE_KEY) as
                        'area' | 'route' | null
                    geoDrawProps = JSON.parse(
                        localStorage.getItem(DRAW_PROPS_KEY) ?? 'null'
                    )
                    geoArmedStyle = isLegendPresetType(geoDrawType)
                        ? armedPresetPatch(geoDrawType)
                        : null
                    geoVertices = []
                    routeSnapper =
                        geoDrawType === 'route' && getRouteSnapEnabled()
                            ? createRouteSnapper({
                                  getScale: () =>
                                      zui.scale || two.scene.scale || 1,
                              })
                            : null
                    domElement.addEventListener('mousemove', mousemove, false)
                }
                if (geoDrawType) {
                    commitGeoClick(surfaceCoords, e.altKey)
                    setRootCursor('crosshair')
                }
                break
            }
            case SCENARIO_DRAW_SHAPE: {
                const surfaceCoords = toSurface(e)
                drawOrigin = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawCurrentCoords = { x: surfaceCoords.x, y: surfaceCoords.y }
                drawShapeType = localStorage.getItem(PENDING_SHAPE_TYPE_KEY)
                drawShapeProps = JSON.parse(
                    localStorage.getItem(PENDING_SHAPE_PROPS_KEY) ?? 'null'
                )

                drawShapeProps = {
                    ...(drawShapeProps ?? {}),
                    ...(isLegendPresetType(drawShapeType)
                        ? armedPresetPatch(drawShapeType)
                        : {}),
                }

                localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
                localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)

                if (
                    drawShapeType === 'circle' ||
                    drawShapeType === 'rectangle' ||
                    drawShapeType === 'diamond'
                ) {
                    drawScreenOriginX = e.clientX
                    drawScreenOriginY = e.clientY
                    drawPreviewActive = true
                    createDrawPreview(drawShapeType as DrawPreviewKind, {
                        fill: drawShapeProps?.fill || '#fff',
                        stroke: drawShapeProps?.stroke || SHAPE_DEFAULT_STROKE,
                        linewidth: drawShapeProps?.linewidth || 1,
                        opacity:
                            typeof drawShapeProps?.opacity === 'number'
                                ? drawShapeProps.opacity
                                : DEFAULT_PREVIEW_OPACITY,
                    })
                    updateDrawPreview(
                        e.clientX,
                        e.clientY,
                        e.clientX,
                        e.clientY
                    )
                }

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)
                setRootCursor('crosshair')
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                domElement.addEventListener('mousemove', mousemove, false)

                const surfaceCoords = toSurface(e)

                let twoJSElement = two.scene.children.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (child: any) =>
                        child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position && lastAddedElementId) {
                    twoJSElement.position.x = surfaceCoords.x
                    twoJSElement.position.y = surfaceCoords.y

                    two.update()

                    updateComponentVertices(
                        lastAddedElementId,
                        surfaceCoords.x,
                        surfaceCoords.y
                    )

                    lastPlacedElement = twoJSElement
                }

                localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)

                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                setRootCursor('auto')
                break
            case SCENARIO_PENCIL_MODE: {
                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)

                isPencilStrokeActive = true

                pencilGroup = two.makeGroup()
                pencilRawPoints = []
                lastPencilLinewidth = defaultLinewidthValue

                const startCoords = toSurface(e)
                lastPencilPoint = { x: startCoords.x, y: startCoords.y }
                lastPencilTime = performance.now()
                pencilRawPoints.push({
                    x: startCoords.x,
                    y: startCoords.y,
                    lw: lastPencilLinewidth,
                })

                pencilPreviewOrigin = { x: startCoords.x, y: startCoords.y }
                pencilGroup.translation.set(startCoords.x, startCoords.y)

                pencilPath = two.makePath()
                pencilPath.translation.set(0, 0)
                pencilPath.vertices.push(new Two.Anchor(0, 0))
                pencilPath.noFill()
                pencilPath.stroke = defaultStrokeColorValue
                pencilPath.linewidth = pencilPreviewLinewidth()
                pencilPath.cap = 'round'
                pencilPath.join = 'round'
                pencilPath.closed = false
                applyStrokeDashes(
                    pencilPath,
                    defaultStrokeTypeValue,
                    zui.scale || two.scene.scale || 1
                )
                pencilGroup.add(pencilPath)
                break
            }
            case SCENARIO_RUBBER_MODE: {
                domElement.addEventListener('mousemove', mousemove, false)
                domElement.addEventListener('mouseup', mouseup, false)
                eraseElementAtPoint(e.clientX, e.clientY, e.shiftKey)
                {
                    const p = toSurface(e)
                    eraserTrail.addPoint(p.x, p.y)
                }
                break
            }
            default:
                shape = null
                mouse.x = e.clientX
                mouse.y = e.clientY
                let avoidDragging = false
                let isGroupSelector = false

                const hoveredEndpointGroup = lastHoveredCircleGroup

                lastHoveredCircleGroup = null
                hoverCircle.opacity = 0
                two.scene.children.forEach((child: any) => {
                    if (isLineLikeType(child?.elementData?.componentType)) {
                        setArrowEndpointsVisible(child, false)
                    }
                })

                const path =
                    (e as MouseEvent & { path?: EventTarget[] }).path ||
                    (e.composedPath && e.composedPath())
                ;({ shape, avoidDragging } = resolveShapeFromPath(path, two))

                if (shape === null && hoveredEndpointGroup) {
                    const parentArrow = two.scene.children.find(
                        (child: any) =>
                            isLineLikeType(child?.elementData?.componentType) &&
                            (child.children[1] === hoveredEndpointGroup ||
                                child.children[2] === hoveredEndpointGroup)
                    )
                    if (parentArrow) {
                        setArrowEndpointsVisible(parentArrow, true)
                        shape = parentArrow
                    }
                }

                if (shape?.elementData?.id) {
                    lastSelectedShape = shape
                }

                if (avoidDragging) {
                    shape = {}
                }

                if (shape === null) {
                    lastSelectedShape = null
                    selectionController.detach()
                    window.dispatchEvent(new CustomEvent('clearSelector', {}))
                    setSelectedComponentInBase(null)
                    const activeTextInput =
                        document.querySelector('.temp-input-area')

                    if (activeTextInput) {
                        shape = {}
                        avoidDragging = true
                    } else if (!e.shiftKey) {
                        beginMousePan(e)
                        return
                    } else {
                        pendingGroupSelectorOrigin = toSurface(e)
                        mouse.copy(pendingGroupSelectorOrigin)
                        domElement.addEventListener(
                            'mousemove',
                            mousemove,
                            false
                        )
                        domElement.addEventListener('mouseup', mouseup, false)
                        return
                    }
                }

                let controllerClaimedGesture = false
                let controllerHandledSelection = false
                if (
                    !avoidDragging &&
                    shape &&
                    !isGroupSelector &&
                    selectionController.canHandle(shape)
                ) {
                    selectionController.attach(shape, shape.children[0])
                    controllerHandledSelection = true
                    const hit = selectionController.hitTest(
                        e.clientX,
                        e.clientY
                    )
                    if (hit) {
                        selectionController.beginInteraction(e, hit)
                        controllerClaimedGesture = true
                    }
                }

                if (controllerClaimedGesture) {
                    two.update()
                    return
                }

                if (!avoidDragging) {
                    shape.elementData = {
                        ...shape?.elementData,
                        isGroupSelector: isGroupSelector,
                        prevX: parseInt(shape.translation.x),
                        prevY: parseInt(shape.translation.y),
                    }

                    const shapeEl = document.getElementById(shape.id)
                    if (shapeEl) {
                        const rect = shapeEl.getBoundingClientRect()
                        dragging =
                            mouse.x > rect.left &&
                            mouse.x < rect.right &&
                            mouse.y > rect.top &&
                            mouse.y < rect.bottom

                        domElement.addEventListener(
                            'mousemove',
                            mousemove,
                            false
                        )
                        domElement.addEventListener('mouseup', mouseup, false)
                    }
                }

                if (
                    !avoidDragging &&
                    (shape?.elementData?.isLineCircle ||
                        isLineLikeType(shape?.elementData?.componentType))
                ) {
                    document
                        .querySelectorAll<HTMLElement>(
                            '.dragger-picker:not(.is-line-circle)' +
                                ':not(.is-vertex-handle)'
                        )
                        .forEach((el) => {
                            el.style.pointerEvents = 'none'
                        })
                }

                if (
                    !avoidDragging &&
                    !shape.elementData.isGroupSelector &&
                    !controllerHandledSelection
                ) {
                    selectionController.detach()

                    const isLineCircle =
                        shape?.elementData?.isLineCircle === true
                    const groupForToolbar = isLineCircle
                        ? shape.elementData.parentData
                        : shape
                    const shapeForToolbar = isLineCircle
                        ? shape.elementData.lineData
                        : shape.children[0]

                    if (
                        isLineLikeType(
                            groupForToolbar?.elementData?.componentType
                        )
                    ) {
                        setArrowEndpointsVisible(groupForToolbar, true)
                    }

                    const textChild = getShapeTextNodes(groupForToolbar)[0]

                    let componentInternalState = {
                        element: {
                            [shapeForToolbar.id]: shapeForToolbar,
                            [groupForToolbar.id]: groupForToolbar,
                        },
                        group: {
                            id: groupForToolbar.id,
                            data: groupForToolbar,
                        },
                        shape: {
                            type: groupForToolbar.elementData.componentType,
                            id: shapeForToolbar.id,
                            data: shapeForToolbar,
                        },
                        text: {
                            data: textChild || {},
                        },
                        icon: {
                            data: {},
                        },
                    }
                    setSelectedComponentInBase(componentInternalState)
                }

                two.update()
        }
    }

    function mousemove(e: MouseEvent) {
        let didCssMove = false
        if (isMousePanning) {
            const dx = e.clientX - mousePanLastX
            const dy = e.clientY - mousePanLastY
            mousePanLastX = e.clientX
            mousePanLastY = e.clientY
            if (dx !== 0 || dy !== 0) {
                zui.translateSurface(dx, dy)
                cullOnCameraChange()
                scheduleRender(two)
                onCameraChangeRef?.current?.({
                    scale: two.scene.scale,
                    tx: two.scene.translation.x,
                    ty: two.scene.translation.y,
                })
            }
            return
        }

        if (geoDrawType) {
            const s = toSurface(e)
            if (routeSnapper?.hasAnchor() && !e.altKey) {
                const scale = zui.scale || two.scene.scale || 1
                const moved = lastRouteProbe
                    ? Math.hypot(s.x - lastRouteProbe.x, s.y - lastRouteProbe.y)
                    : Infinity
                if (
                    routeSnapPending &&
                    moved * scale < ROUTE_SNAP_MIN_MOVE_PX
                ) {
                    return
                }
                lastRouteProbe = { x: s.x, y: s.y }
                const preview = routeSnapper.preview(s)
                if (preview) {
                    updateRouteSnapPreview(preview)
                    if (geoPreviewLine) {
                        geoPreviewGroup?.remove(geoPreviewLine)
                        geoPreviewLine = null
                    }
                    two.update()
                    return
                }
            }
            clearRouteSnapPreview()
            updateGeoPreview(s.x, s.y)
            return
        }

        const lastAddedElementId = localStorage.getItem(
            LAST_ADDED_ELEMENT_ID_KEY
        )

        if (
            lastAddedElementId !== null &&
            localStorage.getItem(ARROW_DRAW_MODE_KEY) !== 'true' &&
            localStorage.getItem(TEXT_DRAW_MODE_KEY) !== 'true'
        ) {
            scenario = SCENARIO_JUST_ADDED_ELEMENT
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW:
                if (arrowDrawElement) {
                    const surfaceCoords = toSurface(e)
                    let relX = surfaceCoords.x - arrowDrawElement.position.x
                    let relY = surfaceCoords.y - arrowDrawElement.position.y

                    if (e.shiftKey) {
                        if (Math.abs(relY) < Math.abs(relX)) {
                            relY = 0
                        } else {
                            relX = 0
                        }
                    }

                    const line = arrowDrawElement.children[0]
                    const pointCircle2Group = arrowDrawElement.children[2]

                    updateX2Y2Vertices(
                        Two,
                        line,
                        relX,
                        relY,
                        pointCircle2Group,
                        two
                    )
                }
                break
            case SCENARIO_DRAW_SHAPE: {
                const surfaceCoordsMove = toSurface(e)
                drawCurrentCoords = {
                    x: surfaceCoordsMove.x,
                    y: surfaceCoordsMove.y,
                }

                if (drawPreviewActive) {
                    if (isRadialDraw(drawShapeType)) {
                        const radius = Math.hypot(
                            e.clientX - drawScreenOriginX,
                            e.clientY - drawScreenOriginY
                        )
                        updateDrawPreview(
                            drawScreenOriginX - radius,
                            drawScreenOriginY - radius,
                            drawScreenOriginX + radius,
                            drawScreenOriginY + radius
                        )
                    } else {
                        updateDrawPreview(
                            drawScreenOriginX,
                            drawScreenOriginY,
                            e.clientX,
                            e.clientY
                        )
                    }
                }
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT: {
                const sc = toSurface(e)

                let twoJSElement = two.scene.children.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (child: any) =>
                        child?.elementData?.id === lastAddedElementId
                )

                if (twoJSElement?.position) {
                    twoJSElement.position.x = sc.x
                    twoJSElement.position.y = sc.y

                    two.update()
                }
                break
            }
            case SCENARIO_PENCIL_MODE: {
                const pencilCoords = toSurface(e)

                const pdx = pencilCoords.x - lastPencilPoint.x
                const pdy = pencilCoords.y - lastPencilPoint.y
                const pDist = Math.sqrt(pdx * pdx + pdy * pdy)
                if (pDist < PENCIL_DISTANCE_THROTTLE) break

                const now = performance.now()
                const timeDelta = now - lastPencilTime
                const velocity = timeDelta > 0 ? pDist / timeDelta : 0
                const targetLw = velocityToLinewidth(
                    velocity,
                    defaultLinewidthValue
                )
                const smoothedLw = smoothLinewidth(
                    lastPencilLinewidth ?? defaultLinewidthValue,
                    targetLw,
                    0.3
                )

                pencilRawPoints.push({
                    x: pencilCoords.x,
                    y: pencilCoords.y,
                    lw: smoothedLw,
                })

                if (pencilPath) {
                    const smoothedPreview =
                        pencilRawPoints.length > 2
                            ? chaikinSmooth(pencilRawPoints, 2)
                            : pencilRawPoints
                    pencilPath.vertices.splice(0)
                    const { x: ox, y: oy } = pencilPreviewOrigin
                    smoothedPreview.forEach((pt) => {
                        pencilPath.vertices.push(
                            new Two.Anchor(pt.x - ox, pt.y - oy)
                        )
                    })
                }

                lastPencilPoint = { x: pencilCoords.x, y: pencilCoords.y }
                lastPencilTime = now
                lastPencilLinewidth = smoothedLw

                two.update()
                break
            }
            case SCENARIO_RUBBER_MODE: {
                eraseElementAtPoint(e.clientX, e.clientY, e.shiftKey)
                const p = toSurface(e)
                eraserTrail.addPoint(p.x, p.y)
                break
            }
            default:

                if (pendingGroupSelectorOrigin && !shape?.elementData) {
                    const area = two.makePath(0, 0, 10, 0, 10, 10, 0, 10)
                    area.fill = getGroupFill()
                    area.opacity = 1
                    area.linewidth = 1
                    area.dashes[0] = 4
                    area.stroke = SELECTION_PREVIEW_STROKE
                    const newSelectorGroup = two.makeGroup(area)
                    newSelectorGroup.position.copy(pendingGroupSelectorOrigin)
                    shape = newSelectorGroup
                    shape.elementData = {
                        isGroupSelector: true,
                        prevX: parseInt(shape.translation.x),
                        prevY: parseInt(shape.translation.y),
                    }
                    dragging = true
                    pendingGroupSelectorOrigin = null
                    two.update()
                }

                if (isResizeEvent === true) {
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                    isResizeEvent = false
                } else if (
                    shape?.id &&
                    document
                        .getElementById(shape.id)
                        ?.hasAttribute('data-resize')
                ) {
                    isResizeEvent = true
                    domElement.removeEventListener(
                        'mousemove',
                        mousemove,
                        false
                    )
                    domElement.removeEventListener('mouseup', mouseup, false)
                } else if (shape?.id || shape?.elementData) {
                    let dx = e.clientX - mouse.x
                    let dy = e.clientY - mouse.y

                    if (
                        dragging &&
                        shape.id !== 'two-0' &&
                        !shape.elementData.isGroupSelector
                    ) {
                        if (shape?.lineData) {
                            let line = shape?.lineData

                            if (shape.direction === 'left') {
                                if (e.shiftKey == true) {
                                    let x1 = (line.vertices[0].x +=
                                        dx / zui.scale)
                                    let y1 = (line.vertices[0].y +=
                                        dy / zui.scale)
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape,
                                        two
                                    )

                                    let x2 = line.vertices[1].x
                                    let y2 = y1
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape.siblingCircle,
                                        two
                                    )
                                } else {
                                    let x1 = (line.vertices[0].x +=
                                        dx / zui.scale)
                                    let y1 = (line.vertices[0].y +=
                                        dy / zui.scale)
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape,
                                        two
                                    )
                                }
                            } else if (shape.direction === 'right') {
                                if (e.shiftKey === true) {
                                    let x2 = (line.vertices[1].x +=
                                        dx / zui.scale)
                                    let y2 = (line.vertices[1].y +=
                                        dy / zui.scale)
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape,
                                        two
                                    )

                                    let x1 = line.vertices[0].x
                                    let y1 = y2
                                    updateX1Y1Vertices(
                                        Two,
                                        line,
                                        x1,
                                        y1,
                                        shape.siblingCircle,
                                        two
                                    )
                                } else {
                                    let x2 = (line.vertices[1].x +=
                                        dx / zui.scale)
                                    let y2 = (line.vertices[1].y +=
                                        dy / zui.scale)
                                    updateX2Y2Vertices(
                                        Two,
                                        line,
                                        x2,
                                        y2,
                                        shape,
                                        two
                                    )
                                }
                            }
                        }
                        else {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const node = (shape as any)._renderer?.elem as
                                SVGGraphicsElement | undefined
                            const cheapEligible = !!node && !shape.rotation
                            if (
                                cheapEligible &&
                                !cssMoveActive &&
                                !cssMoveRejected
                            ) {
                            }
                            const eligible = cheapEligible && !cssMoveRejected
                            if (eligible) {
                                if (!cssMoveActive) {
                                    cssMoveActive = true
                                    cssMoveEl = shape
                                    cssMoveNode = node!
                                    cssMoveBaseX = shape.position.x
                                    cssMoveBaseY = shape.position.y
                                    cssMoveLastDxWorld = 0
                                    cssMoveLastDyWorld = 0
                                    cssMoveChrome =
                                        selectionController.getChromeDragHandle(
                                            shape
                                        )
                                }
                                cssMoveLastDxWorld += dx / zui.scale
                                cssMoveLastDyWorld += dy / zui.scale
                                cssMoveNode!.setAttribute(
                                    'transform',
                                    cssMoveTransform(
                                        cssMoveBaseX + cssMoveLastDxWorld,
                                        cssMoveBaseY + cssMoveLastDyWorld,
                                        shape.scale
                                    )
                                )
                                if (cssMoveChrome) {
                                    cssMoveChrome.node.setAttribute(
                                        'transform',
                                        cssMoveTransform(
                                            cssMoveChrome.baseX +
                                                cssMoveLastDxWorld,
                                            cssMoveChrome.baseY +
                                                cssMoveLastDyWorld
                                        )
                                    )
                                }
                                didCssMove = true
                            } else {
                                shape.position.x += dx / zui.scale
                                shape.position.y += dy / zui.scale
                            }
                        }
                    } else if (shape.elementData.isGroupSelector) {
                        let area = shape.children[0]
                        const m = toSurface(e)
                        mouse.copy(m)

                        const width = mouse.x - shape.position.x
                        const height = mouse.y - shape.position.y

                        area.vertices[1].x = width
                        area.vertices[2].x = width
                        area.vertices[2].y = height
                        area.vertices[3].y = height

                        two.update()
                    }
                    mouse.set(e.clientX, e.clientY)
                    if (!didCssMove) two.update()
                }
        }
    }

    function mouseup(e: MouseEvent) {
        if (cssMoveActive) {
            const el = cssMoveEl
            const finalX = cssMoveBaseX + cssMoveLastDxWorld
            const finalY = cssMoveBaseY + cssMoveLastDyWorld
            clearCssMove()
            if (el) {
                el.position.x = finalX
                el.position.y = finalY
                selectionController.syncToTarget()
                two.update()
            }
        }
        if (isMousePanning) {
            isMousePanning = false
            const root = document.getElementById('main-two-root')
            if (root) root.classList.remove('panning')
            window.removeEventListener('mousemove', mousemove, false)
            window.removeEventListener('mouseup', mouseup, false)
            scheduleViewportSave()
            return
        }

        switch (scenario) {
            case SCENARIO_ARROW_DRAW: {
                if (arrowDrawElement) {
                    const line = arrowDrawElement.children[0]
                    const finalX1 = parseInt(line.vertices[0].x)
                    const finalY1 = parseInt(line.vertices[0].y)
                    const finalX2 = parseInt(line.vertices[1].x)
                    const finalY2 = parseInt(line.vertices[1].y)

                    arrowDrawElement.elementData.x = parseInt(
                        arrowDrawElement.position.x
                    )
                    arrowDrawElement.elementData.y = parseInt(
                        arrowDrawElement.position.y
                    )

                    const newShapeData = {
                        id: arrowDrawElement.elementData.id,
                        prevX: -9999,
                        prevY: -9999,
                        isLineCircle: true,
                        parentData: arrowDrawElement,
                        data: {
                            x: parseInt(arrowDrawElement.position.x),
                            y: parseInt(arrowDrawElement.position.y),
                            x1: finalX1,
                            y1: finalY1,
                            x2: finalX2,
                            y2: finalY2,
                        },
                    }

                    updateToGlobalState(newShapeData, {})

                    const arrowGroup = arrowDrawElement
                    const arrowLineShape = arrowGroup.children[0]
                    setArrowEndpointsVisible(arrowGroup, true)
                    lastSelectedShape = arrowGroup
                    setSelectedComponentInBase({
                        element: {
                            [arrowLineShape.id]: arrowLineShape,
                            [arrowGroup.id]: arrowGroup,
                        },
                        group: { id: arrowGroup.id, data: arrowGroup },
                        shape: {
                            type: arrowGroup.elementData?.componentType,
                            id: arrowLineShape.id,
                            data: arrowLineShape,
                        },
                        text: { data: {} },
                        icon: { data: {} },
                    })
                    two.update()
                } else {
                    setSelectedComponentInBase(null)
                }

                arrowDrawTailShapeId = null
                arrowDrawTailPort = null

                arrowDrawElement = null
                setArrowDrawModeOff()
                setPointerElement('pointer')
                setRootCursor('auto')
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_TEXT_DRAW: {
                if (textDrawElement && textDrawElement.children?.[0]) {
                    const textInputEvent = new CustomEvent('triggerTextInput', {
                        detail: { elementId: textDrawElement.elementData.id },
                    })
                    window.dispatchEvent(textInputEvent)

                    const groupEl = textDrawElement
                    const shapeEl = textDrawElement.children[0]
                    const componentInternalState = {
                        element: {
                            [shapeEl.id]: shapeEl,
                            [groupEl.id]: groupEl,
                        },
                        group: { id: groupEl.id, data: groupEl },
                        shape: {
                            type: groupEl.elementData?.componentType,
                            id: shapeEl.id,
                            data: shapeEl,
                        },
                        text: { data: {} },
                        icon: { data: {} },
                    }
                    setSelectedComponentInBase(null)
                }

                textDrawElement = null
                setTextDrawModeOff()
                setPointerElement('pointer', { select: true })
                setRootCursor('auto')
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_DRAW_SHAPE: {
                const MIN_SIZE = 20
                const endCoords = drawCurrentCoords || drawOrigin
                let finalWidth: number
                let finalHeight: number
                let finalCenterX: number
                let finalCenterY: number
                if (isRadialDraw(drawShapeType)) {
                    finalWidth = Math.round(
                        Math.max(
                            2 *
                                Math.hypot(
                                    endCoords.x - drawOrigin.x,
                                    endCoords.y - drawOrigin.y
                                ),
                            MIN_SIZE
                        )
                    )
                    finalHeight = finalWidth
                    finalCenterX = Math.round(drawOrigin.x)
                    finalCenterY = Math.round(drawOrigin.y)
                } else {
                    finalWidth = Math.round(
                        Math.max(Math.abs(endCoords.x - drawOrigin.x), MIN_SIZE)
                    )
                    finalHeight = Math.round(
                        Math.max(Math.abs(endCoords.y - drawOrigin.y), MIN_SIZE)
                    )
                    finalCenterX = Math.round((drawOrigin.x + endCoords.x) / 2)
                    finalCenterY = Math.round((drawOrigin.y + endCoords.y) / 2)
                }

                drawPreviewActive = false

                const finalId = generateUUID()
                const finalShapeData = {
                    ...drawShapeProps,
                    id: finalId,
                    ...(moveGeometryTo(
                        drawShapeProps,
                        finalCenterX,
                        finalCenterY
                    ) ?? {
                        ...geometryFields(
                            pointGeometry(finalCenterX, finalCenterY)
                        ),
                    }),
                    width: finalWidth,
                    height: finalHeight,
                }
                if (drawShapeType === 'circle') {
                    Object.assign(
                        finalShapeData,
                        setProperties(finalShapeData, {
                            labelCameraScale: two.scene.scale,
                        })
                    )
                }

                addToLocalComponentStore(
                    finalId,
                    drawShapeType ?? '',
                    finalShapeData as unknown as ComponentRecord
                )

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const finishPlacement = (el?: any) => {
                    removeDrawPreview()
                    if (el) selectionController.attach(el)
                }
                pollUntilElement(two, finalId, finishPlacement, {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    condition: (el: any) => !!el.children?.[0],
                    onTimeout: () => finishPlacement(),
                })

                drawOrigin = null
                drawCurrentCoords = null
                drawShapeType = null
                drawShapeProps = null
                setPointerElement('pointer')
                setRootCursor('auto')
                const hintBtn = document.getElementById(
                    'show-click-anywhere-btn'
                )
                if (hintBtn) hintBtn.style.opacity = '0'
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            }
            case SCENARIO_JUST_ADDED_ELEMENT:
                setSelectedComponentInBase(null)
                lastPlacedElement = null
                setPointerElement('pointer')
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                break
            case SCENARIO_PENCIL_MODE: {
                isPencilStrokeActive = false
                const capturedPencilGroup = pencilGroup
                pencilGroup = null
                pencilPath = null

                if (pencilRawPoints.length === 1) {
                    const dot = pencilRawPoints[0]
                    const half = PENCIL_DOT_SEGMENT / 2
                    pencilRawPoints = [
                        { ...dot, x: dot.x - half },
                        { ...dot, x: dot.x + half },
                    ]
                }

                if (pencilRawPoints.length < 2) {
                    if (capturedPencilGroup) {
                        two.remove(capturedPencilGroup)
                        two.update()
                    }
                    pencilRawPoints = []
                    lastPencilPoint = null
                    lastPencilLinewidth = null
                    break
                }

                const committedPoints = pencilRawPoints

                let pencilId = generateUUID()
                let pencilComponentData = {
                    id: pencilId,
                    baseId: props.baseId,
                    componentType: 'pencil',
                    children: {},
                    ...geometryFields(lineGeometry(committedPoints), {
                        widths: committedPoints.map((point) => point.lw),
                    }),
                    linewidth: defaultLinewidthValue,
                    stroke: defaultStrokeColorValue,
                    strokeType: defaultStrokeTypeValue,
                }

                addToLocalComponentStore(
                    pencilComponentData.id,
                    pencilComponentData.componentType,
                    pencilComponentData as unknown as ComponentRecord
                )

                const removePencilPreview = () => {
                    if (capturedPencilGroup) {
                        two.remove(capturedPencilGroup)
                        two.update()
                    }
                }
                pollUntilElement(two, pencilId, removePencilPreview, {
                    onTimeout: removePencilPreview,
                })

                pencilRawPoints = []
                lastPencilPoint = null
                lastPencilLinewidth = null
                break
            }
            case SCENARIO_RUBBER_MODE:
                domElement.removeEventListener('mousemove', mousemove, false)
                domElement.removeEventListener('mouseup', mouseup, false)
                eraserTrail.end()
                break
            default:
                let oldShapeData = {}
                let newShapeData = {}
                if (pendingGroupSelectorOrigin) {
                    pendingGroupSelectorOrigin = null
                }
                if (shape?.elementData?.isGroupSelector) {
                    let area = shape.children[0]
                    const groupWidth = area.vertices[2].x - area.vertices[0].x
                    const groupHeight = area.vertices[3].y - area.vertices[0].y
                    two.remove(shape)
                    if (groupWidth > 10 || groupHeight > 10) {
                        setOnGroupHandler({
                            x: area.vertices[0].x + shape.translation.x,
                            y: area.vertices[0].y + shape.translation.y,
                            left: area.vertices[0].x + shape.translation.x,
                            right: area.vertices[1].x + shape.translation.x,
                            top: area.vertices[0].y + shape.translation.y,
                            bottom: area.vertices[3].y + shape.translation.y,
                            width: groupWidth,
                            height: groupHeight,
                        })
                    }
                    setSelectedComponentInBase(null)
                } else if (shape?.elementData) {
                    const prevX = shape.elementData.prevX
                    const prevY = shape.elementData.prevY
                    const movedX =
                        prevX === undefined
                            ? shape.elementData.x !== shape.translation.x
                            : parseInt(shape.translation.x) !== prevX
                    const movedY =
                        prevY === undefined
                            ? shape.elementData.y !== shape.translation.y
                            : parseInt(shape.translation.y) !== prevY
                    if (movedX || movedY) {
                        if (shape?.elementData?.isLineCircle === true) {
                            shape.opacity = 0
                            shape.siblingCircle.opacity = 0

                            const vertexObj = {
                                x1: parseInt(shape.lineData.vertices[0].x),
                                y1: parseInt(shape.lineData.vertices[0].y),
                                x2: parseInt(shape.lineData.vertices[1].x),
                                y2: parseInt(shape.lineData.vertices[1].y),
                            }

                            const arrowGroup = shape.lineData?.parent
                            const ed = arrowGroup?.elementData
                            const draggedEndpoint =
                                shape.direction === 'left' ? 'tail' : 'head'
                            const portsToRestack: {
                                shapeId: string
                                edge: string
                            }[] = []
                            const recordPort = (
                                shapeId?: string | null,
                                edge?: string | null
                            ) => {
                                if (
                                    shapeId &&
                                    edge &&
                                    !portsToRestack.some(
                                        (p) =>
                                            p.shapeId === shapeId &&
                                            p.edge === edge
                                    )
                                )
                                    portsToRestack.push({ shapeId, edge })
                            }
                            if (ed && draggedEndpoint === 'tail')
                                recordPort(ed.tailShapeId, ed.tailEdge)
                            else if (ed && draggedEndpoint === 'head')
                                recordPort(ed.headShapeId, ed.headEdge)
                            const connectHere =
                                !!pendingPortConnection &&
                                pendingPortConnection.endpoint ===
                                    draggedEndpoint &&
                                !!pendingPortConnection.shapeId &&
                                !!ed &&
                                pendingPortConnection.arrowId === ed.id
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const bindObj: Record<string, any> = {}
                            if (connectHere && pendingPortConnection) {
                                if (draggedEndpoint === 'tail') {
                                    bindObj.tailShapeId =
                                        pendingPortConnection.shapeId
                                    bindObj.tailEdge =
                                        pendingPortConnection.edge
                                } else {
                                    bindObj.headShapeId =
                                        pendingPortConnection.shapeId
                                    bindObj.headEdge =
                                        pendingPortConnection.edge
                                }
                                if (ed) Object.assign(ed, bindObj)
                            } else if (
                                draggedEndpoint === 'tail' &&
                                ed &&
                                (ed.tailShapeId || ed.tailEdge)
                            ) {
                                bindObj.tailShapeId = null
                                bindObj.tailEdge = null
                                bindObj.tailPortIndex = 0
                                ed.tailShapeId = null
                                ed.tailEdge = null
                                ed.tailPortIndex = 0
                            } else if (
                                draggedEndpoint === 'head' &&
                                ed &&
                                (ed.headShapeId || ed.headEdge)
                            ) {
                                bindObj.headShapeId = null
                                bindObj.headEdge = null
                                bindObj.headPortIndex = 0
                                ed.headShapeId = null
                                ed.headEdge = null
                                ed.headPortIndex = 0
                            }

                            if (ed?.id && Object.keys(bindObj).length > 0) {
                                updateComponentBulkPropertiesInLocalStore(
                                    ed.id,
                                    { ...vertexObj, ...bindObj }
                                )
                            } else {
                                oldShapeData = { ...shape.elementData }
                                newShapeData = Object.assign(
                                    {},
                                    shape.elementData,
                                    { data: vertexObj }
                                )
                                updateToGlobalState(newShapeData, oldShapeData)
                            }
                        } else {
                            const originX =
                                prevX ?? parseInt(shape.elementData.x)
                            const originY =
                                prevY ?? parseInt(shape.elementData.y)
                            shape.elementData.x = shape.translation.x
                            shape.elementData.y = shape.translation.y

                            const ed = shape.elementData
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const arrowDetach: Record<string, any> = {}
                            const bodyDetachPorts: {
                                shapeId: string
                                edge: string
                            }[] = []
                            if (ed.componentType === 'arrowLine') {
                                if (ed.tailShapeId || ed.tailEdge) {
                                    if (ed.tailShapeId && ed.tailEdge)
                                        bodyDetachPorts.push({
                                            shapeId: ed.tailShapeId,
                                            edge: ed.tailEdge,
                                        })
                                    arrowDetach.tailShapeId = null
                                    arrowDetach.tailEdge = null
                                    arrowDetach.tailPortIndex = 0
                                    ed.tailShapeId = null
                                    ed.tailEdge = null
                                    ed.tailPortIndex = 0
                                }
                                if (ed.headShapeId || ed.headEdge) {
                                    if (ed.headShapeId && ed.headEdge)
                                        bodyDetachPorts.push({
                                            shapeId: ed.headShapeId,
                                            edge: ed.headEdge,
                                        })
                                    arrowDetach.headShapeId = null
                                    arrowDetach.headEdge = null
                                    arrowDetach.headPortIndex = 0
                                    ed.headShapeId = null
                                    ed.headEdge = null
                                    ed.headPortIndex = 0
                                }
                            }

                            if (Object.keys(arrowDetach).length > 0) {
                                const nextX = parseInt(shape.translation.x)
                                const nextY = parseInt(shape.translation.y)
                                updateComponentBulkPropertiesInLocalStore(
                                    ed.id,
                                    {
                                        ...(moveGeometryTo(ed, nextX, nextY) ?? {
                                            x: nextX,
                                            y: nextY,
                                        }),
                                        ...arrowDetach,
                                    }
                                )
                            } else if (readGeometry(ed)) {
                                const dx =
                                    parseInt(shape.translation.x) - originX
                                const dy =
                                    parseInt(shape.translation.y) - originY
                                const moved = translateGeometry(ed, dx, dy)
                                if (moved) {
                                    ed.metadata = moved.metadata
                                    ed.x = moved.x
                                    ed.y = moved.y
                                    updateComponentBulkPropertiesInLocalStore(
                                        ed.id,
                                        moved
                                    )
                                }
                            } else {
                                oldShapeData = { ...shape.elementData }

                                newShapeData = Object.assign(
                                    {},
                                    shape.elementData,
                                    {
                                        data: {
                                            x: parseInt(shape.translation.x),
                                            y: parseInt(shape.translation.y),
                                        },
                                    }
                                )

                                if (
                                    shape.elementData.componentType !==
                                    'groupobject'
                                ) {
                                    updateToGlobalState(
                                        newShapeData,
                                        oldShapeData
                                    )
                                }
                            }
                        }
                    }
                }
        }

        document
            .querySelectorAll<HTMLElement>(
                '.dragger-picker:not(.is-vertex-handle)'
            )
            .forEach((el) => {
                el.style.pointerEvents = ''
            })

        shape = {}
        scenario = null

        two.update()

        domElement.removeEventListener('mousemove', mousemove, false)
        domElement.removeEventListener('mouseup', mouseup, false)
    }

    function scheduleViewportSave() {
        if (!props.baseId) return
        if (viewportSaveTimer) clearTimeout(viewportSaveTimer)
        viewportSaveTimer = setTimeout(() => {
            writeViewport(props.baseId!, false, {
                tx: two.scene.translation.x,
                ty: two.scene.translation.y,
                scale: two.scene.scale,
            })
        }, 300)
    }

    function mousewheel(e: WheelEvent) {
        e.preventDefault()

        const zooms = true

        if (zooms) {
            zui.zoomBy(wheelZoomStep(e), e.clientX, e.clientY)
            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: zui.scale } })
            )
        } else {
            zui.translateSurface(-e.deltaX, -e.deltaY)
        }

        isWheeling = true
        if (wheelSettleTimer !== null) window.clearTimeout(wheelSettleTimer)
        wheelSettleTimer = window.setTimeout(() => {
            isWheeling = false
            wheelSettleTimer = null
        }, 120)

        cullOnCameraChange()
        scheduleRender(two)

        onCameraChangeRef?.current?.({
            scale: two.scene.scale,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })

        scheduleViewportSave()
    }

    function touchstart(e: TouchEvent) {
        e.preventDefault()

        if (e.touches.length === 1) {
            lastTouch = e.touches[0]
            touchStartX = lastTouch.clientX
            touchStartY = lastTouch.clientY

            if (isPanMode()) {
                isSinglePanning = true
                panLastX = lastTouch.clientX
                panLastY = lastTouch.clientY
                const root = document.getElementById('main-two-root')
                if (root) root.style.cursor = 'grabbing'
                return
            }

            const handleHit =
                selectionController.currentGroup &&
                selectionController.hitTest(
                    lastTouch.clientX,
                    lastTouch.clientY
                )

            const underFinger = document.elementFromPoint(
                lastTouch.clientX,
                lastTouch.clientY
            ) as Element | null

            const groupHit = underFinger?.closest(
                '[data-label="groupobject_coord"]'
            )

            const chromeEl = underFinger?.closest(`[${SELECTION_CHROME_ATTR}]`)
            const chromeHit =
                !!chromeEl &&
                parseFloat(window.getComputedStyle(chromeEl).opacity || '1') > 0

            if (!handleHit && !groupHit && !chromeHit) {
                window.dispatchEvent(new CustomEvent('clearSelector', {}))
            }

            const target = handleHit ? domElement : underFinger || domElement
            target.dispatchEvent(
                new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: lastTouch.clientX,
                    clientY: lastTouch.clientY,
                    screenX: lastTouch.screenX,
                    screenY: lastTouch.screenY,
                })
            )
        } else if (e.touches.length === 2) {
            if (isSinglePanning) {
                isSinglePanning = false
                lastTouch = null
            } else if (lastTouch) {
                domElement.dispatchEvent(
                    new MouseEvent('mouseup', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: lastTouch.clientX,
                        clientY: lastTouch.clientY,
                    })
                )
                lastTouch = null
            }
            twoFingerStart(e)
        }
    }

    function touchmove(e: TouchEvent) {
        e.preventDefault()

        if (e.touches.length === 1) {
            lastTouch = e.touches[0]

            if (isSinglePanning) {
                const dx = lastTouch.clientX - panLastX
                const dy = lastTouch.clientY - panLastY
                panLastX = lastTouch.clientX
                panLastY = lastTouch.clientY
                if (dx !== 0 || dy !== 0) {
                    zui.translateSurface(dx, dy)
                    cullOnCameraChange()
                    scheduleRender(two)
                    onCameraChangeRef?.current?.({
                        scale: two.scene.scale,
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                    })
                }
                return
            }

            domElement.dispatchEvent(
                new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: lastTouch.clientX,
                    clientY: lastTouch.clientY,
                    screenX: lastTouch.screenX,
                    screenY: lastTouch.screenY,
                })
            )
        } else if (e.touches.length >= 2) {
            twoFingerMove(e)
        }
    }

    function touchend(e: TouchEvent) {
        if (e.touches.length === 0 && lastTouch) {
            const endX = lastTouch.clientX
            const endY = lastTouch.clientY

            if (isSinglePanning) {
                isSinglePanning = false
                if (props.baseId) {
                    writeViewport(props.baseId, true, {
                        tx: two.scene.translation.x,
                        ty: two.scene.translation.y,
                        scale: two.scene.scale,
                    })
                }
                const root = document.getElementById('main-two-root')
                if (root) root.style.cursor = 'grab'
                lastTouch = null
                return
            }

            domElement.dispatchEvent(
                new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: endX,
                    clientY: endY,
                })
            )

            const dx = endX - touchStartX
            const dy = endY - touchStartY
            const moved = Math.sqrt(dx * dx + dy * dy)
            if (moved < 10) {
                if (
                    document.activeElement &&
                    document.activeElement !== document.body
                ) {
                    ;(document.activeElement as HTMLElement).blur()
                }

                const now = Date.now()
                const tapDx = endX - lastTapX
                const tapDy = endY - lastTapY
                const tapDist = Math.sqrt(tapDx * tapDx + tapDy * tapDy)
                const isDoubleTap = now - lastTapTime < 300 && tapDist < 30

                const target =
                    document.elementFromPoint(endX, endY) || domElement

                if (isDoubleTap) {
                    lastTapTime = 0
                    lastTapX = 0
                    lastTapY = 0
                    target.dispatchEvent(
                        new MouseEvent('dblclick', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: endX,
                            clientY: endY,
                        })
                    )
                } else {
                    lastTapTime = now
                    lastTapX = endX
                    lastTapY = endY
                    target.dispatchEvent(
                        new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: endX,
                            clientY: endY,
                        })
                    )
                }
            }

            lastTouch = null
        }
        if (e.touches.length < 2) {
            if (distance > 0 && props.baseId) {
                writeViewport(props.baseId, true, {
                    tx: two.scene.translation.x,
                    ty: two.scene.translation.y,
                    scale: two.scene.scale,
                })
            }
            touches = {}
            distance = 0
        }
    }

    function twoFingerStart(e: TouchEvent) {
        touches = {}
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i]
            if (t) touches[t.identifier] = t
        }
        const ids = Object.keys(touches)
        if (ids.length < 2) return
        const a = touches[ids[0]!]
        const b = touches[ids[1]!]
        const dx = b.clientX - a.clientX
        const dy = b.clientY - a.clientY
        distance = Math.sqrt(dx * dx + dy * dy)
        twoFingerMidX = (a.clientX + b.clientX) / 2
        twoFingerMidY = (a.clientY + b.clientY) / 2
    }

    function twoFingerMove(e: TouchEvent) {
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i]
            if (t) touches[t.identifier] = t
        }
        const ids = Object.keys(touches)
        if (ids.length < 2) return

        const a = touches[ids[0]!]
        const b = touches[ids[1]!]
        const dx = b.clientX - a.clientX
        const dy = b.clientY - a.clientY
        const newDist = Math.sqrt(dx * dx + dy * dy)
        const newMidX = (a.clientX + b.clientX) / 2
        const newMidY = (a.clientY + b.clientY) / 2

        if (distance === 0) {
            distance = newDist
            twoFingerMidX = newMidX
            twoFingerMidY = newMidY
            return
        }

        zui.translateSurface(newMidX - twoFingerMidX, newMidY - twoFingerMidY)

        const distDelta = newDist - distance
        if (Math.abs(distDelta) > 0.5) {
            zui.zoomBy(distDelta / 250, newMidX, newMidY)
            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: zui.scale } })
            )
        }

        twoFingerMidX = newMidX
        twoFingerMidY = newMidY
        distance = newDist

        cullOnCameraChange()
        scheduleRender(two)

        onCameraChangeRef?.current?.({
            scale: two.scene.scale,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })
    }

    const computeContentSurfaceBounds = (): {
        left: number
        top: number
        right: number
        bottom: number
    } | null => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const children = two.scene.children as any[]
        let left = Infinity
        let top = Infinity
        let right = -Infinity
        let bottom = -Infinity
        for (const child of children) {
            const id = child?.elementData?.id
            if (!id) continue
            if (child.elementData.componentType === GROUP_COMPONENT) continue
            if (child.visible === false && child[CULLED_FLAG] !== true) continue
            if (child.elementData.isDummy === true) continue
            let rect
            try {
                rect = child.getBoundingClientRect(true)
            } catch {
                continue
            }
            if (!rect) continue
            const { left: l, top: t, right: r, bottom: b } = rect
            if (![l, t, r, b].every((n) => Number.isFinite(n))) continue
            left = Math.min(left, l)
            top = Math.min(top, t)
            right = Math.max(right, r)
            bottom = Math.max(bottom, b)
        }
        if (!Number.isFinite(left) || right - left <= 0 || bottom - top <= 0)
            return null
        return { left, top, right, bottom }
    }

    return {
        zui,
        notifyCameraChange: (): void => {
            onCameraChangeRef?.current?.({
                scale: two.scene.scale as number,
                tx: two.scene.translation.x,
                ty: two.scene.translation.y,
            })
        },
        mousemove,
        disposeEraserTrail: () => eraserTrail.dispose(),
        resetDragState: () => {
            dragging = false
            shape = {}
        },
        getCurrentShape: () => shape,
        getSelectedGroup: () =>
            selectionController.currentGroup ||
            activeGroupRef.current ||
            lastSelectedShape,
        bringSelectionToFront: () =>
            selectionController.bringSelectionToFront(),
        hasVisibleContent: (): boolean => {
            const scene = two.scene
            const vw = domElement.clientWidth || two.width
            const vh = domElement.clientHeight || two.height
            if (!vw || !vh) return true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const children = scene.children as any[]
            for (const child of children) {
                const id = child?.elementData?.id
                if (!id) continue
                if (child.elementData.componentType === GROUP_COMPONENT)
                    continue
                let rect
                try {
                    rect = child.getBoundingClientRect(false)
                } catch {
                    continue
                }
                if (!rect) continue
                const { left, top, right, bottom } = rect
                if (
                    ![left, top, right, bottom].every((n) => Number.isFinite(n))
                )
                    continue
                if (right > 0 && bottom > 0 && left < vw && top < vh)
                    return true
            }
            return false
        },
        contentBoundsSignature: (): string => {
            const b = computeContentSurfaceBounds()
            if (!b) return ''
            return [b.left, b.top, b.right, b.bottom]
                .map((n) => Math.round(n))
                .join(',')
        },
        fitToContent: (opts?: { padding?: number }): boolean => {
            const bounds = computeContentSurfaceBounds()
            if (!bounds) return false
            const { left, top, right, bottom } = bounds

            const vw = domElement.clientWidth || two.width
            const vh = domElement.clientHeight || two.height
            if (!vw || !vh) return false

            const bboxW = right - left
            const bboxH = bottom - top
            const padding = opts?.padding ?? 0.8
            const scale = Math.max(
                zui.limits.scale.min,
                Math.min(
                    zui.limits.scale.max,
                    Math.min(vw / bboxW, vh / bboxH) * padding
                )
            )

            zui.reset()
            zui.zoomSet(scale, 0, 0)
            const cx = (left + right) / 2
            const cy = (top + bottom) / 2
            const [curX, curY] = zui.surfaceMatrix.multiply(cx, cy, 1)
            zui.translateSurface(vw / 2 - curX, vh / 2 - curY)
            two.update()

            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: zui.scale } })
            )
            onCameraChangeRef?.current?.({
                scale: two.scene.scale,
                tx: two.scene.translation.x,
                ty: two.scene.translation.y,
            })
            return true
        },
        setZoomLimits: (min: number, max: number): void => {
            zui.limits.scale.min = min
            zui.limits.scale.max = max
            const clamped = Math.max(min, Math.min(max, zui.scale))
            if (clamped !== zui.scale) {
                const vw = domElement.clientWidth || two.width
                const vh = domElement.clientHeight || two.height
                zui.zoomSet(clamped, vw / 2, vh / 2)
                two.update()
                window.dispatchEvent(
                    new CustomEvent('zoomChanged', {
                        detail: { scale: zui.scale },
                    })
                )
                onCameraChangeRef?.current?.({
                    scale: two.scene.scale as number,
                    tx: two.scene.translation.x,
                    ty: two.scene.translation.y,
                })
            }
        },
        centerOnSurface: (x: number, y: number, scale?: number): void => {
            const vw = domElement.clientWidth || two.width
            const vh = domElement.clientHeight || two.height
            if (!vw || !vh) return

            const nextScale = Math.max(
                zui.limits.scale.min,
                Math.min(zui.limits.scale.max, scale ?? zui.scale)
            )
            zui.reset()
            zui.zoomSet(nextScale, 0, 0)
            const [curX, curY] = zui.surfaceMatrix.multiply(x, y, 1)
            zui.translateSurface(vw / 2 - curX, vh / 2 - curY)
            two.update()

            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: zui.scale } })
            )
            onCameraChangeRef?.current?.({
                scale: two.scene.scale as number,
                tx: two.scene.translation.x,
                ty: two.scene.translation.y,
            })
        },
    }
}

const Canvas: React.FC<CanvasProps> = (props) => {
    const { isMobile } = useMediaQueryUtils()

    const {
        addToLocalComponentStore,
        deleteComponentFromLocalStore,
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        setTwoJSInstanceInBase,
        setZuiInstanceInBase,
        setSelectedComponentInBase,
        setArrowDrawModeInBase,
        setTextDrawModeInBase,
        setCurrentElementInBase,
        togglePanMode,
        undoLastAction,
        redoLastAction,
        recordBatchToHistoryLog,
        enableTextDrawMode,
        createTextAtSurface,
        isPersisted,
        showCanvasNotice,
        meta,
    } = useBaseContext()

    const homeToolRef = useRef<string>('pointer')

    const resetToHomeTool = (
        element: CurrentElement | null,
        options?: { select?: boolean }
    ): void => {
        if (element === 'pointer' && homeToolRef.current === 'pan') {
            if (options?.select) {
                togglePanMode(false)
                setCurrentElementInBase('pointer')
                return
            }
            togglePanMode(true)
            setCurrentElementInBase('pan')
            return
        }
        setCurrentElementInBase(element)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [twoJSInstance, setTwoJSInstance] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [zuiInstance, setZuiInstance] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [onGroup, setOnGroup] = useState<any>(null)
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(
        null
    )
    const [componentsToRender, setComponentsToRender] = useState<
        React.ComponentType[]
    >([])

    const stateRefForComponentStore = useRef<ComponentStore | undefined>(
        undefined
    )
    const isPencilModeRef = useRef<boolean>(props.isPencilMode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zuiInstanceRef = useRef<any>(null)
    const renderGroupRef = useRef<
        ((currentComponents: ComponentRecord[]) => void) | null
    >(null)
    const prevElementsRef = useRef<string[]>([])
    const componentsToRenderRef = useRef<React.ComponentType[]>([])
    const createTextAtSurfaceRef = useRef<
        ((x: number, y: number) => void) | null
    >(null)
    useEffect(() => {
        createTextAtSurfaceRef.current = createTextAtSurface
    }, [createTextAtSurface])

    const onCameraChangeRef = useRef<
        ((event: CameraChangeEvent) => void) | undefined
    >(props.onCameraChange)
    useEffect(() => {
        onCameraChangeRef.current = props.onCameraChange
    }, [props.onCameraChange])

    const { clipboardRef, lastMouseRef } = useCanvasClipboard({
        twoJSInstance,
        zuiInstanceRef,
        baseId: props.baseId,
        addToLocalComponentStore,
        recordBatchToHistoryLog,
        renderGroupRef,
        stateRefForComponentStore,
        onPasted: (objectIdMap) => {
            meta.copyValuesForPaste(objectIdMap).catch((e) =>
                console.error('[paste] copying meta values failed', e)
            )
        },
    })

    useImageDrop({
        twoJSInstance,
        zuiInstanceRef,
        baseId: props.baseId,
        isPersisted,
        addToLocalComponentStore,
        showCanvasNotice,
    })

    useEffect(() => {
        const elem = document.getElementById('main-two-root')
        if (!elem) return

        const two = new Two({ fullscreen: true }).appendTo(elem)
        two.update()

        let zui_instance = addZUI(
            props,
            two,
            updateToGlobalState,
            updateComponentVertices,
            setOnGroupHandler,
            addToLocalComponentStore,
            setSelectedComponentInBase,
            () => setArrowDrawModeInBase(false),
            () => setTextDrawModeInBase(false),
            resetToHomeTool,
            updateComponentBulkPropertiesInLocalStore,
            deleteComponentFromLocalStore,
            isPencilModeRef,
            createTextAtSurfaceRef,
            onCameraChangeRef
        )

        const renderOrigin = installRenderOrigin(two)

        if (E2E_HOOKS) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(window as any).__mcZui = zui_instance.zui
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(window as any).__mcTwo = two
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(window as any).__mcRenderOrigin = renderOrigin
        }

        setZuiInstance(zui_instance)
        setTwoJSInstance(two)
        setTwoJSInstanceInBase(two)
        setZuiInstanceInBase(zui_instance)

        const applyViewport = (vp: StoredViewport): boolean => {
            try {
                const { tx, ty, scale } = vp
                zui_instance.zui.zoomSet(scale, 0, 0)
                zui_instance.zui.translateSurface(tx, ty)
                two.update()
                return true
            } catch (_) {
                return false
            }
        }

        const restoreViewport = (mobile: boolean): boolean => {
            if (!props.baseId) return false
            const parsed = readViewport(props.baseId, mobile)
            if (!parsed) return false
            return applyViewport(parsed)
        }

        if (props.baseId) {
            const params = new URLSearchParams(window.location.search)
            if (params.has('vx') && params.has('vy') && params.has('vs')) {
                const tx = Number(params.get('vx'))
                const ty = Number(params.get('vy'))
                const scale = Number(params.get('vs'))
                if (
                    Number.isFinite(tx) &&
                    Number.isFinite(ty) &&
                    Number.isFinite(scale) &&
                    scale > 0
                ) {
                    const seeded = { tx, ty, scale }
                    writeViewport(props.baseId, false, seeded)
                    writeViewport(props.baseId, true, seeded)
                }
                window.history.replaceState({}, '', window.location.pathname)
            }
        }

        let landedViewport: StoredViewport | null = null
        const landing = props.initialMapLanding
        if (props.baseId && landing) {
            const alreadyHasCamera =
                readViewport(props.baseId, isMobile) !== null
            if (!alreadyHasCamera) {
                const scale = scaleForMapZoom(landing.zoom, landing.anchor)
                const { x, y } = lngLatToSurface(landing.lngLat, landing.anchor)
                const vw = two.width || window.innerWidth
                const vh = two.height || window.innerHeight
                landedViewport = {
                    scale,
                    tx: vw / 2 - x * scale,
                    ty: vh / 2 - y * scale,
                }
                writeViewport(props.baseId, isMobile, landedViewport)
            }
        }

        if (props.baseId) {
            const limits = MAP_ZOOM_LIMITS
            zui_instance.setZoomLimits(limits.min, limits.max)
            if (!restoreViewport(isMobile) && landedViewport) {
                applyViewport(landedViewport)
            }
        }

        pendingInitialFitRef.current =
            Boolean(props.baseId && isUrlBasePath()) && !landedViewport

        onCameraChangeRef.current?.({
            scale: two.scene.scale as number,
            tx: two.scene.translation.x,
            ty: two.scene.translation.y,
        })

        const baseId = props.baseId
        const tabsOpen = localStorage.getItem(`tabs_open_${baseId}`)
        if (tabsOpen == null) {
            localStorage.setItem(`tabs_open_${baseId}`, '1')
        } else {
            localStorage.setItem(
                `tabs_open_${baseId}`,
                String(parseInt(tabsOpen) + 1)
            )
        }

        window.onunload = function (e) {
            const newTabCount = localStorage.getItem(`tabs_open_${baseId}`)
            if (newTabCount !== null) {
                localStorage.setItem(
                    `tabs_open_${baseId}`,
                    String(Number(newTabCount) - 1)
                )
            }
        }

        return () => {
            renderOrigin.uninstall()
            zui_instance?.disconnectThemeObserver?.()
            zui_instance?.disposeEraserTrail?.()
            for (const prop of [
                'overflow',
                'position',
                'margin',
                'padding',
                'top',
                'left',
                'right',
                'bottom',
            ]) {
                document.body.style.removeProperty(prop)
            }
        }
    }, [])

    const zOrderPollRef = useRef<number | null>(null)
    const pendingInitialFitRef = useRef<boolean>(false)
    const initialFitPollRef = useRef<number | null>(null)

    const reconcileZOrder = useCallback(() => {
        const two = twoJSInstance
        const store = stateRefForComponentStore.current
        if (!two?.scene || !store) return
        const scene = two.scene
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const children = scene.children as any[]

        const hasActiveGroupSelection = children.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) =>
                c?.elementData?.isGroupSelector === true ||
                c?.elementData?.componentType === GROUP_COMPONENT
        )
        if (hasActiveGroupSelection) return

        const sortedEls = children
            .filter((c) => isReorderableElementChild(c, store))
            .sort((a, b) =>
                compareByZOrder(
                    store[a.elementData.id],
                    store[b.elementData.id]
                )
            )
        let e = 0
        const desired = children.map((c) =>
            isReorderableElementChild(c, store) ? sortedEls[e++] : c
        )
        const rank = new Map<unknown, number>()
        desired.forEach((c, i) => rank.set(c, i))

        const alreadyOrdered = children.every((c, i) => desired[i] === c)
        if (alreadyOrdered) return

        children.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))

        zuiInstanceRef.current?.bringSelectionToFront?.()

        const selectedGroup = zuiInstanceRef.current?.getSelectedGroup?.()
        const selectedArrow =
            selectedGroup?.elementData?.componentType === 'arrowLine'
                ? selectedGroup
                : null

        try {
            two.update()
        } catch (err) {
            console.warn('reconcileZOrder two.update failed', err)
            scene.subtractions.length = 0
            scene._flagSubtractions = false
        }

        if (selectedArrow) {
            setArrowEndpointsVisible(selectedArrow, true)
            try {
                two.update()
            } catch {
                scene.subtractions.length = 0
                scene._flagSubtractions = false
            }
        }
    }, [twoJSInstance])

    const startZOrderReconcilePoll = useCallback(() => {
        if (zOrderPollRef.current !== null) {
            cancelAnimationFrame(zOrderPollRef.current)
            zOrderPollRef.current = null
        }
        const two = twoJSInstance
        const store = stateRefForComponentStore.current
        if (!two?.scene || !store) return

        const expected = Object.values(store).filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any) =>
                r?.componentType !== GROUP_COMPONENT &&
                !!elementModules[
                    `./components/elements/${r?.componentType}.tsx`
                ]
        ).length

        let frame = 0
        const MAX_FRAMES = 90
        const tick = (): void => {
            zOrderPollRef.current = null
            reconcileZOrder()
            const present = (two.scene.children as unknown[]).filter((c) =>
                isReorderableElementChild(c, store)
            ).length
            frame += 1
            if (present < expected && frame < MAX_FRAMES) {
                zOrderPollRef.current = requestAnimationFrame(tick)
            }
        }
        zOrderPollRef.current = requestAnimationFrame(tick)
    }, [twoJSInstance, reconcileZOrder])

    useEffect(
        () => () => {
            if (zOrderPollRef.current !== null) {
                cancelAnimationFrame(zOrderPollRef.current)
            }
            if (initialFitPollRef.current !== null) {
                cancelAnimationFrame(initialFitPollRef.current)
            }
        },
        []
    )

    useEffect(() => {
        stateRefForComponentStore.current = props.componentStore
        if (twoJSInstance !== null && zuiInstance !== null) {
            let domElement = twoJSInstance?.renderer?.domElement
            zuiInstance.resetDragState()
            domElement.addEventListener(
                'mousemove',
                zuiInstance.mousemove,
                false
            )
        }

        if (Object.values(props.componentStore).length > 0 && twoJSInstance) {
            handleSetComponentsToRender(Object.values(props.componentStore))
            startZOrderReconcilePoll()

            if (pendingInitialFitRef.current && zuiInstance) {
                if (initialFitPollRef.current !== null) {
                    cancelAnimationFrame(initialFitPollRef.current)
                }
                let lastSig: string | null = null
                let stableFrames = 0
                let frame = 0
                const MAX_FRAMES = 600
                const tryFit = (): void => {
                    initialFitPollRef.current = null
                    const sig = zuiInstance.contentBoundsSignature?.() ?? ''
                    stableFrames =
                        sig !== '' && sig === lastSig ? stableFrames + 1 : 0
                    lastSig = sig
                    frame += 1
                    if (
                        (sig !== '' && stableFrames >= 3) ||
                        frame >= MAX_FRAMES
                    ) {
                        if (sig !== '') {
                            try {
                                twoJSInstance.update()
                            } catch (_) {
                            }
                            if (!zuiInstance.hasVisibleContent?.()) {
                                zuiInstance.fitToContent?.()
                            }
                        }
                        pendingInitialFitRef.current = false
                        return
                    }
                    initialFitPollRef.current = requestAnimationFrame(tryFit)
                }
                initialFitPollRef.current = requestAnimationFrame(tryFit)
            }
        }
    }, [props.componentStore])

    useEffect(() => {
        if (props.lastAddedElement !== null) {
            handleSetComponentsToRender([
                { ...props.lastAddedElement, isDummy: true },
            ])
        }
    }, [props.lastAddedElement])

    useEffect(() => {
        isPencilModeRef.current = props.isPencilMode
        isPencilStrokeActive = false
        const root = document.getElementById('main-two-root')
        if (props.isPencilMode === true) {
            isDrawing = true
            if (root) root.style.cursor = 'crosshair'
        } else {
            isDrawing = false
            if (root) root.style.cursor = 'auto'
        }
    }, [props.isPencilMode])

    useEffect(() => {
        defaultLinewidthValue = props.defaultLinewidth || 1
    }, [props.defaultLinewidth])

    useEffect(() => {
        defaultStrokeTypeValue = props.defaultStrokeType || null
    }, [props.defaultStrokeType])

    useEffect(() => {
        defaultFillTypeValue = props.defaultFillType || null
    }, [props.defaultFillType])

    useEffect(() => {
        defaultStrokeColorValue =
            props.defaultStrokeColor || PENCIL_DEFAULT_COLOR
    }, [props.defaultStrokeColor])

    useEffect(() => {
        defaultTextSizeValue = props.defaultTextSize || DEFAULT_TEXT_SIZE
    }, [props.defaultTextSize])

    useEffect(() => {
        if (onGroup) {
            if (zOrderPollRef.current !== null) {
                cancelAnimationFrame(zOrderPollRef.current)
                zOrderPollRef.current = null
            }
            let e = onGroup
            let x1Coord = e.left
            let x2Coord = e.right
            let y1Coord = e.top
            let y2Coord = e.bottom

            let xMid = parseInt(String(e.left)) + Math.floor(e.width / 2)
            let yMid = parseInt(String(e.top)) + Math.floor(e.height / 2)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newGroup: any = {}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newChildren: any[] = []
            const selectedComponentArr: string[] = []

            const allComponentCoords = stateRefForComponentStore.current
                ? Object.values(stateRefForComponentStore.current).sort(
                      compareByZOrder
                  )
                : []

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isInsideMarquee = (item: any): boolean =>
                item.x > x1Coord &&
                item.x < x2Coord &&
                item.y > y1Coord &&
                item.y < y2Coord

            const memberShapeIds = new Set(
                allComponentCoords
                    .filter(
                        (it) =>
                            it.componentType !== 'arrowLine' &&
                            isInsideMarquee(it)
                    )
                    .map((it) => it.id)
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isMember = (item: any): boolean => {
                if (isInsideMarquee(item)) return true
                if (item.componentType === 'arrowLine') {
                    return (
                        memberShapeIds.has(item.tailShapeId) ||
                        memberShapeIds.has(item.headShapeId)
                    )
                }
                return false
            }

            allComponentCoords.forEach((item) => {
                if (isMember(item)) {
                    selectedComponentArr.push(item.id)

                    let relativeX = item.x - xMid
                    let relativeY = item.y - yMid

                    const remapped = translateGeometry(item, -xMid, -yMid, {
                        round: false,
                    })
                    let obj = {
                        ...item,
                        ...(remapped
                            ? { metadata: remapped.metadata }
                            : {}),
                        id: item.id,
                        componentType: item.componentType,
                        x: relativeX,
                        relativeX: relativeX,
                        y: relativeY,
                        relativeY: relativeY,
                    }

                    if (isLineLikeType(item.componentType)) {
                        const arrowShape = twoJSInstance.scene.children.find(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (child: any) => child?.elementData?.id === item.id
                        )
                        const line = arrowShape?.children?.[0]
                        if (line?.vertices?.length >= 2) {
                            obj.x1 = line.vertices[0].x
                            obj.y1 = line.vertices[0].y
                            obj.x2 = line.vertices[1].x
                            obj.y2 = line.vertices[1].y
                        }
                    }

                    newChildren.push(obj)
                }
            })

            newGroup.id = Math.floor(100000 + Math.random() * 900000)
            newGroup.componentType = 'groupobject'
            newGroup.width = e.width
            newGroup.height = e.height
            newGroup.x = xMid
            newGroup.y = yMid

            newGroup.children = newChildren

            newGroup.membersToHide = [...selectedComponentArr]

            handleSetComponentsToRender([newGroup])
        }
    }, [onGroup])

    useEffect(() => {
        zuiInstanceRef.current = zuiInstance
    }, [zuiInstance])

    useEffect(() => {
        const onUndoRedoKeyDown = (evt: KeyboardEvent) => {
            if (evt.key.toLowerCase() === 'z' && (evt.ctrlKey || evt.metaKey)) {
                const tag = document.activeElement?.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA') return
                evt.preventDefault()
                if (isPencilStrokeActive) return
                if (evt.shiftKey) {
                    redoLastAction()
                } else {
                    undoLastAction()
                }
            }
        }

        const onTextModeKeyDown = (evt: KeyboardEvent) => {
            if (evt.key !== 't' && evt.key !== 'T') return
            if (evt.ctrlKey || evt.metaKey || evt.altKey) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            if (
                localStorage.getItem(TEXT_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(ARROW_DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(RUBBER_MODE_KEY) === 'true' ||
                localStorage.getItem(PENCIL_MODE_KEY) === 'TRUE' ||
                localStorage.getItem(DRAW_MODE_KEY) === 'true' ||
                localStorage.getItem(POINT_PLACE_MODE_KEY) === 'true' ||
                localStorage.getItem(PENDING_SHAPE_TYPE_KEY) !== null
            )
                return
            evt.preventDefault()
            enableTextDrawMode?.()
        }

        window.addEventListener('keydown', onUndoRedoKeyDown)
        window.addEventListener('keydown', onTextModeKeyDown)
        return () => {
            window.removeEventListener('keydown', onUndoRedoKeyDown)
            window.removeEventListener('keydown', onTextModeKeyDown)
        }
    }, [undoLastAction, redoLastAction, enableTextDrawMode])

    const exportActiveSelection = useCallback(async () => {
        const group = zuiInstanceRef.current?.getSelectedGroup?.()
        if (!group) return
        try {
            await exportSelectionAsSvg(group)
        } catch (err) {
            console.warn('Export selection as SVG failed', err)
        }
    }, [])

    const reorderSelected = useCallback(
        (op: 'front' | 'forward' | 'backward' | 'back') => {
            const store = stateRefForComponentStore.current
            if (!store) return
            const id =
                zuiInstanceRef.current?.getSelectedGroup?.()?.elementData?.id
            if (!id || !store[id]) return

            const sorted = Object.values(store)
                .filter((r) => r.componentType !== GROUP_COMPONENT)
                .sort(compareByZOrder)
            const n = sorted.length
            if (n === 0) return
            const idx = sorted.findIndex((r) => r.id === id)
            if (idx === -1) return

            const target =
                op === 'front'
                    ? n - 1
                    : op === 'back'
                      ? 0
                      : op === 'forward'
                        ? idx + 1
                        : idx - 1
            if (target < 0 || target > n - 1 || target === idx) return

            const newOrder = sorted.slice()
            const [moved] = newOrder.splice(idx, 1)
            if (!moved) return
            newOrder.splice(target, 0, moved)

            const batch: HistoryEntry[] = []
            newOrder.forEach((r, i) => {
                const prev = Number.isFinite(r.position)
                    ? (r.position as number)
                    : 0
                if (prev === i) return
                updateComponentBulkPropertiesInLocalStore(
                    r.id,
                    { position: i },
                    true
                )
                batch.push({
                    action: 'UPDATE_BULK',
                    id: r.id,
                    prevProps: { position: prev },
                    bulkObj: { position: i },
                })
            })
            if (batch.length > 0) recordBatchToHistoryLog(batch)

            reconcileZOrder()
        },
        [
            updateComponentBulkPropertiesInLocalStore,
            recordBatchToHistoryLog,
            reconcileZOrder,
        ]
    )

    useEffect(() => {
        const ref = props.reorderSelectedRef
        if (ref) ref.current = reorderSelected
        return () => {
            if (ref) ref.current = null
        }
    }, [props.reorderSelectedRef, reorderSelected])

    useEffect(() => {
        const ref = props.fitToContentRef
        if (ref)
            ref.current = () =>
                Boolean(zuiInstanceRef.current?.fitToContent?.())
        return () => {
            if (ref) ref.current = null
        }
    }, [props.fitToContentRef])

    useEffect(() => {
        const root = document.getElementById('main-two-root')
        if (!root) return

        const onContextMenu = (evt: MouseEvent) => {
            evt.preventDefault()
            const group = zuiInstanceRef.current?.getSelectedGroup?.()
            if (group) {
                setCtxMenu({ x: evt.clientX, y: evt.clientY })
            } else {
                setCtxMenu(null)
            }
        }

        const onExportKeyDown = (evt: KeyboardEvent) => {
            if (
                evt.key.toLowerCase() !== 'd' ||
                !(evt.ctrlKey || evt.metaKey) ||
                !evt.shiftKey
            )
                return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            evt.preventDefault()
            void exportActiveSelection()
        }

        const onReorderKeyDown = (evt: KeyboardEvent) => {
            if (evt.shiftKey || evt.altKey) return
            const isRight =
                evt.code === 'BracketRight' ||
                evt.key === ']' ||
                evt.key === '}'
            const isLeft =
                evt.code === 'BracketLeft' || evt.key === '[' || evt.key === '{'
            if (!isRight && !isLeft) return
            const el = document.activeElement as HTMLElement | null
            const tag = el?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable)
                return
            if (!zuiInstanceRef.current?.getSelectedGroup?.()) return
            evt.preventDefault()
            const withCmd = evt.metaKey || evt.ctrlKey
            const op: 'front' | 'forward' | 'backward' | 'back' = isRight
                ? withCmd
                    ? 'front'
                    : 'forward'
                : withCmd
                  ? 'back'
                  : 'backward'
            reorderSelected(op)
        }

        root.addEventListener('contextmenu', onContextMenu)
        window.addEventListener('keydown', onExportKeyDown)
        window.addEventListener('keydown', onReorderKeyDown)
        return () => {
            root.removeEventListener('contextmenu', onContextMenu)
            window.removeEventListener('keydown', onExportKeyDown)
            window.removeEventListener('keydown', onReorderKeyDown)
        }
    }, [exportActiveSelection, reorderSelected])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setOnGroupHandler = (obj: any) => {
        setOnGroup(obj)
    }

    const handleSetComponentsToRender = (
        currentComponents: ComponentRecord[]
    ) => {
        let arr = [...prevElementsRef.current]
        const seen = new Set(arr)
        let components = [...componentsToRenderRef.current]
        if (currentComponents && twoJSInstance) {
            currentComponents.forEach((item) => {
                const moduleLoader =
                    elementModules[
                        `./components/elements/${item.componentType}.tsx`
                    ]
                if (!moduleLoader) {
                    return
                }

                if (seen.has(item.id)) {
                } else {
                    arr.push(item.id)
                    seen.add(item.id)
                    const ElementToRender = getLazyElement(
                        item.componentType,
                        moduleLoader as () => Promise<{
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            default: React.ComponentType<any>
                        }>
                    )
                    const data = {
                        twoJSInstance: twoJSInstance,
                        id: item.id,
                        baseId: props.baseId,
                        itemData: item,
                    }

                    let component = null
                    if (item.componentType === GROUP_COMPONENT) {
                        component = GroupRenderWrapper(ElementToRender, {
                            ...item,
                            ...data,
                        })
                    } else {
                        component = ElementRenderWrapper(
                            ElementToRender,
                            data,
                            deleteComponentFromLocalStore,
                            props.componentStore
                        )
                    }
                    components.push(component)
                }
            })
            componentsToRenderRef.current = components
            setComponentsToRender(components)
            if (twoJSInstance) prevElementsRef.current = arr
        }
    }
    renderGroupRef.current = handleSetComponentsToRender

    useEffect(() => {
        const handleElementRemoved = ((e: CustomEvent<{ id: string }>) => {
            const { id } = e.detail
            let updatedPrevElementsArr = prevElementsRef.current
            updatedPrevElementsArr = updatedPrevElementsArr.filter(
                (eid) => eid !== id
            )
            prevElementsRef.current = updatedPrevElementsArr
        }) as EventListener
        window.addEventListener('elementRemoved', handleElementRemoved)
        return () => {
            window.removeEventListener('elementRemoved', handleElementRemoved)
        }
    }, [])

    const updateToGlobalState: UpdateToGlobalStateFn = (
        newShapeData,
        oldShapeData
    ) => {
        const userId = localStorage.getItem('userId')
        const isInitialArrowPlacement = newShapeData.prevX === -9999

        if (
            newShapeData.id &&
            (newShapeData.data.x != newShapeData.prevX ||
                newShapeData.data.y != newShapeData.prevY)
        ) {
            const nextX = parseInt(newShapeData.data.x)
            const nextY = parseInt(newShapeData.data.y)
            const record = stateRefForComponentStore.current?.[newShapeData.id]
            const moved = moveGeometryTo(record, nextX, nextY)
            let updateObj = {
                ...(moved ?? { x: nextX, y: nextY }),
                updatedBy: userId,
            }
            updateComponentBulkPropertiesInLocalStore(
                newShapeData.id,
                updateObj,
                isInitialArrowPlacement
            )
        }

        if (newShapeData?.isLineCircle === true) {
            let updateObj = {
                x1: parseInt(newShapeData.data.x1),
                x2: parseInt(newShapeData.data.x2),
                y1: parseInt(newShapeData.data.y1),
                y2: parseInt(newShapeData.data.y2),
                updatedBy: userId,
            }
            updateComponentBulkPropertiesInLocalStore(
                newShapeData.parentData.elementData.id,
                updateObj,
                isInitialArrowPlacement
            )
        }
    }

    const updateComponentVertices: UpdateComponentVerticesFn = (id, x, y) => {
        updateComponentVerticesInLocalStore(id, x, y)
        const btn = document.getElementById('show-click-anywhere-btn')
        if (btn) btn.style.opacity = '0'
    }

    return (
        <>
            <div id="selector-rect"></div>
            <div id={BASE_ROOT_ID}>{props.renderBackground?.()}</div>
            <div id="main-two-root"></div>
            {componentsToRender.map((Component, index) => (
                <Suspense key={index} fallback={<Loader />}>
                    <Component />
                </Suspense>
            ))}
            {ctxMenu && (
                <CanvasContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    onClose={() => setCtxMenu(null)}
                    onExportSvg={() => {
                        setCtxMenu(null)
                        void exportActiveSelection()
                    }}
                    onReorder={(op) => {
                        setCtxMenu(null)
                        reorderSelected(op)
                    }}
                />
            )}
        </>
    )
}

export default Canvas
