import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

export interface PanelPosition {
    x: number
    y: number
}

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
    } catch {}
}

export interface DraggablePanel {
    position: PanelPosition | null
    isDragging: boolean
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
                e.preventDefault()
                e.stopPropagation()
                grabOffset.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                }
                e.currentTarget.setPointerCapture(e.pointerId)
                document.body.style.cursor = 'grabbing'
                setIsDragging(true)
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
