// Preview artifacts must never carry absolute surface coordinates.
//
// Surface coords are absolute Mercator pixels from the base's ANCHOR, so
// distance from the anchor is coordinate magnitude. San Francisco sits about
// 18.2 million surface units out on a base anchored in Ahmedabad — past the
// 2^24 float32 integer limit, where the spacing between representable values is
// two whole surface units.
//
// Numbers that size written straight into an SVG path `d` come back quantised,
// and Skia's stroker degrades: the route preview painted grey instead of black,
// its width varied from chord to chord, and it detached from the anchor dot —
// while the committed route, finished a second later, looked perfect. The
// difference is that a committed element is a translated GROUP holding small
// relative geometry (its factory does `metadata - (x, y)`), and the preview was
// loose paths holding the raw numbers.
//
// So every preview artifact now hangs off one group translated near the draw.
// This is the same disease `canvas/renderOrigin.ts` addresses one level out:
// that fixes the scene's TRANSFORM, this fixes the path DATA.
//
// The assertion is on the path data, not on pixels, and deliberately so — the
// corruption is a rasterizer behaviour that needs a real GPU, so a headless
// browser paints the broken version correctly and no screenshot test can catch
// it. What IS mechanically checkable is the invariant that produces it.

import { test, expect } from './helpers/test.js'
import { setupLocalBase, getCanvasBox } from './helpers/index.js'

/**
 * Arguello Boulevard, San Francisco, in surface units under the Ahmedabad
 * anchor that `setupLocalBase` seeds. Hard-coded rather than derived so the
 * spec states the magnitude it is defending against.
 */
const SF_SURFACE = { x: -18178113.5, y: -1602472.9 }

/** Anything larger than this in a preview `d` means the origin group is gone. */
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

    // Fly the CAMERA to San Francisco while the anchor stays in Ahmedabad —
    // which is the whole point: the ink is now 18.2M surface units out.
    await page.evaluate(
        ({ sx, sy, vw, vh }) => {
            const zui = window.__mcZui
            const two = window.__mcTwo
            const s = 4
            zui.zoomSet(s, 0, 0)
            const t = two.scene.translation
            zui.translateSurface(vw / 2 - s * sx - t.x, vh / 2 - s * sy - t.y)
            two.update()
            // Mirror the camera onto the backdrop by hand (syncMapToZui), so
            // real road tiles load and the snapper has something to route on.
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

    // Confirm we really are far from the anchor before asserting anything —
    // otherwise this passes for the wrong reason if the camera move regresses.
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
