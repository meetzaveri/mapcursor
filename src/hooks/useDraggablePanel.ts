import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

// Lets a fixed-position panel be picked up by a grip and dropped anywhere on
// screen. The panel is DOCKED (wherever its own CSS puts it) until it is first
// dragged; from then on it is FLOATING at a stored top-left position, until the
// grip is double-clicked to dock it again.
//
// The position is remembered in localStorage, per panel and not per base: where
// a person likes their legend is a fact about their screen, not about a map.

export interface PanelPosition {
    x: number
    y: number
}

/**
 * Keep a panel of size `w × h` wholly on screen. Wider or taller than the
 * viewport, it pins to the top-left so its grip stays reachable.
 */
export function clampPanelPosition(
    pos: PanelPosition,
    w: number,
    h: number,
    viewportW: number,
    viewportH: number
): PanelPosition {
    return {
        x: Math.round(Math.min(Math.max(pos.x, 0), Math.max(viewportW - w, 0))),
        y: Math.round(Math.min(Math.max(pos.y, 0), Math.max(viewportH - h, 0))),
    }
}

function readStored(key: string): PanelPosition | null {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<PanelPosition>
        if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
            return null
        }
        return { x: parsed.x, y: parsed.y }
    } catch {
        return null
    }
}

function writeStored(key: string, pos: PanelPosition | null): void {
    try {
        if (pos) localStorage.setItem(key, JSON.stringify(pos))
        else localStorage.removeItem(key)
    } catch {
        /* storage full or blocked: the panel just won't remember */
    }
}

export interface DraggablePanel {
    /** Null while docked. */
    position: PanelPosition | null
    isDragging: boolean
    /** Spread onto the grip element. */
    gripHandlers: {
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
        onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
        onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
        onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
        onDoubleClick: () => void
    }
}

export function useDraggablePanel(
    panelRef: RefObject<HTMLElement | null>,
    storageKey: string
): DraggablePanel {
    const [position, setPosition] = useState<PanelPosition | null>(() =>
        readStored(storageKey)
    )
    const [isDragging, setIsDragging] = useState(false)
    // Where in the panel the pointer grabbed it, so the panel does not jump to
    // put its corner under the cursor.
    const grabOffset = useRef<PanelPosition | null>(null)
    const latest = useRef<PanelPosition | null>(position)
    latest.current = position

    const clampToScreen = useCallback(
        (pos: PanelPosition): PanelPosition => {
            const rect = panelRef.current?.getBoundingClientRect()
            return clampPanelPosition(
                pos,
                rect?.width ?? 0,
                rect?.height ?? 0,
                window.innerWidth,
                window.innerHeight
            )
        },
        [panelRef]
    )

    // A stored spot from a bigger window, or a window since shrunk, must not
    // leave the panel off screen with no grip to fetch it back by.
    useEffect(() => {
        const refit = (): void => {
            const current = latest.current
            if (!current) return
            const next = clampToScreen(current)
            if (next.x !== current.x || next.y !== current.y) {
                setPosition(next)
                writeStored(storageKey, next)
            }
        }
        refit()
        window.addEventListener('resize', refit)
        return (): void => window.removeEventListener('resize', refit)
    }, [clampToScreen, storageKey])

    const endDrag = (e: ReactPointerEvent<HTMLElement>): void => {
        if (!grabOffset.current) return
        grabOffset.current = null
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
        }
        document.body.style.cursor = ''
        setIsDragging(false)
        writeStored(storageKey, latest.current)
    }

    return {
        position,
        isDragging,
        gripHandlers: {
            onPointerDown: (e): void => {
                if (e.button !== 0) return
                const rect = panelRef.current?.getBoundingClientRect()
                if (!rect) return
                // No text selection, no focus shuffle, and nothing reaches
                // the canvas underneath.
                e.preventDefault()
                e.stopPropagation()
                grabOffset.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                }
                // Capture keeps the moves coming when the pointer outruns the
                // grip, and keeps them off the canvas.
                e.currentTarget.setPointerCapture(e.pointerId)
                // On the body too, so the cursor holds wherever it travels.
                document.body.style.cursor = 'grabbing'
                setIsDragging(true)
                // A docked panel floats from exactly where it already is.
                setPosition({ x: rect.left, y: rect.top })
            },
            onPointerMove: (e): void => {
                const offset = grabOffset.current
                if (!offset) return
                setPosition(
                    clampToScreen({
                        x: e.clientX - offset.x,
                        y: e.clientY - offset.y,
                    })
                )
            },
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onDoubleClick: (): void => {
                setPosition(null)
                writeStored(storageKey, null)
            },
        },
    }
}
