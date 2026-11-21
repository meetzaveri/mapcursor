// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Two = any

interface PendingRender {
    frame: number | null
    callbacks: Array<() => void>
}

const pending = new WeakMap<Two, PendingRender>()

function safeUpdate(two: Two): void {
    try {
        two.update()
    } catch (_) {
        if (two?.scene) {
            two.scene.subtractions.length = 0
            two.scene._flagSubtractions = false
        }
    }
}

function runCallbacks(entry: PendingRender): void {
    const callbacks = entry.callbacks
    entry.callbacks = []
    for (const cb of callbacks) {
        try {
            cb()
        } catch (_) {}
    }
}

export function scheduleRender(two: Two, afterRender?: () => void): void {
    if (!two) return

    let entry = pending.get(two)
    if (!entry) {
        entry = { frame: null, callbacks: [] }
        pending.set(two, entry)
    }
    if (afterRender) entry.callbacks.push(afterRender)

    if (entry.frame !== null) return

    entry.frame = requestAnimationFrame(() => {
        const current = pending.get(two)
        if (!current) return
        current.frame = null
        safeUpdate(two)
        runCallbacks(current)
    })
}

export function flushRender(two: Two): void {
    if (!two) return

    const entry = pending.get(two)
    if (entry?.frame !== null && entry !== undefined) {
        cancelAnimationFrame(entry.frame as number)
        entry.frame = null
    }
    safeUpdate(two)
    if (entry) runCallbacks(entry)
}
