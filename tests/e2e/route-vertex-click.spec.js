// Clicking a route ON one of its vertices must select the route.
//
// A vertex handle is an opacity-0 circle sitting exactly on the route's own
// stroke, and an invisible SVG node still hit-tests — so while the route is
// unselected the handle has to be `pointer-events: none`, or it swallows the
// click that was meant for the route underneath it (its mousedown calls
// stopPropagation). `setVertexHandlesVisible` owns that gate.
//
// Two blanket sweeps in newCanvas's drag lifecycle used to walk over it:
// mousedown disables pointer events on `.dragger-picker` during an arrow drag,
// and mouseup restores them by clearing the inline style. Vertex handles carry
// `.dragger-picker` too, so any drag anywhere re-armed click capture on every
// hidden handle on the canvas — and nothing repaired it, because a component
// only re-runs the visibility effect when its OWN selection changes, and these
// routes stayed unselected the whole time.
//
// It went unnoticed while routes had two or three vertices and the odds of
// clicking exactly on one were small. A snap-to-road route down a curving
// street carries two dozen, covering most of its length, which is what turned a
// rare annoyance into "this route will not select".

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
        // Options are waitForFunction's THIRD argument; passed second they
        // become the page function's argument and the 5s default applies.
        await page.waitForFunction(() => !!window.__mcMap?.map, undefined, {
            timeout: 30_000,
        })
        // Wait on the ROADS being queryable rather than on `areTilesLoaded()`,
        // which flickers false while the map settles and made this flaky.
        //
        // The road source is discovered from the style, as the app does it
        // (src/baseTypes/roadSchema.ts, which can't be imported in here): the
        // first layer reading a known road source-layer names the source.
        // Hard-coding CARTO's old `carto`/`transportation` pair broke when
        // CARTO moved to Protomaps tiles (`roads`).
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
            await page.mouse.click(cx - 380, cy + 260) // deselect
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
        // The actual regression. The sweep runs from the drag lifecycle, so it
        // needs a real drag — of something that is NOT the route.
        const box = await getCanvasBox(page)
        const cx = box.width / 2
        const cy = box.height / 2
        await drawRoute(page, [
            { x: cx - 260, y: cy - 140 },
            { x: cx + 60, y: cy - 80 },
        ])
        await page.waitForTimeout(600)
        expect(await handlePointerEvents(page)).toEqual(['none'])

        // Drag a circle around, well clear of the route. (Rectangle is
        // board-only and hidden on a map base — the circle is the drag-to-place
        // shape that survives BOARD_ONLY_TYPES.)
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

        // The route never changed selection, so nothing re-ran its effect —
        // the handles must still be click-through on their own.
        expect(await handlePointerEvents(page)).toEqual(['none'])

        await page.mouse.click(cx + 380, cy - 260) // deselect the rectangle
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
