/** The on-screen box of an SVG `<text>` node, in CSS pixels. */
export interface SvgTextScreenRect {
    left: number
    top: number
    width: number
    height: number
}

/**
 * Where a line box sits relative to the baseline, as multiples of font size.
 *
 * Measured, not guessed: a 36px sans-serif `<text>` at y=300 reports a
 * getBoundingClientRect() of top 267, height 41 in both engines. So the box is
 * 1.14em tall and its centre sits 0.35em above the baseline. Only ever used
 * for text with no glyphs, where there is nothing to measure and nothing to
 * align to.
 */
const GLYPH_BOX_RATIO = 1.14
const CENTRE_ABOVE_BASELINE = 0.35

/**
 * The on-screen box of an SVG `<text>` node — correct even when it has no
 * glyphs yet.
 *
 * **Firefox returns an all-zero rect for an EMPTY `<text>`, losing its
 * position entirely**, where Chromium returns the right origin with zero size:
 *
 * ```text
 *                          chromium              firefox
 *   empty  <text>   {x:300, y:200, w:0}   {x:0, y:0, w:0}   <- position gone
 *   filled <text>   {x:300, y:250, w:123} {x:300, y:257, w:129}
 * ```
 *
 * A text element is empty exactly once — the moment it is placed, which is
 * also the moment the editor opens over it. That made placing text on Firefox
 * look broken in a way that had nothing to do with text: `showTextInput` hides
 * the glyph layer and puts a textarea where it measured the glyphs to be, so
 * the text vanished and the editor opened off in the top-left corner of the
 * viewport. With nothing focused where the user was looking, the next click
 * committed an empty string and the tool appeared to snap straight back to
 * select.
 *
 * `getScreenCTM()` carries the whole transform chain regardless of content and
 * agrees with `getBoundingClientRect()` in both engines, so it is the
 * fallback. It resolves the text's ANCHOR — its baseline origin — from which a
 * box is synthesised via the ratios above.
 *
 * @param fontSize the text's rendered size in CSS pixels (through the camera
 * and any counter-scale), used only to synthesise the empty-text box.
 */
export function svgTextScreenRect(
    el: SVGGraphicsElement,
    fontSize: number
): SvgTextScreenRect {
    const rect = el.getBoundingClientRect()

    // Anything with glyphs measures correctly in both engines.
    if (rect.width > 0 || rect.height > 0) {
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        }
    }

    const ctm =
        typeof el.getScreenCTM === 'function' ? el.getScreenCTM() : null
    if (!ctm) {
        // Detached, or an engine without getScreenCTM. Chromium's zero-size
        // rect still carries the right origin, so it is a better answer than
        // inventing one.
        return {
            left: rect.left,
            top: rect.top,
            width: 0,
            height: 0,
        }
    }

    // Two.js leaves x/y at 0 and positions via the group transform, but read
    // them rather than assume — the CTM maps the element's own coordinate
    // system, so a non-zero x/y would otherwise be dropped.
    const x = Number(el.getAttribute('x')) || 0
    const y = Number(el.getAttribute('y')) || 0
    const anchorX = ctm.a * x + ctm.c * y + ctm.e
    const anchorY = ctm.b * x + ctm.d * y + ctm.f

    const height = fontSize * GLYPH_BOX_RATIO
    return {
        left: anchorX,
        top: anchorY - fontSize * CENTRE_ABOVE_BASELINE - height / 2,
        width: 0,
        height,
    }
}
