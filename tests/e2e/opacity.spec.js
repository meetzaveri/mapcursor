// The opacity control, and — just as deliberately — where it is absent.
//
// Opacity is per-element only: `applyProperty` skips the `useElementDefaults`
// sync for it, so dimming one element must never seed the next one. That is
// load-bearing rather than fussy — a default of 0 would make every later
// element invisible with no way to see what you were editing.
//
// Only an area carries the control, and on an area it means the FILL's
// opacity: the interior fades, the border always paints at full strength, and
// at 100% the fill hides what is under it. An area with no value
// of its own is a half-strength fill, as areas have always been drawn.
//
// A circle (radius map) is created half-transparent so the basemap reads
// through it, and has no control to change that. A point and a route omit the
// section too: leaving it out of their property set IS how the control is
// hidden.
//
// Pencil, text and image have the control hidden for now. Their opacity paths
// are kept (see SETS in elementProperties.tsx), so it is a list entry away.

import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    drawPencilStroke,
    clickPointerTool,
    getDraftComponents,
    drawArea,
} from './helpers/index.js'

const recordsOf = async (page, type) => {
    const draft = await getDraftComponents(page)
    return Object.values(draft ?? {}).filter((c) => c.componentType === type)
}

// The draft writer is debounced, so a read taken straight after a gesture sees
// the PREVIOUS draft. Poll until the record shows up.
async function waitForRecords(page, type, count) {
    await expect.poll(async () => (await recordsOf(page, type)).length, {
        timeout: 10_000,
    }).toBe(count)
    return recordsOf(page, type)
}

test.describe('opacity', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('a pencil stroke offers no opacity control', async ({ page }) => {
        const box = await getCanvasBox(page)
        await drawPencilStroke(page, {
            startX: box.x + 250,
            startY: box.y + 250,
            endX: box.x + 430,
            endY: box.y + 340,
        })
        await clickPointerTool(page)

        const [stroke] = await waitForRecords(page, 'pencil', 1)
        await page.evaluate((id) => {
            window.dispatchEvent(
                new CustomEvent('selectComponent', { detail: { id } })
            )
        }, stroke.id)
        // Its panel is up, with its stroke controls and nothing to dim it by.
        await page.waitForSelector('#floating-toolbar #stroke-width-section')
        await expect(
            page.locator('#floating-toolbar #slider-main')
        ).toHaveCount(0)
    })

    test('a circle has no opacity control', async ({ page }) => {
        const box = await getCanvasBox(page)
        const circle = await drawShape(page, 'circle', {
            startX: box.x + 260,
            startY: box.y + 200,
            endX: box.x + 400,
            endY: box.y + 340,
        })
        await clickPointerTool(page)
        const b = await circle.boundingBox()
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
        // Fill, not stroke width: a radius map is borderless, so its panel
        // carries no stroke controls at all (see SETS.CIRCLE).
        await page.waitForSelector('#floating-toolbar [data-section="fill"]')

        // Its 50% is the mark, not a setting (see SETS.CIRCLE).
        await expect(
            page.locator('#floating-toolbar #slider-main')
        ).toHaveCount(0)
    })

    test('a circle is created half-transparent so the basemap reads through', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 260,
            startY: box.y + 200,
            endX: box.x + 400,
            endY: box.y + 340,
        })
        await expect
            .poll(async () => (await recordsOf(page, 'circle'))[0]?.opacity, {
                timeout: 10_000,
            })
            .toBeCloseTo(0.5, 2)
    })

    test('an area\'s opacity is its fill\'s; the border stays at 100%', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        const cx = box.x + box.width * 0.5
        const cy = box.y + box.height * 0.6
        await drawArea(page, [
            { x: cx - 80, y: cy - 60 },
            { x: cx + 80, y: cy - 60 },
            { x: cx, y: cy + 60 },
        ])
        // Select it by clicking its top edge.
        await clickPointerTool(page)
        await page.mouse.click(cx - 40, cy - 59)
        await page.waitForSelector('#floating-toolbar #slider-main')

        // What the area paints: its group, its path and the path's fill.
        const painted = () =>
            page.evaluate(() => {
                const g = Array.from(window.__mcTwo.scene.children).find(
                    (c) => c?.elementData?.componentType === 'area'
                )
                const path = g?.children?.[0]
                return {
                    groupOpacity: g?.opacity,
                    pathOpacity: path?.opacity,
                    fill: String(path?.fill),
                    stroke: String(path?.stroke),
                }
            })

        // Created as the half-strength fill areas have always had.
        const before = await painted()
        expect(before.fill).toMatch(/,0\.5\)$/)

        // Drag the knob past the end of the track: 100%.
        await page
            .locator('#floating-toolbar #slider-handle')
            .scrollIntoViewIfNeeded()
        const track = await page
            .locator('#floating-toolbar #slider-main')
            .boundingBox()
        const knob = await page
            .locator('#floating-toolbar #slider-handle')
            .boundingBox()
        const y = knob.y + knob.height / 2
        await page.mouse.move(knob.x + knob.width / 2, y)
        await page.mouse.down()
        await page.mouse.move(track.x + track.width + 20, y, { steps: 12 })
        await page.mouse.up()

        await expect
            .poll(async () => (await recordsOf(page, 'area'))[0]?.opacity, {
                timeout: 10_000,
            })
            .toBe(1)
        const after = await painted()
        // A fully opaque interior: nothing behind it shows through.
        expect(after.fill).toMatch(/,1\)$/)
        // Nothing dims the whole area, so the border is untouched.
        expect(after.groupOpacity).toBe(1)
        expect(after.pathOpacity).toBe(1)
        expect(after.stroke).toBe(before.stroke)
    })
})
