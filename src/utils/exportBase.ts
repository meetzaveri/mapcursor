import type { ComponentStore } from '../types/base'
import type { LegendPreset } from '../types/legend'
import type { MapBackdropConfig } from '../baseTypes/types'
import { GROUP_COMPONENT } from '../constants/misc'
import { version as appVersion } from '../../package.json'

interface BaseViewport {
    scale: number
    tx: number
    ty: number
}

/**
 * Serialize the current base to a versioned, branded JSON envelope and
 * trigger a browser download. Reuses the same canonical `ComponentStore`
 * the localStorage draft persists, so round-trip fidelity is inherited.
 *
 * `formatVersion` is written but deliberately never read or validated on
 * import. 2.0 marks the geometry envelope — a 1.x file's records carry no
 * `metadata.geometry`, so `parseImportedBase` drops them by their own shape and
 * reports the count. Keep the version a MARKER, not a gate: a per-record check
 * fails softly and tells the user how many rows it skipped, where a version
 * check would reject a whole file that might be mostly importable.
 */
export function exportBaseAsJson(
    componentStore: ComponentStore,
    viewport: BaseViewport,
    base?: MapBackdropConfig,
    legendPresets: LegendPreset[] = []
): void {
    // Same save-side filter as useLocalDraftPersistence.ts — drop transient
    // groups so they never leave the app.
    const components = Object.fromEntries(
        Object.entries(componentStore).filter(
            ([, v]) => v?.componentType !== GROUP_COMPONENT
        )
    ) as ComponentStore

    const payload = {
        formatVersion: '2.0',
        app: 'mapcursor',
        appVersion,
        exportedAt: Date.now(),
        viewport,
        mapAnchor: base?.mapAnchor ?? null,
        // The legend travels with the canvas. Without it a file round-trips
        // every mark and loses the only record of what they mean — which is
        // the same as losing them, a few weeks later. Records keep their
        // `legendPresetId`, so a whole-file import restores the bindings
        // intact; a merge re-keys both sides together (see mergeImportedBase).
        legendPresets,
        components,
    }
    downloadJson(JSON.stringify(payload, null, 2))
}

/** Trigger a browser download of the JSON payload as a .json file. */
function downloadJson(json: string): void {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mapcursor-canvas-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
