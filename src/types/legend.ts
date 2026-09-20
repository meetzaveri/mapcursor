// Legend presets — the named, pre-styled bundles that turn a canvas full of
// coloured marks into a map with a key.
//
// A preset is scoped to ONE element type and to ONE base. An element that has
// one applied stores its id in the `legendPresetId` column, and that binding is
// live: editing the preset restyles every element bound to it, which is the
// only reason a legend swatch can be trusted to match what is on the map.

/**
 * The four placeable marks a preset can style.
 *
 * `circle` is the Radius Map tool — it keeps the componentType `'circle'`
 * because that is what the whole element pipeline is keyed on (see the comment
 * on its toolbar entry in `utils/constants.ts`).
 */
export type LegendPresetType = 'point' | 'area' | 'route' | 'circle'

export const LEGEND_PRESET_TYPES: readonly LegendPresetType[] = [
    'point',
    'area',
    'route',
    'circle',
]

/** Toolbar-facing names, matching `elementDisplayName` in utils/constants.ts. */
export const LEGEND_TYPE_LABELS: Record<LegendPresetType, string> = {
    point: 'Point',
    area: 'Area',
    route: 'Route',
    circle: 'Radius Map',
}

export function isLegendPresetType(
    value: string | null | undefined
): value is LegendPresetType {
    return LEGEND_PRESET_TYPES.includes(value as LegendPresetType)
}

/**
 * The style keys a preset may carry.
 *
 * Deliberately only the COLUMN-BACKED visual keys — the ones that make a mark
 * read as red-vs-yellow. That is what keeps applying a preset a single
 * `updateComponentBulkPropertiesInLocalStore` call with no metadata round-trip.
 * Label font and size stay manual; `style` is jsonb, so adding them later is a
 * wizard page and an apply branch, not a migration.
 */
export type LegendStyleKey = 'fill' | 'stroke' | 'linewidth' | 'strokeType'

export interface LegendPresetStyle {
    fill?: string
    stroke?: string
    linewidth?: number
    strokeType?: string | null
}

/**
 * Which keys each type's preset carries — the single declaration the wizard's
 * pages, the apply path and the drift-unbind rule all read. Nothing re-lists
 * these.
 *
 * `area` and `route` are stroked marks, so they take `stroke`. `point` and
 * `circle` are FILLED marks whose ring is their fill (see the one-way mirror in
 * applyProperty.ts), so they take `fill` and derive the stroke from it —
 * listing `stroke` here too would let a wizard offer two colours for one mark.
 * A point has no stroke controls at all, matching `SETS.POINT`.
 */
export const PRESET_STYLE_KEYS: Record<
    LegendPresetType,
    readonly LegendStyleKey[]
> = {
    point: ['fill'],
    area: ['stroke', 'linewidth', 'strokeType'],
    route: ['stroke', 'linewidth', 'strokeType'],
    circle: ['fill', 'linewidth', 'strokeType'],
}

/**
 * Every key a preset can ever write, as a lookup. This is what the drift-unbind
 * rule in `applyProperty` tests a hand-edit against: editing one of these on a
 * bound element means the element no longer matches its caption, so it unbinds.
 */
export const LEGEND_STYLE_KEYS: ReadonlySet<string> = new Set<string>([
    'fill',
    'stroke',
    'linewidth',
    'strokeType',
])

export interface LegendPreset {
    id: string
    baseId: string | null
    name: string
    elementType: LegendPresetType
    style: LegendPresetStyle
    /** Order in the legend list. */
    position: number
    /**
     * Stamped SERVER-side from the `x-hasura-user-id` header (a Hasura column
     * preset on insert), never sent by the client. Absent in local mode, where
     * there is no server to stamp it.
     */
    createdBy?: string | null
}

/**
 * The column patch a preset applies to an element of its type.
 *
 * The `fill → stroke` mirror lives here rather than at the call sites because
 * it is a property of the MARK, not of the gesture: a radius map and a point
 * both read as one mark, so their ring takes their fill. `applyProperty` does
 * the same thing for a hand-edit; this keeps a preset honest against it.
 *
 * Returns only keys the preset actually carries, so a partially-filled preset
 * (mid-wizard) never blanks a column it has no opinion about.
 */
export function presetStylePatch(
    preset: LegendPreset
): Record<string, unknown> {
    const keys = PRESET_STYLE_KEYS[preset.elementType]
    const patch: Record<string, unknown> = {}
    keys.forEach((key) => {
        const value = preset.style[key]
        if (value === undefined) return
        patch[key] = value
    })
    // A filled mark's ring is its fill. One-way, exactly as in applyProperty:
    // the preset never carries a separate `stroke` for these types.
    if (patch.fill !== undefined) patch.stroke = patch.fill
    return patch
}
