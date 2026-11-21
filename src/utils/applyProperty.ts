import { strokeTypeToDashes, clearDashesOnTwoJSShape } from './misc'
import { getShapeTextNodes } from './canvasUtils'
import { getPointCircle, getPointLabelNode } from '../factory/point'
import { POINT_LABEL_SIZES } from '../constants/misc'
import { capCenterOffset } from '../utils/fontMetrics'
import { readProperties, setProperties } from './geometry'
import { lineHeightFor } from './textLayout'
import { rescaleTextSizeForResist } from './textResistToggle'
import { applyStrokeDashes } from './strokeDashes'
import { areaFillFor, areaFillTypeToDb } from './areaFill'
import { LEGEND_STYLE_KEYS } from '../types/legend'
import {
    TEXT_RESIST_CHANGED_EVENT,
    TEXT_SELECTOR_REFRESH_EVENT,
} from '../constants/misc'
import {
    circleLabelScale,
    computeCounterScale,
    isStrokeScaled,
    resolveResist,
} from './counterScale'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
    getCircleLabelNodes,
} from '../factory/circleLabel'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectedComponentLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentRow = Record<string, any>

type PropertyKey =
    | 'fill'
    | 'stroke'
    | 'linewidth'
    | 'strokeType'
    | 'fillType'
    | 'opacity'
    | 'textColor'
    | 'textSize'
    | 'textFontFamily'
    | 'zoomResistant'

export interface ApplyPropertyDeps {
    selectedComponent: SelectedComponentLike | null
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRow>
    ) => void
    updateBulkPropsForRectangleWithText?: (
        id: string,
        bulkObj: Partial<ComponentRow>
    ) => void
    handleTextSizeChange?: (value: unknown) => void
    handleRectangleTextSizeChange?: (value: unknown) => void
    handleTextFontFamilyChange?: (value: unknown) => void
    handleRectangleTextFontFamilyChange?: (value: unknown) => void
    setDefaultFill: (value: string) => void
    setDefaultStrokeColor: (value: string) => void
    setDefaultLinewidth: (value: number) => void
    setDefaultStrokeType: (value: string | null) => void
    setDefaultFillType: (value: string | null) => void
    setDefaultOpacity: (value: number) => void
    setDefaultTextColor: (value: string) => void
    setDefaultTextSize: (value: string) => void
    setDefaultTextFontFamily: (value: string) => void
}

export function createApplyProperty(deps: ApplyPropertyDeps) {
    return function applyProperty(
        propertyKey: PropertyKey | string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        opts?: { preview?: boolean }
    ): void {
        const {
            selectedComponent,
            twoJSInstance,
            updateComponentBulkPropertiesInLocalStore: bulkWriteRaw,
            updateBulkPropsForRectangleWithText,
            handleTextSizeChange,
            handleRectangleTextSizeChange,
            handleTextFontFamilyChange,
            handleRectangleTextFontFamilyChange,
            setDefaultFill,
            setDefaultStrokeColor,
            setDefaultLinewidth,
            setDefaultStrokeType,
            setDefaultFillType,
            setDefaultTextColor,
            setDefaultTextSize,
            setDefaultTextFontFamily,
        } = deps

        const selectedElementData = selectedComponent?.group?.data?.elementData
        const isCircle = selectedElementData?.componentType === 'circle'

        const unbinds =
            !opts?.preview &&
            !!selectedElementData?.legendPresetId &&
            LEGEND_STYLE_KEYS.has(propertyKey)
        const updateComponentBulkPropertiesInLocalStore = (
            id: string,
            bulkObj: Partial<ComponentRow>
        ): void => {
            if (unbinds && selectedElementData) {
                selectedElementData.legendPresetId = null
            }
            bulkWriteRaw(
                id,
                unbinds ? { ...bulkObj, legendPresetId: null } : bulkObj
            )
        }

        if (!opts?.preview) {
            if (propertyKey === 'fill') {
                if (!isCircle) setDefaultFill(value)
            } else if (propertyKey === 'stroke') setDefaultStrokeColor(value)
            else if (propertyKey === 'linewidth') setDefaultLinewidth(value)
            else if (propertyKey === 'strokeType')
                setDefaultStrokeType(value === 'solid' ? null : value)
            else if (propertyKey === 'fillType')
                setDefaultFillType(areaFillTypeToDb(value))
            else if (propertyKey === 'textColor') setDefaultTextColor(value)
            else if (propertyKey === 'textSize') setDefaultTextSize(value)
            else if (propertyKey === 'textFontFamily')
                setDefaultTextFontFamily(value)
        }

        if (!selectedComponent) return

        const id = selectedComponent?.group?.data?.elementData?.id
        if (!id) return

        if (propertyKey === 'zoomResistant') {
            const textGroup = selectedComponent?.group?.data
            const elementData = textGroup?.elementData
            if (!elementData || elementData.componentType !== 'text') return

            const fromResist = resolveResist(elementData)
            const toResist = resolveResist({
                ...elementData,
                zoomResistant: value,
            })
            const nodes = getShapeTextNodes(textGroup)
            const currentSize =
                (nodes[0]?.size as number | undefined) ||
                (readProperties(elementData).fontSize as number | undefined) ||
                36
            const nextSize = rescaleTextSizeForResist(
                currentSize,
                twoJSInstance?.scene?.scale || 1,
                fromResist,
                toResist
            )

            const lineH = lineHeightFor(nextSize)
            nodes.forEach((node, i) => {
                node.size = nextSize
                node.leading = nextSize
                node.translation.set(0, (i - (nodes.length - 1) / 2) * lineH)
            })
            const patch = setProperties(elementData, { fontSize: nextSize })
            if (patch.metadata) elementData.metadata = patch.metadata
            elementData.zoomResistant = value

            updateComponentBulkPropertiesInLocalStore(id, {
                ...patch,
                zoomResistant: value,
            })
            window.dispatchEvent(
                new CustomEvent(TEXT_RESIST_CHANGED_EVENT, {
                    detail: { id, resist: toResist },
                })
            )
            window.dispatchEvent(
                new CustomEvent(TEXT_SELECTOR_REFRESH_EVENT, {
                    detail: { id },
                })
            )
            twoJSInstance?.update()
            return
        }

        const pointGroup = selectedComponent?.group?.data
        if (
            pointGroup?.elementData?.componentType === 'point' &&
            (propertyKey === 'fill' || propertyKey === 'stroke')
        ) {
            const elementData = pointGroup.elementData
            const circle = getPointCircle(pointGroup)
            if (circle) circle.fill = value
            if (!opts?.preview) {
                const patch = setProperties(elementData, {
                    category: undefined,
                })
                if (patch.metadata) elementData.metadata = patch.metadata
                elementData.fill = value
                elementData.stroke = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    fill: value,
                    stroke: value,
                    ...patch,
                })
            }
            twoJSInstance?.update()
            return
        }

        if (
            pointGroup?.elementData?.componentType === 'point' &&
            (propertyKey === 'textFontFamily' || propertyKey === 'textSize')
        ) {
            const elementData = pointGroup.elementData
            const labelNode = getPointLabelNode(pointGroup)
            const size =
                propertyKey === 'textSize'
                    ? POINT_LABEL_SIZES.find((s) => s.label === value)?.value
                    : undefined
            if (propertyKey === 'textSize' && !size) return
            if (labelNode) {
                if (propertyKey === 'textSize') labelNode.size = size
                else labelNode.family = value
                labelNode.translation.y = capCenterOffset(
                    labelNode.family,
                    labelNode.size
                )
            }
            if (!opts?.preview) {
                const patch = setProperties(
                    elementData,
                    propertyKey === 'textSize'
                        ? { textFontSize: size }
                        : { textFontFamily: value }
                )
                if (patch.metadata) elementData.metadata = patch.metadata
                updateComponentBulkPropertiesInLocalStore(id, patch)
            }
            twoJSInstance?.update()
            return
        }

        const circleGroup = selectedComponent?.group?.data

        if (
            circleGroup?.elementData?.componentType === 'circle' &&
            propertyKey === 'textColor'
        ) {
            const elementData = circleGroup.elementData
            getCircleLabelNodes(circleGroup).forEach((n) => (n.fill = value))
            elementData.textColor = value
            if (!opts?.preview) {
                updateComponentBulkPropertiesInLocalStore(id, {
                    textColor: value,
                })
            }
            twoJSInstance?.update()
            return
        }

        if (
            circleGroup?.elementData?.componentType === 'circle' &&
            (propertyKey === 'textFontFamily' || propertyKey === 'textSize')
        ) {
            const elementData = circleGroup.elementData
            const size =
                propertyKey === 'textSize'
                    ? POINT_LABEL_SIZES.find((s) => s.label === value)?.value
                    : undefined
            if (propertyKey === 'textSize' && !size) return

            const patch = setProperties(
                elementData,
                propertyKey === 'textSize'
                    ? { textFontSize: size }
                    : { textFontFamily: value }
            )
            const metadata = patch.metadata
            if (!opts?.preview) {
                if (metadata) elementData.metadata = metadata
                updateComponentBulkPropertiesInLocalStore(id, patch)
            }
            const rebuilt = buildCircleLabel(twoJSInstance, circleGroup, {
                text: circleLabelOf({ metadata }),
                fontFamily: circleLabelFontFamilyOf({ metadata }),
                fontSize: circleLabelFontSizeOf({ metadata }),
                color: circleLabelColorOf(elementData),
                width: elementData.width ?? 100,
            })
            if (rebuilt) {
                rebuilt.scale = circleLabelScale(
                    elementData,
                    twoJSInstance?.scene?.scale ?? 1
                )
            }
            twoJSInstance?.update()
            return
        }

        const shapeType = selectedComponent?.shape?.type
        const elementType =
            selectedComponent?.group?.data?.elementData?.componentType
        const isShapeWithText =
            typeof selectedComponent?.text?.data?.value === 'string' &&
            (shapeType === 'rectangle' ||
                elementType === 'rectangle' ||
                elementType === 'diamond')

        if (propertyKey === 'textSize') {
            if (isShapeWithText) handleRectangleTextSizeChange?.(value)
            else handleTextSizeChange?.(value)
            return
        }
        if (propertyKey === 'textFontFamily') {
            if (isShapeWithText) handleRectangleTextFontFamilyChange?.(value)
            else handleTextFontFamilyChange?.(value)
            return
        }
        if (propertyKey === 'textColor') {
            if (isShapeWithText) {
                getShapeTextNodes(selectedComponent?.group?.data).forEach(
                    (n) => (n.fill = value)
                )
                updateBulkPropsForRectangleWithText?.(id, { textColor: value })
            } else {
                const textNodes = getShapeTextNodes(
                    selectedComponent?.group?.data
                )
                if (textNodes.length > 0) {
                    textNodes.forEach((n) => (n.fill = value))
                } else if (selectedComponent?.shape?.data) {
                    selectedComponent.shape.data.fill = value
                }
                if (selectedComponent?.group?.data?.elementData) {
                    selectedComponent.group.data.elementData.textColor = value
                }
                updateComponentBulkPropertiesInLocalStore(id, {
                    textColor: value,
                })
            }
            twoJSInstance?.update()
            return
        }

        const shapeData = selectedComponent?.shape?.data
        const elementData = selectedComponent?.group?.data?.elementData

        if (propertyKey === 'fill') {
            if (shapeData) shapeData.fill = value
            if (elementData) elementData.fill = value
            if (isCircle) {
                if (shapeData) shapeData.stroke = value
                if (elementData) elementData.stroke = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    fill: value,
                    stroke: value,
                })
            } else {
                updateComponentBulkPropertiesInLocalStore(id, { fill: value })
            }
        } else if (propertyKey === 'stroke') {
            if (shapeData) shapeData.stroke = value
            if (elementData) elementData.stroke = value
            if (elementType === 'area' && shapeData) {
                shapeData.fill = areaFillFor(
                    twoJSInstance,
                    value,
                    elementData?.fillType,
                    elementData
                )
            }
            updateComponentBulkPropertiesInLocalStore(id, { stroke: value })
        } else if (propertyKey === 'linewidth') {
            if (shapeData) {
                shapeData.linewidth = isStrokeScaled(elementData)
                    ? value *
                      computeCounterScale(
                          twoJSInstance?.scene?.scale ?? 1,
                          resolveResist(elementData)
                      )
                    : value
                if (isStrokeScaled(elementData)) {
                    applyStrokeDashes(
                        shapeData,
                        elementData?.strokeType,
                        twoJSInstance?.scene?.scale ?? 1
                    )
                }
            }
            if (elementData) elementData.linewidth = value
            updateComponentBulkPropertiesInLocalStore(id, { linewidth: value })
        } else if (propertyKey === 'strokeType') {
            const dbValue = value === 'solid' ? 'solid' : value
            if (shapeData) {
                if (isStrokeScaled(elementData)) {
                    applyStrokeDashes(
                        shapeData,
                        value,
                        twoJSInstance?.scene?.scale ?? 1
                    )
                } else {
                    shapeData.dashes = strokeTypeToDashes(value)
                    if (value === 'solid') clearDashesOnTwoJSShape(shapeData)
                }
            }
            if (elementData) elementData.strokeType = dbValue
            updateComponentBulkPropertiesInLocalStore(id, {
                strokeType: dbValue,
            })
        } else if (propertyKey === 'fillType') {
            if (elementType !== 'area') return
            const dbValue = areaFillTypeToDb(value)
            if (shapeData) {
                shapeData.fill = areaFillFor(
                    twoJSInstance,
                    elementData?.stroke ?? shapeData.stroke,
                    dbValue,
                    elementData
                )
            }
            if (elementData) elementData.fillType = dbValue
            updateComponentBulkPropertiesInLocalStore(id, { fillType: dbValue })
        } else if (propertyKey === 'opacity') {
            const groupObj = selectedComponent?.group?.data
            if (elementType === 'area') {
                if (groupObj) groupObj.opacity = 1
                if (shapeData) {
                    shapeData.opacity = 1
                    shapeData.fill = areaFillFor(
                        twoJSInstance,
                        elementData?.stroke ?? shapeData.stroke,
                        elementData?.fillType,
                        { ...elementData, opacity: value }
                    )
                }
            } else if (isCircle) {
                if (groupObj) groupObj.opacity = 1
                if (shapeData) shapeData.opacity = value
            } else if (groupObj) groupObj.opacity = value
            if (shapeData && !isCircle && elementType !== 'area') {
                shapeData.opacity = 1
            }
            getShapeTextNodes(selectedComponent?.group?.data).forEach(
                (n) => (n.opacity = 1)
            )
            if (!opts?.preview) {
                if (elementData) elementData.opacity = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    opacity: value,
                })
            }
        }

        twoJSInstance?.update()
    }
}
