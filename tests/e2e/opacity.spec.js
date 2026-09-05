// The opacity control, and — just as deliberately — where it is absent.
//
// Opacity is per-element only: `applyProperty` skips the `useElementDefaults`
// sync for it, so dimming one element must never seed the next one. That is
// load-bearing rather than fussy — a default of 0 would make every later
// element invisible with no way to see what you were editing.
//
// A circle omits the section entirely. It is created half-transparent so the
// basemap reads through it, and that is the behaviour, not a knob — omitting
// the section from its property set IS how the control is hidden, the same
// mechanism used for point/area/route.

import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    drawPencilStroke,
    clickPointerTool,
    getDraftComponents,
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

    test('a pencil stroke takes an opacity, and it persists', async ({ page }) => {
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
        // The section only renders for sets that declare it.
        await page.waitForSelector('#floating-toolbar #slider-main')

        // Drag the handle to the track's midpoint. The ranger snaps to a 0.1
        // step over [0, 1], so the midpoint commits 0.5 — and the drag runs
        // BOTH paths a user does: live preview on every move, commit on release.
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
        await page.mouse.move(track.x + track.width * 0.5, y, { steps: 12 })
        await page.mouse.up()

        await expect
            .poll(async () => (await recordsOf(page, 'pencil'))[0]?.opacity, {
                timeout: 10_000,
            })
            .toBeCloseTo(0.5, 1)
    })

    test('a circle offers no opacity control', async ({ page }) => {
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
        await page.waitForSelector('#floating-toolbar #stroke-width-section')

        // Its own controls are there, but opacity is not one of them.
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
})
