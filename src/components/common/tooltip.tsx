import {
    cloneElement,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import type {
    FocusEvent,
    PointerEvent as ReactPointerEvent,
    ReactElement,
    ReactNode,
    Ref,
} from 'react'

import Portal from './portal'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
    label: ReactNode
    children: ReactElement
    placement?: TooltipPlacement
    delay?: number
    disabled?: boolean
}

const GAP = 8
const EDGE_MARGIN = 6

interface Pos {
    top: number
    left: number
}

const Tooltip = ({
    label,
    children,
    placement = 'top',
    delay = 0,
    disabled = false,
}: TooltipProps): ReactElement => {
    const triggerRef = useRef<HTMLElement | null>(null)
    const bubbleRef = useRef<HTMLDivElement | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [anchor, setAnchor] = useState<DOMRect | null>(null)
    const [pos, setPos] = useState<Pos | null>(null)

    const show = useCallback((): void => {
        if (disabled || !label) return
        const open = (): void => {
            const el = triggerRef.current
            if (el) setAnchor(el.getBoundingClientRect())
        }
        if (delay <= 0) {
            open()
            return
        }
        timerRef.current = setTimeout(open, delay)
    }, [delay, disabled, label])

    const hide = useCallback((): void => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        setAnchor(null)
        setPos(null)
    }, [])

    useEffect(() => {
        if (!anchor) return
        const onAway = (): void => hide()
        window.addEventListener('pointerdown', onAway, true)
        window.addEventListener('scroll', onAway, true)
        window.addEventListener('blur', onAway)
        document.addEventListener('visibilitychange', onAway)
        return (): void => {
            window.removeEventListener('pointerdown', onAway, true)
            window.removeEventListener('scroll', onAway, true)
            window.removeEventListener('blur', onAway)
            document.removeEventListener('visibilitychange', onAway)
        }
    }, [anchor, hide])

    useLayoutEffect(() => {
        if (!anchor) return
        const bubble = bubbleRef.current
        if (!bubble) return
        const { width: bw, height: bh } = bubble.getBoundingClientRect()

        let top: number
        let left: number
        switch (placement) {
            case 'bottom':
                top = anchor.bottom + GAP
                left = anchor.left + anchor.width / 2 - bw / 2
                break
            case 'left':
                top = anchor.top + anchor.height / 2 - bh / 2
                left = anchor.left - GAP - bw
                break
            case 'right':
                top = anchor.top + anchor.height / 2 - bh / 2
                left = anchor.right + GAP
                break
            case 'top':
            default:
                top = anchor.top - GAP - bh
                left = anchor.left + anchor.width / 2 - bw / 2
        }

        left = Math.max(
            EDGE_MARGIN,
            Math.min(left, window.innerWidth - bw - EDGE_MARGIN)
        )
        top = Math.max(
            EDGE_MARGIN,
            Math.min(top, window.innerHeight - bh - EDGE_MARGIN)
        )
        setPos({ top, left })
    }, [anchor, placement])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const child = children as ReactElement<any> & { ref?: Ref<HTMLElement> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const childProps: any = child.props

    const trigger = cloneElement(child, {
        ref: (node: HTMLElement | null): void => {
            triggerRef.current = node
            const r = child.ref
            if (typeof r === 'function') r(node)
            else if (r && typeof r === 'object')
                (r as { current: HTMLElement | null }).current = node
        },
        onPointerEnter: (e: ReactPointerEvent): void => {
            if (e.pointerType === 'mouse') show()
            childProps.onPointerEnter?.(e)
        },
        onPointerLeave: (e: ReactPointerEvent): void => {
            hide()
            childProps.onPointerLeave?.(e)
        },
        onFocus: (e: FocusEvent): void => {
            const el = e.target as HTMLElement
            if (typeof el?.matches === 'function') {
                try {
                    if (el.matches(':focus-visible')) show()
                } catch {}
            }
            childProps.onFocus?.(e)
        },
        onBlur: (e: FocusEvent): void => {
            hide()
            childProps.onBlur?.(e)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    return (
        <>
            {trigger}
            {anchor && (
                <Portal>
                    <div
                        ref={bubbleRef}
                        role="tooltip"
                        className="fixed z-[200] pointer-events-none px-2 py-1 rounded-md bg-ink text-card-bg text-xs font-medium whitespace-nowrap transition-opacity duration-75"
                        style={{
                            top: pos?.top ?? 0,
                            left: pos?.left ?? 0,
                            opacity: pos ? 1 : 0,
                        }}
                    >
                        {label}
                    </div>
                </Portal>
            )}
        </>
    )
}

export default Tooltip
