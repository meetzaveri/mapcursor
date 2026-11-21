import type { MutableRefObject } from 'react'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from './misc'
import { isStrokeScaled } from './counterScale'
import { applyStrokeDashes } from './strokeDashes'
import {
    applyShapeText,
    layoutStandaloneText,
    shapeTextStyleFromMeta,
    readOpacity,
} from './canvasUtils'
import { resolveHeightForTextStyleChange } from './shapeTextFit'
import { TEXT_SIZES_ARRAY } from './constants'
import { pointLabelSizeFor } from '../constants/misc'
import {
    pointGeometry,
    readGeometry,
    readProperties,
    setGeometry,
    setProperties,
} from './geometry'
import {
    buildCircleLabel,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
} from '../factory/circleLabel'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectedGroupLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChildEntry = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentRow = Record<string, any>

type GroupPropertyKey =
    | 'fill'
    | 'stroke'
    | 'linewidth'
    | 'strokeType'
    | 'opacity'
    | 'textColor'
    | 'textSize'
    | 'textFontFamily'

interface HistoryBatchEntry {
    action: 'UPDATE_BULK'
    id: string
    prevProps: Partial<ComponentRow>
    bulkObj: Partial<ComponentRow>
}

export interface ApplyGroupPropertyDeps {
    selectedGroup: SelectedGroupLike | null
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRow>,
        skipDbWrite?: boolean
    ) => void
    stateRefForComponentStore?: MutableRefObject<Record<string, ComponentRow>>
    recordBatchToHistoryLog?: (entries: HistoryBatchEntry[]) => void
}

const ACCEPTS: Record<GroupPropertyKey, Set<string>> = {
    fill: new Set(['rectangle', 'circle', 'diamond', 'frame']),
    stroke: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'pencil',
    ]),
    linewidth: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'pencil',
    ]),
    strokeType: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'divider',
        'pencil',
    ]),
    opacity: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'text',
        'text',
        'pencil',
        'image',
    ]),
    textColor: new Set([
        'text',
        'text',
        'rectangle',
        'diamond',
        'circle',
    ]),
    textSize: new Set(['text', 'rectangle', 'diamond', 'circle']),
    textFontFamily: new Set([
        'text',
        'text',
        'rectangle',
        'diamond',
        'circle',
    ]),
}

function metaSourceOf(sceneEl: ShapeLike, child: ShapeLike): ShapeLike {
    return readGeometry(sceneEl?.elementData) ? sceneEl.elementData : child
}

function findSceneElement(two: TwoLike, id: string): ShapeLike | undefined {
    return two?.scene?.children?.find(
        (c: ShapeLike) => c?.elementData?.id === id
    )
}

function findVisibleCoreObject(
    group: SelectedGroupLike,
    id: string
): ShapeLike | null {
    if (!group?.children) return null
    for (let i = 0; i < group.children.length; i++) {
        const c = group.children[i]
        if (c?.elementData?.id === id) return c
    }
    return null
}

function findTextNodesInside(obj: ShapeLike): ShapeLike[] {
    if (!obj?.children) return []
    const out: ShapeLike[] = []
    for (let i = 0; i < obj.children.length; i++) {
        const c = obj.children[i]
        if (typeof c?.value === 'string') out.push(c)
        else if (Array.isArray(c?.children)) out.push(...findTextNodesInside(c))
    }
    return out
}

function applyDashesToLeaves(
    node: ShapeLike,
    dashes: number[],
    clearSolid: boolean
): void {
    if (!node) return
    if (Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
            applyDashesToLeaves(node.children[i], dashes, clearSolid)
        }
        return
    }
    if (typeof node.value === 'string') return
    node.dashes = dashes
    if (clearSolid) clearDashesOnTwoJSShape(node)
}

function applyToTwoShape(
    shape: ShapeLike,
    propertyKey: GroupPropertyKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
): void {
    if (!shape) return
    if (propertyKey === 'fill') shape.fill = value
    else if (propertyKey === 'stroke') shape.stroke = value
    else if (propertyKey === 'linewidth') shape.linewidth = value
    else if (propertyKey === 'opacity') shape.opacity = value
}

export function createApplyGroupProperty(deps: ApplyGroupPropertyDeps) {
    return function applyGroupProperty(
        propertyKey: GroupPropertyKey | string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        opts?: { preview?: boolean }
    ): void {
        const {
            selectedGroup,
            twoJSInstance,
            updateComponentBulkPropertiesInLocalStore,
            stateRefForComponentStore,
            recordBatchToHistoryLog,
        } = deps

        const children: ChildEntry[] | undefined =
            selectedGroup?.elementData?.children
        if (!Array.isArray(children) || children.length === 0) return

        const acceptSet = ACCEPTS[propertyKey as GroupPropertyKey]
        if (!acceptSet) return

        const batchEntries: HistoryBatchEntry[] = []

        const snapshotPrev = (
            id: string,
            keys: string[]
        ): Partial<ComponentRow> => {
            const current = stateRefForComponentStore?.current?.[id] ?? {}
            const prev: Partial<ComponentRow> = {}
            keys.forEach((k) => {
                let v = current[k]
                if (v === undefined && k === 'opacity') v = readOpacity(current)
                if (v !== undefined) prev[k] = v
            })
            return prev
        }
        const recordChild = (
            id: string,
            bulkObj: Partial<ComponentRow>
        ): void => {
            const prevProps = snapshotPrev(id, Object.keys(bulkObj))
            batchEntries.push({
                action: 'UPDATE_BULK',
                id,
                prevProps,
                bulkObj,
            })
            updateComponentBulkPropertiesInLocalStore(id, bulkObj, true)
        }

        const cameraScale = twoJSInstance?.scene?.scale ?? 1
        const redashStroke = (
            node: ShapeLike,
            strokeType: string | null | undefined
        ): void => {
            const leaf = node?.children?.[0]
            if (leaf && typeof leaf.value !== 'string') {
                applyStrokeDashes(leaf, strokeType, cameraScale)
            }
        }

        children.forEach((child) => {
            const type = child?.componentType
            if (!type || !acceptSet.has(type)) return
            const id = child?.id
            if (!id) return

            const sceneEl = findSceneElement(twoJSInstance, id)
            const coreObj = findVisibleCoreObject(selectedGroup, id)
            const strokeScaled = isStrokeScaled(child)

            if (
                propertyKey === 'fill' ||
                propertyKey === 'stroke' ||
                propertyKey === 'linewidth'
            ) {
                const sceneTexts = findTextNodesInside(sceneEl)
                const coreTexts = findTextNodesInside(coreObj)
                const sceneTextValues = sceneTexts.map((t) => t?.[propertyKey])
                const coreTextValues = coreTexts.map((t) => t?.[propertyKey])

                applyToTwoShape(sceneEl, propertyKey, value)
                applyToTwoShape(coreObj, propertyKey, value)

                sceneTexts.forEach((t, i) => {
                    if (sceneTextValues[i] !== undefined)
                        t[propertyKey] = sceneTextValues[i]
                })
                coreTexts.forEach((t, i) => {
                    if (coreTextValues[i] !== undefined)
                        t[propertyKey] = coreTextValues[i]
                })

                if (sceneEl?.elementData)
                    sceneEl.elementData[propertyKey] = value
                child[propertyKey] = value

                if (propertyKey === 'linewidth' && strokeScaled) {
                    redashStroke(sceneEl, child.strokeType)
                    redashStroke(coreObj, child.strokeType)
                }

                if (propertyKey === 'fill' && type === 'circle') {
                    const sceneLeaf = sceneEl?.children?.[0]
                    const coreLeaf = coreObj?.children?.[0]
                    if (sceneLeaf) sceneLeaf.stroke = value
                    if (coreLeaf) coreLeaf.stroke = value
                    if (sceneEl?.elementData)
                        sceneEl.elementData.stroke = value
                    child.stroke = value
                    recordChild(id, { fill: value, stroke: value })
                    return
                }

                recordChild(id, { [propertyKey]: value })
                return
            }

            if (propertyKey === 'strokeType') {
                const dbValue = value === 'solid' ? 'solid' : value
                if (strokeScaled) {
                    redashStroke(sceneEl, value)
                    redashStroke(coreObj, value)
                } else {
                    const dashes = strokeTypeToDashes(value)
                    const clearSolid = value === 'solid'
                    applyDashesToLeaves(sceneEl, dashes, clearSolid)
                    applyDashesToLeaves(coreObj, dashes, clearSolid)
                }
                if (sceneEl?.elementData)
                    sceneEl.elementData.strokeType = dbValue
                child.strokeType = dbValue
                recordChild(id, { strokeType: dbValue })
                return
            }

            if (propertyKey === 'opacity') {
                const sceneLeaf = sceneEl?.children?.[0]
                if (sceneLeaf) sceneLeaf.opacity = type === 'circle' ? value : 1
                findTextNodesInside(sceneEl).forEach((t) => (t.opacity = 1))
                if (coreObj) {
                    coreObj.opacity = value
                    const coreLeaf = coreObj?.children?.[0]
                    if (coreLeaf) coreLeaf.opacity = 1
                    findTextNodesInside(coreObj).forEach((t) => (t.opacity = 1))
                }
                if (opts?.preview) return
                if (sceneEl?.elementData) sceneEl.elementData.opacity = value
                child.opacity = value
                recordChild(id, { opacity: value })
                return
            }

            if (propertyKey === 'textColor') {
                if (type === 'text') {
                    const sceneTexts = sceneEl
                        ? findTextNodesInside(sceneEl)
                        : []
                    const coreTexts = coreObj
                        ? findTextNodesInside(coreObj)
                        : []
                    sceneTexts.forEach((t) => (t.fill = value))
                    coreTexts.forEach((t) => (t.fill = value))
                    if (sceneEl?.elementData)
                        sceneEl.elementData.textColor = value
                    child.textColor = value
                    recordChild(id, { textColor: value })
                } else if (type === 'circle') {
                    const width = sceneEl?.elementData?.width ?? child?.width
                    const meta = readProperties(metaSourceOf(sceneEl, child))
                    if (sceneEl?.elementData)
                        sceneEl.elementData.textColor = value
                    child.textColor = value
                    const opts = {
                        text: circleLabelOf({ metadata: meta }),
                        fontFamily: circleLabelFontFamilyOf({ metadata: meta }),
                        fontSize: circleLabelFontSizeOf({ metadata: meta }),
                        color: value,
                        width: width ?? 100,
                    }
                    if (sceneEl) buildCircleLabel(twoJSInstance, sceneEl, opts)
                    if (coreObj) buildCircleLabel(twoJSInstance, coreObj, opts)
                    recordChild(id, { textColor: value })
                } else if (type === 'rectangle' || type === 'diamond') {
                    const sceneTexts = sceneEl
                        ? findTextNodesInside(sceneEl)
                        : []
                    const coreTexts = coreObj
                        ? findTextNodesInside(coreObj)
                        : []
                    if (
                        sceneTexts.length === 0 &&
                        coreTexts.length === 0 &&
                        !child?.metadata?.hasText
                    ) {
                        return
                    }
                    sceneTexts.forEach((t) => (t.fill = value))
                    coreTexts.forEach((t) => (t.fill = value))
                    const patch = setProperties(
                        metaSourceOf(sceneEl, child),
                        { textFill: value }
                    )
                    if (patch.metadata) {
                        if (sceneEl?.elementData)
                            sceneEl.elementData.metadata = patch.metadata
                        child.metadata = patch.metadata
                    }
                    recordChild(id, { ...patch, textColor: value })
                }
                return
            }

            if (
                propertyKey === 'textSize' ||
                propertyKey === 'textFontFamily'
            ) {
                if (type === 'circle') {
                    let metaPatch: Record<string, unknown> | null = null
                    if (propertyKey === 'textFontFamily') {
                        metaPatch = { textFontFamily: value }
                    } else {
                        const ladderLabel = TEXT_SIZES_ARRAY.find(
                            (s) =>
                                s.value === value ||
                                (s as { mobileValue?: number }).mobileValue ===
                                    value
                        )?.label
                        if (!ladderLabel) return
                        metaPatch = {
                            textFontSize: pointLabelSizeFor(ladderLabel),
                        }
                    }
                    const patch = setProperties(
                        metaSourceOf(sceneEl, child),
                        metaPatch
                    )
                    const updatedMeta = patch.metadata
                    if (updatedMeta) {
                        if (sceneEl?.elementData)
                            sceneEl.elementData.metadata = updatedMeta
                        child.metadata = updatedMeta
                    }
                    const width = sceneEl?.elementData?.width ?? child?.width
                    const opts = {
                        text: circleLabelOf({ metadata: updatedMeta }),
                        fontFamily: circleLabelFontFamilyOf({
                            metadata: updatedMeta,
                        }),
                        fontSize: circleLabelFontSizeOf({
                            metadata: updatedMeta,
                        }),
                        width: width ?? 100,
                    }
                    if (sceneEl) buildCircleLabel(twoJSInstance, sceneEl, opts)
                    if (coreObj) buildCircleLabel(twoJSInstance, coreObj, opts)
                    recordChild(id, patch)
                    return
                }

                const sceneTexts = sceneEl ? findTextNodesInside(sceneEl) : []
                const coreTexts = coreObj ? findTextNodesInside(coreObj) : []
                const metaKey =
                    propertyKey === 'textSize'
                        ? 'textFontSize'
                        : 'textFontFamily'
                const twoKey = propertyKey === 'textSize' ? 'size' : 'family'
                const metaSource = metaSourceOf(sceneEl, child)
                const existingProps = readProperties(metaSource)
                const updatedProps = { ...existingProps, [metaKey]: value }
                const textPatch = setProperties(metaSource, {
                    [metaKey]: value,
                })
                const updatedMeta = textPatch.metadata

                if (type === 'text') {
                    sceneTexts.forEach((t) => (t[twoKey] = value))
                    coreTexts.forEach((t) => (t[twoKey] = value))
                    if (propertyKey === 'textSize') {
                        const lineSource =
                            coreTexts.length > 0 ? coreTexts : sceneTexts
                        const content =
                            lineSource.length > 0
                                ? lineSource
                                      .map((n) => n.value ?? '')
                                      .join('\n')
                                : ((updatedProps.content as string) ?? '')
                        if (sceneEl)
                            layoutStandaloneText(
                                twoJSInstance,
                                sceneEl,
                                content,
                                value
                            )
                        if (coreObj)
                            layoutStandaloneText(
                                twoJSInstance,
                                coreObj,
                                content,
                                value
                            )
                    }
                    if (updatedMeta) {
                        if (sceneEl?.elementData)
                            sceneEl.elementData.metadata = updatedMeta
                        child.metadata = updatedMeta
                    }
                    recordChild(id, textPatch)
                    return
                }

                if (
                    sceneTexts.length === 0 &&
                    coreTexts.length === 0 &&
                    !child?.metadata?.hasText
                ) {
                    return
                }

                const storeRow = stateRefForComponentStore?.current?.[id]
                const width =
                    storeRow?.width ??
                    child?.width ??
                    sceneEl?.children?.[0]?.width ??
                    coreObj?.children?.[0]?.width ??
                    120
                const currentH =
                    storeRow?.height ??
                    child?.height ??
                    sceneEl?.children?.[0]?.height ??
                    coreObj?.children?.[0]?.height ??
                    0

                if (sceneEl)
                    applyShapeText(
                        twoJSInstance,
                        sceneEl,
                        type,
                        width,
                        updatedMeta
                    )
                if (coreObj)
                    applyShapeText(
                        twoJSInstance,
                        coreObj,
                        type,
                        width,
                        updatedProps
                    )

                const { font: nextFont } = shapeTextStyleFromMeta(updatedProps)
                const { font: prevFont } = shapeTextStyleFromMeta(existingProps)
                const newH = resolveHeightForTextStyleChange({
                    kind: type,
                    width,
                    rawText: (updatedProps.textContent as string) ?? '',
                    prevFont,
                    nextFont,
                    currentHeight: currentH,
                })

                const bulkObj: Partial<ComponentRow> = { ...textPatch }
                if (newH !== currentH) {
                    const sceneRect = sceneEl?.children?.[0]
                    const coreRect = coreObj?.children?.[0]
                    if (sceneRect) sceneRect.height = newH
                    if (coreRect) coreRect.height = newH

                    const dy = (newH - currentH) / 2
                    const prevAbsY = sceneEl?.translation?.y ?? storeRow?.y ?? 0
                    const newAbsY = prevAbsY + dy
                    if (sceneEl?.translation) sceneEl.translation.y = newAbsY
                    if (coreObj?.translation) coreObj.translation.y += dy

                    if (sceneEl?.elementData) {
                        sceneEl.elementData.height = newH
                        sceneEl.elementData.y = newAbsY
                    }
                    child.height = newH
                    if (typeof child.y === 'number') child.y += dy
                    else child.y = (child.relativeY ?? 0) + dy
                    if (typeof child.relativeY === 'number')
                        child.relativeY += dy
                    bulkObj.height = Math.round(newH)
                    Object.assign(
                        bulkObj,
                        setGeometry(
                            { metadata: updatedMeta },
                            pointGeometry(
                                Math.round(
                                    sceneEl?.translation?.x ?? storeRow?.x ?? 0
                                ),
                                Math.round(newAbsY)
                            )
                        )
                    )
                }
                if (bulkObj.metadata) {
                    if (sceneEl?.elementData)
                        sceneEl.elementData.metadata = bulkObj.metadata
                    child.metadata = bulkObj.metadata
                }
                recordChild(id, bulkObj)
                return
            }
        })

        if (batchEntries.length > 0) {
            recordBatchToHistoryLog?.(batchEntries)
        }

        twoJSInstance?.update()
    }
}
