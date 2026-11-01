// Keeping a text's on-screen size steady when its "Zoom resistant" switch flips.
//
// A text renders at `fontSize * camera * counterScale(camera, resist)`. The
// switch only changes `resist` (TEXT_RESIST ⇄ 0), so flipping it alone makes
// the label jump by `camera ^ -resist`: turned off at z8 (camera ≈ 0.004) an
// 18px caption fell to a fraction of a pixel, too small even to click. So the
// switch also rescales `fontSize` by the ratio of the two counter-scales, which
// leaves the product (what the user sees) unchanged at the camera the switch was
// flipped under. From then on the label follows its new model as the map zooms.

import { computeCounterScale } from './counterScale'

/**
 * The font size (surface units) that renders `fontSize` at the same on-screen
 * size once the text's resist changes from `fromResist` to `toResist`, at
 * camera `cameraScale`.
 *
 * Not rounded. Zoomed in the result can be a fraction of a unit (camera 64
 * turns 18 into ~0.43), where even hundredths would visibly shift the label —
 * and the whole point is that nothing moves. The column is a float.
 */
export function rescaleTextSizeForResist(
    fontSize: number,
    cameraScale: number,
    fromResist: number,
    toResist: number
): number {
    const before = computeCounterScale(cameraScale, fromResist)
    const after = computeCounterScale(cameraScale, toResist)
    if (!(fontSize > 0) || !(before > 0) || !(after > 0)) return fontSize
    return (fontSize * before) / after
}
