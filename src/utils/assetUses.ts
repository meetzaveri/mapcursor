import { IMAGE_COMPONENT, META_PROPERTIES_KEY_PREFIX } from '../constants/misc'
import { readProperties } from './geometry'
import { pruneImageAssets } from './assetStore'
import { normalizeMetaSet } from './metaPropertyStore'
import { isImageAssetRef } from '../types/asset'
import type { ComponentStore } from '../types/base'
import type { MetaPropertySet } from '../types/metaProperty'

export type AssetOwner =
    | { kind: 'image-component'; componentId: string }
    | {
          kind: 'meta-value'
          valueId: string
          propertyId: string
          objectId: string
      }

export interface AssetUse {
    assetId: string
    owner: AssetOwner
    baseId: string | null
}

export interface AssetUseSource {
    name: string
    collect: () => AssetUse[] | null
}

export function imageComponentSource(store: ComponentStore): AssetUseSource {
    return {
        name: 'image-component',
        collect: (): AssetUse[] => {
            const uses: AssetUse[] = []
            Object.values(store).forEach((record) => {
                if (record?.componentType !== IMAGE_COMPONENT) return
                const ref = readProperties(record).image
                if (!isImageAssetRef(ref)) return
                uses.push({
                    assetId: ref.assetId,
                    owner: { kind: 'image-component', componentId: record.id },
                    baseId: record.baseId ?? null,
                })
            })
            return uses
        },
    }
}

function imageValueUses(
    set: MetaPropertySet,
    baseId: string | null
): AssetUse[] {
    const imageProperties = new Set(
        set.properties.filter((p) => p.type === 'image').map((p) => p.id)
    )
    const uses: AssetUse[] = []
    set.values.forEach((value) => {
        if (!imageProperties.has(value.propertyId)) return
        if (!isImageAssetRef(value.value)) return
        uses.push({
            assetId: value.value.assetId,
            owner: {
                kind: 'meta-value',
                valueId: value.id,
                propertyId: value.propertyId,
                objectId: value.objectId,
            },
            baseId: value.baseId ?? baseId,
        })
    })
    return uses
}

export function metaSetSource(set: MetaPropertySet): AssetUseSource {
    return {
        name: 'meta-value',
        collect: (): AssetUse[] => imageValueUses(set, null),
    }
}

export function metaSidecarSource(): AssetUseSource {
    return {
        name: 'meta-value',
        collect: (): AssetUse[] | null => {
            const uses: AssetUse[] = []
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (!key?.startsWith(META_PROPERTIES_KEY_PREFIX)) continue
                let parsed: unknown
                try {
                    parsed = JSON.parse(localStorage.getItem(key) ?? 'null')
                } catch {
                    return null
                }
                const baseId = key.slice(META_PROPERTIES_KEY_PREFIX.length)
                uses.push(...imageValueUses(normalizeMetaSet(parsed), baseId))
            }
            return uses
        },
    }
}

export function localAssetSources(store: ComponentStore): AssetUseSource[] {
    return [imageComponentSource(store), metaSidecarSource()]
}

export function collectAssetUses(
    sources: readonly AssetUseSource[]
): AssetUse[] | null {
    const all: AssetUse[] = []
    for (const source of sources) {
        let uses: AssetUse[] | null
        try {
            uses = source.collect()
        } catch {
            uses = null
        }
        if (uses === null) {
            console.warn(
                `[assetUses] source "${source.name}" unreadable; skipping cleanup`
            )
            return null
        }
        all.push(...uses)
    }
    return all
}

export function usedAssetIds(uses: readonly AssetUse[]): Set<string> {
    return new Set(uses.map((use) => use.assetId))
}

export async function pruneUnusedAssets(
    sources: readonly AssetUseSource[]
): Promise<void> {
    const uses = collectAssetUses(sources)
    if (uses === null) return
    await pruneImageAssets(usedAssetIds(uses))
}
