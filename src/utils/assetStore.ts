// IndexedDB-backed blob store for local images. Ported from craftbase
// `imageAssetStore.ts`.
//
// Image bytes never ride a record: the localStorage draft has a ~3 MB budget
// (see baseSizeGuard.ts) and is re-serialized on every edit, so even one
// inline photo would blow it. A record carries an `ImageAssetRef` whose
// `assetId` is the hash of the bytes; the bytes live here. Content addressing
// makes repeat drops, pastes and reuse (the same photo as an image element and
// as a point's photo) share one entry.
//
// This module takes no position on WHO uses an asset. It has no idea image
// elements or meta values exist; utils/assetUses.ts decides what is still
// referenced and passes the answer to pruneImageAssets.

const DB_NAME = 'mapcursor-assets'
const DB_VERSION = 1
const STORE_NAME = 'images'

// Bytes are stored as an ArrayBuffer, not a Blob: Safari private windows
// reject Blob values in IndexedDB ("Error preparing Blob/File data to be
// stored in object store"), while ArrayBuffers clone fine everywhere.
interface StoredImageAsset {
    id: string
    bytes: ArrayBuffer
    type: string
    createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

// Object URLs are cached per asset so every mount of the same image (paste,
// undo-of-delete, a remount, the same photo on two owners) reuses one URL
// instead of leaking.
const objectUrlCache = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is unavailable'))
            return
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = (): void => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
        req.onsuccess = (): void => resolve(req.result)
        req.onerror = (): void => reject(req.error)
    })
    // A failed open must not poison every later call; retry next time.
    dbPromise.catch(() => {
        dbPromise = null
    })
    return dbPromise
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        req.onsuccess = (): void => resolve(req.result)
        req.onerror = (): void => reject(req.error)
    })
}

// Two independent 32-bit FNV-1a passes (different offset bases) plus the byte
// length. Only used where SubtleCrypto is missing; the id just has to dedupe
// identical bytes, not resist attack.
export function fallbackAssetHash(bytes: Uint8Array): string {
    let h1 = 0x811c9dc5
    let h2 = 0x01000193
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i] ?? 0
        h1 = Math.imul(h1 ^ b, 0x01000193)
        h2 = Math.imul(h2 ^ b, 0x01000193) ^ (h2 >>> 15)
    }
    const hex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0')
    return `fnv-${hex(h1)}${hex(h2)}-${bytes.length.toString(16)}`
}

/** The asset id for these bytes: SHA-256 hex, or the FNV fallback. */
export async function assetIdForBytes(buffer: ArrayBuffer): Promise<string> {
    // SubtleCrypto only exists on secure origins (https / localhost). Over
    // plain http on a LAN IP (mobile testing, see CLAUDE.md) it's undefined.
    if (!globalThis.crypto?.subtle) {
        return fallbackAssetHash(new Uint8Array(buffer))
    }
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

/** True when this browser can persist image assets (false in some private modes). */
export async function isImageAssetStoreAvailable(): Promise<boolean> {
    try {
        await openDb()
        return true
    } catch {
        return false
    }
}

/**
 * Store a blob and return its content-hash id. Throws when IndexedDB is
 * unavailable or full.
 */
export async function putImageAsset(blob: Blob): Promise<string> {
    const bytes = await blob.arrayBuffer()
    const id = await assetIdForBytes(bytes)
    const db = await openDb()
    const store = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
    // Same id means same bytes, so overwriting an existing entry is harmless.
    const record: StoredImageAsset = {
        id,
        bytes,
        type: blob.type,
        createdAt: Date.now(),
    }
    await requestToPromise(store.put(record))
    return id
}

/** Raw blob for an asset, or null when it's missing / the store is unavailable. */
export async function getImageAssetBlob(id: string): Promise<Blob | null> {
    try {
        const db = await openDb()
        const store = db
            .transaction(STORE_NAME, 'readonly')
            .objectStore(STORE_NAME)
        const record = (await requestToPromise(store.get(id))) as
            | StoredImageAsset
            | undefined
        if (!record) return null
        return new Blob([record.bytes], { type: record.type })
    } catch {
        return null
    }
}

/** Cached object URL for an asset, or null when the asset is gone. */
export async function getImageAssetUrl(id: string): Promise<string | null> {
    const cached = objectUrlCache.get(id)
    if (cached) return cached
    const blob = await getImageAssetBlob(id)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    objectUrlCache.set(id, url)
    return url
}

/**
 * Delete every stored asset whose id is not in `keep`.
 *
 * Do not call this directly: go through `pruneUnusedAssets` in
 * utils/assetUses.ts, which builds `keep` from EVERY kind of owner and
 * refuses to run if any of them can't be read. Only run it on draft load,
 * never on delete: undo must be able to bring an image back.
 */
export async function pruneImageAssets(keep: Set<string>): Promise<void> {
    try {
        const db = await openDb()
        const store = db
            .transaction(STORE_NAME, 'readwrite')
            .objectStore(STORE_NAME)
        const keys = await requestToPromise(store.getAllKeys())
        keys.forEach((key) => {
            const id = String(key)
            if (keep.has(id)) return
            store.delete(key)
            const url = objectUrlCache.get(id)
            if (url) {
                URL.revokeObjectURL(url)
                objectUrlCache.delete(id)
            }
        })
    } catch {
        // Best-effort housekeeping.
    }
}

/** Read a blob as a base64 data URL (JSON export, SVG/PNG export). */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (): void => resolve(String(reader.result))
        reader.onerror = (): void => reject(reader.error)
        reader.readAsDataURL(blob)
    })
}

/** Inverse of blobToDataUrl (JSON import). */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl)
    return res.blob()
}

/** assetId → data URL for each id (JSON export). Missing assets are skipped. */
export async function exportImageAssets(
    ids: Iterable<string>
): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    for (const id of ids) {
        const blob = await getImageAssetBlob(id)
        if (blob) out[id] = await blobToDataUrl(blob)
    }
    return out
}

/**
 * Write imported data URLs back into the store (JSON import). Ids are
 * content hashes, so re-hashing on put lands each blob under the same id the
 * imported records reference. Best-effort per asset.
 */
export async function restoreImageAssets(
    assets: Record<string, string>
): Promise<void> {
    for (const dataUrl of Object.values(assets)) {
        try {
            await putImageAsset(await dataUrlToBlob(dataUrl))
        } catch {
            // A missing asset renders as the image placeholder.
        }
    }
}
