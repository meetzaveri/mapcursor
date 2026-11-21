export interface SvgTextScreenRect {
    left: number
    top: number
    width: number
    height: number
}

const GLYPH_BOX_RATIO = 1.14
const CENTRE_ABOVE_BASELINE = 0.35

export function svgTextScreenRect(
    el: SVGGraphicsElement,
    fontSize: number
): SvgTextScreenRect {
    const rect = el.getBoundingClientRect()

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
        return {
            left: rect.left,
            top: rect.top,
            width: 0,
            height: 0,
        }
    }

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
