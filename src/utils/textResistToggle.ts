import { computeCounterScale } from './counterScale'

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
