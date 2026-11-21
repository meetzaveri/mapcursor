import { areaFillTypeToDb, areaOpacityOf } from '../utils/areaFill'

export type LegendPresetType = 'point' | 'area' | 'route' | 'circle'

export const LEGEND_PRESET_TYPES: readonly LegendPresetType[] = [
    'point',
    'area',
    'route',
    'circle',
]

export const LEGEND_TYPE_LABELS: Record<LegendPresetType, string> = {
    point: 'Point',
    area: 'Area',
    route: 'Route',
    circle: 'Radius Map',
}

export function isLegendPresetType(
    value: string | null | undefined
): value is LegendPresetType {
    return LEGEND_PRESET_TYPES.includes(value as LegendPresetType)
}

export type LegendStyleKey =
    'fill' | 'stroke' | 'linewidth' | 'strokeType' | 'fillType' | 'opacity'

export interface LegendPresetStyle {
    fill?: string
    stroke?: string
    linewidth?: number
    strokeType?: string | null
    fillType?: string | null
    opacity?: number | null
}

export const PRESET_STYLE_KEYS: Record<
    LegendPresetType,
    readonly LegendStyleKey[]
> = {
    point: ['fill'],
    area: ['stroke', 'linewidth', 'strokeType', 'fillType', 'opacity'],
    route: ['stroke', 'linewidth', 'strokeType'],
    circle: ['fill'],
}

export const LEGEND_STYLE_KEYS: ReadonlySet<string> = new Set<string>([
    'fill',
    'stroke',
    'linewidth',
    'strokeType',
    'fillType',
    'opacity',
])

export interface LegendPreset {
    id: string
    baseId: string | null
    name: string
    elementType: LegendPresetType
    style: LegendPresetStyle
    position: number
    createdBy?: string | null
}

export function presetStylePatch(
    preset: LegendPreset
): Record<string, unknown> {
    const keys = PRESET_STYLE_KEYS[preset.elementType]
    const patch: Record<string, unknown> = {}
    keys.forEach((key) => {
        const value = preset.style[key]
        if (key === 'fillType') {
            patch.fillType = areaFillTypeToDb(value)
            return
        }
        if (key === 'opacity') {
            patch.opacity = areaOpacityOf({ opacity: value })
            return
        }
        if (value === undefined) return
        patch[key] = value
    })
    if (patch.fill !== undefined) patch.stroke = patch.fill
    return patch
}
