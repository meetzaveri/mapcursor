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

const SNAP_RADIUS_PX = 160

const TURN_PENALTY_METERS = 30

const MAX_DETOUR_FACTOR = 4
const MIN_SEARCH_METERS = 400

const FRAGMENT_PENALTY_PX = SNAP_RADIUS_PX / 2

const MAX_GRAPH_AGE_MS = 2000
const MIN_REBUILD_INTERVAL_MS = 400

let graph: RoadGraph | null = null
let builtAt = 0
let lastAttemptAt = 0

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

export interface RouteSnapPreview {
    path: Pt[]
    snap: SnapResult
}

export interface RouteSnapper {
    hasAnchor(): boolean
    start(cursor: Pt): Pt | null
    preview(cursor: Pt): RouteSnapPreview | null
    accept(preview: RouteSnapPreview): void
    acceptPoint(point: Pt): void
    reset(): void
}

export interface RouteSnapperOptions {
    getScale: () => number
}

export function createRouteSnapper({
    getScale,
}: RouteSnapperOptions): RouteSnapper {
    let anchorPoint: Pt | null = null

    const radiusUnits = (): number => {
        const scale = getScale() || 1
        return SNAP_RADIUS_PX / scale
    }

    const snapAnchor = (g: RoadGraph): SnapResult | null => {
        if (!anchorPoint) return null
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
