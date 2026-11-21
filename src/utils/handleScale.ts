// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { scheduleRender } from './renderScheduler'

type ShapeLike = any

export function applyHandleCounterScale(
    handles: ShapeLike[],
    scale: number
): void {
    if (!Number.isFinite(scale) || scale <= 0) return
    const k = 1 / scale
    handles.forEach((h) => {
        if (h) h.scale = k
    })
}

export function attachStrokeCounterScale(
    apply: (worldWidth: number) => void,
    basePx: number,
    two: ShapeLike,
    initialScale: number
): () => void {
    const set = (scale: number): void => {
        if (!Number.isFinite(scale) || scale <= 0) return
        apply(basePx / scale)
    }
    set(initialScale || 1)
    scheduleRender(two)
    const onZoom = (e: Event): void => {
        const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
        if (!scale) return
        set(scale)
    }
    window.addEventListener('zoomChanged', onZoom as EventListener)
    return (): void => {
        window.removeEventListener('zoomChanged', onZoom as EventListener)
    }
}

export function attachHandleCounterScale(
    handles: ShapeLike[],
    two: ShapeLike,
    initialScale: number
): () => void {
    applyHandleCounterScale(handles, initialScale || 1)
    scheduleRender(two)
    const onZoom = (e: Event): void => {
        const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
        if (!scale) return
        applyHandleCounterScale(handles, scale)
    }
    window.addEventListener('zoomChanged', onZoom as EventListener)
    return (): void => {
        window.removeEventListener('zoomChanged', onZoom as EventListener)
    }
}
