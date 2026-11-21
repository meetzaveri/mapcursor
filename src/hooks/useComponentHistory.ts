import { useState, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import Two from 'two.js'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from '../utils/misc'
import { areaFillFor, areaFillTypeToDb } from '../utils/areaFill'
import {
    computeCounterScale,
    isStrokeScaled,
    resolveResist,
} from '../utils/counterScale'
import { updateX1Y1Vertices, updateX2Y2Vertices } from '../utils/updateVertices'
import {
    getShapeTextNodes,
    findShapeTextLayer,
    renderShapeTextLayer,
    shapeTextStyleFromMeta,
    applyShapeText,
    pollUntilElement,
} from '../utils/canvasUtils'
import { applyStrokeDashes } from '../utils/strokeDashes'
import { lineHeightFor } from '../utils/textLayout'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
    getCircleLabelNodes,
} from '../factory/circleLabel'
import {
    buildPointVisual,
    getPointCircle,
    pointColorOf,
    pointFontFamilyOf,
    pointFontSizeOf,
    pointLabelOf,
} from '../factory/point'
import {
    DRAFT_STORAGE_KEY,
    isStandaloneTextType,
    TEXT_RESIST_CHANGED_EVENT,
} from '../constants/misc'
import { toComponentColumns } from '../utils/componentColumns'
import {
    geometryPositions,
    moveGeometryTo,
    readGeometry,
    readProperties,
    replaceProperties,
} from '../utils/geometry'
import type { ComponentRecord, ComponentStore } from '../types/base'
import type {
    MetaHistoryDirection,
    MetaHistoryOp,
} from './useMetaProperties'
import {
    VERTEX_PATH_TYPES,
    VERTEX_PATH_REVERTED_EVENT,
} from '../components/utils/vertexHandles'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
type BulkProps = Partial<ComponentRecord> & Record<string, unknown>

interface AddEntry {
    action: 'ADD'
    id: string
    componentInfo: ComponentRecord
    timestamp?: number
}

interface DeleteEntry {
    action: 'DELETE'
    id: string
    prevState: ComponentRecord
    timestamp?: number
}

interface UpdateVerticesEntry {
    action: 'UPDATE_VERTICES'
    id: string
    prevX: number
    prevY: number
    nextX?: number
    nextY?: number
    timestamp?: number
}

interface UpdateBulkEntry {
    action: 'UPDATE_BULK'
    id: string
    prevProps: BulkProps
    bulkObj?: BulkProps
    nextProps?: BulkProps
    syncDefaults?: boolean
    timestamp?: number
}

interface BatchEntry {
    action: 'BATCH'
    entries: HistoryEntry[]
    timestamp?: number
}

interface MetaEntry {
    action: 'META'
    ops: MetaHistoryOp[]
    timestamp?: number
}

export type HistoryEntry =
    | AddEntry
    | DeleteEntry
    | UpdateVerticesEntry
    | UpdateBulkEntry
    | BatchEntry
    | MetaEntry

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApolloMutate = (options?: any) => any

export interface ComponentHistoryOptions {
    twoJSInstanceRef: MutableRefObject<TwoLike | null>
    stateRefForComponentStore: MutableRefObject<ComponentStore>
    isPersistedRef: MutableRefObject<boolean>
    baseId: string
    isPersisted: boolean
    insertComponent: ApolloMutate
    deleteComponent: ApolloMutate
    updateComponentInfo: ApolloMutate
    setComponentStore: Dispatch<SetStateAction<ComponentStore>>
    setShowPermissionErrorModal: Dispatch<SetStateAction<boolean>>
    setDefaultLinewidth: (val: number) => void
    setDefaultStrokeType: (val: string | null) => void
    setDefaultFillType: (val: string | null) => void
    setToolbarRefreshKey?: Dispatch<SetStateAction<number>>
    selectedComponent: ShapeLike | null
    selectedGroupRef: MutableRefObject<ShapeLike | null>
    stripTypename: (input: unknown) => unknown
    applyMetaHistoryRef?: MutableRefObject<
        | ((ops: MetaHistoryOp[], direction: MetaHistoryDirection) => Promise<void>)
        | null
    >
}

export interface ComponentHistoryApi {
    historyLog: HistoryEntry[]
    historyLogRef: MutableRefObject<HistoryEntry[]>
    bucketLog: HistoryEntry[]
    bucketLogRef: MutableRefObject<HistoryEntry[]>
    recordToHistoryLog: (entry: HistoryEntry) => void
    recordBatchToHistoryLog: (entries: HistoryEntry[]) => void
    undoLastAction: () => void
    redoLastAction: () => void
    clearHistory: (isPersisted: boolean, localDraftKey?: string) => void
}

function applyPropertyToTwoJSGroup(
    group: ShapeLike,
    name: string,
    value: unknown,
    two: ShapeLike
): void {
    const shape =
        group.elementData?.componentType === 'point'
            ? getPointCircle(group)
            : group.children?.[0]
    if (!shape) return

    const textNodes: ShapeLike[] = getShapeTextNodes(group)
    const isStandaloneText = isStandaloneTextType(
        group.elementData?.componentType
    )
    const isCircle = group.elementData?.componentType === 'circle'

    const meta = group.elementData

    switch (name) {
        case 'legendPresetId':
            if (meta) meta.legendPresetId = value
            break
        case 'fill':
            shape.fill = value
            if (meta) meta.fill = value
            break
        case 'stroke':
            if (meta?.componentType !== 'point') shape.stroke = value
            if (meta) meta.stroke = value
            if (group.elementData?.componentType === 'area') {
                shape.fill = areaFillFor(
                    two,
                    value as string,
                    group.elementData?.fillType,
                    group.elementData
                )
            }
            break
        case 'linewidth':
            shape.linewidth = isStrokeScaled(group.elementData)
                ? (value as number) *
                  computeCounterScale(
                      group.parent?.scale ?? 1,
                      resolveResist(group.elementData)
                  )
                : value
            if (meta) meta.linewidth = value
            if (isStrokeScaled(group.elementData)) {
                applyStrokeDashes(
                    shape,
                    group.elementData?.strokeType,
                    group.parent?.scale ?? 1
                )
            }
            break
        case 'width':
        case 'height':
            shape[name] = value
            if (isCircle && group.elementData) group.elementData[name] = value
            break
        case 'textColor':
            if (isCircle) {
                if (group.elementData) group.elementData.textColor = value
                getCircleLabelNodes(group).forEach(
                    (n: ShapeLike) => (n.fill = value)
                )
                break
            }
            if (textNodes.length > 0) {
                textNodes.forEach((n: ShapeLike) => (n.fill = value))
            } else {
                shape[name] = value
            }
            break
        case 'strokeType':
            if (isStrokeScaled(group.elementData)) {
                applyStrokeDashes(
                    shape,
                    value as string | null,
                    group.parent?.scale ?? 1
                )
            } else {
                shape.dashes = strokeTypeToDashes(value as string | null)
                if (!value || value === 'solid') {
                    clearDashesOnTwoJSShape(shape)
                }
            }
            if (meta) meta.strokeType = value
            break
        case 'fillType':
            if (meta?.componentType === 'area') {
                shape.fill = areaFillFor(two, meta.stroke, value, meta)
                meta.fillType = value
            }
            break
        case 'zoomResistant': {
            const resistType = group.elementData?.componentType
            if (resistType !== 'text') break
            group.elementData.zoomResistant = value
            window.dispatchEvent(
                new CustomEvent(TEXT_RESIST_CHANGED_EVENT, {
                    detail: {
                        id: group.elementData.id,
                        resist: resolveResist(group.elementData),
                    },
                })
            )
            break
        }
        case 'opacity':
            if (isCircle) {
                shape.opacity = value
                group.opacity = 1
                break
            }
            if (meta?.componentType === 'area') {
                group.opacity = 1
                shape.opacity = 1
                meta.opacity = value
                shape.fill = areaFillFor(two, meta.stroke, meta.fillType, meta)
                break
            }
            group.opacity = value
            shape.opacity = 1
            if (textNodes.length > 0) {
                textNodes.forEach((n: ShapeLike) => (n.opacity = 1))
            }
            break
        case 'metadata': {
            const revertedProps = readProperties({ metadata: value })
            if (Object.keys(revertedProps).length > 0) {
                if (isCircle) break
                const fallbackTextNode: ShapeLike =
                    typeof shape?.value === 'string'
                        ? shape
                        : group.children?.find(
                              (c: ShapeLike) => typeof c?.value === 'string'
                          )
                const applyToText = (fn: (n: ShapeLike) => void): void => {
                    if (textNodes.length > 0) textNodes.forEach(fn)
                    else if (fallbackTextNode) fn(fallbackTextNode)
                }
                Object.entries(revertedProps).forEach(
                    ([k, v]) => {
                        if (k === 'opacity') {
                            group.opacity = v
                            shape.opacity = 1
                            if (textNodes.length > 0) {
                                textNodes.forEach(
                                    (n: ShapeLike) => (n.opacity = 1)
                                )
                            }
                        } else if (k === 'textFontSize' || k === 'fontSize') {
                            applyToText((n) => {
                                n.size = v
                                n.leading = v
                            })
                            if (isStandaloneText && textNodes.length > 1) {
                                const lh = lineHeightFor(Number(v))
                                const cnt = textNodes.length
                                textNodes.forEach((n: ShapeLike, i: number) =>
                                    n.translation.set(
                                        0,
                                        (i - (cnt - 1) / 2) * lh
                                    )
                                )
                            }
                        } else if (k === 'textFontFamily') {
                            applyToText((n) => {
                                n.family = v
                            })
                        } else if (k === 'textFill') {
                            applyToText((n) => {
                                n.fill = v
                            })
                        }
                    }
                )
            }
            break
        }
        default:
            break
    }
}

export function useComponentHistory({
    twoJSInstanceRef,
    stateRefForComponentStore,
    isPersistedRef,
    baseId,
    insertComponent,
    deleteComponent,
    updateComponentInfo,
    setComponentStore,
    setShowPermissionErrorModal,
    setDefaultLinewidth,
    setDefaultStrokeType,
    setDefaultFillType,
    setToolbarRefreshKey,
    selectedComponent,
    selectedGroupRef,
    stripTypename,
    applyMetaHistoryRef,
}: ComponentHistoryOptions): ComponentHistoryApi {
    const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([])
    const historyLogRef = useRef<HistoryEntry[]>([])
    const [bucketLog, setBucketLog] = useState<HistoryEntry[]>([])
    const bucketLogRef = useRef<HistoryEntry[]>([])

    const writeHistory = (next: HistoryEntry[]): void => {
        historyLogRef.current = next
        setHistoryLog(next)
    }
    const writeBucket = (next: HistoryEntry[]): void => {
        bucketLogRef.current = next
        setBucketLog(next)
    }

    const applyRemove = (id: string): void => {
        const two = twoJSInstanceRef.current
        const group = two?.scene.children.find(
            (c: ShapeLike) => c?.elementData?.id === id
        )
        if (group) {
            two.remove([group])
        }
        const updatedStore = { ...stateRefForComponentStore.current }
        delete updatedStore[id]
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        window.dispatchEvent(
            new CustomEvent('elementRemoved', { detail: { id } })
        )
        if (isPersistedRef.current) {
            deleteComponent({
                variables: { id },
                errorPolicy: import.meta.env.VITE_GRAPHQL_ERROR_POLICY,
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyInsert = (
        id: string,
        componentInfo: ComponentRecord,
        onPermissionError?: () => void
    ): void => {
        const two = twoJSInstanceRef.current
        if (!componentInfo || !componentInfo.componentType) return
        const restoredState = { ...componentInfo, baseId }
        const updatedStore = {
            ...stateRefForComponentStore.current,
            [id]: restoredState,
        }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)
        if (isPersistedRef.current) {
            insertComponent({
                variables: {
                    object: toComponentColumns(
                        stripTypename(restoredState) as Record<string, unknown>
                    ),
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }).catch((error: any) => {
                const isPermissionError = error.graphQLErrors?.some(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (e: any) => e.extensions?.code === 'permission-error'
                )
                if (isPermissionError) {
                    onPermissionError?.()
                    setShowPermissionErrorModal(true)
                }
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyVertices = (id: string, x: number, y: number): void => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }
        const current = updatedStore[id]
        const placement = moveGeometryTo(current, x, y) ?? { x, y }
        if (current) {
            updatedStore[id] = { ...current, ...placement }
        }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        const group = two?.scene.children.find(
            (c: ShapeLike) => c?.elementData?.id === id
        )
        if (group) {
            group.translation.x = x
            group.translation.y = y
            if (group.elementData) {
                Object.assign(group.elementData, placement)
            }
            two?.update()
        }
        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: { id, updateObj: placement },
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const reapplyTextFromMeta = (
        group: ShapeLike,
        meta: BulkProps['metadata']
    ): void => {
        const two = twoJSInstanceRef.current
        if (!two || !group || !meta) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = readProperties({ metadata: meta }) as Record<string, any>
        const ct = group.elementData?.componentType

        if (isStandaloneTextType(ct)) {
            if (typeof m.content !== 'string') return
            if (group.elementData) {
                group.elementData.metadata = {
                    ...(group.elementData.metadata || {}),
                    ...m,
                }
            }
            window.dispatchEvent(
                new CustomEvent('standaloneTextReverted', {
                    detail: {
                        id: group.elementData?.id,
                        content: m.content,
                    },
                })
            )
            return
        }

        if (ct === 'point') {
            const elementData = group.elementData
            if (elementData) {
                const record = stateRefForComponentStore.current[elementData.id]
                if (record) {
                    elementData.fill = record.fill
                    elementData.stroke = record.stroke
                }
                elementData.metadata =
                    record && readGeometry(record)
                        ? record.metadata
                        : (replaceProperties(elementData, m).metadata ??
                          elementData.metadata)
            }
            buildPointVisual(two, group, {
                color: pointColorOf(elementData),
                label: pointLabelOf(elementData),
                fontFamily: pointFontFamilyOf(elementData),
                fontSize: pointFontSizeOf(elementData),
            })
            two.update()
            return
        }

        if (ct === 'circle') {
            const elementData = group.elementData
            if (elementData) {
                const record = stateRefForComponentStore.current[elementData.id]
                elementData.metadata =
                    record && readGeometry(record)
                        ? record.metadata
                        : (replaceProperties(elementData, m).metadata ??
                          elementData.metadata)
                if (record?.width !== undefined) {
                    elementData.width = record.width
                }
                if (record?.textColor !== undefined) {
                    elementData.textColor = record.textColor
                }
            }
            buildCircleLabel(two, group, {
                text: circleLabelOf(elementData),
                fontFamily: circleLabelFontFamilyOf(elementData),
                fontSize: circleLabelFontSizeOf(elementData),
                color: circleLabelColorOf(elementData),
                width:
                    elementData?.width ?? group.children?.[0]?.width ?? 100,
            })
            two.update()
            return
        }

        if (ct === 'rectangle' || ct === 'diamond') {
            const shapeChild = group.children?.[0]
            const width = shapeChild?.width
            if (!width) return
            if (group.elementData) {
                group.elementData.metadata = {
                    ...(group.elementData.metadata || {}),
                    ...m,
                }
            }
            if (m.hasText && typeof m.textContent === 'string') {
                applyShapeText(two, group, ct, width, m)
            } else {
                const layer = findShapeTextLayer(group)
                if (layer) {
                    renderShapeTextLayer(
                        two,
                        group,
                        [],
                        shapeTextStyleFromMeta(m).style
                    )
                }
            }
            two.update()
        }
    }

    const rewrapCircleAfterResize = (
        group: ShapeLike,
        props: BulkProps
    ): void => {
        const two = twoJSInstanceRef.current
        if (!two || !group) return
        if (group.elementData?.componentType !== 'circle') return
        if (props.width === undefined && props.height === undefined) return
        if (props.metadata) return
        const record = group.elementData
        buildCircleLabel(two, group, {
            text: circleLabelOf(record),
            fontFamily: circleLabelFontFamilyOf(record),
            fontSize: circleLabelFontSizeOf(record),
            color: circleLabelColorOf(record),
            width: record?.width ?? group.children?.[0]?.width ?? 100,
        })
        two.update()
    }

    const applyBulkProps = (
        id: string,
        props: BulkProps,
        syncDefaults?: boolean
    ): void => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }
        const current = updatedStore[id]
        if (current) {
            updatedStore[id] = { ...current, ...props } as ComponentRecord
        }
        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)

        const group = two?.scene.children.find(
            (c: ShapeLike) => c?.elementData?.id === id
        )
        if (group) {
            if (props.x !== undefined) group.translation.x = props.x
            if (props.y !== undefined) group.translation.y = props.y
            Object.entries(props).forEach(([name, val]) => {
                applyPropertyToTwoJSGroup(group, name, val, two)
            })

            const hasArrowVertices =
                props.x1 !== undefined ||
                props.y1 !== undefined ||
                props.x2 !== undefined ||
                props.y2 !== undefined
            if (hasArrowVertices) {
                const line = group.children?.[0]
                const pointCircle1Group = group.children?.[1]
                const pointCircle2Group = group.children?.[2]
                if (line && pointCircle1Group && pointCircle2Group) {
                    const x1 = props.x1 ?? line.vertices[0].x
                    const y1 = props.y1 ?? line.vertices[0].y
                    const x2 = props.x2 ?? line.vertices[1].x
                    const y2 = props.y2 ?? line.vertices[1].y
                    updateX1Y1Vertices(
                        Two,
                        line,
                        x1,
                        y1,
                        pointCircle1Group,
                        two
                    )
                    updateX2Y2Vertices(
                        Two,
                        line,
                        x2,
                        y2,
                        pointCircle2Group,
                        two
                    )
                }
            }

            if (props.metadata) reapplyTextFromMeta(group, props.metadata)
            rewrapCircleAfterResize(group, props)

            if (
                props.metadata &&
                VERTEX_PATH_TYPES.has(group.elementData?.componentType)
            ) {
                group.elementData.metadata = props.metadata
                window.dispatchEvent(
                    new CustomEvent(VERTEX_PATH_REVERTED_EVENT, {
                        detail: { id, metadata: props.metadata },
                    })
                )
            }

            two?.update()

            if (props.width !== undefined || props.height !== undefined) {
                window.dispatchEvent(
                    new CustomEvent('undoSelectorSync', {
                        detail: { elementId: id },
                    })
                )
            }
        }

        if (syncDefaults) {
            if (props.linewidth !== undefined && props.linewidth !== null) {
                setDefaultLinewidth(props.linewidth)
            }
            if (props.strokeType !== undefined) {
                setDefaultStrokeType(
                    props.strokeType === 'solid' ? null : props.strokeType
                )
            }
            if (props.fillType !== undefined) {
                setDefaultFillType(areaFillTypeToDb(props.fillType))
            }
        }
        if (props.strokeType !== undefined) {
            if (selectedComponent?.group?.data?.elementData) {
                selectedComponent.group.data.elementData.strokeType =
                    props.strokeType
            }
        }
        if (
            props.linewidth !== undefined ||
            props.strokeType !== undefined ||
            props.fillType !== undefined
        ) {
            setToolbarRefreshKey?.((k) => k + 1)
        }

        if (isPersistedRef.current) {
            updateComponentInfo({
                variables: { id, updateObj: toComponentColumns(props) },
            })
        }
        requestAnimationFrame(() => two?.update())
    }

    const applyBatch = (
        entries: HistoryEntry[],
        direction: 'undo' | 'redo'
    ): void => {
        const two = twoJSInstanceRef.current
        const updatedStore = { ...stateRefForComponentStore.current }

        entries.forEach((e) => {
            const isInsert =
                (direction === 'undo' && e.action === 'DELETE') ||
                (direction === 'redo' && e.action === 'ADD')
            const isRemove =
                (direction === 'undo' && e.action === 'ADD') ||
                (direction === 'redo' && e.action === 'DELETE')

            if (isInsert) {
                const source =
                    direction === 'undo' && e.action === 'DELETE'
                        ? e.prevState
                        : e.action === 'ADD'
                          ? e.componentInfo
                          : undefined
                if (!source) return
                const restoredState = { ...source, baseId }
                updatedStore[e.action === 'DELETE' ? e.id : e.id] =
                    restoredState
                if (isPersistedRef.current) {
                    insertComponent({
                        variables: {
                            object: toComponentColumns(
                                stripTypename(restoredState) as Record<
                                    string,
                                    unknown
                                >
                            ),
                        },
                    })
                }
            } else if (isRemove) {
                const id =
                    e.action === 'ADD' || e.action === 'DELETE'
                        ? e.id
                        : undefined
                if (!id) return
                delete updatedStore[id]
                window.dispatchEvent(
                    new CustomEvent('elementRemoved', {
                        detail: { id },
                    })
                )
                const sceneGroup = two?.scene.children.find(
                    (c: ShapeLike) => c?.elementData?.id === id
                )
                if (sceneGroup) two?.remove([sceneGroup])
                if (isPersistedRef.current) {
                    deleteComponent({ variables: { id } })
                }
            } else if (e.action === 'UPDATE_BULK') {
                const propsToApply: BulkProps | undefined =
                    direction === 'undo' ? e.prevProps : e.bulkObj
                if (!propsToApply) return
                const existing = updatedStore[e.id]
                if (existing) {
                    updatedStore[e.id] = {
                        ...existing,
                        ...propsToApply,
                    } as ComponentRecord
                }
                const sceneGroup = two?.scene.children.find(
                    (c: ShapeLike) => c?.elementData?.id === e.id
                )
                if (sceneGroup) {
                    if (propsToApply.x !== undefined)
                        sceneGroup.translation.x = propsToApply.x
                    if (propsToApply.y !== undefined)
                        sceneGroup.translation.y = propsToApply.y
                    Object.entries(propsToApply).forEach(([name, val]) => {
                        applyPropertyToTwoJSGroup(sceneGroup, name, val, two)
                    })
                    const hasArrowVertices =
                        propsToApply.x1 !== undefined ||
                        propsToApply.y1 !== undefined ||
                        propsToApply.x2 !== undefined ||
                        propsToApply.y2 !== undefined
                    if (hasArrowVertices) {
                        const line = sceneGroup.children?.[0]
                        const pointCircle1Group = sceneGroup.children?.[1]
                        const pointCircle2Group = sceneGroup.children?.[2]
                        if (line && pointCircle1Group && pointCircle2Group) {
                            const x1 = propsToApply.x1 ?? line.vertices[0].x
                            const y1 = propsToApply.y1 ?? line.vertices[0].y
                            const x2 = propsToApply.x2 ?? line.vertices[1].x
                            const y2 = propsToApply.y2 ?? line.vertices[1].y
                            updateX1Y1Vertices(
                                Two,
                                line,
                                x1,
                                y1,
                                pointCircle1Group,
                                two
                            )
                            updateX2Y2Vertices(
                                Two,
                                line,
                                x2,
                                y2,
                                pointCircle2Group,
                                two
                            )
                        }
                    }
                    if (
                        sceneGroup.elementData?.componentType === 'pencil' &&
                        propsToApply.metadata
                    ) {
                        const path = sceneGroup.children?.[0]
                        if (path?.vertices) {
                            const baseX =
                                propsToApply.x ?? sceneGroup.translation.x
                            const baseY =
                                propsToApply.y ?? sceneGroup.translation.y
                            path.vertices = []
                            geometryPositions(
                                readGeometry({
                                    metadata: propsToApply.metadata,
                                })
                            ).forEach(([px, py]) => {
                                path.vertices.push(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    new (Two as any).Anchor(
                                        px - baseX,
                                        py - baseY
                                    )
                                )
                            })
                        }
                    }
                    if (sceneGroup.elementData) {
                        Object.entries(propsToApply).forEach(([k, v]) => {
                            sceneGroup.elementData[k] = v
                        })
                    }
                    if (propsToApply.metadata) {
                        reapplyTextFromMeta(sceneGroup, propsToApply.metadata)
                    }
                    rewrapCircleAfterResize(sceneGroup, propsToApply)
                    if (
                        propsToApply.width !== undefined ||
                        propsToApply.height !== undefined
                    ) {
                        window.dispatchEvent(
                            new CustomEvent('undoSelectorSync', {
                                detail: { elementId: e.id },
                            })
                        )
                    }
                }
                const activeGroup = selectedGroupRef?.current
                const groupChildren = activeGroup?.elementData?.children
                if (Array.isArray(groupChildren)) {
                    const inGroup = groupChildren.some(
                        (c: ShapeLike) => c?.id === e.id
                    )
                    if (inGroup) {
                        const coreObj = activeGroup.children?.find(
                            (c: ShapeLike) => c?.elementData?.id === e.id
                        )
                        if (coreObj) {
                            Object.entries(propsToApply).forEach(
                                ([name, val]) => {
                                    applyPropertyToTwoJSGroup(
                                        coreObj,
                                        name,
                                        val,
                                        two
                                    )
                                }
                            )
                        }
                        groupChildren.forEach((c: ShapeLike) => {
                            if (c?.id === e.id) {
                                Object.entries(propsToApply).forEach(
                                    ([k, v]) => {
                                        c[k] = v
                                    }
                                )
                            }
                        })
                    }
                }
                if (isPersistedRef.current) {
                    updateComponentInfo({
                        variables: {
                            id: e.id,
                            updateObj: toComponentColumns(propsToApply),
                        },
                    })
                }
            }
        })

        stateRefForComponentStore.current = updatedStore
        setComponentStore(updatedStore)
        requestAnimationFrame(() => two?.update())
    }

    const recordToHistoryLog = (entry: HistoryEntry): void => {
        const updatedLog: HistoryEntry[] = [
            ...historyLogRef.current,
            { ...entry, timestamp: Date.now() },
        ]
        writeHistory(updatedLog)
        writeBucket([])
    }

    const recordBatchToHistoryLog = (entries: HistoryEntry[]): void => {
        const updatedLog: HistoryEntry[] = [
            ...historyLogRef.current,
            { action: 'BATCH', entries, timestamp: Date.now() },
        ]
        writeHistory(updatedLog)
        writeBucket([])
    }

    const captureNextState = (entry: HistoryEntry): HistoryEntry => {
        if (entry.action === 'ADD') {
            const current = stateRefForComponentStore.current[entry.id]
            return current ? { ...entry, componentInfo: { ...current } } : entry
        }
        if (entry.action === 'UPDATE_VERTICES') {
            const current = stateRefForComponentStore.current[entry.id]
            return {
                ...entry,
                nextX: current?.x,
                nextY: current?.y,
            }
        }
        if (entry.action === 'UPDATE_BULK') {
            const current = stateRefForComponentStore.current[entry.id]
            const nextProps: BulkProps = {}
            Object.keys(entry.prevProps || {}).forEach((k) => {
                ;(nextProps as Record<string, unknown>)[k] = (
                    current as unknown as Record<string, unknown> | undefined
                )?.[k]
            })
            return { ...entry, nextProps }
        }
        return entry
    }

    const undoLastAction = (): void => {
        if (historyLogRef.current.length === 0) return

        const updatedLog = [...historyLogRef.current]
        const lastEntry = updatedLog.pop()
        if (!lastEntry) return
        writeHistory(updatedLog)

        const enrichedForRedo = captureNextState(lastEntry)

        if (lastEntry.action === 'ADD') {
            applyRemove(lastEntry.id)
        } else if (lastEntry.action === 'DELETE') {
            applyInsert(lastEntry.id, lastEntry.prevState, () =>
                undoLastAction()
            )
        } else if (lastEntry.action === 'BATCH') {
            applyBatch(lastEntry.entries, 'undo')
        } else if (lastEntry.action === 'UPDATE_VERTICES') {
            applyVertices(lastEntry.id, lastEntry.prevX, lastEntry.prevY)
        } else if (lastEntry.action === 'UPDATE_BULK') {
            applyBulkProps(
                lastEntry.id,
                lastEntry.prevProps,
                lastEntry.syncDefaults
            )
        } else if (lastEntry.action === 'META') {
            void applyMetaHistoryRef?.current?.(lastEntry.ops, 'undo')
        }

        const updatedBucket = [...bucketLogRef.current, enrichedForRedo]
        writeBucket(updatedBucket)

        window.dispatchEvent(new CustomEvent('historyApplied'))
    }

    const redoLastAction = (): void => {
        if (bucketLogRef.current.length === 0) return

        const updatedBucket = [...bucketLogRef.current]
        const entry = updatedBucket.pop()
        if (!entry) return
        writeBucket(updatedBucket)

        if (entry.action === 'ADD') {
            applyInsert(entry.id, entry.componentInfo)
        } else if (entry.action === 'DELETE') {
            applyRemove(entry.id)
        } else if (entry.action === 'BATCH') {
            applyBatch(entry.entries, 'redo')
        } else if (entry.action === 'UPDATE_VERTICES') {
            applyVertices(
                entry.id,
                entry.nextX ?? entry.prevX,
                entry.nextY ?? entry.prevY
            )
        } else if (entry.action === 'UPDATE_BULK') {
            applyBulkProps(
                entry.id,
                entry.nextProps ?? entry.prevProps,
                entry.syncDefaults
            )
        } else if (entry.action === 'META') {
            void applyMetaHistoryRef?.current?.(entry.ops, 'redo')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleanEntry: any = { ...entry }
        delete cleanEntry.nextX
        delete cleanEntry.nextY
        delete cleanEntry.nextProps
        const updatedLog = [
            ...historyLogRef.current,
            cleanEntry as HistoryEntry,
        ]
        writeHistory(updatedLog)

        window.dispatchEvent(new CustomEvent('historyApplied'))
    }

    const clearHistory = (
        isPersistedArg: boolean,
        localDraftKey?: string
    ): void => {
        writeHistory([])
        writeBucket([])
        if (!isPersistedArg) {
            localStorage.removeItem(localDraftKey || DRAFT_STORAGE_KEY)
        }
    }

    return {
        historyLog,
        historyLogRef,
        bucketLog,
        bucketLogRef,
        recordToHistoryLog,
        recordBatchToHistoryLog,
        undoLastAction,
        redoLastAction,
        clearHistory,
    }
}
