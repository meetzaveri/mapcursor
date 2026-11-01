// Shareable map bases.
//
// A base's ink is meaningless without its georeference: surface (0,0) IS the
// base's anchor lng/lat, and elements store surface pixels. Before these tests'
// feature, that anchor lived only in the author's localStorage, so a recipient
// fell back to a guess made from THEIR timezone and every pin landed in the
// wrong city.
//
// So there are two separate things to prove: the geography is carried on the
// base row, and the recipient's camera opens on the shared view — once.

import { test, expect } from './helpers/test.js'
import {
    assertComponentColumns,
    baseRow,
    GQL_MOCK_RESPONSES,
    readCamera,
    pointAt,
} from './helpers/index.js'
// The landing camera is derived from pure projection math, so it is computed in
// Node. It used to run in-page via `await import('/src/…​.ts')`, which only the
// Vite dev server can serve — against the deploy preview's bundle that 404s.
import { scaleForMapZoom, lngLatToSurface } from '../../src/baseTypes/mercator'

const BASE_ID = '11111111-1111-1111-1111-111111111111'

// Elland Road, Leeds — the worked example from the feature request.
const ANCHOR = { lngLat: [-1.5722, 53.7778], zoom: 16 }
const LANDING = { lngLat: [-1.582, 53.7801], zoom: 17 }

// The shared table already answers the component-type catalog and the whole
// share path (createBase / insertBulkComponents / updateBaseVisibility); this
// spec only overrides the base row per test.
const GQL_BASE_MOCKS = GQL_MOCK_RESPONSES

/** A pin on the map — geo objects are what a shared map is actually made of. */
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

/**
 * Serve a persisted base whose row describes a shared map, and record every
 * GraphQL request so the write path can be asserted on.
 */
async function mockBase(page, { base, components = [] } = {}) {
    const requests = []
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        let errors = null
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            requests.push(body)
            // Answer like Hasura does, INCLUDING its refusals. A mock that
            // fulfills every payload is what let a dead `radius` field reach
            // production green: the suite proved the share flow ran, never that
            // the server would accept what it sent. Rejecting here means any
            // test that shares fails at the moment of the bad write.
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

/**
 * What the app itself thinks the landing camera should be — same math, run here.
 *
 * The projection is pure, so it happens in Node; only the viewport dimensions
 * have to come from the page, because tx/ty are pixel translations against the
 * live canvas size.
 */
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

        // Sub-pixel: this is the same arithmetic, so any drift is a real
        // difference in how the camera was applied, not rounding.
        expect(Math.abs(actual.scale - expected.scale)).toBeLessThan(1e-6)
        expect(Math.abs(actual.tx - expected.tx)).toBeLessThan(1)
        expect(Math.abs(actual.ty - expected.ty)).toBeLessThan(1)
        // And emphatically not the identity camera it would sit at otherwise.
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

        // Move the camera and let the debounced save-as-you-go writer run.
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
        // tx/ty are pixel translations computed against THIS viewport, so
        // copying them under the other form factor's key would be a wrong pan.
        expect(keys).toContain(`mapcursor_viewport_${BASE_ID}`)
        expect(
            keys.some((k) => k.startsWith('mapcursor_mobile_viewport_'))
        ).toBe(false)
    })

    test('a row missing its geography falls back, it does not half-apply', async ({
        page,
    }) => {
        // Anchor but no landing: written together, so this is a hand-edited row.
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

        // A working canvas, not a stripped-down viewer...
        await expect(page.locator('#mc-shapes-toolbar')).toHaveCount(1)
        // ...drawn on the map backdrop.
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
        // They share the top-right corner; the search field measures the share
        // button and stops short of it.
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
    // Switching to the map pulls the ~1MB maplibre chunk, which pushes this
    // past the default per-test budget on a cold dev server.
    test.setTimeout(90_000)

    test('createBase carries the anchor and the landing view', async ({
        page,
        context,
    }) => {
        const requests = await mockBase(page, { base: null })
        await page.goto('/')
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await page.waitForSelector('#mc-map-bg', { timeout: 20_000 })

        // A base that has never settled on a place asks where to start.
        // Skipping accepts the timezone city as the anchor — precisely the case
        // that used to break sharing: that anchor was never persisted anywhere,
        // so a recipient re-derived a different one from their own timezone.
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

        // Draw something: Share refuses an empty canvas.
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

        // ensureBackgroundBase fires its own createBase on the first canvas
        // mutation, so the share-time call is the LAST one.
        const createBase = requests
            .filter((r) => r.operationName === 'createBase')
            .at(-1)
        expect(createBase).toBeTruthy()
        const object = createBase.variables.object

        // The georeference. Elements store surface pixels measured against it,
        // so a null here is the difference between pins on Elland Road and pins
        // in whatever city the recipient's timezone suggests.
        expect(Number.isFinite(object.mapAnchorLng)).toBe(true)
        expect(Number.isFinite(object.mapAnchorLat)).toBe(true)
        expect(Number.isFinite(object.mapAnchorZoom)).toBe(true)

        // The view to open on.
        expect(Number.isFinite(object.landingLng)).toBe(true)
        expect(Number.isFinite(object.landingLat)).toBe(true)
        expect(Number.isFinite(object.landingZoom)).toBe(true)

        // The elements themselves. This is the mutation that used to die on
        // `field 'radius' not found in type: components_component_insert_input`:
        // persistBase spread the whole in-memory record, client-only fields and
        // all, into an insert input that has a column for only some of them.
        const bulk = requests.find(
            (r) => r.operationName === 'insertBulkComponents'
        )
        expect(bulk).toBeTruthy()
        // The circle drawn above has to be in there, or the column assertion
        // below would pass simply by having nothing to check.
        expect(bulk.variables.objects.length).toBeGreaterThan(0)
        expect(assertComponentColumns(requests)).toBeGreaterThan(0)

        // And it must be published, or the link is handed out on a private base.
        expect(
            requests.some((r) => r.operationName === 'updateBaseVisibility')
        ).toBe(true)

        // The link points at the map route.
        await expect(page.locator('text=/\\/map\\//')).toHaveCount(1)
    })
})

test.describe('re-sharing an already-persisted base', () => {
    test('publishes it and refreshes the landing view', async ({
        page,
        context,
    }) => {
        // The base is reachable by URL but still private — exactly what the
        // storage-limit auto-persist produces. Sharing used to just copy the
        // URL here, handing out a link to a base that was never published.
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
        // The landing view moves with the owner's current camera...
        expect(Number.isFinite(shared.variables.landingLng)).toBe(true)
        expect(Number.isFinite(shared.variables.landingZoom)).toBe(true)
        // ...but re-sharing must never mint a second base.
        expect(requests.some((r) => r.operationName === 'createBase')).toBe(
            false
        )
    })

    test('the recipient is not asked where they are mapping', async ({
        page,
    }) => {
        // The prompt gates on "this base has never settled on a place". A base
        // carrying a server anchor very much has — just not by this person.
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
