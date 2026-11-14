import type { ReactElement } from 'react'
import OriginIcon from '../assets/origin.svg?react'
import { useLocateMe } from '../hooks/useLocateMe'
import Tooltip from './common/tooltip'
import type { TooltipPlacement } from './common/tooltip'

interface LocateMeButtonProps {
    /** Sizing and colours of the surface it sits on (zoom pill or mobile column). */
    className: string
    iconClassName: string
    /** Which side the "Locate Me" hint opens on, away from the screen edge. */
    tooltipPlacement: TooltipPlacement
}

/**
 * "Locate me", with the same GPS icon as "Use my current location" on the
 * first-visit prompt (MapStartLocationModal), so the two read as one action.
 * Pulses while the browser looks up the position.
 */
const LocateMeButton = ({
    className,
    iconClassName,
    tooltipPlacement,
}: LocateMeButtonProps): ReactElement => {
    const { locate, locating } = useLocateMe()
    return (
        // The shared hover hint, like the toolbar's. No `title` on the button:
        // the browser's own tooltip would stack on top of this one.
        <Tooltip label="Locate Me" placement={tooltipPlacement}>
            <button
                type="button"
                onClick={locate}
                disabled={locating}
                aria-busy={locating}
                aria-label="Locate me"
                className={className}
            >
                <OriginIcon
                    // The asset hardcodes a blue stroke AND its own `color`, so
                    // both are overridden to follow the button's ink (same as
                    // MapStartLocationModal).
                    color="currentColor"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    aria-hidden="true"
                    focusable="false"
                    className={`${iconClassName} ${locating ? 'animate-pulse' : ''}`}
                />
            </button>
        </Tooltip>
    )
}

export default LocateMeButton
