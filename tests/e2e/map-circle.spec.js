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
    await page.evaluate(() => {
        const two = window.__mcTwo
        two.scene.translation.set(0, 0)
        two.scene.scale = 1
        two.update()
    })
    await page.waitForTimeout(300)
}

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
            paintedGroupOpacity: g.opacity,
            paintedShapeOpacity: g.children?.[0]?.opacity ?? null,
            paintedLinewidth: g.children?.[0]?.linewidth ?? null,
        }
    })

test.describe('the map circle', () => {
    test('is stamped geo, created at 50%, borderless, stroke from fill', async ({
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
        expect(rec.componentType).toBe('circle')
        expect(rec.opacity).toBe(0.5)
        expect(rec.paintedShapeOpacity).toBe(0.5)
        expect(rec.paintedGroupOpacity).toBe(1)
        expect(rec.stroke).toBe(rec.fill)
        expect(rec.linewidth).toBe(0)
        expect(rec.paintedLinewidth).toBe(0)
        expect(rec.fill.toLowerCase()).toBe('#a32d2d')
    })

    test('has no opacity control, and dims the disc, never the label', async ({
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
        await page.waitForSelector('#floating-toolbar [data-section="fill"]')
        await expect(
            page.locator('#floating-toolbar #slider-main')
        ).toHaveCount(0)

        const rec = await lastRecord(page)
        expect(rec.paintedShapeOpacity).toBeCloseTo(0.5, 2)
        expect(rec.paintedGroupOpacity).toBe(1)
    })

    test('paints no ring at any zoom', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })

        expect((await lastRecord(page)).paintedLinewidth).toBe(0)

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

        expect(await paintedAt(0.25)).toBe(0)
        expect(await paintedAt(4)).toBe(0)
    })

    test('double-click opens the label editor, not the shape text editor', async ({
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

        await page.mouse.dblclick(box.x + 380, box.y + 330)

        const editor = page.locator('textarea.temp-input-area')
        await editor.waitFor({ state: 'visible', timeout: 15_000 })
        await expect(editor).toHaveAttribute('id', /^circle-label-input-/)
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

        expect(after.circleFill.toLowerCase()).toBe('#ff5630')
        expect(after.defaultFill).toBe(fillBefore)
    })

    test('a fill edit carries the stroke column with it', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 410,
        })
        await page.waitForTimeout(400)

        await page.click(
            '#floating-toolbar [data-section="fill"] [title="#FF5630"]'
        )
        await expect
            .poll(async () => {
                const r = await lastRecord(page)
                return [r.fill?.toLowerCase(), r.stroke?.toLowerCase()]
            })
            .toEqual(['#ff5630', '#ff5630'])

        const painted = await page.evaluate(() => {
            const children = Array.from(window.__mcTwo.scene.children)
            const withData = children.filter((c) => c?.elementData?.id)
            const g = withData[withData.length - 1]
            return {
                fill: g.children?.[0]?.fill,
                stroke: g.children?.[0]?.stroke,
            }
        })
        expect(painted.fill.toLowerCase()).toBe('#ff5630')
        expect(painted.stroke.toLowerCase()).toBe('#ff5630')

        await expect(
            page.locator('#floating-toolbar [data-section="stroke"]')
        ).toHaveCount(0)
        await expect(
            page.locator('#floating-toolbar #stroke-width-section')
        ).toHaveCount(0)
        await expect(
            page.locator('#floating-toolbar #stroke-type-section')
        ).toHaveCount(0)
    })
})

test.describe('the circle is always round', () => {
    const lastGeometry = (page) =>
        page.evaluate(() => {
            const children = Array.from(window.__mcTwo.scene.children)
            const withData = children.filter((c) => c?.elementData?.id)
            const g = withData[withData.length - 1]
            if (!g) return null
            return {
                width: g.elementData.width,
                height: g.elementData.height,
                x: g.elementData.x,
                y: g.elementData.y,
                paintedWidth: g.children?.[0]?.width ?? null,
                paintedHeight: g.children?.[0]?.height ?? null,
                translationX: g.translation.x,
                translationY: g.translation.y,
            }
        })

    test('a lopsided drag draws a circle, not an oval', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 500,
            endY: box.y + 300,
        })

        const geo = await lastGeometry(page)
        expect(geo).not.toBeNull()
        expect(geo.width).toBe(geo.height)
        expect(geo.paintedWidth).toBe(geo.paintedHeight)

        expect(geo.x).toBe(300)
        expect(geo.y).toBe(250)
        expect(geo.width / 2).toBeCloseTo(Math.hypot(200, 50), 0)
    })

    test('a lopsided handle drag grows the radius, keeping it round', async ({
        page,
    }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        await drawShape(page, 'circle', {
            startX: box.x + 300,
            startY: box.y + 250,
            endX: box.x + 460,
            endY: box.y + 250,
        })
        await page.waitForTimeout(400)

        const before = await lastGeometry(page)
        expect(before.paintedWidth).toBe(before.paintedHeight)

        const handleX =
            box.x + before.translationX + before.paintedWidth / 2 + 5
        const handleY =
            box.y + before.translationY + before.paintedHeight / 2 + 5
        await page.mouse.move(handleX, handleY)
        await page.mouse.down()
        await page.mouse.move(handleX + 120, handleY + 20, { steps: 10 })
        await page.mouse.up()
        await page.waitForTimeout(300)

        const after = await lastGeometry(page)
        expect(after.paintedWidth).toBeGreaterThan(before.paintedWidth)
        expect(after.paintedHeight).toBeCloseTo(after.paintedWidth, 5)
    })
})

test('the circle rings its resize handles in the shared handle indigo', async ({
    page,
}) => {
    await openMapBase(page)
    const box = await getCanvasBox(page)
    await drawShape(page, 'circle', {
        startX: box.x + 300,
        startY: box.y + 250,
        endX: box.x + 380,
        endY: box.y + 250,
    })
    await page.waitForTimeout(400)

    const chrome = await page.evaluate(() => {
        const el = document.querySelector('[data-mc-selection-chrome]')
        if (!el) return null
        return {
            strokes: Array.from(el.querySelectorAll('[stroke]')).map((n) =>
                n.getAttribute('stroke')
            ),
        }
    })

    expect(chrome, 'the selection overlay should be mounted').not.toBeNull()
    expect(chrome.strokes).toContain('#6965db')
})

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

        await expect(page.locator('[aria-label="Radius Map"]')).toHaveCount(0)
        await expect(page.locator('[aria-label="Area"]')).toHaveCount(0)

        const slot = page.locator('[aria-label="Shapes"]')
        await expect(slot).toHaveCount(1)
        await expect(
            slot.locator('title', { hasText: 'Radius Map' })
        ).toHaveCount(1)

        await slot.tap()
        await expect(page.locator('[aria-label="Area"]')).toHaveCount(1)
        await expect(page.locator('[aria-label="Radius Map"]')).toHaveCount(1)
    })
})
