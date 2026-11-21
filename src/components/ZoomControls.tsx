import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../views/Base/baseContext'
import ZoomInIcon from '../assets/zoom-in.svg?react'
import ZoomOutIcon from '../assets/zoom-out.svg?react'
import LocateMeButton from './locateMeButton'

type ZuiWrapperLike = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zui: any
    notifyCameraChange?: () => void
} | null

const ZoomControls = (): ReactElement => {
    const {
        zuiInBase,
        twoJSInstance,
        zoomStep,
        readBackdropConfig,
    } = useBaseContext()
    const zui = zuiInBase as ZuiWrapperLike
    const [scale, setScale] = useState(1)

    useEffect(() => {
        if (zui) {
            setScale(zui.zui.scale)
        }
    }, [zui])

    useEffect(() => {
        const handler = (e: Event): void => {
            const detail = (e as CustomEvent<{ scale: number }>).detail
            if (detail) setScale(detail.scale)
        }
        window.addEventListener('zoomChanged', handler)
        return (): void => window.removeEventListener('zoomChanged', handler)
    }, [])

    const zoom = (direction: 1 | -1): void => {
        if (!zui || !twoJSInstance) return
        const delta = direction * (zoomStep || 1)
        zui.zui.zoomBy(delta, window.innerWidth / 2, window.innerHeight / 2)
        twoJSInstance.update()
        zui.notifyCameraChange?.()
        window.dispatchEvent(
            new CustomEvent('zoomChanged', {
                detail: { scale: zui.zui.scale },
            })
        )
    }

    const mapAnchor = readBackdropConfig().mapAnchor
    const label = mapAnchor
        ? `z${Math.round(mapAnchor.zoom + Math.log2(scale))}`
        : `${Math.round(scale * 100)}%`

    return (
        <div
            style={{ position: 'fixed', bottom: 20, left: 10, zIndex: 10 }}
            className="flex items-center gap-1 bg-card-bg text-ink rounded-lg px-2 py-1 border border-border-panel"
        >
            <button
                onClick={(): void => zoom(-1)}
                className="w-7 h-7 flex items-center justify-center rounded text-ink-muted hover:bg-sidebar hover:text-ink transition-colors duration-150"
                title="Zoom out"
            >
                <ZoomOutIcon
                    className="w-5 h-5"
                    stroke="currentColor"
                    color="currentColor"
                    aria-label="Zoom out"
                />
            </button>
            <span className="text-xs font-medium w-10 text-center select-none">
                {label}
            </span>
            <button
                onClick={(): void => zoom(1)}
                className="w-7 h-7 flex items-center justify-center rounded text-ink-muted hover:bg-sidebar hover:text-ink transition-colors duration-150"
                title="Zoom in"
            >
                <ZoomInIcon
                    className="w-5 h-5"
                    stroke="currentColor"
                    color="currentColor"
                    aria-label="Zoom in"
                />
            </button>
            {mapAnchor && (
                <>
                    <span className="w-px h-5 bg-border-panel mx-0.5" />
                    <LocateMeButton
                        className="w-7 h-7 flex items-center justify-center rounded text-ink-muted hover:bg-sidebar hover:text-ink transition-colors duration-150 disabled:cursor-wait"
                        iconClassName="w-5 h-5"
                        tooltipPlacement="top"
                    />
                </>
            )}
        </div>
    )
}

export default ZoomControls
