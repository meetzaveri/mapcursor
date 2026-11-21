import { test, expect } from './helpers/test.js'
import {
    clickPointerTool,
    clickToolbarButton,
    drawPencilStroke,
    drawRoute,
    getCanvasBox,
    setupLocalBase,
    triggerUndoKeyboard,
} from './helpers/index.js'

const strokes = (page) =>
    page.evaluate(() => {
        const two = window.__mcTwo
        const scale = two.scene.scale
        return two.scene.children
            .filter((c) =>
                ['pencil', 'route'].includes(c.elementData?.componentType)
            )
            .map((g) => {
                const el = g.children[0]._renderer.elem
                const dash = el.getAttribute('stroke-dasharray')
                return {
                    id: g.elementData.id,
                    type: g.elementData.componentType,
                    width: Number(el.getAttribute('stroke-width')) * scale,
                    dash: dash
                        ? dash.split(/[ ,]+/).map((v) => Number(v) * scale)
                        : null,
                }
            })
    })

const visibleGap = (s) => (s.dash?.[1] ?? 0) - s.width

async function zoomBy(page, box, deltaY, notches) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    for (let i = 0; i < notches; i++) {
        await page.mouse.wheel(0, deltaY)
        await page.waitForTimeout(40)
    }
    await page.waitForTimeout(500)
}

async function chooseDashed(page) {
    await page.locator('#floating-toolbar button', { hasText: '- -' }).click()
}

test.describe('dashed map strokes', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('a dashed pencil drawn zoomed out is dashed, and stays dashed across zooms', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        await zoomBy(page, box, 400, 30)
        expect((await page.evaluate(() => window.__mcTwo.scene.scale))).toBeLessThan(0.05)

        await clickToolbarButton(page, 'Pencil')
        await chooseDashed(page)
        await drawPencilStroke(page, {
            startX: box.x + 300,
            startY: box.y + 220,
            endX: box.x + 700,
            endY: box.y + 260,
        })
        const [drawn] = await strokes(page)
        expect(drawn.dash, 'the dashed pencil rendered solid').not.toBeNull()
        expect(drawn.dash[0] + drawn.width).toBeGreaterThanOrEqual(7)
        expect(visibleGap(drawn)).toBeGreaterThanOrEqual(5)

        await zoomBy(page, box, -400, 12)
        const [zoomed] = await strokes(page)
        expect(zoomed.dash).not.toBeNull()
        expect(visibleGap(zoomed)).toBeGreaterThanOrEqual(5)
        expect(zoomed.dash[0]).toBeCloseTo(drawn.dash[0], 0)
    })

    test('the widest pencil and a route keep open gaps despite round caps', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        await clickToolbarButton(page, 'Pencil')
        await chooseDashed(page)
        await page.locator('#floating-toolbar [title="8px"]').click()
        await drawPencilStroke(page, {
            startX: box.x + 300,
            startY: box.y + 200,
            endX: box.x + 700,
            endY: box.y + 240,
        })
        await drawRoute(page, [
            { x: box.x + 300, y: box.y + 420 },
            { x: box.x + 700, y: box.y + 460 },
        ])
        const all = await strokes(page)
        expect(all.map((s) => s.type).sort()).toEqual(['pencil', 'route'])
        for (const s of all) {
            expect(s.dash, `${s.type} rendered solid`).not.toBeNull()
            expect(
                visibleGap(s),
                `${s.type} gaps closed up (${visibleGap(s)}px)`
            ).toBeGreaterThanOrEqual(5)
        }
    })

    test('switching a drawn stroke to dashed applies it, and undo restores solid', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        await zoomBy(page, box, 400, 30)
        await drawPencilStroke(page, {
            startX: box.x + 300,
            startY: box.y + 220,
            endX: box.x + 700,
            endY: box.y + 260,
        })
        const [solid] = await strokes(page)
        expect(solid.dash).toBeNull()

        await clickPointerTool(page)
        await page.evaluate((id) => {
            window.dispatchEvent(
                new CustomEvent('selectComponent', { detail: { id } })
            )
        }, solid.id)
        await chooseDashed(page)
        const [dashed] = await strokes(page)
        expect(dashed.dash, 'dashed was not applied to the drawn stroke').not.toBeNull()
        expect(visibleGap(dashed)).toBeGreaterThanOrEqual(5)

        await triggerUndoKeyboard(page)
        await page.waitForTimeout(300)
        const [undone] = await strokes(page)
        expect(undone.dash).toBeNull()
    })
})
