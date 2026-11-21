import React, { useEffect, useState, useRef } from 'react'
import type { ReactElement } from 'react'
import Two from 'two.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const factoryModules: Record<string, () => Promise<any>> = import.meta.glob(
    '../../factory/*.ts'
)
import { useBaseContext } from '../../views/Base/baseContext'
import getEditComponents from '../utils/editWrapper'
import {
    selectionHandleRadiusPx,
    selectionHandleHitRadiusPx,
    HANDLE_STROKE,
    SELECTION_HANDLE_FILL,
    SELECTION_HANDLE_LINEWIDTH_PX,
} from '../../utils/selectionTheme'
import {
    VERTEX_PATH_TYPES,
    VERTEX_PATH_REVERTED_EVENT,
} from '../utils/vertexHandles'
import { elementOnBlurHandler } from '../../utils/misc'
import {
    updateX1Y1Vertices,
    updateX2Y2Vertices,
} from '../../utils/updateVertices'
import {
    componentTypes,
    isStandaloneTextType,
} from '../../constants/misc'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
} from '../../factory/circleLabel'
import {
    applyCounterScaleToCopies,
    applyCounterScaleToCopy,
} from '../../utils/counterScale'
import {
    geometryPositions,
    readGeometry,
    readProperties,
    scaleGeometry,
    setProperties,
    translateGeometry,
} from '../../utils/geometry'

const GROUP_RESIZE_ENABLED = true
const GROUP_RESIZE_MIN_SCALE = 0.1
const GROUP_RESIZE_MIN_STROKE = 0.5
import {
    applyShapeText,
    getGroupFill,
    layoutStandaloneText,
    readOpacity,
    groupOpacityOf,
    focusSvgElement,
} from '../../utils/canvasUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

const orderGroupChildrenByZ = (group: ShapeLike): void => {
    group.children.sort((a: ShapeLike, b: ShapeLike) => {
        const aHas = !!a?.elementData
        const bHas = !!b?.elementData
        if (aHas !== bHas) return aHas ? 1 : -1
        const pa = Number.isFinite(a?.elementData?.position)
            ? a.elementData.position
            : 0
        const pb = Number.isFinite(b?.elementData?.position)
            ? b.elementData.position
            : 0
        if (pa !== pb) return pa - pb
        const ca = Number.isFinite(a?.elementData?.createdAt)
            ? a.elementData.createdAt
            : 0
        const cb = Number.isFinite(b?.elementData?.createdAt)
            ? b.elementData.createdAt
            : 0
        if (ca !== cb) return ca - cb
        return String(a?.elementData?.id ?? '').localeCompare(
            String(b?.elementData?.id ?? '')
        )
    })
}

function GroupedObjectWrapper(props: ElementProps): ReactElement {
    const {
        addToLocalComponentStore,
        updateComponentBulkPropertiesInLocalStore,
        deleteBulkComponentsFromLocalStore,
        recordBatchToHistoryLog,
        stateRefForComponentStore,
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
        zuiInBase,
    } = useBaseContext()

    const two = props.twoJSInstance
    const [deleteGroupElements, setDeleteGroupElements] =
        useState<ShapeLike>(null)
    const [groupId, setGroupId] = useState<string | null>(null)
    const isDeletingRef = useRef(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resizeStateRef = useRef<any>(null)
    const sizeHandlesRef = useRef<((effectiveScale: number) => void) | null>(
        null
    )
    const lastCommitPosRef = useRef<{ x: number; y: number } | null>(null)
    let groupInstance: ShapeLike = null
    let selectorInstance: ShapeLike = null

    function isInScene(element: ShapeLike): boolean {
        return element && two.scene.children.includes(element)
    }

    function dismissOverlayNode(): void {
        selectorInstance?.hide?.()
        window.dispatchEvent(new CustomEvent('groupBlurred'))
        try {
            two.remove([groupInstance])
            two.update()
        } catch (err) {
            console.warn('two.update() during group overlay teardown:', err)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const scene = two.scene as any
            scene.subtractions.length = 0
            scene._flagSubtractions = false
        }
    }

    function revealMembers(): void {
        const childrenIds = props.children.map((i: ShapeLike) => i.id)
        two.scene.children.forEach((element: ShapeLike) => {
            if (!element.elementData) return
            if (!childrenIds.includes(element.elementData.id)) return
            element.opacity = groupOpacityOf(element.elementData)
        })
    }

    function commitGroupMove(): void {
        if (isDeletingRef.current) return
        if (!groupInstance || !isInScene(groupInstance)) return

        const gx = parseInt(String(groupInstance.translation.x))
        const gy = parseInt(String(groupInstance.translation.y))
        const baseline = lastCommitPosRef.current
        if (
            baseline &&
            Math.abs(gx - baseline.x) < 0.5 &&
            Math.abs(gy - baseline.y) < 0.5
        ) {
            return
        }

        const userId = localStorage.getItem('userId')
        const childrenIds = props.children.map((i: ShapeLike) => i.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batchEntries: any[] = []

        two.scene.children.forEach((element: ShapeLike) => {
            if (!element.elementData) return
            if (!childrenIds.includes(element.elementData.id)) return

            let relativeData: ShapeLike = {}
            props.children.forEach((item: ShapeLike) => {
                if (item.id === element.elementData.id) relativeData = item
            })
            const prevTx = element.translation.x
            const prevTy = element.translation.y
            const newX = gx + parseInt(String(relativeData.x))
            const newY = gy + parseInt(String(relativeData.y))
            element.translation.x = newX
            element.translation.y = newY

            const moved = translateGeometry(
                element.elementData,
                newX - prevTx,
                newY - prevTy,
                { round: false }
            )
            const newMetadata = moved
                ? moved.metadata
                : element.elementData.metadata

            const childId = element.elementData.id
            const current = (stateRefForComponentStore?.current?.[childId] ??
                {}) as ShapeLike
            const updateObj = {
                metadata: newMetadata,
                x: newX,
                y: newY,
                updatedBy: userId,
            }
            const positionChanged =
                current.x !== updateObj.x || current.y !== updateObj.y
            const metadataChanged = newMetadata !== current.metadata
            if (!positionChanged && !metadataChanged) return

            const prevProps = {
                metadata: current.metadata,
                x: current.x,
                y: current.y,
                updatedBy: current.updatedBy,
            }
            updateComponentBulkPropertiesInLocalStore(childId, updateObj, true)
            batchEntries.push({
                action: 'UPDATE_BULK',
                id: childId,
                prevProps,
                bulkObj: updateObj,
            })
        })

        if (batchEntries.length > 0) {
            recordBatchToHistoryLog(batchEntries)
        }
        lastCommitPosRef.current = { x: gx, y: gy }
        two.update()
    }

    function onBlurHandler(e: FocusEvent): void {
        elementOnBlurHandler(e, selectorInstance, two)
        window.dispatchEvent(new CustomEvent('groupBlurred'))
        if (!isDeletingRef.current) {
            commitGroupMove()

            const childrenIdsOfTheGroup = props.children.map(
                (item: ShapeLike) => item.id
            )
            let foundOriginalCount = 0
            two.scene.children.forEach((element: ShapeLike) => {
                if (!element.elementData) return
                if (childrenIdsOfTheGroup.includes(element.elementData.id)) {
                    foundOriginalCount++
                    element.opacity = groupOpacityOf(element.elementData)
                }
            })
            two.update()

            if (foundOriginalCount === 0 && props.children.length > 0) {
                const gx = parseInt(String(groupInstance.translation.x))
                const gy = parseInt(String(groupInstance.translation.y))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const batchEntries: any[] = []
                props.children.forEach((child: ShapeLike) => {
                    const localX = parseInt(
                        String(child.x ?? child.relativeX ?? 0)
                    )
                    const localY = parseInt(
                        String(child.y ?? child.relativeY ?? 0)
                    )
                    const absX = gx + localX
                    const absY = gy + localY

                    const rebased = translateGeometry(child, gx, gy, {
                        round: false,
                    })
                    const childMetadata = rebased
                        ? rebased.metadata
                        : child.metadata

                    const childData = {
                        ...child,
                        x: absX,
                        y: absY,
                        metadata: childMetadata,
                    }
                    addToLocalComponentStore(
                        child.id,
                        child.componentType,
                        childData,
                        true
                    )
                    batchEntries.push({ action: 'ADD', id: child.id })
                })
                recordBatchToHistoryLog(batchEntries)
            }
        }
        if (isInScene(groupInstance)) {
            two.remove([groupInstance])
            two.update()
        }
    }

    function onFocusHandler(): void {
        if (!groupInstance) return
        const el = document.getElementById(`${groupInstance.id}`)
        if (el) el.style.outline = '0'
        window.dispatchEvent(
            new CustomEvent('groupFocused', {
                detail: { group: groupInstance },
            })
        )
    }

    function onKeyDown(evt: KeyboardEvent): void {
        if (evt.keyCode === 8 || evt.keyCode === 46) {
            isDeletingRef.current = true
            setDeleteGroupElements(groupInstance.elementData)

            if (isInScene(groupInstance)) {
                two.remove([groupInstance])
            }
        }
    }

    const handleOnDeleteGroupElements = (): void => {
        if (deleteGroupElements?.id !== undefined) {
            const idsArr = deleteGroupElements.children.map(
                (item: ShapeLike) => item.id
            )

            const toRemove = Array.from(two.scene.children).filter(
                (el: ShapeLike) =>
                    el?.elementData && idsArr.includes(el.elementData.id)
            )
            if (toRemove.length > 0) {
                two.remove(toRemove)
                try {
                    two.update()
                } catch (err) {
                    console.warn(
                        'two.update() during group delete reconciliation:',
                        err
                    )
                    two.scene.subtractions.length = 0
                    two.scene._flagSubtractions = false
                }
            }

            deleteBulkComponentsFromLocalStore(idsArr)
            setDeleteGroupElements(null)
        }
    }

    useEffect(() => {
        if (deleteGroupElements !== null) {
            handleOnDeleteGroupElements()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deleteGroupElements])

    useEffect(() => {
        const onZoomChanged = (e: Event): void => {
            const detail = (e as CustomEvent<{ scale: number }>).detail
            if (!selectorInstance || !detail) return
            selectorInstance.setScale(detail.scale)
            sizeHandlesRef.current?.(detail.scale)
            applyCounterScaleToCopies(groupInstance, detail.scale)
            two.update()
        }
        window.addEventListener('zoomChanged', onZoomChanged)
        return (): void =>
            window.removeEventListener('zoomChanged', onZoomChanged)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const rectangle = two.makeRectangle(
            0,
            0,
            props?.width || 0,
            props?.height || 0
        )
        rectangle.fill = getGroupFill()
        rectangle.noStroke()

        const group = two.makeGroup(rectangle)
        group.elementData = {
            ...props?.itemData,
            children: props.children,
            isGroupSelector: true,
        }
        group.translation.x = parseInt(String(prevX)) || 500
        group.translation.y = parseInt(String(prevY)) || 200
        two.update()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loaders = props.children.map((item: any) => {
            const factoryKey = `../../factory/${item.componentType}.ts`
            const loader = factoryModules[factoryKey]
            return typeof loader === 'function'
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  loader().then((mod: any) => ({ item, mod }))
                : Promise.resolve(null)
        })

        Promise.all(loaders).then((resolved) => {
            resolved.forEach((entry) => {
                if (!entry) return
                const { item, mod } = entry
                const componentFactory = new mod.default(two, item.x, item.y, {
                    ...item,
                })
                const factoryObject = componentFactory.createElement()
                const coreObject = factoryObject.group
                coreObject.translation.x = parseInt(String(item.x))
                coreObject.translation.y = parseInt(String(item.y))
                coreObject.opacity =
                    item.componentType === 'area' ? 1 : readOpacity(item)

                if (isStandaloneTextType(item.componentType)) {
                    const textProps = readProperties(item)
                    layoutStandaloneText(
                        two,
                        coreObject,
                        (textProps.content as string) ?? '',
                        (textProps.fontSize as number) || 36
                    )
                }

                const meta = readProperties(item)
                if (meta.hasText && meta.textContent) {
                    applyShapeText(
                        two,
                        coreObject,
                        item.componentType,
                        item.width || meta.width || 120,
                        meta
                    )
                }

                if (item.componentType === componentTypes.circle) {
                    buildCircleLabel(two, coreObject, {
                        text: circleLabelOf(item),
                        fontFamily: circleLabelFontFamilyOf(item),
                        fontSize: circleLabelFontSizeOf(item),
                        color: circleLabelColorOf(item),
                        width: item.width || 100,
                    })
                }

                coreObject.elementData = item
                applyCounterScaleToCopy(
                    coreObject,
                    item,
                    (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
                )
                group.add(coreObject)
            })
            orderGroupChildrenByZ(group)

            const hideIds: string[] = Array.isArray(props.membersToHide)
                ? props.membersToHide
                : []
            if (hideIds.length) {
                const hideSet = new Set(hideIds)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                two.scene.children.forEach((child: any) => {
                    if (hideSet.has(child?.elementData?.id)) child.opacity = 0
                })
            }

            two.update()
        })

        groupInstance = group

        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector

        two.update()

        const groupEl = document.getElementById(group.id)
        if (groupEl) {
            groupEl.setAttribute('class', 'dragger-picker')
            groupEl.setAttribute('data-label', 'groupobject_coord')
            groupEl.dispatchEvent(new Event('mousedown'))
            groupEl.addEventListener('focus', onFocusHandler)
            groupEl.addEventListener('blur', onBlurHandler)
            groupEl.addEventListener('keydown', onKeyDown)
            focusSvgElement(groupEl)
        }

        selector.update(
            rectangle.getBoundingClientRect(true).left,
            rectangle.getBoundingClientRect(true).right,
            rectangle.getBoundingClientRect(true).top,
            rectangle.getBoundingClientRect(true).bottom,
            two.scene.scale
        )
        two.update()

        lastCommitPosRef.current = {
            x: parseInt(String(group.translation.x)),
            y: parseInt(String(group.translation.y)),
        }

        const resizeCleanups: (() => void)[] = []

        const scaleAbout = (
            px: number,
            py: number,
            s: number,
            O: { x: number; y: number }
        ): { x: number; y: number } => ({
            x: O.x + s * (px - O.x),
            y: O.y + s * (py - O.y),
        })

        const bakeGroupResize = (
            s: number,
            O: { x: number; y: number }
        ): void => {
            const userId = localStorage.getItem('userId')
            const childrenIds = props.children.map((i: ShapeLike) => i.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const batchEntries: any[] = []

            two.scene.children.forEach((element: ShapeLike) => {
                if (!element.elementData) return
                const id = element.elementData.id
                if (!childrenIds.includes(id)) return

                const ct = element.elementData.componentType
                const current = (stateRefForComponentStore?.current?.[id] ??
                    {}) as ShapeLike

                const curX = parseInt(
                    String(current.x ?? element.translation.x)
                )
                const curY = parseInt(
                    String(current.y ?? element.translation.y)
                )
                const origin = scaleAbout(curX, curY, s, O)
                const newX = Math.round(origin.x)
                const newY = Math.round(origin.y)

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updateObj: any = { x: newX, y: newY, updatedBy: userId }
                if (current.width != null) {
                    updateObj.width = Math.max(1, Math.round(current.width * s))
                }
                if (current.height != null) {
                    updateObj.height = Math.max(
                        1,
                        Math.round(current.height * s)
                    )
                }
                if (current.linewidth != null) {
                    updateObj.linewidth = Math.max(
                        GROUP_RESIZE_MIN_STROKE,
                        current.linewidth * s
                    )
                }
                const isLineLike =
                    ct === 'arrowLine' || ct === 'line' || ct === 'divider'
                if (isLineLike) {
                    if (current.x1 != null) updateObj.x1 = current.x1 * s
                    if (current.y1 != null) updateObj.y1 = current.y1 * s
                    if (current.x2 != null) updateObj.x2 = current.x2 * s
                    if (current.y2 != null) updateObj.y2 = current.y2 * s
                }

                const scaled = scaleGeometry(current, s, O)
                let newMetadata = scaled ? scaled.metadata : current.metadata
                if (scaled) {
                    const widths = readProperties(current).widths
                    if (Array.isArray(widths)) {
                        newMetadata = {
                            geometry: scaled.metadata.geometry,
                            properties: {
                                ...scaled.metadata.properties,
                                widths: widths.map((w) =>
                                    typeof w === 'number'
                                        ? Math.max(
                                              GROUP_RESIZE_MIN_STROKE,
                                              w * s
                                          )
                                        : w
                                ),
                            },
                        }
                    }
                    updateObj.metadata = newMetadata
                    updateObj.x = scaled.x
                    updateObj.y = scaled.y
                }

                const objMeta = readProperties(current)
                const isStandaloneText = isStandaloneTextType(ct)
                const hasShapeText =
                    !!objMeta.hasText && typeof objMeta.textContent === 'string'
                const sizeKey = hasShapeText
                    ? 'textFontSize'
                    : isStandaloneText
                      ? 'fontSize'
                      : null
                if (sizeKey) {
                    const oldSize =
                        (objMeta[sizeKey] as number) ||
                        (sizeKey === 'textFontSize' ? 24 : 36)
                    const sizePatch = setProperties(
                        { metadata: newMetadata },
                        { [sizeKey]: Math.max(4, Math.round(oldSize * s)) }
                    )
                    if (sizePatch.metadata) {
                        newMetadata = sizePatch.metadata
                        updateObj.metadata = newMetadata
                    }
                }

                element.translation.x = newX
                element.translation.y = newY
                const shape = element.children?.[0]
                if (shape) {
                    if (updateObj.width != null) shape.width = updateObj.width
                    if (updateObj.height != null) {
                        shape.height = updateObj.height
                    }
                    if (updateObj.linewidth != null) {
                        shape.linewidth = updateObj.linewidth
                    }
                }
                if (hasShapeText && newMetadata) {
                    applyShapeText(
                        two,
                        element,
                        ct,
                        updateObj.width ?? current.width ?? 120,
                        newMetadata
                    )
                } else if (isStandaloneText && newMetadata) {
                    layoutStandaloneText(
                        two,
                        element,
                        newMetadata.content ?? '',
                        newMetadata.fontSize || 36
                    )
                }
                if (isLineLike) {
                    const line = element.children?.[0]
                    const pc1 = element.children?.[1]
                    const pc2 = element.children?.[2]
                    if (line && pc1 && pc2 && line.vertices?.length >= 2) {
                        const x1 = updateObj.x1 ?? line.vertices[0].x
                        const y1 = updateObj.y1 ?? line.vertices[0].y
                        const x2 = updateObj.x2 ?? line.vertices[1].x
                        const y2 = updateObj.y2 ?? line.vertices[1].y
                        updateX1Y1Vertices(Two, line, x1, y1, pc1, two)
                        updateX2Y2Vertices(Two, line, x2, y2, pc2, two)
                        if (updateObj.linewidth != null) {
                            line.linewidth = updateObj.linewidth
                        }
                    }
                }
                if (ct === 'pencil' && newMetadata) {
                    const path = element.children?.[0]
                    if (path?.vertices) {
                        path.vertices = geometryPositions(
                            readGeometry({ metadata: newMetadata })
                        ).map(
                            ([px, py]) =>
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                new (Two as any).Anchor(px - newX, py - newY)
                        )
                    }
                }
                if (VERTEX_PATH_TYPES.has(ct) && newMetadata) {
                    element.elementData.metadata = newMetadata
                    window.dispatchEvent(
                        new CustomEvent(VERTEX_PATH_REVERTED_EVENT, {
                            detail: { id, metadata: newMetadata },
                        })
                    )
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const prevProps: any = {}
                Object.keys(updateObj).forEach((k) => {
                    prevProps[k] = current[k]
                })
                updateComponentBulkPropertiesInLocalStore(id, updateObj, true)
                batchEntries.push({
                    action: 'UPDATE_BULK',
                    id,
                    prevProps,
                    bulkObj: updateObj,
                })
            })

            if (batchEntries.length > 0) {
                recordBatchToHistoryLog(batchEntries)
            }
            two.update()
        }

        const onResizeMove = (e: MouseEvent): void => {
            const st = resizeStateRef.current
            if (!st || !isInScene(group)) return
            const curDist = Math.hypot(
                e.clientX - st.anchorScreen.x,
                e.clientY - st.anchorScreen.y
            )
            const s = Math.max(GROUP_RESIZE_MIN_SCALE, curDist / st.startDist)
            st.lastScale = s
            group.scale = s
            group.translation.x = st.C0.x + (1 - s) * st.d0.x
            group.translation.y = st.C0.y + (1 - s) * st.d0.y
            sizeResizeHandles(two.scene.scale * s)
            two.update()
        }

        const onResizeUp = (): void => {
            window.removeEventListener('mousemove', onResizeMove, false)
            window.removeEventListener('mouseup', onResizeUp, false)
            const st = resizeStateRef.current
            resizeStateRef.current = null
            if (!st) return

            const s = st.lastScale ?? 1
            if (Math.abs(s - 1) < 0.01) {
                group.scale = 1
                group.translation.x = st.C0.x
                group.translation.y = st.C0.y
                sizeResizeHandles(two.scene.scale)
                isDeletingRef.current = false
                two.update()
                return
            }

            group.scale = 1
            bakeGroupResize(s, st.O)
            revealMembers()
            selector?.hide?.()
            window.dispatchEvent(new CustomEvent('groupBlurred'))
            try {
                two.remove([group])
                two.update()
            } catch (err) {
                console.warn('two.update() during resize teardown:', err)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const scene = two.scene as any
                scene.subtractions.length = 0
                scene._flagSubtractions = false
            }
        }

        const beginGroupResize = (corner: string, e: MouseEvent): void => {
            if (!isInScene(group)) return
            e.preventDefault()
            e.stopPropagation()

            const halfW0 = (parseInt(String(props.width)) || 0) / 2
            const halfH0 = (parseInt(String(props.height)) || 0) / 2
            const sign: Record<string, [number, number]> = {
                nw: [-1, -1],
                ne: [1, -1],
                se: [1, 1],
                sw: [-1, 1],
            }
            const [sx, sy] = sign[corner] ?? [1, 1]
            const d0 = { x: -sx * halfW0, y: -sy * halfH0 }
            const C0 = {
                x: group.translation.x,
                y: group.translation.y,
            }
            const O = { x: C0.x + d0.x, y: C0.y + d0.y }

            const opposite: Record<string, ShapeLike> = {
                nw: selector.circle3,
                ne: selector.circle4,
                se: selector.circle1,
                sw: selector.circle2,
            }
            const oppElem = opposite[corner]?._renderer?.elem as
                SVGElement | undefined
            const oppRect = oppElem?.getBoundingClientRect()
            const anchorScreen = oppRect
                ? {
                      x: oppRect.left + oppRect.width / 2,
                      y: oppRect.top + oppRect.height / 2,
                  }
                : { x: e.clientX, y: e.clientY }
            const startDist =
                Math.hypot(
                    e.clientX - anchorScreen.x,
                    e.clientY - anchorScreen.y
                ) || 1

            isDeletingRef.current = true
            resizeStateRef.current = {
                C0,
                d0,
                O,
                anchorScreen,
                startDist,
                lastScale: 1,
            }
            window.addEventListener('mousemove', onResizeMove, false)
            window.addEventListener('mouseup', onResizeUp, false)
        }

        const cornerHandles = [
            selector.circle1,
            selector.circle2,
            selector.circle3,
            selector.circle4,
        ]
        const cornerHitHandles = [
            selector.hitCircle1,
            selector.hitCircle2,
            selector.hitCircle3,
            selector.hitCircle4,
        ]
        const sizeResizeHandles = (effectiveScale: number): void => {
            const s = effectiveScale > 0 ? effectiveScale : 1
            const r = selectionHandleRadiusPx() / s
            cornerHandles.forEach((c: ShapeLike) => {
                if (!c) return
                c.radius = r
                c.linewidth = SELECTION_HANDLE_LINEWIDTH_PX / s
            })
            const hitR = selectionHandleHitRadiusPx() / s
            cornerHitHandles.forEach((c: ShapeLike) => {
                if (c) c.radius = hitR
            })
        }
        sizeHandlesRef.current = sizeResizeHandles

        if (GROUP_RESIZE_ENABLED) {
            const cornerCircles: {
                name: string
                circle: ShapeLike
                hit: ShapeLike
            }[] = [
                { name: 'nw', circle: selector.circle1, hit: selector.hitCircle1 },
                { name: 'ne', circle: selector.circle2, hit: selector.hitCircle2 },
                { name: 'se', circle: selector.circle3, hit: selector.hitCircle3 },
                { name: 'sw', circle: selector.circle4, hit: selector.hitCircle4 },
            ]
            const cursorFor: Record<string, string> = {
                nw: 'nwse-resize',
                se: 'nwse-resize',
                ne: 'nesw-resize',
                sw: 'nesw-resize',
            }
            cornerCircles.forEach(({ name, circle, hit }) => {
                if (!circle) return
                circle.fill = SELECTION_HANDLE_FILL
                circle.stroke = HANDLE_STROKE
                const target = hit ?? circle
                const elem = target._renderer?.elem as SVGElement | undefined
                if (!elem) return
                elem.style.cursor = cursorFor[name] ?? 'pointer'
                const onDown = (e: MouseEvent): void =>
                    beginGroupResize(name, e)
                elem.addEventListener('mousedown', onDown, false)
                resizeCleanups.push(() =>
                    elem.removeEventListener('mousedown', onDown, false)
                )
            })
            sizeResizeHandles(two.scene.scale)
            two.update()
        }

        setGroupId(group.id)

        return (): void => {
            resizeCleanups.forEach((fn) => fn())
            window.removeEventListener('mousemove', onResizeMove, false)
            window.removeEventListener('mouseup', onResizeUp, false)
            if (isInScene(group)) {
                two.remove(group)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const onMouseUp = (): void => commitGroupMove()
        window.addEventListener('mouseup', onMouseUp, false)
        return (): void =>
            window.removeEventListener('mouseup', onMouseUp, false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const memberIds = new Set(
            (props.children ?? []).map((c: ShapeLike) => c?.id).filter(Boolean)
        )
        const onMemberRemoved = ((e: CustomEvent<{ id: string }>): void => {
            if (isDeletingRef.current) return
            if (!memberIds.has(e.detail?.id)) return
            if (!groupInstance || !isInScene(groupInstance)) return

            dismissOverlayNode()
            window.removeEventListener('elementRemoved', onMemberRemoved)
        }) as EventListener
        window.addEventListener('elementRemoved', onMemberRemoved)
        return (): void =>
            window.removeEventListener('elementRemoved', onMemberRemoved)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const onHistoryApplied = (): void => {
            if (isDeletingRef.current) return
            if (!groupInstance || !isInScene(groupInstance)) return
            revealMembers()
            dismissOverlayNode()
        }
        window.addEventListener('historyApplied', onHistoryApplied)
        return (): void =>
            window.removeEventListener('historyApplied', onHistoryApplied)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const el = groupId ? document.getElementById(groupId) : null
        if (el) {
            el.style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected, groupId])

    return <React.Fragment />
}

export default GroupedObjectWrapper
