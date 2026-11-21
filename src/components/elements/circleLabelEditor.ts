import {
    TEXT_EDIT_CANCEL_EVENT,
    TEXT_EDIT_COMMIT_EVENT,
    TEXT_EDIT_END_EVENT,
    TEXT_EDIT_START_EVENT,
} from '../../constants/misc'
import { isPanMode } from '../../utils/drawModeUtils'
import { lineHeightFor } from '../../utils/textLayout'
import { setProperties } from '../../utils/geometry'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
    circleWrapWidth,
    getCircleLabelGroup,
} from '../../factory/circleLabel'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

export interface CircleLabelEditorOptions {
    two: ShapeLike
    group: ShapeLike
    id: string
    getLabelScale: () => number
    updateComponentBulkPropertiesInLocalStore?: (
        id: string,
        patch: Record<string, unknown>
    ) => void
}

export function editorIdFor(id: string): string {
    return `circle-label-input-${id}`
}

export function openCircleLabelEditor({
    two,
    group,
    id,
    getLabelScale,
    updateComponentBulkPropertiesInLocalStore,
}: CircleLabelEditorOptions): void {
    if (isPanMode()) return

    const elementId = editorIdFor(id)
    if (document.getElementById(elementId)) return

    const ellipse = group?.children?.[0]
    const ellipseElem = ellipse?._renderer?.elem as
        | SVGGraphicsElement
        | undefined
    if (!ellipseElem) return

    const ellipseRect = ellipseElem.getBoundingClientRect()
    const sceneScale = two?.scene?.scale || 1
    const labelScale = getLabelScale() || 1
    const effScale = sceneScale * labelScale

    const record = group.elementData ?? {}
    const fontFamily = circleLabelFontFamilyOf(record)
    const fontSize = circleLabelFontSizeOf(record)
    const fontColor = circleLabelColorOf(record)
    const valueAtOpen = circleLabelOf(record)

    const cssFontSize = fontSize * effScale
    const cssLineH = lineHeightFor(fontSize) * effScale
    const cssWidth =
        circleWrapWidth(record.width ?? ellipse?.width ?? 100, fontSize) *
        effScale

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

    const onEditRequest = (e: Event): void => {
        const detail = (e as CustomEvent<{ id?: string }>).detail
        if (detail?.id && detail.id !== id) return
        if (e.type === TEXT_EDIT_CANCEL_EVENT) {
            input.value = valueAtOpen
        }
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

        updateComponentBulkPropertiesInLocalStore?.(id, labelPatch)
    }

    input.addEventListener('blur', commit)
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            input.blur()
        }
    })

    input.focus()
    input.select()
}
