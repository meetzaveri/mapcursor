// A reference to image bytes held in the local asset store (IndexedDB).
//
// The SAME shape is held by two kinds of owner:
//   - an image element, at `metadata.properties.image`
//   - an `image` meta value, as its `value`
//
// The bytes themselves record nothing about who uses them. Ownership is worked
// out by scanning references (see utils/assetUses.ts), never stored next to the
// blob. One photo can be both an image element and a point's photo, and it is
// stored once, so a per-blob owner tag would have to be a list kept in step
// across localStorage and IndexedDB, which cannot be updated together.

export interface ImageAssetRef {
    /** Content hash of the bytes; the IndexedDB key. */
    assetId: string
    /**
     * Hosted copy, once shared bases upload images. Null while the image is
     * local-only. Renderers prefer it over `assetId` when present.
     */
    url: string | null
    mimeType: string
    naturalWidth: number
    naturalHeight: number
}

export function isImageAssetRef(value: unknown): value is ImageAssetRef {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    return (
        typeof v.assetId === 'string' &&
        v.assetId.length > 0 &&
        (v.url === null || typeof v.url === 'string') &&
        typeof v.mimeType === 'string' &&
        typeof v.naturalWidth === 'number' &&
        typeof v.naturalHeight === 'number'
    )
}
