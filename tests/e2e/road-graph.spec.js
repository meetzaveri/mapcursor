import { test, expect } from './helpers/test.js'
import {
    buildRoadGraph,
    chooseSnap,
    componentOf,
    roadWeldMeters,
    routeAlongRoads,
} from '../../src/utils/roadGraph.ts'

const UNITS = { unitsPerMeter: 1 }

const pt = (x, y) => ({ x, y })

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
        const g = buildRoadGraph(CROSS, UNITS)
        expect(g.nodes.length).toBe(9)
        expect(g.edgeA.length).toBe(8)

        const origin = g.nodes.findIndex((n) => n.x === 0 && n.y === 0)
        expect(origin).toBeGreaterThanOrEqual(0)
        expect(g.outEdges[origin].length).toBe(4)
    })

    test('welds across the sub-metre disagreement that tiling introduces', () => {
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
        const snap = chooseSnap(g, pt(8, -50), { radius: 45 })
        expect(snap).not.toBeNull()
        expect(snap.point.x).toBeCloseTo(0, 6)
        expect(snap.point.y).toBeCloseTo(-50, 6)
        expect(snap.distance).toBeCloseTo(8, 6)
    })

    test('returns null over a building — nothing in reach', () => {
        const g = buildRoadGraph(CROSS, UNITS)
        expect(chooseSnap(g, pt(90, -90), { radius: 45 })).toBeNull()
    })

    test('rejects the nearer road when it is behind the direction of travel', () => {
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

        expect(chooseSnap(g, pt(10, 0), { radius: 45 }).point.x).toBeCloseTo(
            -15,
            6
        )

        const ahead = chooseSnap(g, pt(10, 0), { radius: 45, from: pt(0, 0) })
        expect(ahead.point.x).toBeCloseTo(40, 6)
    })

    test('ignores the bearing when the cursor has barely left the anchor', () => {
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
    const GRID_XS = [-900, -700, -500, -300, -133]
    const GRID_YS = [-400, -200, 0, 200, 400]
    const ISLAND_AND_STREET = [
        { roadClass: 'path', points: [pt(84, -40), pt(84, 40)] },
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
        expect(g.componentSizes[g.largestComponent]).toBe(25)
        const island = g.componentSizes[g.largestComponent === 0 ? 1 : 0]
        expect(island).toBe(2)
    })

    test('prefers the street network over a nearer disconnected island', () => {
        const g = buildRoadGraph(ISLAND_AND_STREET, UNITS)

        expect(chooseSnap(g, pt(0, 0), { radius: 200 }).roadClass).toBe('path')

        const snap = chooseSnap(g, pt(0, 0), {
            radius: 200,
            fragmentPenalty: 100,
        })
        expect(snap.roadClass).toBe('secondary')
    })

    test('still takes the island when the user clicks squarely on it', () => {
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

        const free = chooseSnap(g, pt(84, 0), { radius: 200 })
        expect(componentOf(g, free)).not.toBe(street)
        expect(route(g, onStreet, free)).toBeNull()

        const bound = chooseSnap(g, pt(84, 0), {
            radius: 400,
            component: street,
        })
        expect(componentOf(g, bound)).toBe(street)
        expect(route(g, onStreet, bound)).not.toBeNull()
    })

    test('a side road ending mid-segment is joined onto the through road', () => {
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(0, -100), pt(0, 100)] },
                { roadClass: 'residential', points: [pt(0, 0), pt(200, 0)] },
            ],
            UNITS
        )
        expect(g.componentSizes.length).toBe(1)
        const path = route(
            g,
            chooseSnap(g, pt(0, -80), { radius: 5 }),
            chooseSnap(g, pt(150, 0), { radius: 5 })
        )
        expect(path).not.toBeNull()
        expect(pathLength(path)).toBeCloseTo(80 + 150, 6)
    })

    test('joins a dead end that stops just short of the other road', () => {
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(0, -100), pt(0, 100)] },
                { roadClass: 'residential', points: [pt(1, 0), pt(200, 0)] },
            ],
            UNITS
        )
        expect(g.componentSizes.length).toBe(1)
    })

    test('does NOT join a dead end that stops well short of a road', () => {
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(0, -100), pt(0, 100)] },
                { roadClass: 'residential', points: [pt(10, 0), pt(200, 0)] },
            ],
            UNITS
        )
        expect(g.componentSizes.length).toBe(2)
    })

    test('does NOT join a road that passes over another mid-segment', () => {
        const g = buildRoadGraph(
            [
                { roadClass: 'primary', points: [pt(0, -100), pt(0, 100)] },
                { roadClass: 'trunk', points: [pt(-100, 0), pt(100, 0)] },
            ],
            UNITS
        )
        expect(g.componentSizes.length).toBe(2)
    })

    test('the weld widens with the tile grid as the map zooms out', () => {
        const LAT = 23.2
        expect(roadWeldMeters(16, LAT)).toBe(1.5)
        expect(roadWeldMeters(11.8, LAT)).toBeCloseTo(8.8, 1)
        expect(roadWeldMeters(8, LAT)).toBeCloseTo(70.3, 1)
        expect(roadWeldMeters(9, LAT) / roadWeldMeters(10, LAT)).toBeCloseTo(
            2,
            6
        )
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
        for (const p of path) expect(p.x).toBeCloseTo(0, 6)
        expect(pathLength(path)).toBeCloseTo(300, 6)
    })

    test('diverts onto the cross street at the junction', () => {
        const g = buildRoadGraph(CROSS, UNITS)
        const path = route(
            g,
            chooseSnap(g, pt(0, -150), { radius: 20 }),
            chooseSnap(g, pt(150, 0), { radius: 20, from: pt(0, -150) })
        )
        expect(path).not.toBeNull()

        expect(
            path.some((p) => Math.abs(p.x) < 1e-6 && Math.abs(p.y) < 1e-6)
        ).toBe(true)
        expect(pathLength(path)).toBeCloseTo(300, 6)
        for (const p of path) {
            expect(Math.abs(p.x) < 1e-6 || Math.abs(p.y) < 1e-6).toBe(true)
        }
    })

    test('starts and ends mid-segment rather than at the nearest node', () => {
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
        expect(path.length).toBe(3)
    })

    test('gives up rather than walking the city when the ends are unreachable', () => {
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
