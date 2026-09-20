import { useLayoutEffect, useState } from 'react'

import { SHARE_BUTTON_ID } from '../components/sidebar/shapesToolbarId'

/** Gap kept between a follower and the share button it measures against. */
const SHARE_GAP = 8
/** Frames to keep re-measuring the share button while it settles. */
const MEASURE_RETRIES = 10
/** Right margin when nothing needs avoiding in that corner. */
export const RIGHT_MARGIN = 10

/**
 * How far from the right edge a piece of top-right chrome has to sit to clear
 * the share button.
 *
 * Measured, not a constant: the share control's width is not a follower's to
 * know, and a hard-coded guess silently overlaps the moment its padding
 * changes. Falls back to the bare right margin when there is no share button to
 * avoid.
 *
 * Re-measured for a few frames after mount because the share row settles late
 * (its label swaps between "Saving…" and "Live"), and on resize.
 *
 * Extracted from `placeSearch.tsx` when the legend panel needed to line up with
 * the search field: two pieces of chrome stacking in one corner must agree on
 * where that corner starts, and the only way to guarantee that is one reader.
 */
export function useTopRightOffset(isActive: boolean): number {
    const [rightOffset, setRightOffset] = useState<number>(RIGHT_MARGIN)

    useLayoutEffect(() => {
        if (!isActive) {
            setRightOffset(RIGHT_MARGIN)
            return
        }
        let frame = 0
        let cancelled = false
        const measure = (): void => {
            if (cancelled) return
            const rect = document
                .getElementById(SHARE_BUTTON_ID)
                ?.getBoundingClientRect()
            setRightOffset(
                rect && rect.width > 0
                    ? window.innerWidth - rect.left + SHARE_GAP
                    : RIGHT_MARGIN
            )
            if (frame++ < MEASURE_RETRIES) requestAnimationFrame(measure)
        }
        measure()
        window.addEventListener('resize', measure)
        return (): void => {
            cancelled = true
            window.removeEventListener('resize', measure)
        }
    }, [isActive])

    return rightOffset
}
