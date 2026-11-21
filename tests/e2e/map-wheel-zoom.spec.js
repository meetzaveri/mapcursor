import { test, expect } from './helpers/test.js'
import {
    baseRow,
    GQL_MOCK_RESPONSES,
    setupLocalBase,
    getCanvasBox,
    readCamera,
    pointAt,
} from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'

const ANCHOR = { lngLat: [-1.5722, 53.7778], zoom: 16 }
const LANDING = { lngLat: [-1.5722, 53.7778], zoom: 16 }

const POINT_ID = '22222222-2222-2222-2222-222222222222'

const point = () => ({
    id: POINT_ID,
    componentType: 'point',
    children: null,
    ...pointAt(0, 0, { content: 'The Old Peacock' }),
    x1: 0, x2: 0, y1: 0, y2: 0,
    fill: '#e5484d', width: 10, height: 10,
    iconStroke: null, stroke: '#e5484d', linewidth: 2, strokeType: null,
    textColor: '#3A342C', opacity: 1, position: 1,
    tailShapeId: null, tailEdge: null, headShapeId: null, headEdge: null,
    tailPortIndex: null, headPortIndex: null,
})

async function openMapBase(page, { components = [] } = {}) {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data =
                body.operationName === 'getComponentsForBase'
                    ? {
                          base: baseRow({
                              id: BASE_ID,
                                                            anchor: ANCHOR,
                              landing: LANDING,
                          }),
                          components,
                      }
                    : (GQL_MOCK_RESPONSES[body.operationName] ?? {})
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(() => {
        localStorage.setItem('userId', 'test-user-id')
        localStorage.setItem('mapcursor_welcome_dismissed', '1')
    })
    await page.goto(`/map/${BASE_ID}`)
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
    await page.waitForTimeout(1200)
}

test.describe('the wheel zooms', () => {
    test('a plain wheel changes scale, not translation alone', async ({
        page,
    }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        const before = await page.evaluate(readCamera)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, -300)
        await page.waitForTimeout(300)
        const after = await page.evaluate(readCamera)

        expect(after.scale).toBeGreaterThan(before.scale)

        await page.mouse.wheel(0, 600)
        await page.waitForTimeout(300)
        const out = await page.evaluate(readCamera)
        expect(out.scale).toBeLessThan(after.scale)
    })

    test('the zoom is anchored on the cursor, not the viewport centre', async ({
        page,
    }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        const cx = box.x + box.width * 0.75
        const cy = box.y + box.height * 0.3
        const surfaceUnderCursor = () =>
            page.evaluate(
                ([x, y]) => {
                    const two = window.__mcTwo
                    return {
                        x: (x - two.scene.translation.x) / two.scene.scale,
                        y: (y - two.scene.translation.y) / two.scene.scale,
                    }
                },
                [cx, cy]
            )

        await page.mouse.move(cx, cy)
        const before = await surfaceUnderCursor()
        await page.mouse.wheel(0, -300)
        await page.waitForTimeout(300)
        const after = await surfaceUnderCursor()

        expect(Math.abs(after.x - before.x)).toBeLessThan(1)
        expect(Math.abs(after.y - before.y)).toBeLessThan(1)
    })
})

test.describe('a drag over empty canvas pans', () => {
    test('plain drag translates the camera and creates no group', async ({
        page,
    }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        const before = await page.evaluate(readCamera)
        const startX = box.x + box.width * 0.6
        const startY = box.y + box.height * 0.6

        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(startX - 120, startY - 80, { steps: 12 })
        await page.mouse.up()
        await page.waitForTimeout(300)

        const after = await page.evaluate(readCamera)
        expect(after.scale).toBeCloseTo(before.scale, 6)
        expect(after.tx - before.tx).toBeLessThan(-80)
        expect(after.ty - before.ty).toBeLessThan(-50)

        const groups = await page.$$('[data-label="groupobject_coord"]')
        expect(groups).toHaveLength(0)
    })

    test('shift+drag still marquees instead of panning', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        const before = await page.evaluate(readCamera)
        const startX = box.x + box.width * 0.6
        const startY = box.y + box.height * 0.6

        await page.keyboard.down('Shift')
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(startX - 120, startY - 80, { steps: 12 })
        await page.mouse.up()
        await page.keyboard.up('Shift')
        await page.waitForTimeout(300)

        const after = await page.evaluate(readCamera)
        expect(after.tx).toBeCloseTo(before.tx, 1)
        expect(after.ty).toBeCloseTo(before.ty, 1)
    })

    test('a drag that starts on a point moves the point, not the camera', async ({
        page,
    }) => {
        await openMapBase(page, { components: [point()] })

        const pointPos = () =>
            page.evaluate(() => {
                const two = window.__mcTwo
                if (!two) throw new Error('__mcTwo is missing')
                const g = Array.from(two.scene.children).find(
                    (c) => c?.elementData?.componentType === 'point'
                )
                return g ? { x: g.translation.x, y: g.translation.y } : null
            })

        const startPos = await pointPos()
        expect(startPos).not.toBeNull()

        const camBefore = await page.evaluate(readCamera)

        const pin = await page
            .locator(`[data-component-id="${POINT_ID}"]`)
            .boundingBox()
        expect(pin).not.toBeNull()
        const clientX = pin.x + pin.width / 2
        const clientY = pin.y + pin.height / 2

        await page.mouse.move(clientX, clientY)
        await page.mouse.down()
        await page.mouse.move(clientX + 90, clientY + 60, { steps: 12 })
        await page.mouse.up()
        await page.waitForTimeout(400)

        const camAfter = await page.evaluate(readCamera)
        const endPos = await pointPos()

        expect(camAfter.tx).toBeCloseTo(camBefore.tx, 0)
        expect(camAfter.ty).toBeCloseTo(camBefore.ty, 0)
        expect(Math.abs(endPos.x - startPos.x)).toBeGreaterThan(20)
    })
})
