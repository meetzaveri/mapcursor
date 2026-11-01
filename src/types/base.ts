// Single source of truth for mapcursor's shared surface types.
//
// These are intentionally loose where they need to be: some fields carry
// internal handlers whose precise signatures live in the base/canvas files.

import type { MutableRefObject } from 'react'
import type Two from 'two.js'
import type { EraserSize } from '../constants/misc'
import type { MapBackdropConfig, MapAnchor } from '../baseTypes/types'
import type { ServerBaseConfig } from '../baseTypes/serverConfig'
import type { LegendPreset } from './legend'
import type { LegendPresetInput } from '../hooks/useLegendPresets'
import type { UseMetaPropertiesApi } from '../hooks/useMetaProperties'

// --- DB shape (mirrors CLAUDE.md "Component schema (from DB)") ----------

/**
 * A single position, in SURFACE units — never lng/lat.
 *
 * The order is `[x, y]`, which lines up positionally with GeoJSON's
 * `[easting, northing]`. That is not a coincidence: a surface unit already IS a
 * Web Mercator pixel at the base's `anchor.zoom` (512px tiles — see
 * `baseTypes/mercator.ts`), so `surfaceToLngLat` is an exact conversion in both
 * directions and the camera cancels out of it entirely.
 *
 * The coordinate space is a property of the BASE, not of each record: every
 * position here only means somewhere on Earth relative to that base's
 * `mapAnchorLng/Lat/Zoom`. There is deliberately no per-record `space` marker —
 * a redundant field can go stale, a single invariant cannot.
 */
export type SurfacePosition = [number, number]

/**
 * The geometry of an element, as a GeoJSON geometry whose coordinates are in
 * surface units. Structurally assignable to the matching `geojson` type, so a
 * GeoJSON adapter is a projection pass over `coordinates` and nothing more.
 *
 * Every live componentType maps onto exactly one of these three:
 *   point / text / circle → Point
 *   route / pencil        → LineString
 *   area                  → Polygon (one closed outer ring, per RFC 7946)
 */
export type SurfaceGeometry =
    | { type: 'Point'; coordinates: SurfacePosition }
    | { type: 'LineString'; coordinates: SurfacePosition[] }
    | { type: 'Polygon'; coordinates: SurfacePosition[][] }

/**
 * The metadata envelope — a GeoJSON `Feature` minus its redundant `type` tag.
 *
 * This is uniform across EVERY componentType. It replaced a polymorphic column
 * that was a bare vertex array for route/area/pencil and a bag of named keys
 * for point/text/circle — two shapes with no common root, which is why a route
 * could not carry a named property at all (an array's non-index keys do not
 * survive `JSON.stringify`, so they never reached jsonb).
 *
 * `geometry` is the single source of truth for position. The `x`/`y` columns
 * are a write-only cache derived from it by `setGeometry` — never read back as
 * truth. See `utils/geometry.ts`, which is the only module that should
 * construct or destructure this.
 */
export interface ComponentMetadata {
    geometry: SurfaceGeometry
    properties: Record<string, unknown>
}

export interface ComponentRecord {
    id: string
    componentType: string
    /** Distinguishes geo objects (point/area/route) from regular shapes. */
    objectClass?: 'shape' | 'geo'
    /**
     * text only: `false` lets the label scale with the map (counter-scale
     * resist 0). `null`/absent/`true` = zoom-resistant at TEXT_RESIST.
     * Every other componentType ignores this column and keeps the numeric
     * `metadata.resist` — see resolveResist() in utils/counterScale.ts.
     */
    zoomResistant?: boolean | null
    x: number
    y: number
    x1: number
    x2: number
    y1: number
    y2: number
    width: number
    height: number
    fill: string
    stroke: string | null
    linewidth: number | null
    strokeType: string | null
    textColor: string | null
    /**
     * Per-element opacity (0–1). A real column; `metadata.opacity` is the
     * legacy spelling, still read as a fallback by readOpacity(). Optional
     * because most creation paths leave it unset and let readOpacity default
     * to 1 — the map circle is the exception, seeded at CIRCLE_DEFAULTS.
     */
    opacity?: number | null
    /**
     * The legend preset this element is bound to, or null/absent for "None".
     *
     * A live binding, not a stamp: editing the preset restyles every element
     * carrying its id. Hand-editing any style key the preset owns clears this
     * (see the unbind wrap in utils/applyProperty.ts), so a legend swatch can
     * never disagree with the mark it captions.
     */
    legendPresetId?: string | null
    baseId: string | null
    baseName: string | null
    metadata: ComponentMetadata | null
    children: unknown | null
    isDummy: boolean | null
    updatedBy: string | null
    createdAt: number | null
    /**
     * Z-order key (back→front). Lower draws first (behind), higher draws on
     * top — matching Two.js `scene.children` where index 0 is the back. New
     * elements get `max(position)+1` (assigned in addToLocalComponentStore).
     * Optional/nullable: legacy DB rows and directly-seeded records (e.g. the
     * welcome sketch) may omit it; the z-order reconcile treats absent as 0.
     */
    position?: number | null
}

export type ComponentStore = Record<string, ComponentRecord>

// --- Camera ------------------------------------------------------------

export interface CameraChangeEvent {
    scale: number
    tx: number
    ty: number
}

export interface BaseProps {
    /**
     * INTERNAL — supplied by `views/Base/index.tsx`, never by a caller.
     *
     * The base row for a persisted base: its map georeference and the view a
     * recipient should land on. Resolved in the container so it is already
     * settled on this component's first render; see the note there.
     */
    serverBaseConfig?: ServerBaseConfig | null
}

// --- Context value ------------------------------------------------------

// Selected component is a complex Two.js-bound shape produced by the canvas.
// It carries `group.data.elementData` (a ComponentRecord) plus Two.js handles.
// Kept opaque here until canvas/selection internals convert (Stages 7–9).
export type SelectedComponent = unknown
export type SelectedGroup = unknown
// CurrentElement is the active toolbar tool name (e.g. 'pointer', 'rectangle',
// 'arrowLine', 'pencil', 'text'). Toolbar code compares against literal names.
export type CurrentElement = string

// History entry shape lives in useComponentHistory; tightened in Stage 4.
export type HistoryEntry = unknown

export interface BaseContextValue {
    // Identity / persistence
    baseId: string
    isPersisted: boolean
    persistBase: () => Promise<string>
    /**
     * Publish this base and return the id its link points at. Handles both the
     * unpersisted (`/`) and already-persisted cases, and is the only path that
     * should be used to share — calling `persistBase` alone creates a base
     * without ever making it public.
     */
    shareBase: () => Promise<string>
    backgroundBaseId: string | null
    onCreateBase: () => void
    createBaseLoading: boolean
    clearBase: () => void
    /** Open the file picker → parse → new-vs-merge chooser flow (P0 import). */
    beginBaseImport: () => void
    /** Show a short self-dismissing notice at the bottom of the canvas. */
    showCanvasNotice: (message: string) => void

    // Two.js handles
    twoJSInstance: Two | null
    setTwoJSInstanceInBase: (instance: Two | null) => void
    zuiInBase: unknown
    setZuiInstanceInBase: (zui: unknown) => void

    // Drawing modes
    isPencilMode: boolean
    isArrowDrawMode: boolean
    isTextDrawMode: boolean
    isArrowSelected: boolean
    isRubberMode: boolean
    eraserSize: EraserSize
    isPanMode: boolean
    togglePencilMode: (value: boolean) => void
    togglePointer: (value: boolean) => void
    togglePanMode: (value: boolean) => void
    setArrowDrawModeInBase: (value: boolean) => void
    setTextDrawModeInBase: (value: boolean) => void
    setRubberModeInBase: (value: boolean) => void
    setEraserSizeInBase: (value: EraserSize) => void
    cancelPendingElement: () => void
    enableTextDrawMode: (componentType?: 'text' | 'text') => void
    createTextAtSurface: (x: number, y: number) => void
    updateLastAddedElement: (element: unknown) => void

    // Selection
    selectedComponent: SelectedComponent | null
    setSelectedComponentInBase: (component: SelectedComponent | null) => void
    selectedGroup: SelectedGroup | null
    currentElement: CurrentElement | null
    setCurrentElementInBase: (element: CurrentElement | null) => void

    // Local component store mutations
    addToLocalComponentStore: (
        id: string,
        type: string,
        componentInfo: ComponentRecord,
        skipHistory?: boolean
    ) => void
    updateComponentVerticesInLocalStore: (
        id: string,
        x: number,
        y: number
    ) => void
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        update: Partial<ComponentRecord>,
        skipDbWrite?: boolean
    ) => void
    deleteComponentFromLocalStore: (id: string) => void
    deleteBulkComponentsFromLocalStore: (ids: string[]) => void
    stateRefForComponentStore: MutableRefObject<ComponentStore>
    // Reactive element store — re-renders consumers when elements are added or
    // removed (unlike stateRefForComponentStore, which is a mutable ref).
    componentStore: ComponentStore

    // Property application
    applyProperty: (
        name: string,
        value: unknown,
        opts?: { preview?: boolean }
    ) => void
    applyGroupProperty: (
        name: string,
        value: unknown,
        opts?: { preview?: boolean }
    ) => void

    // --- Legend presets ------------------------------------------------
    // The base's legend, and the four things the UI does to it. Writes are
    // gated on persistence inside useLegendPresets, exactly as component
    // mutations are — consumers never branch on it themselves.
    legendPresets: LegendPreset[]
    createLegendPreset: (input: LegendPresetInput) => LegendPreset
    /**
     * Rename or restyle a preset. Restyling immediately repaints and rewrites
     * every element bound to it — that is the live binding, and it is one undo
     * step for the whole sweep.
     */
    updateLegendPreset: (id: string, patch: Partial<LegendPresetInput>) => void
    /** Removes the caption; bound elements keep their styling and unbind. */
    deleteLegendPreset: (id: string) => void
    /** Apply a preset (or `null` for "None") to the current selection. */
    applyLegendPresetToSelection: (preset: LegendPreset | null) => void
    /** How many elements currently carry each preset, keyed by preset id. */
    legendPresetCounts: Record<string, number>

    // --- Meta properties -------------------------------------------------
    // Base-wide definitions and per-object values (hooks/useMetaProperties).
    // Writes are gated on persistence inside the hook; consumers never branch
    // on it. See .claude/context/meta-properties.md.
    meta: UseMetaPropertiesApi

    // Z-order of the currently-selected element. Bridged up from newCanvas via
    // a ref (the implementation lives there alongside reconcileZOrder); a no-op
    // until Canvas has mounted and populated it.
    reorderSelected: (op: 'front' | 'forward' | 'backward' | 'back') => void

    // Frames all elements in the viewport (zoom-to-fit). Bridged from Canvas via
    // a ref (the fitToContent implementation lives on the live zui handle);
    // a no-op returning false until Canvas has mounted. Used by "Go to content".
    fitToContent: () => boolean

    // True while a selected element/group is being dragged or resized — the
    // properties toolbar hides itself so it doesn't overlap the element.
    isElementDragging: boolean

    // Element defaults (read sites: ElementPropertiesToolbar, primary sidebar, factories)
    defaultFill: string
    defaultStrokeColor: string
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultOpacity: number
    defaultTextColor: string
    defaultTextSize: string
    defaultTextFontFamily: string
    setDefaultLinewidthInBase: (value: number) => void
    setDefaultStrokeTypeInBase: (value: string | null) => void

    // Mobile toolbar panel
    showMobileToolbarPanel: boolean
    setShowMobileToolbarPanel: (
        value: boolean | ((prev: boolean) => boolean)
    ) => void

    // Undo history
    historyLog: HistoryEntry[]
    historyLogRef: MutableRefObject<HistoryEntry[]>
    bucketLog: HistoryEntry[]
    bucketLogRef: MutableRefObject<HistoryEntry[]>
    recordBatchToHistoryLog: (entries: HistoryEntry[]) => void
    undoLastAction: () => void
    redoLastAction: () => void

    /**
     * Travel to a searched place. Flies the CAMERA to the place's surface
     * coordinate under the base's existing anchor, so drawn elements keep the
     * geography they were drawn over; only an empty map re-anchors. See the
     * implementation in base.tsx for why.
     */
    goToPlace: (place: MapAnchor) => void
    /** Zoom-button step, in ZUI zoom units (log2 scale). */
    zoomStep: number
    /**
     * True once the map backdrop has actually mounted.
     *
     * Share reads this: the anchor is read off the LIVE map, so until the
     * (~1MB, dynamically imported) maplibre chunk lands there is nothing to
     * read and the base would be georeferenced to a timezone guess instead of
     * the place the user is looking at.
     */
    backdropReady: boolean
    /** Live backdrop config (the map anchor) for the JSON export envelope. */
    readBackdropConfig: () => MapBackdropConfig
    /** Rasterize the live backdrop for PNG export; null when there's nothing. */
    captureBackdrop: (width: number, height: number) => Promise<string | null>
}

// --- Utility exports ---------------------------------------------------

export interface RandomUsername {
    nickname: string
    firstName: string
    lastName: string
}
