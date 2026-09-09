// The snap-to-road routing math, asserted in Node.
//
// `utils/roadGraph.ts` is pure by design — no maplibre, no DOM, no Two.js — so
// every claim the feature rests on can be checked against a hand-built street
// grid rather than against whatever CARTO happens to be serving. That matters
// twice over: the tiles are a live third-party dependency, and the interesting
// cases (a junction welded from two tiles, a route that must turn) are ones you
// cannot reliably steer a real map into.
//
// Per the repo's E2E rule, these run in NODE — imported at the top of the spec
// and asserted directly, never through `page.evaluate` + `import('/src/...')`,
// which only works against a dev server and 404s on the production bundle the
// suite actually targets.

import { test, expect } from './helpers/test.js'
import {
    buildRoadGraph,
    chooseSnap,
    componentOf,
    routeAlongRoads,
} from '../../src/utils/roadGraph.ts'

// One surface unit per metre keeps every number in these fixtures readable as
// metres. Real bases run ~0.5 units/m at z16; the module only ever uses this to
// convert its metre-denominated tolerances, so the scale is not under test.
const UNITS = { unitsPerMeter: 1 }

const pt = (x, y) => ({ x, y })

/**
 * A plus-shaped junction: one road running north-south through x=0, one running
 * east-west through y=0, sharing the vertex at the origin.
 *
 * This is the fixture for the whole feature. It is the smallest network where
 * "carry on straight" and "turn onto the cross street" are different answers.
 */
const CROSS = [
    {
        roadClass: 'residential',
        points: [pt(0, -200), pt(0, -100), pt(0, 0), pt(0, 100), pt(0, 200)],
    },
    {
        roadClass: 'residential',
        points: [pt(-200, 0), pt(-100, 0), pt(0, 0), pt(100, 0), pt(200, 0)],
    },
]

const route = (graph, from, to, opts = {}) =>
    routeAlongRoads(graph, from, to, {
        turnPenalty: 30,
        maxCost: 5000,
        ...opts,
    })

/** Total length of a returned path, for asserting it took the short way. */
const pathLength = (path) => {
    let total = 0
    for (let i = 1; i < path.length; i++) {
        total += Math.hypot(
            path[i].x - path[i - 1].x,
            path[i].y - path[i - 1].y
        )
    }
    return total
}

test.describe('road graph', () => {
    test('welds coincident vertices into one junction node', () => {
        // The two polylines share (0,0) exactly, as two OSM ways crossing at a
        // node do. Five vertices each, one of them the same position, so nine
        // nodes — the tenth is the weld.
        const g = buildRoadGraph(CROSS, UNITS)
        expect(g.nodes.length).toBe(9)
        // Four segments per road.
        expect(g.edgeA.length).toBe(8)

        // And the shared node is genuinely shared: four ways out of it.
        const origin = g.nodes.findIndex((n) => n.x === 0 && n.y === 0)
        expect(origin).toBeGreaterThanOrEqual(0)
        expect(g.outEdges[origin].length).toBe(4)
    })

    test('welds across the sub-metre disagreement that tiling introduces', () => {
        // The same junction delivered by two tiles: the shared node arrives
        // half a metre apart. Below the 1.5m weld tolerance, so it must still
        // be ONE node — if it is not, no route can ever cross this junction.
        const g = buildRoadGraph(
            [
                { roadClass: 'residential', points: [pt(0, -100), pt(0, 0)] },
                {
                    roadClass: 'residential',
                    points: [pt(0.4, 0.3), pt(100, 0)],
                },
            ],
            UNITS
        )
        expect(g.nodes.length).toBe(3)
        const path = route(
            g,
            chooseSnap(g, pt(0, -80), { radius: 20 }),
            chooseSnap(g, pt(80, 0), { radius: 20 })
        )
        expect(path).not.toBeNull()
    })

    test('does NOT weld roads that merely pass close by', () => {
        // Ten metres apart is a road and its service lane, or a bridge over a
        // street. Welding those invents a junction that does not exist and
        // would let a route teleport between them.
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(-100, 0), pt(100, 0)] },
                { roadClass: 'service', points: [pt(-100, 10), pt(100, 10)] },
            ],
            UNITS
        )
        expect(g.nodes.length).toBe(4)
        expect(
            route(
                g,
                chooseSnap(g, pt(-50, 0), { radius: 5 }),
                chooseSnap(g, pt(50, 10), { radius: 5 })
            )
        ).toBeNull()
    })

    test('drops the duplicate geometry two tiles deliver for one road', () => {
        // Adjacent tiles both carry the stretch in their buffer. Same node
        // pair, so the second copy must not become a second edge.
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(0, 0), pt(100, 0)] },
                { roadClass: 'primary', points: [pt(0, 0), pt(100, 0)] },
            ],
            UNITS
        )
        expect(g.edgeA.length).toBe(1)
    })
})

test.describe('snapping', () => {
    test('finds the road under the cursor and returns a point on it', () => {
        const g = buildRoadGraph(CROSS, UNITS)
        // 8m east of the north-south road, level with y=-50.
        const snap = chooseSnap(g, pt(8, -50), { radius: 45 })
        expect(snap).not.toBeNull()
        expect(snap.point.x).toBeCloseTo(0, 6)
        expect(snap.point.y).toBeCloseTo(-50, 6)
        expect(snap.distance).toBeCloseTo(8, 6)
    })

    test('returns null over a building — nothing in reach', () => {
        const g = buildRoadGraph(CROSS, UNITS)
        // Mid-block, 90m from either road, with a 45m reach.
        expect(chooseSnap(g, pt(90, -90), { radius: 45 })).toBeNull()
    })

    test('rejects the nearer road when it is behind the direction of travel', () => {
        // What the 60° cone is actually for. Two parallel streets straddling
        // the cursor: one 25m away but BEHIND the hand's direction, one 30m
        // away and ahead of it. Distance alone picks the wrong one, and the
        // route would double back on itself to reach it.
        const g = buildRoadGraph(
            [
                {
                    roadClass: 'residential',
                    points: [pt(-15, -100), pt(-15, 100)],
                },
                {
                    roadClass: 'residential',
                    points: [pt(40, -100), pt(40, 100)],
                },
            ],
            UNITS
        )

        // With no anchor, distance is all there is, and the near one wins.
        expect(chooseSnap(g, pt(10, 0), { radius: 45 }).point.x).toBeCloseTo(
            -15,
            6
        )

        // Anchored at the origin, the cursor at (10, 0) says "east". The road
        // behind now pays the full cone penalty and loses despite being closer.
        const ahead = chooseSnap(g, pt(10, 0), { radius: 45, from: pt(0, 0) })
        expect(ahead.point.x).toBeCloseTo(40, 6)
    })

    test('ignores the bearing when the cursor has barely left the anchor', () => {
        // A one-pixel twitch has a bearing, but it is noise, and letting it
        // steer the snap makes the first segment of every route jitter between
        // streets. Below the floor, nearest wins.
        const g = buildRoadGraph(
            [
                {
                    roadClass: 'residential',
                    points: [pt(-15, -100), pt(-15, 100)],
                },
                {
                    roadClass: 'residential',
                    points: [pt(40, -100), pt(40, 100)],
                },
            ],
            UNITS
        )
        const snap = chooseSnap(g, pt(1, 0), { radius: 45, from: pt(0, 0) })
        expect(snap.point.x).toBeCloseTo(-15, 6)
    })
})

test.describe('connectivity', () => {
    // A screenful of tiles is not one network. These two rules are what keep a
    // route from starting somewhere it can never leave — the failure that made
    // the feature look broken on a real map before either existed.

    /**
     * The measured case, reduced: a footpath island near the click, and the
     * street network further away.
     *
     * Real numbers from central Ahmedabad at z16 — a park path 84 units off on
     * a component of 41 nodes, a secondary road 133 units off on a component of
     * 8,384. Distance alone takes the path, and then no route can leave it.
     *
     * The street network here is a real 5x5 grid rather than a couple of lines,
     * because the fragment rule is a FRACTION of the largest component: a
     * "network" of five nodes makes a two-node island 40% of it, and nothing
     * can tell them apart. That is a property of the fixture, not of the rule,
     * and getting it wrong the first time is what this comment is for.
     */
    const GRID_XS = [-900, -700, -500, -300, -133]
    const GRID_YS = [-400, -200, 0, 200, 400]
    const ISLAND_AND_STREET = [
        // The island: a short path, connected to nothing.
        { roadClass: 'path', points: [pt(84, -40), pt(84, 40)] },
        // The street network. Every crossing is a SHARED VERTEX, which is how
        // OSM models a junction and how it survives into the tiles — see the
        // mid-segment test below for what happens when it is not.
        ...GRID_XS.map((x) => ({
            roadClass: 'secondary',
            points: GRID_YS.map((y) => pt(x, y)),
        })),
        ...GRID_YS.map((y) => ({
            roadClass: 'residential',
            points: GRID_XS.map((x) => pt(x, y)),
        })),
    ]

    test('labels connected components and finds the largest', () => {
        const g = buildRoadGraph(ISLAND_AND_STREET, UNITS)
        expect(g.componentSizes.length).toBe(2)
        // 5x5 grid of shared crossings, plus the two-node island.
        expect(g.componentSizes[g.largestComponent]).toBe(25)
        const island = g.componentSizes[g.largestComponent === 0 ? 1 : 0]
        expect(island).toBe(2)
    })

    test('prefers the street network over a nearer disconnected island', () => {
        const g = buildRoadGraph(ISLAND_AND_STREET, UNITS)

        // Without the penalty, the island wins on distance — the bug.
        expect(chooseSnap(g, pt(0, 0), { radius: 200 }).roadClass).toBe('path')

        // With it, the further-but-connected street wins.
        const snap = chooseSnap(g, pt(0, 0), {
            radius: 200,
            fragmentPenalty: 100,
        })
        expect(snap.roadClass).toBe('secondary')
    })

    test('still takes the island when the user clicks squarely on it', () => {
        // The penalty is a preference, not a filter. Someone tracing a park
        // path means the park path.
        const g = buildRoadGraph(ISLAND_AND_STREET, UNITS)
        const snap = chooseSnap(g, pt(82, 0), {
            radius: 200,
            fragmentPenalty: 100,
        })
        expect(snap.roadClass).toBe('path')
    })

    test('restricting to a component keeps the destination reachable', () => {
        const g = buildRoadGraph(ISLAND_AND_STREET, UNITS)
        const onStreet = chooseSnap(g, pt(-133, 100), { radius: 50 })
        const street = componentOf(g, onStreet)

        // Unrestricted, a cursor over the island snaps to the island — and no
        // route from the street can reach it.
        const free = chooseSnap(g, pt(84, 0), { radius: 200 })
        expect(componentOf(g, free)).not.toBe(street)
        expect(route(g, onStreet, free)).toBeNull()

        // Restricted, it snaps back onto the street network instead, and the
        // route exists.
        const bound = chooseSnap(g, pt(84, 0), {
            radius: 400,
            component: street,
        })
        expect(componentOf(g, bound)).toBe(street)
        expect(route(g, onStreet, bound)).not.toBeNull()
    })

    test('a side road meeting mid-segment does NOT connect — known limit', () => {
        // Junctions are reconstructed by welding coincident VERTICES, not by
        // intersecting segments. OSM shares a node at every crossing and the
        // tiles preserve it, so this is rare in practice — but where a tileset
        // simplifies one away, the two roads stay separate components and a
        // route will decline to cross rather than cut the corner. Declining is
        // the safe failure (the caller draws straight); silently connecting
        // roads that do not meet would put a route through a flyover.
        const g = buildRoadGraph(
            [
                // Through road: no vertex at y = 0.
                { roadClass: 'primary', points: [pt(0, -100), pt(0, 100)] },
                // Side road ending ON it, but not AT one of its vertices.
                { roadClass: 'residential', points: [pt(0, 0), pt(200, 0)] },
            ],
            UNITS
        )
        expect(g.componentSizes.length).toBe(2)
    })

    test('returns null when nothing in the required component is in reach', () => {
        const g = buildRoadGraph(ISLAND_AND_STREET, UNITS)
        const onStreet = chooseSnap(g, pt(-133, 100), { radius: 50 })
        expect(
            chooseSnap(g, pt(84, 0), {
                radius: 60,
                component: componentOf(g, onStreet),
            })
        ).toBeNull()
    })
})

test.describe('routing', () => {
    test('runs straight down one street without wandering', () => {
        const g = buildRoadGraph(CROSS, UNITS)
        const path = route(
            g,
            chooseSnap(g, pt(0, -150), { radius: 20 }),
            chooseSnap(g, pt(0, 150), { radius: 20 })
        )
        expect(path).not.toBeNull()
        // Every point on the north-south road, and no backtracking.
        for (const p of path) expect(p.x).toBeCloseTo(0, 6)
        expect(pathLength(path)).toBeCloseTo(300, 6)
    })

    test('diverts onto the cross street at the junction', () => {
        // This is the behaviour the 60°/90° angle rule was describing, arrived
        // at without an angle rule: the user was heading north up x=0 and has
        // swung the cursor east, so the route must carry on to the junction and
        // only then turn — never cut the corner across the block.
        const g = buildRoadGraph(CROSS, UNITS)
        const path = route(
            g,
            chooseSnap(g, pt(0, -150), { radius: 20 }),
            chooseSnap(g, pt(150, 0), { radius: 20, from: pt(0, -150) })
        )
        expect(path).not.toBeNull()

        // It passes through the junction itself...
        expect(
            path.some((p) => Math.abs(p.x) < 1e-6 && Math.abs(p.y) < 1e-6)
        ).toBe(true)
        // ...and the leg lengths are the twolegs, not the 212m diagonal.
        expect(pathLength(path)).toBeCloseTo(300, 6)
        // Nothing is off-network: before the junction x is 0, after it y is 0.
        for (const p of path) {
            expect(Math.abs(p.x) < 1e-6 || Math.abs(p.y) < 1e-6).toBe(true)
        }
    })

    test('starts and ends mid-segment rather than at the nearest node', () => {
        // A route that begins halfway down a block must begin THERE, not jump
        // back to the last road vertex.
        const g = buildRoadGraph(CROSS, UNITS)
        const path = route(
            g,
            chooseSnap(g, pt(3, -130), { radius: 20 }),
            chooseSnap(g, pt(-3, 170), { radius: 20 })
        )
        expect(path[0].y).toBeCloseTo(-130, 6)
        expect(path[path.length - 1].y).toBeCloseTo(170, 6)
        expect(pathLength(path)).toBeCloseTo(300, 6)
    })

    test('a turn penalty prefers straight on when two ways are equal length', () => {
        // A unit square of streets: from the bottom-left corner to the
        // top-right, going round either way is exactly the same distance. The
        // turn penalty is the only thing that can decide, and both answers
        // contain exactly one turn — so what is asserted is that a route is
        // found and takes the short way, not which corner it rounds.
        const g = buildRoadGraph(
            [
                { roadClass: 'residential', points: [pt(0, 0), pt(100, 0)] },
                {
                    roadClass: 'residential',
                    points: [pt(100, 0), pt(100, 100)],
                },
                { roadClass: 'residential', points: [pt(0, 0), pt(0, 100)] },
                {
                    roadClass: 'residential',
                    points: [pt(0, 100), pt(100, 100)],
                },
            ],
            UNITS
        )
        const path = route(
            g,
            chooseSnap(g, pt(0, 0), { radius: 10 }),
            chooseSnap(g, pt(100, 100), { radius: 10 })
        )
        expect(path).not.toBeNull()
        expect(pathLength(path)).toBeCloseTo(200, 6)
        expect(path.length).toBe(3) // corner, not a lap of the square
    })

    test('gives up rather than walking the city when the ends are unreachable', () => {
        // Two parallel roads with no junction: the caller must get null and
        // fall back to a straight segment, not a search that never terminates.
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(-500, 0), pt(500, 0)] },
                { roadClass: 'primary', points: [pt(-500, 300), pt(500, 300)] },
            ],
            UNITS
        )
        expect(
            route(
                g,
                chooseSnap(g, pt(0, 0), { radius: 20 }),
                chooseSnap(g, pt(0, 300), { radius: 20 })
            )
        ).toBeNull()
    })

    test('refuses a detour far longer than the crow-flies distance', () => {
        // maxCost is what stops the route taking a two-kilometre ring road to
        // reach a point fifty metres away across a dual carriageway.
        const g = buildRoadGraph(CROSS, UNITS)
        const from = chooseSnap(g, pt(0, -150), { radius: 20 })
        const to = chooseSnap(g, pt(150, 0), { radius: 20 })
        expect(route(g, from, to, { maxCost: 100 })).toBeNull()
        expect(route(g, from, to, { maxCost: 5000 })).not.toBeNull()
    })

    test('a same-segment hop is the straight line along that segment', () => {
        const g = buildRoadGraph(CROSS, UNITS)
        const path = route(
            g,
            chooseSnap(g, pt(0, -180), { radius: 20 }),
            chooseSnap(g, pt(0, -120), { radius: 20 })
        )
        expect(path.length).toBe(2)
        expect(pathLength(path)).toBeCloseTo(60, 6)
    })
})
