import type { Components_Component_Set_Input } from '../schema/generated'

export type ComponentColumn = keyof Components_Component_Set_Input

const COMPONENT_COLUMNS: Record<ComponentColumn, true> = {
    baseId: true,
    baseName: true,
    children: true,
    componentType: true,
    createdAt: true,
    createdBy: true,
    fill: true,
    fillType: true,
    height: true,
    id: true,
    legendPresetId: true,
    linewidth: true,
    metadata: true,
    opacity: true,
    position: true,
    stroke: true,
    strokeType: true,
    textColor: true,
    updatedBy: true,
    width: true,
    x: true,
    x1: true,
    x2: true,
    y: true,
    y1: true,
    y2: true,
    zoomResistant: true,
}

export const COMPONENT_COLUMN_NAMES: readonly string[] =
    Object.keys(COMPONENT_COLUMNS)

export function toComponentColumns(
    source: Record<string, unknown> | null | undefined
): Components_Component_Set_Input {
    const out: Record<string, unknown> = {}
    if (!source) return out
    Object.keys(source).forEach((key) => {
        if (!(key in COMPONENT_COLUMNS)) return
        const value = source[key]
        if (value === undefined) return
        out[key] = value
    })
    return out as Components_Component_Set_Input
}
