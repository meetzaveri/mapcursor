import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    placePoint,
    clickPointerTool,
    dragSelectArea,
    getDraftComponents,
} from './helpers/index.js'

const draftList = async (page) =>
    Object.values((await getDraftComponents(page)) ?? {})

async function waitForCount(page, n) {
    await expect.poll(async () => (await draftList(page)).length, {
        timeout: 10_000,
    }).toBe(n)
    return draftList(page)
}

async function marquee(page, box) {
    await page.keyboard.down('Shift')
    await dragSelectArea(
        page,
        {
            startX: box.x + 180,
            startY: box.y + 200,
            endX: box.x + 520,
            endY: box.y + 420,
        },
        { timeout: 10_000 }
    )
    await page.keyboard.up('Shift')
    await page.waitForTimeout(300)
}

async function seedTwo(page) {
    const box = await getCanvasBox(page)
    await drawShape(page, 'circle', {
        startX: box.x + 290,
        startY: box.y + 310,
        endX: box.x + 340,
        endY: box.y + 310,
    })
    await placePoint(page, {
        x: box.x + 440,
        y: box.y + 310,
        label: 'Pin',
    })
    await clickPointerTool(page)
    return box
}

test.describe('group selection', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('shift+drag marquees both elements into a group', async ({ page }) => {
        const box = await seedTwo(page)
        await waitForCount(page, 2)

        await marquee(page, box)

        const grouped = await page.evaluate(
            () =>
                (window.__mcTwo?.scene?.children ?? []).filter(
                    (c) => c?.elementData?.componentType === 'groupobject'
                ).length
        )
        expect(grouped).toBe(1)
    })

    test('a group move relocates every member in the store', async ({ page }) => {
        const box = await seedTwo(page)
        const before = await waitForCount(page, 2)
        const originBefore = Object.fromEntries(
            before.map((r) => [r.id, { x: r.x, y: r.y }])
        )

        await marquee(page, box)

        const from = { x: box.x + 390, y: box.y + 240 }
        await page.mouse.move(from.x, from.y)
        await page.mouse.down()
        await page.mouse.move(from.x + 120, from.y + 60, { steps: 12 })
        await page.mouse.up()
        await page.waitForTimeout(800)

        const after = await draftList(page)
        expect(after).toHaveLength(2)
        const deltas = after.map((r) => ({
            dx: r.x - originBefore[r.id].x,
            dy: r.y - originBefore[r.id].y,
        }))
        expect(deltas.every((d) => Math.abs(d.dx) > 20)).toBe(true)
        expect(Math.abs(deltas[0].dx - deltas[1].dx)).toBeLessThan(2)
        expect(Math.abs(deltas[0].dy - deltas[1].dy)).toBeLessThan(2)
    })
})
