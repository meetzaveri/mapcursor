// The circle.
//
// A circle is the natural mark for a radius — a blast radius, a catchment, a
// hotspot — and drawing one as a polygon `area` is fiddly and never actually
// round. What these tests protect: it is created at 50% opacity with its stroke
// column seeded from its fill, it is BORDERLESS (no ring at any zoom and no
// stroke controls to grow one), its opacity control dims the disc but never
// the label, and it takes a
// name rather than craftbase-style inner text (the shape is never resized by
// it). Its label is covered separately, in map-circle-label.spec.js.

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
            // What the circle actually paints. Opacity lives on the ELLIPSE,
            // not the group: the group also holds the label sub-group, and a
            // half-transparent NAME over a basemap is unreadable (see
            // circle.tsx). The leaf is double-referenced in group.children
            // (see the unshift there), so children[0] is the ellipse.
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
        // Reuse, not a fourth geo type: it really is componentType 'circle'.
        expect(rec.componentType).toBe('circle')
        // Half-transparent so the basemap reads through it. On the TOP-LEVEL
        // column, not metadata.opacity — that legacy spelling is what every
        // other creation path still writes, and readOpacity prefers the column.
        expect(rec.opacity).toBe(0.5)
        expect(rec.paintedShapeOpacity).toBe(0.5)
        // The GROUP stays fully opaque — it carries the label too, and group
        // opacity would multiply onto both.
        expect(rec.paintedGroupOpacity).toBe(1)
        // The stroke column starts as the fill, so the record reads as one
        // mark — but nothing is drawn with it: a radius map is borderless, so
        // the ring is zero-width from creation and there is no control to
        // widen it (see CIRCLE_DEFAULTS).
        expect(rec.stroke).toBe(rec.fill)
        expect(rec.linewidth).toBe(0)
        expect(rec.paintedLinewidth).toBe(0)
        // Not the whiteboard's pale shape fill, which at 50% over a basemap is
        // invisible — the reason geo circles carry their own default.
        expect(rec.fill.toLowerCase()).toBe('#a32d2d')
    })

    test('its opacity control dims the disc, never the label', async ({
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
        const slider = page.locator('#floating-toolbar #slider-main')
        const handle = page.locator('#floating-toolbar #slider-handle')
        await expect(slider).toHaveCount(1)

        // Drag to 20% of the track. The slider snaps to 0.1 steps, so this
        // commits 0.2, well clear of the 0.5 a circle is created with.
        await handle.scrollIntoViewIfNeeded()
        const track = await slider.boundingBox()
        const knob = await handle.boundingBox()
        const y = knob.y + knob.height / 2
        await page.mouse.move(knob.x + knob.width / 2, y)
        await page.mouse.down()
        await page.mouse.move(track.x + track.width * 0.2, y, { steps: 12 })
        await page.mouse.up()

        await expect
            .poll(async () => (await lastRecord(page))?.opacity, {
                timeout: 10_000,
            })
            .toBeCloseTo(0.2, 1)
        const rec = await lastRecord(page)
        // The disc takes the value...
        expect(rec.paintedShapeOpacity).toBeCloseTo(0.2, 1)
        // ...and the group, which also holds the label, stays opaque, so the
        // name stays readable over the basemap (see applyProperty).
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

        /** Announce a camera change and read back what the disc now paints. */
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

        // Unlike area/route, a circle has no stroke to counter-scale: the disc
        // IS the data, so it stays world-glued and borderless at every zoom.
        // A width creeping back in at one end of the range is the regression
        // this guards — that is how the ring used to become a thick band at
        // z18 and a hairline at z4.
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

        // Dead centre of the circle just drawn.
        await page.mouse.dblclick(box.x + 380, box.y + 330)

        // The circle owns this editor, so it carries the circle's own id —
        // NOT craftbase's anonymous shape-text textarea, which grew the shape
        // to fit and would have changed the radius.
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

        // A new circle lands as ONE mark — stroke seeded from fill. Recolouring
        // has to keep that promise, or the first fill edit strands the stroke
        // column on the old colour and anything reading it (SVG export, a
        // grouped copy) disagrees with the disc.
        await page.click(
            '#floating-toolbar [data-section="fill"] [title="#FF5630"]'
        )
        await expect
            .poll(async () => {
                const r = await lastRecord(page)
                return [r.fill?.toLowerCase(), r.stroke?.toLowerCase()]
            })
            .toEqual(['#ff5630', '#ff5630'])

        // And the ellipse actually paints it, not just the record.
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

        // And there is no way to pull the two apart: a radius map is
        // borderless, so the toolbar offers no stroke colour, no width and no
        // dash pattern — the fill is its only colour.
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

// Roundness. A circle answers "everything within this distance", so an oval is
// not a variant of it — it is a broken mark. Two gestures could produce one:
// the create-drag and a later handle-resize. Both are locked.
test.describe('the circle is always round', () => {
    /** Geometry of the most recently created component: record and painted. */
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
                // What the ellipse actually paints, which is what the resize
                // gesture writes (the record follows on commit).
                paintedWidth: g.children?.[0]?.width ?? null,
                paintedHeight: g.children?.[0]?.height ?? null,
                translationX: g.translation.x,
                translationY: g.translation.y,
            }
        })

    test('a lopsided drag draws a circle, not an oval', async ({ page }) => {
        await openMapBase(page)
        const box = await getCanvasBox(page)

        // 200 across, 50 down. Under the old bounding-box gesture this was a
        // 200x50 ellipse; centre-out it can only be round.
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

        // The mousedown point is the centre — the thing whose proximity is
        // being marked — not a bounding-box corner.
        expect(geo.x).toBe(300)
        expect(geo.y).toBe(250)
        // ...and the drag distance is the radius: hypot(200, 50) ≈ 206.
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
        // drawShape leaves the circle selected, so the handles are already up.
        await page.waitForTimeout(400)

        const before = await lastGeometry(page)
        expect(before.paintedWidth).toBe(before.paintedHeight)

        // A circle carries the 4 corner handles only (hitTest offers edge
        // handles on a rectangle). The SE one sits half a box past the centre
        // each way, the box being the shape plus SELECTION_PADDING (5) a side.
        // The camera is parked at identity, so surface units are canvas pixels.
        const handleX =
            box.x + before.translationX + before.paintedWidth / 2 + 5
        const handleY =
            box.y + before.translationY + before.paintedHeight / 2 + 5
        // Far more across than down: unlocked, that is exactly how an oval was
        // made, each axis taking its own delta.
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

// The grab points. A circle is reshaped by its 4 corner handles the way a route
// or an area is reshaped by its per-vertex dots, so they are ringed in the same
// indigo — one look for "grab here", whichever map object is selected. The box
// around them still follows the theme's ink.
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
    // drawShape leaves the circle selected, so the chrome is already mounted.
    await page.waitForTimeout(400)

    const chrome = await page.evaluate(() => {
        // The overlay tags its own SVG node so exports can strip it — the same
        // marker makes it findable here.
        const el = document.querySelector('[data-mc-selection-chrome]')
        if (!el) return null
        return {
            strokes: Array.from(el.querySelectorAll('[stroke]')).map((n) =>
                n.getAttribute('stroke')
            ),
        }
    })

    expect(chrome, 'the selection overlay should be mounted').not.toBeNull()
    // HANDLE_STROKE in constants/misc — the colour vertexHandles rings route
    // and area dots with.
    expect(chrome.strokes).toContain('#6965db')
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
        await expect(page.locator('[aria-label="Radius Map"]')).toHaveCount(0)
        await expect(page.locator('[aria-label="Area"]')).toHaveCount(0)

        const slot = page.locator('[aria-label="Shapes"]')
        await expect(slot).toHaveCount(1)
        // The trigger carries the circle icon, not the polygon one.
        await expect(
            slot.locator('title', { hasText: 'Radius Map' })
        ).toHaveCount(1)

        await slot.tap()
        await expect(page.locator('[aria-label="Area"]')).toHaveCount(1)
        await expect(page.locator('[aria-label="Radius Map"]')).toHaveCount(1)
    })
})
