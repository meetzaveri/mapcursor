// Snap-to-road route drawing: the stateful layer between the canvas and the
// pure graph in `roadGraph.ts`.
//
// It owns two things the graph deliberately does not — the CACHE (rebuilding a
// screenful of road geometry per mousemove would be absurd) and the TUNING
// (every threshold authored in metres or screen pixels, then converted, so the
// feel is the same at z13 and z18).
//
// The whole module degrades to `null`. No map, tiles still loading, zoomed too
// far out, cursor over the middle of a park, two sides of a river with no
// bridge on screen — every one of those returns null and the caller draws the
// plain straight segment it always drew. Snapping is an assist, never a gate.

import { readRoads } from '../baseTypes/roadSource'
import { E2E_HOOKS } from './e2eHooks'
import {
    buildRoadGraph,
    chooseSnap,
    componentOf,
    roadWeldMeters,
    routeAlongRoads,
    snapCandidates,
    type Pt,
    type RoadGraph,
    type SnapResult,
} from './roadGraph'

// ── Tuning ───────────────────────────────────────────────────────────────────

/**
 * How far from the cursor to look for a road — in SCREEN pixels, converted
 * through the live camera scale.
 *
 * Screen pixels, not metres, because this threshold is about aim: it is the
 * slop between where the user put the cursor and where they meant to put it,
 * and that is a property of the hand and the display, not of the ground. Fixing
 * it in metres would make snapping impossibly twitchy zoomed in and grab
 * everything in sight zoomed out.
 *
 * The value is generous on purpose, and was MEASURED rather than guessed. A
 * grid swept across a screenful of central Ahmedabad at z16 snapped from only
 * 75% of positions at 45px — one click in four landing mid-block and silently
 * falling back to a straight line, which reads as the feature being broken
 * rather than declining. At 160px it is 100%, and the median snap distance is
 * unchanged (18 surface units): the extra reach costs nothing at the positions
 * that already worked, and only engages for the mid-block clicks that used to
 * fail. Being pulled to the nearest road from inside a block is the intended
 * behaviour — a route is a thing that follows streets — and the live preview
 * shows exactly where it landed before any click commits it.
 */
const SNAP_RADIUS_PX = 160

/**
 * Cost of a 180° turn, scaled linearly by angle. Roughly "a turn is worth this
 * many metres of extra driving" — enough that the route carries straight on
 * through a junction when the ways round are comparable, not so much that it
 * refuses a genuine corner.
 */
const TURN_PENALTY_METERS = 30

/**
 * How far the route may wander relative to the crow-flies distance before it
 * gives up. Real street grids run about 1.3× crow-flies; 4× leaves room for a
 * one-way system or a river crossing while still failing fast when the cursor
 * has landed somewhere genuinely unreachable.
 */
const MAX_DETOUR_FACTOR = 4
/** Floor on the above, so short hops near a dead end still find their way out. */
const MIN_SEARCH_METERS = 400

/**
 * What it costs a candidate road to be on a disconnected island rather than the
 * street network, in surface units. Half the snap radius: a stub has to be
 * clearly nearer, not merely nearer, to win.
 *
 * Measured case — a click in a block of central Ahmedabad offered a park path
 * at 84 units on a 41-node component and a secondary road at 133 on the
 * 8,384-node one. Distance alone took the path, and no route could then leave
 * it. With this penalty the road wins at 133 against 164, while a click landing
 * squarely ON the path (a few units away) still gets the path.
 */
const FRAGMENT_PENALTY_PX = SNAP_RADIUS_PX / 2

/** A cached graph older than this is assumed to have been panned away from. */
const MAX_GRAPH_AGE_MS = 2000
/** Don't re-query the tiles more often than this while they're still loading. */
const MIN_REBUILD_INTERVAL_MS = 400

// ── Graph cache ──────────────────────────────────────────────────────────────
// Module-level, so panning between two draws reuses the build.

let graph: RoadGraph | null = null
let builtAt = 0
let lastAttemptAt = 0

/** Drop the cached road graph — the camera moved, so the tiles did too. */
export function invalidateRoadGraph(): void {
    graph = null
}

function ensureGraph(): RoadGraph | null {
    const now = Date.now()
    if (graph && now - builtAt < MAX_GRAPH_AGE_MS) return graph
    if (now - lastAttemptAt < MIN_REBUILD_INTERVAL_MS) return graph
    lastAttemptAt = now

    const snapshot = readRoads()
    if (!snapshot) {
        graph = null
        return null
    }

    graph = buildRoadGraph(snapshot.polylines, {
        unitsPerMeter: snapshot.unitsPerMeter,
        weldMeters: roadWeldMeters(snapshot.mapZoom, snapshot.latitude),
    })
    builtAt = now
    return graph
}

// ── The snapper ──────────────────────────────────────────────────────────────

export interface RouteSnapPreview {
    /** Road-following polyline from the anchor to the cursor. */
    path: Pt[]
    /** Where the cursor landed on the network — becomes the next anchor. */
    snap: SnapResult
}

export interface RouteSnapper {
    /** Has a first vertex been committed? Until then there is nothing to route from. */
    hasAnchor(): boolean
    /** Snap the first vertex onto a road. `null` when no road is in reach. */
    start(cursor: Pt): Pt | null
    /** Route from the anchor to the cursor. `null` → caller draws it straight. */
    preview(cursor: Pt): RouteSnapPreview | null
    /** Adopt a preview's endpoint as the new anchor. */
    accept(preview: RouteSnapPreview): void
    /** Commit an unsnapped point, so a straight fallback segment still anchors. */
    acceptPoint(point: Pt): void
    reset(): void
}

export interface RouteSnapperOptions {
    /** Live ZUI scale, read per call — the camera moves mid-draw. */
    getScale: () => number
}

export function createRouteSnapper({
    getScale,
}: RouteSnapperOptions): RouteSnapper {
    // The anchor is kept as a bare SURFACE POINT, never as a SnapResult.
    //
    // That is the important decision in this file. A SnapResult holds an edge
    // INDEX, and the graph is rebuilt out from under this object whenever the
    // user pans — at which point every index in it means a different road.
    // Re-snapping the stored point against the current graph costs one nearest
    // -road query and is correct by construction, because the point is already
    // sitting on the centreline.
    let anchorPoint: Pt | null = null

    const radiusUnits = (): number => {
        const scale = getScale() || 1
        return SNAP_RADIUS_PX / scale
    }

    const snapAnchor = (g: RoadGraph): SnapResult | null => {
        if (!anchorPoint) return null
        // A wider radius than the cursor gets: the anchor IS on a road, so any
        // miss here is graph churn (a rebuild that re-welded the junction
        // slightly differently), not user aim. The exception is an anchor that
        // was committed off-network — a first click in the middle of a park —
        // where this is what walks the route onto the nearest street.
        return chooseSnap(g, anchorPoint, {
            radius: radiusUnits() * 2,
            fragmentPenalty: FRAGMENT_PENALTY_PX / (getScale() || 1),
        })
    }

    return {
        hasAnchor: (): boolean => anchorPoint !== null,

        start(cursor: Pt): Pt | null {
            const g = ensureGraph()
            if (!g) return null
            const snap = chooseSnap(g, cursor, {
                radius: radiusUnits(),
                fragmentPenalty: FRAGMENT_PENALTY_PX / (getScale() || 1),
            })
            if (!snap) return null
            anchorPoint = snap.point
            return snap.point
        },

        preview(cursor: Pt): RouteSnapPreview | null {
            if (!anchorPoint) return null
            const g = ensureGraph()
            if (!g) return null

            const from = snapAnchor(g)
            if (!from) return null

            // Two constraints on where the cursor is allowed to land.
            //
            // `from` supplies the bearing the user's hand is describing, which
            // breaks the tie between roads under the cursor — the 60° cone.
            //
            // `component` is the stronger one: the destination must be on the
            // same connected network as the anchor. That turns "search, fail,
            // fall back to a straight line" into "pick a reachable road in the
            // first place", and it is the difference between a route that
            // occasionally gives up for no visible reason and one that does not.
            const to = chooseSnap(g, cursor, {
                radius: radiusUnits(),
                from: anchorPoint,
                component: componentOf(g, from),
            })
            if (!to) return null

            const crow = Math.hypot(
                to.point.x - from.point.x,
                to.point.y - from.point.y
            )
            const path = routeAlongRoads(g, from, to, {
                turnPenalty: TURN_PENALTY_METERS * g.unitsPerMeter,
                maxCost: Math.max(
                    MIN_SEARCH_METERS * g.unitsPerMeter,
                    crow * MAX_DETOUR_FACTOR
                ),
            })
            if (!path || path.length < 2) return null
            return { path, snap: to }
        },

        accept(preview: RouteSnapPreview): void {
            anchorPoint = preview.snap.point
        },

        acceptPoint(point: Pt): void {
            anchorPoint = { x: point.x, y: point.y }
        },

        reset(): void {
            anchorPoint = null
        },
    }
}

// Debug handle for inspecting the road graph from the console or a headless
// harness — same pattern, and same gate, as __mcMap / __mcZui. Without it the
// failure modes here (tiles not loaded, source not registered, nothing within
// the snap radius) are indistinguishable from the outside: all three show up as
// a route that simply drew straight.
if (E2E_HOOKS && typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__mcRoadSnap = {
        readRoads,
        probe(cursor: Pt, scale = 1) {
            const snapshot = readRoads()
            const g = ensureGraph()
            if (!g) return { snapshot: snapshot ? 'ok' : null, graph: null }
            return {
                polylines: snapshot?.polylines.length ?? null,
                mapZoom: snapshot?.mapZoom ?? null,
                unitsPerMeter: g.unitsPerMeter,
                nodes: g.nodes.length,
                edges: g.edgeA.length,
                snap: chooseSnap(g, cursor, { radius: SNAP_RADIUS_PX / scale }),
            }
        },
        /**
         * Why did a route between these two points fail? Separates the three
         * causes that all look identical from outside — nothing to snap to,
         * the two ends in different connected components, or a search that hit
         * its cost ceiling.
         */
        candidates(p: Pt, scale = 1) {
            const g = ensureGraph()
            if (!g) return null
            return snapCandidates(g, p, SNAP_RADIUS_PX / scale, 12).map(
                (c) => ({
                    dist: Math.round(c.distance),
                    roadClass: c.roadClass,
                    component: componentOf(g, c),
                    componentSize: g.componentSizes[componentOf(g, c)],
                    isLargest: componentOf(g, c) === g.largestComponent,
                })
            )
        },
        diagnose(a: Pt, b: Pt, scale = 1) {
            const g = ensureGraph()
            if (!g) return { graph: null }
            const radius = SNAP_RADIUS_PX / scale
            const from = chooseSnap(g, a, { radius })
            const to = chooseSnap(g, b, { radius, from: a })
            if (!from || !to) return { from, to, path: null }

            // Flood the component containing `from`, so "unreachable" can be
            // distinguished from "too expensive".
            const seen = new Set<number>([g.edgeA[from.edge]!])
            const queue = [g.edgeA[from.edge]!]
            while (queue.length > 0) {
                const n = queue.pop()!
                for (const d of g.outEdges[n]!) {
                    const other =
                        g.edgeA[d >> 1]! === n
                            ? g.edgeB[d >> 1]!
                            : g.edgeA[d >> 1]!
                    if (!seen.has(other)) {
                        seen.add(other)
                        queue.push(other)
                    }
                }
            }
            const crow = Math.hypot(
                to.point.x - from.point.x,
                to.point.y - from.point.y
            )
            const maxCost = Math.max(
                MIN_SEARCH_METERS * g.unitsPerMeter,
                crow * MAX_DETOUR_FACTOR
            )
            return {
                from,
                to,
                crow,
                maxCost,
                componentSize: seen.size,
                totalNodes: g.nodes.length,
                sameComponent:
                    seen.has(g.edgeA[to.edge]!) || seen.has(g.edgeB[to.edge]!),
                pathAtBudget:
                    routeAlongRoads(g, from, to, {
                        turnPenalty: TURN_PENALTY_METERS * g.unitsPerMeter,
                        maxCost,
                    })?.length ?? null,
                pathUnlimited:
                    routeAlongRoads(g, from, to, {
                        turnPenalty: TURN_PENALTY_METERS * g.unitsPerMeter,
                        maxCost: Infinity,
                    })?.length ?? null,
            }
        },
    }
}
