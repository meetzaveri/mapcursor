import { useCallback, useRef, useState } from 'react'
import { useBaseContext } from '../views/Base/baseContext'
import { requestCurrentLocation } from '../utils/geolocation'
import type { GeolocationFailure } from '../utils/geolocation'

const MAX_FIX_AGE_MS = 30 * 1000
const BLOCKED_NOTICE_MS = 9000

const FAILURE_COPY: Record<GeolocationFailure, string> = {
    denied: 'Location is blocked for this site. Allow it from the icon at the left of the address bar (site settings), then tap Locate me again.',
    timeout: 'Couldn’t get your location in time. Please try again.',
    unavailable: 'Your browser can’t share a location here.',
}

async function geolocationPermission(): Promise<PermissionState | 'unknown'> {
    try {
        const status = await navigator.permissions?.query({
            name: 'geolocation',
        })
        return status?.state ?? 'unknown'
    } catch {
        return 'unknown'
    }
}

export function useLocateMe(): { locate: () => void; locating: boolean } {
    const { goToPlace, showCanvasNotice } = useBaseContext()
    const [locating, setLocating] = useState(false)
    const busyRef = useRef(false)

    const locate = useCallback((): void => {
        if (busyRef.current) return
        busyRef.current = true
        setLocating(true)

        const run = async (): Promise<void> => {
            if ((await geolocationPermission()) === 'denied') {
                showCanvasNotice(FAILURE_COPY.denied, BLOCKED_NOTICE_MS)
                return
            }
            const outcome = await requestCurrentLocation({
                maximumAgeMs: MAX_FIX_AGE_MS,
            })
            if (outcome.ok) {
                goToPlace(outcome.anchor)
                return
            }
            showCanvasNotice(
                FAILURE_COPY[outcome.reason],
                outcome.reason === 'denied' ? BLOCKED_NOTICE_MS : 4000
            )
        }

        void run().finally(() => {
            busyRef.current = false
            setLocating(false)
        })
    }, [goToPlace, showCanvasNotice])

    return { locate, locating }
}
