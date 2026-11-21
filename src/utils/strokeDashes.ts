import { clearDashesOnTwoJSShape } from './misc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PathLike = any

export function strokeDashPatternPx(
    strokeType: string | null | undefined,
    screenWidth: number,
    roundCaps: boolean
): number[] {
    if (strokeType !== 'dashed' && strokeType !== 'dotted') return []
    const w = Math.max(screenWidth, 1)
    const visibleDash = strokeType === 'dashed' ? Math.max(8, 3 * w) : w
    const visibleGap =
        strokeType === 'dashed' ? Math.max(6, 2 * w) : Math.max(4, 2 * w)
    if (!roundCaps) return [visibleDash, visibleGap]
    return [Math.max(visibleDash - w, 0), visibleGap + w]
}

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
    if (pattern.length === 0) clearDashesOnTwoJSShape(path)
}
