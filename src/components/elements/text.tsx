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
import { svgTextScreenRect } from '../../utils/svgTextRect'

// Text renders exactly like NewText — same TextFactory, same multiline
// editing, resize handles and floating-toolbar contract. What separates the two
// is not how they draw but where they belong: text carries
// `objectClass: 'geo'`, so it lives on the map base and hides on the board base
// (geoVisibility.ts), while newText is whiteboard text.
//
// It counter-scales like a point pin (TEXT_RESIST). That was dropped once,
// on the reasoning that annotation text should scale with the geography it
// labels — which reads well until you price it against the map base's zoom
// range. Surface-space text renders at `fontSize * zuiScale`, and zuiScale is
// `2^(mapZoom - anchor.zoom)` over 18 stops, so an 18px label sits at 0.3px
// over a county and 0.0005px at world view. "Scales with the geography" and
// "is readable" cannot both hold across 18 stops; readable wins — as the
// DEFAULT.
//
// The scales-with-the-geography model is still reachable per record, via the
// "Zoom resistant" switch in the text properties: it writes the `zoomResistant`
// column, `resolveResist` turns `false` into resist 0, and this component reads
// that through resistRef. It is per record, so two labels on one map can use
// two different models through the same zoom gesture.

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
    // Satellite Two.Text nodes for lines 2..N (line 1 stays `twoText`), and a
    // ref to the layout sync so the metadata effect can re-run it.
    const extraLineNodesRef = useRef<ShapeLike[]>([])
    const syncMultilineRef = useRef<(() => void) | null>(null)
    // `blockRect` lives in the mount effect's closure; the selector-refresh
    // listener below is a separate effect and needs the same measurement.
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
    // Held in a ref, not a const: the "Zoom resistant" switch writes the
    // `zoomResistant` column, but ElementRenderWrapper freezes our props at
    // mount so that write never arrives as a re-render. The
    // TEXT_RESIST_CHANGED_EVENT listener below is what keeps this current.
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

        /**
         * What an edit commits its geometry FROM.
         *
         * Never `props`. ElementRenderWrapper freezes an element's props at
         * mount, and the toolbar's Text tool creates its element off-screen at
         * -9999,-9999, placing it only on the click that follows. So the
         * frozen bag still says -9999 long after the text is sitting where the
         * user put it.
         *
         * That matters because `setProperties` REBUILDS metadata.geometry from
         * whatever source it is handed — so committing a size change or the
         * editor's blur from `props` wrote the placeholder position back over
         * the placement. Nothing looked wrong: the Two.js translation was set
         * at placement and is never re-read from metadata. The text only went
         * missing on the next load, ~10,000 surface units from anything.
         *
         * `group.elementData` is the live copy, and the placement path keeps
         * it in step (`Object.assign(group.elementData, placement)` in
         * base.tsx) precisely so element-side editors have something truthful
         * to commit from — a point's label was fixed this way and text was
         * left behind.
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commitSource = (): any => group.elementData ?? props

        twoTextRef.current = twoText
        groupObject = group
        groupRef.current = group

        // Seed the counter-scale from the current camera so the text is sized
        // correctly before the first zoom event fires. The base context holds
        // the addZUI wrapper ({ zui, ... }); the live scale is on the nested ZUI
        // instance (fall back to the scene scale). Mirrors point.tsx.
        const initialScale =
            (zuiInBase as ShapeLike)?.zui?.scale ?? two?.scene?.scale
        if (initialScale) {
            group.scale = computeCounterScale(initialScale, resistRef.current)
        }

        /**
         * On-screen scale of anything inside this group: the camera's scale
         * times the group's own zoom-resist counter-scale. Both multiplications
         * apply to the selector outline and to the editing overlay's font size.
         */
        const effectiveScale = (): number => {
            const sceneScale = two?.scene?.scale || 1
            const groupScale = typeof group.scale === 'number' ? group.scale : 1
            return sceneScale * groupScale || 1
        }

        // Multiline rendering: `twoText` holds line 1; satellite Two.Text nodes
        // hold lines 2..N. We honor only hard newlines (Shift+Enter). The whole
        // block is vertically centered around the group origin.
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

        // Union screen box over every line node so the selection rectangle
        // encloses the whole multiline block (not just line 1). Reads
        // getBoundingClientRect, so it already reflects the group's counter-scale.
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

        // Render any persisted multiline content as the stacked block.
        syncMultilineLayout()

        const { selector } = getEditComponents(two, group, 4)
        selectorInstance = selector
        selectorRef.current = selector
        selector.setScale(effectiveScale())
        two.update()

        // Resize via corner handles (proportional font-size scaling).
        //
        // The press goes on the selector's transparent stand-in, NOT on the
        // visible dot. The stand-ins are siblings drawn on top of the dots, so
        // a listener on the dot never sees the event — it is hit-tested away,
        // and nothing bubbles between siblings. `elementFromPoint` in
        // newCanvas's touch pipeline resolves the stand-in for the same
        // reason. Falls back to the dot so a selector built without stand-ins
        // still resizes (see utils/selectionTheme, objectSelector).
        const cornerCircles: { dot: ShapeLike; hit: ShapeLike }[] = [
            { dot: selectorInstance.circle1, hit: selectorInstance.hitCircle1 },
            { dot: selectorInstance.circle2, hit: selectorInstance.hitCircle2 },
            { dot: selectorInstance.circle3, hit: selectorInstance.hitCircle3 },
            { dot: selectorInstance.circle4, hit: selectorInstance.hitCircle4 },
        ].filter(({ dot }) => Boolean(dot))

        const resizeCursors = [
            'nwse-resize', // circle1 = TL
            'nesw-resize', // circle2 = TR
            'nwse-resize', // circle3 = BR
            'nesw-resize', // circle4 = BL
        ]

        let resizeState: ResizeState | null = null

        const onResizeMouseMove = (e: MouseEvent): void => {
            if (!resizeState) return
            const { centerX, centerY, startDist, startSize } = resizeState
            const currentDist = Math.sqrt(
                (e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2
            )
            const scale = currentDist / Math.max(startDist, 1)
            const newSize = Math.round(
                Math.min(Math.max(startSize * scale, 8), 300)
            )

            twoText.size = newSize
            twoText.leading = newSize
            extraLineNodesRef.current.forEach((nd) => {
                nd.size = newSize
                nd.leading = newSize
            })
            // Re-stack for the new line height, then box the whole block.
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
            // Deleting and deselecting ride on this <g>'s focus/blur. Blink
            // focuses an SVG node on click regardless; Gecko and WebKit only
            // focus one with a tabindex — without it Delete does nothing in
            // Firefox. See focusSvgElement in canvasUtils.
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
            // Pan mode navigates, it does not author. Our dblclick listeners sit
            // on our own SVG nodes, so newCanvas's canvas-level guard never sees
            // them — and pan is the tool a map user lives in, where a stray
            // double-tap must not open a text field.
            if (isPanMode()) return
            const groupDomElem = document.getElementById(`${group.id}`)
            if (!groupDomElem) return

            // The editing overlay must render at the same on-screen size as
            // the glyphs it covers. That is the text size through the camera
            // AND through the group's zoom-resist counter-scale — the camera
            // alone was what made the textarea microscopic on a zoomed-out map,
            // exactly like the glyphs underneath it.
            //
            // Resolved BEFORE the measurement below, which needs the font size
            // to place an empty text's box. See svgTextScreenRect.
            const fontSize = twoText.size || 36
            const cssFontSize = fontSize * effectiveScale()
            const lineH = Math.ceil(cssFontSize * 1.6)
            const vertPad = Math.ceil((lineH - cssFontSize) / 2) + 4

            const textDomElem = twoText._renderer.elem as SVGGraphicsElement
            // Measured while the group is still visible — a display:none
            // subtree measures as zero — and through svgTextScreenRect, because
            // a text being placed has no glyphs yet and Firefox reports no
            // position at all for an empty <text>.
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

            // What the text was when the editor opened — the value ✗ puts back.
            const valueAtOpen = textValueRef.current

            // On-screen ✓/✗ (mobile has no Enter or Escape). The buttons are
            // React chrome in base.tsx; this is their other end.
            const onEditRequest = (e: Event): void => {
                const detail = (e as CustomEvent<{ id?: string }>).detail
                if (detail?.id && detail.id !== props.id) return
                if (e.type === TEXT_EDIT_CANCEL_EVENT) {
                    input.value = valueAtOpen
                }
                // The blur handler is the single commit path — cancel just
                // restores the old text before letting it run.
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
                        // Shift+Enter inserts a newline (textarea is
                        // whiteSpace:'pre'); hard newlines are preserved.
                        return
                    }
                    // Plain Enter commits and closes the editor.
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

                // Restore to '' — NOT 'block'. This inline style only exists
                // to hide the text while the textarea overlays it, and an
                // inline `display` OVERRIDES the `display` attribute Two.js
                // writes from its own `.visible` flag. Hard-coding 'block' here
                // pinned the element visible: create text on the board base,
                // then switch to the map (the switcher click is what blurs the
                // editor) and `applyBaseTypeVisibility` correctly set
                // visible=false + display="none" on the <g>, but the inline
                // block won and the text lingered over the map until reload.
                // Clearing the property hands display back to Two.js.
                groupDomElem.style.display = ''

                // Raw text — may contain hard newlines from Shift+Enter.
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
            const isOnToolbar = path.some(
                (el: EventTarget) =>
                    (el as HTMLElement)?.id === 'floating-toolbar'
            )
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

            // Remove our group from the scene.
            //
            // Every other element component does this; text was the exception,
            // and it is what made the mobile delete button look broken: the
            // trash button's safety net drops the RECORD (the store is the
            // single teardown owner per CLAUDE.md), React unmounts us — and the
            // glyphs stayed on the canvas until a reload, because nobody ever
            // took the group out of the scene.
            //
            // Guarded because the keyboard path removes it first (see
            // handleKeyDown): removing an id the scene no longer owns is a
            // no-op in Two.js, but a second subtraction of a node whose SVG is
            // already detached is exactly the `scene.subtractions` hazard
            // CLAUDE.md documents, so we only remove what is still there.
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

    // Counter-scale the text on every camera change so it stays legible when
    // the world zooms out. Reads the scale from the event each fire — no stale
    // closure (see the React + Two.js stale-closure note in CLAUDE.md).
    //
    // At resist 0 (the switch turned off) computeCounterScale returns 1, so the
    // group simply rides the camera and the label scales with the map. Same code
    // path either way — only the exponent differs.
    useEffect(() => {
        const onZoom = (e: Event): void => {
            const group = groupRef.current
            if (!group) return
            const scale = (e as CustomEvent<{ scale: number }>).detail?.scale
            if (!scale) return
            group.scale = computeCounterScale(scale, resistRef.current)
            // Re-normalise the selection outline so it stays a constant screen
            // width instead of drifting thick or hairline across the map base's
            // 18 zoom stops.
            selectorRef.current?.setScale(scale * group.scale)
            two.update()
        }
        window.addEventListener('zoomChanged', onZoom as EventListener)
        return (): void => {
            window.removeEventListener('zoomChanged', onZoom as EventListener)
        }
    }, [two])

    // The "Zoom resistant" switch (and undo/redo of it) reaches us here rather
    // than through props — see resistRef above. Re-scale against the CURRENT
    // camera immediately so the label snaps to its new model on click, instead
    // of waiting for the next zoom gesture. Filtered by id: every text on the
    // base hears this event, only the toggled one acts on it.
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

    // Re-box the selection after the properties toolbar changes this text's
    // size or family. The toolbar mutates the Two.Text nodes directly, so the
    // glyphs repaint but the selection box keeps the bounds it was built from.
    //
    // Left alone, what the user saw depended on a focus difference rather than
    // on anything deliberate: Chromium fires `blur` on our SVG group when the
    // toolbar takes focus and `elementOnBlurHandler` hid the box, so the
    // selection vanished; Firefox does not fire it, so a box at the OLD size
    // stayed on screen around the new glyphs. Measuring again and keeping the
    // selection makes both engines do what dragging the resize handle has
    // always done.
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
            // show() BEFORE update(): it only sets opacity, while update()
            // ends in the two.update() that paints. Calling it after would
            // need a second repaint, which is the back-to-back update() the
            // subtractions pitfall in CLAUDE.md warns about.
            //
            // Chromium has already hidden the box by this point; on Firefox
            // this is a no-op. Either way it ends up visible and correct.
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

            // Propagate style/content changes across every line node and
            // restack (handles font-size/family/color from the toolbar and
            // group-apply, plus external content updates).
            syncMultilineRef.current?.()

            two.update()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.x, props.y, props.textColor, props.metadata])

    // Undo/redo reverts text via the history hook, but ElementRenderWrapper
    // freezes our props at mount so the metadata effect above never re-fires.
    // The hook dispatches this event instead; we re-stack through the
    // component's own multiline path so extraLineNodesRef stays consistent.
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

    // TEXT_SIZES_OBJECT and MOBILE_TEXT_SIZES_OBJECT used by callbacks
    // wired in via the toolbar; keep imports referenced via a no-op.
    void TEXT_SIZES_OBJECT
    void MOBILE_TEXT_SIZES_OBJECT

    return (
        <React.Fragment>
            <div id="two-geo-text"></div>
        </React.Fragment>
    )
}

export default Text
