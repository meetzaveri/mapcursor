import { DEFAULT_ANCHOR_ZOOM } from './timezoneCities'
import type { MapAnchor } from '../baseTypes/types'

export type GeolocationFailure =
    | 'denied'
    | 'unavailable'
    | 'timeout'

export type GeolocationOutcome =
    | { ok: true; anchor: MapAnchor }
    | { ok: false; reason: GeolocationFailure }

const LOOKUP_TIMEOUT_MS = 12000

export function requestCurrentLocation({
    maximumAgeMs = 5 * 60 * 1000,
}: {
    maximumAgeMs?: number
} = {}): Promise<GeolocationOutcome> {
    return new Promise<GeolocationOutcome>((resolve) => {
        const secure =
            typeof window === 'undefined' ||
            window.isSecureContext !== false
        if (!('geolocation' in navigator) || !secure) {
            resolve({ ok: false, reason: secure ? 'unavailable' : 'denied' })
            return
        }

        let settled = false
        const settle = (outcome: GeolocationOutcome): void => {
            if (settled) return
            settled = true
            clearTimeout(backstop)
            resolve(outcome)
        }

        const backstop = setTimeout(
            () => settle({ ok: false, reason: 'timeout' }),
            LOOKUP_TIMEOUT_MS
        )

        try {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { longitude, latitude } = position.coords
                    if (
                        !Number.isFinite(longitude) ||
                        !Number.isFinite(latitude)
                    ) {
                        settle({ ok: false, reason: 'unavailable' })
                        return
                    }
                    settle({
                        ok: true,
                        anchor: {
                            lngLat: [longitude, latitude],
                            zoom: DEFAULT_ANCHOR_ZOOM,
                        },
                    })
                },
                (error) => {
                    settle({
                        ok: false,
                        reason:
                            error?.code === 1
                                ? 'denied'
                                : error?.code === 3
                                  ? 'timeout'
                                  : 'unavailable',
                    })
                },
                {
                    enableHighAccuracy: false,
                    timeout: LOOKUP_TIMEOUT_MS,
                    maximumAge: maximumAgeMs,
                }
            )
        } catch (_) {
            settle({ ok: false, reason: 'unavailable' })
        }
    })
}
