import { ARMED_LEGEND_PRESETS_KEY } from '../constants/misc'
import { presetStylePatch } from '../types/legend'
import type { LegendPreset, LegendPresetType } from '../types/legend'

// The preset ARMED on a tool — what the next mark drawn with it will wear.
//
// A preset picked from the tool drawer has nothing to apply to yet, so it
// waits here until something is drawn. Deliberately STICKY: neither drawing
// nor switching tools clears it, because captioning six clusters in a row
// should not mean picking the same preset six times. That is the stickiness
// element defaults already have, and it is never hidden — the drawer shows
// which preset is armed every time that tool is selected.
//
// Whole presets are stored, not ids, so a creation path needs nothing but this
// file to style a new mark. base.tsx re-syncs the map whenever the legend
// changes, so what is stored is always a preset that still exists.

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
    } catch (_) {
        // Losing the armed preset costs one re-pick, never the draw.
    }
}

export function readArmedPreset(type: LegendPresetType): LegendPreset | null {
    return readArmedPresets()[type] ?? null
}

/** Arm (or, with `null`, disarm) a preset for one tool. */
export function setArmedPreset(
    type: LegendPresetType,
    preset: LegendPreset | null
): void {
    const next = { ...readArmedPresets() }
    if (preset) next[type] = preset
    else delete next[type]
    writeArmedPresets(next)
}

/**
 * The columns a newly-drawn mark of this type should carry, or `{}` when
 * nothing is armed.
 *
 * Every creation path folds this in LAST, after the element defaults — a
 * preset's whole purpose is to override the styling, so it has to win. For
 * area and route that ordering is load-bearing: `finishGeoDraw` overwrites
 * stroke/linewidth/strokeType from the live defaults AFTER spreading the
 * staged props, so folding earlier would be silently discarded.
 */
export function armedPresetPatch(
    type: LegendPresetType
): Record<string, unknown> {
    const preset = readArmedPreset(type)
    if (!preset) return {}
    return { ...presetStylePatch(preset), legendPresetId: preset.id }
}
