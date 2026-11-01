import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    collectAssetUses,
    imageComponentSource,
    localAssetSources,
    metaSetSource,
    metaSidecarSource,
    usedAssetIds,
} from './assetUses'
import { metaSidecarKey } from './metaPropertyStore'
import type { MetaPropertySet } from '../types/metaProperty'
import type { AssetUse, AssetUseSource } from './assetUses'
import type { ComponentRecord, ComponentStore } from '../types/base'
import type { ImageAssetRef } from '../types/asset'

const ref = (assetId: string): ImageAssetRef => ({
    assetId,
    url: null,
    mimeType: 'image/png',
    naturalWidth: 10,
    naturalHeight: 10,
})

const record = (
    id: string,
    componentType: string,
    properties: Record<string, unknown> = {}
): ComponentRecord =>
    ({
        id,
        componentType,
        baseId: 'base-1',
        metadata: {
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties,
        },
    }) as ComponentRecord

const fixedSource = (name: string, uses: AssetUse[] | null): AssetUseSource => ({
    name,
    collect: () => uses,
})

describe('imageComponentSource', () => {
    it('finds the ref on image elements only', () => {
        const store: ComponentStore = {
            a: record('a', 'image', { image: ref('hash-a') }),
            // A point carrying an `image` key is NOT an image element; its
            // photos are meta values, owned by a different source.
            b: record('b', 'point', { image: ref('hash-b') }),
            c: record('c', 'image', { image: { assetId: 42 } }), // malformed
        }
        const uses = imageComponentSource(store).collect()
        expect(uses).toEqual([
            {
                assetId: 'hash-a',
                owner: { kind: 'image-component', componentId: 'a' },
                baseId: 'base-1',
            },
        ])
    })
})

describe('collectAssetUses', () => {
    const imageUse: AssetUse = {
        assetId: 'shared',
        owner: { kind: 'image-component', componentId: 'img' },
        baseId: 'b',
    }
    const metaUse: AssetUse = {
        assetId: 'shared',
        owner: {
            kind: 'meta-value',
            valueId: 'v',
            propertyId: 'p',
            objectId: 'pt',
        },
        baseId: 'b',
    }

    it('unions every source, keeping one use per owner', () => {
        const uses = collectAssetUses([
            fixedSource('images', [imageUse]),
            fixedSource('meta', [metaUse]),
        ])
        expect(uses).toHaveLength(2)
        // The same photo used by both kinds of owner is one stored asset.
        expect(usedAssetIds(uses ?? [])).toEqual(new Set(['shared']))
    })

    // The rule that keeps cleanup safe: a source we could not read must stop
    // cleanup, not count as "owns nothing", or its images get deleted.
    it('returns null when any source is unreadable', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        expect(
            collectAssetUses([
                fixedSource('images', [imageUse]),
                fixedSource('meta', null),
            ])
        ).toBeNull()
        expect(
            collectAssetUses([
                fixedSource('images', [imageUse]),
                {
                    name: 'throws',
                    collect: () => {
                        throw new Error('corrupt sidecar')
                    },
                },
            ])
        ).toBeNull()
        warn.mockRestore()
    })
})

const metaSet = (assetId: string): MetaPropertySet => ({
    properties: [
        { id: 'photo', baseId: null, name: 'Photo', type: 'image', position: 0, createdBy: null },
        { id: 'notes', baseId: null, name: 'Notes', type: 'text', position: 1, createdBy: null },
    ],
    values: [
        { id: 'v1', baseId: null, propertyId: 'photo', objectId: 'pt', objectType: 'point', value: ref(assetId), createdBy: null },
        { id: 'v2', baseId: null, propertyId: 'notes', objectId: 'pt', objectType: 'point', value: 'hi', createdBy: null },
    ],
})

describe('localAssetSources', () => {
    // The guard against the bug the plan called out: without the meta-value
    // source, cleanup on reload deleted every photo attached to a point.
    it('includes both owner kinds', () => {
        const names = localAssetSources({}).map((s) => s.name)
        expect(names).toEqual(['image-component', 'meta-value'])
    })
})

describe('meta value sources', () => {
    beforeEach(() => localStorage.clear())

    it('metaSetSource: only values of image properties', () => {
        const uses = metaSetSource(metaSet('in-memory')).collect()
        expect(uses?.map((u) => [u.assetId, u.owner.kind])).toEqual([
            ['in-memory', 'meta-value'],
        ])
    })

    it('metaSidecarSource: every sidecar on the device, not just one base', () => {
        localStorage.setItem(metaSidecarKey('base-now'), JSON.stringify(metaSet('a')))
        localStorage.setItem(metaSidecarKey('base-before-share'), JSON.stringify(metaSet('b')))
        localStorage.setItem('unrelated', '{not json')
        const uses = metaSidecarSource().collect()
        expect(usedAssetIds(uses ?? [])).toEqual(new Set(['a', 'b']))
    })

    it('an unreadable sidecar stops cleanup instead of losing its photos', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        localStorage.setItem(metaSidecarKey('ok'), JSON.stringify(metaSet('a')))
        localStorage.setItem(metaSidecarKey('corrupt'), '{not json')
        expect(collectAssetUses(localAssetSources({}))).toBeNull()
        warn.mockRestore()
    })
})
