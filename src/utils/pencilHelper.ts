import { geometryPositions, readGeometry, readProperties } from './geometry'
import type { GeometrySource } from './geometry'

const SLOW_VELOCITY = 0.1
const FAST_VELOCITY = 1.5

export interface PencilPoint {
    x: number
    y: number
    lw?: number
}

export function pencilPointsOf(
    source: GeometrySource | null | undefined
): PencilPoint[] {
    const positions = geometryPositions(readGeometry(source))
    const widths = readProperties(source).widths
    const widthList = Array.isArray(widths) ? widths : []
    return positions.map(([x, y], index) => {
        const lw = widthList[index]
        return typeof lw === 'number' ? { x, y, lw } : { x, y }
    })
}

export function velocityToLinewidth(velocity: number, baseWidth: number): number {
    const maxWidth = baseWidth * 2.5
    const minWidth = baseWidth * 0.5

    const clampedVelocity = Math.max(
        SLOW_VELOCITY,
        Math.min(FAST_VELOCITY, velocity)
    )

    const t =
        (clampedVelocity - SLOW_VELOCITY) / (FAST_VELOCITY - SLOW_VELOCITY)
    return maxWidth - t * (maxWidth - minWidth)
}

export function smoothLinewidth(
    prevWidth: number,
    targetWidth: number,
    factor = 0.3
): number {
    return prevWidth + factor * (targetWidth - prevWidth)
}

export function mergeSegmentsByLinewidth(
    points: PencilPoint[],
    lwTolerance = 0.3
): PencilPoint[][] {
    if (points.length <= 1) return [points]

    const segments: PencilPoint[][] = []
    let currentSegment: PencilPoint[] = [points[0]!]

    for (let i = 1; i < points.length; i++) {
        const prevLw = currentSegment[currentSegment.length - 1]!.lw ?? 1
        const currLw = points[i]!.lw ?? 1

        if (
            Math.abs(currLw - prevLw) / Math.max(prevLw, currLw) <=
            lwTolerance
        ) {
            currentSegment.push(points[i]!)
        } else {
            segments.push(currentSegment)
            currentSegment = [
                currentSegment[currentSegment.length - 1]!,
                points[i]!,
            ]
        }
    }

    if (currentSegment.length > 0) {
        segments.push(currentSegment)
    }

    return segments
}

export function chaikinSmooth(
    points: PencilPoint[],
    iterations = 1
): PencilPoint[] {
    if (points.length < 3 || iterations < 1) return points
    let result = points
    for (let iter = 0; iter < iterations; iter++) {
        const next: PencilPoint[] = [result[0]!]
        for (let i = 0; i < result.length - 1; i++) {
            const p = result[i]!
            const q = result[i + 1]!
            next.push({
                x: 0.75 * p.x + 0.25 * q.x,
                y: 0.75 * p.y + 0.25 * q.y,
                lw: p.lw,
            })
            next.push({
                x: 0.25 * p.x + 0.75 * q.x,
                y: 0.25 * p.y + 0.75 * q.y,
                lw: q.lw,
            })
        }
        next.push(result[result.length - 1]!)
        result = next
    }
    return result
}

export function averageLinewidth(points: PencilPoint[]): number {
    if (points.length === 0) return 1
    const sum = points.reduce((acc, p) => acc + (p.lw ?? 1), 0)
    return sum / points.length
}
