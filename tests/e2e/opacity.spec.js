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
        await page.waitForSelector('#floating-toolbar [data-section="fill"]')

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
        await clickPointerTool(page)
        await page.mouse.click(cx - 40, cy - 59)
        await page.waitForSelector('#floating-toolbar #slider-main')

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

        const before = await painted()
        expect(before.fill).toMatch(/,0\.5\)$/)

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
        expect(after.fill).toMatch(/,1\)$/)
        expect(after.groupOpacity).toBe(1)
        expect(after.pathOpacity).toBe(1)
        expect(after.stroke).toBe(before.stroke)
    })
})
