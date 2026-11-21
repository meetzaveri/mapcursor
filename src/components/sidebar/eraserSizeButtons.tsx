import type { ReactElement } from 'react'
import Tooltip from '../common/tooltip'
import {
    ERASER_SIZES,
    ERASER_DOT_PX,
    type EraserSize,
} from '../../constants/misc'

const ERASER_SIZE_LABEL: Record<EraserSize, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
}

interface EraserSizeButtonsProps {
    eraserSize: EraserSize
    onChange: (size: EraserSize) => void
    btnSize: string
    tooltipPlacement: 'top' | 'bottom'
}

const EraserSizeButtons = ({
    eraserSize,
    onChange,
    btnSize,
    tooltipPlacement,
}: EraserSizeButtonsProps): ReactElement => (
    <>
        {ERASER_SIZES.map((size) => {
            const label = ERASER_SIZE_LABEL[size]
            const dotPx = ERASER_DOT_PX[size]
            const isActive = eraserSize === size
            return (
                <Tooltip key={size} label={label} placement={tooltipPlacement}>
                    <button
                        type="button"
                        aria-label={`Eraser size: ${label}`}
                        aria-pressed={isActive}
                        className={`
                            ${btnSize} flex items-center justify-center rounded cursor-pointer
                            transition-all ease-in-out duration-200
                            ${
                                isActive
                                    ? 'bg-accent/10 text-accent-dark ring-1 ring-accent/30'
                                    : 'text-ink-muted hover:bg-sidebar hover:text-ink'
                            }
                        `}
                        onClick={(): void => onChange(size)}
                    >
                        <span
                            className="rounded-full bg-current pointer-events-none"
                            style={{ width: dotPx, height: dotPx }}
                        />
                    </button>
                </Tooltip>
            )
        })}
    </>
)

export default EraserSizeButtons
