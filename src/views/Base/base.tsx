import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
    type ReactNode,
} from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import {
    GET_COMPONENTS_FOR_BASE_QUERY,
    GET_COMPONENT_TYPES,
} from '../../schema/queries'
import {
    UPDATE_USER_REVISIT_COUNT,
    INSERT_COMPONENT,
    INSERT_BULK_COMPONENTS,
    DELETE_COMPONENT_BY_ID,
    DELETE_BULK_COMPONENTS,
    UPDATE_COMPONENT_INFO,
    CREATE_BASE,
    UPDATE_BASE_VISIBILITY,
    SHARE_PERSISTED_BASE,
    INSERT_BULK_LEGEND_PRESETS,
    RESTYLE_COMPONENTS_BY_PRESET,
} from '../../schema/mutations'
import LegendPanel from '../../components/legend/legendPanel'
import MetaPropertiesPanel from '../../components/metaProperties/metaPropertiesPanel'
import MobileSideActions from '../../components/sidebar/mobileSideActions'
import PresetChips from '../../components/legend/presetChips'
import {
    useLegendPresets,
    writeLegendPresetsLocal,
} from '../../hooks/useLegendPresets'
import type { LegendPresetInput } from '../../hooks/useLegendPresets'
import type { LegendPreset, LegendPresetType } from '../../types/legend'
import {
    readArmedPresets,
    writeArmedPresets,
} from '../../utils/armedLegendPreset'
import type { ArmedPresetMap } from '../../utils/armedLegendPreset'
import { presetStylePatch } from '../../types/legend'
import {
    applyPresetToElement,
    applyPresetToMany,
    idsBoundToPreset,
    presetApplyPatch,
} from '../../utils/applyLegendPreset'
import Canvas from '../../newCanvas'
import ZoomControls from '../../components/ZoomControls'
import GoToContentButton from '../../components/goToContentButton'
import HelpButton from '../../components/helpButton'
import ChromeReveal from '../../components/common/chromeReveal'
import { CHROME_ENTER_FROM_BOTTOM } from '../../components/common/chromeEnter'
import Sidebar from '../../components/sidebar/primary'
import ElementPropertiesToolbar from '../../components/sidebar/elementProperties'
import controlsIcon from '../../assets/controls.svg'
import OkIcon from '../../assets/ok.svg?react'
import CloseIcon from '../../assets/close.svg?react'
import PermissionErrorModal from '../../components/modals/PermissionErrorModal'
import StorageLimitModal from '../../components/modals/StorageLimitModal'
import MapStartLocationModal from '../../components/modals/MapStartLocationModal'
import MobileDeleteButton from '../../components/sidebar/mobileDeleteButton'
import MobileTextControls from '../../components/sidebar/mobileTextControls'
import {
    resolveTimezoneCity,
    DEFAULT_ANCHOR_ZOOM,
} from '../../utils/timezoneCities'
import { MAP_ZOOM_LIMITS } from '../../baseTypes/zoomLimits'
import { MAP_ZOOM_STEP } from '../../baseTypes/types'
import {
    BaseFullModal,
    BaseTooLargeModal,
} from '../../components/modals/BaseSizeLimitModal'
import { exportBaseAsJson } from '../../utils/exportBase'
import { toComponentColumns } from '../../utils/componentColumns'
import {
    lngLatToSurface,
    mapZoomForScale,
    scaleForMapZoom,
    surfaceToLngLat,
} from '../../baseTypes/mercator'
import {
    isAnchorKeyExpired,
    writeAnchorConfig,
} from '../../baseTypes/anchorStorage'
import { baseUrl } from '../../utils/baseRoutes'
import {
    trackEvent,
    rememberOwnBase,
    isOwnBase,
    onceEver,
    oncePerSession,
} from '../../utils/analytics'
import {
    readViewport,
    writeViewport,
    IDENTITY_VIEWPORT,
} from '../../utils/viewportStorage'
import type { MapAnchor } from '../../baseTypes/types'
import ImportBaseModal from '../../components/modals/ImportBaseModal'
import {
    excludeImages,
    openBaseFilePicker,
    parseImportedBase,
} from '../../utils/importBase'
import { restoreImageAssets } from '../../utils/assetStore'
import { useMetaProperties } from '../../hooks/useMetaProperties'
import type { UseMetaPropertiesApi } from '../../hooks/useMetaProperties'
import { writeMetaLocal } from '../../utils/metaPropertyStore'
import type { ParsedImport, BaseViewport } from '../../utils/importBase'
import { draftFitsForStore } from '../../utils/baseSizeGuard'
import { generateUUID } from '../../utils/misc'
import { prefetchElementModule } from '../../elementModules'
import {
    pollUntilElement,
    getShapeTextNodes,
    applyShapeText,
    shapeTextStyleFromMeta,
    readOpacity,
} from '../../utils/canvasUtils'
import { resolveHeightForTextStyleChange } from '../../utils/shapeTextFit'
import { lineHeightFor } from '../../utils/textLayout'
import {
    TEXT_SIZES_OBJECT,
    MOBILE_TEXT_SIZES_OBJECT,
    TRANSPARENT_FILL,
} from '../../utils/constants'
import {
    RUBBER_MODE_KEY,
    GROUP_COMPONENT,
    IMAGE_COMPONENT,
    DRAFT_STORAGE_KEY,
    ARROW_DRAW_MODE_KEY,
    TEXT_DRAW_MODE_KEY,
    TEXT_SELECTOR_REFRESH_EVENT,
    PENDING_SHAPE_TYPE_KEY,
    PENDING_SHAPE_PROPS_KEY,
    LAST_ADDED_ELEMENT_ID_KEY,
    PENCIL_MODE_KEY,
    BACKGROUND_BASE_STORAGE_KEY,
    VIEWPORT_KEY_PREFIX,
    MOBILE_VIEWPORT_KEY_PREFIX,
    VIEWPORT_TTL_MS,
    MAP_ANCHOR_KEY_PREFIX,
    DEFAULT_TEXT_SIZE,
    DRAW_MODE_KEY,
    DRAW_TYPE_KEY,
    DRAW_PROPS_KEY,
    POINT_PLACE_MODE_KEY,
    TEXT_EDIT_END_EVENT,
    TEXT_EDIT_START_EVENT,
    LOCAL_BASE_ID_KEY,
    SHAPE_DEFAULT_STROKE,
} from '../../constants/misc'
import { useMapBackdrop } from '../../hooks/useMapBackdrop'
import { useDrawingModes } from '../../hooks/useDrawingModes'
import { useElementDefaults } from '../../hooks/useElementDefaults'
import { useMobileToolbarPanels } from '../../hooks/useMobileToolbarPanels'
import { useLocalDraftPersistence } from '../../hooks/useLocalDraftPersistence'
import { useElementCountWarning } from '../../hooks/useElementCountWarning'
import { PERFORMANCE_WARNING_THRESHOLD } from '../../utils/countBaseElements'
import Toast from '../../components/common/toast'
import {
    useComponentHistory,
    type HistoryEntry,
} from '../../hooks/useComponentHistory'
import { createApplyProperty } from '../../utils/applyProperty'
import { createApplyGroupProperty } from '../../utils/applyGroupProperty'
import type {
    BaseProps,
    BaseContextValue,
    ComponentRecord,
    ComponentStore,
    CameraChangeEvent,
} from '../../types/base'
import {
    geometryFields,
    moveGeometryTo,
    pointGeometry,
    readProperties,
    setProperties,
} from '../../utils/geometry'
import { BaseContext, useBaseContext } from './baseContext'

export { BaseContext, useBaseContext }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripTypename(obj: any): any {
    if (Array.isArray(obj)) return obj.map(stripTypename)
    if (obj && typeof obj === 'object') {
        const { __typename, ...rest } = obj
        return Object.fromEntries(
            Object.entries(rest).map(([k, v]) => [k, stripTypename(v)])
        )
    }
    return obj
}

const formatDraftBytes = (n: number): string => {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
    return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const BaseViewPage: React.FC<BaseProps> = (props) => {
    const routeParams = useParams()
    const baseIdFromUrl = routeParams.id
    const [localBaseId, setLocalBaseId] = useState(() => {
        if (baseIdFromUrl) return baseIdFromUrl
        try {
            const draft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (draft) {
                const parsed = JSON.parse(draft)
                if (parsed?.baseId) return parsed.baseId
            }
        } catch (_) {}
        try {
            const remembered = localStorage.getItem(LOCAL_BASE_ID_KEY)
            if (remembered) return remembered
        } catch (_) {}
        return generateUUID()
    })
    const [isPersisted, setIsPersisted] = useState(!!baseIdFromUrl)
    const isPersistedRef = useRef(!!baseIdFromUrl)
    const baseId = baseIdFromUrl || localBaseId
    const [backgroundBaseId, setBackgroundBaseId] = useState<string | null>(
        null
    )
    const backgroundBaseIdRef = useRef<string | null>(null)
    const baseCreationInFlightRef = useRef<boolean>(false)

    const rememberLocalBaseId = useCallback((): void => {
        if (baseIdFromUrl) return
        try {
            localStorage.setItem(LOCAL_BASE_ID_KEY, localBaseId)
        } catch (_) {}
    }, [baseIdFromUrl, localBaseId])

    useEffect(() => {
        if (baseIdFromUrl) return
        try {
            if (localStorage.getItem(LOCAL_BASE_ID_KEY)) {
                localStorage.setItem(LOCAL_BASE_ID_KEY, localBaseId)
            }
        } catch (_) {}
    }, [localBaseId, baseIdFromUrl])

    useEffect(() => {
        if (!baseIdFromUrl) return
        trackEvent('base_opened', { own: isOwnBase(baseIdFromUrl) })
    }, [baseIdFromUrl])

    const {
        loading: getComponentsForBaseLoading,
        data: getComponentsForBaseData,
        error: getComponentsForBaseError,
    } = useQuery(GET_COMPONENTS_FOR_BASE_QUERY, {
        variables: { baseId },
        fetchPolicy: 'cache-first',
        skip: !isPersisted,
    })

    const { data: getComponentTypesData } = useQuery(GET_COMPONENT_TYPES)

    const [insertComponent] = useMutation(INSERT_COMPONENT, {
        ignoreResults: true,
    })

    const [updateComponentInfo] = useMutation(UPDATE_COMPONENT_INFO, {
        ignoreResults: true,
    })

    const [
        deleteComponent,
        {
            loading: deleteComponentLoading,
            data: deleteComponentData,
            error: deleteComponentError,
        },
    ] = useMutation(DELETE_COMPONENT_BY_ID)

    const [deleteBulkComponents] = useMutation(DELETE_BULK_COMPONENTS)

    const [
        updateUserRevisit,
        {
            loading: updateUserRevisitLoading,
            data: updateUserRevisitData,
            error: updateUserRevisitError,
        },
    ] = useMutation(UPDATE_USER_REVISIT_COUNT)

    const navigate = useNavigate()

    const [createBase, { loading: createBaseLoading, data: createBaseData }] =
        useMutation(CREATE_BASE)

    const [updateBaseVisibility] = useMutation(UPDATE_BASE_VISIBILITY)
    const [sharePersistedBase] = useMutation(SHARE_PERSISTED_BASE)

    const [insertBulkComponents] = useMutation(INSERT_BULK_COMPONENTS, {
        ignoreResults: true,
    })

    const [insertBulkLegendPresets] = useMutation(INSERT_BULK_LEGEND_PRESETS, {
        ignoreResults: true,
    })

    const [restyleComponentsByPreset] = useMutation(
        RESTYLE_COMPONENTS_BY_PRESET,
        { ignoreResults: true }
    )

    const [componentStore, setComponentStore] = useState<ComponentStore>({})

    const { showPerfWarning, dismissPerfWarning } = useElementCountWarning({
        componentStore,
        isPersisted,
        baseId,
    })

    const [canvasNotice, setCanvasNotice] = useState<string | null>(null)
    const [canvasNoticeMs, setCanvasNoticeMs] = useState(4000)
    const showCanvasNotice = useCallback(
        (message: string, durationMs = 4000) => {
            setCanvasNoticeMs(durationMs)
            setCanvasNotice(message)
        },
        []
    )
    const dismissCanvasNotice = useCallback(() => setCanvasNotice(null), [])

    const [lastAddedElement, setLastAddedElement] =
        useState<ComponentRecord | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [twoJSInstance, setTwoJSInstance] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [zuiInBase, setZuiInBase] = useState<any>(null)
    const [selectedComponent, setSelectedComponent] = useState<unknown>(null)
    const [selectedGroup, setSelectedGroup] = useState<unknown>(null)
    const selectedGroupRef = useRef<unknown>(null)
    const [isElementDragging, setIsElementDragging] = useState(false)
    const selectionPresentRef = useRef(false)
    const [currentElement, setCurrentElement] = useState<string | null>(null)
    const [showPermissionErrorModal, setShowPermissionErrorModal] =
        useState(false)
    const { isDesktop, isMobile, isLaptop, isTablet } = useMediaQueryUtils()

    const stateRefForComponentStore = useRef<ComponentStore>({})
    const reorderSelectedRef = useRef<
        ((op: 'front' | 'forward' | 'backward' | 'back') => void) | null
    >(null)
    const reorderSelected = useCallback(
        (op: 'front' | 'forward' | 'backward' | 'back'): void => {
            reorderSelectedRef.current?.(op)
        },
        []
    )
    const fitToContentRef = useRef<(() => boolean) | null>(null)
    const fitToContent = useCallback(
        (): boolean => Boolean(fitToContentRef.current?.()),
        []
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twoJSInstanceRef = useRef<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zuiInBaseRef = useRef<any>(null)
    const skipComponentStoreResetRef = useRef<boolean>(false)

    const {
        pointerToggle,
        setPointerToggle,
        isPencilMode,
        setPencilMode,
        isArrowDrawMode,
        setIsArrowDrawMode,
        isTextDrawMode,
        setIsTextDrawMode,
        isRubberMode,
        eraserSize,
        isPanMode,
        togglePanMode: togglePanModeFromHook,
        setArrowDrawModeInBase,
        setTextDrawModeInBase,
        setRubberModeInBase,
        setEraserSizeInBase,
        clearDrawModesFromStorage,
    } = useDrawingModes()

    const {
        handleCameraChange: handleBackdropCameraChange,
        captureBackdrop,
        readConfig: readBackdropConfig,
        setMapAnchor,
        hadStoredMapAnchor,
        ready: backdropReady,
        firstPaint: mapFirstPaint,
    } = useMapBackdrop({
        baseId,
        serverConfig: props.serverBaseConfig,
    })

    useEffect(() => {
        if (!backdropReady) return
        trackEvent('canvas_ready', { persisted: !!baseIdFromUrl })
    }, [backdropReady, baseIdFromUrl])

    const [initialMapLanding] = useState(() => {
        const anchor = props.serverBaseConfig?.mapAnchor
        const landing = props.serverBaseConfig?.landing
        if (!anchor || !landing) return null
        return { anchor, lngLat: landing.lngLat, zoom: landing.zoom }
    })

    const handleCameraChange = useCallback(
        (camera: CameraChangeEvent): void => {
            handleBackdropCameraChange(camera)
        },
        [handleBackdropCameraChange]
    )

    const { showMobileToolbarPanel, setShowMobileToolbarPanel } =
        useMobileToolbarPanels({ isMobile, selectedComponent })

    const [showMultiClickDrawControls, setShowMultiClickDrawControls] =
        useState(false)
    useEffect(() => {
        const onStart = (): void => setShowMultiClickDrawControls(true)
        const onEnd = (): void => setShowMultiClickDrawControls(false)
        window.addEventListener('multiClickDrawStart', onStart)
        window.addEventListener('multiClickDrawEnd', onEnd)
        return (): void => {
            window.removeEventListener('multiClickDrawStart', onStart)
            window.removeEventListener('multiClickDrawEnd', onEnd)
        }
    }, [])

    const [isEditingText, setIsEditingText] = useState(false)
    useEffect(() => {
        const onStart = (): void => setIsEditingText(true)
        const onEnd = (): void => setIsEditingText(false)
        window.addEventListener(TEXT_EDIT_START_EVENT, onStart)
        window.addEventListener(TEXT_EDIT_END_EVENT, onEnd)
        return (): void => {
            window.removeEventListener(TEXT_EDIT_START_EVENT, onStart)
            window.removeEventListener(TEXT_EDIT_END_EVENT, onEnd)
        }
    }, [])

    const {
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultFillType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultFillType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize,
        setDefaultTextFontFamily,
        setDefaultLinewidthInBase,
        setDefaultStrokeTypeInBase,
        resetDefaults,
    } = useElementDefaults()

    useEffect(() => {
        const forceInkDefaults = (): void => {
            setDefaultFill(TRANSPARENT_FILL)
            setDefaultStrokeColor(SHAPE_DEFAULT_STROKE)
            setDefaultTextColor(SHAPE_DEFAULT_STROKE)
        }
        forceInkDefaults()
        let prevDark = document.documentElement.classList.contains('dark')
        const obs = new MutationObserver(() => {
            const isDark = document.documentElement.classList.contains('dark')
            if (isDark === prevDark) return
            prevDark = isDark
            forceInkDefaults()
        })
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        })
        return () => obs.disconnect()
    }, [setDefaultFill, setDefaultStrokeColor, setDefaultTextColor])

    const onStorageLimitRef = useRef<(() => Promise<void>) | null>(null)
    const onDraftOverBudgetRef = useRef<(() => void) | null>(null)

    const {
        showStorageLimitModal,
        setShowStorageLimitModal,
        storageLimitBaseUrl,
        setStorageLimitBaseUrl,
        handleStartNewCanvas,
        handleContinueOnSavedBase,
        showBaseTooLargeModal,
        handleDownloadBaseBackup,
        handleStartFreshFromTooLarge,
        handleOpenBaseAnyway,
        draftSizeBytes,
    } = useLocalDraftPersistence({
        isPersisted,
        localBaseId,
        componentStore,
        setComponentStore,
        backgroundBaseIdRef,
        setBackgroundBaseId,
        onStorageLimitRef,
        onDraftOverBudgetRef,
        isMobile,
    })

    const applyMetaHistoryRef = useRef<
        UseMetaPropertiesApi['applyHistory'] | null
    >(null)

    const {
        historyLog,
        historyLogRef,
        bucketLog,
        bucketLogRef,
        recordToHistoryLog,
        recordBatchToHistoryLog,
        undoLastAction,
        redoLastAction,
        clearHistory,
    } = useComponentHistory({
        twoJSInstanceRef,
        stateRefForComponentStore,
        isPersistedRef,
        baseId,
        isPersisted,
        insertComponent,
        deleteComponent,
        updateComponentInfo,
        setComponentStore,
        setShowPermissionErrorModal,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultFillType,
        selectedComponent,
        selectedGroupRef,
        stripTypename,
        applyMetaHistoryRef,
    })

    const {
        legendPresets,
        legendPresetsRef,
        createPreset,
        updatePreset,
        deletePreset,
        replacePresets,
    } = useLegendPresets({
        baseId,
        isPersistedRef,
        seed: getComponentsForBaseData?.legendPresets,
    })

    const metaPropertiesApi = useMetaProperties({
        baseId,
        isPersistedRef,
        seed: getComponentsForBaseData?.metaProperties,
        recordToHistoryLog,
    })
    applyMetaHistoryRef.current = metaPropertiesApi.applyHistory

    const [showBaseFullModal, setShowBaseFullModal] = useState(false)
    onDraftOverBudgetRef.current = (): void => {
        if (historyLogRef.current.length === 0) return
        undoLastAction()
        setShowBaseFullModal(true)
    }

    const handleExportBaseFromModal = useCallback(() => {
        const scene = twoJSInstanceRef.current?.scene
        const viewport = scene
            ? {
                  scale: typeof scene.scale === 'number' ? scene.scale : 1,
                  tx: scene.translation.x,
                  ty: scene.translation.y,
              }
            : { scale: 1, tx: 0, ty: 0 }
        void metaPropertiesApi
            .exportSet()
            .catch(() => undefined)
            .then((metaSet) =>
                exportBaseAsJson(
                    stateRefForComponentStore.current,
                    viewport,
                    readBackdropConfig(),
                    legendPresetsRef.current,
                    metaSet
                )
            )
        setShowBaseFullModal(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readBackdropConfig])

    const [showImportChooser, setShowImportChooser] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)
    const pendingImportRef = useRef<ParsedImport | null>(null)

    const restoreImportedViewport = useCallback((vp: BaseViewport): void => {
        const zui = zuiInBaseRef.current?.zui
        if (!zui) return
        try {
            zui.reset?.()
            zui.zoomSet(vp.scale, 0, 0)
            zui.translateSurface(vp.tx, vp.ty)
            twoJSInstanceRef.current?.update()
        } catch (e) {
            console.error('[import] viewport restore failed', e)
        }
    }, [])

    useEffect(() => {
        zuiInBaseRef.current?.setZoomLimits?.(
            MAP_ZOOM_LIMITS.min,
            MAP_ZOOM_LIMITS.max
        )
    }, [zuiInBase])

    useEffect(() => {
        const root = document.getElementById('main-two-root')
        if (!root) return
        root.classList.toggle('map-drag-pan', currentElement === 'pointer')
    }, [currentElement])

    const importAsNewCanvas = useCallback(
        (parsed: ParsedImport): void => {
            window.dispatchEvent(new Event('clearSelector'))
            setSelectedComponent(null)
            twoJSInstanceRef.current?.clear()
            twoJSInstanceRef.current?.update()

            const newLocalId = generateUUID()
            const store: ComponentStore = {}
            Object.entries(parsed.components).forEach(([id, comp]) => {
                if (
                    isPersistedRef.current &&
                    comp.componentType === IMAGE_COMPONENT
                ) {
                    return
                }
                store[id] = { ...comp, baseId: newLocalId }
            })
            stateRefForComponentStore.current = store
            writeLegendPresetsLocal(newLocalId, parsed.legendPresets)
            replacePresets(parsed.legendPresets)

            if (!isPersistedRef.current) {
                const anchor =
                    parsed.mapAnchor ?? readBackdropConfig().mapAnchor
                if (parsed.mapAnchor) setMapAnchor(parsed.mapAnchor)
                if (anchor) writeAnchorConfig(newLocalId, { mapAnchor: anchor })

                writeMetaLocal(newLocalId, {
                    properties: parsed.metaProperties.properties.map((p) => ({
                        ...p,
                        baseId: newLocalId,
                    })),
                    values: parsed.metaProperties.values.map((v) => ({
                        ...v,
                        baseId: newLocalId,
                    })),
                })
            }

            skipComponentStoreResetRef.current = true
            setLocalBaseId(newLocalId)
            setComponentStore(store)
            clearHistory(isPersisted)

            if (parsed.viewport) restoreImportedViewport(parsed.viewport)
        },
        [isPersisted, restoreImportedViewport, readBackdropConfig, setMapAnchor]
    )

    const mergeImportedBase = useCallback(
        async (parsed: ParsedImport): Promise<void> => {
            const records = Object.values(parsed.components)
            records.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

            const baseMax = Object.values(
                stateRefForComponentStore.current
            ).reduce((m: number, c) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = (c as any)?.position
                return Number.isFinite(p) ? Math.max(m, p) : m
            }, 0)

            const idMap = new Map<string, string>()
            records.forEach((r) => idMap.set(r.id, generateUUID()))

            const presetIdMap = new Map<string, string>()
            const importedPresets = parsed.legendPresets.map((preset, i) => {
                const newId = generateUUID()
                presetIdMap.set(preset.id, newId)
                return {
                    ...preset,
                    id: newId,
                    baseId,
                    position: legendPresetsRef.current.length + i,
                }
            })
            if (importedPresets.length > 0) {
                replacePresets([
                    ...legendPresetsRef.current,
                    ...importedPresets,
                ])
                if (isPersistedRef.current) {
                    await insertBulkLegendPresets({
                        variables: {
                            objects: importedPresets.map((p) => ({
                                id: p.id,
                                baseId,
                                name: p.name,
                                elementType: p.elementType,
                                style: p.style,
                                position: p.position,
                            })),
                        },
                    }).catch(() => {})
                }
            }

            const batch: HistoryEntry[] = []
            records.forEach((r, i) => {
                const newId = idMap.get(r.id) as string
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cloned: any = { ...r, id: newId, baseId }
                cloned.legendPresetId =
                    presetIdMap.get(r.legendPresetId ?? '') ?? null
                cloned.position = baseMax + i + 1
                addToLocalComponentStore(
                    newId,
                    cloned.componentType,
                    cloned,
                    true
                )
                batch.push({
                    action: 'ADD',
                    id: newId,
                    componentInfo: { ...cloned },
                })
            })
            if (batch.length > 0) recordBatchToHistoryLog(batch)

            await metaPropertiesApi
                .mergeIncoming(parsed.metaProperties, idMap)
                .catch((e) => console.error('[import] meta merge failed', e))
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [baseId]
    )

    const beginBaseImport = useCallback(async (): Promise<void> => {
        const text = await openBaseFilePicker()
        if (text == null) return
        try {
            const raw = parseImportedBase(text)
            const parsed = isPersistedRef.current ? excludeImages(raw) : raw
            if (Object.keys(parsed.components).length === 0) {
                pendingImportRef.current = null
                setImportError(
                    parsed.excludedImages > 0
                        ? "This file only has images. Shared canvases don't support images yet."
                        : 'This file has no readable canvas elements.'
                )
            } else {
                pendingImportRef.current = parsed
                setImportError(null)
            }
        } catch (e) {
            pendingImportRef.current = null
            setImportError(
                e instanceof Error ? e.message : 'Could not read this file.'
            )
        }
        setShowImportChooser(true)
    }, [])

    const rejectIfWontFit = useCallback(
        (projected: ComponentStore): boolean => {
            if (draftFitsForStore(projected)) return false
            setImportError(
                "This canvas is too large to fit in this browser's local storage. " +
                    'Browsers store canvas text at roughly twice its file size and ' +
                    'cap local storage near 5 MB, so very large canvases can’t be ' +
                    'saved locally. Try a smaller one, or split it across canvases.'
            )
            return true
        },
        []
    )

    const handleImportOpenAsNew = useCallback(() => {
        const parsed = pendingImportRef.current
        if (!parsed) {
            setShowImportChooser(false)
            return
        }
        if (rejectIfWontFit(parsed.components)) return
        setShowImportChooser(false)
        pendingImportRef.current = null
        void restoreImageAssets(parsed.assets).then(() =>
            importAsNewCanvas(parsed)
        )
    }, [importAsNewCanvas, rejectIfWontFit])

    const handleImportMerge = useCallback(() => {
        const parsed = pendingImportRef.current
        if (!parsed) {
            setShowImportChooser(false)
            return
        }
        const projected: ComponentStore = {
            ...stateRefForComponentStore.current,
            ...parsed.components,
        }
        if (rejectIfWontFit(projected)) return
        setShowImportChooser(false)
        pendingImportRef.current = null
        void restoreImageAssets(parsed.assets).then(() =>
            mergeImportedBase(parsed)
        )
    }, [mergeImportedBase, rejectIfWontFit])

    const handleImportChooserClose = useCallback(() => {
        setShowImportChooser(false)
        pendingImportRef.current = null
        setImportError(null)
    }, [])

    useEffect(() => {
        clearDrawModesFromStorage()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        try {
            const now = Date.now()
            const protectedAnchorIds = new Set<string>([localBaseId])
            const remembered = localStorage.getItem(LOCAL_BASE_ID_KEY)
            if (remembered) protectedAnchorIds.add(remembered)
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i)
                if (
                    !key ||
                    (!key.startsWith(VIEWPORT_KEY_PREFIX) &&
                        !key.startsWith(MOBILE_VIEWPORT_KEY_PREFIX) &&
                        !key.startsWith(MAP_ANCHOR_KEY_PREFIX))
                )
                    continue
                try {
                    const parsed = JSON.parse(
                        localStorage.getItem(key) ?? 'null'
                    )
                    const expired = key.startsWith(MAP_ANCHOR_KEY_PREFIX)
                        ? isAnchorKeyExpired(
                              key,
                              parsed?.savedAt,
                              now,
                              protectedAnchorIds
                          )
                        : !parsed?.savedAt ||
                          now - parsed.savedAt > VIEWPORT_TTL_MS
                    if (expired) localStorage.removeItem(key)
                } catch (_) {
                    localStorage.removeItem(key)
                }
            }
        } catch (_) {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const prevBaseIdRef = useRef(baseId)
    useEffect(() => {
        if (prevBaseIdRef.current !== baseId) {
            if (!skipComponentStoreResetRef.current) {
                setComponentStore({})
            }
            skipComponentStoreResetRef.current = false
            prevBaseIdRef.current = baseId
        }
    }, [baseId])

    useEffect(() => {
        const userId = localStorage.getItem('userId')
        if (!userId) return
        updateUserRevisit({
            variables: { userId, lastVisit: new Date().toISOString() },
        }).catch(() => {})
    }, [])

    useEffect(() => {
        if (isPersisted && baseId) {
        }
    }, [isPersisted])

    useEffect(() => {
        if (
            !getComponentsForBaseLoading &&
            getComponentsForBaseData &&
            getComponentsForBaseData.components
        ) {
            if (getComponentsForBaseData.components.length > 0) {
                const baseComponentStore: ComponentStore = { ...componentStore }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                getComponentsForBaseData.components.forEach((item: any) => {
                    if (item.componentType === IMAGE_COMPONENT) return
                    baseComponentStore[item.id] = item as ComponentRecord
                })
                setComponentStore(baseComponentStore)
            }
        }
    }, [getComponentsForBaseData])

    useEffect(() => {
        isPersistedRef.current = isPersisted
    }, [isPersisted])

    useEffect(() => {
        const CORE_ELEMENT_CHUNKS = [
            'point',
            'area',
            'route',
            'circle',
            'pencil',
            'text',
            'groupobject',
        ]
        const warm = (): void => {
            CORE_ELEMENT_CHUNKS.forEach(prefetchElementModule)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ric = (window as any).requestIdleCallback as
            ((cb: () => void, opts?: { timeout: number }) => number) | undefined
        if (ric) {
            const handle = ric(warm, { timeout: 3000 })
            return (): void => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(window as any).cancelIdleCallback?.(handle)
            }
        }
        const t = setTimeout(warm, 1500)
        return (): void => clearTimeout(t)
    }, [])

    useEffect(() => {
        console.log('change in componentStore in Board', componentStore)
        stateRefForComponentStore.current = componentStore
    }, [componentStore])

    const setRootCursor = (cursor: string) => {
        const root = document.getElementById('main-two-root')
        if (root) root.style.cursor = cursor
    }

    const updateLastAddedElement = (obj: unknown) => {
        setLastAddedElement(obj as ComponentRecord | null)
        setRootCursor('crosshair')
    }

    const togglePointer = (pointerVal: boolean) => {
        setPointerToggle(pointerVal)
        setPencilMode(false)
        if (pointerVal) {
            cancelPendingElement()
            setSelectedComponent(null)
            setRubberModeInBase(false)
            setRootCursor('default')
        }
    }

    const togglePencilMode = (value: boolean) => {
        setPencilMode(value)
        if (value) {
            cancelPendingElement()
            window.dispatchEvent(new CustomEvent('clearSelector', {}))
            setSelectedComponent(null)
            setRubberModeInBase(false)
            localStorage.setItem(PENCIL_MODE_KEY, 'TRUE')
            setRootCursor('crosshair')
        } else {
            localStorage.removeItem(PENCIL_MODE_KEY)
        }
    }

    const togglePanMode = (value: boolean) => {
        togglePanModeFromHook(value, {
            cancelPendingElement,
            setSelectedComponent,
            toggleToolbar: setShowMobileToolbarPanel,
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setTwoJSInstanceInBase = (two: any) => {
        twoJSInstanceRef.current = two
        setTwoJSInstance(two)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setZuiInstanceInBase = (zuiInst: any) => {
        zuiInBaseRef.current = zuiInst
        setZuiInBase(zuiInst)
    }

    const setSelectedComponentInBase = (shape: unknown) => {
        setSelectedComponent(shape ?? null)
    }

    const enterPanMode = useCallback((): void => {
        togglePanMode(true)
        setCurrentElement('pan')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const goToPlace = useCallback(
        (place: MapAnchor): void => {
            const anchor = readBackdropConfig().mapAnchor
            const store = stateRefForComponentStore.current ?? {}
            const mapHasContent = Object.values(store).some(
                (record) => record?.componentType !== GROUP_COMPONENT
            )

            if (!anchor || !mapHasContent) {
                setMapAnchor(place)
                zuiInBaseRef.current?.centerOnSurface?.(0, 0, 1)
                enterPanMode()
                return
            }

            const { x, y } = lngLatToSurface(place.lngLat, anchor)
            zuiInBaseRef.current?.centerOnSurface?.(
                x,
                y,
                scaleForMapZoom(place.zoom, anchor)
            )
            enterPanMode()
        },
        [readBackdropConfig, setMapAnchor, enterPanMode]
    )

    const [showMapStartModal, setShowMapStartModal] = useState(false)
    const askedMapStartRef = useRef(false)
    const mapStartPendingRef = useRef(false)
    const [timezoneCity] = useState(() => resolveTimezoneCity())

    useEffect(() => {
        if (askedMapStartRef.current) return
        if (hadStoredMapAnchor) return
        if (!backdropReady) return

        const store = stateRefForComponentStore.current ?? {}
        const mapHasContent = Object.values(store).some(
            (record) => record?.componentType !== GROUP_COMPONENT
        )
        if (mapHasContent) return

        askedMapStartRef.current = true
        mapStartPendingRef.current = true
        trackEvent('map_start_shown')
        setShowMapStartModal(true)
    }, [hadStoredMapAnchor, backdropReady, componentStore])

    const settleOnTimezoneCity = useCallback((): void => {
        setMapAnchor({
            lngLat: [...timezoneCity.lngLat],
            zoom: readBackdropConfig().mapAnchor?.zoom ?? DEFAULT_ANCHOR_ZOOM,
        })
        zuiInBaseRef.current?.centerOnSurface?.(0, 0, 1)
        enterPanMode()
        rememberLocalBaseId()
    }, [
        setMapAnchor,
        timezoneCity,
        readBackdropConfig,
        rememberLocalBaseId,
        enterPanMode,
    ])

    const handleMapStartPick = useCallback(
        (place: MapAnchor): void => {
            if (!mapStartPendingRef.current) return
            mapStartPendingRef.current = false
            trackEvent('map_start_answered', { via: 'pick' })
            setShowMapStartModal(false)
            goToPlace(place)
            rememberLocalBaseId()
        },
        [goToPlace, rememberLocalBaseId]
    )

    const handleMapStartFallback = useCallback((): void => {
        if (!mapStartPendingRef.current) return
        trackEvent('map_start_answered', { via: 'fallback' })
        settleOnTimezoneCity()
    }, [settleOnTimezoneCity])

    const handleMapStartSkip = useCallback((): void => {
        if (!mapStartPendingRef.current) return
        mapStartPendingRef.current = false
        trackEvent('map_start_answered', { via: 'skip' })
        setShowMapStartModal(false)
        settleOnTimezoneCity()
    }, [settleOnTimezoneCity])

    const ensureBackgroundBase = async (trigger: string = 'unknown') => {
        if (onceEver('first_element_drawn')) {
            trackEvent('first_element_drawn', { trigger })
        }

        if (isPersistedRef.current) return
        if (backgroundBaseIdRef.current) return
        if (baseCreationInFlightRef.current) return

        baseCreationInFlightRef.current = true
        try {
            const { data: baseData } = await createBase({
                variables: { object: {} },
            })
            const newBaseId = baseData?.base?.id
            if (!newBaseId) return
            backgroundBaseIdRef.current = newBaseId
            setBackgroundBaseId(newBaseId)
            localStorage.setItem(BACKGROUND_BASE_STORAGE_KEY, newBaseId)
        } catch (e) {
            console.error('Background base creation failed:', e)
        } finally {
            baseCreationInFlightRef.current = false
        }
    }

    const addToLocalComponentStore = (
        id: string,
        type: string,
        componentInfo: ComponentRecord,
        skipHistory: boolean = false
    ) => {
        if (
            type === GROUP_COMPONENT ||
            componentInfo?.componentType === GROUP_COMPONENT
        ) {
            return
        }

        if (isPersistedRef.current && type === IMAGE_COMPONENT) return

        const {
            relativeX: _rX,
            relativeY: _rY,
            ...safeInfo
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } = (componentInfo ?? {}) as any

        if (safeInfo.position == null) {
            const maxPos = Object.values(
                stateRefForComponentStore.current
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ).reduce((m: number, c: any) => {
                const p = c?.position
                return Number.isFinite(p) ? Math.max(m, p) : m
            }, 0)
            safeInfo.position = maxPos + 1
        }

        ensureBackgroundBase(type)

        if (!skipHistory) {
            recordToHistoryLog({
                action: 'ADD',
                id,
                componentInfo: safeInfo,
            })
        }

        const updatedComponentStore = {
            ...stateRefForComponentStore.current,
            [id]: safeInfo,
        }
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current && safeInfo) {
            insertComponent({
                variables: { object: toComponentColumns(safeInfo) },
            }).catch(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (error: any) => {
                    const isPermissionError = error.graphQLErrors?.some(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (e: any) => e.extensions?.code === 'permission-error'
                    )
                    if (isPermissionError) {
                        undoLastAction()
                        setShowPermissionErrorModal(true)
                    }
                }
            )
        }
    }

    const buildTextShapeData = (
        id: string,
        x: number,
        y: number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any | null => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let typeItem: any = null
        if (getComponentTypesData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getComponentTypesData.componentTypes.forEach((item: any) => {
                if (item.label === 'text') typeItem = item
            })
        }
        if (!typeItem) {
            typeItem = {
                width: 120,
                height: 36,
                fill: 'transparent',
                textColor: '#3A342C',
                metadata: {},
            }
        }
        const userId = localStorage.getItem('userId')
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        const fontSizePx =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sizesMap as any)[defaultTextSize] ?? typeItem.metadata?.fontSize
        return {
            id,
            componentType: 'text',
            linewidth: defaultLinewidth,
            strokeType: defaultStrokeType,
            children: {},
            ...geometryFields(
                pointGeometry(Math.trunc(x), Math.trunc(y)),
                {
                    ...(typeItem.metadata || {}),
                    ...(fontSizePx !== undefined && { fontSize: fontSizePx }),
                    ...(defaultTextFontFamily && {
                        textFontFamily: defaultTextFontFamily,
                    }),
                    opacity: 1,
                }
            ),
            x2: 0,
            baseId: baseId,
            width: typeItem.width,
            height: typeItem.height,
            fill: typeItem.fill,
            textColor: defaultTextColor ?? typeItem.textColor,
            updatedBy: userId,
        }
    }

    const enableTextDrawMode = () => {
        togglePencilMode(false)
        togglePointer(false)
        const id = generateUUID()
        const shapeData = buildTextShapeData(id, -9999, -9999)
        if (!shapeData) return
        updateLastAddedElement(shapeData)
        setRootCursor('crosshair')
        localStorage.setItem(TEXT_DRAW_MODE_KEY, 'true')
        localStorage.setItem(LAST_ADDED_ELEMENT_ID_KEY, id)
        setTextDrawModeInBase(true)
        addToLocalComponentStore(id, 'text', shapeData)
    }

    const createTextAtSurface = (x: number, y: number) => {
        const id = generateUUID()
        const shapeData = buildTextShapeData(id, x, y)
        if (!shapeData) return
        addToLocalComponentStore(id, 'text', shapeData)
        const two = twoJSInstanceRef.current
        if (!two) return
        pollUntilElement(two, id, () => {
            window.dispatchEvent(
                new CustomEvent('triggerTextInput', {
                    detail: { elementId: id },
                })
            )
        })
    }

    const updateComponentBulkPropertiesInLocalStore = (
        id: string,
        bulkObj: Partial<ComponentRecord>,
        skipHistory: boolean = false,
        syncDefaults: boolean = false
    ) => {
        ensureBackgroundBase('property')

        const userId = localStorage.getItem('userId')

        if (!skipHistory) {
            const currentComponent = stateRefForComponentStore.current[id]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prevProps: Record<string, any> = {}
            Object.keys(bulkObj).forEach((key) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let val = (currentComponent as any)?.[key]
                if (val === undefined && key === 'opacity') {
                    val = readOpacity(currentComponent)
                }
                if (val === undefined && key === 'zoomResistant') {
                    val = true
                }
                if (val === undefined && key === 'legendPresetId') {
                    val = null
                }
                if (val === undefined && key === 'fillType') {
                    val = null
                }
                if (val !== undefined) {
                    prevProps[key] = val
                }
            })

            recordToHistoryLog({
                action: 'UPDATE_BULK',
                id,
                prevProps,
                bulkObj,
                syncDefaults,
            })
        }

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const merged: any = {
            ...updatedComponentStore[id],
            ...bulkObj,
            updatedBy: userId,
        }
        delete merged.relativeX
        delete merged.relativeY
        updatedComponentStore[id] = merged
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: {
                    id: id,
                    updateObj: toComponentColumns({
                        ...bulkObj,
                        updatedBy: userId,
                    }),
                },
            })
        }
    }

    const updateComponentVerticesInLocalStore = (
        id: string,
        x: number,
        y: number
    ) => {
        ensureBackgroundBase('drag')

        const userId = localStorage.getItem('userId')

        recordToHistoryLog({
            action: 'UPDATE_VERTICES',
            id,
            prevX: stateRefForComponentStore.current[id]?.x ?? 0,
            prevY: stateRefForComponentStore.current[id]?.y ?? 0,
        })

        const current = stateRefForComponentStore.current[id]
        const moved = moveGeometryTo(current, Math.trunc(x), Math.trunc(y))
        const placement = moved ?? { x: Math.trunc(x), y: Math.trunc(y) }

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        updatedComponentStore[id] = {
            ...updatedComponentStore[id],
            ...placement,
            updatedBy: userId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const group = twoJSInstanceRef.current?.scene?.children?.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (child: any) => child?.elementData?.id === id
        )
        if (group?.elementData) Object.assign(group.elementData, placement)

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: {
                    id: id,
                    updateObj: {
                        ...placement,
                        updatedBy: userId,
                    },
                },
            })
        }
    }

    const deleteBulkComponentsFromLocalStore = (ids: string[]) => {
        ensureBackgroundBase('delete_bulk')

        const batchEntries: HistoryEntry[] = ids.map((id) => ({
            action: 'DELETE',
            id,
            prevState: {
                ...stateRefForComponentStore.current[id],
            } as ComponentRecord,
        }))
        recordBatchToHistoryLog(batchEntries)

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        ids.forEach((id) => {
            delete updatedComponentStore[id]
            window.dispatchEvent(
                new CustomEvent('elementRemoved', { detail: { id } })
            )
        })
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        if (isPersistedRef.current && ids.length > 0) {
            deleteBulkComponents({ variables: { _in: ids } })
        }
    }

    const deleteComponentFromLocalStore = (id: string) => {
        ensureBackgroundBase('delete')

        recordToHistoryLog({
            action: 'DELETE',
            id,
            prevState: {
                ...stateRefForComponentStore.current[id],
            } as ComponentRecord,
        })

        const updatedComponentStore = { ...stateRefForComponentStore.current }
        delete updatedComponentStore[id]
        stateRefForComponentStore.current = updatedComponentStore
        setComponentStore(updatedComponentStore)

        window.dispatchEvent(
            new CustomEvent('elementRemoved', { detail: { id } })
        )

        if (isPersistedRef.current) {
            deleteComponent({
                variables: { id },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY as any,
            })
        }
    }

    const setCurrentElementInBase = (val: string | null) => {
        if (val) {
            if (oncePerSession('first_tool_selected')) {
                trackEvent('first_tool_selected', { tool: val })
            }
            trackEvent('tool_selected', { tool: val })
        }
        setCurrentElement(val)
    }

    const onCreateBase = () => {
        createBase({
            variables: {
                object: {},
            },
        })
    }

    const captureShareGeo = (): {
        anchor: MapAnchor | null
        landing: MapAnchor | null
    } => {
        const config = readBackdropConfig()
        const two = twoJSInstanceRef.current
        if (!two) return { anchor: null, landing: null }

        const anchor = config.mapAnchor ?? null
        if (!anchor) return { anchor: null, landing: null }

        const scene = two.scene
        const scale =
            typeof scene?.scale === 'number' && scene.scale > 0
                ? scene.scale
                : 1
        const vw = two.width || window.innerWidth
        const vh = two.height || window.innerHeight
        const centre = {
            x: (vw / 2 - scene.translation.x) / scale,
            y: (vh / 2 - scene.translation.y) / scale,
        }
        return {
            anchor,
            landing: {
                lngLat: surfaceToLngLat(centre, anchor),
                zoom: mapZoomForScale(scale, anchor),
            },
        }
    }

    const shareGeoColumns = (geo: ReturnType<typeof captureShareGeo>) => ({
        ...(geo.anchor && {
            mapAnchorLng: geo.anchor.lngLat[0],
            mapAnchorLat: geo.anchor.lngLat[1],
            mapAnchorZoom: geo.anchor.zoom,
        }),
        ...(geo.landing && {
            landingLng: geo.landing.lngLat[0],
            landingLat: geo.landing.lngLat[1],
            landingZoom: geo.landing.zoom,
        }),
    })

    const persistBase = async (): Promise<string> => {
        const geo = captureShareGeo()

        const { data: baseData } = await createBase({
            variables: {
                object: { ...shareGeoColumns(geo) },
            },
        })
        const serverBaseId = baseData?.base?.id
        if (!serverBaseId) throw new Error('createBase returned no id')

        rememberOwnBase(serverBaseId)

        const presetIdMap = new Map<string, string>()
        const presetsForDB = legendPresetsRef.current.map((preset) => {
            const newId = generateUUID()
            presetIdMap.set(preset.id, newId)
            return {
                id: newId,
                baseId: serverBaseId,
                name: preset.name,
                elementType: preset.elementType,
                style: preset.style,
                position: preset.position,
            }
        })
        if (presetsForDB.length > 0) {
            await insertBulkLegendPresets({
                variables: { objects: presetsForDB },
            })
        }

        const allEntries = Object.entries(stateRefForComponentStore.current)
        const componentIdMap = new Map<string, string>()
        const componentsForDB = allEntries
            .filter(([, comp]) => (comp as ComponentRecord)?.componentType)
            .filter(
                ([, comp]) =>
                    (comp as ComponentRecord).componentType !== IMAGE_COMPONENT
            )
            .map(([key, comp]) => {
                const newId = generateUUID()
                componentIdMap.set((comp as ComponentRecord).id ?? key, newId)
                return {
                    ...toComponentColumns(
                        stripTypename(comp) as Record<string, unknown>
                    ),
                    id: newId,
                    baseId: serverBaseId,
                    legendPresetId:
                        presetIdMap.get(
                            (comp as ComponentRecord)?.legendPresetId ?? ''
                        ) ?? null,
                }
            })

        const skipped = allEntries.filter(
            ([, comp]) => !(comp as ComponentRecord)?.componentType
        )
        if (skipped.length > 0) {
            console.warn(
                '[persistBase] skipped',
                skipped.length,
                'malformed component(s) with no componentType:',
                Object.fromEntries(skipped)
            )
        }

        if (componentsForDB.length > 0) {
            await insertBulkComponents({
                variables: { objects: componentsForDB },
            })
        }

        await metaPropertiesApi.persistToBase(serverBaseId, componentIdMap)

        const newLocalId = generateUUID()

        try {
            writeAnchorConfig(newLocalId, readBackdropConfig())
            writeLegendPresetsLocal(newLocalId, legendPresetsRef.current)
            const localMeta = metaPropertiesApi.readLocalSet()
            writeMetaLocal(newLocalId, {
                properties: localMeta.properties.map((p) => ({
                    ...p,
                    baseId: newLocalId,
                })),
                values: localMeta.values.map((v) => ({
                    ...v,
                    baseId: newLocalId,
                })),
            })
            const scene = twoJSInstanceRef.current?.scene
            if (scene) {
                writeViewport(newLocalId, isMobile, {
                    scale: typeof scene.scale === 'number' ? scene.scale : 1,
                    tx: scene.translation.x,
                    ty: scene.translation.y,
                })
            }
        } catch (_) {
        }

        const updatedStore: ComponentStore = {}
        Object.entries(stateRefForComponentStore.current).forEach(
            ([id, comp]) => {
                updatedStore[id] = { ...comp, baseId: newLocalId }
            }
        )
        stateRefForComponentStore.current = updatedStore

        skipComponentStoreResetRef.current = true
        setLocalBaseId(newLocalId)
        setComponentStore(updatedStore)

        try {
            localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({
                    baseId: newLocalId,
                    components: updatedStore,
                    timestamp: Date.now(),
                })
            )
        } catch (_) {}

        backgroundBaseIdRef.current = null
        setBackgroundBaseId(null)
        localStorage.removeItem(BACKGROUND_BASE_STORAGE_KEY)

        return serverBaseId
    }

    const shareBase = async (): Promise<string> => {
        if (!isPersistedRef.current) {
            const serverBaseId = await persistBase()
            await updateBaseVisibility({ variables: { id: serverBaseId } })
            return serverBaseId
        }

        const geo = captureShareGeo()
        await sharePersistedBase({
            variables: {
                id: baseId,
                landingLng: geo.landing?.lngLat[0] ?? null,
                landingLat: geo.landing?.lngLat[1] ?? null,
                landingZoom: geo.landing?.zoom ?? null,
            },
        })
        return baseId
    }

    onStorageLimitRef.current = async () => {
        try {
            const serverBaseId = await persistBase()
            setStorageLimitBaseUrl(baseUrl(serverBaseId))
            setShowStorageLimitModal(true)
        } catch (e) {
            console.error('Failed to auto-persist base on storage limit:', e)
        }
    }

    const clearBase = () => {
        if (isPersisted) {
            const ids = Object.keys(componentStore)
            if (ids.length > 0) {
                deleteBulkComponents({ variables: { _in: ids } })
            }
        }
        window.dispatchEvent(new Event('clearSelector'))
        setSelectedComponent(null)
        twoJSInstanceRef.current?.clear()
        twoJSInstanceRef.current?.update()
        setComponentStore({})
        clearHistory(isPersisted)
        resetDefaults()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel: any = selectedComponent
    const isArrowSelected =
        selectedComponent !== null &&
        (sel?.shape?.type === 'arrowLine' ||
            sel?.group?.data?.elementData?.isLineCircle === true)

    const syncOpenTextarea = ({
        fontSize,
        fontFamily,
    }: {
        fontSize?: number
        fontFamily?: string
    }) => {
        const ta = document.querySelector<HTMLElement>('.temp-input-area')
        if (!ta) return
        const sceneScale = twoJSInstance?.scene?.scale || 1
        if (typeof fontSize === 'number') {
            const cssFontSize = fontSize * sceneScale
            const lineH = Math.ceil(cssFontSize * 1.6)
            ta.style.fontSize = `${cssFontSize}px`
            ta.style.lineHeight = `${lineH}px`
        }
        if (fontFamily) {
            ta.style.fontFamily = fontFamily
        }
    }

    const refreshTextSelector = (componentId?: string): void => {
        if (!componentId) return
        window.dispatchEvent(
            new CustomEvent(TEXT_SELECTOR_REFRESH_EVENT, {
                detail: { id: componentId },
            })
        )
    }

    const handleTextSizeChange = (newLabel: string) => {
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textSize = (sizesMap as any)[newLabel]
        const twoText = sel?.shape?.data
        if (!twoText) return
        const sizeNodes = getShapeTextNodes(sel?.group?.data)
        const nodes = sizeNodes.length > 0 ? sizeNodes : [twoText]
        const n = nodes.length
        const lineH = lineHeightFor(textSize)
        nodes.forEach((node, i) => {
            node.size = textSize
            node.leading = textSize
            node.translation.set(0, (i - (n - 1) / 2) * lineH)
        })
        const elementData = sel?.group?.data?.elementData
        const componentId = elementData?.id
        const patch = setProperties(elementData, {
            fontSize: textSize,
            content: nodes.map((node) => node.value).join('\n'),
        })
        if (elementData && patch.metadata) {
            elementData.metadata = patch.metadata
        }
        updateComponentBulkPropertiesInLocalStore(componentId, patch)
        twoJSInstance?.update()
        syncOpenTextarea({ fontSize: textSize })
        refreshTextSelector(componentId)
    }

    const reflowShapeTextAfterStyleChange = (
        componentId: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedProps: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        previousProps: any
    ) => {
        const group = sel?.group?.data
        const shapePath = sel?.shape?.data
        const kind = group?.elementData?.componentType
        const editingActive = !!document.querySelector('.temp-input-area')
        const metadataPatch = setProperties(
            stateRefForComponentStore.current[componentId],
            updatedProps
        )
        if (editingActive || !group || !shapePath || !kind) {
            updateComponentBulkPropertiesInLocalStore(componentId, metadataPatch)
            return
        }

        const rawText =
            typeof updatedProps.textContent === 'string'
                ? updatedProps.textContent
                : ''
        const width = shapePath.width
        applyShapeText(twoJSInstance, group, kind, width, updatedProps)
        const { font: nextFont } = shapeTextStyleFromMeta(updatedProps)
        const { font: prevFont } = shapeTextStyleFromMeta(previousProps)
        const newH = resolveHeightForTextStyleChange({
            kind,
            width,
            rawText,
            prevFont,
            nextFont,
            currentHeight: shapePath.height,
        })
        const heightChanged = newH !== shapePath.height
        if (heightChanged) shapePath.height = newH
        twoJSInstance?.update()
        updateComponentBulkPropertiesInLocalStore(componentId, {
            ...metadataPatch,
            width: Math.round(width),
            height: Math.round(newH),
        })
    }

    const handleRectangleTextSizeChange = (newLabel: string) => {
        const sizesMap = isMobile ? MOBILE_TEXT_SIZES_OBJECT : TEXT_SIZES_OBJECT
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textSize = (sizesMap as any)[newLabel]
        const twoText = sel?.text?.data
        if (!twoText) return
        const sizeNodes = getShapeTextNodes(sel?.group?.data)
        ;(sizeNodes.length > 0 ? sizeNodes : [twoText]).forEach(
            (n) => (n.size = textSize)
        )
        twoJSInstance?.update()

        const componentId = sel?.group?.data?.elementData?.id
        const storeRecord = stateRefForComponentStore.current[componentId]
        const existingProps = readProperties(storeRecord)
        const updatedProps = { ...existingProps, textFontSize: textSize }
        const patch = setProperties(storeRecord, { textFontSize: textSize })
        if (sel?.group?.data?.elementData && patch.metadata) {
            sel.group.data.elementData.metadata = patch.metadata
        }

        reflowShapeTextAfterStyleChange(
            componentId,
            updatedProps,
            existingProps
        )
        syncOpenTextarea({ fontSize: textSize })
    }

    const handleTextFontFamilyChange = (fontFamily: string) => {
        const twoText = sel?.shape?.data
        if (!twoText) return
        const familyNodes = getShapeTextNodes(sel?.group?.data)
        const nodes = familyNodes.length > 0 ? familyNodes : [twoText]
        nodes.forEach((node) => (node.family = fontFamily))
        const elementData = sel?.group?.data?.elementData
        const componentId = elementData?.id
        const patch = setProperties(elementData, {
            textFontFamily: fontFamily,
            content: nodes.map((node) => node.value).join('\n'),
        })
        if (elementData && patch.metadata) {
            elementData.metadata = patch.metadata
        }
        updateComponentBulkPropertiesInLocalStore(componentId, patch)
        twoJSInstance?.update()
        syncOpenTextarea({ fontFamily })
        refreshTextSelector(sel?.group?.data?.elementData?.id)
        setDefaultTextFontFamily(fontFamily)
    }

    const handleRectangleTextFontFamilyChange = (fontFamily: string) => {
        const twoText = sel?.text?.data
        if (!twoText) return
        const familyNodes = getShapeTextNodes(sel?.group?.data)
        ;(familyNodes.length > 0 ? familyNodes : [twoText]).forEach(
            (n) => (n.family = fontFamily)
        )
        twoJSInstance?.update()
        const componentId = sel?.group?.data?.elementData?.id
        const storeRecord = stateRefForComponentStore.current[componentId]
        const existingProps = readProperties(storeRecord)
        const updatedProps = {
            ...existingProps,
            textFontFamily: fontFamily,
        }
        const patch = setProperties(storeRecord, {
            textFontFamily: fontFamily,
        })
        if (sel?.group?.data?.elementData && patch.metadata) {
            sel.group.data.elementData.metadata = patch.metadata
        }
        reflowShapeTextAfterStyleChange(
            componentId,
            updatedProps,
            existingProps
        )
        syncOpenTextarea({ fontFamily })
        setDefaultTextFontFamily(fontFamily)
    }

    const cancelPendingElement = () => {
        const pendingId = localStorage.getItem(LAST_ADDED_ELEMENT_ID_KEY)
        if (pendingId) {
            undoLastAction()
            setLastAddedElement(null)
        }
        localStorage.removeItem(LAST_ADDED_ELEMENT_ID_KEY)
        localStorage.removeItem(ARROW_DRAW_MODE_KEY)
        localStorage.removeItem(TEXT_DRAW_MODE_KEY)
        localStorage.removeItem(PENDING_SHAPE_TYPE_KEY)
        localStorage.removeItem(PENDING_SHAPE_PROPS_KEY)
        localStorage.removeItem(DRAW_MODE_KEY)
        localStorage.removeItem(DRAW_TYPE_KEY)
        localStorage.removeItem(DRAW_PROPS_KEY)
        localStorage.removeItem(POINT_PLACE_MODE_KEY)
        window.dispatchEvent(new CustomEvent('cancelGeoDraw', {}))
        setIsArrowDrawMode(false)
        setIsTextDrawMode(false)
        window.dispatchEvent(new CustomEvent('clearSelector', {}))
    }

    useEffect(() => {
        const onFocus = ((e: CustomEvent) => {
            const g = e?.detail?.group ?? null
            selectedGroupRef.current = g
            setSelectedGroup(g)
        }) as EventListener
        const onBlur = () => {
            selectedGroupRef.current = null
            setSelectedGroup(null)
        }
        window.addEventListener('groupFocused', onFocus)
        window.addEventListener('groupBlurred', onBlur)
        return () => {
            window.removeEventListener('groupFocused', onFocus)
            window.removeEventListener('groupBlurred', onBlur)
        }
    }, [])

    useEffect(() => {
        selectionPresentRef.current = !!selectedComponent || !!selectedGroup
    }, [selectedComponent, selectedGroup])

    useEffect(() => {
        const DRAG_THRESHOLD_SQ = 4 * 4
        let armed = false
        let moved = false
        let startX = 0
        let startY = 0

        const onDown = (e: PointerEvent): void => {
            if (e.button !== 0) return
            const target = e.target as HTMLElement | null
            if (!target) return
            if (target.closest('#floating-toolbar')) return
            if (
                target.closest(
                    'input, textarea, [contenteditable="true"], .temp-input-area'
                )
            )
                return
            if (!target.closest('#main-two-root')) return
            const onElement = !!target.closest('[data-component-id]')
            if (!onElement && !selectionPresentRef.current) return
            armed = true
            moved = false
            startX = e.clientX
            startY = e.clientY
        }
        const onMove = (e: PointerEvent): void => {
            if (!armed || moved) return
            const dx = e.clientX - startX
            const dy = e.clientY - startY
            if (dx * dx + dy * dy >= DRAG_THRESHOLD_SQ) {
                moved = true
                setIsElementDragging(true)
            }
        }
        const onUp = (): void => {
            armed = false
            if (moved) {
                moved = false
                setIsElementDragging(false)
            }
        }

        document.addEventListener('pointerdown', onDown, true)
        document.addEventListener('pointermove', onMove, true)
        document.addEventListener('pointerup', onUp, true)
        document.addEventListener('pointercancel', onUp, true)
        return () => {
            document.removeEventListener('pointerdown', onDown, true)
            document.removeEventListener('pointermove', onMove, true)
            document.removeEventListener('pointerup', onUp, true)
            document.removeEventListener('pointercancel', onUp, true)
        }
    }, [])

    const applyGroupProperty = createApplyGroupProperty({
        selectedGroup,
        twoJSInstance,
        updateComponentBulkPropertiesInLocalStore,
        stateRefForComponentStore,
        recordBatchToHistoryLog,
    })

    const applyProperty = createApplyProperty({
        selectedComponent,
        twoJSInstance,
        updateComponentBulkPropertiesInLocalStore,
        updateBulkPropsForRectangleWithText: (id, obj) =>
            updateBulkPropsForRectangleWithText(id, obj),
        handleTextSizeChange: (value: unknown) =>
            handleTextSizeChange(value as string),
        handleRectangleTextSizeChange: (value: unknown) =>
            handleRectangleTextSizeChange(value as string),
        handleTextFontFamilyChange: (value: unknown) =>
            handleTextFontFamilyChange(value as string),
        handleRectangleTextFontFamilyChange: (value: unknown) =>
            handleRectangleTextFontFamilyChange(value as string),
        setDefaultFill,
        setDefaultStrokeColor,
        setDefaultLinewidth,
        setDefaultStrokeType,
        setDefaultFillType,
        setDefaultOpacity,
        setDefaultTextColor,
        setDefaultTextSize: (value: string) =>
            setDefaultTextSize(value as never),
        setDefaultTextFontFamily,
    })

    const legendApplyDeps = {
        twoJSInstance,
        updateComponentBulkPropertiesInLocalStore,
    }

    const snapshotForPreset = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (id: string, keys: string[]): Record<string, any> => {
            const current = stateRefForComponentStore.current[id]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prev: Record<string, any> = {}
            keys.forEach((key) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let val = (current as any)?.[key]
                if (val === undefined && key === 'legendPresetId') val = null
                if (val === undefined && key === 'fillType') val = null
                if (val === undefined && key === 'opacity') {
                    val = readOpacity(current)
                }
                if (val !== undefined) prev[key] = val
            })
            return prev
        },
        []
    )

    const restyleBoundElements = useCallback(
        (preset: LegendPreset): void => {
            const ids = idsBoundToPreset(
                stateRefForComponentStore.current,
                preset.id
            )
            if (ids.length === 0) return
            const patchKeys = Object.keys(presetApplyPatch(preset))
            const entries = applyPresetToMany(
                legendApplyDeps,
                ids,
                preset,
                (id) => snapshotForPreset(id, patchKeys)
            )
            recordBatchToHistoryLog(entries as never)
            if (isPersistedRef.current) {
                restyleComponentsByPreset({
                    variables: {
                        presetId: preset.id,
                        updateObj: toComponentColumns(presetStylePatch(preset)),
                    },
                }).catch(() => {})
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [twoJSInstance, snapshotForPreset, recordBatchToHistoryLog]
    )

    const createLegendPreset = useCallback(
        (input: LegendPresetInput): LegendPreset => createPreset(input),
        [createPreset]
    )

    const updateLegendPreset = useCallback(
        (id: string, patch: Partial<LegendPresetInput>): void => {
            const next = updatePreset(id, patch)
            if (!next) return
            if (patch.style === undefined && patch.elementType === undefined) {
                return
            }
            restyleBoundElements(next)
        },
        [updatePreset, restyleBoundElements]
    )

    const deleteLegendPreset = useCallback(
        (id: string): void => {
            const ids = idsBoundToPreset(stateRefForComponentStore.current, id)
            if (ids.length > 0) {
                const entries = applyPresetToMany(
                    legendApplyDeps,
                    ids,
                    null,
                    (elementId) =>
                        snapshotForPreset(elementId, ['legendPresetId'])
                )
                recordBatchToHistoryLog(entries as never)
            }
            deletePreset(id)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [deletePreset, snapshotForPreset, recordBatchToHistoryLog, twoJSInstance]
    )

    const applyLegendPresetToSelection = useCallback(
        (preset: LegendPreset | null): void => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const id = (selectedComponent as any)?.group?.data?.elementData?.id
            if (!id) return
            applyPresetToElement(legendApplyDeps, id, preset)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedComponent, twoJSInstance]
    )

    useEffect(() => {
        const armed = readArmedPresets()
        const next: ArmedPresetMap = {}
        let changed = false
        ;(Object.keys(armed) as LegendPresetType[]).forEach((type) => {
            const live = legendPresets.find((p) => p.id === armed[type]?.id)
            if (!live) {
                changed = true
                return
            }
            next[type] = live
            if (JSON.stringify(live) !== JSON.stringify(armed[type])) {
                changed = true
            }
        })
        if (changed) writeArmedPresets(next)
    }, [legendPresets])

    const legendPresetCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        Object.keys(componentStore).forEach((id) => {
            const bound = componentStore[id]?.legendPresetId
            if (!bound) return
            counts[bound] = (counts[bound] ?? 0) + 1
        })
        return counts
    }, [componentStore])

    const updateBulkPropsForRectangleWithText = (
        id: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        obj: any
    ) => {
        let finalObj = { ...obj }
        if (obj.textColor !== undefined) {
            const patch = setProperties(
                stateRefForComponentStore.current[id],
                { textFill: obj.textColor }
            )
            if (patch.metadata) {
                finalObj.metadata = patch.metadata
                if (sel?.group?.data?.elementData) {
                    sel.group.data.elementData.metadata = patch.metadata
                }
            }
        }
        updateComponentBulkPropertiesInLocalStore(id, finalObj)
    }

    const contextValueForSidebar = {
        backdropReady,
        readBackdropConfig,
        captureBackdrop,
        goToPlace,
        zoomStep: MAP_ZOOM_STEP,
        baseId,
        isPersisted,
        persistBase,
        shareBase,
        showCanvasNotice,
        backgroundBaseId,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
        isRubberMode,
        eraserSize,
        isPanMode,
        togglePanMode,
        setArrowDrawModeInBase,
        setTextDrawModeInBase,
        setRubberModeInBase,
        setEraserSizeInBase,
        cancelPendingElement,
        togglePencilMode,
        togglePointer,
        updateLastAddedElement,
        addToLocalComponentStore,
        enableTextDrawMode,
        createTextAtSurface,
        updateComponentVerticesInLocalStore,
        updateComponentBulkPropertiesInLocalStore,
        stateRefForComponentStore,
        deleteComponentFromLocalStore,
        deleteBulkComponentsFromLocalStore,
        twoJSInstance,
        setTwoJSInstanceInBase,
        setZuiInstanceInBase,
        zuiInBase,
        selectedComponent,
        setSelectedComponentInBase,
        applyProperty,
        selectedGroup,
        applyGroupProperty,
        legendPresets,
        createLegendPreset,
        updateLegendPreset,
        deleteLegendPreset,
        applyLegendPresetToSelection,
        legendPresetCounts,
        meta: metaPropertiesApi,
        reorderSelected,
        fitToContent,
        componentStore,
        isElementDragging,
        defaultFill,
        defaultStrokeColor,
        defaultLinewidth,
        defaultStrokeType,
        defaultFillType,
        defaultOpacity,
        defaultTextColor,
        defaultTextSize,
        defaultTextFontFamily,
        setDefaultLinewidthInBase,
        setDefaultStrokeTypeInBase,
        showMobileToolbarPanel,
        setShowMobileToolbarPanel,
        currentElement,
        setCurrentElementInBase,
        onCreateBase,
        createBaseLoading,
        historyLog,
        historyLogRef,
        bucketLog,
        bucketLogRef,
        recordBatchToHistoryLog,
        undoLastAction,
        redoLastAction,
        clearBase,
        beginBaseImport,
    }

    return (
        <>
            <BaseContext.Provider
                value={contextValueForSidebar as unknown as BaseContextValue}
            >
                <div>
                    <Sidebar chromeShown={mapFirstPaint} />
                    {isMobile && showMultiClickDrawControls && (
                        <div
                            style={{
                                position: 'fixed',
                                bottom: '64px',
                                right: '10px',
                                zIndex: 20,
                            }}
                            className={`flex flex-col gap-2 ${CHROME_ENTER_FROM_BOTTOM}`}
                        >
                            <button
                                title="Finish drawing"
                                onClick={() =>
                                    window.dispatchEvent(
                                        new CustomEvent('finishGeoDraw')
                                    )
                                }
                                className="w-10 h-10 rounded-lg flex items-center justify-center bg-greens-g400 text-white shadow-md transition-colors duration-150"
                            >
                                <OkIcon className="w-5 h-5" />
                            </button>
                            <button
                                title="Cancel drawing"
                                onClick={() =>
                                    window.dispatchEvent(
                                        new CustomEvent('cancelGeoDraw')
                                    )
                                }
                                className="w-10 h-10 rounded-lg flex items-center justify-center bg-reds-r400 text-white shadow-md transition-colors duration-150"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    <MobileDeleteButton
                        drawInProgress={
                            showMultiClickDrawControls || isEditingText
                        }
                    />
                    <MobileTextControls
                        drawInProgress={showMultiClickDrawControls}
                    />
                    {!isRubberMode &&
                        isMobile &&
                        Boolean(
                            selectedComponent || selectedGroup || isPencilMode
                        ) && (
                            <button
                                title="Element properties"
                                onClick={() =>
                                    setShowMobileToolbarPanel((prev) => !prev)
                                }
                                style={{
                                    position: 'fixed',
                                    bottom: '16px',
                                    right: '10px',
                                    zIndex: 20,
                                }}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-150 ${CHROME_ENTER_FROM_BOTTOM} ${
                                    showMobileToolbarPanel
                                        ? 'bg-accent'
                                        : 'bg-accent-dark'
                                }`}
                            >
                                <img
                                    src={controlsIcon}
                                    className="w-5 h-5"
                                    alt="Element properties"
                                />
                            </button>
                        )}
                    <ElementPropertiesToolbar />
                    <PresetChips />
                    <ChromeReveal shown={mapFirstPaint} order={4}>
                        <LegendPanel />
                    </ChromeReveal>
                    <MetaPropertiesPanel />
                    <MobileSideActions chromeShown={mapFirstPaint} />
                    <Canvas
                        pointerToggle={pointerToggle}
                        isPencilMode={isPencilMode}
                        selectPanMode={false}
                        baseId={baseId}
                        selectedComponent={selectedComponent}
                        lastAddedElement={lastAddedElement}
                        componentStore={componentStore}
                        defaultLinewidth={defaultLinewidth}
                        defaultStrokeType={defaultStrokeType}
                        defaultFillType={defaultFillType}
                        defaultStrokeColor={defaultStrokeColor}
                        defaultTextSize={
                            (isMobile
                                ? MOBILE_TEXT_SIZES_OBJECT
                                : TEXT_SIZES_OBJECT)[defaultTextSize] ??
                            DEFAULT_TEXT_SIZE
                        }
                        onCameraChange={handleCameraChange}
                        reorderSelectedRef={reorderSelectedRef}
                        fitToContentRef={fitToContentRef}
                        initialMapLanding={initialMapLanding}
                    />
                    {!isMobile && (
                        <ChromeReveal
                            shown={mapFirstPaint}
                            order={5}
                            from="bottom"
                        >
                            <ZoomControls />
                        </ChromeReveal>
                    )}
                    <GoToContentButton />
                    <ChromeReveal shown={mapFirstPaint} order={6} from="bottom">
                        <HelpButton />
                    </ChromeReveal>
                </div>
            </BaseContext.Provider>
            <MapStartLocationModal
                open={showMapStartModal}
                fallbackCity={timezoneCity.city}
                onPick={handleMapStartPick}
                onSkip={handleMapStartSkip}
                onFallbackToTimezone={handleMapStartFallback}
            />
            <PermissionErrorModal
                open={showPermissionErrorModal}
                onClose={() => setShowPermissionErrorModal(false)}
            />
            <StorageLimitModal
                open={showStorageLimitModal}
                onClose={() => setShowStorageLimitModal(false)}
                baseUrl={storageLimitBaseUrl}
                onStartNew={handleStartNewCanvas}
                onContinue={handleContinueOnSavedBase}
            />
            <BaseFullModal
                open={showBaseFullModal}
                onClose={() => setShowBaseFullModal(false)}
                onExport={handleExportBaseFromModal}
            />
            <BaseTooLargeModal
                open={showBaseTooLargeModal}
                onDownloadBackup={handleDownloadBaseBackup}
                onStartFresh={handleStartFreshFromTooLarge}
                onOpenAnyway={handleOpenBaseAnyway}
            />
            <ImportBaseModal
                open={showImportChooser}
                onClose={handleImportChooserClose}
                error={importError}
                total={pendingImportRef.current?.total}
                skipped={pendingImportRef.current?.skipped}
                excludedImages={pendingImportRef.current?.excludedImages}
                onOpenAsNew={handleImportOpenAsNew}
                onMerge={handleImportMerge}
            />
            <Toast
                open={canvasNotice !== null}
                onClose={dismissCanvasNotice}
                message={canvasNotice ?? ''}
                duration={canvasNoticeMs}
            />
            <Toast
                open={showPerfWarning}
                onClose={dismissPerfWarning}
                message={`This canvas has over ${PERFORMANCE_WARNING_THRESHOLD.toLocaleString()} elements — panning, zooming and editing may feel slow.`}
            />
        </>
    )
}

export default BaseViewPage
