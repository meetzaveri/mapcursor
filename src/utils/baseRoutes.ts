// Which URL a base lives at, in one place.
//
// Every base is a map, so there is exactly one path — `/map/:id`. Several
// unrelated bits of the app need to ask "is this a base opened from a URL?" or
// "what link do I hand the user?". Those questions were answered by hard-coded
// string tests scattered across the canvas and the toolbar; answer them here.

/** URL segment a base is served under. */
export const BASE_PATH_PREFIX = '/map/'

/**
 * Is this path a base loaded from a URL, rather than the local draft at `/`?
 *
 * Gates the two "the camera may be pointing at nothing — rescue it" features
 * (auto-fit-on-load and the Go-to-content pill). Both are for bases that
 * arrived with someone else's camera; `/` lands on deliberately-placed content
 * and needs no rescue.
 */
export function isUrlBasePath(
    pathname: string = typeof window !== 'undefined'
        ? window.location.pathname
        : ''
): boolean {
    return pathname.startsWith(BASE_PATH_PREFIX)
}

/** Path a base lives at (no origin), e.g. `/map/<id>`. */
export function basePath(baseId: string): string {
    return `${BASE_PATH_PREFIX}${baseId}`
}

/** Absolute link to a base — what Share copies and what the user pastes. */
export function baseUrl(baseId: string): string {
    return `${window.location.origin}${basePath(baseId)}`
}
