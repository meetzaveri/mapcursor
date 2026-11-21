const DB_NAME = 'mapcursor-assets'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface StoredImageAsset {
    id: string
    bytes: ArrayBuffer
    type: string
    createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

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

export async function assetIdForBytes(buffer: ArrayBuffer): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        return fallbackAssetHash(new Uint8Array(buffer))
    }
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

export async function isImageAssetStoreAvailable(): Promise<boolean> {
    try {
        await openDb()
        return true
    } catch {
        return false
    }
}

export async function putImageAsset(blob: Blob): Promise<string> {
    const bytes = await blob.arrayBuffer()
    const id = await assetIdForBytes(bytes)
    const db = await openDb()
    const store = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
    const record: StoredImageAsset = {
        id,
        bytes,
        type: blob.type,
        createdAt: Date.now(),
    }
    await requestToPromise(store.put(record))
    return id
}

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

export async function getImageAssetUrl(id: string): Promise<string | null> {
    const cached = objectUrlCache.get(id)
    if (cached) return cached
    const blob = await getImageAssetBlob(id)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    objectUrlCache.set(id, url)
    return url
}

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
    }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (): void => resolve(String(reader.result))
        reader.onerror = (): void => reject(reader.error)
        reader.readAsDataURL(blob)
    })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl)
    return res.blob()
}

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

export async function restoreImageAssets(
    assets: Record<string, string>
): Promise<void> {
    for (const dataUrl of Object.values(assets)) {
        try {
            await putImageAsset(await dataUrlToBlob(dataUrl))
        } catch {
        }
    }
}
