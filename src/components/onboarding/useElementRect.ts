import { useLayoutEffect, useState } from 'react'

export function useElementRect(id: string, active: boolean): DOMRect | null {
    const [rect, setRect] = useState<DOMRect | null>(null)

    useLayoutEffect(() => {
        if (!active) return
        const el = document.getElementById(id)
        if (!el) return
        const measure = (): void => setRect(el.getBoundingClientRect())
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        window.addEventListener('resize', measure)
        return (): void => {
            observer.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [id, active])

    return rect
}
