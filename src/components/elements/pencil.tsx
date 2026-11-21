import React, { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useImmer } from 'use-immer'

import { applyStrokeDashes } from '../../utils/strokeDashes'
import getEditComponents from '../utils/editWrapper'
import PencilFactory from '../../factory/pencil'
import { readOpacity } from '../../utils/canvasUtils'
import { scheduleRender } from '../../utils/renderScheduler'
import {
    computeCounterScale,
    isStrokeScaled,
    resolveResist,
} from '../../utils/counterScale'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InternalState = Record<string, any>

function Pencil(props: ElementProps): ReactElement {
    const [, toggleToolbar] = useState(false)
    const [internalState, setInternalState] = useImmer<InternalState>({})

    const two = props.twoJSInstance

    const geoResist = isStrokeScaled(props)
    const resist = resolveResist(props)
    const baseLinewidth = props.linewidth ?? 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pathRef = useRef<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupRef = useRef<any>(null)

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new PencilFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, path } = elementFactory.createElement()
        const shapeRef = path || group.children[0]
        group.elementData = { ...props.itemData, ...props }

        const pencilOpacity = readOpacity(props)

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            shapeRef.translation.x = props.properties.x
            shapeRef.translation.y = props.properties.y
            shapeRef.opacity = pencilOpacity
            parentGroup.add(shapeRef)
            scheduleRender(two)
        } else {
            group.opacity = pencilOpacity
            groupRef.current = group
            pathRef.current = shapeRef
            const initialScale = two?.scene?.scale || 1
            if (geoResist) {
                shapeRef.linewidth =
                    baseLinewidth * computeCounterScale(initialScale, resist)
            }
            applyStrokeDashes(shapeRef, props.strokeType, initialScale)
            getEditComponents(two, group, 4)

            if (path) {
                group.children.unshift(path)
            }
            scheduleRender(two, () => {
                const groupEl = document.getElementById(group.id)
                if (groupEl) {
                    groupEl.setAttribute('class', 'avoid-dragging')
                    groupEl.setAttribute('data-component-id', props.id)
                    groupEl.setAttribute(
                        'data-linewidth',
                        String(props.linewidth ?? '')
                    )
                }
            })

            setInternalState((draft) => {
                draft.element = {
                    [shapeRef.id]: shapeRef,
                    [group.id]: group,
                }
                draft.group = {
                    id: group.id,
                    data: group,
                }
                draft.shape = {
                    id: shapeRef.id,
                    data: shapeRef,
                }
                draft.text = { data: {} }
                draft.icon = { data: {} }
            })
        }

        return (): void => {
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (internalState?.group?.data) {
            const groupInstance = internalState.group.data
            groupInstance.translation.x = props.x
            groupInstance.translation.y = props.y
            scheduleRender(two)
        }
        if (internalState?.shape?.data) {
            const shapeInstance = internalState.shape.data
            shapeInstance.width = props.width
                ? props.width
                : shapeInstance.width
            shapeInstance.height = props.height
                ? props.height
                : shapeInstance.height
            shapeInstance.fill = props.fill ? props.fill : shapeInstance.fill
            scheduleRender(two)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.x, props.y, props.fill, props.width, props.height])

    useEffect(() => {
        if (pathRef.current) {
            applyStrokeDashes(
                pathRef.current,
                props.strokeType,
                two?.scene?.scale || 1
            )
            scheduleRender(two)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.strokeType])

    useEffect(() => {
        if (!geoResist) return
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            const path = pathRef.current
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
    }, [two, geoResist, resist, baseLinewidth])

    void toggleToolbar

    return (
        <React.Fragment>
            <div id="two-Pencil"></div>
        </React.Fragment>
    )
}

export default Pencil
