import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useBaseContext } from '../../views/Base/baseContext'

import CircleFactory from '../../factory/circle'
import { strokeTypeToDashes } from '../../utils/misc'
import { readOpacity } from '../../utils/canvasUtils'
import { scheduleRender } from '../../utils/renderScheduler'
import {
    componentTypes,
    TEXT_RESIST_CHANGED_EVENT,
} from '../../constants/misc'
import {
    computeCounterScale,
    resolveLabelResist,
    resolveResist,
} from '../../utils/counterScale'
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

    // A circle's STROKE counter-scales against the camera while its geometry
    // stays world-glued, so a 5km radius stays 5km (see isStrokeScaled).
    // Unless one was stored, this lands on the default — the same value area
    // and route run at. `resolveResist` is the single reader.
    const resist = resolveResist(props)
    // The LABEL counter-scales at its own rate, under the user's "Zoom
    // resistant" switch. Two resists on one element: reading the column for
    // the stroke as well would make that switch delete the ring at low zoom.
    // Held in a ref because the switch reaches us by event, not by prop —
    // ElementRenderWrapper freezes props at mount.
    const labelResistRef = useRef<number>(
        resolveLabelResist(props.itemData ?? props)
    )
    // Logical (unscaled) stroke width. Only this counter-scales; the geometry
    // stays glued to the world so a 5km radius stays 5km.
    const baseLinewidth = props.linewidth ?? 2

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

            // Seed the stroke counter-scale from the current camera so the ring
            // is already the right weight before the first zoom event fires —
            // mirrors area.tsx.
            const initialScale =
                (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
            if (initialScale) {
                circle.linewidth =
                    baseLinewidth * computeCounterScale(initialScale, resist)
            }

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
            if (label && initialScale) {
                label.scale = computeCounterScale(
                    initialScale,
                    labelResistRef.current
                )
            }

            // The SVG node only exists after a render. Batch the render
            // with every other element mounting this frame, then tag it.
            scheduleRender(two, () => {
                const groupEl = document.getElementById(group.id)
                if (groupEl) {
                    groupEl.setAttribute('class', 'dragger-picker')
                    groupEl.setAttribute('data-component-id', props.id)
                    groupEl.setAttribute(
                        'data-linewidth',
                        String(props.linewidth ?? '')
                    )
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
        // radius change re-flows the name. Read the style off elementData, not
        // props: the toolbar edits it in place and props are frozen at mount.
        const record = groupInstance.elementData ?? props
        labelRef.current = buildCircleLabel(two, groupInstance, {
            text: circleLabelOf(record),
            fontFamily: circleLabelFontFamilyOf(record),
            fontSize: circleLabelFontSizeOf(record),
            color: circleLabelColorOf(record),
            width: props.width || shapeInstance.width || 100,
        })
        scheduleRender(two)
    }, [props.x, props.y, props.fill, props.width, props.height, two])

    // Counter-scale the stroke width on every camera change so the ring stays a
    // readable couple of pixels across the map's whole zoom range, while the
    // circle itself keeps marking the same ground. Reads the scale off the
    // event each fire — no stale closure (see CLAUDE.md).
    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            const shape = shapeRef.current
            if (!group || !shape) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            // Logical width lives on elementData (kept in sync by the property
            // panel); fall back to the mount-time base.
            const base = group.elementData?.linewidth ?? baseLinewidth
            shape.linewidth = base * computeCounterScale(scale, resist)
            // The label rides its own resist, so the name holds a near-constant
            // screen size while the ring keeps marking the same ground.
            const label = labelRef.current ?? getCircleLabelGroup(group)
            if (label) {
                label.scale = computeCounterScale(
                    scale,
                    labelResistRef.current
                )
            }
            scheduleRender(two)
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
    }, [two, resist, baseLinewidth])

    // The "Zoom resistant" switch (and undo/redo of it) reaches us here rather
    // than through props — a column write never re-renders a frozen-prop
    // element. Re-scale against the CURRENT camera immediately so the label
    // snaps to its new model on click instead of waiting for the next zoom
    // gesture. Filtered by id: every circle on the base hears this event.
    useEffect(() => {
        const onResistChanged = ((
            e: CustomEvent<{ id: string; resist: number }>
        ): void => {
            if (e.detail?.id !== props.id) return
            labelResistRef.current = e.detail.resist
            const group = groupRef.current
            if (!group) return
            const label = labelRef.current ?? getCircleLabelGroup(group)
            if (!label) return
            const scale =
                (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale ?? 1
            label.scale = computeCounterScale(scale, labelResistRef.current)
            scheduleRender(two)
        }) as EventListener
        window.addEventListener(TEXT_RESIST_CHANGED_EVENT, onResistChanged)
        return (): void => {
            window.removeEventListener(
                TEXT_RESIST_CHANGED_EVENT,
                onResistChanged
            )
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.id, two])

    useEffect(() => {
        if (shapeRef.current) {
            shapeRef.current.dashes = strokeTypeToDashes(props.strokeType)
            scheduleRender(two)
        }
    }, [props.strokeType, two])

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
