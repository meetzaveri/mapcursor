import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import {
    GROUP_COMPONENT,
    isStandaloneTextType,
    SELECT_COMPONENT_EVENT,
} from '../constants/misc'
import { generateUUID } from '../utils/misc'
import {
    readProperties,
    setProperties,
    translateGeometry,
} from '../utils/geometry'
import {
    cloneElementData,
    getShapeTextNodes,
    pollUntilElement,
} from '../utils/canvasUtils'
import type { ComponentRecord, ComponentStore } from '../types/base'
import type { HistoryEntry } from './useComponentHistory'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZuiInstanceLike = any

interface SingleClipboardPayload {
    kind: 'single'
    origin: { x: number; y: number }
    items: ComponentRecord[]
}

interface GroupClipboardPayload {
    kind: 'group'
    origin: { x: number; y: number }
    width?: number
    height?: number
    items: ComponentRecord[]
}

type ClipboardPayload = SingleClipboardPayload | GroupClipboardPayload

interface MousePosition {
    clientX: number
    clientY: number
    hasMoved: boolean
}

export interface CanvasClipboardOptions {
    twoJSInstance: TwoLike | null
    zuiInstanceRef: MutableRefObject<ZuiInstanceLike | null>
    baseId: string
    addToLocalComponentStore: (
        id: string,
        componentType: string,
        record: ComponentRecord,
        skipHistory?: boolean
    ) => void
    recordBatchToHistoryLog: (entries: HistoryEntry[]) => void
    renderGroupRef: MutableRefObject<
        ((groups: ComponentRecord[]) => void) | null
    >
    stateRefForComponentStore: MutableRefObject<ComponentStore | undefined>
    onPasted?: (objectIdMap: Map<string, string>) => void
}

export interface CanvasClipboardApi {
    clipboardRef: MutableRefObject<ClipboardPayload | null>
    lastMouseRef: MutableRefObject<MousePosition>
}

export function useCanvasClipboard({
    twoJSInstance,
    zuiInstanceRef,
    baseId,
    addToLocalComponentStore,
    recordBatchToHistoryLog,
    renderGroupRef,
    stateRefForComponentStore,
    onPasted,
}: CanvasClipboardOptions): CanvasClipboardApi {
    const clipboardRef = useRef<ClipboardPayload | null>(null)
    const onPastedRef = useRef(onPasted)
    onPastedRef.current = onPasted
    const lastMouseRef = useRef<MousePosition>({
        clientX: 0,
        clientY: 0,
        hasMoved: false,
    })

    const rebindClonedArrow = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cloned: any,
        idMap: Map<string, string>
    ): { shapeId: string; edge: string }[] => {
        const ports: { shapeId: string; edge: string }[] = []
        const store = stateRefForComponentStore.current
        ;(['tail', 'head'] as const).forEach((end) => {
            const shapeKey = `${end}ShapeId`
            const edgeKey = `${end}Edge`
            const indexKey = `${end}PortIndex`
            const boundId = cloned[shapeKey]
            const edge = cloned[edgeKey]
            if (typeof boundId !== 'string' || typeof edge !== 'string') return
            const mapped = idMap.get(boundId)
            if (mapped) {
                cloned[shapeKey] = mapped
                ports.push({ shapeId: mapped, edge })
            } else if (store?.[boundId]) {
                ports.push({ shapeId: boundId, edge })
            } else {
                cloned[shapeKey] = null
                cloned[edgeKey] = null
                cloned[indexKey] = 0
            }
        })
        return ports
    }

    const restackWhenMounted = (
        arrowId: string,
        ports: { shapeId: string; edge: string }[]
    ): void => {
        if (!ports.length || !twoJSInstance) return
        pollUntilElement(twoJSInstance, arrowId, () => {
            window.dispatchEvent(
                new CustomEvent('restackPorts', { detail: { ports } })
            )
        })
    }

    const selectWhenMounted = (id: string): void => {
        if (!twoJSInstance) return
        pollUntilElement(twoJSInstance, id, () => {
            window.dispatchEvent(
                new CustomEvent(SELECT_COMPONENT_EVENT, { detail: { id } })
            )
        })
    }

    useEffect(() => {
        const onMove = (e: MouseEvent): void => {
            lastMouseRef.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                hasMoved: true,
            }
        }
        window.addEventListener('mousemove', onMove)
        return (): void => window.removeEventListener('mousemove', onMove)
    }, [])

    useEffect(() => {
        const onCopyEvent = (evt: KeyboardEvent): void => {
            if (evt.key !== 'c' || !(evt.ctrlKey || evt.metaKey)) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const zuiInst = zuiInstanceRef.current
            const liveGroup = zuiInst?.getSelectedGroup?.()
            if (!liveGroup?.elementData?.id) return
            if (!twoJSInstance) return
            evt.preventDefault()

            const originX = liveGroup.translation.x
            const originY = liveGroup.translation.y
            const elementData = liveGroup.elementData

            let payload: ClipboardPayload
            if (elementData.componentType === GROUP_COMPONENT) {
                const children: ComponentRecord[] = Array.isArray(
                    elementData.children
                )
                    ? elementData.children
                    : []
                payload = {
                    kind: 'group',
                    origin: { x: originX, y: originY },
                    width: elementData.width,
                    height: elementData.height,
                    items: children.map((child) => ({ ...child })),
                }
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const item: any = {
                    ...elementData,
                    x: originX,
                    y: originY,
                    relativeX: 0,
                    relativeY: 0,
                }
                if (
                    elementData.componentType === 'arrowLine' ||
                    elementData.componentType === 'line'
                ) {
                    const line = liveGroup.children?.[0]
                    if (line?.vertices?.length >= 2) {
                        item.x1 = parseInt(String(line.vertices[0].x))
                        item.y1 = parseInt(String(line.vertices[0].y))
                        item.x2 = parseInt(String(line.vertices[1].x))
                        item.y2 = parseInt(String(line.vertices[1].y))
                    }
                }
                if (isStandaloneTextType(elementData.componentType)) {
                    const textNodes = getShapeTextNodes(liveGroup)
                    const firstNode = textNodes[0]
                    if (firstNode && typeof firstNode.value === 'string') {
                        item.textColor = item.textColor || firstNode.fill
                        const stored = readProperties(item)
                        Object.assign(
                            item,
                            setProperties(item, {
                                content: textNodes
                                    .map((n) => n.value)
                                    .join('\n'),
                                fontSize: firstNode.size || stored.fontSize,
                                textFontFamily:
                                    firstNode.family || stored.textFontFamily,
                            })
                        )
                    }
                }
                payload = {
                    kind: 'single',
                    origin: { x: originX, y: originY },
                    items: [item],
                }
            }
            clipboardRef.current = payload
        }
        window.addEventListener('keydown', onCopyEvent)
        return (): void => window.removeEventListener('keydown', onCopyEvent)
    }, [twoJSInstance, zuiInstanceRef])

    useEffect(() => {
        const onPasteEvent = (evt: KeyboardEvent): void => {
            if (evt.key !== 'v' || !(evt.ctrlKey || evt.metaKey)) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            const clipboard = clipboardRef.current
            if (!clipboard || !clipboard.items?.length) return

            const zuiInst = zuiInstanceRef.current
            if (!zuiInst?.zui) return
            evt.preventDefault()

            let clientX = lastMouseRef.current.clientX
            let clientY = lastMouseRef.current.clientY
            if (!lastMouseRef.current.hasMoved) {
                const rect = document
                    .getElementById('main-two-root')
                    ?.getBoundingClientRect()
                if (rect) {
                    clientX = rect.left + rect.width / 2
                    clientY = rect.top + rect.height / 2
                }
            }
            const surface = zuiInst.zui.clientToSurface(clientX, clientY)
            const px = surface.x
            const py = surface.y

            if (clipboard.kind === 'single') {
                const src = clipboard.items[0]
                if (!src) return
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newItem: any = cloneElementData(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    src as any,
                    baseId,
                    px,
                    py
                )
                let arrowPorts: { shapeId: string; edge: string }[] = []
                if (
                    src.componentType === 'arrowLine' ||
                    src.componentType === 'line'
                ) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const s = src as any
                    const dx = (s.x2 ?? 0) - (s.x1 ?? 0)
                    const dy = (s.y2 ?? 0) - (s.y1 ?? 0)
                    newItem.x1 = 0
                    newItem.y1 = 0
                    newItem.x2 = dx
                    newItem.y2 = dy
                }
                if (src.componentType === 'arrowLine') {
                    arrowPorts = rebindClonedArrow(newItem, new Map())
                }
                addToLocalComponentStore(
                    newItem.id,
                    newItem.componentType,
                    newItem
                )
                if (typeof src.id === 'string') {
                    onPastedRef.current?.(new Map([[src.id, newItem.id]]))
                }
                restackWhenMounted(newItem.id, arrowPorts)
                window.dispatchEvent(new CustomEvent('clearSelector', {}))
                selectWhenMounted(newItem.id)
                return
            }

            if (clipboard.kind === 'group') {
                const idMap = new Map<string, string>()
                const newChildren = clipboard.items.map((child) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const c = child as any
                    const rX = c.relativeX ?? 0
                    const rY = c.relativeY ?? 0
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const cloned: any = cloneElementData(c, baseId, rX, rY)
                    cloned.relativeX = rX
                    cloned.relativeY = rY
                    if (typeof c.id === 'string') idMap.set(c.id, cloned.id)
                    return cloned
                })
                const arrowRestacks: {
                    arrowId: string
                    ports: { shapeId: string; edge: string }[]
                }[] = []
                newChildren.forEach((cloned) => {
                    if (cloned.componentType !== 'arrowLine') return
                    const ports = rebindClonedArrow(cloned, idMap)
                    if (ports.length) {
                        arrowRestacks.push({ arrowId: cloned.id, ports })
                    }
                })

                const memberIds: string[] = []
                const pasteBatchEntries: HistoryEntry[] = []
                newChildren.forEach((child: ComponentRecord) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const c = child as any
                    const absX = px + (c.relativeX ?? 0)
                    const absY = py + (c.relativeY ?? 0)

                    const rebased = translateGeometry(c, px, py)
                    const memberData = {
                        ...c,
                        x: absX,
                        y: absY,
                        ...(rebased ? { metadata: rebased.metadata } : {}),
                    }
                    memberIds.push(c.id)
                    addToLocalComponentStore(
                        c.id,
                        c.componentType,
                        memberData,
                        true
                    )
                    const {
                        relativeX: _rx,
                        relativeY: _ry,
                        ...storedShape
                    } = memberData
                    pasteBatchEntries.push({
                        action: 'ADD',
                        id: c.id,
                        componentInfo: storedShape as ComponentRecord,
                    })
                })
                if (pasteBatchEntries.length > 0) {
                    recordBatchToHistoryLog(pasteBatchEntries)
                }
                onPastedRef.current?.(idMap)

                arrowRestacks.forEach(({ arrowId, ports }) =>
                    restackWhenMounted(arrowId, ports)
                )

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newGroup: any = {
                    id: generateUUID(),
                    baseId,
                    componentType: GROUP_COMPONENT,
                    x: px,
                    y: py,
                    width: clipboard.width,
                    height: clipboard.height,
                    fill: null,
                    stroke: null,
                    children: newChildren,
                    membersToHide: memberIds,
                }

                const lastId = memberIds[memberIds.length - 1]
                if (lastId && twoJSInstance) {
                    pollUntilElement(twoJSInstance, lastId, () => {
                        renderGroupRef.current?.([newGroup])
                    })
                } else {
                    renderGroupRef.current?.([newGroup])
                }
            }
        }
        window.addEventListener('keydown', onPasteEvent)
        return (): void => window.removeEventListener('keydown', onPasteEvent)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseId, addToLocalComponentStore])

    return { clipboardRef, lastMouseRef }
}
