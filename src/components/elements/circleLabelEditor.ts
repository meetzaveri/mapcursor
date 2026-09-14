import {
    TEXT_EDIT_CANCEL_EVENT,
    TEXT_EDIT_COMMIT_EVENT,
    TEXT_EDIT_END_EVENT,
    TEXT_EDIT_START_EVENT,
} from '../../constants/misc'
import { isPanMode } from '../../utils/drawModeUtils'
import { lineHeightFor } from '../../utils/textLayout'
import { usableTextWidth } from '../../utils/shapeTextFit'
import { setProperties } from '../../utils/geometry'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
    getCircleLabelGroup,
} from '../../factory/circleLabel'

// The map circle's naming overlay.
//
// A DOM <textarea> floated over the canvas, not a Two.js affordance — the same
// shape as point.tsx's showLabelInput and text.tsx's editor, and it lives in
// its own module because circle.tsx has no room for 200 lines of it.
//
// It is a TEXTAREA rather than point.tsx's <input> because a circle's label
// wraps: Enter inserts a newline here and blur commits, matching text.tsx.
//
// What it must never do is touch `width`/`height`. A circle's size is its
// radius; craftbase's equivalent editor grew the shape to fit the text, which
// is exactly the behaviour this element cannot have.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export interface CircleLabelEditorOptions {
    two: ShapeLike
    group: ShapeLike
    id: string
    /** Live scale of the label sub-group, folded into the on-screen metrics. */
    getLabelScale: () => number
    updateComponentBulkPropertiesInLocalStore?: (
        id: string,
        patch: Record<string, unknown>
    ) => void
}

export function editorIdFor(id: string): string {
    return `circle-label-input-${id}`
}

/**
 * Open the label editor for a circle. No-op in pan mode, or if one is already
 * open for this element.
 */
export function openCircleLabelEditor({
    two,
    group,
    id,
    getLabelScale,
    updateComponentBulkPropertiesInLocalStore,
}: CircleLabelEditorOptions): void {
    // Pan mode navigates, it does not author. This editor is reached by a
    // dblclick bound to our own SVG node, so the canvas-level guard in
    // newCanvas never sees it — and on a map base pan is a tool the user sits
    // in, so without this a stray double-tap while panning drops them into a
    // text field.
    if (isPanMode()) return

    const elementId = editorIdFor(id)
    if (document.getElementById(elementId)) return

    // Anchor off the ELLIPSE, not the label: an empty label has no glyphs and
    // therefore no usable bounding box, which is the state this opens in most
    // often. `children[0]` is the ellipse by construction (circle.tsx unshifts
    // it), and the label sub-group is appended after it.
    const ellipse = group?.children?.[0]
    const ellipseElem = ellipse?._renderer?.elem as
        | SVGGraphicsElement
        | undefined
    if (!ellipseElem) return

    const ellipseRect = ellipseElem.getBoundingClientRect()
    const sceneScale = two?.scene?.scale || 1
    const labelScale = getLabelScale() || 1
    // A circle's label folds its own counter-scale on top of the camera, the
    // same way a point's folds its group's.
    const effScale = sceneScale * labelScale

    // Read off elementData rather than React props: size and family are
    // editable from the toolbar and props are frozen at mount, so the prop copy
    // goes stale the moment the user picks either.
    const record = group.elementData ?? {}
    const fontFamily = circleLabelFontFamilyOf(record)
    const fontSize = circleLabelFontSizeOf(record)
    const fontColor = circleLabelColorOf(record)
    const valueAtOpen = circleLabelOf(record)

    const cssFontSize = fontSize * effScale
    const cssLineH = lineHeightFor(fontSize) * effScale
    // Wrap the editor where the rendered label will wrap. `usableTextWidth`
    // is in surface units and the rendered label is measured there too (the
    // wrap is taken at the scale-1 reference — see buildCircleLabel), so the
    // editor's box is that same width brought onto the screen by the camera
    // AND the label's counter-scale.
    const cssWidth = Math.max(
        usableTextWidth('circle', record.width ?? ellipse?.width ?? 100) *
            effScale,
        cssFontSize * 4
    )

    // The rendered label steps aside so the glyphs aren't drawn twice at
    // slightly different metrics.
    const labelGroup = getCircleLabelGroup(group)
    const renderedOpacity = labelGroup?.opacity ?? 1
    if (labelGroup) labelGroup.opacity = 0
    two.update()

    const input = document.createElement('textarea')
    input.id = elementId
    input.value = valueAtOpen
    input.placeholder = 'Name this area'
    input.className = 'temp-input-area'
    input.rows = 1
    input.style.position = 'absolute'
    input.style.border = 'none'
    input.style.background = 'transparent'
    input.style.outline = 'none'
    input.style.resize = 'none'
    input.style.overflow = 'hidden'
    input.style.padding = '0'
    input.style.margin = '0'
    input.style.textAlign = 'center'
    input.style.color = fontColor
    input.style.fontSize = `${cssFontSize}px`
    input.style.fontFamily = fontFamily
    input.style.lineHeight = `${cssLineH}px`
    input.style.width = `${cssWidth}px`
    input.style.whiteSpace = 'pre-wrap'
    input.style.overflowWrap = 'anywhere'

    const centreX = ellipseRect.left + ellipseRect.width / 2
    const centreY = ellipseRect.top + ellipseRect.height / 2

    // Grow downward from the caret and keep the block centred on the circle.
    const autoSize = (): void => {
        const lineCount = Math.max(
            1,
            Math.ceil(input.scrollHeight / cssLineH) || 1
        )
        const h = lineCount * cssLineH
        input.style.height = `${h}px`
        input.style.left = `${centreX - cssWidth / 2}px`
        input.style.top = `${centreY - h / 2}px`
    }
    input.style.height = `${cssLineH}px`
    document.getElementById('main-two-root')?.append(input)
    autoSize()
    input.addEventListener('input', autoSize)

    // On-screen ✓/✗ (mobile has no Enter or Escape). The buttons are React
    // chrome in base.tsx; this is their other end.
    const onEditRequest = (e: Event): void => {
        const detail = (e as CustomEvent<{ id?: string }>).detail
        if (detail?.id && detail.id !== id) return
        if (e.type === TEXT_EDIT_CANCEL_EVENT) {
            input.value = valueAtOpen
        }
        // Commit runs on blur either way — cancel just restores first, so
        // "cancel" and "confirm" share one write path.
        input.blur()
    }
    window.addEventListener(TEXT_EDIT_COMMIT_EVENT, onEditRequest)
    window.addEventListener(TEXT_EDIT_CANCEL_EVENT, onEditRequest)
    window.dispatchEvent(
        new CustomEvent(TEXT_EDIT_START_EVENT, { detail: { id } })
    )

    const commit = (): void => {
        input.removeEventListener('input', autoSize)
        window.removeEventListener(TEXT_EDIT_COMMIT_EVENT, onEditRequest)
        window.removeEventListener(TEXT_EDIT_CANCEL_EVENT, onEditRequest)
        window.dispatchEvent(
            new CustomEvent(TEXT_EDIT_END_EVENT, { detail: { id } })
        )

        const value = input.value.trim()
        input.remove()

        const labelPatch = setProperties(group.elementData ?? record, {
            label: value,
        })
        // Frozen props mean React won't re-render this element, so the scene
        // nodes and elementData here are the live copies — keep both in step
        // with the store write.
        if (group.elementData && labelPatch.metadata) {
            group.elementData.metadata = labelPatch.metadata
        }

        const rebuilt = buildCircleLabel(two, group, {
            text: value,
            fontFamily: circleLabelFontFamilyOf(group.elementData ?? record),
            fontSize: circleLabelFontSizeOf(group.elementData ?? record),
            color: circleLabelColorOf(group.elementData ?? record),
            width: group.elementData?.width ?? record.width ?? 100,
        })
        if (rebuilt) {
            rebuilt.opacity = renderedOpacity
            rebuilt.scale = labelScale
        }
        two.update()

        // Properties only — naming a circle leaves its geometry alone, and
        // `setProperties` carries the existing geometry through unchanged.
        updateComponentBulkPropertiesInLocalStore?.(id, labelPatch)
    }

    input.addEventListener('blur', commit)
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        // Enter is a newline here, not a commit: this label wraps. Escape
        // keeps what was typed, same as every other text editor on the canvas.
        if (event.key === 'Escape') {
            event.preventDefault()
            input.blur()
        }
    })

    input.focus()
    input.select()
}
