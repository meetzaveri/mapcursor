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

// Element components receive a fluid prop bag composed of the ComponentRecord
// fields plus canvas-side handles (twoJSInstance, parentGroup, itemData,
// handleDeleteComponent). Typing this strictly fights more than it helps
// during the migration; the props originate in ElementRenderWrapper and the
// canvas, which are themselves loose.
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

    // A radius map is BORDERLESS (see CIRCLE_DEFAULTS): the disc itself is the
    // mark, and the factory paints a zero-width ring. So there is no stroke to
    // counter-scale here, unlike area/route — the geometry stays world-glued so
    // a 5km radius stays 5km. Its LABEL is not zoom-resistant either: it holds
    // the scale of the zoom it was drawn at and then follows the map (see
    // circleLabelScale). A circle offers no "Zoom resistant" switch.

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new CircleFactory(two, prevX, prevY, {
            ...props,
        })
        const { group, circle } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        const opacityValue = readOpacity(props)

        // Double-click names the circle. Bound to our OWN SVG node, so it never
        // reaches newCanvas's canvas-level dblclick handler — which still
        // correctly says map objects carry no inner text, because this is a
        // label parked in the group, not text laid out inside the shape.
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

            // The label is counter-scaled from the current camera below, so it
            // is already the right size before the first zoom event fires.
            const initialScale =
                (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale

            // Opacity goes on the ELLIPSE, not the group. A circle is created
            // half-transparent so the basemap reads through it — but its label
            // is a name, and a half-transparent name over a basemap is
            // unreadable. Group-level opacity would multiply onto both.
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

            // The SVG node only exists after a render. Batch the render
            // with every other element mounting this frame, then tag it.
            scheduleRender(two, () => {
                const groupEl = document.getElementById(group.id)
                if (groupEl) {
                    groupEl.setAttribute('class', 'dragger-picker')
                    groupEl.setAttribute('data-component-id', props.id)
                    groupEl.addEventListener('dblclick', openEditor)
                }
            })
        }

        // Placement fires this once the element has mounted, so a freshly drawn
        // circle lands ready to be named — the same courtesy a placed point
        // gets. Double-click reopens it later.
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

    // Read the style off elementData, not props: the toolbar edits it in place
    // and props are frozen at mount (see CLAUDE.md).
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
        // Width drives the wrap (the inscribed box is a function of it), so a
        // radius change re-flows the name.
        rebuildLabel()
    }, [props.x, props.y, props.fill, props.width, props.height, two])

    // Both the wrap and the cap-band centring are measured off the FONT, and
    // under `font-display: swap` the disc is drawn before the font arrives — so
    // the first build ran against the fallback face. Rebuild once the real one
    // lands. A full rebuild rather than a nudge, unlike a point's single-line
    // label: the wrap width is a font measurement too, so the line breaks can
    // move, not just the block's y.
    //
    // Through a ref so the listener is bound once and still runs the current
    // rebuild — the same reason the Two.js handlers read refs (see CLAUDE.md).
    const rebuildLabelRef = useRef<() => void>(rebuildLabel)
    rebuildLabelRef.current = rebuildLabel

    useEffect(() => {
        const onFontsLoaded = (): void => rebuildLabelRef.current()
        window.addEventListener(FONTS_LOADED_EVENT, onFontsLoaded)
        return (): void => {
            window.removeEventListener(FONTS_LOADED_EVENT, onFontsLoaded)
        }
    }, [])

    // The disc keeps marking the same ground at every zoom — nothing about it
    // counter-scales, because it is borderless and its geometry is the data.
    // A new circle's label holds a fixed scale, so this is a no-op for it; a
    // circle drawn before `labelCameraScale` existed still resists at
    // TEXT_RESIST and needs the per-zoom update. Reads the scale off the event
    // each fire — no stale closure (see CLAUDE.md).
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
