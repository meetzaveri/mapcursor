import { LEGEND_TYPE_LABELS, isLegendPresetType } from '../types/legend'
import type { LegendPresetType } from '../types/legend'
import { readArmedPreset } from './armedLegendPreset'

export interface LegendPresetTarget {
    elementType: LegendPresetType
    boundId: string | null
    /** True when there is no element yet — a pick arms instead of applying. */
    isArmed: boolean
}

/**
 * What a legend pick is currently about: a mark already on the canvas, or a
 * tool armed to draw one.
 *
 * A selection outranks an armed tool — if something is selected, the pick is
 * about that. The armed-tool branch falls back to `currentElement` exactly as
 * `resolveSetKey` already does for a pre-armed draw tool, rather than inventing
 * a second idea of what the toolbar is currently about.
 *
 * Shared by the secondary drawer (`presetChips.tsx`) and the legend list
 * (`legendPanel.tsx`), so both agree on what "the selection" can take.
 */
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

/** The selection branch alone — null unless a preset-able mark is selected. */
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

// Labels for selectable types that are not legend preset types, so a mismatch
// message can still name what is selected.
const OTHER_TYPE_LABELS: Record<string, string> = {
    text: 'Text',
    image: 'Image',
    pencil: 'Pencil',
}

/**
 * The selected mark's type and its display label, whatever the type. Null when
 * nothing (or a group) is selected. Used to explain why a preset of another
 * type cannot be applied.
 */
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
