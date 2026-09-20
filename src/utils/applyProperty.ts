import {
    strokeTypeToDashes,
    clearDashesOnTwoJSShape,
    strokeToAreaFill,
} from './misc'
import { getShapeTextNodes } from './canvasUtils'
import { getPointCircle, getPointLabelNode } from '../factory/point'
import { POINT_LABEL_SIZES } from '../constants/misc'
import { capCenterOffset } from '../utils/fontMetrics'
import { setProperties } from './geometry'
import { LEGEND_STYLE_KEYS } from '../types/legend'
import {
    TEXT_RESIST,
    TEXT_RESIST_CHANGED_EVENT,
} from '../constants/misc'
import {
    computeCounterScale,
    isStrokeScaled,
    resolveLabelResist,
    resolveResist,
} from './counterScale'
import {
    buildCircleLabel,
    circleLabelColorOf,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
    getCircleLabelNodes,
} from '../factory/circleLabel'

// Scene-bound selectedComponent shape: `.shape.data`, `.text.data`, and
// `.group.data.elementData` are scaffolded by newCanvas / element renderers
// (Stages 7–9). Loose-but-bounded here so applyProperty can compile without
// dragging in the still-JS canvas types.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectedComponentLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentRow = Record<string, any>

type PropertyKey =
    | 'fill'
    | 'stroke'
    | 'linewidth'
    | 'strokeType'
    | 'opacity'
    | 'textColor'
    | 'textSize'
    | 'textFontFamily'
    | 'zoomResistant'

export interface ApplyPropertyDeps {
    selectedComponent: SelectedComponentLike | null
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRow>
    ) => void
    updateBulkPropsForRectangleWithText?: (
        id: string,
        bulkObj: Partial<ComponentRow>
    ) => void
    handleTextSizeChange?: (value: unknown) => void
    handleRectangleTextSizeChange?: (value: unknown) => void
    handleTextFontFamilyChange?: (value: unknown) => void
    handleRectangleTextFontFamilyChange?: (value: unknown) => void
    setDefaultFill: (value: string) => void
    setDefaultStrokeColor: (value: string) => void
    setDefaultLinewidth: (value: number) => void
    setDefaultStrokeType: (value: string | null) => void
    setDefaultOpacity: (value: number) => void
    setDefaultTextColor: (value: string) => void
    setDefaultTextSize: (value: string) => void
    setDefaultTextFontFamily: (value: string) => void
}

// Applies a property change to the relevant default and (if present) the
// currently-selected element. This is the single mutation path used by the
// unified element-properties toolbar.
//
// Property keys are toolbar-facing names:
//   fill, stroke, linewidth, strokeType, opacity,
//   textColor, textSize, textFontFamily
//
// strokeType values are the UI labels: 'solid' | 'dashed' | 'dotted'.
// Defaults store null for 'solid' (matches what primary.js feeds into new
// shapes); DB rows store the literal 'solid'/'dashed'/'dotted' string.
export function createApplyProperty(deps: ApplyPropertyDeps) {
    return function applyProperty(
        propertyKey: PropertyKey | string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        // `preview` applies the change to the live Two.js scene only, skipping
        // the store/history/default writes — used for continuous slider drags so
        // the element updates in real time without spamming the undo stack. The
        // final value is committed normally (no preview) on release.
        opts?: { preview?: boolean }
    ): void {
        const {
            selectedComponent,
            twoJSInstance,
            updateComponentBulkPropertiesInLocalStore: bulkWriteRaw,
            updateBulkPropsForRectangleWithText,
            handleTextSizeChange,
            handleRectangleTextSizeChange,
            handleTextFontFamilyChange,
            handleRectangleTextFontFamilyChange,
            setDefaultFill,
            setDefaultStrokeColor,
            setDefaultLinewidth,
            setDefaultStrokeType,
            setDefaultTextColor,
            setDefaultTextSize,
            setDefaultTextFontFamily,
        } = deps

        // Needed before the default sync below, which is why it is read here
        // rather than alongside the other selection lookups further down.
        const selectedElementData = selectedComponent?.group?.data?.elementData
        const isCircle = selectedElementData?.componentType === 'circle'

        // Hand-editing a style a legend preset owns UNBINDS the element.
        //
        // A legend is only worth anything if its swatch is guaranteed to match
        // the marks it counts. The moment someone recolours one bound area by
        // hand, that guarantee is gone — so the element drops to "None" and
        // keeps the new colour, rather than staying in a count it no longer
        // looks like.
        //
        // Only the keys a preset actually carries count: changing a circle's
        // label font or an element's opacity leaves the binding alone, because
        // a preset has no opinion about those.
        //
        // The unbind rides the SAME bulk write as the style change, so it lands
        // in one UPDATE_BULK entry and a single undo restores both the colour
        // and the binding. Wrapping the dep is what keeps that true at all
        // twelve call sites below without touching any of them.
        const unbinds =
            !opts?.preview &&
            !!selectedElementData?.legendPresetId &&
            LEGEND_STYLE_KEYS.has(propertyKey)
        const updateComponentBulkPropertiesInLocalStore = (
            id: string,
            bulkObj: Partial<ComponentRow>
        ): void => {
            if (unbinds && selectedElementData) {
                selectedElementData.legendPresetId = null
            }
            bulkWriteRaw(
                id,
                unbinds ? { ...bulkObj, legendPresetId: null } : bulkObj
            )
        }

        // 1. Update the matching default. Opacity is deliberately excluded — it
        // is a per-element property only and must never persist as a default,
        // otherwise drawing a new shape after dimming one (e.g. to 0%) would
        // produce an invisible shape. `zoomResistant` is excluded for the same
        // reason, and it is load-bearing: turning the switch off on one label
        // must not follow the selection onto the next label or onto the next
        // text created. A point's label participates like any other text: its
        // size default travels as a ladder LABEL ('S'…'XL'), not a pixel count,
        // so the same default reads correctly against the point's own ladder
        // and the whiteboard's. Skipped entirely in preview mode.
        //
        // A circle's fill opts out too, for the same per-element reason: it is
        // that circle's identity on the basemap, not a shape preference. Only
        // fill, not stroke/width/type: those keep syncing, like area and route.
        if (!opts?.preview) {
            if (propertyKey === 'fill') {
                if (!isCircle) setDefaultFill(value)
            } else if (propertyKey === 'stroke') setDefaultStrokeColor(value)
            else if (propertyKey === 'linewidth') setDefaultLinewidth(value)
            else if (propertyKey === 'strokeType')
                setDefaultStrokeType(value === 'solid' ? null : value)
            else if (propertyKey === 'textColor') setDefaultTextColor(value)
            else if (propertyKey === 'textSize') setDefaultTextSize(value)
            else if (propertyKey === 'textFontFamily')
                setDefaultTextFontFamily(value)
        }

        // 2. If nothing is selected, we're done.
        if (!selectedComponent) return

        const id = selectedComponent?.group?.data?.elementData?.id
        if (!id) return

        // Zoom-resistance is a real column, so this is a plain scalar write —
        // no metadata merge. The type gate matters: only the two types with a
        // LABEL read the column (a text's whole group, a circle's label
        // sub-group), and letting it onto another componentType would put a
        // value on a row that ignores it and then ship that value into every
        // export and every share insert.
        if (propertyKey === 'zoomResistant') {
            const textGroup = selectedComponent?.group?.data
            const resistType = textGroup?.elementData?.componentType
            if (resistType !== 'text' && resistType !== 'circle') return
            if (textGroup.elementData) {
                textGroup.elementData.zoomResistant = value
            }
            updateComponentBulkPropertiesInLocalStore(id, {
                zoomResistant: value,
            })
            // The element component owns the scaled node (a text's group, a
            // circle's label sub-group) and the selection outline — it is the
            // only place that knows the live camera and holds the selector
            // instance. Filtered by id on the far side, so the other labels on
            // this base are untouched.
            window.dispatchEvent(
                new CustomEvent(TEXT_RESIST_CHANGED_EVENT, {
                    detail: { id, resist: value ? TEXT_RESIST : 0 },
                })
            )
            return
        }

        // A point's colour is its circle's fill. Two things make it more than
        // the generic fill path below: `stroke` is mirrored so anything reading
        // either field sees one colour, and the legacy category marker is
        // cleared — while `metadata.category` is set the point deliberately
        // renders in the standard colour (see pointColorOf), so a user's pick
        // would be thrown away on the next reload.
        const pointGroup = selectedComponent?.group?.data
        if (
            pointGroup?.elementData?.componentType === 'point' &&
            (propertyKey === 'fill' || propertyKey === 'stroke')
        ) {
            const elementData = pointGroup.elementData
            const circle = getPointCircle(pointGroup)
            if (circle) circle.fill = value
            if (!opts?.preview) {
                // `category: undefined` drops the legacy marker: the properties
                // bag is JSON, so an undefined value does not survive the trip
                // to jsonb.
                const patch = setProperties(elementData, {
                    category: undefined,
                })
                if (patch.metadata) elementData.metadata = patch.metadata
                elementData.fill = value
                elementData.stroke = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    fill: value,
                    stroke: value,
                    ...patch,
                })
            }
            twoJSInstance?.update()
            return
        }

        // A point's label font and size. Both are handled here rather than by
        // the generic text paths below: the label is a bare Two.Text parked in
        // the point's group, not a text layer, and `selectedComponent.shape
        // .data` for a point is the circle — so the text handlers would restyle
        // nothing and write into a text record's metadata shape (`content` and
        // friends) that a point does not have.
        if (
            pointGroup?.elementData?.componentType === 'point' &&
            (propertyKey === 'textFontFamily' || propertyKey === 'textSize')
        ) {
            const elementData = pointGroup.elementData
            const labelNode = getPointLabelNode(pointGroup)
            // textSize arrives as a ladder label ('S'…'XL') and resolves
            // against the point's OWN ladder — the whiteboard's starts above
            // the point default and has a mobile variant a counter-scaled pin
            // does not want. An unknown label is dropped rather than written.
            const size =
                propertyKey === 'textSize'
                    ? POINT_LABEL_SIZES.find((s) => s.label === value)?.value
                    : undefined
            if (propertyKey === 'textSize' && !size) return
            if (labelNode) {
                if (propertyKey === 'textSize') labelNode.size = size
                else labelNode.family = value
                // The label is centred by hand on its cap band, and the cap
                // band moves with BOTH the size and the family — so re-place it
                // on either change or the pin drifts off its label until the
                // next rebuild (see buildPointVisual / utils/fontMetrics.ts).
                labelNode.translation.y = capCenterOffset(
                    labelNode.family,
                    labelNode.size
                )
            }
            if (!opts?.preview) {
                const patch = setProperties(
                    elementData,
                    propertyKey === 'textSize'
                        ? { textFontSize: size }
                        : { textFontFamily: value }
                )
                if (patch.metadata) elementData.metadata = patch.metadata
                updateComponentBulkPropertiesInLocalStore(id, patch)
            }
            twoJSInstance?.update()
            return
        }

        // A circle's label font and size. Handled here rather than by the
        // generic text paths below for the same reasons the point is: the
        // label is a sub-group of Two.Text nodes parked in the circle's group,
        // not a text layer, and `selectedComponent.shape.data` for a circle is
        // the ELLIPSE — so the shared handlers would restyle nothing and write
        // into a text record's metadata shape that a circle does not have.
        //
        // It rebuilds rather than poking each node because a size or family
        // change re-wraps the text AND moves the cap band the block is centred
        // on; only buildCircleLabel knows both.
        const circleGroup = selectedComponent?.group?.data

        // A circle's label ink. A COLUMN, not metadata — see circleLabelColorOf
        // for why — so this is a plain scalar write, and the nodes are painted
        // directly rather than through the shared text handler below, which
        // reaches for getShapeTextNodes and would find nothing.
        if (
            circleGroup?.elementData?.componentType === 'circle' &&
            propertyKey === 'textColor'
        ) {
            const elementData = circleGroup.elementData
            getCircleLabelNodes(circleGroup).forEach((n) => (n.fill = value))
            elementData.textColor = value
            if (!opts?.preview) {
                updateComponentBulkPropertiesInLocalStore(id, {
                    textColor: value,
                })
            }
            twoJSInstance?.update()
            return
        }

        if (
            circleGroup?.elementData?.componentType === 'circle' &&
            (propertyKey === 'textFontFamily' || propertyKey === 'textSize')
        ) {
            const elementData = circleGroup.elementData
            // textSize arrives as a ladder label ('S'…'XL') and resolves
            // against the POINT ladder, which a circle's label shares. An
            // unknown label is dropped rather than written.
            const size =
                propertyKey === 'textSize'
                    ? POINT_LABEL_SIZES.find((s) => s.label === value)?.value
                    : undefined
            if (propertyKey === 'textSize' && !size) return

            const patch = setProperties(
                elementData,
                propertyKey === 'textSize'
                    ? { textFontSize: size }
                    : { textFontFamily: value }
            )
            const metadata = patch.metadata
            if (!opts?.preview) {
                if (metadata) elementData.metadata = metadata
                updateComponentBulkPropertiesInLocalStore(id, patch)
            }
            // Preview still repaints — it just doesn't persist — so the rebuild
            // reads the merged metadata either way.
            const rebuilt = buildCircleLabel(twoJSInstance, circleGroup, {
                text: circleLabelOf({ metadata }),
                fontFamily: circleLabelFontFamilyOf({ metadata }),
                fontSize: circleLabelFontSizeOf({ metadata }),
                color: circleLabelColorOf(elementData),
                width: elementData.width ?? 100,
            })
            // buildCircleLabel reuses the sub-group and leaves its transform
            // alone, so re-seed the counter-scale from the live camera. This is
            // the same value the zoomChanged listener would compute, so it is
            // idempotent for an existing label — and it is the only thing that
            // scales a sub-group created after mount.
            if (rebuilt) {
                rebuilt.scale = computeCounterScale(
                    twoJSInstance?.scene?.scale ?? 1,
                    resolveLabelResist(elementData)
                )
            }
            twoJSInstance?.update()
            return
        }

        const shapeType = selectedComponent?.shape?.type
        const elementType =
            selectedComponent?.group?.data?.elementData?.componentType
        // rectangle/diamond embed text the same way; route both through the
        // shape-with-text handlers. `circle` was in this list as craftbase
        // residue — a map circle's label is handled above and is invisible to
        // getShapeTextNodes by design, so the branch was unreachable and only
        // a trap for the next reader.
        const isShapeWithText =
            typeof selectedComponent?.text?.data?.value === 'string' &&
            (shapeType === 'rectangle' ||
                elementType === 'rectangle' ||
                elementType === 'diamond')

        // 3. Route text properties — these have their own bulky resize logic.
        if (propertyKey === 'textSize') {
            if (isShapeWithText) handleRectangleTextSizeChange?.(value)
            else handleTextSizeChange?.(value)
            return
        }
        if (propertyKey === 'textFontFamily') {
            if (isShapeWithText) handleRectangleTextFontFamilyChange?.(value)
            else handleTextFontFamilyChange?.(value)
            return
        }
        if (propertyKey === 'textColor') {
            if (isShapeWithText) {
                // Apply to EVERY line node in the text layer, not just the
                // first — otherwise multiline only updates on reload.
                getShapeTextNodes(selectedComponent?.group?.data).forEach(
                    (n) => (n.fill = value)
                )
                updateBulkPropsForRectangleWithText?.(id, { textColor: value })
            } else {
                // Standalone text is a stack of Two.Text line nodes (line 1
                // + satellites). Color EVERY node, not just line 1 — sel.shape
                // .data is only the first node.
                const textNodes = getShapeTextNodes(
                    selectedComponent?.group?.data
                )
                if (textNodes.length > 0) {
                    textNodes.forEach((n) => (n.fill = value))
                } else if (selectedComponent?.shape?.data) {
                    selectedComponent.shape.data.fill = value
                }
                if (selectedComponent?.group?.data?.elementData) {
                    selectedComponent.group.data.elementData.textColor = value
                }
                updateComponentBulkPropertiesInLocalStore(id, {
                    textColor: value,
                })
            }
            twoJSInstance?.update()
            return
        }

        // 4. Non-text properties: apply via shape.data + sync elementData.
        const shapeData = selectedComponent?.shape?.data
        const elementData = selectedComponent?.group?.data?.elementData

        if (propertyKey === 'fill') {
            if (shapeData) shapeData.fill = value
            if (elementData) elementData.fill = value
            // A radius map reads as ONE mark: its ring is its fill. A new
            // circle is created that way (see the circle branch in
            // primary.tsx), and recolouring it has to keep that promise —
            // otherwise the first fill edit silently strands the ring on the
            // old colour. The mirror is deliberately one-way: `stroke` below
            // does not touch `fill`, so a user who wants the two apart can
            // still separate them, and picking a fill afterwards re-joins them.
            //
            // Neither colour syncs to the defaults (see the guard in step 1) —
            // this is that circle's identity on the basemap, not a preference.
            if (isCircle) {
                if (shapeData) shapeData.stroke = value
                if (elementData) elementData.stroke = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    fill: value,
                    stroke: value,
                })
            } else {
                updateComponentBulkPropertiesInLocalStore(id, { fill: value })
            }
        } else if (propertyKey === 'stroke') {
            if (shapeData) shapeData.stroke = value
            if (elementData) elementData.stroke = value
            // Area fill is a light shade of its stroke — re-derive on the
            // Two.js path only; fill is never persisted for geo objects.
            if (elementType === 'area' && shapeData) {
                shapeData.fill = strokeToAreaFill(value)
            }
            updateComponentBulkPropertiesInLocalStore(id, { stroke: value })
        } else if (propertyKey === 'linewidth') {
            // Geo strokes are counter-scaled: what the route/area component
            // paints is `linewidth * computeCounterScale(cameraScale, resist)`,
            // re-applied on every `zoomChanged` (see route.tsx / area.tsx).
            // Writing the raw value straight onto the path skipped that factor,
            // so at map zooms below the anchor the widest step still painted
            // hairline-thin — and only "fixed itself" on the next zoom or a
            // reload, when the component re-applied the factor. The RECORD keeps
            // the logical width; only what is painted is scaled.
            if (shapeData) {
                shapeData.linewidth = isStrokeScaled(elementData)
                    ? value *
                      computeCounterScale(
                          twoJSInstance?.scene?.scale ?? 1,
                          resolveResist(elementData)
                      )
                    : value
            }
            if (elementData) elementData.linewidth = value
            updateComponentBulkPropertiesInLocalStore(id, { linewidth: value })
        } else if (propertyKey === 'strokeType') {
            const dbValue = value === 'solid' ? 'solid' : value
            if (shapeData) {
                shapeData.dashes = strokeTypeToDashes(value)
                if (value === 'solid') clearDashesOnTwoJSShape(shapeData)
            }
            if (elementData) elementData.strokeType = dbValue
            updateComponentBulkPropertiesInLocalStore(id, {
                strokeType: dbValue,
            })
        } else if (propertyKey === 'opacity') {
            // Apply opacity at the GROUP level, not the shape leaf. The leaf
            // path is double-referenced in group.children (the *-with-text
            // components unshift the factory's already-added shape), which
            // leaves leaf-level opacity flags unprocessed on render — so a leaf
            // write only appears after the next full repaint (e.g. on deselect).
            // The group's own opacity always repaints, and it uniformly dims the
            // shape plus any embedded text-layer nodes in one shot.
            const groupObj = selectedComponent?.group?.data
            if (groupObj) groupObj.opacity = value
            // Neutralize any leaf/text opacity so it doesn't compound with the
            // group's (e.g. shapes mounted before this change carried leaf-level
            // opacity).
            if (shapeData) shapeData.opacity = 1
            getShapeTextNodes(selectedComponent?.group?.data).forEach(
                (n) => (n.opacity = 1)
            )
            // Preview = live drag: mutate the scene only, defer the
            // store/history write to the commit on release.
            if (!opts?.preview) {
                // Opacity persists in the top-level `opacity` column for every
                // element type (pencil's `metadata` is its vertex array and
                // never used metadata.opacity; the rest were migrated off it).
                if (elementData) elementData.opacity = value
                updateComponentBulkPropertiesInLocalStore(id, {
                    opacity: value,
                })
            }
        }

        twoJSInstance?.update()
    }
}
