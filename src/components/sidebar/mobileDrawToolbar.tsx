import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement, RefObject } from 'react'
import type { PrimaryElement } from '../../utils/constants'
import type { EraserSize } from '../../constants/misc'
import EraserSizeButtons from './eraserSizeButtons'
import type { DrawTool } from './mobileToolGroups'

const GAP_PX = 6
const EDGE_PX = 10

interface MobileDrawToolbarProps {
    triggerRef: RefObject<HTMLDivElement | null>
    tools: readonly PrimaryElement[]
    currentTool: DrawTool
    onPick: (tool: DrawTool) => void
    showEraserSizes: boolean
    eraserSize: EraserSize
    onEraserSizeChange: (size: EraserSize) => void
    btnSize: string
    iconSize: string
}

interface Position {
    left: number
    bottom: number
}

const MobileDrawToolbar = ({
    triggerRef,
    tools,
    currentTool,
    onPick,
    showEraserSizes,
    eraserSize,
    onEraserSizeChange,
    btnSize,
    iconSize,
}: MobileDrawToolbarProps): ReactElement => {
    const barRef = useRef<HTMLDivElement | null>(null)
    const [position, setPosition] = useState<Position | null>(null)

    useLayoutEffect(() => {
        const place = (): void => {
            const trigger = triggerRef.current
            const bar = barRef.current
            if (!trigger || !bar) return
            const rect = trigger.getBoundingClientRect()
            const width = bar.offsetWidth
            const centred = rect.left + rect.width / 2 - width / 2
            const maxLeft = window.innerWidth - width - EDGE_PX
            setPosition({
                left: Math.max(EDGE_PX, Math.min(centred, maxLeft)),
                bottom: window.innerHeight - rect.top + GAP_PX,
            })
        }
        place()
        window.addEventListener('resize', place)
        return (): void => window.removeEventListener('resize', place)
    }, [triggerRef, showEraserSizes])

    return (
        <div
            ref={barRef}
            role="toolbar"
            aria-label="Draw tools"
            className="fixed bg-card-bg border border-border-panel shadow-panel rounded-card flex items-center flex-row px-1 py-1 gap-0.5"
            style={{
                left: position?.left ?? 0,
                bottom: position?.bottom ?? 0,
                visibility: position ? 'visible' : 'hidden',
                zIndex: 11,
            }}
        >
            {tools.map((tool) => {
                const Icon = tool.elementIcon
                const isActive = tool.elementName === currentTool
                return (
                    <button
                        key={tool.elementName}
                        type="button"
                        aria-label={tool.elementDisplayName}
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
                        onClick={(): void =>
                            onPick(tool.elementName as DrawTool)
                        }
                    >
                        <Icon className={iconSize} />
                    </button>
                )
            })}
            {showEraserSizes && (
                <>
                    <div className="bg-border-panel w-px h-6 mx-1" />
                    <EraserSizeButtons
                        eraserSize={eraserSize}
                        onChange={onEraserSizeChange}
                        btnSize={btnSize}
                        tooltipPlacement="top"
                    />
                </>
            )}
        </div>
    )
}

export default MobileDrawToolbar
