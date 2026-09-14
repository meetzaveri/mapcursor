// The geometry envelope, in one place.
//
// Every element record carries `metadata: { geometry, properties }` — a GeoJSON
// Feature minus its redundant `type` tag — whatever its componentType. This
// module is the ONLY place that should construct or destructure that envelope.
//
// It replaced a column that was polymorphic on componentType: a bare array of
// absolute vertices for route/area/pencil, a bag of named keys for
// point/text/circle. Those two shapes have no common root, which is why a route
// could not carry a named property at all — an array's non-index keys do not
// survive `JSON.stringify`, so they never reached jsonb. It also fragmented
// into four separate, mutually disagreeing definitions of "which types have
// array metadata"; a single `geometry` key collapses all of them.
//
// Two invariants everything here depends on:
//
//   1. Coordinates are SURFACE units, never lng/lat. A surface unit already is
//      a Web Mercator pixel at the base's anchor zoom, so the GeoJSON boundary
//      is one exact `surfaceToLngLat` pass — see `baseTypes/mercator.ts`.
//
//   2. `geometry` is the single source of truth for POSITION. The `x`/`y`
//      columns are a write-only cache that `setGeometry` derives from it, and
//      must never be read back as truth. Every writer here emits them together,
//      which is what makes the old "move the origin without moving the
//      vertices and the shape snaps back on next load" trap unreachable.

import type {
    ComponentMetadata,
    SurfaceGeometry,
    SurfacePosition,
} from '../types/base'

/**
 * Anything a geometry can be read off: a store row, a frozen prop bag, or a
 * Two.js group's `elementData`. Deliberately loose — the scene-bookkeeping
 * shapes these arrive as are typed `any` at most call sites.
 */
export interface GeometrySource {
    metadata?: unknown
}

/** The geometry-bearing fields of a record. Spread onto a record or a patch. */
export interface GeometryFields {
    metadata: ComponentMetadata
    x: number
    y: number
}

// ── Guards ──────────────────────────────────────────────────────────────────

function isPosition(value: unknown): value is SurfacePosition {
    return (
        Array.isArray(value) &&
        value.length >= 2 &&
        Number.isFinite(value[0]) &&
        Number.isFinite(value[1])
    )
}

function isPositionList(value: unknown): value is SurfacePosition[] {
    return Array.isArray(value) && value.every(isPosition)
}

/**
 * True for a well-formed surface geometry.
 *
 * A record that fails this is MALFORMED, not legacy — there is no
 * back-compatible shape to fall through to. Callers skip such records rather
 * than guessing at a position.
 */
export function isGeometry(value: unknown): value is SurfaceGeometry {
    if (!value || typeof value !== 'object') return false
    const g = value as { type?: unknown; coordinates?: unknown }
    if (g.type === 'Point') return isPosition(g.coordinates)
    if (g.type === 'LineString') return isPositionList(g.coordinates)
    if (g.type === 'Polygon') {
        return (
            Array.isArray(g.coordinates) &&
            g.coordinates.length > 0 &&
            g.coordinates.every(isPositionList)
        )
    }
    return false
}

// ── Reads ───────────────────────────────────────────────────────────────────

/** The record's geometry, or `null` when it carries none. */
export function readGeometry(
    source: GeometrySource | null | undefined
): SurfaceGeometry | null {
    const metadata = source?.metadata
    if (!metadata || typeof metadata !== 'object') return null
    const geometry = (metadata as { geometry?: unknown }).geometry
    return isGeometry(geometry) ? geometry : null
}

/** The record's property bag. Always an object, never null. */
export function readProperties(
    source: GeometrySource | null | undefined
): Record<string, unknown> {
    const metadata = source?.metadata
    if (!metadata || typeof metadata !== 'object') return {}
    const properties = (metadata as { properties?: unknown }).properties
    if (!properties || typeof properties !== 'object') return {}
    return properties as Record<string, unknown>
}

/**
 * A polygon ring with its closing position dropped.
 *
 * RFC 7946 requires the stored ring to be closed (first position repeated
 * last), but `factory/area.ts` builds its `Two.Path` with `closed = true` and
 * closes the shape itself — a duplicate final vertex there draws a zero-length
 * segment and puts a stray grab handle on top of the first one.
 */
function openRing(ring: SurfacePosition[]): SurfacePosition[] {
    if (ring.length < 2) return ring
    const first = ring[0]!
    const last = ring[ring.length - 1]!
    const closed = first[0] === last[0] && first[1] === last[1]
    return closed ? ring.slice(0, -1) : ring
}

/**
 * The positions to RENDER, flattened — a polygon's outer ring comes back open.
 *
 * Use this for drawing, bounding boxes and hit areas. For anything that has to
 * preserve the stored structure (a translate, a scale, a GeoJSON export), work
 * off `readGeometry` instead, or the ring silently opens.
 */
export function geometryPositions(
    geometry: SurfaceGeometry | null | undefined
): SurfacePosition[] {
    if (!geometry) return []
    if (geometry.type === 'Point') return [geometry.coordinates]
    if (geometry.type === 'LineString') return geometry.coordinates
    return openRing(geometry.coordinates[0] ?? [])
}

/** First stored position of a geometry — the group translation. */
function originOf(geometry: SurfaceGeometry): SurfacePosition {
    if (geometry.type === 'Point') return geometry.coordinates
    if (geometry.type === 'LineString') {
        return geometry.coordinates[0] ?? [0, 0]
    }
    return geometry.coordinates[0]?.[0] ?? [0, 0]
}

/**
 * The origin a record's shape is drawn relative to — what its Two.js group's
 * translation must be set to.
 *
 * Read this rather than the `x`/`y` columns. Those are a cache of exactly this
 * value, and reading them instead is how the two drifted apart before.
 */
export function geometryOrigin(
    source: GeometrySource | null | undefined
): { x: number; y: number } | null {
    const geometry = readGeometry(source)
    if (!geometry) return null
    const [x, y] = originOf(geometry)
    return { x, y }
}

/**
 * Centre of a record's bounding box, or `null` if there is nothing to measure.
 *
 * Paste uses it as the element's visual middle. The origin will not do: for a
 * route or a pencil stroke that is wherever the first click happened to fall,
 * so pasting "at the cursor" by it drops the shape a corner's-worth away from
 * the pointer — and further the more the drawing wanders from its first point.
 */
export function geometryCenter(
    source: GeometrySource | null | undefined
): { x: number; y: number } | null {
    const positions = geometryPositions(readGeometry(source))
    if (positions.length === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [px, py] of positions) {
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
    }
    if (minX === Infinity) return null
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

// ── Constructors ────────────────────────────────────────────────────────────

type PositionLike = SurfacePosition | { x: number; y: number }

function toPosition(point: PositionLike): SurfacePosition {
    if (Array.isArray(point)) return [point[0], point[1]]
    return [point.x, point.y]
}

export function pointGeometry(x: number, y: number): SurfaceGeometry {
    return { type: 'Point', coordinates: [x, y] }
}

export function lineGeometry(points: PositionLike[]): SurfaceGeometry {
    return { type: 'LineString', coordinates: points.map(toPosition) }
}

/**
 * A polygon from an OPEN list of points — the closing position is added here.
 *
 * Callers pass the vertices as drawn (and as rendered); closing the ring is
 * this module's job, so no call site has to remember the RFC 7946 rule.
 */
export function polygonGeometry(points: PositionLike[]): SurfaceGeometry {
    const ring = points.map(toPosition)
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        ring.push([first[0], first[1]])
    }
    return { type: 'Polygon', coordinates: [ring] }
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * Build the geometry-bearing fields of a record from scratch.
 *
 * `x`/`y` come out of the geometry, so a creation site cannot set an origin
 * that disagrees with its own coordinates.
 */
export function geometryFields(
    geometry: SurfaceGeometry,
    properties: Record<string, unknown> = {}
): GeometryFields {
    const [x, y] = originOf(geometry)
    return {
        // `properties` is copied, never aliased. `setGeometry` feeds this the
        // SOURCE record's bag, so sharing the reference would tie a pasted
        // clone's properties to the original it was copied from — edit one
        // label and both change.
        metadata: { geometry, properties: { ...properties } },
        x: Math.round(x),
        y: Math.round(y),
    }
}

/** Replace a record's geometry, keeping its properties. */
export function setGeometry(
    source: GeometrySource | null | undefined,
    geometry: SurfaceGeometry
): GeometryFields {
    return geometryFields(geometry, readProperties(source))
}

/**
 * Merge into a record's properties, keeping its geometry.
 *
 * Returns an EMPTY patch for a record with no geometry — there is nothing to
 * attach properties to, and inventing a position would corrupt the record
 * silently. The caller's spread then becomes a no-op.
 */
export function setProperties(
    source: GeometrySource | null | undefined,
    patch: Record<string, unknown>
): { metadata?: ComponentMetadata } {
    const geometry = readGeometry(source)
    if (!geometry) return {}
    return {
        metadata: {
            geometry,
            properties: { ...readProperties(source), ...patch },
        },
    }
}

/**
 * Replace a record's properties WHOLESALE, keeping its geometry.
 *
 * The counterpart to `setProperties`, and the one undo wants: a revert is as
 * often the removal of a key as a change to one. Styling a point that had never
 * been styled adds `textFontFamily`, and merging the reverted bag over the
 * current one would leave that key standing.
 */
export function replaceProperties(
    source: GeometrySource | null | undefined,
    properties: Record<string, unknown>
): { metadata?: ComponentMetadata } {
    const geometry = readGeometry(source)
    if (!geometry) return {}
    return { metadata: { geometry, properties: { ...properties } } }
}

/** Apply `fn` to every stored position, preserving the geometry's structure. */
function mapPositions(
    geometry: SurfaceGeometry,
    fn: (position: SurfacePosition) => SurfacePosition
): SurfaceGeometry {
    if (geometry.type === 'Point') {
        return { type: 'Point', coordinates: fn(geometry.coordinates) }
    }
    if (geometry.type === 'LineString') {
        return { type: 'LineString', coordinates: geometry.coordinates.map(fn) }
    }
    return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) => ring.map(fn)),
    }
}

/**
 * Move a record by `(dx, dy)`.
 *
 * Returns `null` when there is no geometry to move, so the caller can skip the
 * write rather than persist a half-move. Because the returned patch carries
 * `x`/`y` alongside the shifted coordinates, the origin and the geometry cannot
 * come apart — which is the whole bug class this replaces.
 */
export function translateGeometry(
    source: GeometrySource | null | undefined,
    dx: number,
    dy: number,
    // Persisted moves round to whole surface units, matching every creation
    // path. Pass `round: false` for a transient remap — notably the group
    // overlay, where a pencil's Chaikin smoothing reads the fractional part of
    // its vertices and rounding visibly squares the stroke off.
    { round = true }: { round?: boolean } = {}
): GeometryFields | null {
    const geometry = readGeometry(source)
    if (!geometry) return null
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
    const shift = round
        ? (value: number) => Math.round(value)
        : (value: number) => value
    const moved = mapPositions(geometry, ([x, y]) => [
        shift(x + dx),
        shift(y + dy),
    ])
    return setGeometry(source, moved)
}

/**
 * Move a record so its ORIGIN lands on `(x, y)`.
 *
 * The operation every "place this element here" path wants: element creation
 * parks a record off-screen and a later click positions it, a resize re-anchors
 * a box, an undo restores a previous position. All of them used to write the
 * `x`/`y` columns alone, which is now a silent corruption — the columns are a
 * cache, so the record would render at its creation-time coordinates on the
 * next load while looking correct until then.
 *
 * Works for every geometry type: a Point's position is simply set, and a
 * LineString or Polygon translates as a whole.
 */
export function moveGeometryTo(
    source: GeometrySource | null | undefined,
    x: number,
    y: number
): GeometryFields | null {
    const origin = geometryOrigin(source)
    if (!origin) return null
    return translateGeometry(source, x - origin.x, y - origin.y)
}

/**
 * Scale a record's geometry about a fixed surface point (group resize).
 *
 * Per-vertex stroke widths live in `properties.widths` and are NOT scaled here
 * — they are a property, and the caller decides whether a resize should thicken
 * the ink. Keeping them out of the coordinate array is also what stops the two
 * from desyncing: every operation here is length-preserving.
 */
export function scaleGeometry(
    source: GeometrySource | null | undefined,
    factor: number,
    about: { x: number; y: number }
): GeometryFields | null {
    const geometry = readGeometry(source)
    if (!geometry) return null
    if (!Number.isFinite(factor) || factor === 0) return null
    const scaled = mapPositions(geometry, ([x, y]) => [
        about.x + (x - about.x) * factor,
        about.y + (y - about.y) * factor,
    ])
    return setGeometry(source, scaled)
}
