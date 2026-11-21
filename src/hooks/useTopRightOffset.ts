import { useLayoutEffect, useState } from 'react'

import { SHARE_BUTTON_ID } from '../components/sidebar/shapesToolbarId'

const SHARE_GAP = 8
const MEASURE_RETRIES = 10
export const RIGHT_MARGIN = 10

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
