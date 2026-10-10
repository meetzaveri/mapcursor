// Bounds a dragged text size by what the user SEES.
//
// Text renders at `size * effectiveScale`, where effectiveScale is the camera
// scale times the text's own counter-scale. With zoom resistance on, that
// product stays near 1, so surface units and screen px roughly agree. With it
// off, it is the raw camera scale, and a surface-unit clamp moves with the
// camera: [8, 300] units capped a label at ~37px three zooms out and floored
// it at 64px three zooms in. So the clamp applies in screen px, and the result
// is converted back to surface units.

const MIN_SCREEN_PX = 8
const MAX_SCREEN_PX = 300

/**
 * The surface-unit font size for a drag that asks for `requestedSize`
 * (surface units), clamped so it renders between 8 and 300 screen px.
 * Rounded to hundredths rather than whole units: zoomed in, one surface unit
 * is several screen px, and whole-unit steps would make the drag jumpy.
 */
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
