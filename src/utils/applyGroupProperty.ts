import type { MutableRefObject } from 'react'
import { strokeTypeToDashes, clearDashesOnTwoJSShape } from './misc'
import { isStrokeScaled } from './counterScale'
import { applyStrokeDashes } from './strokeDashes'
import {
    applyShapeText,
    layoutStandaloneText,
    shapeTextStyleFromMeta,
    readOpacity,
} from './canvasUtils'
import { resolveHeightForTextStyleChange } from './shapeTextFit'
import { TEXT_SIZES_ARRAY } from './constants'
import { pointLabelSizeFor } from '../constants/misc'
import {
    pointGeometry,
    readGeometry,
    readProperties,
    setGeometry,
    setProperties,
} from './geometry'
import {
    buildCircleLabel,
    circleLabelFontFamilyOf,
    circleLabelFontSizeOf,
    circleLabelOf,
} from '../factory/circleLabel'

// Bulk-apply a property to every child of the currently-focused group whose
// element type accepts that property. Element types that don't accept the
// property silently discard the change (Phase 1: no UI filtering — toolbar
// shows the union of all properties; this layer enforces what each child can
// actually receive).
//
// Per Phase 1 decisions:
//   - Defaults are NOT touched on group edits (caller doesn't bump them).
//   - No "mixed value" inspection — toolbar reads from defaults.
//   - textSize/textFontFamily on rectangles-with-text use a simple direct
//     write — no resize-on-grow logic from the single-element path.
//
// Mutates three places per child:
//   1. The hidden Two.js shape in two.scene.children (opacity=0 while group
//      is selected; becomes visible again on blur with the new properties).
//   2. The visible nested coreObject inside the group's Two.js Group (so the
//      user sees the change in real time while the group is still focused).
//      Requires groupobject.js to stamp `coreObject.elementData = item`.
//   3. The componentStore row via updateComponentBulkPropertiesInLocalStore.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SelectedGroupLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChildEntry = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentRow = Record<string, any>

type GroupPropertyKey =
    | 'fill'
    | 'stroke'
    | 'linewidth'
    | 'strokeType'
    | 'opacity'
    | 'textColor'
    | 'textSize'
    | 'textFontFamily'

interface HistoryBatchEntry {
    action: 'UPDATE_BULK'
    id: string
    prevProps: Partial<ComponentRow>
    bulkObj: Partial<ComponentRow>
}

export interface ApplyGroupPropertyDeps {
    selectedGroup: SelectedGroupLike | null
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRow>,
        skipDbWrite?: boolean
    ) => void
    stateRefForComponentStore?: MutableRefObject<Record<string, ComponentRow>>
    recordBatchToHistoryLog?: (entries: HistoryBatchEntry[]) => void
}

const ACCEPTS: Record<GroupPropertyKey, Set<string>> = {
    // Standalone text (newText/text) has no background-fill concept — its
    // color is `textColor`. Excluded so a group fill leaves text untouched and
    // never stamps a spurious `fill` onto a text row.
    fill: new Set(['rectangle', 'circle', 'diamond', 'frame']),
    // A radius map is borderless (see CIRCLE_DEFAULTS), so `circle` is absent
    // from all three stroke keys: a group edit must not hand it the ring its
    // own toolbar refuses to offer. Its fill still reaches it, and the fill
    // branch below keeps the stroke COLUMN in step — that mirror is not gated
    // on this set.
    stroke: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'pencil',
    ]),
    linewidth: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'pencil',
    ]),
    strokeType: new Set([
        'rectangle',
        'diamond',
        'frame',
        'arrowLine',
        'divider',
        'pencil',
    ]),
    // Pencil's metadata IS its vertex array, so opacity can't live in
    // `metadata.opacity` like every other type (it would clobber the points).
    // Pencil therefore persists opacity in a top-level `opacity` field instead
    // — see the pencil branch in the opacity handler below.
    opacity: new Set([
        'rectangle',
        'circle',
        'diamond',
        'frame',
        'arrowLine',
        'text',
        'text',
        'pencil',
        'image',
    ]),
    // rectangle, diamond AND circle all carry text the same way (see
    // applyShapeText / the *-with-text components), so a group text edit
    // must reach every one of them.
    textColor: new Set([
        'text',
        'text',
        'rectangle',
        'diamond',
        'circle',
    ]),
    textSize: new Set(['text', 'rectangle', 'diamond', 'circle']),
    textFontFamily: new Set([
        'text',
        'text',
        'rectangle',
        'diamond',
        'circle',
    ]),
}

/**
 * Which record to read a group member's properties off.
 *
 * The live scene element is the truth when it has one; the group overlay's
 * detached child copy is the fallback. Preferring the live record matters
 * because a toolbar edit lands there first, and the overlay copy is only
 * refreshed when the group is rebuilt.
 */
function metaSourceOf(sceneEl: ShapeLike, child: ShapeLike): ShapeLike {
    return readGeometry(sceneEl?.elementData) ? sceneEl.elementData : child
}

function findSceneElement(two: TwoLike, id: string): ShapeLike | undefined {
    return two?.scene?.children?.find(
        (c: ShapeLike) => c?.elementData?.id === id
    )
}

function findVisibleCoreObject(
    group: SelectedGroupLike,
    id: string
): ShapeLike | null {
    if (!group?.children) return null
    for (let i = 0; i < group.children.length; i++) {
        const c = group.children[i]
        if (c?.elementData?.id === id) return c
    }
    return null
}

// Collect every Two.Text line node inside `obj`, recursing through the
// text-layer sub-group (multiline text is a stack of nodes). Replaces the
// old single-node finder so group text edits reach every visible line.
function findTextNodesInside(obj: ShapeLike): ShapeLike[] {
    if (!obj?.children) return []
    const out: ShapeLike[] = []
    for (let i = 0; i < obj.children.length; i++) {
        const c = obj.children[i]
        if (typeof c?.value === 'string') out.push(c)
        else if (Array.isArray(c?.children)) out.push(...findTextNodesInside(c))
    }
    return out
}

// Recursively apply a dash pattern to every Path leaf inside `node`, skipping
// Two.js Group containers (descended into) and Text nodes (a dash pattern on
// glyph outlines is wrong, and consistent with the fill/stroke/linewidth
// handling that leaves the text node untouched). Used by the strokeType branch
// instead of `applyToTwoShape`: Two.js Group has no `dashes` setter (unlike
// fill/stroke/linewidth — group.js:1168-1216), so writing `group.dashes` is a
// dead own-property assignment that never reaches the child Paths.
function applyDashesToLeaves(
    node: ShapeLike,
    dashes: number[],
    clearSolid: boolean
): void {
    if (!node) return
    if (Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
            applyDashesToLeaves(node.children[i], dashes, clearSolid)
        }
        return
    }
    if (typeof node.value === 'string') return
    node.dashes = dashes
    if (clearSolid) clearDashesOnTwoJSShape(node)
}

function applyToTwoShape(
    shape: ShapeLike,
    propertyKey: GroupPropertyKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
): void {
    if (!shape) return
    if (propertyKey === 'fill') shape.fill = value
    else if (propertyKey === 'stroke') shape.stroke = value
    else if (propertyKey === 'linewidth') shape.linewidth = value
    else if (propertyKey === 'opacity') shape.opacity = value
}

export function createApplyGroupProperty(deps: ApplyGroupPropertyDeps) {
    return function applyGroupProperty(
        propertyKey: GroupPropertyKey | string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any,
        // `preview` applies the change to the live Two.js scene only, skipping
        // the store/history writes — used for continuous slider drags. The final
        // value commits normally (no preview) on release.
        opts?: { preview?: boolean }
    ): void {
        const {
            selectedGroup,
            twoJSInstance,
            updateComponentBulkPropertiesInLocalStore,
            stateRefForComponentStore,
            recordBatchToHistoryLog,
        } = deps

        const children: ChildEntry[] | undefined =
            selectedGroup?.elementData?.children
        if (!Array.isArray(children) || children.length === 0) return

        const acceptSet = ACCEPTS[propertyKey as GroupPropertyKey]
        if (!acceptSet) return

        const batchEntries: HistoryBatchEntry[] = []

        const snapshotPrev = (
            id: string,
            keys: string[]
        ): Partial<ComponentRow> => {
            const current = stateRefForComponentStore?.current?.[id] ?? {}
            const prev: Partial<ComponentRow> = {}
            keys.forEach((k) => {
                let v = current[k]
                // Opacity is unset until first edited; its effective prior value
                // is fully opaque (or a legacy metadata.opacity). Capture that so
                // undo of the first opacity change restores it.
                if (v === undefined && k === 'opacity') v = readOpacity(current)
                if (v !== undefined) prev[k] = v
            })
            return prev
        }
        const recordChild = (
            id: string,
            bulkObj: Partial<ComponentRow>
        ): void => {
            const prevProps = snapshotPrev(id, Object.keys(bulkObj))
            batchEntries.push({
                action: 'UPDATE_BULK',
                id,
                prevProps,
                bulkObj,
            })
            updateComponentBulkPropertiesInLocalStore(id, bulkObj, true)
        }

        // A map stroke's dash pattern is sized on screen from its width
        // (utils/strokeDashes), so it is re-derived on its STROKE path only —
        // the first child, as the route/area factories and pencil.tsx place it.
        // Not every leaf: the rest are vertex handles and selection chrome.
        const cameraScale = twoJSInstance?.scene?.scale ?? 1
        const redashStroke = (
            node: ShapeLike,
            strokeType: string | null | undefined
        ): void => {
            const leaf = node?.children?.[0]
            if (leaf && typeof leaf.value !== 'string') {
                applyStrokeDashes(leaf, strokeType, cameraScale)
            }
        }

        children.forEach((child) => {
            const type = child?.componentType
            if (!type || !acceptSet.has(type)) return
            const id = child?.id
            if (!id) return

            const sceneEl = findSceneElement(twoJSInstance, id)
            const coreObj = findVisibleCoreObject(selectedGroup, id)
            const strokeScaled = isStrokeScaled(child)

            if (
                propertyKey === 'fill' ||
                propertyKey === 'stroke' ||
                propertyKey === 'linewidth'
            ) {
                // Two.js Group.fill/stroke/linewidth setters propagate the
                // value to *every* child (see node_modules/two.js/src/
                // group.js — each setter loops `child[prop] = v`). For a
                // rectangle-with-text the text node is a child of the same
                // group, so a group-level write hits the text alongside the
                // rectangle: `fill` repaints the text and it vanishes,
                // `stroke` gives it an outline, `linewidth` thickens that
                // outline. Capture the text node's own value before the group
                // write and restore it after, so the shape changes but the
                // text is left untouched. (The single-element path in
                // rectangle.tsx and the `opacity` branch below already avoid
                // this by targeting the shape leaf, not the group.)
                const sceneTexts = findTextNodesInside(sceneEl)
                const coreTexts = findTextNodesInside(coreObj)
                const sceneTextValues = sceneTexts.map((t) => t?.[propertyKey])
                const coreTextValues = coreTexts.map((t) => t?.[propertyKey])

                applyToTwoShape(sceneEl, propertyKey, value)
                applyToTwoShape(coreObj, propertyKey, value)

                // Restore every line node's own value the group write clobbered.
                sceneTexts.forEach((t, i) => {
                    if (sceneTextValues[i] !== undefined)
                        t[propertyKey] = sceneTextValues[i]
                })
                coreTexts.forEach((t, i) => {
                    if (coreTextValues[i] !== undefined)
                        t[propertyKey] = coreTextValues[i]
                })

                if (sceneEl?.elementData)
                    sceneEl.elementData[propertyKey] = value
                child[propertyKey] = value

                if (propertyKey === 'linewidth' && strokeScaled) {
                    redashStroke(sceneEl, child.strokeType)
                    redashStroke(coreObj, child.strokeType)
                }

                // A radius map reads as ONE mark: its stroke column follows
                // its fill, from creation onward. Mirror it here too, or the
                // same edit means two different things depending on whether
                // the circle happens to be in a group. Nothing is painted at
                // zero width — this keeps the record one colour.
                // `applyToTwoShape` already painted the leaf's `fill`; this
                // adds the `stroke` alongside it.
                if (propertyKey === 'fill' && type === 'circle') {
                    // Written to the LEAF, not the group. A Two.js Group's
                    // stroke setter loops every child, and the label's line
                    // nodes are children too — a group write would outline the
                    // name in the ring's colour. (The `fill` write above gets
                    // away with the group because it captures and restores the
                    // text nodes' own value; there is nothing to restore here,
                    // since a label carries no stroke of its own.)
                    const sceneLeaf = sceneEl?.children?.[0]
                    const coreLeaf = coreObj?.children?.[0]
                    if (sceneLeaf) sceneLeaf.stroke = value
                    if (coreLeaf) coreLeaf.stroke = value
                    if (sceneEl?.elementData)
                        sceneEl.elementData.stroke = value
                    child.stroke = value
                    recordChild(id, { fill: value, stroke: value })
                    return
                }

                recordChild(id, { [propertyKey]: value })
                return
            }

            if (propertyKey === 'strokeType') {
                const dbValue = value === 'solid' ? 'solid' : value
                if (strokeScaled) {
                    redashStroke(sceneEl, value)
                    redashStroke(coreObj, value)
                } else {
                    const dashes = strokeTypeToDashes(value)
                    const clearSolid = value === 'solid'
                    applyDashesToLeaves(sceneEl, dashes, clearSolid)
                    applyDashesToLeaves(coreObj, dashes, clearSolid)
                }
                if (sceneEl?.elementData)
                    sceneEl.elementData.strokeType = dbValue
                child.strokeType = dbValue
                recordChild(id, { strokeType: dbValue })
                return
            }

            if (propertyKey === 'opacity') {
                // Apply at GROUP level (mirrors the single-element path) so the
                // value can't compound with the group-level opacity that
                // revealMembers restores when the group is dismissed. The old
                // code pre-staged the value on the hidden original's LEAF, then
                // reveal set the GROUP opacity to the same value — leaf × group
                // = value² (a 50% edit rendered as 25% after ungrouping). The
                // hidden original stays hidden (its group opacity is 0 under the
                // overlay); we only normalise its leaf/text to 1 so the value
                // reveal sets later is exact. The visible overlay copy is dimmed
                // at its own group level so the user sees the change live.
                const sceneLeaf = sceneEl?.children?.[0]
                if (sceneLeaf) sceneLeaf.opacity = 1
                findTextNodesInside(sceneEl).forEach((t) => (t.opacity = 1))
                if (coreObj) {
                    coreObj.opacity = value
                    const coreLeaf = coreObj?.children?.[0]
                    if (coreLeaf) coreLeaf.opacity = 1
                    findTextNodesInside(coreObj).forEach((t) => (t.opacity = 1))
                }
                // Live drag preview: scene only, defer the store/history write
                // to the commit on release.
                if (opts?.preview) return
                // Opacity persists in the top-level `opacity` column for every
                // element type (unified — pencil's metadata is its vertex array
                // and the rest were migrated off metadata.opacity).
                if (sceneEl?.elementData) sceneEl.elementData.opacity = value
                child.opacity = value
                recordChild(id, { opacity: value })
                return
            }

            if (propertyKey === 'textColor') {
                if (type === 'text') {
                    const sceneTexts = sceneEl
                        ? findTextNodesInside(sceneEl)
                        : []
                    const coreTexts = coreObj
                        ? findTextNodesInside(coreObj)
                        : []
                    sceneTexts.forEach((t) => (t.fill = value))
                    coreTexts.forEach((t) => (t.fill = value))
                    if (sceneEl?.elementData)
                        sceneEl.elementData.textColor = value
                    child.textColor = value
                    recordChild(id, { textColor: value })
                } else if (type === 'circle') {
                    // A map circle's label ink is a COLUMN, not
                    // `metadata.textFill` (see circleLabelColorOf), and its
                    // line nodes live in a sub-group findTextNodesInside would
                    // reach but the metadata write below would not describe.
                    const width = sceneEl?.elementData?.width ?? child?.width
                    const meta = readProperties(metaSourceOf(sceneEl, child))
                    if (sceneEl?.elementData)
                        sceneEl.elementData.textColor = value
                    child.textColor = value
                    const opts = {
                        text: circleLabelOf({ metadata: meta }),
                        fontFamily: circleLabelFontFamilyOf({ metadata: meta }),
                        fontSize: circleLabelFontSizeOf({ metadata: meta }),
                        color: value,
                        width: width ?? 100,
                    }
                    // Live element and overlay copy both carry a label.
                    if (sceneEl) buildCircleLabel(twoJSInstance, sceneEl, opts)
                    if (coreObj) buildCircleLabel(twoJSInstance, coreObj, opts)
                    recordChild(id, { textColor: value })
                } else if (type === 'rectangle' || type === 'diamond') {
                    const sceneTexts = sceneEl
                        ? findTextNodesInside(sceneEl)
                        : []
                    const coreTexts = coreObj
                        ? findTextNodesInside(coreObj)
                        : []
                    if (
                        sceneTexts.length === 0 &&
                        coreTexts.length === 0 &&
                        !child?.metadata?.hasText
                    ) {
                        return
                    }
                    sceneTexts.forEach((t) => (t.fill = value))
                    coreTexts.forEach((t) => (t.fill = value))
                    const patch = setProperties(
                        metaSourceOf(sceneEl, child),
                        { textFill: value }
                    )
                    if (patch.metadata) {
                        if (sceneEl?.elementData)
                            sceneEl.elementData.metadata = patch.metadata
                        child.metadata = patch.metadata
                    }
                    recordChild(id, { ...patch, textColor: value })
                }
                return
            }

            if (
                propertyKey === 'textSize' ||
                propertyKey === 'textFontFamily'
            ) {
                // A map circle's label is not embedded shape text — it is a
                // sub-group the circleLabel factory owns, and a size change
                // re-wraps it AND moves the cap band it is centred on, so it
                // is rebuilt rather than poked.
                //
                // The size also has to cross ladders. The group toolbar has
                // already resolved the toolbar label against TEXT_SIZES_ARRAY
                // (24–72) by the time it reaches us, so we map that pixel value
                // back to its label and re-resolve it on the POINT ladder — the
                // same "styles travel as labels, never as pixels" rule the
                // creation paths follow. An unmatched pixel value is dropped
                // rather than written.
                if (type === 'circle') {
                    let metaPatch: Record<string, unknown> | null = null
                    if (propertyKey === 'textFontFamily') {
                        metaPatch = { textFontFamily: value }
                    } else {
                        const ladderLabel = TEXT_SIZES_ARRAY.find(
                            (s) =>
                                s.value === value ||
                                (s as { mobileValue?: number }).mobileValue ===
                                    value
                        )?.label
                        if (!ladderLabel) return
                        metaPatch = {
                            textFontSize: pointLabelSizeFor(ladderLabel),
                        }
                    }
                    const patch = setProperties(
                        metaSourceOf(sceneEl, child),
                        metaPatch
                    )
                    const updatedMeta = patch.metadata
                    if (updatedMeta) {
                        if (sceneEl?.elementData)
                            sceneEl.elementData.metadata = updatedMeta
                        child.metadata = updatedMeta
                    }
                    const width = sceneEl?.elementData?.width ?? child?.width
                    const opts = {
                        text: circleLabelOf({ metadata: updatedMeta }),
                        fontFamily: circleLabelFontFamilyOf({
                            metadata: updatedMeta,
                        }),
                        fontSize: circleLabelFontSizeOf({
                            metadata: updatedMeta,
                        }),
                        width: width ?? 100,
                    }
                    // The live element and the group overlay's detached copy
                    // both carry a label; rebuild both or they disagree for as
                    // long as the selection lasts.
                    if (sceneEl) buildCircleLabel(twoJSInstance, sceneEl, opts)
                    if (coreObj) buildCircleLabel(twoJSInstance, coreObj, opts)
                    recordChild(id, patch)
                    return
                }

                const sceneTexts = sceneEl ? findTextNodesInside(sceneEl) : []
                const coreTexts = coreObj ? findTextNodesInside(coreObj) : []
                const metaKey =
                    propertyKey === 'textSize'
                        ? 'textFontSize'
                        : 'textFontFamily'
                const twoKey = propertyKey === 'textSize' ? 'size' : 'family'
                // Two views of the same edit: `updatedProps` is the property
                // bag the text renderers read, `textPatch` is the envelope the
                // store write needs.
                const metaSource = metaSourceOf(sceneEl, child)
                const existingProps = readProperties(metaSource)
                const updatedProps = { ...existingProps, [metaKey]: value }
                const textPatch = setProperties(metaSource, {
                    [metaKey]: value,
                })
                const updatedMeta = textPatch.metadata

                if (type === 'text') {
                    // Standalone text has no container box to fit — just restyle
                    // every line node. A size change also changes the per-line
                    // vertical offset, so re-lay the stack out (matching how the
                    // newText component re-spaces its lines) to keep them from
                    // overlapping. Rebuild the content string from the live line
                    // nodes rather than trusting `metadata.content` (which can be
                    // absent) so the re-layout never collapses the text.
                    sceneTexts.forEach((t) => (t[twoKey] = value))
                    coreTexts.forEach((t) => (t[twoKey] = value))
                    if (propertyKey === 'textSize') {
                        const lineSource =
                            coreTexts.length > 0 ? coreTexts : sceneTexts
                        const content =
                            lineSource.length > 0
                                ? lineSource
                                      .map((n) => n.value ?? '')
                                      .join('\n')
                                : ((updatedProps.content as string) ?? '')
                        if (sceneEl)
                            layoutStandaloneText(
                                twoJSInstance,
                                sceneEl,
                                content,
                                value
                            )
                        if (coreObj)
                            layoutStandaloneText(
                                twoJSInstance,
                                coreObj,
                                content,
                                value
                            )
                    }
                    if (updatedMeta) {
                        if (sceneEl?.elementData)
                            sceneEl.elementData.metadata = updatedMeta
                        child.metadata = updatedMeta
                    }
                    recordChild(id, textPatch)
                    return
                }

                // rectangle / diamond with embedded text (circle returned above).
                if (
                    sceneTexts.length === 0 &&
                    coreTexts.length === 0 &&
                    !child?.metadata?.hasText
                ) {
                    return
                }

                // Reflow the embedded text to the shape's CURRENT (fixed) width
                // with the new size/family so it wraps inside the box instead of
                // spilling out — never widen the box. Widening would break the
                // group's relative horizontal spacing (shapes laid out side by
                // side would overlap). Then re-fit ONLY the height to the
                // reflowed block (`resolveHeightForTextStyleChange`), which
                // keeps every x-position untouched. This mirrors the single
                // element resize/reflow path (canvasUtils.applyShapeText +
                // shapeTextFit) instead of the old getBBox width-grow.
                const storeRow = stateRefForComponentStore?.current?.[id]
                const width =
                    storeRow?.width ??
                    child?.width ??
                    sceneEl?.children?.[0]?.width ??
                    coreObj?.children?.[0]?.width ??
                    120
                const currentH =
                    storeRow?.height ??
                    child?.height ??
                    sceneEl?.children?.[0]?.height ??
                    coreObj?.children?.[0]?.height ??
                    0

                if (sceneEl)
                    applyShapeText(
                        twoJSInstance,
                        sceneEl,
                        type,
                        width,
                        updatedMeta
                    )
                if (coreObj)
                    applyShapeText(
                        twoJSInstance,
                        coreObj,
                        type,
                        width,
                        updatedProps
                    )

                const { font: nextFont } = shapeTextStyleFromMeta(updatedProps)
                const { font: prevFont } = shapeTextStyleFromMeta(existingProps)
                const newH = resolveHeightForTextStyleChange({
                    kind: type,
                    width,
                    rawText: (updatedProps.textContent as string) ?? '',
                    prevFont,
                    nextFont,
                    currentHeight: currentH,
                })

                const bulkObj: Partial<ComponentRow> = { ...textPatch }
                if (newH !== currentH) {
                    const sceneRect = sceneEl?.children?.[0]
                    const coreRect = coreObj?.children?.[0]
                    if (sceneRect) sceneRect.height = newH
                    if (coreRect) coreRect.height = newH

                    // Anchor the TOP edge: the shape path + text layer are
                    // centered on the group origin, so changing `height` alone
                    // resizes symmetrically and moves the top edge (and with it
                    // the shape's visual y). Shift the group by half the height
                    // delta so the box only grows/shrinks downward and the top
                    // edge — the user's "y point" — stays put. The shape center
                    // moves by the same half-delta (down when growing, up when
                    // the new style reclaims height).
                    //
                    // Two coordinate spaces are in play: the scene element's
                    // translation + the store row are ABSOLUTE world y, while the
                    // group child entry's x/y are RELATIVE to the group center
                    // (see the group assembly in newCanvas — `item.x - xMid`).
                    // Shift each in its own space so a later drag-commit
                    // (commitGroupMove: `gy + child.y`) recomputes the same
                    // absolute position.
                    const dy = (newH - currentH) / 2
                    const prevAbsY = sceneEl?.translation?.y ?? storeRow?.y ?? 0
                    const newAbsY = prevAbsY + dy
                    if (sceneEl?.translation) sceneEl.translation.y = newAbsY
                    if (coreObj?.translation) coreObj.translation.y += dy

                    if (sceneEl?.elementData) {
                        sceneEl.elementData.height = newH
                        sceneEl.elementData.y = newAbsY
                    }
                    child.height = newH
                    if (typeof child.y === 'number') child.y += dy
                    else child.y = (child.relativeY ?? 0) + dy
                    if (typeof child.relativeY === 'number')
                        child.relativeY += dy
                    bulkObj.height = Math.round(newH)
                    // The top-edge anchor moved the origin, so the move goes
                    // through the GEOMETRY — writing the `y` column alone would
                    // leave it disagreeing with the coordinates the factory
                    // rebuilds from.
                    Object.assign(
                        bulkObj,
                        setGeometry(
                            { metadata: updatedMeta },
                            pointGeometry(
                                Math.round(
                                    sceneEl?.translation?.x ?? storeRow?.x ?? 0
                                ),
                                Math.round(newAbsY)
                            )
                        )
                    )
                }
                if (bulkObj.metadata) {
                    if (sceneEl?.elementData)
                        sceneEl.elementData.metadata = bulkObj.metadata
                    child.metadata = bulkObj.metadata
                }
                recordChild(id, bulkObj)
                return
            }
        })

        if (batchEntries.length > 0) {
            recordBatchToHistoryLog?.(batchEntries)
        }

        twoJSInstance?.update()
    }
}
