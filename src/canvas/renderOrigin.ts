const SVG_NS = 'http://www.w3.org/2000/svg'

export const RENDER_ORIGIN_ID = 'mc-render-origin'

const ORIGIN_SLACK_PX = 1024

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uniformScale(scale: any): number {
    if (typeof scale === 'number') return scale
    return scale?.x ?? 1
}

function gridFor(scale: number): number {
    const raw = ORIGIN_SLACK_PX / scale
    const k = Math.max(-8, Math.min(24, Math.ceil(Math.log2(raw))))
    return Math.pow(2, k)
}

export interface RenderOriginHandle {
    current(): { x: number; y: number }
    uninstall(): void
}

export function installRenderOrigin(two: TwoLike): RenderOriginHandle {
    let wrapper: SVGGElement | null = null
    let originX = 0
    let originY = 0

    const apply = (): void => {
        const scene = two?.scene
        const sceneEl: SVGGElement | undefined = scene?._renderer?.elem
        if (!sceneEl) return

        const parent = sceneEl.parentNode as Element | null
        if (!parent) return

        if (!wrapper || sceneEl.parentNode !== wrapper) {
            if (!wrapper) {
                wrapper = document.createElementNS(SVG_NS, 'g')
                wrapper.setAttribute('id', RENDER_ORIGIN_ID)
            }
            parent.insertBefore(wrapper, sceneEl)
            wrapper.appendChild(sceneEl)
        }

        const s = uniformScale(scene.scale)
        const t = scene.translation
        if (!Number.isFinite(s) || s <= 0 || !t) return

        const width = two.width || window.innerWidth
        const height = two.height || window.innerHeight

        const centreX = (width / 2 - t.x) / s
        const centreY = (height / 2 - t.y) / s

        const grid = gridFor(s)
        originX = Math.round(centreX / grid) * grid
        originY = Math.round(centreY / grid) * grid

        wrapper.setAttribute(
            'transform',
            `matrix(${s} 0 0 ${s} ${t.x + s * originX} ${t.y + s * originY})`
        )
        sceneEl.setAttribute(
            'transform',
            `matrix(1 0 0 1 ${-originX} ${-originY})`
        )
    }

    two.bind('render', apply)
    apply()

    return {
        current: () => ({ x: originX, y: originY }),
        uninstall: (): void => {
            two.unbind('render', apply)
            const sceneEl = two?.scene?._renderer?.elem as
                | SVGGElement
                | undefined
            if (wrapper && sceneEl && sceneEl.parentNode === wrapper) {
                wrapper.parentNode?.insertBefore(sceneEl, wrapper)
                sceneEl.setAttribute('transform', 'matrix(1 0 0 1 0 0)')
                wrapper.remove()
            }
            wrapper = null
        },
    }
}
