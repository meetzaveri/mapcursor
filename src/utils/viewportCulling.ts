import { GROUP_COMPONENT } from '../constants/misc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Two = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SceneChild = any

const DEFAULT_MARGIN_PX = 300

export const CULLED_FLAG = '__mcCulled'

export const BASE_TYPE_HIDDEN_FLAG = '__mcBaseTypeHidden'

interface WorldBounds {
    tx: number
    ty: number
    left: number
    top: number
    right: number
    bottom: number
}

const boundsCache = new WeakMap<SceneChild, WorldBounds>()

function worldBounds(child: SceneChild): WorldBounds | null {
    const cached = boundsCache.get(child)
    const tx = child.translation.x
    const ty = child.translation.y
    if (cached && cached.tx === tx && cached.ty === ty) return cached

    let rect
    try {
        rect = child.getBoundingClientRect(true)
    } catch {
        return null
    }
    if (!rect) return null
    const { left, top, right, bottom } = rect
    if (![left, top, right, bottom].every((n) => Number.isFinite(n)))
        return null

    const b: WorldBounds = { tx, ty, left, top, right, bottom }
    boundsCache.set(child, b)
    return b
}

function isCullable(child: SceneChild): boolean {
    const data = child?.elementData
    if (!data?.id) return false
    if (data.componentType === GROUP_COMPONENT) return false
    if (data.isDummy === true) return false
    if (child[BASE_TYPE_HIDDEN_FLAG] === true) return false
    return true
}

export interface CullStats {
    visible: number
    culled: number
    total: number
}

export function cullToViewport(
    two: Two,
    marginPx: number = DEFAULT_MARGIN_PX
): CullStats {
    const scene = two?.scene
    if (!scene) return { visible: 0, culled: 0, total: 0 }

    const scale = scene.scale || 1
    const tx = scene.translation.x
    const ty = scene.translation.y
    const vw = window.innerWidth
    const vh = window.innerHeight

    let visible = 0
    let culled = 0
    let total = 0

    for (const child of scene.children) {
        if (!isCullable(child)) continue
        total++

        const wb = worldBounds(child)
        if (!wb) {
            if (child.visible === false && child[CULLED_FLAG]) {
                child.visible = true
                child[CULLED_FLAG] = false
            }
            visible++
            continue
        }

        const sLeft = wb.left * scale + tx
        const sRight = wb.right * scale + tx
        const sTop = wb.top * scale + ty
        const sBottom = wb.bottom * scale + ty

        const onScreen =
            sRight > -marginPx &&
            sLeft < vw + marginPx &&
            sBottom > -marginPx &&
            sTop < vh + marginPx

        if (onScreen) {
            if (child.visible === false && child[CULLED_FLAG]) {
                child.visible = true
                child[CULLED_FLAG] = false
            }
            visible++
        } else if (child.visible !== false) {
            child.visible = false
            child[CULLED_FLAG] = true
            culled++
        } else if (child[CULLED_FLAG]) {
            culled++
        }
    }

    return { visible, culled, total }
}

export function uncullViewport(two: Two): void {
    const scene = two?.scene
    if (!scene) return
    for (const child of scene.children) {
        if (!child[CULLED_FLAG]) continue
        child[CULLED_FLAG] = false
        if (child[BASE_TYPE_HIDDEN_FLAG] === true) continue
        child.visible = true
    }
}
