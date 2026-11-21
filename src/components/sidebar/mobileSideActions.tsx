import { useLayoutEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import { RIGHT_MARGIN } from '../../hooks/useTopRightOffset'
import LegendIcon from '../../icons/legendIcon'
import LegendPanelModal from '../legend/legendPanelModal'
import { MobileMetaPropertiesButton } from '../metaProperties/metaPropertiesPanel'
import { useSelectedMetaObject } from '../metaProperties/useSelectedMetaObject'
import { SHARE_BUTTON_ID } from './shapesToolbarId'
import LocateMeButton from '../locateMeButton'

const GAP_PX = 8
const FALLBACK_TOP_PX = 62

function useBelowShareTop(active: boolean): number {
    const [top, setTop] = useState(FALLBACK_TOP_PX)
    useLayoutEffect(() => {
        if (!active) return
        const measure = (): void => {
            const share = document.getElementById(SHARE_BUTTON_ID)
            if (!share) return
            setTop(Math.round(share.getBoundingClientRect().bottom + GAP_PX))
        }
        measure()
        window.addEventListener('resize', measure)
        return (): void => window.removeEventListener('resize', measure)
    }, [active])
    return top
}

function useHasNonPencilSelection(): boolean {
    const { selectedComponent, selectedGroup } = useBaseContext()
    if (selectedGroup || !selectedComponent) return false
    const componentType =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selectedComponent as any)?.group?.data?.elementData?.componentType
    return typeof componentType === 'string' && componentType !== 'pencil'
}

const MobileSideActions = (): ReactElement | null => {
    const { isMobile } = useMediaQueryUtils()
    const hasSelection = useHasNonPencilSelection()
    const metaTarget = useSelectedMetaObject()
    const [showLegend, setShowLegend] = useState(false)
    const active = isMobile && hasSelection
    const top = useBelowShareTop(isMobile)

    if (!isMobile && !showLegend) return null

    return (
        <>
            {isMobile && (
                <div
                    className="flex flex-col items-end"
                    style={{
                        position: 'fixed',
                        top: `${top}px`,
                        right: `${RIGHT_MARGIN}px`,
                        gap: `${GAP_PX}px`,
                        zIndex: 20,
                    }}
                >
                    <LocateMeButton
                        className="w-10 h-10 rounded-lg flex items-center justify-center
                            bg-card-bg text-ink border border-border-panel disabled:cursor-wait"
                        iconClassName="w-5 h-5"
                        tooltipPlacement="left"
                    />
                    {active && (
                        <button
                            type="button"
                            aria-label="Legend"
                            title="Legend"
                            onClick={(): void => setShowLegend(true)}
                            className="w-10 h-10 rounded-lg flex items-center justify-center
                                bg-accent-dark text-white"
                        >
                            <LegendIcon size={18} />
                        </button>
                    )}
                    {active && metaTarget && (
                        <MobileMetaPropertiesButton target={metaTarget} />
                    )}
                </div>
            )}
            <LegendPanelModal
                open={showLegend}
                onClose={(): void => setShowLegend(false)}
            />
        </>
    )
}

export default MobileSideActions
