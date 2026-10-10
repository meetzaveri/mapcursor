import { isLegendPresetType } from '../types/legend'
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
