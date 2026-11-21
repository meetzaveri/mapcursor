import { LEGEND_TYPE_LABELS, isLegendPresetType } from '../types/legend'
import type { LegendPresetType } from '../types/legend'
import { readArmedPreset } from './armedLegendPreset'

export interface LegendPresetTarget {
    elementType: LegendPresetType
    boundId: string | null
    isArmed: boolean
}

export function readLegendPresetTarget(
    selectedComponent: unknown,
    currentElement: string | null
): LegendPresetTarget | null {
    const selected = readSelectedPresetTarget(selectedComponent)
    if (selected) return selected
    if (isLegendPresetType(currentElement)) {
        return {
            elementType: currentElement,
            boundId: readArmedPreset(currentElement)?.id ?? null,
            isArmed: true,
        }
    }
    return null
}

export function readSelectedPresetTarget(
    selectedComponent: unknown
): LegendPresetTarget | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementData = (selectedComponent as any)?.group?.data?.elementData
    const componentType = elementData?.componentType
    if (!isLegendPresetType(componentType)) return null
    return {
        elementType: componentType,
        boundId: elementData?.legendPresetId ?? null,
        isArmed: false,
    }
}

const OTHER_TYPE_LABELS: Record<string, string> = {
    text: 'Text',
    image: 'Image',
    pencil: 'Pencil',
}

export function readSelectedTypeLabel(
    selectedComponent: unknown
): { componentType: string; label: string } | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const componentType = (selectedComponent as any)?.group?.data?.elementData
        ?.componentType
    if (typeof componentType !== 'string' || componentType === '') return null
    const label = isLegendPresetType(componentType)
        ? LEGEND_TYPE_LABELS[componentType]
        : (OTHER_TYPE_LABELS[componentType] ?? componentType)
    return { componentType, label }
}
