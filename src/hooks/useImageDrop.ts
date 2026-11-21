import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import {
    IMAGE_COMPONENT,
    IMAGE_SETTLED_EVENT,
    INSERT_IMAGE_FILES_EVENT,
} from '../constants/misc'
import { generateUUID } from '../utils/misc'
import {
    describeImageError,
    IMAGE_TYPE_REJECTED_MESSAGE,
    isAcceptedImageFile,
    storeImageFile,
} from '../utils/imageFile'
import {
    buildImageRecord,
    imageLocalSize,
    imageSurfaceSize,
} from '../utils/imageRecord'
import type { ImageSettledDetail } from '../utils/imageNode'
import { createPendingImageNode } from '../utils/imagePendingNode'
import type { PendingImageNode } from '../utils/imagePendingNode'
import { prefetchElementModule } from '../elementModules'
import type { ComponentRecord } from '../types/base'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiInstanceLike = any

const MULTI_DROP_OFFSET_PX = 24
const PENDING_TIMEOUT_MS = 15_000

export interface InsertImageFilesDetail {
    files: File[]
}

export function requestImageInsert(files: File[]): void {
    window.dispatchEvent(
        new CustomEvent<InsertImageFilesDetail>(INSERT_IMAGE_FILES_EVENT, {
            detail: { files },
        })
    )
}

export interface ImageDropOptions {
    twoJSInstance: TwoLike | null
    zuiInstanceRef: MutableRefObject<ZuiInstanceLike | null>
    baseId: string
    isPersisted: boolean
    addToLocalComponentStore: (
        id: string,
        componentType: string,
        record: ComponentRecord,
        skipHistory?: boolean
    ) => void
    showCanvasNotice: (message: string) => void
}

export const IMAGE_SHARED_BASE_NOTICE =
    "Images aren't supported on shared canvases yet."

function hasFiles(e: DragEvent): boolean {
    return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

export function useImageDrop(options: ImageDropOptions): void {
    const optionsRef = useRef(options)
    optionsRef.current = options

    useEffect(() => {
        const root = document.getElementById('main-two-root')
        if (!root) return

        const livePending = new Set<PendingImageNode>()
        const releaseById = new Map<string, () => void>()

        const removePending = (pending: PendingImageNode): void => {
            livePending.delete(pending)
            pending.remove()
        }

        const handOffPending = (
            id: string,
            pending: PendingImageNode
        ): void => {
            const release = (): void => {
                clearTimeout(timer)
                releaseById.delete(id)
                removePending(pending)
            }
            const timer = setTimeout(release, PENDING_TIMEOUT_MS)
            releaseById.set(id, release)
        }

        const onImageSettled = (e: Event): void => {
            const id = (e as CustomEvent<ImageSettledDetail>).detail?.id
            if (id) releaseById.get(id)?.()
        }

        const onDragOver = (e: DragEvent): void => {
            if (!hasFiles(e)) return
            e.preventDefault()
            prefetchElementModule(IMAGE_COMPONENT)
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        }

        const currentScale = (): number =>
            optionsRef.current.twoJSInstance?.scene?.scale || 1

        const addImageAt = async (
            file: File,
            surfaceX: number,
            surfaceY: number,
            pending: PendingImageNode
        ): Promise<void> => {
            const ref = await storeImageFile(file, (w, h) => {
                const scale = currentScale()
                const size = imageSurfaceSize(
                    imageLocalSize(w, h, scale),
                    scale
                )
                pending.setSize(size.width, size.height)
            })
            const { width, height } = imageLocalSize(
                ref.naturalWidth,
                ref.naturalHeight,
                currentScale()
            )
            const id = generateUUID()
            const record = buildImageRecord({
                id,
                baseId: optionsRef.current.baseId,
                x: surfaceX,
                y: surfaceY,
                image: ref,
                width,
                height,
                updatedBy: localStorage.getItem('userId'),
            })
            handOffPending(id, pending)
            optionsRef.current.addToLocalComponentStore(
                id,
                IMAGE_COMPONENT,
                record
            )
        }

        const insertFiles = (
            files: File[],
            clientX: number,
            clientY: number
        ): void => {
            const { isPersisted, zuiInstanceRef, showCanvasNotice } =
                optionsRef.current
            if (isPersisted) {
                showCanvasNotice(IMAGE_SHARED_BASE_NOTICE)
                return
            }
            const zui = zuiInstanceRef.current?.zui
            if (!zui) return
            const images = files.filter(isAcceptedImageFile)
            if (images.length === 0) {
                if (files.length > 0) {
                    showCanvasNotice(IMAGE_TYPE_REJECTED_MESSAGE)
                }
                return
            }
            prefetchElementModule(IMAGE_COMPONENT)
            const surface = zui.clientToSurface(clientX, clientY)
            const step = MULTI_DROP_OFFSET_PX / currentScale()
            const spots = images.map((_, i) => ({
                x: surface.x + i * step,
                y: surface.y + i * step,
            }))
            const pendings = spots.map((spot) => {
                const pending = createPendingImageNode(
                    optionsRef.current.twoJSInstance,
                    spot.x,
                    spot.y
                )
                livePending.add(pending)
                return pending
            })
            images
                .reduce<Promise<void>>(
                    (chain, file, i) =>
                        chain.then(() =>
                            addImageAt(
                                file,
                                spots[i]?.x ?? surface.x,
                                spots[i]?.y ?? surface.y,
                                pendings[i] as PendingImageNode
                            ).catch((err: unknown) => {
                                const pending = pendings[i]
                                if (pending) removePending(pending)
                                showCanvasNotice(describeImageError(err))
                            })
                        ),
                    Promise.resolve()
                )
                .catch(() => undefined)
        }

        const onDrop = (e: DragEvent): void => {
            if (!hasFiles(e)) return
            e.preventDefault()
            insertFiles(
                Array.from(e.dataTransfer?.files ?? []),
                e.clientX,
                e.clientY
            )
        }

        const onInsertRequest = (e: Event): void => {
            const files = (e as CustomEvent<InsertImageFilesDetail>).detail
                ?.files
            if (!files?.length) return
            const rect = (
                root.querySelector('svg') ?? root
            ).getBoundingClientRect()
            insertFiles(
                files,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
            )
        }

        const blockNavigation = (e: DragEvent): void => {
            if (hasFiles(e)) e.preventDefault()
        }

        root.addEventListener('dragover', onDragOver)
        root.addEventListener('drop', onDrop)
        window.addEventListener('dragover', blockNavigation)
        window.addEventListener('drop', blockNavigation)
        window.addEventListener(INSERT_IMAGE_FILES_EVENT, onInsertRequest)
        window.addEventListener(IMAGE_SETTLED_EVENT, onImageSettled)
        return (): void => {
            releaseById.forEach((release) => release())
            livePending.forEach((pending) => pending.remove())
            livePending.clear()
            window.removeEventListener(IMAGE_SETTLED_EVENT, onImageSettled)
            root.removeEventListener('dragover', onDragOver)
            root.removeEventListener('drop', onDrop)
            window.removeEventListener('dragover', blockNavigation)
            window.removeEventListener('drop', blockNavigation)
            window.removeEventListener(
                INSERT_IMAGE_FILES_EVENT,
                onInsertRequest
            )
        }
    }, [])
}
