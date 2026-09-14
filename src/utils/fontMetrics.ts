/**
 * Font metrics for optically centring canvas text.
 *
 * Two.js renders `baseline: 'middle'` as SVG `dominant-baseline: middle`, and
 * that keyword centres the **x-height**, not the glyphs: the alphabetic
 * baseline lands half an x-height below the anchor, so a line of mixed-case
 * text floats above whatever it is supposed to line up with by
 * `(capHeight - xHeight) / 2` — 9% of the font size in Inter, 12% in Caveat
 * Brush. Small enough to look like a rendering wobble, big enough to see next
 * to a point's circle at XL.
 *
 * The fix is to draw on the alphabetic baseline and place it ourselves, which
 * needs the font's real cap height — hence measuring rather than guessing.
 */

import { FONTS_LOADED_EVENT } from '../constants/misc'

// Cap height as a fraction of the font size, per family. Ratios are
// size-invariant, so one measurement covers every size. Cleared when a webfont
// lands, since anything measured before that was the fallback face.
const capRatioCache = new Map<string, number>()

// Used when there is no canvas to measure with, or the measurement comes back
// nonsense. Close to the families this app ships (0.66–0.71).
const FALLBACK_CAP_RATIO = 0.68

// Measured at a large size so rounding in the metrics costs less.
const MEASURE_SIZE = 100

/**
 * Watch for the webfonts landing: drop every measurement taken against the
 * fallback face and tell the canvas to re-place what it has already drawn.
 *
 * Registered lazily from the first measurement so importing this module has no
 * side effects (and so it is a no-op where there is no document).
 */
let watchingFontLoads = false

function watchFontLoads(): void {
    if (watchingFontLoads) return
    const fonts = document.fonts
    if (!fonts?.addEventListener) return
    watchingFontLoads = true
    // `loadingdone` rather than `document.fonts.ready`: ready is a one-shot
    // promise for the batch in flight when it was read, and a face requested
    // later — a family the user picks from the font menu — would never reach a
    // listener hung off it.
    fonts.addEventListener('loadingdone', () => {
        capRatioCache.clear()
        window.dispatchEvent(new CustomEvent(FONTS_LOADED_EVENT))
    })
}

/**
 * Cap height of `family`, as a fraction of the font size.
 *
 * A webfont that hasn't finished loading measures as the FALLBACK face, so a
 * measurement taken while anything is still in flight is provisional: it is
 * returned (a placed label beats no label) but not cached, and `loadingdone`
 * clears the cache and re-places the label for real.
 *
 * The settled test is `document.fonts.status`, deliberately not
 * `document.fonts.check(...)`. check() reports **true** for a face that is
 * still downloading under `font-display: swap` — measured here at 0.662 for
 * Avenir against its real 0.708 — so guarding on it cached the fallback's ratio
 * for the session and left every pin's label ~2% of its size high. That is the
 * bug tests/e2e/point-label-text.spec.js caught on CI, where a cold cache made
 * the swap window wide enough to cover the first paint.
 */
export function capHeightRatio(family: string): number {
    const cached = capRatioCache.get(family)
    if (cached !== undefined) return cached

    if (typeof document === 'undefined') return FALLBACK_CAP_RATIO
    watchFontLoads()

    let ratio = FALLBACK_CAP_RATIO
    try {
        const ctx = document.createElement('canvas').getContext('2d')
        if (ctx) {
            ctx.font = `${MEASURE_SIZE}px "${family}"`
            // 'H' has no overshoot and no descender, so its ink ascent is the
            // cap height.
            const ascent = ctx.measureText('H').actualBoundingBoxAscent
            if (Number.isFinite(ascent) && ascent > 0) {
                ratio = ascent / MEASURE_SIZE
            }
        }
    } catch {
        // Keep the fallback — a mis-centred label beats a canvas that throws.
    }

    if (document.fonts?.status !== 'loading') capRatioCache.set(family, ratio)
    return ratio
}

/**
 * How far DOWN to place a text node drawn on the alphabetic baseline
 * (`baseline: 'baseline'`) so its cap band — baseline up to cap height — is
 * centred on the node's anchor point.
 *
 * The cap band, deliberately, rather than the full ink box: centring on the ink
 * would make a label hop the moment someone typed a descender.
 */
export function capCenterOffset(family: string, size: number): number {
    return (capHeightRatio(family) * size) / 2
}
