import type { ReactElement } from 'react'
import OriginIcon from '../assets/origin.svg?react'
import { useLocateMe } from '../hooks/useLocateMe'
import Tooltip from './common/tooltip'
import type { TooltipPlacement } from './common/tooltip'

interface LocateMeButtonProps {
    className: string
    iconClassName: string
    tooltipPlacement: TooltipPlacement
}

const LocateMeButton = ({
    className,
    iconClassName,
    tooltipPlacement,
}: LocateMeButtonProps): ReactElement => {
    const { locate, locating } = useLocateMe()
    return (
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
