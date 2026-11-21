import React, { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import interact from 'interactjs'
import { useBaseContext } from '../../views/Base/baseContext'

import PointFactory, {
    getPointLabelNode,
    pointFontFamilyOf,
    pointFontSizeOf,
    pointLabelOf,
    POINT_CHROME_FLAG,
    getPointCircle,
} from '../../factory/point'
import getEditComponents from '../utils/editWrapper'
import { computeCounterScale, resolveResist } from '../../utils/counterScale'
import { capCenterOffset } from '../../utils/fontMetrics'
import { setProperties } from '../../utils/geometry'
import { isPanMode } from '../../utils/drawModeUtils'
import { pathHitsSelectionChrome } from '../../utils/canvasChrome'
import {
    FONTS_LOADED_EVENT,
    POINT_LABEL_COLOR,
    POINT_LABEL_GAP,
    POINT_RADIUS,
    TEXT_EDIT_CANCEL_EVENT,
    TEXT_EDIT_COMMIT_EVENT,
    TEXT_EDIT_END_EVENT,
    TEXT_EDIT_START_EVENT,
} from '../../constants/misc'

const SELECTOR_PAD = 5

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

const MIN_INPUT_WIDTH = 90

function Point(props: ElementProps): ReactElement {
    const {
        isPencilMode,
        isArrowDrawMode,
        isArrowSelected,
        zuiInBase,
        updateComponentBulkPropertiesInLocalStore,
    } = useBaseContext()

    const groupRef = useRef<ShapeLike>(null)
    const selectorRef = useRef<ShapeLike>(null)
    const syncSelectorRef = useRef<(() => void) | null>(null)
    const restoreSelectorAfterEditRef = useRef(false)
    const labelRef = useRef<string>(pointLabelOf(props))

    const two = props.twoJSInstance
    const resist = resolveResist(props)

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y

        const elementFactory = new PointFactory(two, prevX, prevY, {
            ...props,
        })
        const { group } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }

        if (props.parentGroup) {
            const parentGroup = props.parentGroup
            group.translation.x = props.properties.x
            group.translation.y = props.properties.y
            parentGroup.add(group)
            two.update()
            return
        }

        groupRef.current = group

        const effectiveScale = (): number => {
            const sceneScale = two?.scene?.scale || 1
            const groupScale = typeof group.scale === 'number' ? group.scale : 1
            return sceneScale * groupScale || 1
        }

        const initialScale =
            (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
        if (initialScale) {
            group.scale = computeCounterScale(initialScale, resist)
        }

        two.update()

        const groupEl = document.getElementById(group.id)
        if (groupEl) {
            groupEl.setAttribute('class', 'dragger-picker')
            groupEl.setAttribute('data-component-id', props.id)
        }

        const { selector } = getEditComponents(two, group, 0)
        selectorRef.current = selector
        selector.areaGroup[POINT_CHROME_FLAG] = true
        selector.hide()

        const isEditingLabel = (): boolean =>
            !!document.getElementById(`point-label-input-${props.id}`)

        const syncSelector = (): void => {
            const sel = selectorRef.current
            if (!sel) return
            if (isEditingLabel()) return
            const half = POINT_RADIUS + SELECTOR_PAD
            sel.update(-half, half, -half, half, effectiveScale())
        }
        syncSelectorRef.current = syncSelector

        interact(`#${group.id}`).on('click', syncSelector)

        const onGlobalMouseDown = (e: MouseEvent): void => {
            const path: EventTarget[] = e.composedPath ? e.composedPath() : []
            const onSelf = path.some(
                (el) => (el as HTMLElement)?.id === group.id
            )
            const onToolbar = pathHitsSelectionChrome(path)
            const onLabelEditor = path.some(
                (el) =>
                    (el as HTMLElement)?.id === `point-label-input-${props.id}`
            )
            if (onSelf || onToolbar || onLabelEditor) return
            restoreSelectorAfterEditRef.current = false
            selectorRef.current?.hide()
            two.update()
        }
        window.addEventListener('mousedown', onGlobalMouseDown)

        const showLabelInput = (): void => {
            if (isPanMode()) return
            const labelNode = getPointLabelNode(group)
            const circleNode = getPointCircle(group)
            const circleElem = circleNode?._renderer?.elem as
                | SVGGraphicsElement
                | undefined
            if (!labelNode || !circleElem) return
            if (document.getElementById(`point-label-input-${props.id}`)) return

            const circleRect = circleElem.getBoundingClientRect()
            const sceneScale = two?.scene?.scale || 1
            const groupScale = typeof group.scale === 'number' ? group.scale : 1
            const effScale = sceneScale * groupScale
            const record = group.elementData ?? props
            const fontFamily = pointFontFamilyOf(record)
            const cssFontSize = pointFontSizeOf(record) * effScale
            const lineH = Math.ceil(cssFontSize * 1.4)

            const renderedOpacity = labelNode.opacity ?? 1
            labelNode.opacity = 0

            restoreSelectorAfterEditRef.current =
                selectorRef.current?.areaGroup?.opacity === 1
            selectorRef.current?.hide()
            two.update()

            const input = document.createElement('input')
            input.id = `point-label-input-${props.id}`
            input.type = 'text'
            input.value = labelRef.current
            input.placeholder = 'Name this place'
            input.className = 'temp-input-area'
            input.style.position = 'absolute'
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.outline = 'none'
            input.style.padding = '0'
            input.style.margin = '0'
            input.style.color = POINT_LABEL_COLOR
            input.style.fontSize = `${cssFontSize}px`
            input.style.fontFamily = fontFamily
            input.style.lineHeight = `${lineH}px`
            input.style.height = `${lineH}px`
            input.style.left = `${circleRect.right + POINT_LABEL_GAP * effScale}px`
            input.style.top = `${circleRect.top + 2 + circleRect.height / 2 - lineH / 2}px`

            document.getElementById('main-two-root')?.append(input)

            const measure = document.createElement('span')
            measure.style.position = 'absolute'
            measure.style.visibility = 'hidden'
            measure.style.whiteSpace = 'pre'
            measure.style.fontSize = `${cssFontSize}px`
            measure.style.fontFamily = fontFamily
            document.body.appendChild(measure)

            const autoSize = (): void => {
                measure.textContent = input.value || input.placeholder
                input.style.width = `${Math.max(
                    measure.offsetWidth + cssFontSize,
                    MIN_INPUT_WIDTH
                )}px`
            }
            autoSize()
            input.addEventListener('input', autoSize)

            const valueAtOpen = labelRef.current

            const onEditRequest = (e: Event): void => {
                const detail = (e as CustomEvent<{ id?: string }>).detail
                if (detail?.id && detail.id !== props.id) return
                if (e.type === TEXT_EDIT_CANCEL_EVENT) {
                    input.value = valueAtOpen
                }
                input.blur()
            }
            window.addEventListener(TEXT_EDIT_COMMIT_EVENT, onEditRequest)
            window.addEventListener(TEXT_EDIT_CANCEL_EVENT, onEditRequest)
            window.dispatchEvent(
                new CustomEvent(TEXT_EDIT_START_EVENT, {
                    detail: { id: props.id },
                })
            )

            const commit = (): void => {
                input.removeEventListener('input', autoSize)
                window.removeEventListener(
                    TEXT_EDIT_COMMIT_EVENT,
                    onEditRequest
                )
                window.removeEventListener(
                    TEXT_EDIT_CANCEL_EVENT,
                    onEditRequest
                )
                window.dispatchEvent(
                    new CustomEvent(TEXT_EDIT_END_EVENT, {
                        detail: { id: props.id },
                    })
                )
                measure.remove()

                const value = input.value.trim()
                input.remove()

                labelRef.current = value
                labelNode.value = value
                labelNode.opacity = renderedOpacity
                two.update()
                if (restoreSelectorAfterEditRef.current) {
                    syncSelectorRef.current?.()
                }
                restoreSelectorAfterEditRef.current = false

                const labelPatch = setProperties(group.elementData ?? props, {
                    label: value,
                })
                if (group.elementData && labelPatch.metadata) {
                    group.elementData.metadata = labelPatch.metadata
                }
                updateComponentBulkPropertiesInLocalStore?.(
                    props.id,
                    labelPatch
                )
            }

            input.addEventListener('blur', commit)
            input.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === 'Escape') {
                    event.preventDefault()
                    input.blur()
                }
            })

            input.focus()
            input.select()
        }

        const handleTriggerTextInput = (e: Event): void => {
            const detail = (e as CustomEvent<{ elementId: string }>).detail
            if (detail?.elementId !== props.id) return
            setTimeout(showLabelInput, 60)
        }
        window.addEventListener('triggerTextInput', handleTriggerTextInput)
        groupEl?.addEventListener('dblclick', showLabelInput)

        return (): void => {
            window.removeEventListener(
                'triggerTextInput',
                handleTriggerTextInput
            )
            window.removeEventListener('mousedown', onGlobalMouseDown)
            interact(`#${group.id}`).unset()
            groupEl?.removeEventListener('dblclick', showLabelInput)
            document.getElementById(`point-label-input-${props.id}`)?.remove()
            two.remove(group)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            if (!group) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            group.scale = computeCounterScale(scale, resist)
            selectorRef.current?.setScale(scale * group.scale)
            two.update()
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
    }, [two, resist])

    useEffect(() => {
        const onFontsLoaded = (): void => {
            const group = groupRef.current
            const labelNode = group ? getPointLabelNode(group) : null
            if (!labelNode) return
            labelNode.translation.y = capCenterOffset(
                labelNode.family,
                labelNode.size
            )
            two.update()
        }
        window.addEventListener(FONTS_LOADED_EVENT, onFontsLoaded)
        return (): void => {
            window.removeEventListener(FONTS_LOADED_EVENT, onFontsLoaded)
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

export default Point
