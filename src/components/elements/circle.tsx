import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'

import CircleFactory from '../../factory/circle'
import { readOpacity } from '../../utils/canvasUtils'
import { scheduleRender } from '../../utils/renderScheduler'
import {
    componentTypes,
    FONTS_LOADED_EVENT,
} from '../../constants/misc'
import { circleLabelScale } from '../../utils/counterScale'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
    getCircleLabelGroup,
} from '../../factory/circleLabel'
import {
    editorIdFor,
    openCircleLabelEditor,
} from './circleLabelEditor'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

function Circle(props: ElementProps): ReactElement {
    const {
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
        zuiInBase,
        updateComponentBulkPropertiesInLocalStore,
    } = useBaseContext()

    const groupRef = useRef<ShapeLike>(null)
    const shapeRef = useRef<ShapeLike>(null)
    const labelRef = useRef<ShapeLike>(null)

    const two = props.twoJSInstance

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new CircleFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, circle } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        const opacityValue = readOpacity(props)

        const openEditor = (): void => {
            const group = groupRef.current
            if (!group) return
            openCircleLabelEditor({
                two,
                group,
                id: props.id,
                getLabelScale: () =>
                    typeof labelRef.current?.scale === 'number'
                        ? labelRef.current.scale
                        : 1,
                updateComponentBulkPropertiesInLocalStore,
            })
        }

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            circle.opacity = opacityValue
            circle.translation.x = props.properties.x
            circle.translation.y = props.properties.y
            parentGroup.add(circle)
            scheduleRender(two)
        } else {
            groupRef.current = group
            shapeRef.current = circle
            group.children.unshift(circle)

            const initialScale =
                (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale

            circle.opacity = opacityValue

            const record = group.elementData
            const label = buildCircleLabel(two, group, {
                text: circleLabelOf(record),
                fontFamily: circleLabelFontFamilyOf(record),
                fontSize: circleLabelFontSizeOf(record),
                color: circleLabelColorOf(record),
                width: props.width || circle.width || 100,
            })
            labelRef.current = label
            if (label) {
                label.scale = circleLabelScale(record, initialScale)
            }

            scheduleRender(two, () => {
                const groupEl = document.getElementById(group.id)
                if (groupEl) {
                    groupEl.setAttribute('class', 'dragger-picker')
                    groupEl.setAttribute('data-component-id', props.id)
                    groupEl.addEventListener('dblclick', openEditor)
                }
            })
        }

        const handleTriggerTextInput = (e: Event): void => {
            const detail = (e as CustomEvent<{ elementId: string }>).detail
            if (detail?.elementId !== props.id) return
            setTimeout(openEditor, 60)
        }
        window.addEventListener('triggerTextInput', handleTriggerTextInput)

        return (): void => {
            window.removeEventListener(
                'triggerTextInput',
                handleTriggerTextInput
            )
            document
                .getElementById(group.id)
                ?.removeEventListener('dblclick', openEditor)
            document.getElementById(editorIdFor(props.id))?.remove()
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const rebuildLabel = (): void => {
        const groupInstance = groupRef.current
        const shapeInstance = shapeRef.current
        if (!groupInstance || !shapeInstance) return
        const record = groupInstance.elementData ?? props
        labelRef.current = buildCircleLabel(two, groupInstance, {
            text: circleLabelOf(record),
            fontFamily: circleLabelFontFamilyOf(record),
            fontSize: circleLabelFontSizeOf(record),
            color: circleLabelColorOf(record),
            width: props.width || shapeInstance.width || 100,
        })
        scheduleRender(two)
    }

    useEffect(() => {
        const groupInstance = groupRef.current
        const shapeInstance = shapeRef.current
        if (!groupInstance || !shapeInstance) return

        groupInstance.translation.x = props.x
        groupInstance.translation.y = props.y
        shapeInstance.width = props.width || shapeInstance.width
        shapeInstance.height = props.height || shapeInstance.height
        shapeInstance.fill = props.fill || shapeInstance.fill
        rebuildLabel()
    }, [props.x, props.y, props.fill, props.width, props.height, two])

    const rebuildLabelRef = useRef<() => void>(rebuildLabel)
    rebuildLabelRef.current = rebuildLabel

    useEffect(() => {
        const onFontsLoaded = (): void => rebuildLabelRef.current()
        window.addEventListener(FONTS_LOADED_EVENT, onFontsLoaded)
        return (): void => {
            window.removeEventListener(FONTS_LOADED_EVENT, onFontsLoaded)
        }
    }, [])

    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            if (!group) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            const label = labelRef.current ?? getCircleLabelGroup(group)
            if (!label) return
            label.scale = circleLabelScale(group.elementData ?? props, scale)
            scheduleRender(two)
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
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

export default Circle
