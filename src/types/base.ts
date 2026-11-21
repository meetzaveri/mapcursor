import type { MutableRefObject } from 'react'
import type Two from 'two.js'
import type { EraserSize } from '../constants/misc'
import type { MapBackdropConfig, MapAnchor } from '../baseTypes/types'
import type { ServerBaseConfig } from '../baseTypes/serverConfig'
import type { LegendPreset } from './legend'
import type { LegendPresetInput } from '../hooks/useLegendPresets'
import type { UseMetaPropertiesApi } from '../hooks/useMetaProperties'

export type SurfacePosition = [number, number]

export type SurfaceGeometry =
    | { type: 'Point'; coordinates: SurfacePosition }
    | { type: 'LineString'; coordinates: SurfacePosition[] }
    | { type: 'Polygon'; coordinates: SurfacePosition[][] }

export interface ComponentMetadata {
    geometry: SurfaceGeometry
    properties: Record<string, unknown>
}

export interface ComponentRecord {
    id: string
    componentType: string
    objectClass?: 'shape' | 'geo'
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
    fillType?: string | null
    textColor: string | null
    opacity?: number | null
    legendPresetId?: string | null
    baseId: string | null
    baseName: string | null
    metadata: ComponentMetadata | null
    children: unknown | null
    isDummy: boolean | null
    updatedBy: string | null
    createdAt: number | null
    position?: number | null
}

export type ComponentStore = Record<string, ComponentRecord>

export interface CameraChangeEvent {
    scale: number
    tx: number
    ty: number
}

export interface BaseProps {
    serverBaseConfig?: ServerBaseConfig | null
}

export type SelectedComponent = unknown
export type SelectedGroup = unknown
export type CurrentElement = string

export type HistoryEntry = unknown

export interface BaseContextValue {
    baseId: string
    isPersisted: boolean
    persistBase: () => Promise<string>
    shareBase: () => Promise<string>
    backgroundBaseId: string | null
    onCreateBase: () => void
    createBaseLoading: boolean
    clearBase: () => void
    beginBaseImport: () => void
    showCanvasNotice: (message: string, durationMs?: number) => void

    twoJSInstance: Two | null
    setTwoJSInstanceInBase: (instance: Two | null) => void
    zuiInBase: unknown
    setZuiInstanceInBase: (zui: unknown) => void

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

    selectedComponent: SelectedComponent | null
    setSelectedComponentInBase: (component: SelectedComponent | null) => void
    selectedGroup: SelectedGroup | null
    currentElement: CurrentElement | null
    setCurrentElementInBase: (element: CurrentElement | null) => void

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
    componentStore: ComponentStore

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

    legendPresets: LegendPreset[]
    createLegendPreset: (input: LegendPresetInput) => LegendPreset
    updateLegendPreset: (id: string, patch: Partial<LegendPresetInput>) => void
    deleteLegendPreset: (id: string) => void
    applyLegendPresetToSelection: (preset: LegendPreset | null) => void
    legendPresetCounts: Record<string, number>

    meta: UseMetaPropertiesApi

    reorderSelected: (op: 'front' | 'forward' | 'backward' | 'back') => void

    fitToContent: () => boolean

    isElementDragging: boolean

    defaultFill: string
    defaultStrokeColor: string
    defaultLinewidth: number
    defaultStrokeType: string | null
    defaultFillType: string | null
    defaultOpacity: number
    defaultTextColor: string
    defaultTextSize: string
    defaultTextFontFamily: string
    setDefaultLinewidthInBase: (value: number) => void
    setDefaultStrokeTypeInBase: (value: string | null) => void

    showMobileToolbarPanel: boolean
    setShowMobileToolbarPanel: (
        value: boolean | ((prev: boolean) => boolean)
    ) => void

    historyLog: HistoryEntry[]
    historyLogRef: MutableRefObject<HistoryEntry[]>
    bucketLog: HistoryEntry[]
    bucketLogRef: MutableRefObject<HistoryEntry[]>
    recordBatchToHistoryLog: (entries: HistoryEntry[]) => void
    undoLastAction: () => void
    redoLastAction: () => void

    goToPlace: (place: MapAnchor) => void
    zoomStep: number
    backdropReady: boolean
    readBackdropConfig: () => MapBackdropConfig
    captureBackdrop: (width: number, height: number) => Promise<string | null>
}

export interface RandomUsername {
    nickname: string
    firstName: string
    lastName: string
}
