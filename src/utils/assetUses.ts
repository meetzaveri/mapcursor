// Who uses each stored image. The only module that knows images have more
// than one kind of owner.
//
// The asset store (utils/assetStore.ts) holds bytes keyed by content hash and
// records nothing about owners. Ownership is derived here, by scanning every
// place an `ImageAssetRef` can live. Each such place is one AssetUseSource;
// anything that needs to know "is this blob still used, and by what" (draft-load
// cleanup, JSON export, and later the share-time upload) goes through
// `collectAssetUses`, so adding an owner kind is adding one source.
//
// THE RULE that makes cleanup safe: if any source cannot be read, nobody knows
// what is in use, so nothing is deleted. A source signals that by returning
// null. Skipping a source instead would delete every image it owns.

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
    /** For logs only. */
    name: string
    /** Every use this source knows of, or null when it could not be read. */
    collect: () => AssetUse[] | null
}

/**
 * Image elements in a component store. Built from the store the caller has
 * already parsed (the draft load has it in hand) rather than re-reading
 * localStorage. The ref lives at `metadata.properties.image`, read through
 * geometry.ts, which is the only module that may take metadata apart.
 */
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

/** Uses of image values in one meta set (an `image` property's values). */
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

/**
 * Image values in ONE in-memory meta set. For JSON export, which must include
 * exactly the exported canvas's photos, never another canvas's.
 */
export function metaSetSource(set: MetaPropertySet): AssetUseSource {
    return {
        name: 'meta-value',
        collect: (): AssetUse[] => imageValueUses(set, null),
    }
}

/**
 * Image values in EVERY local meta sidecar (`mapcursor_meta_*`), not only the
 * current base's: the local base id rotates on share and import, and the
 * older sidecar's photos must survive until that sidecar itself is gone.
 * Returns null (so cleanup deletes nothing) if any sidecar is unreadable.
 */
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

/**
 * Every source that can own a local image, for a local base whose component
 * store is `store`. THE list for cleanup: callers use this rather than
 * assembling their own, so a new owner kind is added here once.
 */
export function localAssetSources(store: ComponentStore): AssetUseSource[] {
    return [imageComponentSource(store), metaSidecarSource()]
}

/**
 * Every use across all sources, or null when any source could not be read.
 * A source that throws counts as unreadable.
 */
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

/** The distinct asset ids in a list of uses. */
export function usedAssetIds(uses: readonly AssetUse[]): Set<string> {
    return new Set(uses.map((use) => use.assetId))
}

/**
 * Delete stored images no source references. Pass `localAssetSources(...)`,
 * not a hand-picked list: a missing source looks exactly like "owns nothing",
 * and its images get deleted. Run on draft load only, never on delete (undo
 * must be able to restore).
 */
export async function pruneUnusedAssets(
    sources: readonly AssetUseSource[]
): Promise<void> {
    const uses = collectAssetUses(sources)
    if (uses === null) return
    await pruneImageAssets(usedAssetIds(uses))
}
