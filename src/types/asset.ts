export interface ImageAssetRef {
    assetId: string
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
