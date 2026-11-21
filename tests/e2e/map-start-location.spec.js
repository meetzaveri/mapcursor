import { test, expect } from './helpers/test.js'
import { setupLocalBase } from './helpers/index.js'

const FIX = { latitude: 53.7778, longitude: -1.5722 }

async function waitForModalReady(page) {
    await page.waitForSelector('.modal-portal .active', { timeout: 10_000 })
    await page.waitForFunction(
        () => {
            const el = document.querySelector('.modal-portal .modal-content')
            if (!el) return false
            const now = el.getBoundingClientRect().top
            const prev = window.__mcModalTop
            window.__mcModalTop = now
            return prev !== undefined && Math.abs(now - prev) < 0.5
        },
        undefined,
        { polling: 'raf', timeout: 10_000 }
    )
}

async function openMap(page, { expectPrompt = true } = {}) {
    await page.waitForSelector('#mc-map-bg', { timeout: 20_000 })
    if (expectPrompt) await waitForModalReady(page)
}

async function waitForStoredAnchor(page) {
    await page.waitForFunction(
        () => {
            const prefix = 'mapcursor_map_anchor_'
            for (let i = 0; i < localStorage.length; i += 1) {
                const key = localStorage.key(i)
                if (!key || !key.startsWith(prefix)) continue
                try {
                    if (JSON.parse(localStorage.getItem(key))?.mapAnchor) {
                        return true
                    }
                } catch (_) {}
            }
            return false
        },
        undefined,
        { timeout: 15_000 }
    )
    return readStoredAnchor(page)
}

async function readStoredAnchor(page) {
    return page.evaluate(() => {
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
}

async function denyGeolocation(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {
                getCurrentPosition: (_ok, fail) => {
                    fail({ code: 1, message: 'User denied Geolocation' })
                },
                watchPosition: () => 0,
                clearWatch: () => {},
            },
        })
    })
}

test.describe('the map start-location prompt', () => {
    test('offers the choice before the search box', async ({ page }) => {
        await setupLocalBase(page, { seedAnchor: false })
        await openMap(page)

        await expect(
            page.getByRole('button', { name: /Use my current location/ })
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: /No, let me search/ })
        ).toBeVisible()
        await expect(
            page.getByLabel('Search for a place to start from')
        ).toHaveCount(0)

        await page.getByRole('button', { name: /No, let me search/ }).click()
        await expect(
            page.getByLabel('Search for a place to start from')
        ).toBeVisible()
    })

    test('a granted location anchors the base on the fix', async ({
        page,
        context,
    }) => {
        await context.grantPermissions(['geolocation'])
        await context.setGeolocation(FIX)
        await setupLocalBase(page, { seedAnchor: false })
        await openMap(page)

        await page.getByRole('button', { name: /Use my current location/ }).click()

        await expect(
            page.getByRole('button', { name: /Skip, use/ })
        ).toHaveCount(0, { timeout: 20_000 })

        const anchor = await waitForStoredAnchor(page)
        expect(anchor).toBeTruthy()
        expect(anchor.lngLat[0]).toBeCloseTo(FIX.longitude, 3)
        expect(anchor.lngLat[1]).toBeCloseTo(FIX.latitude, 3)
    })

    test('a denied location explains itself and keeps the dialog open', async ({
        page,
    }) => {
        await denyGeolocation(page)
        await setupLocalBase(page, { seedAnchor: false })
        await openMap(page)

        await page.getByRole('button', { name: /Use my current location/ }).click()

        await expect(page.getByText(/location is off/)).toBeVisible({
            timeout: 20_000,
        })
        await expect(
            page.getByLabel('Search for a place to start from')
        ).toBeVisible()
        expect(await waitForStoredAnchor(page)).toBeTruthy()
    })

    test('an answered base is not asked again after a reload', async ({
        page,
        context,
    }) => {
        await context.grantPermissions(['geolocation'])
        await context.setGeolocation(FIX)
        await setupLocalBase(page, { seedAnchor: false })
        await openMap(page)

        await page.getByRole('button', { name: /Use my current location/ }).click()
        await expect(
            page.getByRole('button', { name: /Skip, use/ })
        ).toHaveCount(0, { timeout: 20_000 })

        const before = await waitForStoredAnchor(page)

        await page.goto('/')
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await openMap(page, { expectPrompt: false })
        await page.waitForTimeout(2500)

        await expect(
            page.getByRole('button', { name: /Skip, use/ })
        ).toHaveCount(0)
        expect(await readStoredAnchor(page)).toEqual(before)
    })

    test('dismissing settles on the timezone city and stops asking', async ({
        page,
    }) => {
        await setupLocalBase(page, { seedAnchor: false })
        await openMap(page)

        await page.getByRole('button', { name: /Skip, use/ }).click()
        await expect(
            page.getByRole('button', { name: /Skip, use/ })
        ).toHaveCount(0)

        expect(await waitForStoredAnchor(page)).toBeTruthy()
    })
})
