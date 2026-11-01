import { useEffect, useState } from 'react'
import { resolveImageSrc } from '../../utils/imageNode'
import { isImageAssetRef } from '../../types/asset'

/**
 * Something an <img> can show for an `image` meta value: the hosted URL, or
 * a blob URL for the local asset (cached per asset in utils/assetStore.ts, so
 * a thumbnail and its lightbox share one). `null` while resolving, or when
 * the bytes are missing from this browser.
 */
export function useImageSrc(value: unknown): {
    src: string | null
    missing: boolean
} {
    const [state, setState] = useState<{ src: string | null; missing: boolean }>({
        src: null,
        missing: false,
    })
    const key = isImageAssetRef(value) ? `${value.assetId}|${value.url ?? ''}` : ''

    useEffect(() => {
        if (!isImageAssetRef(value)) {
            setState({ src: null, missing: true })
            return
        }
        let cancelled = false
        resolveImageSrc(value)
            .then((src) => {
                if (!cancelled) setState({ src, missing: src === null })
            })
            .catch(() => {
                if (!cancelled) setState({ src: null, missing: true })
            })
        return (): void => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    return state
}
