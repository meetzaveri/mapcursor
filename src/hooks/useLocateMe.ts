// "Locate me": fly the map to the user's GPS position.
//
// Three permission states, three answers:
//
//   granted — they allowed location on the first-visit prompt (or since), so
//             this just looks up the position and flies there.
//   prompt  — they dismissed the browser's sheet, chose "Search" on the
//             first-visit prompt, or were never asked. Looking up the position
//             shows the browser's permission sheet again.
//   denied  — they clicked Block. Browsers do not let a site reopen the sheet
//             after that: getCurrentPosition fails at once with no prompt. The
//             only way back is the browser's own site settings, so this says
//             where those are instead of failing silently.
//
// Moving is camera-only on a map that has drawings: goToPlace re-anchors only
// an empty map (see base.tsx), so the ink never shifts under the user.

import { useCallback, useRef, useState } from 'react'
import { useBaseContext } from '../views/Base/baseContext'
import { requestCurrentLocation } from '../utils/geolocation'
import type { GeolocationFailure } from '../utils/geolocation'

/** A fresh-ish fix: the user may have moved since they opened the map. */
const MAX_FIX_AGE_MS = 30 * 1000
/** Long enough to read the blocked-location instructions. */
const BLOCKED_NOTICE_MS = 9000

const FAILURE_COPY: Record<GeolocationFailure, string> = {
    denied: 'Location is blocked for this site. Allow it from the icon at the left of the address bar (site settings), then tap Locate me again.',
    timeout: 'Couldn’t get your location in time. Please try again.',
    unavailable: 'Your browser can’t share a location here.',
}

/** Permissions API where available. Unknown means "just try". */
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
    // Guards a double tap during the (up to 12 s) lookup.
    const busyRef = useRef(false)

    const locate = useCallback((): void => {
        if (busyRef.current) return
        busyRef.current = true
        setLocating(true)

        const run = async (): Promise<void> => {
            // Checked first so a blocked site gets the instructions right away,
            // rather than after a failed lookup that looks like a broken button.
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
