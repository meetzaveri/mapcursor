import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    drawPencilStroke,
    placeText,
    placePoint,
    drawArea,
    drawRoute,
    getDraftComponents,
} from './helpers/index.js'

function originOf(record) {
    const geom = record?.metadata?.geometry
    if (!geom) return null
    const first =
        geom.type === 'Polygon'
            ? geom.coordinates[0][0]
            : geom.type === 'LineString'
              ? geom.coordinates[0]
              : geom.coordinates
    return { x: first[0], y: first[1] }
}

async function recordsOfType(page, type) {
    const draft = await getDraftComponents(page)
    return Object.values(draft ?? {})
        .filter((c) => c.componentType === type)
        .map((c) => ({
            id: c.id,
            x: c.x,
            y: c.y,
            origin: originOf(c),
            geometryType: c.metadata?.geometry?.type,
        }))
}

const TOOLS = [
    {
        type: 'point',
        geometry: 'Point',
        draw: (page, box) =>
            placePoint(page, {
                x: box.x + 300,
                y: box.y + 240,
                label: 'The Old Peacock',
            }),
    },
    {
        type: 'text',
        geometry: 'Point',
        draw: (page, box) => placeText(page, { x: box.x + 300, y: box.y + 300 }),
    },
    {
        type: 'circle',
        geometry: 'Point',
        draw: (page, box) =>
            drawShape(page, 'circle', {
                startX: box.x + 260,
                startY: box.y + 200,
                endX: box.x + 400,
                endY: box.y + 340,
            }),
    },
    {
        type: 'pencil',
        geometry: 'LineString',
        draw: (page, box) =>
            drawPencilStroke(page, {
                startX: box.x + 250,
                startY: box.y + 250,
                endX: box.x + 420,
                endY: box.y + 330,
            }),
    },
    {
        type: 'route',
        geometry: 'LineString',
        draw: (page, box) =>
            drawRoute(page, [
                { x: box.x + 220, y: box.y + 180 },
                { x: box.x + 380, y: box.y + 260 },
                { x: box.x + 520, y: box.y + 200 },
            ]),
    },
    {
        type: 'area',
        geometry: 'Polygon',
        draw: (page, box) =>
            drawArea(page, [
                { x: box.x + 240, y: box.y + 200 },
                { x: box.x + 420, y: box.y + 220 },
                { x: box.x + 360, y: box.y + 360 },
            ]),
    },
]

test.describe('a drawn element is persisted where it was put', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    for (const { type, geometry, draw } of TOOLS) {
        test(`${type} persists a geometry its x/y agree with`, async ({
            page,
        }) => {
            const box = await getCanvasBox(page)
            await draw(page, box)

            await expect
                .poll(async () => (await recordsOfType(page, type)).length, {
                    timeout: 15_000,
                })
                .toBeGreaterThan(0)

            const [record] = await recordsOfType(page, type)

            expect(record.geometryType).toBe(geometry)
            expect(
                record.origin,
                'the x/y columns disagree with the geometry at creation'
            ).toEqual({ x: record.x, y: record.y })
        })
    }

    test('a point is still under the cursor after a reload', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        await placePoint(page, {
            x: box.x + 300,
            y: box.y + 240,
            label: 'The Old Peacock',
        })
        await expect
            .poll(async () => (await recordsOfType(page, 'point')).length, {
                timeout: 15_000,
            })
            .toBe(1)
        const [before] = await recordsOfType(page, 'point')

        await page.reload()
        await page.waitForSelector('#main-two-root svg')

        const rendered = await expect
            .poll(
                async () =>
                    page.evaluate((id) => {
                        const g = window.__mcTwo?.scene.children.find(
                            (c) => c?.elementData?.id === id
                        )
                        if (!g) return null
                        return {
                            x: Math.round(g.translation.x),
                            y: Math.round(g.translation.y),
                        }
                    }, before.id),
                { timeout: 15_000 }
            )
            .not.toBeNull()
            .then(() =>
                page.evaluate((id) => {
                    const g = window.__mcTwo.scene.children.find(
                        (c) => c?.elementData?.id === id
                    )
                    return {
                        x: Math.round(g.translation.x),
                        y: Math.round(g.translation.y),
                    }
                }, before.id)
            )

        expect(rendered).toEqual({ x: before.x, y: before.y })
    })
})
