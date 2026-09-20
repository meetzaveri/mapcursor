// The persistence boundary for `components.component`.
//
// `ComponentRecord` is the CLIENT's shape of an element and it is deliberately
// wider than the table: `isDummy` marks an in-progress element that must never
// be saved, and `relativeX`/`relativeY` are drag bookkeeping. Hasura rejects
// the whole mutation on the first unknown key it sees, so anything sending a
// record straight to `insert_input`/`set_input` breaks the moment the two
// shapes diverge. That is exactly what happened when the map-only refactor
// dropped `radius`, `iconStroke` and friends from the schema: sharing a canvas
// died on `field 'radius' not found in type: 'components_component_insert_input'`.
//
// So: every write to this table goes through `toComponentColumns`. The
// allowlist below is keyed by `Components_Component_Set_Input` (identical to
// the insert input minus its `base` relationship), which makes `tsc` the guard
// — add a column in Hasura and `yarn codegen`, and this file fails to compile
// until the column is named here.

import type { Components_Component_Set_Input } from '../schema/generated'

export type ComponentColumn = keyof Components_Component_Set_Input

/**
 * Every writable column, as a lookup. The `Record<ComponentColumn, true>`
 * annotation is the whole point: it is an exhaustiveness check, not a list.
 */
const COMPONENT_COLUMNS: Record<ComponentColumn, true> = {
    baseId: true,
    baseName: true,
    children: true,
    componentType: true,
    createdAt: true,
    createdBy: true,
    fill: true,
    height: true,
    id: true,
    legendPresetId: true,
    linewidth: true,
    metadata: true,
    opacity: true,
    position: true,
    stroke: true,
    strokeType: true,
    textColor: true,
    updatedBy: true,
    width: true,
    x: true,
    x1: true,
    x2: true,
    y: true,
    y1: true,
    y2: true,
    zoomResistant: true,
}

/**
 * The same set as a list, for callers that need to name the offending key
 * rather than silently drop it — notably the e2e guard that asserts an
 * outgoing mutation carries nothing Hasura would reject.
 */
export const COMPONENT_COLUMN_NAMES: readonly string[] =
    Object.keys(COMPONENT_COLUMNS)

/**
 * Narrow a record (or a partial patch derived from one) to the columns Hasura
 * actually accepts.
 *
 * `undefined` values are dropped as well as unknown keys — a key present with
 * `undefined` serializes to JSON `null` and would blank the column on a `_set`.
 * An explicit `null` is kept, because clearing a column is a real intent.
 */
export function toComponentColumns(
    source: Record<string, unknown> | null | undefined
): Components_Component_Set_Input {
    const out: Record<string, unknown> = {}
    if (!source) return out
    Object.keys(source).forEach((key) => {
        if (!(key in COMPONENT_COLUMNS)) return
        const value = source[key]
        if (value === undefined) return
        out[key] = value
    })
    return out as Components_Component_Set_Input
}
