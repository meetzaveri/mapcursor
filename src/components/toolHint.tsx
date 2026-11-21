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
        const raf = requestAnimationFrame(() => setVisible(true))
        return (): void => cancelAnimationFrame(raf)
    }, [hint, currentElement])

    if (!hint) return null

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
