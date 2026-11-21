import { test, expect } from './helpers/test.js'
import { setupLocalBase, getCanvasBox, drawRoute } from './helpers/index.js'

const isSelected = (page) =>
    page.evaluate(() => !!document.querySelector('#stroke-width-section'))

const handlePointerEvents = (page) =>
    page.evaluate(() => [
        ...new Set(
            [...document.querySelectorAll('.is-vertex-handle')].map(
                (h) => getComputedStyle(h).pointerEvents
            )
        ),
    ])

test.describe('clicking a route on its vertices', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
        await page.waitForFunction(() => !!window.__mcMap?.map, undefined, {
            timeout: 30_000,
        })
        await page.waitForFunction(
            () => {
                const map = window.__mcMap?.map
                if (!map || !map.isStyleLoaded()) return false
                for (const sourceLayer of ['roads', 'transportation']) {
                    const layer = map
                        .getLayersOrder()
                        .map((id) => map.getLayer(id))
                        .find((l) => l?.sourceLayer === sourceLayer && l.source)
                    if (!layer) continue
                    try {
                        return (
                            map.querySourceFeatures(layer.source, {
                                sourceLayer,
                            }).length > 0
                        )
                    } catch {
                        return false
                    }
                }
                return false
            },
            undefined,
            { timeout: 30_000 }
        )
    })

    test('every vertex of an unselected route selects it', async ({ page }) => {
        const box = await getCanvasBox(page)
        const cx = box.width / 2
        const cy = box.height / 2
        await drawRoute(page, [
            { x: cx - 200, y: cy - 40 },
            { x: cx + 200, y: cy + 60 },
        ])
        await page.waitForTimeout(600)

        const centres = await page.evaluate(() =>
            [...document.querySelectorAll('.is-vertex-handle')].map((h) => {
                const r = h.getBoundingClientRect()
                return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
            })
        )
        expect(centres.length).toBeGreaterThan(1)

        const failed = []
        for (let i = 0; i < centres.length; i++) {
            await page.mouse.click(cx - 380, cy + 260)
            await page.waitForTimeout(150)
            await page.mouse.click(centres[i].x, centres[i].y)
            await page.waitForTimeout(200)
            if (!(await isSelected(page))) failed.push(i)
        }
        expect(failed).toEqual([])
    })

    test('a drag elsewhere leaves hidden handles click-through', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        const cx = box.width / 2
        const cy = box.height / 2
        await drawRoute(page, [
            { x: cx - 260, y: cy - 140 },
            { x: cx + 60, y: cy - 80 },
        ])
        await page.waitForTimeout(600)
        expect(await handlePointerEvents(page)).toEqual(['none'])

        await page.click('[aria-label="Radius Map"]')
        await page.waitForTimeout(200)
        await page.mouse.move(cx - 200, cy + 120)
        await page.mouse.down()
        await page.mouse.move(cx - 60, cy + 220, { steps: 8 })
        await page.mouse.up()
        await page.waitForTimeout(500)
        await page.mouse.move(cx - 130, cy + 170)
        await page.mouse.down()
        await page.mouse.move(cx - 100, cy + 200, { steps: 8 })
        await page.mouse.up()
        await page.waitForTimeout(500)

        expect(await handlePointerEvents(page)).toEqual(['none'])

        await page.mouse.click(cx + 380, cy - 260)
        await page.waitForTimeout(250)
        const vertex = await page.evaluate(() => {
            const hs = [...document.querySelectorAll('.is-vertex-handle')]
            const r = hs[Math.floor(hs.length / 2)].getBoundingClientRect()
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        await page.mouse.click(vertex.x, vertex.y)
        await page.waitForTimeout(400)
        expect(await isSelected(page)).toBe(true)
    })
})
