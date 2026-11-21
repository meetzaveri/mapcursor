import { getImageAssetUrl } from './assetStore'
import { scheduleRender } from './renderScheduler'
import { SVG_NS } from './svgExportShared'
import type { ImageAssetRef } from '../types/asset'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export const IMAGE_NODE_ATTR = 'data-mc-image'

export const IMAGE_PLACEHOLDER_FILL = 'rgba(128, 128, 128, 0.12)'
export const IMAGE_PLACEHOLDER_STROKE = 'rgba(128, 128, 128, 0.6)'

export interface ImageSettledDetail {
    id: string
}

export async function resolveImageSrc(
    ref: ImageAssetRef | null
): Promise<string | null> {
    if (!ref) return null
    if (ref.url) return ref.url
    return getImageAssetUrl(ref.assetId)
}

function isInScene(two: TwoLike, shape: ShapeLike): boolean {
    let node = shape
    while (node) {
        if (node === two.scene) return true
        node = node.parent
    }
    return false
}

export function attachImageNode(
    two: TwoLike,
    group: ShapeLike,
    frame: ShapeLike,
    ref: ImageAssetRef | null,
    autoDispose: boolean,
    onSettled?: () => void
): () => void {
    let disposed = false
    let settled = false
    const settle = (): void => {
        if (settled || disposed) return
        settled = true
        onSettled?.()
    }
    let imageEl: SVGImageElement | null = null
    let lastW = -1
    let lastH = -1

    const sync = (): void => {
        if (!imageEl) return
        const w = frame.width
        const h = frame.height
        if (w === lastW && h === lastH) return
        lastW = w
        lastH = h
        imageEl.setAttribute('x', String(-w / 2))
        imageEl.setAttribute('y', String(-h / 2))
        imageEl.setAttribute('width', String(w))
        imageEl.setAttribute('height', String(h))
    }

    const onUpdate = (): void => {
        if (autoDispose && !isInScene(two, group)) {
            dispose()
            return
        }
        sync()
    }

    const dispose = (): void => {
        if (disposed) return
        disposed = true
        two.unbind('update', onUpdate)
        imageEl?.remove()
        imageEl = null
    }

    const showMissing = (): void => {
        frame.fill = IMAGE_PLACEHOLDER_FILL
        frame.stroke = IMAGE_PLACEHOLDER_STROKE
        scheduleRender(two)
        settle()
    }

    const showLoaded = (): void => {
        if (disposed) return
        frame.fill = 'transparent'
        frame.noStroke()
        scheduleRender(two)
        settle()
    }

    resolveImageSrc(ref)
        .then((src) => {
            if (disposed) return
            if (!src) {
                showMissing()
                return
            }
            scheduleRender(two, () => {
                if (disposed) return
                const groupEl: Element | undefined = group._renderer?.elem
                if (!groupEl) return
                const el = document.createElementNS(SVG_NS, 'image')
                el.setAttribute(IMAGE_NODE_ATTR, '1')
                el.setAttribute('href', src)
                el.setAttribute('preserveAspectRatio', 'none')
                el.addEventListener('error', showMissing, { once: true })
                el.addEventListener('load', showLoaded, { once: true })
                groupEl.insertBefore(el, groupEl.firstChild)
                imageEl = el
                sync()
                two.bind('update', onUpdate)
            })
        })
        .catch(showMissing)

    return dispose
}
