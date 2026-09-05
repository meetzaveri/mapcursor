// The circle.
//
// A circle is the natural mark for a radius — a blast radius, a catchment, a
// hotspot — and drawing one as a polygon `area` is fiddly and never actually
// round. What these tests protect: it is created at 50% opacity with its stroke
// seeded from its fill, carries no opacity control and no inner text, and
// counter-scales its stroke while its geometry stays world-scaled.

import { test, expect } from './helpers/test.js'
import {
    baseRow,
    GQL_MOCK_RESPONSES,
    setupLocalBase,
    getCanvasBox,
    drawShape,
} from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }

/** Open an empty map base and park the camera at identity. */
async function openMapBase(page) {
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
                          }),
                          components: [],
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
        localStorage.setItem('mapcursor_text_zoom_hint_dismissed', '1')
    })
    await page.goto(`/map/${BASE_ID}`)
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
    // Surface coords become screen coords, so the drag below aims at pixels.
    await page.evaluate(() => {
        const two = window.__mcTwo
        two.scene.translation.set(0, 0)
        two.scene.scale = 1
        two.update()
    })
    await page.waitForTimeout(300)
}

/** The elementData of the most recently created component in the scene. */
const lastRecord = (page) =>
    page.evaluate(() => {
        const children = Array.from(window.__mcTwo.scene.children)
        const withData = children.filter((c) => c?.elementData?.id)
        const g = withData[withData.length - 1]
        if (!g) return null
        const ed = g.elementData
        return {
            componentType: ed.componentType,
            fill: ed.fill,
            stroke: ed.stroke,
            opacity: ed.opacity ?? null,
            linewidth: ed.linewidth,
            // What the group actually paints — group-level, because the leaf is
            // double-referenced in group.children (see circle.tsx unshift).
            paintedGroupOpacity: g.opacity,
            paintedLinewidth: g.children?.[0]?.linewidth ?? null,
        }
    })

test.describe('the map circle', () => {
    test('is stamped geo, created at 50%, with stroke inherited from fill', async ({
        page,
    }) => {
        await openMapBase(page)

        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })

        const rec = await lastRecord(page)
        expect(rec).not.toBeNull()
        // Reuse, not a fourth geo type: it really is componentType 'circle'.
        expect(rec.componentType).toBe('circle')
        // Half-transparent so the basemap reads through it. On the TOP-LEVEL
        // column, not metadata.opacity — that legacy spelling is what every
        // other creation path still writes, and readOpacity prefers the column.
        expect(rec.opacity).toBe(0.5)
        expect(rec.paintedGroupOpacity).toBe(0.5)
        // Outline starts as the fill, so a new circle lands as one mark.
        expect(rec.stroke).toBe(rec.fill)
        // Not the whiteboard's pale shape fill, which at 50% over a basemap is
        // invisible — the reason geo circles carry their own default.
        expect(rec.fill.toLowerCase()).toBe('#a32d2d')
    })

    test('offers no opacity control, unlike the whiteboard circle', async ({
        page,
    }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })
        // drawShape leaves the new circle selected (finishPlacement attaches
        // the selection controller), so the property panel is already up.
        await page.waitForTimeout(400)

        const panel = page.locator('text=Opacity')
        await expect(panel).toHaveCount(0)
        // The panel is genuinely rendered — otherwise the assertion above would
        // pass for the wrong reason.
        await expect(page.locator('text=Fill').first()).toBeVisible()
    })

    test('holds its ring width steady as the map zooms', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })

        // The camera is parked at scale 1, where counter-scale is a no-op, so
        // this is the logical width the record carries.
        const atIdentity = (await lastRecord(page)).paintedLinewidth
        expect(atIdentity).toBeGreaterThan(0)

        /** Announce a camera change and read back what the ring now paints. */
        const paintedAt = (scale) =>
            page.evaluate(async (s) => {
                window.dispatchEvent(
                    new CustomEvent('zoomChanged', { detail: { scale: s } })
                )
                await new Promise((r) => setTimeout(r, 150))
                const children = Array.from(window.__mcTwo.scene.children)
                const withData = children.filter((c) => c?.elementData?.id)
                const g = withData[withData.length - 1]
                return g?.children?.[0]?.linewidth ?? null
            }, scale)

        // Zoomed OUT (scale < 1) the world shrinks, so the ring is drawn wider
        // in surface units to land at the same pixels on screen...
        const zoomedOut = await paintedAt(0.25)
        expect(zoomedOut).toBeGreaterThan(atIdentity)
        // ...and zoomed IN it is drawn narrower, instead of becoming the thick
        // band a raw width would paint at z18.
        const zoomedIn = await paintedAt(4)
        expect(zoomedIn).toBeLessThan(atIdentity)

        // apparentSize ∝ scale^(1 - resist) at resist 0.9 — the same model
        // area and route run. Checked loosely: the point is that the ring is
        // counter-scaled at all, not the exact exponent.
        expect(zoomedOut / atIdentity).toBeCloseTo(1 / Math.pow(0.25, 0.9), 1)
    })

    test('does not open the text editor on double-click', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })

        // Dead centre of the circle just drawn.
        await page.mouse.dblclick(box.x + 380, box.y + 330)
        await page.waitForTimeout(400)

        // geoText is the map's labelling tool; a geo object carries no inner
        // text. Without the guard this opened the shape text editor, for which
        // GEO_CIRCLE has no controls at all.
        await expect(page.locator('textarea.temp-input-area')).toHaveCount(0)
    })

    test('a fill edit does not follow the selection onto whiteboard shapes', async ({
        page,
    }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })
        await page.waitForTimeout(400)

        const fillBefore = await page.evaluate(() => {
            const raw = localStorage.getItem('craftbase:elementDefaults')
            return raw ? JSON.parse(raw).defaultFill : null
        })

        // A real swatch click, so this runs the same createApplyProperty path
        // production does. #FF5630 is in pointFillEssentialShades, the
        // saturated row GEO_CIRCLE shares with GEO_POINT.
        await page.click(
            '#floating-toolbar [data-section="fill"] [title="#FF5630"]'
        )
        await page.waitForTimeout(400)

        const after = await page.evaluate(() => {
            const raw = localStorage.getItem('craftbase:elementDefaults')
            const two = window.__mcTwo
            const children = Array.from(two.scene.children)
            const withData = children.filter((c) => c?.elementData?.id)
            return {
                defaultFill: raw ? JSON.parse(raw).defaultFill : null,
                circleFill:
                    withData[withData.length - 1]?.elementData?.fill ?? null,
            }
        })

        // The circle itself changed...
        expect(after.circleFill.toLowerCase()).toBe('#ff5630')
        // ...but a map circle's fill is its identity on the basemap, not a
        // shape preference. Syncing it would repaint the next whiteboard
        // rectangle in map red.
        expect(after.defaultFill).toBe(fillBefore)
    })
})

// The mobile toolbar has no room for a flat Area AND a flat Circle, so the two
// share one slot behind a drawer — the same shape as the board base's own
// "Shapes" drawer, and flattened away on desktop where the room exists.
test.describe('the map circle on mobile', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
    })

    test('Area and Circle share a drawer under a circle-icon slot', async ({
        page,
    }) => {
        await openMapBase(page)

        // Collapsed: the two children are behind the slot, not in the toolbar.
        await expect(page.locator('[aria-label="Circle"]')).toHaveCount(0)
        await expect(page.locator('[aria-label="Area"]')).toHaveCount(0)

        const slot = page.locator('[aria-label="Shapes"]')
        await expect(slot).toHaveCount(1)
        // The trigger carries the circle icon, not the polygon one.
        await expect(slot.locator('title', { hasText: 'Circle' })).toHaveCount(
            1
        )

        await slot.tap()
        await expect(page.locator('[aria-label="Area"]')).toHaveCount(1)
        await expect(page.locator('[aria-label="Circle"]')).toHaveCount(1)
    })
})
