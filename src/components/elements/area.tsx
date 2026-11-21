import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'

import AreaFactory from '../../factory/area'
import { computeCounterScale, resolveResist } from '../../utils/counterScale'
import { applyStrokeDashes } from '../../utils/strokeDashes'
import {
    attachVertexHandles,
    setVertexHandlesVisible,
    applyRevertedVertices,
    VERTEX_PATH_REVERTED_EVENT,
} from '../utils/vertexHandles'
import type {
    VertexHandles,
    VertexPathRevertedDetail,
} from '../utils/vertexHandles'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

function Area(props: ElementProps): ReactElement {
    const {
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
        zuiInBase,
        selectedComponent,
        updateComponentBulkPropertiesInLocalStore,
    } = useBaseContext()

    const groupRef = useRef<ShapeLike>(null)
    const shapeRef = useRef<ShapeLike>(null)
    const handlesRef = useRef<ShapeLike[]>([])

    const zuiRef = useRef<ShapeLike>(zuiInBase)
    const persistRef = useRef(updateComponentBulkPropertiesInLocalStore)
    const idRef = useRef<string>(props.id)
    useEffect(() => {
        zuiRef.current = zuiInBase
    }, [zuiInBase])
    useEffect(() => {
        persistRef.current = updateComponentBulkPropertiesInLocalStore
    }, [updateComponentBulkPropertiesInLocalStore])
    useEffect(() => {
        idRef.current = props.id
    }, [props.id])

    const two = props.twoJSInstance
    const resist = resolveResist(props)
    const baseLinewidth = props.linewidth ?? 2

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y
        let vertexHandles: VertexHandles | null = null

        const elementFactory = new AreaFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, path } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            path.translation.x = props.properties.x
            path.translation.y = props.properties.y
            parentGroup.add(path)
            two.update()
        } else {
            groupRef.current = group
            shapeRef.current = path

            const initialScale =
                (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
            if (initialScale) {
                path.linewidth =
                    baseLinewidth * computeCounterScale(initialScale, resist)
            }
            applyStrokeDashes(path, props.strokeType, initialScale ?? 1)

            two.update()

            vertexHandles = attachVertexHandles({
                two,
                group,
                path,
                componentId: props.id,
                zuiRef,
                persistRef,
                idRef,
                groupRef,
                pathRef: shapeRef,
            })
            handlesRef.current = vertexHandles.handles

            const groupEl = document.getElementById(group.id)
            if (groupEl) {
                groupEl.setAttribute('class', 'dragger-picker')
                groupEl.setAttribute('data-component-id', props.id)
                groupEl.setAttribute(
                    'data-linewidth',
                    String(props.linewidth ?? '')
                )
            }
        }

        return (): void => {
            vertexHandles?.destroy()
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            const path = shapeRef.current
            if (!group || !path) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            const base = group.elementData?.linewidth ?? baseLinewidth
            path.linewidth = base * computeCounterScale(scale, resist)
            applyStrokeDashes(
                path,
                group.elementData?.strokeType ?? props.strokeType,
                scale
            )
            two.update()
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
    }, [two, resist, baseLinewidth])

    useEffect(() => {
        const group = groupRef.current
        if (!group) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const selectedId = (selectedComponent as any)?.group?.id
        const isSelected = selectedId != null && selectedId === group.id
        setVertexHandlesVisible(handlesRef.current, isSelected, two)
    }, [selectedComponent, two])

    useEffect(() => {
        const handleReverted = ((
            e: CustomEvent<VertexPathRevertedDetail>
        ): void => {
            if (e.detail?.id !== idRef.current) return
            applyRevertedVertices(
                two,
                groupRef.current,
                shapeRef.current,
                handlesRef.current,
                e.detail.metadata
            )
        }) as EventListener
        window.addEventListener(VERTEX_PATH_REVERTED_EVENT, handleReverted)
        return () =>
            window.removeEventListener(
                VERTEX_PATH_REVERTED_EVENT,
                handleReverted
            )
    }, [two])

    useEffect(() => {
        const group = groupRef.current
        const el = group ? document.getElementById(group.id) : null
        if (el) {
            el.style.pointerEvents =
                isPencilMode || isArrowDrawMode || isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [isPencilMode, isArrowDrawMode, isArrowSelected])

    return <React.Fragment />
}

export default Area
