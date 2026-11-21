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

export async function exportBaseAsJson(
    componentStore: ComponentStore,
    viewport: BaseViewport,
    base?: MapBackdropConfig,
    legendPresets: LegendPreset[] = [],
    metaProperties?: MetaPropertySet
): Promise<void> {
    const components = Object.fromEntries(
        Object.entries(componentStore).filter(
            ([, v]) => v?.componentType !== GROUP_COMPONENT
        )
    ) as ComponentStore

    const meta = metaProperties
        ? dropOrphanValues(metaProperties, new Set(Object.keys(components)))
        : null
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
        legendPresets,
        components,
        ...(meta &&
            meta.properties.length > 0 && { metaProperties: meta }),
        ...(Object.keys(assets).length > 0 && { assets }),
    }
    downloadJson(JSON.stringify(payload, null, 2))
}

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
