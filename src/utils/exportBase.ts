import type { ComponentStore } from '../types/base'
import type { LegendPreset } from '../types/legend'
import type { MapBackdropConfig } from '../baseTypes/types'
import type { MetaPropertySet } from '../types/metaProperty'
import { dropOrphanValues } from './metaPropertyStore'
import { GROUP_COMPONENT } from '../constants/misc'
import { exportImageAssets } from './assetStore'
import {
    collectAssetUses,
    imageComponentSource,
    metaSetSource,
    usedAssetIds,
} from './assetUses'
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
 * check would reject a whole file that might be mostly importable. 2.1 adds
 * `assets`: image bytes live in IndexedDB, not in the records, so they are
 * inlined (assetId → data URL) to keep the file self-contained. 2.1 also adds
 * `metaProperties` ({ properties, values }); values whose object is not in the
 * file are left out.
 */
export async function exportBaseAsJson(
    componentStore: ComponentStore,
    viewport: BaseViewport,
    base?: MapBackdropConfig,
    legendPresets: LegendPreset[] = [],
    metaProperties?: MetaPropertySet
): Promise<void> {
    // Same save-side filter as useLocalDraftPersistence.ts — drop transient
    // groups so they never leave the app.
    const components = Object.fromEntries(
        Object.entries(componentStore).filter(
            ([, v]) => v?.componentType !== GROUP_COMPONENT
        )
    ) as ComponentStore

    const meta = metaProperties
        ? dropOrphanValues(metaProperties, new Set(Object.keys(components)))
        : null
    // The images THIS file references: its image elements and its meta
    // values. Not localAssetSources, which scans every sidecar on the device
    // and would put other canvases' photos into this file.
    const uses =
        collectAssetUses([
            imageComponentSource(components),
            ...(meta ? [metaSetSource(meta)] : []),
        ]) ?? []
    const assets = await exportImageAssets(usedAssetIds(uses))

    const payload = {
        formatVersion: '2.1',
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
        ...(meta &&
            meta.properties.length > 0 && { metaProperties: meta }),
        ...(Object.keys(assets).length > 0 && { assets }),
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
