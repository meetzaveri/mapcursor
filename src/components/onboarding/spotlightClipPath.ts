export interface HoleRect {
    left: number
    top: number
    width: number
    height: number
}

export function padRect(rect: DOMRect, pad: number): HoleRect {
    return {
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
    }
}

export function spotlightClipPath(
    viewWidth: number,
    viewHeight: number,
    hole: HoleRect,
    radius: number
): string {
    const { left: x, top: y, width: w, height: h } = hole
    const r = Math.min(radius, w / 2, h / 2)
    const arc = `A${r} ${r} 0 0 1`
    const outer = `M0 0H${viewWidth}V${viewHeight}H0Z`
    const inner =
        `M${x + r} ${y}H${x + w - r}${arc} ${x + w} ${y + r}` +
        `V${y + h - r}${arc} ${x + w - r} ${y + h}` +
        `H${x + r}${arc} ${x} ${y + h - r}` +
        `V${y + r}${arc} ${x + r} ${y}Z`
    return `path(evenodd, '${outer}${inner}')`
}
