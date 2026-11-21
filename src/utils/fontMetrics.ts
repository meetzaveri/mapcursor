import { FONTS_LOADED_EVENT } from '../constants/misc'

const capRatioCache = new Map<string, number>()

const FALLBACK_CAP_RATIO = 0.68

const MEASURE_SIZE = 100

let watchingFontLoads = false

function watchFontLoads(): void {
    if (watchingFontLoads) return
    const fonts = document.fonts
    if (!fonts?.addEventListener) return
    watchingFontLoads = true
    fonts.addEventListener('loadingdone', () => {
        capRatioCache.clear()
        window.dispatchEvent(new CustomEvent(FONTS_LOADED_EVENT))
    })
}

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
            const ascent = ctx.measureText('H').actualBoundingBoxAscent
            if (Number.isFinite(ascent) && ascent > 0) {
                ratio = ascent / MEASURE_SIZE
            }
        }
    } catch {}

    if (document.fonts?.status !== 'loading') capRatioCache.set(family, ratio)
    return ratio
}

export function capCenterOffset(family: string, size: number): number {
    return (capHeightRatio(family) * size) / 2
}
