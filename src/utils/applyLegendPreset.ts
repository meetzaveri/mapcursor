import { strokeTypeToDashes, clearDashesOnTwoJSShape, strokeToAreaFill } from './misc'
import { computeCounterScale, isStrokeScaled, resolveResist } from './counterScale'
import { presetStylePatch } from '../types/legend'
import type { LegendPreset } from '../types/legend'
import type { ComponentRecord } from '../types/base'
import { getPointCircle } from '../factory/point'

// Applying a legend preset: the store/DB write, and the live repaint that has
// to accompany it.
//
// Why this is not just a loop over `applyProperty`: that function is built
// around `selectedComponent` (the scene-bound selection scaffold), and a preset
// edit restyles elements that are not selected and may never have been. It
// works from the RECORD and finds the group itself.
//
// Why it is not `applyPropertyToTwoJSGroup` either: that one paints
// `shape.linewidth = value` raw and leaves an area's fill alone, neither of
// which is right for a geo mark (see the two rules below). It covers every key
// shallowly; this covers a preset's four keys properly.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

/**
 * Paint one preset-owned key onto a live element group.
 *
 * Two rules here are the whole reason this function exists, and both are
 * lifted from `applyProperty`'s generic branch rather than re-derived:
 *
 * - **An area's fill is a light shade of its stroke.** It is never persisted
 *   (the column is untouched for an area), so it has to be re-derived on the
 *   Two.js path every time the stroke moves.
 * - **A geo stroke is counter-scaled.** route / area / geo-pencil paint
 *   `linewidth * computeCounterScale(...)`, re-applied on every `zoomChanged`.
 *   Writing the logical width straight onto the path leaves the mark
 *   hairline-thin below the anchor until the next zoom nudges it back. The
 *   RECORD keeps the logical width; only what is painted is scaled.
 */
function paintPresetKey(
    group: ShapeLike,
    two: TwoLike,
    name: string,
    value: unknown
): void {
    const elementData = group?.elementData
    const componentType = elementData?.componentType
    // A point's pin is NOT children[0]. Rebuilding a point group leaves any
    // selection chrome in place and appends the new circle and label after it,
    // so once a point has been selected the chrome sits at index 0 — and a
    // recolour lands on the overlay while the pin keeps its old colour. That is
    // exactly why `getPointCircle` exists, and why a hand-edit through
    // applyProperty was fine while a preset silently was not.
    const shape =
        componentType === 'point'
            ? getPointCircle(group)
            : group?.children?.[0]
    if (!shape) return

    switch (name) {
        case 'fill':
            shape.fill = value
            if (elementData) elementData.fill = value
            break
        case 'stroke':
            shape.stroke = value
            if (elementData) elementData.stroke = value
            if (componentType === 'area') {
                shape.fill = strokeToAreaFill(value as string)
            }
            break
        case 'linewidth':
            shape.linewidth = isStrokeScaled(elementData)
                ? (value as number) *
                  computeCounterScale(
                      two?.scene?.scale ?? 1,
                      resolveResist(elementData)
                  )
                : (value as number)
            if (elementData) elementData.linewidth = value
            break
        case 'strokeType':
            shape.dashes = strokeTypeToDashes(value as string | null)
            if (!value || value === 'solid') clearDashesOnTwoJSShape(shape)
            if (elementData) elementData.strokeType = value
            break
        default:
            break
    }
}

export interface ApplyPresetDeps {
    twoJSInstance: TwoLike | null
    updateComponentBulkPropertiesInLocalStore: (
        id: string,
        bulkObj: Partial<ComponentRecord>,
        skipHistory?: boolean
    ) => void
}

/**
 * The column patch one preset application writes.
 *
 * `legendPresetId` rides the SAME patch as the styling, which is what makes an
 * apply a single history entry: undo restores the old colours and the old
 * binding together, never one without the other.
 *
 * A null preset is "None" — unbind and leave the styling exactly as it is.
 * Clearing a caption is not a request to restyle a mark.
 */
export function presetApplyPatch(
    preset: LegendPreset | null
): Partial<ComponentRecord> {
    if (!preset) return { legendPresetId: null }
    return {
        ...presetStylePatch(preset),
        legendPresetId: preset.id,
    } as Partial<ComponentRecord>
}

/**
 * Apply a preset to one element: repaint the live scene, then write the store
 * and (if persisted) the DB.
 *
 * `skipHistory` exists for the many-element case, which records one BATCH entry
 * for the whole application instead of one per element.
 */
export function applyPresetToElement(
    deps: ApplyPresetDeps,
    id: string,
    preset: LegendPreset | null,
    skipHistory = false
): Partial<ComponentRecord> {
    const { twoJSInstance, updateComponentBulkPropertiesInLocalStore } = deps
    const patch = presetApplyPatch(preset)

    const group = twoJSInstance?.scene?.children?.find(
        (c: ShapeLike) => c?.elementData?.id === id
    )
    if (group) {
        Object.entries(patch).forEach(([name, value]) => {
            if (name === 'legendPresetId') {
                // Not a paint — but it must land on the frozen mount snapshot,
                // or the properties toolbar keeps reporting the old binding
                // until the element is remounted. ElementRenderWrapper freezes
                // props at mount, so nothing else would tell it.
                if (group.elementData) group.elementData.legendPresetId = value
                return
            }
            paintPresetKey(group, twoJSInstance, name, value)
        })
    }

    updateComponentBulkPropertiesInLocalStore(id, patch, skipHistory)
    twoJSInstance?.update()
    return patch
}

/**
 * Apply a preset across many elements as ONE undo step.
 *
 * Mirrors `applyGroupProperty`: each element is written with `skipHistory`, its
 * own before/after snapshot is collected, and the caller records a single BATCH
 * entry. Used both when a preset is edited (restyling everything bound to it)
 * and when a preset is deleted (unbinding them).
 */
export function applyPresetToMany(
    deps: ApplyPresetDeps,
    ids: readonly string[],
    preset: LegendPreset | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshotOf: (id: string) => Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<Record<string, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: Array<Record<string, any>> = []
    ids.forEach((id) => {
        const prevProps = snapshotOf(id)
        const bulkObj = applyPresetToElement(deps, id, preset, true)
        entries.push({ action: 'UPDATE_BULK', id, prevProps, bulkObj })
    })
    return entries
}

/**
 * Which records are bound to a preset. The store is the source of truth here,
 * not the scene: an element scrolled far off-camera is still bound.
 */
export function idsBoundToPreset(
    store: Record<string, ComponentRecord>,
    presetId: string
): string[] {
    return Object.keys(store).filter(
        (id) => store[id]?.legendPresetId === presetId
    )
}
