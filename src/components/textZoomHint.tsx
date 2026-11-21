import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'

import { useBaseContext } from '../views/Base/baseContext'
import { useMediaQueryUtils } from '../constants/exportHooks'
import { HINT_SLOT_BOTTOM, TEXT_ZOOM_HINT_DISMISSED_KEY } from '../constants/misc'

const VISIBLE_MS = 5000
const FADE_MS = 300
const DEBOUNCE_MS = 5000

const TextZoomHint = (): ReactElement | null => {
    const { componentStore, currentElement } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    const shownRef = useRef(false)
    const lastScaleRef = useRef<number | null>(null)

    const canShowRef = useRef(false)
    canShowRef.current =
        !isMobile &&
        Object.values(componentStore ?? {}).some(
            (c) => c?.componentType === 'text'
        ) &&
        currentElement !== 'area' &&
        currentElement !== 'route' &&
        currentElement !== 'circle' &&
        currentElement !== 'curvedLine'

    useEffect(() => {
        if (isMobile) return
        try {
            if (localStorage.getItem(TEXT_ZOOM_HINT_DISMISSED_KEY)) {
                shownRef.current = true
                return
            }
        } catch (_) {
        }

        let debounce: ReturnType<typeof setTimeout> | null = null
        let hideTimer: ReturnType<typeof setTimeout> | null = null
        let unmountTimer: ReturnType<typeof setTimeout> | null = null

        const onZoom = (e: Event): void => {
            if (shownRef.current) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            const previous = lastScaleRef.current
            lastScaleRef.current = scale
            if (previous === null || previous === scale) return

            if (debounce) clearTimeout(debounce)
            debounce = setTimeout(() => {
                if (shownRef.current || !canShowRef.current) return
                shownRef.current = true
                setMounted(true)
                requestAnimationFrame(() => setVisible(true))
                hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS)
                unmountTimer = setTimeout(
                    () => setMounted(false),
                    VISIBLE_MS + FADE_MS
                )
                try {
                    localStorage.setItem(TEXT_ZOOM_HINT_DISMISSED_KEY, '1')
                } catch (_) {
                }
            }, DEBOUNCE_MS)
        }

        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
            if (debounce) clearTimeout(debounce)
            if (hideTimer) clearTimeout(hideTimer)
            if (unmountTimer) clearTimeout(unmountTimer)
        }
    }, [isMobile])

    if (isMobile || !mounted) return null

    return (
        <div
            id="geo-text-zoom-hint"
            className={`fixed w-full flex justify-center pointer-events-none
                transition-opacity ease-out duration-300 ${
                    visible ? 'opacity-100' : 'opacity-0'
                }`}
            style={{ bottom: HINT_SLOT_BOTTOM, zIndex: 20 }}
        >
            <div className="max-w-xl bg-hint text-hint-fg px-3 py-2 rounded-card shadow-panel">
                <div className="text-xs leading-snug text-center">
                    Map text keeps its size as you zoom — toggle{' '}
                    <span className="font-semibold">"Zoom resistant"</span>{' '}
                    option in the property toolbar to let it scale with the map.
                </div>
            </div>
        </div>
    )
}

export default TextZoomHint
