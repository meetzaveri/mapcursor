import { strokeTypeToDashes, clearDashesOnTwoJSShape } from './misc'
import { areaFillFor } from './areaFill'
import { computeCounterScale, isStrokeScaled, resolveResist } from './counterScale'
import { applyStrokeDashes } from './strokeDashes'
import { presetStylePatch } from '../types/legend'
import type { LegendPreset } from '../types/legend'
import type { ComponentRecord } from '../types/base'
import { getPointCircle } from '../factory/point'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

function paintPresetKey(
    group: ShapeLike,
    two: TwoLike,
    name: string,
    value: unknown
): void {
    const elementData = group?.elementData
    const componentType = elementData?.componentType
    const shape =
        componentType === 'point'
            ? getPointCircle(group)
            : group?.children?.[0]
    if (!shape) return

    switch (name) {
        case 'fill':
            shape.fill = value
            if (elementData) elementData.fill = value
            break
        case 'stroke':
            shape.stroke = value
            if (elementData) elementData.stroke = value
            if (componentType === 'area') {
                shape.fill = areaFillFor(
                    two,
                    value as string,
                    elementData?.fillType,
                    elementData
                )
            }
            break
        case 'linewidth':
            shape.linewidth = isStrokeScaled(elementData)
                ? (value as number) *
                  computeCounterScale(
                      two?.scene?.scale ?? 1,
                      resolveResist(elementData)
                  )
                : (value as number)
            if (elementData) elementData.linewidth = value
            if (isStrokeScaled(elementData)) {
                applyStrokeDashes(
                    shape,
                    elementData?.strokeType,
                    two?.scene?.scale ?? 1
                )
            }
            break
        case 'strokeType':
            if (isStrokeScaled(elementData)) {
                applyStrokeDashes(
                    shape,
                    value as string | null,
                    two?.scene?.scale ?? 1
                )
            } else {
                shape.dashes = strokeTypeToDashes(value as string | null)
                if (!value || value === 'solid') clearDashesOnTwoJSShape(shape)
            }
            if (elementData) elementData.strokeType = value
            break
        case 'fillType':
            if (componentType === 'area') {
                shape.fill = areaFillFor(
                    two,
                    elementData?.stroke,
                    value,
                    elementData
                )
                if (elementData) elementData.fillType = value
            }
            break
        case 'opacity':
            if (componentType === 'area') {
                if (elementData) elementData.opacity = value
                group.opacity = 1
                shape.opacity = 1
                shape.fill = areaFillFor(
                    two,
                    elementData?.stroke,
                    elementData?.fillType,
                    elementData
                )
            }
            break
        default:
            break
    }
}

export interface ApplyPresetDeps {
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRecord>,
        skipHistory?: boolean
    ) => void
}

export function presetApplyPatch(
    preset: LegendPreset | null
): Partial<ComponentRecord> {
    if (!preset) return { legendPresetId: null }
    return {
        ...presetStylePatch(preset),
        legendPresetId: preset.id,
    } as Partial<ComponentRecord>
}

export function applyPresetToElement(
    deps: ApplyPresetDeps,
    id: string,
    preset: LegendPreset | null,
    skipHistory = false
): Partial<ComponentRecord> {
    const { twoJSInstance, updateComponentBulkPropertiesInLocalStore } = deps
    const patch = presetApplyPatch(preset)

    const group = twoJSInstance?.scene?.children?.find(
        (c: ShapeLike) => c?.elementData?.id === id
    )
    if (group) {
        Object.entries(patch).forEach(([name, value]) => {
            if (name === 'legendPresetId') {
                if (group.elementData) group.elementData.legendPresetId = value
                return
            }
            paintPresetKey(group, twoJSInstance, name, value)
        })
    }

    updateComponentBulkPropertiesInLocalStore(id, patch, skipHistory)
    twoJSInstance?.update()
    return patch
}

export function applyPresetToMany(
    deps: ApplyPresetDeps,
    ids: readonly string[],
    preset: LegendPreset | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshotOf: (id: string) => Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<Record<string, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: Array<Record<string, any>> = []
    ids.forEach((id) => {
        const prevProps = snapshotOf(id)
        const bulkObj = applyPresetToElement(deps, id, preset, true)
        entries.push({ action: 'UPDATE_BULK', id, prevProps, bulkObj })
    })
    return entries
}

export function idsBoundToPreset(
    store: Record<string, ComponentRecord>,
    presetId: string
): string[] {
    return Object.keys(store).filter(
        (id) => store[id]?.legendPresetId === presetId
    )
}
