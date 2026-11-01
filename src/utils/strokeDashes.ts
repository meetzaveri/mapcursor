// Dash patterns for map strokes (pencil, route, area), sized on SCREEN.
//
// A stroke's width is counter-scaled to stay near-constant on screen
// (counterScale.ts), but its dash pattern used to be a fixed `[8]` in surface
// units. Two ways that rendered solid:
//
//   - Zoomed out, 8 surface units shrank with the map: at z11 (camera ≈ 0.027)
//     a dash and its gap were 0.2px each, so "dashed" painted as a solid line.
//   - Pencil and route draw with ROUND caps, which add half the stroke width
//     to each end of every dash. Once the width reached the gap (an 8px pencil)
//     the caps closed the gaps at any zoom.
//
// So the pattern is chosen in screen px from the on-screen stroke width, the
// caps are allowed for, and only then is it converted to surface units for the
// current camera. It is re-derived wherever the width, the type or the camera
// changes — `applyStrokeDashes` is the one place that does it.

import { clearDashesOnTwoJSShape } from './misc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PathLike = any

/**
 * The dash pattern, in SCREEN px, for a stroke `screenWidth` px wide.
 *
 * Returns the `[dash, gap]` lengths to put in `stroke-dasharray`, already
 * corrected for the cap: a round cap paints `width / 2` past each end of a
 * dash, so the dash is shortened and the gap lengthened by one width to make
 * what is SEEN match the target. A dotted round-capped stroke therefore gets
 * zero-length dashes, which SVG paints as round dots. `[]` means solid.
 */
export function strokeDashPatternPx(
    strokeType: string | null | undefined,
    screenWidth: number,
    roundCaps: boolean
): number[] {
    if (strokeType !== 'dashed' && strokeType !== 'dotted') return []
    const w = Math.max(screenWidth, 1)
    // What the eye should see: dashes a few widths long, or dots one width
    // across, with gaps that stay open as the stroke thickens.
    const visibleDash = strokeType === 'dashed' ? Math.max(8, 3 * w) : w
    const visibleGap =
        strokeType === 'dashed' ? Math.max(6, 2 * w) : Math.max(4, 2 * w)
    if (!roundCaps) return [visibleDash, visibleGap]
    return [Math.max(visibleDash - w, 0), visibleGap + w]
}

/**
 * Paint `strokeType` onto a map stroke's path at camera `cameraScale`.
 *
 * Call it AFTER the path's (counter-scaled) linewidth is set: the pattern is
 * derived from the width the stroke actually renders at. The path must sit in
 * an unscaled group under the scene, as route, area and pencil do, so that
 * `linewidth * cameraScale` is its on-screen width.
 */
export function applyStrokeDashes(
    path: PathLike,
    strokeType: string | null | undefined,
    cameraScale: number
): void {
    if (!path) return
    const scale = Number.isFinite(cameraScale) && cameraScale > 0 ? cameraScale : 1
    const width = typeof path.linewidth === 'number' ? path.linewidth : 0
    const pattern = strokeDashPatternPx(
        strokeType,
        width * scale,
        path.cap === 'round'
    )
    path.dashes = pattern.map((px) => px / scale)
    // Two.js never removes the attribute itself when dashes go empty.
    if (pattern.length === 0) clearDashesOnTwoJSShape(path)
}
