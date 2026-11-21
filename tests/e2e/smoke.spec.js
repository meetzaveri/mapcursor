import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    drawPencilStroke,
    placeText,
    placePoint,
    drawArea,
    drawRoute,
    getDraftComponents,
} from './helpers/index.js'

async function typesInDraft(page) {
    const draft = await getDraftComponents(page)
    return [...new Set(Object.values(draft ?? {}).map((c) => c.componentType))]
}

test.describe('every tool draws', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('point', async ({ page }) => {
        const box = await getCanvasBox(page)
        await placePoint(page, {
            x: box.x + 300,
            y: box.y + 240,
            label: 'The Old Peacock',
        })
        await expect.poll(() => typesInDraft(page)).toContain('point')
    })

    test('area', async ({ page }) => {
        const box = await getCanvasBox(page)
        await drawArea(page, [
            { x: box.x + 240, y: box.y + 200 },
            { x: box.x + 420, y: box.y + 220 },
            { x: box.x + 360, y: box.y + 360 },
        ])
        await expect.poll(() => typesInDraft(page)).toContain('area')
    })

    test('route', async ({ page }) => {
        const box = await getCanvasBox(page)
        await drawRoute(page, [
            { x: box.x + 220, y: box.y + 180 },
            { x: box.x + 380, y: box.y + 260 },
            { x: box.x + 520, y: box.y + 200 },
        ])
        await expect.poll(() => typesInDraft(page)).toContain('route')
    })

    test('circle', async ({ page }) => {
        const box = await getCanvasBox(page)
        await drawShape(page, 'circle', {
            startX: box.x + 260,
            startY: box.y + 200,
            endX: box.x + 400,
            endY: box.y + 340,
        })
        await expect.poll(() => typesInDraft(page)).toContain('circle')
    })

    test('pencil', async ({ page }) => {
        const box = await getCanvasBox(page)
        await drawPencilStroke(page, {
            startX: box.x + 250,
            startY: box.y + 250,
            endX: box.x + 420,
            endY: box.y + 330,
        })
        await expect.poll(() => typesInDraft(page)).toContain('pencil')
    })

    test('text', async ({ page }) => {
        const box = await getCanvasBox(page)
        await placeText(page, { x: box.x + 300, y: box.y + 300 })
        await expect.poll(() => typesInDraft(page)).toContain('text')
    })
})
