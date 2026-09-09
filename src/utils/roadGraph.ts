// A routable graph of the roads currently on screen, built from the basemap's
// own vector tiles.
//
// This is the brain behind snap-to-road route drawing. It is deliberately
// PURE — no maplibre, no DOM, no Two.js — so it can be reasoned about and
// asserted in Node (see tests/e2e/road-graph.spec.js). Everything MapLibre
// touches lives in `baseTypes/roadSource.ts`, which hands this module plain
// surface-space polylines.
//
// ## Why a graph, and not the angle rule it replaces
//
// The obvious way to follow a road is to look at which way the cursor moved and
// pick the branch nearest that bearing — "if the cursor swings into the 60°
// quadrant and there's a road going that way, turn onto it". That rule is right
// about the *intent* but it has to re-derive, at every junction, something the
// graph already knows.
//
// Snapping the cursor to the nearest road and asking for the SHORTEST PATH
// along roads from the last committed point produces that behaviour for free:
// keep the cursor on the same street and the path runs straight down it; swing
// it onto a cross street and the shortest way to that new position is "continue
// to the junction, then turn" — which is exactly the divert being described.
// It also handles what the angle rule cannot: one-block detours, dual
// carriageways, and a cursor that has drifted three junctions ahead.
//
// The bearing intuition is not thrown away. It survives as the tie-breaker in
// `chooseSnap` (which of several roads under the cursor did the user MEAN?) and
// as the turn penalty in `routeAlongRoads` (given equal length, go straight).
//
// ## The shape of the graph
//
// Every vertex of every road polyline becomes a node, and every consecutive
// pair becomes a single straight edge. That is denser than a classic
// junction-to-junction road graph, and it is chosen on purpose: it makes the
// routed path follow the road's real curvature vertex for vertex, and it makes
// junction detection fall out of node welding rather than needing a separate
// segment-intersection pass. OSM models a crossing as a SHARED NODE, and that
// node survives tiling as a coincident vertex in both linestrings — so welding
// coincident vertices reconstructs the junctions exactly.

export interface Pt {
    x: number
    y: number
}

/** One road, in surface space, as handed over by the road source. */
export interface RoadPolyline {
    /** OMT `class` — 'motorway' | 'primary' | 'residential' | 'path' | … */
    roadClass: string
    points: Pt[]
}

export interface RoadGraph {
    nodes: Pt[]
    /** Edge endpoints, as node indices. Every edge is one straight segment. */
    edgeA: number[]
    edgeB: number[]
    edgeLen: number[]
    edgeClass: string[]
    /** Directed edge ids leaving each node. See `dirEdge` for the encoding. */
    outEdges: number[][]
    /** Edge indices bucketed by spatial cell, for nearest-road queries. */
    grid: Map<string, number[]>
    cellSize: number
    unitsPerMeter: number
    /**
     * Connected-component id per node, and the node count of each component.
     *
     * A screenful of tiles is NOT one connected network. Roads are cut at the
     * tile-load boundary, and — the case that actually bites — footpaths,
     * service roads and driveways routinely appear as small islands that join
     * the street network somewhere off-screen, or through geometry the tileset
     * simplified away. Measured on central Ahmedabad at z16: 15,515 nodes, and
     * a click that landed on a park path snapped to a component of 41.
     *
     * Knowing this up front is what turns "the route silently drew straight"
     * into a question the snapper can answer before it searches.
     */
    nodeComponent: number[]
    componentSizes: number[]
    /** Id of the biggest component — the street network, in practice. */
    largestComponent: number
}

/** Where a surface point lands on the network. */
export interface SnapResult {
    /** Index into the graph's edge arrays. */
    edge: number
    /** Parameter along that edge, 0 at `edgeA`, 1 at `edgeB`. */
    t: number
    /** The snapped point itself — on the road centreline. */
    point: Pt
    /** Surface-space distance from the query point to `point`. */
    distance: number
    roadClass: string
}

// ── Directed edges ───────────────────────────────────────────────────────────
// A turn penalty needs to know which way you ARRIVED, so the search runs over
// directed edges rather than nodes: `d = edge * 2 + dir`, dir 0 = A→B, 1 = B→A.
// `d ^ 1` is the reverse, which is how U-turns are detected.

const edgeOf = (d: number): number => d >> 1
const tailOf = (g: RoadGraph, d: number): number =>
    d & 1 ? g.edgeB[edgeOf(d)]! : g.edgeA[edgeOf(d)]!
const headOf = (g: RoadGraph, d: number): number =>
    d & 1 ? g.edgeA[edgeOf(d)]! : g.edgeB[edgeOf(d)]!

function bearingOf(g: RoadGraph, d: number): number {
    const a = g.nodes[tailOf(g, d)]!
    const b = g.nodes[headOf(g, d)]!
    return Math.atan2(b.y - a.y, b.x - a.x)
}

/** Smallest angle between two bearings, in [0, π]. */
export function angleBetween(a: number, b: number): number {
    let diff = Math.abs(a - b) % (Math.PI * 2)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    return diff
}

// ── Build ────────────────────────────────────────────────────────────────────

export interface BuildOptions {
    /** Surface units per metre, from `surfaceUnitsPerMeter(anchor)`. */
    unitsPerMeter: number
    /**
     * How close two vertices must be to be treated as the same junction.
     *
     * Tile coordinates are quantised to a 4096-unit extent, so a node shared by
     * two OSM ways arrives from two different tiles with sub-metre disagreement.
     * Weld too tight and every junction silently becomes two dead ends that no
     * route can cross; weld too loose and roads passing over each other on a
     * bridge fuse into a junction that does not exist. A metre and a half clears
     * the quantisation and stays well under any real road separation.
     */
    weldMeters?: number
}

const DEFAULT_WELD_METERS = 1.5
/** Spatial index cell, in metres. Roughly a city block. */
const GRID_CELL_METERS = 80

const cellKey = (cx: number, cy: number): string => `${cx}|${cy}`

/**
 * Build the routable graph from a screenful of road polylines.
 *
 * Coincident vertices are welded into one node, which both reconstructs
 * junctions and collapses the duplicate geometry that tile overlap produces —
 * the same road arrives once per tile it crosses, and the shared segments land
 * on the same node pair and are dropped as duplicate edges.
 */
export function buildRoadGraph(
    polylines: RoadPolyline[],
    { unitsPerMeter, weldMeters = DEFAULT_WELD_METERS }: BuildOptions
): RoadGraph {
    const weld = weldMeters * unitsPerMeter
    const cellSize = Math.max(weld * 4, GRID_CELL_METERS * unitsPerMeter)

    const nodes: Pt[] = []
    // Node lookup keyed on a weld-sized lattice. A vertex is compared against
    // the 9 surrounding cells, so a pair straddling a cell boundary still welds.
    const nodeCells = new Map<string, number[]>()
    const weldCell = weld > 0 ? weld : 1

    const nodeAt = (p: Pt): number => {
        const cx = Math.floor(p.x / weldCell)
        const cy = Math.floor(p.y / weldCell)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const bucket = nodeCells.get(cellKey(cx + dx, cy + dy))
                if (!bucket) continue
                for (const idx of bucket) {
                    const n = nodes[idx]!
                    if (Math.abs(n.x - p.x) > weld) continue
                    if (Math.abs(n.y - p.y) > weld) continue
                    if (Math.hypot(n.x - p.x, n.y - p.y) <= weld) return idx
                }
            }
        }
        const idx = nodes.length
        nodes.push({ x: p.x, y: p.y })
        const key = cellKey(cx, cy)
        const bucket = nodeCells.get(key)
        if (bucket) bucket.push(idx)
        else nodeCells.set(key, [idx])
        return idx
    }

    const edgeA: number[] = []
    const edgeB: number[] = []
    const edgeLen: number[] = []
    const edgeClass: string[] = []
    // Dedupes the overlap where the same road is delivered by two adjacent
    // tiles. Keyed on the unordered node pair — direction is not meaningful
    // here, the search generates both directions itself.
    const seenEdges = new Set<string>()

    for (const line of polylines) {
        const pts = line.points
        if (pts.length < 2) continue
        let prev = nodeAt(pts[0]!)
        for (let i = 1; i < pts.length; i++) {
            const curr = nodeAt(pts[i]!)
            if (curr === prev) continue // zero-length after welding
            const key = prev < curr ? `${prev}-${curr}` : `${curr}-${prev}`
            if (!seenEdges.has(key)) {
                seenEdges.add(key)
                const a = nodes[prev]!
                const b = nodes[curr]!
                edgeA.push(prev)
                edgeB.push(curr)
                edgeLen.push(Math.hypot(b.x - a.x, b.y - a.y))
                edgeClass.push(line.roadClass)
            }
            prev = curr
        }
    }

    const outEdges: number[][] = Array.from({ length: nodes.length }, () => [])
    const grid = new Map<string, number[]>()
    for (let e = 0; e < edgeA.length; e++) {
        const a = edgeA[e]!
        const b = edgeB[e]!
        outEdges[a]!.push(e * 2)
        outEdges[b]!.push(e * 2 + 1)

        // Index the edge into every cell its bounding box touches, so a long
        // segment is still found from a query point in the middle of it.
        const pa = nodes[a]!
        const pb = nodes[b]!
        const x0 = Math.floor(Math.min(pa.x, pb.x) / cellSize)
        const x1 = Math.floor(Math.max(pa.x, pb.x) / cellSize)
        const y0 = Math.floor(Math.min(pa.y, pb.y) / cellSize)
        const y1 = Math.floor(Math.max(pa.y, pb.y) / cellSize)
        for (let cx = x0; cx <= x1; cx++) {
            for (let cy = y0; cy <= y1; cy++) {
                const key = cellKey(cx, cy)
                const bucket = grid.get(key)
                if (bucket) bucket.push(e)
                else grid.set(key, [e])
            }
        }
    }

    // Label connected components with an iterative flood fill — one pass over
    // the graph, and it turns an expensive failed search into a lookup.
    const nodeComponent = new Array<number>(nodes.length).fill(-1)
    const componentSizes: number[] = []
    for (let seed = 0; seed < nodes.length; seed++) {
        if (nodeComponent[seed] !== -1) continue
        const id = componentSizes.length
        let size = 0
        const stack = [seed]
        nodeComponent[seed] = id
        while (stack.length > 0) {
            const n = stack.pop()!
            size++
            for (const d of outEdges[n]!) {
                const e = d >> 1
                const other = edgeA[e]! === n ? edgeB[e]! : edgeA[e]!
                if (nodeComponent[other] === -1) {
                    nodeComponent[other] = id
                    stack.push(other)
                }
            }
        }
        componentSizes.push(size)
    }
    let largestComponent = 0
    for (let i = 1; i < componentSizes.length; i++) {
        if (componentSizes[i]! > componentSizes[largestComponent]!) {
            largestComponent = i
        }
    }

    return {
        nodes,
        edgeA,
        edgeB,
        edgeLen,
        edgeClass,
        outEdges,
        grid,
        cellSize,
        unitsPerMeter,
        nodeComponent,
        componentSizes,
        largestComponent,
    }
}

/** Which connected component a snapped position sits on. */
export function componentOf(g: RoadGraph, snap: SnapResult): number {
    return g.nodeComponent[g.edgeA[snap.edge]!]!
}

// ── Snapping ─────────────────────────────────────────────────────────────────

function projectOnEdge(g: RoadGraph, e: number, p: Pt): SnapResult {
    const a = g.nodes[g.edgeA[e]!]!
    const b = g.nodes[g.edgeB[e]!]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lenSq = dx * dx + dy * dy
    const t =
        lenSq === 0
            ? 0
            : Math.max(
                  0,
                  Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq)
              )
    const point = { x: a.x + dx * t, y: a.y + dy * t }
    return {
        edge: e,
        t,
        point,
        distance: Math.hypot(p.x - point.x, p.y - point.y),
        roadClass: g.edgeClass[e]!,
    }
}

/**
 * Every road within `radius` of `p`, nearest first.
 *
 * The sweep covers every cell the radius touches, and deliberately does NOT
 * stop early once something is found. Stopping a ring after the first hit is
 * the obvious optimisation and it is wrong here: callers filter this list —
 * by connected component, above all — so the answer they want is routinely not
 * the nearest one. It cost a whole afternoon as "the route silently declines to
 * leave a footpath", because the street it needed was two rings further out and
 * the sweep had already returned. The radius bounds the work to a handful of
 * cells (the grid is ~80m); there was nothing to save.
 */
export function snapCandidates(
    g: RoadGraph,
    p: Pt,
    radius: number,
    limit = 16
): SnapResult[] {
    if (g.edgeA.length === 0) return []
    const maxRing = Math.max(1, Math.ceil(radius / g.cellSize))
    const cx = Math.floor(p.x / g.cellSize)
    const cy = Math.floor(p.y / g.cellSize)

    const seen = new Set<number>()
    const found: SnapResult[] = []

    for (let ring = 0; ring <= maxRing; ring++) {
        for (let dx = -ring; dx <= ring; dx++) {
            for (let dy = -ring; dy <= ring; dy++) {
                // Ring, not disc: the interior was swept on earlier passes.
                if (
                    ring > 0 &&
                    Math.abs(dx) !== ring &&
                    Math.abs(dy) !== ring
                ) {
                    continue
                }
                const bucket = g.grid.get(cellKey(cx + dx, cy + dy))
                if (!bucket) continue
                for (const e of bucket) {
                    if (seen.has(e)) continue
                    seen.add(e)
                    const hit = projectOnEdge(g, e, p)
                    if (hit.distance > radius) continue
                    found.push(hit)
                }
            }
        }
    }

    found.sort((a, b) => a.distance - b.distance)
    return found.slice(0, limit)
}

export interface ChooseSnapOptions {
    /** How far from the cursor to look for a road, in surface units. */
    radius: number
    /**
     * The point the route is currently anchored at. When present, the bearing
     * from it to the cursor decides between roads the cursor sits between.
     */
    from?: Pt | null
    /**
     * Half-width of the "I meant that way" cone, in radians. A candidate whose
     * bearing from `from` is inside the cone pays nothing; outside it, the
     * penalty ramps to `directionWeight` at 180°.
     *
     * This is the 60°-quadrant rule, kept as a preference rather than a hard
     * gate — a filter here would leave the route stuck whenever the only road
     * available is behind the cursor's heading.
     */
    coneHalfAngle?: number
    /** Cost, in surface units, of being fully opposed to the cursor's bearing. */
    directionWeight?: number
    /**
     * How many nearest roads to consider. Raised automatically when
     * `component` is set, because the filter can discard a long run of nearer
     * candidates before reaching a usable one.
     */
    limit?: number
    /**
     * Restrict candidates to one connected component.
     *
     * This is what makes a route in progress unable to fail. Once the first
     * vertex has landed on a network, every later point is chosen from the same
     * network, so a path between them is guaranteed to exist — rather than the
     * search discovering, expensively and silently, that it does not.
     */
    component?: number | null
    /**
     * Cost, in surface units, of sitting on a disconnected fragment rather than
     * the main network. See `fragmentFraction`.
     *
     * Not a filter, deliberately. A user who clicks squarely on a park path
     * means the park path, and gets it; the penalty only decides the case where
     * a stub happens to be marginally nearer than the street the user was
     * plainly aiming at.
     */
    fragmentPenalty?: number
    /**
     * A component holding less than this fraction of the largest component's
     * nodes counts as a fragment. Tile clipping leaves several legitimate
     * medium-sized components at the edges of the viewport, so this has to be
     * measured against the biggest network rather than an absolute node count.
     */
    fragmentFraction?: number
}

const DEFAULT_CONE_HALF_ANGLE = (60 * Math.PI) / 180
/** Below this, the cursor has barely left the anchor and its bearing is noise. */
const MIN_BEARING_DISTANCE_UNITS = 2
const DEFAULT_FRAGMENT_FRACTION = 0.1

/**
 * Pick the road the user means, out of everything under the cursor.
 *
 * Distance alone gets this wrong in two ways, both measured on a real map
 * rather than imagined.
 *
 * It cannot tell a junction apart: two roads within a few metres of each other
 * and of the cursor, where only the direction the hand is travelling says which
 * was meant. That is the `from`/cone term.
 *
 * And it cannot tell the street network apart from an island. A click in a
 * block of central Ahmedabad found a park path 84 units away, on a component of
 * 41 nodes, in preference to the street 133 units away on the component of
 * 8,384 — and a route between the two simply does not exist, so the whole
 * feature fell back to a straight line with nothing to show for itself. That is
 * the `fragmentPenalty` term.
 */
export function chooseSnap(
    g: RoadGraph,
    cursor: Pt,
    {
        radius,
        from = null,
        coneHalfAngle = DEFAULT_CONE_HALF_ANGLE,
        directionWeight = radius,
        component = null,
        fragmentPenalty = 0,
        fragmentFraction = DEFAULT_FRAGMENT_FRACTION,
        limit = component !== null ? 64 : 16,
    }: ChooseSnapOptions
): SnapResult | null {
    const candidates = snapCandidates(g, cursor, radius, limit)
    if (candidates.length === 0) return null

    const largestSize = g.componentSizes[g.largestComponent] ?? 0
    const fragmentBelow = largestSize * fragmentFraction

    // The bearing is only meaningful once the cursor has actually travelled;
    // below the floor it is hand tremor, and letting it steer makes the first
    // segment of every route flicker between streets.
    const travel = from ? Math.hypot(cursor.x - from.x, cursor.y - from.y) : 0
    const useBearing = from !== null && travel >= MIN_BEARING_DISTANCE_UNITS
    const intended = useBearing
        ? Math.atan2(cursor.y - from!.y, cursor.x - from!.x)
        : 0

    let best: SnapResult | null = null
    let bestScore = Infinity
    for (const c of candidates) {
        const comp = componentOf(g, c)
        if (component !== null && comp !== component) continue

        let score = c.distance
        if (useBearing) {
            const toCandidate = Math.atan2(
                c.point.y - from!.y,
                c.point.x - from!.x
            )
            const off = angleBetween(intended, toCandidate)
            const excess = Math.max(0, off - coneHalfAngle)
            score +=
                (excess / Math.max(1e-6, Math.PI - coneHalfAngle)) *
                directionWeight
        }
        if (
            fragmentPenalty > 0 &&
            (g.componentSizes[comp] ?? 0) < fragmentBelow
        ) {
            score += fragmentPenalty
        }
        if (score < bestScore) {
            bestScore = score
            best = c
        }
    }
    return best
}

// ── Routing ──────────────────────────────────────────────────────────────────

export interface RouteOptions {
    /**
     * Cost added for a full 180° turn, in surface units, scaled linearly by
     * turn angle. This is what makes the route prefer carrying straight on
     * through a junction when two ways round are the same length — the
     * behaviour the bearing rule was reaching for.
     */
    turnPenalty: number
    /**
     * Hard ceiling on path cost, in surface units. A cursor that has jumped to
     * an unconnected part of the network (across a river, onto a motorway with
     * no junction nearby) must fail fast and let the caller fall back to a
     * straight line, not walk half the city looking for a way round.
     */
    maxCost: number
    /** Safety valve on search size, for a pathological screenful of geometry. */
    maxSettled?: number
}

const DEFAULT_MAX_SETTLED = 60000

/** Minimal binary min-heap over (cost, directed edge). */
class MinHeap {
    private cost: number[] = []
    private item: number[] = []

    get size(): number {
        return this.item.length
    }

    push(cost: number, item: number): void {
        this.cost.push(cost)
        this.item.push(item)
        let i = this.item.length - 1
        while (i > 0) {
            const parent = (i - 1) >> 1
            if (this.cost[parent]! <= this.cost[i]!) break
            this.swap(i, parent)
            i = parent
        }
    }

    peekCost(): number {
        return this.cost.length > 0 ? this.cost[0]! : Infinity
    }

    pop(): { cost: number; item: number } {
        const cost = this.cost[0]!
        const item = this.item[0]!
        const lastCost = this.cost.pop()!
        const lastItem = this.item.pop()!
        if (this.item.length > 0) {
            this.cost[0] = lastCost
            this.item[0] = lastItem
            let i = 0
            for (;;) {
                const l = i * 2 + 1
                const r = l + 1
                let smallest = i
                if (
                    l < this.cost.length &&
                    this.cost[l]! < this.cost[smallest]!
                )
                    smallest = l
                if (
                    r < this.cost.length &&
                    this.cost[r]! < this.cost[smallest]!
                )
                    smallest = r
                if (smallest === i) break
                this.swap(i, smallest)
                i = smallest
            }
        }
        return { cost, item }
    }

    private swap(i: number, j: number): void {
        const c = this.cost[i]!
        this.cost[i] = this.cost[j]!
        this.cost[j] = c
        const t = this.item[i]!
        this.item[i] = this.item[j]!
        this.item[j] = t
    }
}

/**
 * The polyline along real roads from one snapped position to another.
 *
 * Returns the geometry only — first point is `start.point`, last is
 * `end.point`, and everything between is a road node. `null` means no route
 * within `maxCost`, which the caller should treat as "draw it straight", never
 * as an error.
 */
export function routeAlongRoads(
    g: RoadGraph,
    start: SnapResult,
    end: SnapResult,
    { turnPenalty, maxCost, maxSettled = DEFAULT_MAX_SETTLED }: RouteOptions
): Pt[] | null {
    // Already on the same segment: the road between them IS the straight line.
    if (start.edge === end.edge) return dedupe([start.point, end.point])

    const startLen = g.edgeLen[start.edge]!
    const endLen = g.edgeLen[end.edge]!

    const best = new Map<number, number>()
    const prev = new Map<number, number>()
    const heap = new MinHeap()

    // Two ways off the starting segment: forward to B, or back to A. Whichever
    // the shortest path actually wants, it pays only the part of the segment it
    // uses — which is what keeps a route that starts mid-block honest.
    const seedForward = start.edge * 2
    const seedBack = start.edge * 2 + 1
    best.set(seedForward, (1 - start.t) * startLen)
    best.set(seedBack, start.t * startLen)
    heap.push((1 - start.t) * startLen, seedForward)
    heap.push(start.t * startLen, seedBack)

    let goalCost = Infinity
    let goalDirected = -1
    let settled = 0

    while (heap.size > 0) {
        if (heap.peekCost() >= goalCost) break
        const { cost, item: d } = heap.pop()
        if (cost > best.get(d)!) continue // stale heap entry
        if (cost > maxCost) break
        if (++settled > maxSettled) break

        const node = headOf(g, d)
        const outgoing = g.outEdges[node]!
        const isDeadEnd = outgoing.length === 1
        const dBearing = bearingOf(g, d)

        for (const next of outgoing) {
            // A U-turn mid-block is never what was meant; at a dead end it is
            // the only way back out.
            if (next === (d ^ 1) && !isDeadEnd) continue

            const turn = angleBetween(dBearing, bearingOf(g, next))
            const turnCost = (turn / Math.PI) * turnPenalty

            if (edgeOf(next) === end.edge) {
                // Arrived at the destination segment — stop at `end.t` rather
                // than running to the far node.
                const along = next & 1 ? (1 - end.t) * endLen : end.t * endLen
                const total = cost + turnCost + along
                if (total < goalCost) {
                    goalCost = total
                    goalDirected = next
                    prev.set(next, d)
                }
                continue
            }

            const total = cost + turnCost + g.edgeLen[edgeOf(next)]!
            if (total > maxCost) continue
            const known = best.get(next)
            if (known === undefined || total < known) {
                best.set(next, total)
                prev.set(next, d)
                heap.push(total, next)
            }
        }
    }

    if (goalDirected < 0 || goalCost > maxCost) return null

    // Walk back to a seed. The chain is directed edges; the geometry is the
    // node each one arrives at, bracketed by the two snapped points.
    const chain: number[] = []
    let cursor = goalDirected
    for (;;) {
        chain.push(cursor)
        if (cursor === seedForward || cursor === seedBack) break
        const back = prev.get(cursor)
        if (back === undefined) return null
        cursor = back
        if (chain.length > g.edgeA.length + 2) return null // cycle guard
    }
    chain.reverse()

    const path: Pt[] = [start.point]
    // Every arrival node except the destination segment's, which is `end.point`.
    for (let i = 0; i < chain.length - 1; i++) {
        path.push(g.nodes[headOf(g, chain[i]!)]!)
    }
    path.push(end.point)
    return dedupe(path)
}

/** Drop consecutive duplicates, which the bracketing points can introduce. */
function dedupe(pts: Pt[]): Pt[] {
    const out: Pt[] = []
    for (const p of pts) {
        const last = out[out.length - 1]
        if (
            last &&
            Math.abs(last.x - p.x) < 1e-6 &&
            Math.abs(last.y - p.y) < 1e-6
        )
            continue
        out.push(p)
    }
    return out
}
