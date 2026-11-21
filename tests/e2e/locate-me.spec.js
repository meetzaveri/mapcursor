import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    placePoint,
    getDraftComponents,
} from './helpers/index.js'

const FIX = { latitude: 23.2156, longitude: 72.6369 }

const locateButton = (page) => page.getByRole('button', { name: 'Locate me' })

const mapCenter = (page) =>
    page.evaluate(() => {
        const c = window.__mcMap.map.getCenter()
        return { lng: c.lng, lat: c.lat }
    })

const storedAnchor = (page) =>
    page.evaluate(() => {
        const prefix = 'mapcursor_map_anchor_'
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i)
            if (!key || !key.startsWith(prefix)) continue
            try {
                const parsed = JSON.parse(localStorage.getItem(key))
                if (parsed?.mapAnchor) return parsed.mapAnchor
            } catch (_) {}
        }
        return null
    })

test.describe('locate me', () => {
    test('flies the camera to the fix and leaves the drawing anchored', async ({
        page,
        context,
    }) => {
        await context.grantPermissions(['geolocation'])
        await context.setGeolocation(FIX)
        await setupLocalBase(page)
        await page.waitForFunction(() => window.__mcMap?.map, null, {
            timeout: 15_000,
        })

        const box = await getCanvasBox(page)
        await placePoint(page, { x: box.x + 300, y: box.y + 300 })
        await expect
            .poll(
                async () =>
                    Object.keys((await getDraftComponents(page)) ?? {}).length
            )
            .toBeGreaterThan(0)
        const anchorBefore = await storedAnchor(page)

        await locateButton(page).click()

        await expect
            .poll(async () => (await mapCenter(page)).lng, { timeout: 20_000 })
            .toBeCloseTo(FIX.longitude, 3)
        expect((await mapCenter(page)).lat).toBeCloseTo(FIX.latitude, 3)
        expect(await storedAnchor(page)).toEqual(anchorBefore)
    })

    test('re-anchors an empty map on the fix', async ({ page, context }) => {
        await context.grantPermissions(['geolocation'])
        await context.setGeolocation(FIX)
        await setupLocalBase(page)

        await locateButton(page).click()

        await expect
            .poll(async () => (await storedAnchor(page))?.lngLat?.[0], {
                timeout: 20_000,
            })
            .toBeCloseTo(FIX.longitude, 3)
        expect((await storedAnchor(page)).lngLat[1]).toBeCloseTo(
            FIX.latitude,
            3
        )
    })

    test('a blocked location says where to turn it back on', async ({
        page,
    }) => {
        await page.addInitScript(() => {
            window.__locateCalls = 0
            const query = navigator.permissions.query.bind(
                navigator.permissions
            )
            navigator.permissions.query = (desc) =>
                desc?.name === 'geolocation'
                    ? Promise.resolve({ state: 'denied' })
                    : query(desc)
            Object.defineProperty(navigator, 'geolocation', {
                configurable: true,
                value: {
                    getCurrentPosition: () => {
                        window.__locateCalls += 1
                    },
                    watchPosition: () => 0,
                    clearWatch: () => {},
                },
            })
        })
        await setupLocalBase(page)

        await locateButton(page).click()

        await expect(page.getByText(/Location is blocked/)).toBeVisible()
        expect(await page.evaluate(() => window.__locateCalls)).toBe(0)
    })

    test('a refusal at the browser prompt explains itself too', async ({
        page,
    }) => {
        await page.addInitScript(() => {
            const query = navigator.permissions.query.bind(
                navigator.permissions
            )
            navigator.permissions.query = (desc) =>
                desc?.name === 'geolocation'
                    ? Promise.resolve({ state: 'prompt' })
                    : query(desc)
            Object.defineProperty(navigator, 'geolocation', {
                configurable: true,
                value: {
                    getCurrentPosition: (_ok, fail) =>
                        fail({ code: 1, message: 'User denied Geolocation' }),
                    watchPosition: () => 0,
                    clearWatch: () => {},
                },
            })
        })
        await setupLocalBase(page)

        await locateButton(page).click()

        await expect(page.getByText(/Location is blocked/)).toBeVisible()
    })
})
