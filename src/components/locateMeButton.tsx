import type { ReactElement } from 'react'
import OriginIcon from '../assets/origin.svg?react'
import { useLocateMe } from '../hooks/useLocateMe'

interface LocateMeButtonProps {
    /** Sizing and colours of the surface it sits on (zoom pill or mobile column). */
    className: string
    iconClassName: string
}

/**
 * "Locate me", with the same GPS icon as "Use my current location" on the
 * first-visit prompt (MapStartLocationModal), so the two read as one action.
 * Pulses while the browser looks up the position.
 */
const LocateMeButton = ({
    className,
    iconClassName,
}: LocateMeButtonProps): ReactElement => {
    const { locate, locating } = useLocateMe()
    return (
        <button
            type="button"
            onClick={locate}
            disabled={locating}
            aria-busy={locating}
            aria-label="Locate me"
            title="Locate me"
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
    )
}

export default LocateMeButton
