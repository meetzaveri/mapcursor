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

// Mobile only. A column of buttons hangs under Share on the right edge. Locate
// me is always there (desktop has it in the zoom pill, which mobile hides).
// While one element other than a pencil stroke is selected, Legend (the same
// modal the menu drawer opens) follows, then the meta properties button when
// the element takes meta properties. Everything shares Share's right edge.

const GAP_PX = 8
/** Where the column starts if Share can't be measured: its usual bottom + gap. */
const FALLBACK_TOP_PX = 62

/** Top of the column: just under the Share button, re-measured on resize. */
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

/** A single selected element that isn't a pencil stroke. */
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

    // The modal stays mounted while open, so deselecting behind it can't
    // yank it away mid-edit.
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
