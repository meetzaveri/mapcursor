import type { ComponentStore } from '../types/base'
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
 * import — that's what keeps files interchangeable in both directions, so a
 * 1.0 file from an old build still opens here and a 1.1 file still opens in
 * that old build (it simply ignores the base fields). Don't add a version
 * check: it would be the compatibility break, not the fix.
 */
export function exportBaseAsJson(
    componentStore: ComponentStore,
    viewport: BaseViewport,
    base?: MapBackdropConfig
): void {
    // Same save-side filter as useLocalDraftPersistence.ts — drop transient
    // groups so they never leave the app.
    const components = Object.fromEntries(
        Object.entries(componentStore).filter(
            ([, v]) => v?.componentType !== GROUP_COMPONENT
        )
    ) as ComponentStore

    const payload = {
        formatVersion: '1.1',
        app: 'mapcursor',
        appVersion,
        exportedAt: Date.now(),
        viewport,
        mapAnchor: base?.mapAnchor ?? null,
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
