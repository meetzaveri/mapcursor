import { test, expect } from './helpers/test.js'
import {
    assertComponentColumns,
    baseRow,
    GQL_MOCK_RESPONSES,
    readCamera,
    pointAt,
} from './helpers/index.js'
import { scaleForMapZoom, lngLatToSurface } from '../../src/baseTypes/mercator'

const BASE_ID = '11111111-1111-1111-1111-111111111111'

const ANCHOR = { lngLat: [-1.5722, 53.7778], zoom: 16 }
const LANDING = { lngLat: [-1.582, 53.7801], zoom: 17 }

const GQL_BASE_MOCKS = GQL_MOCK_RESPONSES

const point = (id, x, y) => ({
    id,
    componentType: 'point',
    children: null,
    ...pointAt(x, y, { content: 'The Old Peacock' }),
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    fill: '#e5484d',
    width: 10,
    height: 10,
    stroke: '#e5484d',
    linewidth: 2,
    strokeType: null,
    textColor: '#3A342C',
    opacity: 1,
    position: 1,
})

async function mockBase(page, { base, components = [] } = {}) {
    const requests = []
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        let errors = null
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            requests.push(body)
            try {
                assertComponentColumns([body])
            } catch (err) {
                errors = [{ message: err.message }]
            }
            if (!errors) {
                data =
                    body.operationName === 'getComponentsForBase'
                        ? { base, components }
                        : (GQL_BASE_MOCKS[body.operationName] ?? {})
            }
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(errors ? { errors } : { data }),
        })
    })
    await page.addInitScript(() => {
        localStorage.setItem('userId', 'test-user-id')
        localStorage.setItem('mapcursor_welcome_dismissed', '1')
    })
    return requests
}

async function expectedCamera(page, anchor, landing) {
    const scale = scaleForMapZoom(landing.zoom, anchor)
    const { x, y } = lngLatToSurface(landing.lngLat, anchor)
    const { vw, vh } = await page.evaluate(() => {
        const two = window.__mcTwo
        return {
            vw: two.width || window.innerWidth,
            vh: two.height || window.innerHeight,
        }
    })
    return { scale, tx: vw / 2 - x * scale, ty: vh / 2 - y * scale }
}

test.describe('a shared map lands the recipient on the shared spot', () => {
    test('first open uses the base row, not the origin', async ({ page }) => {
        await mockBase(page, {
            base: baseRow({ id: BASE_ID, anchor: ANCHOR, landing: LANDING }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1200)

        const expected = await expectedCamera(page, ANCHOR, LANDING)
        const actual = await page.evaluate(readCamera)

        expect(Math.abs(actual.scale - expected.scale)).toBeLessThan(1e-6)
        expect(Math.abs(actual.tx - expected.tx)).toBeLessThan(1)
        expect(Math.abs(actual.ty - expected.ty)).toBeLessThan(1)
        expect(actual.scale).not.toBe(1)
    })

    test('a second visit keeps the recipient’s own camera', async ({
        page,
    }) => {
        await mockBase(page, {
            base: baseRow({ id: BASE_ID, anchor: ANCHOR, landing: LANDING }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1000)

        await page.evaluate(() => {
            window.__mcTwo.scene.translation.x -= 400
            window.__mcTwo.update()
        })
        const moved = await page.evaluate(() => {
            const vp = {
                scale: window.__mcTwo.scene.scale,
                tx: window.__mcTwo.scene.translation.x,
                ty: window.__mcTwo.scene.translation.y,
                savedAt: Date.now(),
            }
            localStorage.setItem(
                `mapcursor_viewport_${'11111111-1111-1111-1111-111111111111'}`,
                JSON.stringify(vp)
            )
            return vp
        })

        await page.reload()
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1000)

        const after = await page.evaluate(readCamera)
        expect(Math.abs(after.tx - moved.tx)).toBeLessThan(1)
        expect(Math.abs(after.ty - moved.ty)).toBeLessThan(1)
    })

    test('the landing seeds only this device’s viewport key', async ({
        page,
    }) => {
        await mockBase(page, {
            base: baseRow({ id: BASE_ID, anchor: ANCHOR, landing: LANDING }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1000)

        const keys = await page.evaluate(() =>
            Object.keys(localStorage).filter((k) => k.includes('viewport'))
        )
        expect(keys).toContain(`mapcursor_viewport_${BASE_ID}`)
        expect(
            keys.some((k) => k.startsWith('mapcursor_mobile_viewport_'))
        ).toBe(false)
    })

    test('a row missing its geography falls back, it does not half-apply', async ({
        page,
    }) => {
        await mockBase(page, {
            base: baseRow({
                id: BASE_ID,
                type: 'map',
                anchor: ANCHOR,
                landing: null,
            }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1000)

        const camera = await page.evaluate(readCamera)
        expect(camera.scale).toBe(1)
        expect(camera.tx).toBe(0)
        expect(camera.ty).toBe(0)
    })
})

test.describe('the base route', () => {
    test('renders a working canvas with the map backdrop', async ({ page }) => {
        await mockBase(page, {
            base: baseRow({ id: BASE_ID, anchor: ANCHOR, landing: LANDING }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(800)

        await expect(page.locator('#mc-shapes-toolbar')).toHaveCount(1)
        await expect(page.locator('#mc-map-bg')).toHaveCount(1)
    })

    test('share and place search do not overlap on a map base', async ({
        page,
    }) => {
        await mockBase(page, {
            base: baseRow({ id: BASE_ID, anchor: ANCHOR, landing: LANDING }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1000)

        const share = await page.locator('#mc-share-button').boundingBox()
        const search = await page
            .locator('input[type="text"]')
            .first()
            .boundingBox()
        expect(share).not.toBeNull()
        expect(search).not.toBeNull()
        const disjoint =
            search.x + search.width <= share.x + 1 ||
            share.x + share.width <= search.x + 1
        expect(disjoint).toBe(true)
        expect(share.x + share.width).toBeLessThanOrEqual(
            page.viewportSize().width + 1
        )
    })
})

test.describe('sharing a map stamps its geography on the base row', () => {
    test.setTimeout(90_000)

    test('createBase carries the anchor and the landing view', async ({
        page,
        context,
    }) => {
        const requests = await mockBase(page, { base: null })
        await page.goto('/')
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForSelector('#mc-map-bg', { timeout: 20_000 })

        await page.waitForFunction(
            () =>
                Array.from(
                    document.querySelectorAll('.modal-portal button')
                ).some((b) => (b.textContent || '').includes('Skip, use')),
            undefined,
            { timeout: 20_000 }
        )
        await page.getByRole('button', { name: /Skip, use/ }).click()
        await page
            .getByRole('button', { name: /Skip, use/ })
            .waitFor({ state: 'detached', timeout: 10_000 })
        await page.waitForTimeout(800)

        await page.click('[aria-label="Radius Map"]')
        await page.mouse.move(400, 300)
        await page.mouse.down()
        await page.mouse.move(560, 420, { steps: 8 })
        await page.mouse.up()
        await page.waitForTimeout(400)

        context.on('page', (p) => void p.close().catch(() => {}))
        await page.click('#mc-share-button')
        await page.click('button:has-text("Yes, share")')
        await page.waitForTimeout(1500)

        const createBase = requests
            .filter((r) => r.operationName === 'createBase')
            .at(-1)
        expect(createBase).toBeTruthy()
        const object = createBase.variables.object

        expect(Number.isFinite(object.mapAnchorLng)).toBe(true)
        expect(Number.isFinite(object.mapAnchorLat)).toBe(true)
        expect(Number.isFinite(object.mapAnchorZoom)).toBe(true)

        expect(Number.isFinite(object.landingLng)).toBe(true)
        expect(Number.isFinite(object.landingLat)).toBe(true)
        expect(Number.isFinite(object.landingZoom)).toBe(true)

        const bulk = requests.find(
            (r) => r.operationName === 'insertBulkComponents'
        )
        expect(bulk).toBeTruthy()
        expect(bulk.variables.objects.length).toBeGreaterThan(0)
        expect(assertComponentColumns(requests)).toBeGreaterThan(0)

        expect(
            requests.some((r) => r.operationName === 'updateBaseVisibility')
        ).toBe(true)

        await expect(page.locator('text=/\\/map\\//')).toHaveCount(1)
    })
})

test.describe('re-sharing an already-persisted base', () => {
    test('publishes it and refreshes the landing view', async ({
        page,
        context,
    }) => {
        const requests = await mockBase(page, {
            base: baseRow({
                id: BASE_ID,
                isPublic: false,
                anchor: ANCHOR,
                landing: LANDING,
            }),
            components: [
                point('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 40, -30),
            ],
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForTimeout(1200)

        context.on('page', (p) => void p.close().catch(() => {}))
        await page.click('#mc-share-button')
        await page.click('button:has-text("Yes, share")')
        await page.waitForTimeout(1200)

        const shared = requests.find(
            (r) => r.operationName === 'sharePersistedBase'
        )
        expect(shared).toBeTruthy()
        expect(shared.variables.id).toBe(BASE_ID)
        expect(Number.isFinite(shared.variables.landingLng)).toBe(true)
        expect(Number.isFinite(shared.variables.landingZoom)).toBe(true)
        expect(requests.some((r) => r.operationName === 'createBase')).toBe(
            false
        )
    })

    test('the recipient is not asked where they are mapping', async ({
        page,
    }) => {
        await mockBase(page, {
            base: baseRow({ id: BASE_ID, anchor: ANCHOR, landing: LANDING }),
        })
        await page.goto(`/map/${BASE_ID}`)
        await page.waitForSelector('#mc-map-bg', { timeout: 20_000 })
        await page.waitForTimeout(2500)

        await expect(
            page.getByRole('button', { name: /Skip, use/ })
        ).toHaveCount(0)
    })
})
