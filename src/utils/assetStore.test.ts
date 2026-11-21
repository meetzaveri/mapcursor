import { describe, it, expect, vi, afterEach } from 'vitest'
import { assetIdForBytes, fallbackAssetHash } from './assetStore'
import { isImageAssetRef } from '../types/asset'

const bytes = (...values: number[]): ArrayBuffer =>
    new Uint8Array(values).buffer

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('assetIdForBytes', () => {
    it('is the SHA-256 hex of the bytes', async () => {
        expect(await assetIdForBytes(bytes(0x61, 0x62, 0x63))).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
        )
    })

    it('gives identical bytes the same id, so they share one entry', async () => {
        const a = await assetIdForBytes(bytes(1, 2, 3))
        const b = await assetIdForBytes(bytes(1, 2, 3))
        const c = await assetIdForBytes(bytes(1, 2, 4))
        expect(a).toBe(b)
        expect(a).not.toBe(c)
    })

    it('falls back to FNV when SubtleCrypto is missing', async () => {
        vi.stubGlobal('crypto', {})
        const id = await assetIdForBytes(bytes(1, 2, 3))
        expect(id).toBe(fallbackAssetHash(new Uint8Array([1, 2, 3])))
        expect(id.startsWith('fnv-')).toBe(true)
    })
})

describe('fallbackAssetHash', () => {
    it('separates inputs that differ only in length', () => {
        expect(fallbackAssetHash(new Uint8Array([0]))).not.toBe(
            fallbackAssetHash(new Uint8Array([0, 0]))
        )
    })
})

describe('isImageAssetRef', () => {
    const valid = {
        assetId: 'abc',
        url: null,
        mimeType: 'image/png',
        naturalWidth: 1,
        naturalHeight: 1,
    }

    it('accepts a local ref and a hosted ref', () => {
        expect(isImageAssetRef(valid)).toBe(true)
        expect(isImageAssetRef({ ...valid, url: 'https://x/y.png' })).toBe(true)
    })

    it('rejects anything missing an asset id', () => {
        expect(isImageAssetRef({ ...valid, assetId: '' })).toBe(false)
        expect(isImageAssetRef({ ...valid, assetId: undefined })).toBe(false)
        expect(isImageAssetRef(null)).toBe(false)
        expect(isImageAssetRef('abc')).toBe(false)
    })
})
