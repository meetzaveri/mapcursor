import { useState, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface MobileToolbarPanelsOptions {
    isMobile?: boolean
    selectedComponent?: unknown
}

export interface MobileToolbarPanelsApi {
    showMobileToolbarPanel: boolean
    setShowMobileToolbarPanel: Dispatch<SetStateAction<boolean>>
}

export function useMobileToolbarPanels({
    isMobile,
    selectedComponent,
}: MobileToolbarPanelsOptions = {}): MobileToolbarPanelsApi {
    const [showMobileToolbarPanel, setShowMobileToolbarPanel] = useState(false)

    useEffect(() => {
        setShowMobileToolbarPanel(false)
    }, [selectedComponent])

    useEffect(() => {
        if (!isMobile || !showMobileToolbarPanel) return
        const canvasEl = document.getElementById('main-two-root')
        if (!canvasEl) return
        const handleCanvasTouch = (): void => setShowMobileToolbarPanel(false)
        canvasEl.addEventListener('touchstart', handleCanvasTouch, {
            passive: true,
        })
        return (): void => {
            canvasEl.removeEventListener('touchstart', handleCanvasTouch)
        }
    }, [isMobile, showMobileToolbarPanel])

    return {
        showMobileToolbarPanel,
        setShowMobileToolbarPanel,
    }
}
