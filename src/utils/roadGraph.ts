export interface Pt {
    x: number
    y: number
}

export interface RoadPolyline {
    roadClass: string
    points: Pt[]
}

export interface RoadGraph {
    nodes: Pt[]
    edgeA: number[]
    edgeB: number[]
    edgeLen: number[]
    edgeClass: string[]
    outEdges: number[][]
    grid: Map<string, number[]>
    cellSize: number
    unitsPerMeter: number
    nodeComponent: number[]
    componentSizes: number[]
    largestComponent: number
}

export interface SnapResult {
    edge: number
    t: number
    point: Pt
    distance: number
    roadClass: string
}

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

export function angleBetween(a: number, b: number): number {
    let diff = Math.abs(a - b) % (Math.PI * 2)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    return diff
}

export interface BuildOptions {
    unitsPerMeter: number
    weldMeters?: number
}

const DEFAULT_WELD_METERS = 1.5

export function roadWeldMeters(mapZoom: number, latitude: number): number {
    const tileZoom = Math.max(0, Math.floor(mapZoom))
    const stepMeters =
        (40075016.686 * Math.cos((latitude * Math.PI) / 180)) /
        2 ** tileZoom /
        4096
    return Math.max(DEFAULT_WELD_METERS, stepMeters * 2)
}
const GRID_CELL_METERS = 80

const cellKey = (cx: number, cy: number): string => `${cx}|${cy}`

export function buildRoadGraph(
    polylines: RoadPolyline[],
    { unitsPerMeter, weldMeters = DEFAULT_WELD_METERS }: BuildOptions
): RoadGraph {
    const weld = weldMeters * unitsPerMeter
    const cellSize = Math.max(weld * 4, GRID_CELL_METERS * unitsPerMeter)

    const nodes: Pt[] = []
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
    const seenEdges = new Set<string>()

    for (const line of polylines) {
        const pts = line.points
        if (pts.length < 2) continue
        let prev = nodeAt(pts[0]!)
        for (let i = 1; i < pts.length; i++) {
            const curr = nodeAt(pts[i]!)
            if (curr === prev) continue
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

    joinDeadEnds(
        { nodes, edgeA, edgeB, edgeLen, edgeClass, seenEdges },
        weld,
        cellSize
    )

    const outEdges: number[][] = Array.from({ length: nodes.length }, () => [])
    const grid = new Map<string, number[]>()
    for (let e = 0; e < edgeA.length; e++) {
        const a = edgeA[e]!
        const b = edgeB[e]!
        outEdges[a]!.push(e * 2)
        outEdges[b]!.push(e * 2 + 1)

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

interface EdgeLists {
    nodes: Pt[]
    edgeA: number[]
    edgeB: number[]
    edgeLen: number[]
    edgeClass: string[]
    seenEdges: Set<string>
}

function joinDeadEnds(
    lists: EdgeLists,
    tolerance: number,
    cellSize: number
): void {
    const { nodes, edgeA, edgeB, edgeLen, edgeClass, seenEdges } = lists
    if (tolerance <= 0 || edgeA.length === 0) return

    const degree = new Array<number>(nodes.length).fill(0)
    for (let e = 0; e < edgeA.length; e++) {
        degree[edgeA[e]!]!++
        degree[edgeB[e]!]!++
    }

    const cell = Math.max(cellSize, tolerance, 1)
    const key = (cx: number, cy: number): number => cx * 1_000_003 + cy
    const index = new Map<number, number[]>()
    const indexEdge = (e: number): void => {
        const a = nodes[edgeA[e]!]!
        const b = nodes[edgeB[e]!]!
        const x0 = Math.floor(Math.min(a.x, b.x) / cell)
        const x1 = Math.floor(Math.max(a.x, b.x) / cell)
        const y0 = Math.floor(Math.min(a.y, b.y) / cell)
        const y1 = Math.floor(Math.max(a.y, b.y) / cell)
        for (let cx = x0; cx <= x1; cx++) {
            for (let cy = y0; cy <= y1; cy++) {
                const k = key(cx, cy)
                const bucket = index.get(k)
                if (bucket) bucket.push(e)
                else index.set(k, [e])
            }
        }
    }
    for (let e = 0; e < edgeA.length; e++) indexEdge(e)

    const addEdge = (a: number, b: number, roadClass: string): void => {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        if (a === b || seenEdges.has(key)) return
        seenEdges.add(key)
        const pa = nodes[a]!
        const pb = nodes[b]!
        edgeA.push(a)
        edgeB.push(b)
        edgeLen.push(Math.hypot(pb.x - pa.x, pb.y - pa.y))
        edgeClass.push(roadClass)
        degree[a]!++
        degree[b]!++
        indexEdge(edgeA.length - 1)
    }

    const seenBy: number[] = []

    const deadEnds: number[] = []
    for (let n = 0; n < nodes.length; n++) if (degree[n] === 1) deadEnds.push(n)

    for (const n of deadEnds) {
        if (degree[n] !== 1) continue
        const p = nodes[n]!
        const cx = Math.floor(p.x / cell)
        const cy = Math.floor(p.y / cell)

        let best = -1
        let bestT = 0
        let bestDist = tolerance
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const e of index.get(key(cx + dx, cy + dy)) ?? []) {
                    if (seenBy[e] === n) continue
                    seenBy[e] = n
                    if (edgeA[e] === n || edgeB[e] === n) continue
                    const a = nodes[edgeA[e]!]!
                    const b = nodes[edgeB[e]!]!
                    const vx = b.x - a.x
                    const vy = b.y - a.y
                    const len2 = vx * vx + vy * vy
                    let t =
                        len2 > 0
                            ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2
                            : 0
                    t = Math.max(0, Math.min(1, t))
                    const d = Math.hypot(
                        p.x - (a.x + t * vx),
                        p.y - (a.y + t * vy)
                    )
                    if (d <= bestDist) {
                        best = e
                        bestT = t
                        bestDist = d
                    }
                }
            }
        }
        if (best === -1) continue

        const roadClass = edgeClass[best]!
        const a = edgeA[best]!
        const b = edgeB[best]!
        const pa = nodes[a]!
        const pb = nodes[b]!
        const q = {
            x: pa.x + bestT * (pb.x - pa.x),
            y: pa.y + bestT * (pb.y - pa.y),
        }
        let target: number
        if (Math.hypot(q.x - pa.x, q.y - pa.y) <= tolerance) target = a
        else if (Math.hypot(q.x - pb.x, q.y - pb.y) <= tolerance) target = b
        else {
            target = nodes.length
            nodes.push(q)
            degree.push(0)
            seenEdges.delete(a < b ? `${a}-${b}` : `${b}-${a}`)
            seenEdges.add(a < target ? `${a}-${target}` : `${target}-${a}`)
            edgeB[best] = target
            edgeLen[best] = Math.hypot(q.x - pa.x, q.y - pa.y)
            degree[b]!--
            degree[target]!++
            indexEdge(best)
            addEdge(target, b, roadClass)
        }
        addEdge(n, target, edgeClass[best]!)
    }
}

export function componentOf(g: RoadGraph, snap: SnapResult): number {
    return g.nodeComponent[g.edgeA[snap.edge]!]!
}

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
    radius: number
    from?: Pt | null
    coneHalfAngle?: number
    directionWeight?: number
    limit?: number
    component?: number | null
    fragmentPenalty?: number
    fragmentFraction?: number
}

const DEFAULT_CONE_HALF_ANGLE = (60 * Math.PI) / 180
const MIN_BEARING_DISTANCE_UNITS = 2
const DEFAULT_FRAGMENT_FRACTION = 0.1

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

export interface RouteOptions {
    turnPenalty: number
    maxCost: number
    maxSettled?: number
}

const DEFAULT_MAX_SETTLED = 60000

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

export function routeAlongRoads(
    g: RoadGraph,
    start: SnapResult,
    end: SnapResult,
    { turnPenalty, maxCost, maxSettled = DEFAULT_MAX_SETTLED }: RouteOptions
): Pt[] | null {
    if (start.edge === end.edge) return dedupe([start.point, end.point])

    const startLen = g.edgeLen[start.edge]!
    const endLen = g.edgeLen[end.edge]!

    const best = new Map<number, number>()
    const prev = new Map<number, number>()
    const heap = new MinHeap()

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
        if (cost > best.get(d)!) continue
        if (cost > maxCost) break
        if (++settled > maxSettled) break

        const node = headOf(g, d)
        const outgoing = g.outEdges[node]!
        const isDeadEnd = outgoing.length === 1
        const dBearing = bearingOf(g, d)

        for (const next of outgoing) {
            if (next === (d ^ 1) && !isDeadEnd) continue

            const turn = angleBetween(dBearing, bearingOf(g, next))
            const turnCost = (turn / Math.PI) * turnPenalty

            if (edgeOf(next) === end.edge) {
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

    const chain: number[] = []
    let cursor = goalDirected
    for (;;) {
        chain.push(cursor)
        if (cursor === seedForward || cursor === seedBack) break
        const back = prev.get(cursor)
        if (back === undefined) return null
        cursor = back
        if (chain.length > g.edgeA.length + 2) return null
    }
    chain.reverse()

    const path: Pt[] = [start.point]
    for (let i = 0; i < chain.length - 1; i++) {
        path.push(g.nodes[headOf(g, chain[i]!)]!)
    }
    path.push(end.point)
    return dedupe(path)
}

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
