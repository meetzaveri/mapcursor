import { useEffect, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { useBaseContext } from '../views/Base/baseContext'
import { useMediaQueryUtils } from '../constants/exportHooks'
import {
    HINT_SLOT_BOTTOM,
    HINT_SLOT_Z,
    HINT_SLOT_MOBILE_TOP,
    HINT_SLOT_MOBILE_LEFT,
    HINT_SLOT_MOBILE_RIGHT,
} from '../constants/misc'

const Key = ({ children }: { children: ReactNode }): ReactElement => (
    <kbd className="px-1 py-px mx-px rounded bg-hint-fg/20 font-medium">
        {children}
    </kbd>
)

/**
 * Per-tool copy. Split by pointer, because the gesture genuinely differs: on
 * desktop these draws end at Esc/Enter, and on touch there is no Esc and no
 * Enter — the ✓/✗ controls in base.tsx are the only way to finish or abandon
 * one. A shared string would have to name a key that half the users do not
 * have. Every mobile string is also kept under ~60 characters so the pill stays
 * TWO lines at 320px: at three it reaches past its neighbours and clips the top
 * of the menu drawer, which z-index cannot fix (see HINT_SLOT_Z).
 */
const TOOL_HINTS: Record<string, { desktop: ReactNode; mobile: ReactNode }> = {
    route: {
        desktop: (
            <>
                Click and drop points to create route on map. Press{' '}
                <Key>Esc</Key> or <Key>Enter</Key> to exit from route tool.
            </>
        ),
        mobile: <>Tap to drop route points. ✓ to finish, ✗ to cancel.</>,
    },
    area: {
        desktop: (
            <>
                Click and drop points to create area, which will automatically
                be closed area upon finishing. Press <Key>Esc</Key> or{' '}
                <Key>Enter</Key> to exit from area tool.
            </>
        ),
        mobile: <>Tap to drop points. ✓ closes the area, ✗ cancels.</>,
    },
    circle: {
        desktop: (
            <>
                Click and drag the cursor accordingly to create circle/bubble
                map based on radius. You can double click on radius map to
                create label for it.
            </>
        ),
        mobile: (
            <>Drag from the centre to set the radius. Double-tap to name.</>
        ),
    },
}

/**
 * Persistent per-tool guidance, shown for the whole time a tool is armed — not
 * a timed toast. These three tools are the ones whose gesture cannot be guessed
 * from their icon: two are multi-click draws that need an explicit exit, and
 * the third is drag-to-draw from the CENTRE out, which reads as a bounding box
 * until told otherwise.
 *
 * Keyed on `currentElement`, so it clears itself: every one of these draws ends
 * in `setPointerElement('pointer')` (newCanvas.tsx), and switching tools
 * re-renders with a different key.
 *
 * Two slots, because the toolbar moves. On desktop it sits at the bottom of the
 * page (HINT_SLOT_BOTTOM). On mobile the toolbar is pinned bottom-left, so
 * there is no "below the toolbar" slot at all — the hint takes the empty strip
 * across the TOP, between the menu and share buttons. That strip is only ~193px
 * wide on a 320px phone, which is why the mobile copy above is written short
 * rather than wrapped from the desktop string.
 */
const ToolHint = (): ReactElement | null => {
    const { currentElement } = useBaseContext()
    const { isMobile } = useMediaQueryUtils()

    const entry = currentElement ? TOOL_HINTS[currentElement] : undefined
    const hint = entry && (isMobile ? entry.mobile : entry.desktop)

    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!hint) {
            setVisible(false)
            return
        }
        // Next frame, so the opacity transition has a 0 to start from.
        const raf = requestAnimationFrame(() => setVisible(true))
        return (): void => cancelAnimationFrame(raf)
        // `currentElement` and not just `hint`: switching straight from area to
        // route keeps a hint mounted, and it should re-fade for the new copy
        // rather than swap text mid-sentence.
    }, [hint, currentElement])

    if (!hint) return null

    // Mobile pins both edges so the pill fills the gap between its neighbours
    // and wraps inside it; desktop is a full-width centring row at the bottom.
    const slot = isMobile
        ? {
              top: HINT_SLOT_MOBILE_TOP,
              left: HINT_SLOT_MOBILE_LEFT,
              right: HINT_SLOT_MOBILE_RIGHT,
              zIndex: HINT_SLOT_Z,
          }
        : { bottom: HINT_SLOT_BOTTOM, zIndex: HINT_SLOT_Z }

    return (
        <div
            id="tool-hint"
            className={`fixed flex justify-center pointer-events-none
                transition-opacity ease-out duration-200
                ${isMobile ? '' : 'w-full'}
                ${visible ? 'opacity-100' : 'opacity-0'}`}
            style={slot}
        >
            <div
                className={`bg-hint text-hint-fg px-3 py-2 rounded-card shadow-panel
                    ${isMobile ? 'w-full' : 'max-w-xl'}`}
            >
                <div
                    className={`leading-snug text-center ${
                        isMobile ? 'text-[11px]' : 'text-xs'
                    }`}
                >
                    {hint}
                </div>
            </div>
        </div>
    )
}

export default ToolHint
