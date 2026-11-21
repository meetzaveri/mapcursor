import { stripImageMetadata } from './imageMetadata'
import { putImageAsset } from './assetStore'
import type { ImageAssetRef } from '../types/asset'

export const ACCEPTED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
])

export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024
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

export function describeImageError(err: unknown): string {
    return err instanceof ImageRejectedError
        ? REJECT_MESSAGES[err.reason]
        : "Couldn't save that image in this browser."
}

export const IMAGE_TYPE_REJECTED_MESSAGE = REJECT_MESSAGES.type

export function isAcceptedImageFile(file: File): boolean {
    return ACCEPTED_IMAGE_TYPES.has(file.type)
}

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

export async function prepareImageFile(
    file: File,
    onDecoded?: (width: number, height: number) => void
): Promise<PreparedImage> {
    if (!isAcceptedImageFile(file)) throw new ImageRejectedError('type')
    if (file.size > MAX_IMAGE_FILE_BYTES) throw new ImageRejectedError('size')

    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
        })
    } catch {
        throw new ImageRejectedError('decode')
    }

    const { width, height } = bitmap
    const longEdge = Math.max(width, height)
    const oversized = file.type !== 'image/gif' && longEdge > MAX_IMAGE_EDGE_PX

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
    let blob = encoded
    if (!keepPng && (!blob || blob.type !== 'image/webp')) {
        blob = await canvasToBlob(canvas, 'image/jpeg', REENCODE_QUALITY)
    }
    if (!blob) throw new ImageRejectedError('decode')

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
