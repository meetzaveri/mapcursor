import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import Portal from '../common/portal'
import { CHROME_ENTER, CHROME_ENTER_FROM_BOTTOM } from '../common/chromeEnter'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { SKIP_CHROME_REVEAL } from '../../utils/e2eHooks'
import { SHAPES_TOOLBAR_ID } from '../sidebar/shapesToolbarId'
import CalloutArrow from './calloutArrow'
import { hasSeenToolbarIntro, markToolbarIntroSeen } from './onboardingStorage'
import { padRect, spotlightClipPath } from './spotlightClipPath'
import { useElementRect } from './useElementRect'

const SETTLE_AFTER_REVEAL_MS = 1100
const FADE_MS = 250
const HOLE_PAD = 6
const HOLE_RADIUS = 16
const CALLOUT_GAP = 10
const Z_INDEX = 150

interface ToolbarIntroProps {
    ready: boolean
}

const ToolbarIntro = ({ ready }: ToolbarIntroProps): ReactElement | null => {
    const { isMobile } = useMediaQueryUtils()
    const [open, setOpen] = useState(false)
    const [visible, setVisible] = useState(false)
    const rect = useElementRect(SHAPES_TOOLBAR_ID, open)

    useEffect(() => {
        if (!ready || SKIP_CHROME_REVEAL || hasSeenToolbarIntro()) return
        const timer = window.setTimeout(
            () => setOpen(true),
            SETTLE_AFTER_REVEAL_MS
        )
        return (): void => window.clearTimeout(timer)
    }, [ready])

    useEffect(() => {
        if (!open) return
        const frame = requestAnimationFrame(() => setVisible(true))
        return (): void => cancelAnimationFrame(frame)
    }, [open])

    const dismiss = useCallback((): void => {
        markToolbarIntroSeen()
        setVisible(false)
        window.setTimeout(() => setOpen(false), FADE_MS)
    }, [])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') dismiss()
        }
        const onPointer = (e: PointerEvent): void => {
            const toolbar = document.getElementById(SHAPES_TOOLBAR_ID)
            if (
                toolbar &&
                e.target instanceof Node &&
                toolbar.contains(e.target)
            )
                dismiss()
        }
        window.addEventListener('keydown', onKey)
        window.addEventListener('pointerdown', onPointer, true)
        return (): void => {
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('pointerdown', onPointer, true)
        }
    }, [open, dismiss])

    if (!open || !rect) return null

    const hole = padRect(rect, HOLE_PAD)
    const below = !isMobile
    const calloutStyle: CSSProperties = below
        ? {
              top: hole.top + hole.height + CALLOUT_GAP,
              left: hole.left + hole.width / 2,
              transform: 'translateX(-50%)',
          }
        : {
              bottom: window.innerHeight - hole.top + CALLOUT_GAP,
              left: Math.max(hole.left, 12),
          }

    return (
        <Portal>
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: Z_INDEX,
                    opacity: visible ? 1 : 0,
                    transition: `opacity ${FADE_MS}ms ease-out`,
                }}
            >
                <div
                    className="absolute inset-0 bg-black/55 backdrop-blur-[3px] pointer-events-auto"
                    style={{
                        clipPath: spotlightClipPath(
                            window.innerWidth,
                            window.innerHeight,
                            hole,
                            HOLE_RADIUS
                        ),
                    }}
                    onClick={dismiss}
                />
                <div
                    className="absolute ring-2 ring-white/80"
                    style={{ ...hole, borderRadius: HOLE_RADIUS }}
                />
                <div
                    role="dialog"
                    aria-label="Drawing tools"
                    className={`absolute flex pointer-events-auto
                        ${below ? 'flex-col items-center' : 'flex-col-reverse items-start'}
                        ${below ? CHROME_ENTER : CHROME_ENTER_FROM_BOTTOM}`}
                    style={{
                        ...calloutStyle,
                        width: 'min(300px, calc(100vw - 24px))',
                    }}
                >
                    <div className={below ? '' : 'ml-6'}>
                        <CalloutArrow pointing={below ? 'up' : 'down'} />
                    </div>
                    <div
                        className={`flex flex-col gap-3 py-2 ${below ? 'items-center text-center' : 'items-start text-left'}`}
                    >
                        <p className="text-white text-base font-medium leading-snug">
                            Use the tools like point, area, radius map or route
                            to annotate on maps
                        </p>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="px-4 py-1.5 rounded-lg bg-card-bg text-ink text-sm font-medium shadow-md"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    )
}

export default ToolbarIntro
