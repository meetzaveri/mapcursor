const MIN_SCREEN_PX = 8
const MAX_SCREEN_PX = 300

export function clampTextSizeOnScreen(
    requestedSize: number,
    effectiveScale: number
): number {
    const eff = effectiveScale > 0 ? effectiveScale : 1
    const screenSize = Math.min(
        Math.max(requestedSize * eff, MIN_SCREEN_PX),
        MAX_SCREEN_PX
    )
    return Math.round((screenSize / eff) * 100) / 100
}
