import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'

import ImageFactory from '../../factory/image'
import { readOpacity } from '../../utils/canvasUtils'
import { scheduleRender } from '../../utils/renderScheduler'
import { computeCounterScale, resolveResist } from '../../utils/counterScale'
import { IMAGE_COMPONENT, IMAGE_SETTLED_EVENT } from '../../constants/misc'
import type { ImageSettledDetail } from '../../utils/imageNode'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

function Image(props: ElementProps): ReactElement {
    const { isPencilMode, isArrowDrawMode, isArrowSelected, zuiInBase } =
        useBaseContext()

    const groupRef = useRef<ShapeLike>(null)
    const frameRef = useRef<ShapeLike>(null)

    const two = props.twoJSInstance
    const resist = resolveResist(props)

    useEffect(() => {
        const elementFactory = new ImageFactory(two, props.x, props.y, {
            ...props,
            ownsImageNode: true,
            onImageSettled: () =>
                window.dispatchEvent(
                    new CustomEvent<ImageSettledDetail>(IMAGE_SETTLED_EVENT, {
                        detail: { id: props.id },
                    })
                ),
        })
        const { group, frame, disposeImageNode } =
            elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        group.opacity = readOpacity(props)
        groupRef.current = group
        frameRef.current = frame

        const initialScale =
            (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
        if (initialScale) {
            group.scale = computeCounterScale(initialScale, resist)
        }

        scheduleRender(two, () => {
            const groupEl = document.getElementById(group.id)
            if (groupEl) {
                groupEl.setAttribute('class', 'dragger-picker')
                groupEl.setAttribute('data-component-id', props.id)
                groupEl.setAttribute('data-component-type', IMAGE_COMPONENT)
            }
        })

        return (): void => {
            disposeImageNode()
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const groupInstance = groupRef.current
        const frameInstance = frameRef.current
        if (!groupInstance || !frameInstance) return

        groupInstance.translation.x = props.x
        groupInstance.translation.y = props.y
        frameInstance.width = props.width || frameInstance.width
        frameInstance.height = props.height || frameInstance.height
        scheduleRender(two)
    }, [props.x, props.y, props.width, props.height, two])

    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            if (!group) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            group.scale = computeCounterScale(scale, resist)
            scheduleRender(two)
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
    }, [two, resist])

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

export default Image
