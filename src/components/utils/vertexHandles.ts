import type { MutableRefObject } from 'react'
import {
    attachHandleCounterScale,
    attachStrokeCounterScale,
} from '../../utils/handleScale'
import { scheduleRender } from '../../utils/renderScheduler'
import { areaFillFor } from '../../utils/areaFill'
import {
    geometryPositions,
    lineGeometry,
    polygonGeometry,
    readGeometry,
    setGeometry,
} from '../../utils/geometry'
import type { ComponentMetadata } from '../../types/base'
import {
    selectionHandleRadiusPx,
    selectionHandleHitRadiusPx,
    HANDLE_STROKE,
    SELECTION_HANDLE_FILL,
    SELECTION_HANDLE_LINEWIDTH_PX,
} from '../../utils/selectionTheme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

const DEFAULT_HIT_BAND_PX = 22

export const VERTEX_PATH_REVERTED_EVENT = 'vertexPathReverted'

export const VERTEX_PATH_TYPES: ReadonlySet<string> = new Set(['route', 'area'])

export interface VertexPathRevertedDetail {
    id: string
    metadata: ComponentMetadata
}

export interface VertexHandlesOptions {
    two: ShapeLike
    group: ShapeLike
    path: ShapeLike
    componentId: string
    zuiRef: MutableRefObject<ShapeLike>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    persistRef: MutableRefObject<((id: string, patch: any) => void) | undefined>
    idRef: MutableRefObject<string>
    groupRef: MutableRefObject<ShapeLike>
    pathRef: MutableRefObject<ShapeLike>
    hitBandPx?: number
}

export interface VertexHandles {
    handles: ShapeLike[]
    destroy(): void
}

export function attachVertexHandles({
    two,
    group,
    path,
    componentId,
    zuiRef,
    persistRef,
    idRef,
    groupRef,
    pathRef,
    hitBandPx = DEFAULT_HIT_BAND_PX,
}: VertexHandlesOptions): VertexHandles {
    let cancelled = false

    const handles: ShapeLike[] = []
    const hitHandles: ShapeLike[] = []
    const verts = path.vertices ?? []
    for (let i = 0; i < verts.length; i++) {
        const v = verts[i]
        const handle = two.makeCircle(v.x, v.y, selectionHandleRadiusPx())
        handle.fill = SELECTION_HANDLE_FILL
        handle.stroke = HANDLE_STROKE
        handle.linewidth = SELECTION_HANDLE_LINEWIDTH_PX
        handle.opacity = 0
        group.add(handle)
        handles.push(handle)

        const hit = two.makeCircle(v.x, v.y, selectionHandleHitRadiusPx())
        hit.fill = 'transparent'
        hit.noStroke()
        group.add(hit)
        hitHandles.push(hit)
        handle.hitHandle = hit
    }

    const initialScale = zuiRef.current?.zui?.scale ?? two?.scene?.scale ?? 1
    const detachHandleScale = attachHandleCounterScale(
        [...handles, ...hitHandles],
        two,
        initialScale
    )

    let hitObserver: MutationObserver | null = null
    let detachHitScale: (() => void) | null = null
    const cleanups: Array<() => void> = []

    scheduleRender(two, () => {
        if (cancelled) return

        const pathEl = document.getElementById(path.id)
        if (pathEl) pathEl.style.cursor = 'move'

        if (pathEl) {
            const hitEl = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path'
            )
            hitEl.setAttribute('stroke', 'transparent')
            hitEl.setAttribute('fill', 'none')
            hitEl.setAttribute('pointer-events', 'stroke')
            hitEl.setAttribute('stroke-linecap', 'round')
            hitEl.setAttribute('stroke-linejoin', 'round')
            hitEl.style.cursor = 'move'
            const syncD = (): void => {
                const d = pathEl.getAttribute('d')
                if (d) hitEl.setAttribute('d', d)
            }
            syncD()
            pathEl.parentNode?.insertBefore(hitEl, pathEl)
            hitObserver = new MutationObserver(syncD)
            hitObserver.observe(pathEl, {
                attributes: true,
                attributeFilter: ['d'],
            })
            detachHitScale = attachStrokeCounterScale(
                (w) => hitEl.setAttribute('stroke-width', String(w)),
                hitBandPx,
                two,
                zuiRef.current?.zui?.scale ?? two?.scene?.scale ?? 1
            )
        }

        handles.forEach((handle, index) => {
            const dotEl = document.getElementById(handle.id)
            if (dotEl) dotEl.style.pointerEvents = 'none'

            const el = document.getElementById(handle.hitHandle?.id)
            if (!el) return
            el.style.cursor = 'move'
            el.setAttribute('class', 'dragger-picker is-vertex-handle')
            el.setAttribute('data-vertex-index', String(index))
            el.setAttribute('data-component-id', componentId)
            el.style.pointerEvents = 'none'

            const onMouseDown = (e: MouseEvent): void => {
                e.preventDefault()
                e.stopPropagation()

                const onMove = (me: MouseEvent): void => {
                    const z = zuiRef.current
                    const grp = groupRef.current
                    const pth = pathRef.current
                    if (!z?.zui || !grp || !pth) return
                    const surface = z.zui.clientToSurface(
                        me.clientX,
                        me.clientY
                    )
                    const vertex = pth.vertices[index]
                    if (!vertex) return
                    vertex.x = surface.x - grp.translation.x
                    vertex.y = surface.y - grp.translation.y
                    handle.translation.x = vertex.x
                    handle.translation.y = vertex.y
                    if (handle.hitHandle) {
                        handle.hitHandle.translation.x = vertex.x
                        handle.hitHandle.translation.y = vertex.y
                    }
                    pth._flagVertices = true
                    two.update()
                }

                const onUp = (): void => {
                    window.removeEventListener('mousemove', onMove)
                    window.removeEventListener('mouseup', onUp)
                    const grp = groupRef.current
                    const pth = pathRef.current
                    if (!grp || !pth) return
                    const points = pth.vertices.map((vx: ShapeLike) => ({
                        x: Math.round(grp.translation.x + vx.x),
                        y: Math.round(grp.translation.y + vx.y),
                    }))
                    const geometry =
                        readGeometry(grp.elementData)?.type === 'Polygon'
                            ? polygonGeometry(points)
                            : lineGeometry(points)
                    const patch = setGeometry(grp.elementData, geometry)
                    grp.elementData = { ...grp.elementData, ...patch }
                    repaintAreaFill(two, grp, pth)
                    persistRef.current?.(idRef.current, patch)
                }

                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
            }

            el.addEventListener('mousedown', onMouseDown)
            cleanups.push(() =>
                el.removeEventListener('mousedown', onMouseDown)
            )
        })
    })

    return {
        handles,
        destroy(): void {
            cancelled = true
            hitObserver?.disconnect()
            detachHitScale?.()
            detachHandleScale()
            cleanups.forEach((fn) => fn())
        },
    }
}

export function setVertexHandlesVisible(
    handles: ShapeLike[],
    visible: boolean,
    two: ShapeLike
): void {
    handles.forEach((handle) => {
        handle.opacity = visible ? 1 : 0
        const el = document.getElementById(handle.hitHandle?.id)
        if (el) el.style.pointerEvents = visible ? 'auto' : 'none'
    })
    scheduleRender(two)
}

export function applyRevertedVertices(
    two: ShapeLike,
    group: ShapeLike,
    path: ShapeLike,
    handles: ShapeLike[],
    metadata: ComponentMetadata | null | undefined
): void {
    if (!group || !path) return
    const positions = geometryPositions(readGeometry({ metadata }))
    if (positions.length === 0) return
    path.vertices.forEach((vx: ShapeLike, i: number) => {
        const v = positions[i]
        if (!v) return
        vx.x = v[0] - group.translation.x
        vx.y = v[1] - group.translation.y
    })
    handles.forEach((handle: ShapeLike, i: number) => {
        const vx = path.vertices[i]
        if (!vx) return
        handle.translation.x = vx.x
        handle.translation.y = vx.y
        if (handle.hitHandle) {
            handle.hitHandle.translation.x = vx.x
            handle.hitHandle.translation.y = vx.y
        }
    })
    path._flagVertices = true
    repaintAreaFill(two, group, path)
    two.update()
}

function repaintAreaFill(
    two: ShapeLike,
    group: ShapeLike,
    path: ShapeLike
): void {
    const data = group?.elementData
    if (data?.componentType !== 'area' || !path) return
    path.fill = areaFillFor(two, data.stroke, data.fillType, data)
}
