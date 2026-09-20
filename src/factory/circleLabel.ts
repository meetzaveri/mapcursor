import Two from 'two.js'
import {
    CIRCLE_LABEL_COLOR,
    DEFAULT_TEXT_FONT_FAMILY,
    POINT_LABEL_FONT_SIZE,
} from '../constants/misc'
import { capCenterOffset } from '../utils/fontMetrics'
import { lineHeightFor, wrapText } from '../utils/textLayout'
import { usableTextWidth } from '../utils/shapeTextFit'
import { readProperties } from '../utils/geometry'

// The map circle's name, drawn centred inside the ring.
//
// Deliberately NOT craftbase's shape-inner-text model (`metadata.hasText` +
// `textContent`, rendered by canvasUtils `applyShapeText`). That one grows the
// shape to fit its text, and a circle's size IS its radius — the whole meaning
// of the mark. This is the POINT's model instead: a label parked in the
// element's group, stored in `metadata`, which never touches the geometry.
//
// The two consequences that shape everything below:
//
//  1. The lines live in their own sub-group, flagged CIRCLE_LABEL_FLAG. That is
//     what keeps the dead whiteboard path dead: `getShapeTextNodes` (canvasUtils)
//     filters `group.children` for a string `.value`, and a Group has none — so
//     it returns [] for a circle, `buildToolbarState` leaves `text.data` empty,
//     and neither applyProperty's legacy `isShapeWithText` branch nor the
//     selection controller's auto-height reflow can ever fire on a circle.
//  2. The sub-group is also the single node to counter-scale, and the ONLY
//     thing about a circle that resists zoom: the disc is borderless and its
//     geometry stays world-glued so 5km stays 5km, so neither the point's
//     `group.scale` trick nor area/route's stroke scaling applies here.
//     circle.tsx scales THIS group instead.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

/**
 * Marks the label sub-group inside a circle's group.
 *
 * Mirrors POINT_CHROME_FLAG: the group holds the ellipse, the label and
 * (transiently) selection chrome, and every one of those needs to be findable
 * without relying on a child index.
 */
export const CIRCLE_LABEL_FLAG = '__mcCircleLabel'

/** The circle's label text. Empty until typed. */
export function circleLabelOf(record: ShapeLike): string {
    const label = readProperties(record).label
    return typeof label === 'string' ? label : ''
}

/**
 * The label's ink.
 *
 * Stored on the `textColor` COLUMN, not in metadata. Three reasons: it is
 * already a column, already selected by the base-load query and already
 * carried by cloneElementData, so this cost nothing; a circle has no other
 * text, so the column is unambiguous; and the metadata spelling for shape text
 * is `textFill`, which is the key `applyShapeText` gates on — writing it would
 * re-arm the craftbase path this element deliberately keeps dead.
 *
 * Absent on every circle written before the label existed, which reads as the
 * design default.
 */
export function circleLabelColorOf(record: ShapeLike): string {
    const color = record?.textColor
    return typeof color === 'string' && color ? color : CIRCLE_LABEL_COLOR
}

/**
 * The label's font family. Absent on every circle written before the label
 * existed — those read as DEFAULT_TEXT_FONT_FAMILY.
 */
export function circleLabelFontFamilyOf(record: ShapeLike): string {
    const family = readProperties(record).textFontFamily
    return typeof family === 'string' && family
        ? family
        : DEFAULT_TEXT_FONT_FAMILY
}

/**
 * The label's font size, in surface units. Shares the POINT ladder
 * (POINT_LABEL_SIZES) rather than the whiteboard's TEXT_SIZES_ARRAY: both are
 * annotations hanging off a mark, and the whiteboard ladder's smallest step
 * (24) already overshoots.
 */
export function circleLabelFontSizeOf(record: ShapeLike): number {
    const size = readProperties(record).textFontSize
    return typeof size === 'number' && size > 0 ? size : POINT_LABEL_FONT_SIZE
}

/** The label sub-group of a built circle group, or null if it has none yet. */
export function getCircleLabelGroup(group: ShapeLike): ShapeLike | null {
    const children = group?.children
    if (!children) return null
    // `find` is safe on a Two.js Collection — it constructs nothing. `filter`
    // and friends are not; see the Collection pitfall note in CLAUDE.md.
    return children.find((c: ShapeLike) => c?.[CIRCLE_LABEL_FLAG]) ?? null
}

/** The label's line nodes, top to bottom. Empty when there is no label. */
export function getCircleLabelNodes(group: ShapeLike): ShapeLike[] {
    const layer = getCircleLabelGroup(group)
    if (!layer?.children) return []
    // Array.from BEFORE filter: a Two.js Collection's `filter` seeds its result
    // with a spurious 0 and would hand back `[0]` for an empty label.
    return Array.from(layer.children as ArrayLike<ShapeLike>).filter(
        (c: ShapeLike) => typeof c?.value === 'string'
    )
}

export interface CircleLabelOptions {
    text: string
    fontFamily: string
    fontSize: number
    /** The label's ink. Defaults to CIRCLE_LABEL_COLOR when absent. */
    color?: string
    /** The circle's width in surface units — drives the wrap. */
    width: number
}

/**
 * Build (or rebuild in place) a circle's label, and return its sub-group.
 *
 * Rebuilding in place rather than remounting is what lets a label edit land on
 * an element whose React props are frozen at mount — the same reason
 * applyProperty reaches into the scene directly.
 *
 * WRAPPING is measured at the scale-1 reference: `usableTextWidth` returns the
 * inscribed box in SURFACE units, and we wrap against it at the label's own
 * size. So the line breaks are a function of (text, family, size, width) alone
 * and never move as the camera zooms. Dividing by the live counter-scale would
 * keep the label inside the on-screen ring at every zoom, but it re-flows the
 * text on every zoom frame — janky and needless. The cost of this choice is
 * that at resist 0.9 a long label overflows the ring when zoomed far out,
 * exactly as a point's label overflows its 10px pin today.
 *
 * The sub-group is never `two.remove`d, only emptied — removing a group whose
 * SVG node is nested inside another is how you land in the scene.subtractions
 * crash (see CLAUDE.md).
 */
// Narrowest the name is allowed to wrap to, as a multiple of the font size.
//
// `usableTextWidth` alone is a whiteboard measure: it takes the circle's
// inscribed box and subtracts a fixed 28 surface units of padding, which is
// nothing against a 450-unit board circle and is the WHOLE box against a map
// one. A map circle is sized by the ground it covers, so a tight radius is an
// ordinary thing to draw — at 59 units wide the usable width came out at 13,
// under two digits, and `wrapText` fell back to charWrap and stacked the name
// one glyph per line, a tower several times the height of the ring.
//
// Overflowing the ring is already the accepted behaviour here (the wrap is
// taken at the scale-1 reference and never re-flows, so a long name overruns
// when zoomed out — exactly as a point's label overruns its pin). Given that,
// a name that is too big for its circle should overrun it horizontally like
// any other label, not disintegrate vertically.
//
// The editor has always applied this floor to its textarea; sharing it is what
// makes what you type and what gets drawn the same shape. Without that, the
// overlay wrapped at 4em while the committed label wrapped at 13 units, and
// naming a small circle looked like it worked right up until you clicked away.
const MIN_WRAP_EMS = 4

/**
 * Width, in surface units, that a circle's name wraps to. The single definition
 * — `circleLabelEditor` sizes its overlay with this too, scaled onto the screen.
 */
export function circleWrapWidth(width: number, size: number): number {
    return Math.max(usableTextWidth('circle', width), size * MIN_WRAP_EMS)
}

export function buildCircleLabel(
    two: ShapeLike,
    group: ShapeLike,
    opts: CircleLabelOptions
): ShapeLike | null {
    if (!group) return null

    let layer = getCircleLabelGroup(group)
    if (!layer) {
        layer = new (Two as ShapeLike).Group()
        layer[CIRCLE_LABEL_FLAG] = true
        layer.translation.set(0, 0)
        group.add(layer)
    }

    const family = opts.fontFamily || DEFAULT_TEXT_FONT_FAMILY
    const size = opts.fontSize || POINT_LABEL_FONT_SIZE
    const raw = opts.text ?? ''

    const lines = raw
        ? wrapText(raw, circleWrapWidth(opts.width, size), {
              family,
              size,
              weight: 'normal',
          })
        : []

    const lineH = lineHeightFor(size)
    const n = lines.length
    // Drawn on the ALPHABETIC baseline and positioned by hand, not with
    // `baseline: 'middle'`. SVG's middle baseline centres the x-height, which
    // leaves mixed-case text floating ~0.1em high — visible at every size and
    // by a different amount per font. capCenterOffset puts the cap band's
    // centre on the circle's centre instead. It moves with BOTH size and
    // family, so it is recomputed on every rebuild. See utils/fontMetrics.ts.
    const capOffset = capCenterOffset(family, size)

    const existing = Array.from(
        (layer.children ?? []) as ArrayLike<ShapeLike>
    )

    for (let i = 0; i < n; i++) {
        let node = existing[i]
        if (!node) {
            node = new (Two as ShapeLike).Text(lines[i] ?? '', 0, 0)
            node.noStroke()
            layer.add(node)
        }
        node.value = lines[i] ?? ''
        node.alignment = 'center'
        node.baseline = 'baseline'
        node.size = size
        node.family = family
        node.fill = opts.color || CIRCLE_LABEL_COLOR
        // Stack centred on the origin, then drop the whole block onto its cap
        // band. Same block-centring as text.tsx's syncMultilineLayout.
        node.translation.set(0, (i - (n - 1) / 2) * lineH + capOffset)
    }

    // Remove only the surplus. `two.remove` is not used: these nodes belong to
    // the sub-group, and Group.remove detaches them without queuing a scene
    // subtraction the renderer would later retry.
    if (existing.length > n) {
        const surplus = existing.slice(n)
        if (surplus.length > 0) layer.remove(surplus)
    }

    return layer
}
