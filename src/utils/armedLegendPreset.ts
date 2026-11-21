import { ARMED_LEGEND_PRESETS_KEY } from '../constants/misc'
import { presetStylePatch } from '../types/legend'
import type { LegendPreset, LegendPresetType } from '../types/legend'

export type ArmedPresetMap = Partial<Record<LegendPresetType, LegendPreset>>

export function readArmedPresets(): ArmedPresetMap {
    try {
        const raw = localStorage.getItem(ARMED_LEGEND_PRESETS_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return {}
        return parsed as ArmedPresetMap
    } catch (_) {
        return {}
    }
}

export function writeArmedPresets(next: ArmedPresetMap): void {
    try {
        localStorage.setItem(ARMED_LEGEND_PRESETS_KEY, JSON.stringify(next))
    } catch (_) {}
}

export function readArmedPreset(type: LegendPresetType): LegendPreset | null {
    return readArmedPresets()[type] ?? null
}

export function setArmedPreset(
    type: LegendPresetType,
    preset: LegendPreset | null
): void {
    const next = { ...readArmedPresets() }
    if (preset) next[type] = preset
    else delete next[type]
    writeArmedPresets(next)
}

export function armedPresetPatch(
    type: LegendPresetType
): Record<string, unknown> {
    const preset = readArmedPreset(type)
    if (!preset) return {}
    return { ...presetStylePatch(preset), legendPresetId: preset.id }
}
