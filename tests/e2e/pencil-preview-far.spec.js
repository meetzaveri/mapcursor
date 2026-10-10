import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    clickToolbarButton,
} from './helpers/index.js'

// Far from the anchor, surface coordinates run to ~1e7, and SVG path data is
// rasterised in float32 — which resolves only whole units out there. A live
// pencil preview carrying absolute coordinates drew broken mid-stroke and
// only turned solid on mouseup. The preview now keeps its vertices relative
// to the stroke's start (on the group's translation), so its path data stays
// screen-sized wherever the camera is. That is what this pins down.

// Roughly California from an Ahmedabad anchor, at z16.
const FAR = { x: -14_500_000, y: -3_000_000 }
// Comfortably beyond any stroke a test draws, far below FAR.
const MAX_LOCAL_COORD = 10_000

test.describe('Pencil preview far from the anchor', () => {
    test('keeps its path data local while drawing', async ({ page }) => {
        await setupLocalBase(page)
        await page.evaluate((target) => {
            const two = window.__mcTwo
            const zui = window.__mcZui
            zui.zoomSet(2, 0, 0)
            const [cx, cy] = zui.surfaceMatrix.multiply(target.x, target.y, 1)
            zui.translateSurface(two.width / 2 - cx, two.height / 2 - cy)
            window.dispatchEvent(
                new CustomEvent('zoomChanged', {
                    detail: { scale: two.scene.scale },
                })
            )
            two.update()
        }, FAR)

        await clickToolbarButton(page, 'Pencil')
        const box = await getCanvasBox(page)
        const x = box.x + box.width * 0.4
        const y = box.y + box.height * 0.5
        await page.mouse.move(x, y)
        await page.mouse.down()
        for (let i = 1; i <= 30; i++) {
            await page.mouse.move(x + i * 10, y + Math.sin(i / 5) * 60)
        }

        // Mid-stroke: the preview is the only element not yet committed.
        const maxCoord = await page.evaluate(() => {
            // Only the canvas's own scene, under the render-origin wrapper.
            const paths = Array.from(
                document.querySelectorAll(
                    '#mc-render-origin path[stroke-linecap="round"]'
                )
            ).filter((p) => !p.closest('[data-component-id]'))
            const nums = paths.flatMap((p) =>
                (
                    (p.getAttribute('d') || '').match(
                        /-?\d*\.?\d+(?:e[-+]?\d+)?/gi
                    ) || []
                ).map(Number)
            )
            return nums.length ? Math.max(...nums.map(Math.abs)) : null
        })
        await page.mouse.up()

        expect(maxCoord).not.toBeNull()
        expect(maxCoord).toBeLessThan(MAX_LOCAL_COORD)
    })
})
