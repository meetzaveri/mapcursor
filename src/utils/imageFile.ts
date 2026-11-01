// Validate and normalize an image file before it is stored. Ported from
// craftbase `imageDrop.ts`; renamed because it is no longer drop-specific:
// the toolbar Image tool, drag-and-drop, and the `image` meta value all go
// through `storeImageFile`, so every stored image has had its EXIF/GPS
// stripped the same way. Large photos are downscaled so a handful of camera
// images doesn't fill the IndexedDB quota or make the SVG renderer decode
// 50 MP bitmaps.

import { stripImageMetadata } from './imageMetadata'
import { putImageAsset } from './assetStore'
import type { ImageAssetRef } from '../types/asset'

export const ACCEPTED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
])

// Raw upper bound on what we'll even try to decode.
export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024
// Long-edge cap for the stored bitmap.
const MAX_IMAGE_EDGE_PX = 2048
const REENCODE_QUALITY = 0.85

export interface PreparedImage {
    blob: Blob
    mimeType: string
    naturalWidth: number
    naturalHeight: number
}

export type ImageRejectReason = 'type' | 'size' | 'decode'

export class ImageRejectedError extends Error {
    reason: ImageRejectReason
    constructor(reason: ImageRejectReason) {
        super(`Image rejected: ${reason}`)
        this.reason = reason
    }
}

const REJECT_MESSAGES: Record<ImageRejectReason, string> = {
    type: 'Only PNG, JPEG, WebP and GIF images are supported.',
    size: 'That image is too large (max 20 MB).',
    decode: "That image couldn't be read.",
}

/**
 * A user-facing message for a failed image store: the rejection reason, or
 * the storage failure (IndexedDB unavailable or full). Shared by the canvas
 * drop and the `image` meta value field, so both say the same thing.
 */
export function describeImageError(err: unknown): string {
    return err instanceof ImageRejectedError
        ? REJECT_MESSAGES[err.reason]
        : "Couldn't save that image in this browser."
}

/** The message for an unsupported file type, before any decoding. */
export const IMAGE_TYPE_REJECTED_MESSAGE = REJECT_MESSAGES.type

export function isAcceptedImageFile(file: File): boolean {
    return ACCEPTED_IMAGE_TYPES.has(file.type)
}

/**
 * Open the native file picker for images. Resolves with the chosen files, or
 * an empty array when the user cancels. `multiple` is off for an `image` meta
 * value, which holds exactly one photo.
 */
export function openImageFilePicker(multiple = true): Promise<File[]> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = Array.from(ACCEPTED_IMAGE_TYPES).join(',')
        input.multiple = multiple
        input.onchange = (): void => resolve(Array.from(input.files ?? []))
        input.addEventListener('cancel', () => resolve([]))
        input.click()
    })
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number
): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Decode, downscale (long edge ≤ 2048 px) and re-encode a dropped file.
 * Files already within the cap keep their pixels but lose their metadata
 * (GIFs always do, so animation survives). Oversized PNGs stay PNG so
 * transparency survives; other oversized formats re-encode to WebP. Either
 * way, no EXIF/GPS/XMP reaches storage. Throws ImageRejectedError on
 * bad type/size/decode. `onDecoded` gets the final pixel size as soon as the
 * file is decoded, ahead of the slower re-encode, so callers can size a
 * loading placeholder.
 */
export async function prepareImageFile(
    file: File,
    onDecoded?: (width: number, height: number) => void
): Promise<PreparedImage> {
    if (!isAcceptedImageFile(file)) throw new ImageRejectedError('type')
    if (file.size > MAX_IMAGE_FILE_BYTES) throw new ImageRejectedError('size')

    let bitmap: ImageBitmap
    try {
        // Explicit so the bitmap (and any re-encode below) is upright for
        // photos that rely on the EXIF Orientation tag.
        bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
        })
    } catch {
        throw new ImageRejectedError('decode')
    }

    const { width, height } = bitmap
    const longEdge = Math.max(width, height)
    const oversized = file.type !== 'image/gif' && longEdge > MAX_IMAGE_EDGE_PX

    // Within the cap: keep the original pixels and drop only the metadata
    // (location, camera, timestamps). A rotated photo or a file we can't
    // parse falls through to the re-encode, which bakes in the rotation and
    // carries no metadata.
    if (!oversized) {
        const stripped = stripImageMetadata(
            new Uint8Array(await file.arrayBuffer()),
            file.type
        )
        if (stripped && stripped.orientation === 1) {
            bitmap.close()
            onDecoded?.(width, height)
            return {
                blob: new Blob([stripped.bytes as Uint8Array<ArrayBuffer>], {
                    type: file.type,
                }),
                mimeType: file.type,
                naturalWidth: width,
                naturalHeight: height,
            }
        }
    }

    const ratio = oversized ? MAX_IMAGE_EDGE_PX / longEdge : 1
    const targetW = Math.round(width * ratio)
    const targetH = Math.round(height * ratio)
    onDecoded?.(targetW, targetH)
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        bitmap.close()
        throw new ImageRejectedError('decode')
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()

    const keepPng = file.type === 'image/png'
    const outType = keepPng ? 'image/png' : 'image/webp'
    const encoded = await canvasToBlob(
        canvas,
        outType,
        keepPng ? undefined : REENCODE_QUALITY
    )
    // Safari < 16 can't encode WebP and silently returns PNG; fall back to
    // JPEG there so photos don't balloon.
    let blob = encoded
    if (!keepPng && (!blob || blob.type !== 'image/webp')) {
        blob = await canvasToBlob(canvas, 'image/jpeg', REENCODE_QUALITY)
    }
    if (!blob) throw new ImageRejectedError('decode')

    // Safari's canvas encoder writes its own EXIF (dimensions, color space).
    // Strip it too, so nothing stored carries metadata in any browser.
    const reencoded = stripImageMetadata(
        new Uint8Array(await blob.arrayBuffer()),
        blob.type
    )
    if (reencoded) {
        blob = new Blob([reencoded.bytes as Uint8Array<ArrayBuffer>], {
            type: blob.type,
        })
    }

    return {
        blob,
        mimeType: blob.type,
        naturalWidth: targetW,
        naturalHeight: targetH,
    }
}

/**
 * The one path from a picked or dropped file to a stored image: validate,
 * strip metadata, downscale, write to the asset store. Returns the reference
 * an owner keeps (an image element's `metadata.properties.image`, or an
 * `image` meta value). Throws ImageRejectedError for a bad file, and the
 * store's error when IndexedDB is unavailable or full.
 */
export async function storeImageFile(
    file: File,
    onDecoded?: (width: number, height: number) => void
): Promise<ImageAssetRef> {
    const prepared = await prepareImageFile(file, onDecoded)
    const assetId = await putImageAsset(prepared.blob)
    return {
        assetId,
        url: null,
        mimeType: prepared.mimeType,
        naturalWidth: prepared.naturalWidth,
        naturalHeight: prepared.naturalHeight,
    }
}
