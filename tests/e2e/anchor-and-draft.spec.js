// Regressions for two bugs that made a local canvas silently change.
//
// 1. The anchor is the georeference every element is measured from. It used
//    to expire 30 days after the place was PICKED, while the draft renewed on
//    every save, so a canvas still being edited a month later lost its anchor
//    and was redrawn over the browser's timezone city (Kolkata, for India),
//    with no prompt, because the start-location prompt only opens on an empty
//    canvas. "Open as new canvas" lost it the same way, by rotating the local
//    base id without writing an anchor for the new one.
// 2. Deleting the LAST element never cleared the saved draft (an empty store
//    skipped the write), so it came back on reload.
//
// Run under the timezone that exposed (1): a regression lands in Kolkata.

import { test, expect } from './helpers/test.js'
import { GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

const LOCAL_BASE = '99999999-9999-9999-9999-999999999999'
const AHMEDABAD = [72.5714, 23.0225]
const KOLKATA = [88.3639, 22.5726]
const DAY = 24 * 60 * 60 * 1000

test.use({ timezoneId: 'Asia/Kolkata' })

const POINT = {
    id: 'p1',
    componentType: 'point',
    ...pointAt(700, 450, { label: 'Vastrapur Lake' }),
    x1: 0, x2: 0, y1: 0, y2: 0, width: 20, height: 20,
    fill: '#FF5630', stroke: null, linewidth: null, strokeType: null,
    textColor: null, children: {}, isDummy: null, updatedBy: null,
    createdAt: null, baseId: LOCAL_BASE, position: 1,
}

async function openLocal(page, { anchorAgeDays, components = [POINT], extra = {} }) {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data = GQL_MOCK_RESPONSES[body.operationName] ?? {}
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(
        ({ base, lngLat, ageMs, components, extra }) => {
            if (sessionStorage.getItem('seeded')) return
            sessionStorage.setItem('seeded', '1')
            localStorage.setItem('userId', 'test-user-id')
            localStorage.setItem('mapcursor_local_base_id', base)
            localStorage.setItem(
                `mapcursor_map_anchor_${base}`,
                JSON.stringify({
                    mapAnchor: { lngLat, zoom: 16 },
                    savedAt: Date.now() - ageMs,
                })
            )
            // Saved today: the user is still working on this canvas.
            localStorage.setItem(
                'mapcursor_local_draft',
                JSON.stringify({
                    baseId: base,
                    timestamp: Date.now(),
                    components: Object.fromEntries(components.map((c) => [c.id, c])),
                })
            )
            Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v))
        },
        {
            base: LOCAL_BASE,
            lngLat: AHMEDABAD,
            ageMs: anchorAgeDays * DAY,
            components,
            extra,
        }
    )
    await page.goto('/')
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
    await page.waitForTimeout(1500)
}

const storedAnchor = (page, baseId) =>
    page.evaluate((id) => {
        const raw = localStorage.getItem(`mapcursor_map_anchor_${id}`)
        return raw ? JSON.parse(raw).mapAnchor.lngLat : null
    }, baseId)

test.describe('the map anchor', () => {
    test('a canvas placed months ago stays where it was placed', async ({
        page,
    }) => {
        const oldOther = JSON.stringify({
            mapAnchor: { lngLat: KOLKATA, zoom: 16 },
            savedAt: Date.now() - 400 * DAY,
        })
        await openLocal(page, {
            anchorAgeDays: 400,
            extra: { 'mapcursor_map_anchor_rotated-away-long-ago': oldOther },
        })
        expect(await storedAnchor(page, LOCAL_BASE)).toEqual(AHMEDABAD)
        await expect(page.locator('[data-component-id="p1"]')).toHaveCount(1)
        // Housekeeping still clears OTHER bases' old anchors.
        expect(await storedAnchor(page, 'rotated-away-long-ago')).toBeNull()

        await page.reload()
        await page.waitForSelector('#main-two-root svg')
        await page.waitForTimeout(1000)
        expect(await storedAnchor(page, LOCAL_BASE)).toEqual(AHMEDABAD)
    })

    test('"Open as new canvas" keeps the imported file’s anchor', async ({
        page,
    }) => {
        await openLocal(page, { anchorAgeDays: 1 })
        const file = {
            formatVersion: '2.1',
            app: 'mapcursor',
            mapAnchor: { lngLat: KOLKATA, zoom: 16 },
            legendPresets: [],
            components: { k1: { ...POINT, id: 'k1', baseId: 'file-base' } },
        }
        await page.click('[title="Menu"]')
        await page.getByText('Import canvas').click()
        const [chooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.getByText('Import JSON').click(),
        ])
        await chooser.setFiles({
            name: 'canvas.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(file)),
        })
        await page.getByText('Open as new canvas').click()
        await page.waitForTimeout(1500)

        const newId = await page.evaluate(
            () => JSON.parse(localStorage.getItem('mapcursor_local_draft')).baseId
        )
        expect(newId).not.toBe(LOCAL_BASE)
        expect(await storedAnchor(page, newId)).toEqual(KOLKATA)

        // The bug only showed on the NEXT load, which found no anchor.
        await page.reload()
        await page.waitForSelector('[data-component-id="k1"]')
        expect(await storedAnchor(page, newId)).toEqual(KOLKATA)
    })
})

test('deleting the last element clears the draft, so it stays deleted', async ({
    page,
}) => {
    await openLocal(page, { anchorAgeDays: 1 })
    await page.click('[aria-label="Eraser"]')
    const dot = await page.evaluate(() => {
        const g = document.querySelector('[data-component-id="p1"]')
        const r = (g.querySelector('circle, ellipse') || g).getBoundingClientRect()
        return { x: r.left + Math.min(r.width, 20) / 2, y: r.top + r.height / 2 }
    })
    await page.mouse.move(dot.x - 10, dot.y)
    await page.mouse.down()
    await page.mouse.move(dot.x + 10, dot.y, { steps: 6 })
    await page.mouse.up()
    await expect(page.locator('[data-component-id="p1"]')).toHaveCount(0, {
        timeout: 5000,
    })
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem('mapcursor_local_draft')))
        .toBeNull()

    await page.reload()
    await page.waitForSelector('#main-two-root svg')
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-component-id="p1"]')).toHaveCount(0)
})
