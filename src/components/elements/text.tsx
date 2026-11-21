import React, { useEffect, useState, useRef } from 'react'
import type { ReactElement } from 'react'
import interact from 'interactjs'
import { useImmer } from 'use-immer'
import { useBaseContext } from '../../views/Base/baseContext'

import { elementOnBlurHandler } from '../../utils/misc'
import getEditComponents from '../utils/editWrapper'
import TextFactory from '../../factory/text'
import {
    TEXT_SIZES_OBJECT,
    MOBILE_TEXT_SIZES_OBJECT,
} from '../../utils/constants'
import { lineHeightFor } from '../../utils/textLayout'
import { readOpacity } from '../../utils/canvasUtils'
import { useMediaQueryUtils } from '../../constants/exportHooks'
import {
    DEFAULT_TEXT_FONT_FAMILY,
    TEXT_SELECTOR_REFRESH_EVENT,
    TEXT_RESIST_CHANGED_EVENT,
    TEXT_EDIT_CANCEL_EVENT,
    TEXT_EDIT_COMMIT_EVENT,
    TEXT_EDIT_END_EVENT,
    TEXT_EDIT_START_EVENT,
} from '../../constants/misc'
import { computeCounterScale, resolveResist } from '../../utils/counterScale'
import { readProperties, setProperties } from '../../utils/geometry'
import { isPanMode } from '../../utils/drawModeUtils'
import { pathHitsSelectionChrome } from '../../utils/canvasChrome'
import { svgTextScreenRect } from '../../utils/svgTextRect'
import { clampTextSizeOnScreen } from '../../utils/textResize'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementProps = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InternalState = Record<string, any>

interface ResizeState {
    centerX: number
    centerY: number
    startDist: number
    startSize: number
}

function Text(props: ElementProps): ReactElement {
    const {
        updateComponentBulkPropertiesInLocalStore,
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
        zuiInBase,
    } = useBaseContext()

    const { isMobile } = useMediaQueryUtils()
    const [showToolbar, toggleToolbar] = useState(false)
    const [, setShowMobilePanel] = useState(false)
    const [internalState, setInternalState] = useImmer<InternalState>({})
    const mobileTriggerRef = useRef<HTMLElement | null>(null)
    const [textValue, setTextValue] = useState<string>(
        (readProperties(props).content as string) || ''
    )
    const [, setTextSize] = useState<number>(
        (readProperties(props).fontSize as number) || 36
    )
    const textValueRef = useRef(textValue)
    const twoTextRef = useRef<ShapeLike>(null)
    const groupRef = useRef<ShapeLike>(null)
    const extraLineNodesRef = useRef<ShapeLike[]>([])
    const syncMultilineRef = useRef<(() => void) | null>(null)
    const blockRectRef = useRef<
        | (() => {
              left: number
              right: number
              top: number
              bottom: number
              width: number
              height: number
          })
        | null
    >(null)
    const selectorRef = useRef<ShapeLike>(null)

    const two = props.twoJSInstance
    const resistRef = useRef<number>(resolveResist(props))

    let selectorInstance: ShapeLike = null
    let groupObject: ShapeLike = null

    function onBlurHandler(e: FocusEvent): void {
        elementOnBlurHandler(e, selectorInstance, two)
        if (groupObject) {
            document
                .getElementById(`${groupObject.id}`)
                ?.removeEventListener('keydown', handleKeyDown)
        }
    }

    function handleKeyDown(e: KeyboardEvent): void {
        if (e.keyCode === 8 || e.keyCode === 46) {
            if (groupObject) {
                document.getElementById(`${groupObject.id}`)?.blur()
                props.handleDeleteComponent?.(groupObject)
                two.remove([groupObject])
            }
            two.update()
        }
    }

    function onFocusHandler(): void {
        if (!groupObject) return
        const el = document.getElementById(`${groupObject.id}`)
        if (el) {
            el.style.outline = '0'
            el.addEventListener('keydown', handleKeyDown)
        }
    }

    useEffect(() => {
        const prevX = props.x
        const prevY = props.y
        let handleGlobalMousedown: ((e: MouseEvent) => void) | null = null

        const elementFactory = new TextFactory(two, prevX, prevY, props)
        const { group, twoText } = elementFactory.createElement()
        group.elementData = { ...props.itemData, ...props }
        twoText.opacity = readOpacity(props)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commitSource = (): any => group.elementData ?? props

        twoTextRef.current = twoText
        groupObject = group
        groupRef.current = group

        const initialScale =
            (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
        if (initialScale) {
            group.scale = computeCounterScale(initialScale, resistRef.current)
        }

        const effectiveScale = (): number => {
            const sceneScale = two?.scene?.scale || 1
            const groupScale = typeof group.scale === 'number' ? group.scale : 1
            return sceneScale * groupScale || 1
        }

        const syncMultilineLayout = (): void => {
            const t = twoTextRef.current
            if (!t) return
            const lines = (textValueRef.current || '').split('\n')
            const n = lines.length
            const lineH = lineHeightFor(t.size || 36)
            const extra = extraLineNodesRef.current

            t.value = lines[0] ?? ''
            t.translation.set(0, (0 - (n - 1) / 2) * lineH)

            for (let i = 1; i < n; i++) {
                let node = extra[i - 1]
                if (!node) {
                    node = two.makeText(lines[i] ?? '', 0, 0)
                    group.add(node)
                    extra[i - 1] = node
                }
                node.value = lines[i] ?? ''
                node.fill = t.fill
                node.size = t.size
                node.family = t.family
                node.alignment = t.alignment
                node.baseline = t.baseline
                node.opacity = t.opacity
                node.translation.set(0, (i - (n - 1) / 2) * lineH)
            }
            if (extra.length > n - 1) {
                const surplus = extra.splice(Math.max(n - 1, 0))
                if (surplus.length > 0) group.remove(surplus)
            }
            two.update()
        }
        syncMultilineRef.current = syncMultilineLayout

        const blockRect = (): {
            left: number
            right: number
            top: number
            bottom: number
            width: number
            height: number
        } => {
            const nodes = [
                twoTextRef.current,
                ...extraLineNodesRef.current,
            ].filter(Boolean)
            let L = Infinity
            let R = -Infinity
            let T = Infinity
            let B = -Infinity
            nodes.forEach((nd) => {
                const r = nd.getBoundingClientRect(true)
                L = Math.min(L, r.left)
                R = Math.max(R, r.right)
                T = Math.min(T, r.top)
                B = Math.max(B, r.bottom)
            })
            if (L === Infinity) {
                return twoText.getBoundingClientRect(true)
            }
            return {
                left: L,
                right: R,
                top: T,
                bottom: B,
                width: R - L,
                height: B - T,
            }
        }

        blockRectRef.current = blockRect

        syncMultilineLayout()

        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector
        selectorRef.current = selector
        selector.setScale(effectiveScale())
        two.update()

        const cornerCircles: { dot: ShapeLike; hit: ShapeLike }[] = [
            { dot: selectorInstance.circle1, hit: selectorInstance.hitCircle1 },
            { dot: selectorInstance.circle2, hit: selectorInstance.hitCircle2 },
            { dot: selectorInstance.circle3, hit: selectorInstance.hitCircle3 },
            { dot: selectorInstance.circle4, hit: selectorInstance.hitCircle4 },
        ].filter(({ dot }) => Boolean(dot))

        const resizeCursors = [
            'nwse-resize',
            'nesw-resize',
            'nwse-resize',
            'nesw-resize',
        ]

        let resizeState: ResizeState | null = null

        const onResizeMouseMove = (e: MouseEvent): void => {
            if (!resizeState) return
            const { centerX, centerY, startDist, startSize } = resizeState
            const currentDist = Math.sqrt(
                (e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2
            )
            const scale = currentDist / Math.max(startDist, 1)
            const newSize = clampTextSizeOnScreen(
                startSize * scale,
                effectiveScale()
            )

            twoText.size = newSize
            twoText.leading = newSize
            extraLineNodesRef.current.forEach((nd) => {
                nd.size = newSize
                nd.leading = newSize
            })
            syncMultilineLayout()

            const bRect = blockRect()
            selectorInstance.update(
                bRect.left - 4,
                bRect.right + 4,
                bRect.top - 4,
                bRect.bottom + 4,
                effectiveScale()
            )

            setTextSize(newSize)
        }

        const onResizeMouseUp = (): void => {
            if (!resizeState) return
            const finalSize = twoText.size
            resizeState = null

            window.removeEventListener('mousemove', onResizeMouseMove)
            window.removeEventListener('mouseup', onResizeMouseUp)

            const bRect = blockRect()
            const newWidth = Math.round(bRect.width || 60)
            const newHeight = Math.round(bRect.height || twoText.size)

            const resizePatch = setProperties(commitSource(), {
                fontSize: finalSize,
                content: textValueRef.current,
            })
            updateComponentBulkPropertiesInLocalStore(props.id, {
                width: newWidth,
                height: newHeight,
                ...resizePatch,
            })
            if (group.elementData && resizePatch.metadata) {
                group.elementData.metadata = resizePatch.metadata
            }
        }

        cornerCircles.forEach(({ dot, hit }, index) => {
            const target = hit ?? dot
            const circleElem = target._renderer?.elem as HTMLElement | undefined
            if (!circleElem) return

            circleElem.style.cursor = resizeCursors[index] ?? 'pointer'
            circleElem.style.pointerEvents = 'all'

            circleElem.addEventListener('mousedown', (e: MouseEvent) => {
                if (selectorInstance.areaGroup.opacity === 0) return

                e.stopPropagation()
                e.preventDefault()

                const textDomElem = twoText._renderer.elem
                const textScreenRect = textDomElem.getBoundingClientRect()
                const centerX = textScreenRect.left + textScreenRect.width / 2
                const centerY = textScreenRect.top + textScreenRect.height / 2

                const startDist = Math.sqrt(
                    (e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2
                )

                resizeState = {
                    centerX,
                    centerY,
                    startDist,
                    startSize: twoText.size || 16,
                }

                window.addEventListener('mousemove', onResizeMouseMove)
                window.addEventListener('mouseup', onResizeMouseUp)
            })
        })

        const groupEl = document.getElementById(group.id)
        if (groupEl) {
            groupEl.setAttribute('class', 'dragger-picker')
            groupEl.setAttribute('data-component-id', props.id)
            groupEl.setAttribute('tabindex', '-1')
            groupEl.style.outline = 'none'
        }

        setInternalState((draft) => {
            draft.group = { id: group.id, data: group }
            draft.twoText = { id: twoText.id, data: twoText }
            draft.shape = { id: twoText.id, data: twoText }
            draft.text = { id: twoText.id, data: twoText }
            draft.icon = { data: {} }
        })

        const getGroupElementFromDOM = document.getElementById(`${group.id}`)
        getGroupElementFromDOM?.addEventListener('focus', onFocusHandler)
        getGroupElementFromDOM?.addEventListener('blur', onBlurHandler)

        const showTextInput = (): void => {
            if (isPanMode()) return
            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            const fontSize = twoText.size || 36
            const cssFontSize = fontSize * effectiveScale()
            const lineH = Math.ceil(cssFontSize * 1.6)
            const vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4

            const textDomElem = twoText._renderer.elem as SVGGraphicsElement
            const screenRect = svgTextScreenRect(textDomElem, cssFontSize)

            groupDomElem.style.display = 'none'

            const input = document.createElement('textarea')
            const randomId = Math.floor(Math.random() * 90 + 10)
            input.id = `geo-text-input-area-${randomId}`
            input.value = textValueRef.current
            input.rows = 1
            input.style.border = 'none'
            input.style.background = 'transparent'
            input.style.padding = `${vertPad}px 8px`
            input.style.color = twoText.fill || '#3A342C'
            input.style.fontSize = `${cssFontSize}px`
            input.style.fontFamily = twoText.family || DEFAULT_TEXT_FONT_FAMILY
            input.style.fontWeight = twoText.weight || 'normal'
            input.style.lineHeight = `${lineH}px`
            input.style.letterSpacing = '0px'
            input.style.textAlign = 'left'
            input.style.position = 'absolute'
            input.style.outline = 'none'
            input.style.resize = 'none'
            input.style.overflow = 'visible'
            input.style.whiteSpace = 'pre'
            input.style.boxSizing = 'border-box'
            input.className = 'temp-input-area'

            const centerY = screenRect.top + screenRect.height / 2
            const leftAnchor = screenRect.left - 8

            document.getElementById('main-two-root')?.append(input)

            const measureSpan = document.createElement('span')
            measureSpan.style.position = 'absolute'
            measureSpan.style.visibility = 'hidden'
            measureSpan.style.whiteSpace = 'pre'
            measureSpan.style.fontSize = `${cssFontSize}px`
            measureSpan.style.fontFamily =
                twoText.family || DEFAULT_TEXT_FONT_FAMILY
            measureSpan.style.fontWeight = twoText.weight || 'normal'
            measureSpan.style.lineHeight = `${lineH}px`
            measureSpan.style.letterSpacing = '0px'
            measureSpan.style.padding = '0'
            document.body.appendChild(measureSpan)

            const autoSizeAndCenter = (): void => {
                const val = input.value || 'M'
                measureSpan.textContent = val

                const measuredW = measureSpan.offsetWidth
                const measuredH = measureSpan.offsetHeight

                const contentWidth = Math.max(
                    measuredW + 40,
                    screenRect.width + 40,
                    80
                )
                const contentHeight = Math.max(
                    measuredH + vertPad * 2,
                    lineH + vertPad * 2
                )

                input.style.width = `${contentWidth}px`
                input.style.height = `${contentHeight}px`

                input.style.left = `${leftAnchor}px`
                input.style.top = `${centerY - contentHeight / 2}px`
            }

            autoSizeAndCenter()

            input.addEventListener('input', autoSizeAndCenter)

            input.onfocus = function (): void {
                const bRect = blockRect()
                selectorInstance.update(
                    bRect.left - 4,
                    bRect.right + 4,
                    bRect.top - 4,
                    bRect.bottom + 4,
                    effectiveScale()
                )
                selectorInstance.show()
                two.update()
            }

            input.focus()

            const valueAtOpen = textValueRef.current

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

            input.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) {
                        return
                    }
                    event.preventDefault()
                    input.blur()
                }
                if (event.key === 'Escape') {
                    event.preventDefault()
                    input.blur()
                }
            })

            input.addEventListener('blur', () => {
                input.removeEventListener('input', autoSizeAndCenter)
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
                if (measureSpan.parentNode) {
                    measureSpan.parentNode.removeChild(measureSpan)
                }

                groupDomElem.style.display = ''

                const newContent = input.value
                setTextValue(newContent)
                textValueRef.current = newContent

                syncMultilineLayout()

                const bRect = blockRect()
                const newWidth = Math.round(bRect.width || 60)
                const newHeight = Math.round(bRect.height || twoText.size)

                selectorInstance.update(
                    bRect.left - 4,
                    bRect.right + 4,
                    bRect.top - 4,
                    bRect.bottom + 4,
                    effectiveScale()
                )
                selectorInstance.hide()
                two.update()

                const commitPatch = setProperties(commitSource(), {
                    content: textValueRef.current,
                })
                updateComponentBulkPropertiesInLocalStore(props.id, {
                    width: newWidth,
                    height: newHeight,
                    ...commitPatch,
                })

                if (group.elementData && commitPatch.metadata) {
                    group.elementData.metadata = commitPatch.metadata
                }

                input.remove()
            })
        }

        twoText._renderer.elem.addEventListener('dblclick', () => {
            showTextInput()
        })
        getGroupElementFromDOM?.addEventListener('dblclick', () => {
            showTextInput()
        })

        const handleTriggerTextInput = (e: Event): void => {
            const detail = (e as CustomEvent<{ elementId: string }>).detail
            if (detail?.elementId === props.id) {
                setTimeout(() => showTextInput(), 100)
            }
        }
        window.addEventListener('triggerTextInput', handleTriggerTextInput)

        interact(`#${group.id}`).on('click', () => {
            const bRect = blockRect()
            selector.update(
                bRect.left - 4,
                bRect.right + 4,
                bRect.top - 4,
                bRect.bottom + 4,
                effectiveScale()
            )
            two.update()
            toggleToolbar(true)
        })

        handleGlobalMousedown = (e: MouseEvent): void => {
            const path: EventTarget[] = e.composedPath ? e.composedPath() : []
            const isOnGroup = path.some(
                (el: EventTarget) => (el as HTMLElement)?.id === group.id
            )
            const isOnToolbar = pathHitsSelectionChrome(path)
            const isOnMobileTrigger =
                mobileTriggerRef.current &&
                path.includes(mobileTriggerRef.current)
            if (!isOnGroup && !isOnToolbar && !isOnMobileTrigger) {
                selectorInstance.hide()
                toggleToolbar(false)
                two.update()
            }
        }
        window.addEventListener('mousedown', handleGlobalMousedown)

        return (): void => {
            window.removeEventListener(
                'triggerTextInput',
                handleTriggerTextInput
            )
            if (handleGlobalMousedown) {
                window.removeEventListener('mousedown', handleGlobalMousedown)
            }
            window.removeEventListener('mousemove', onResizeMouseMove)
            window.removeEventListener('mouseup', onResizeMouseUp)

            const scene = two?.scene
            const stillMounted =
                !!groupObject &&
                !!scene?.children?.find(
                    (c: ShapeLike) => c?.id === groupObject.id
                )
            if (stillMounted) two.remove(groupObject)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            if (!group) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            group.scale = computeCounterScale(scale, resistRef.current)
            selectorRef.current?.setScale(scale * group.scale)
            two.update()
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
    }, [two])

    useEffect(() => {
        const onResistChanged = ((
            e: CustomEvent<{ id: string; resist: number }>
        ): void => {
            if (e.detail?.id !== props.id) return
            resistRef.current = e.detail.resist
            const group = groupRef.current
            if (!group) return
            const scale = two?.scene?.scale || 1
            group.scale = computeCounterScale(scale, resistRef.current)
            selectorRef.current?.setScale(scale * group.scale)
            two?.update()
        }) as EventListener
        window.addEventListener(TEXT_RESIST_CHANGED_EVENT, onResistChanged)
        return (): void => {
            window.removeEventListener(
                TEXT_RESIST_CHANGED_EVENT,
                onResistChanged
            )
        }
    }, [props.id, two])

    useEffect(() => {
        const onSelectorRefresh = ((e: CustomEvent<{ id: string }>): void => {
            if (e.detail?.id !== props.id) return
            const selector = selectorRef.current
            const measure = blockRectRef.current
            const group = groupRef.current
            if (!selector || !measure || !group) return

            const sceneScale = two?.scene?.scale || 1
            const groupScale = typeof group.scale === 'number' ? group.scale : 1
            const bRect = measure()
            selector.show()
            selector.update(
                bRect.left - 4,
                bRect.right + 4,
                bRect.top - 4,
                bRect.bottom + 4,
                sceneScale * groupScale || 1
            )
        }) as EventListener
        window.addEventListener(
            TEXT_SELECTOR_REFRESH_EVENT,
            onSelectorRefresh
        )
        return (): void => {
            window.removeEventListener(
                TEXT_SELECTOR_REFRESH_EVENT,
                onSelectorRefresh
            )
        }
    }, [props.id, two])

    useEffect(() => {
        if (internalState?.group?.data) {
            internalState.group.data.translation.x = props.x
            internalState.group.data.translation.y = props.y
            two.update()
        }

        if (internalState?.twoText?.data) {
            const twoText = internalState.twoText.data

            if (props.textColor) {
                twoText.fill = props.textColor
            }
            const liveProps = readProperties(props)
            if (typeof liveProps.fontSize === 'number') {
                twoText.size = liveProps.fontSize
                setTextSize(liveProps.fontSize)
            }
            if (typeof liveProps.textFontFamily === 'string') {
                twoText.family = liveProps.textFontFamily
            }
            if (
                typeof liveProps.content === 'string' &&
                liveProps.content !== textValueRef.current
            ) {
                textValueRef.current = liveProps.content
                setTextValue(liveProps.content)
            }

            syncMultilineRef.current?.()

            two.update()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.x, props.y, props.textColor, props.metadata])

    useEffect(() => {
        const handleTextReverted = ((
            e: CustomEvent<{ id: string; content: string }>
        ): void => {
            if (e.detail?.id !== props.id) return
            const content = e.detail.content ?? ''
            textValueRef.current = content
            setTextValue(content)
            syncMultilineRef.current?.()
            two?.update()
        }) as EventListener
        window.addEventListener('standaloneTextReverted', handleTextReverted)
        return () =>
            window.removeEventListener(
                'standaloneTextReverted',
                handleTextReverted
            )
    }, [props.id, two])

    useEffect(() => {
        if (!showToolbar) setShowMobilePanel(false)
    }, [showToolbar])

    useEffect(() => {
        const groupId = internalState?.group?.id
        const el = groupId ? document.getElementById(groupId) : null
        if (el) {
            el.style.pointerEvents =
                isPencilMode ||
                isArrowDrawMode ||
                isTextDrawMode ||
                isArrowSelected
                    ? 'none'
                    : 'auto'
        }
    }, [
        isPencilMode,
        isArrowDrawMode,
        isTextDrawMode,
        isArrowSelected,
        internalState?.group?.id,
    ])

    void TEXT_SIZES_OBJECT
    void MOBILE_TEXT_SIZES_OBJECT

    return (
        <React.Fragment>
            <div id="two-geo-text"></div>
        </React.Fragment>
    )
}

export default Text
