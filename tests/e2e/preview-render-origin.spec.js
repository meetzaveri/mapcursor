import { test, expect } from './helpers/test.js'
import { setupLocalBase, getCanvasBox } from './helpers/index.js'

const SF_SURFACE = { x: -18178113.5, y: -1602472.9 }

const MAX_SAFE_PATH_COORD = 100000

test('preview geometry stays small however far the camera is from the anchor', async ({
    page,
}) => {
    await setupLocalBase(page)
    await page.waitForFunction(() => !!window.__mcMap?.map, undefined, {
        timeout: 30_000,
    })
    const box = await getCanvasBox(page)
    const cx = box.width / 2
    const cy = box.height / 2

    await page.evaluate(
        ({ sx, sy, vw, vh }) => {
            const zui = window.__mcZui
            const two = window.__mcTwo
            const s = 4
            zui.zoomSet(s, 0, 0)
            const t = two.scene.translation
            zui.translateSurface(vw / 2 - s * sx - t.x, vh / 2 - s * sy - t.y)
            two.update()
            const h = window.__mcMap
            const map = h.map
            const zoom = h.anchor.zoom + Math.log2(s)
            map.jumpTo({ center: h.anchor.lngLat, zoom })
            const ap = map.project(h.anchor.lngLat)
            map.jumpTo({
                center: map.unproject([
                    ap.x + (vw / 2 - two.scene.translation.x),
                    ap.y + (vh / 2 - two.scene.translation.y),
                ]),
                zoom,
            })
            window.dispatchEvent(
                new CustomEvent('zoomChanged', { detail: { scale: s } })
            )
        },
        { sx: SF_SURFACE.x, sy: SF_SURFACE.y, vw: box.width, vh: box.height }
    )
    await page.waitForTimeout(2000)
    await page.waitForFunction(
        () =>
            window.__mcMap.map.isStyleLoaded() &&
            window.__mcMap.map.areTilesLoaded(),
        undefined,
        { timeout: 30_000 }
    )

    const surfaceAtCentre = await page.evaluate(() =>
        window.__mcZui.clientToSurface(
            window.innerWidth / 2,
            window.innerHeight / 2
        )
    )
    expect(Math.abs(surfaceAtCentre.x)).toBeGreaterThan(10_000_000)

    await page.click('[aria-label="Route"]')
    await page.waitForTimeout(250)
    await page.mouse.click(cx - 180, cy - 40)
    await page.waitForTimeout(300)
    await page.mouse.move(cx + 160, cy + 60, { steps: 10 })
    await page.waitForTimeout(500)

    const worst = await page.evaluate(() => {
        let max = 0
        for (const p of document.querySelectorAll('#main-two-root svg path')) {
            for (const n of (p.getAttribute('d') || '').match(/-?[\d.]+/g) ||
                []) {
                max = Math.max(max, Math.abs(parseFloat(n)))
            }
        }
        return max
    })
    expect(worst).toBeLessThan(MAX_SAFE_PATH_COORD)
})
