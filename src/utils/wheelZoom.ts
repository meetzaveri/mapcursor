const WHEEL_LINE_HEIGHT_PX = 33
const WHEEL_PAGE_HEIGHT_PX = 400

const MAX_WHEEL_ZOOM_STEP = 0.5

export function wheelZoomStep(e: WheelEvent): number {
    const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY

    let step: number
    if (typeof legacy === 'number' && legacy !== 0) {
        step = legacy / 1000
    } else {
        let dy = e.deltaY
        if (e.deltaMode === 1) dy *= WHEEL_LINE_HEIGHT_PX
        else if (e.deltaMode === 2) dy *= WHEEL_PAGE_HEIGHT_PX
        step = (-dy * 1.2) / 1000
    }

    return Math.max(-MAX_WHEEL_ZOOM_STEP, Math.min(MAX_WHEEL_ZOOM_STEP, step))
}
