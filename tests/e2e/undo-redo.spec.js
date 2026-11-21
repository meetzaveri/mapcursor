import { test } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    drawPencilStroke,
    placeText,
    placePoint,
    drawArea,
    drawRoute,
    expectComponentCount,
    triggerUndoKeyboard,
    triggerRedoKeyboard,
} from './helpers/index.js'

async function draw(page, type) {
    const box = await getCanvasBox(page)
    const at = (dx, dy) => ({ x: box.x + dx, y: box.y + dy })
    switch (type) {
        case 'point':
            return placePoint(page, { ...at(300, 240), label: 'Pin' })
        case 'area':
            return drawArea(page, [at(240, 200), at(420, 220), at(360, 360)])
        case 'route':
            return drawRoute(page, [at(220, 180), at(380, 260), at(520, 200)])
        case 'circle':
            return drawShape(page, 'circle', {
                startX: box.x + 260,
                startY: box.y + 200,
                endX: box.x + 400,
                endY: box.y + 340,
            })
        case 'pencil':
            return drawPencilStroke(page, {
                startX: box.x + 250,
                startY: box.y + 250,
                endX: box.x + 420,
                endY: box.y + 330,
            })
        case 'text': {
            await placeText(page, at(300, 300))
            await page.waitForSelector('.temp-input-area')
            await page.keyboard.press('Escape')
            await page
                .locator('.temp-input-area')
                .waitFor({ state: 'detached' })
            return
        }
        default:
            throw new Error(`no draw gesture for ${type}`)
    }
}

const UNDO_DEPTH = {
    area: 1,
    route: 1,
    circle: 1,
    pencil: 1,
    point: 3,
    text: 3,
}

for (const [type, depth] of Object.entries(UNDO_DEPTH)) {
    test(`undo removes a ${type}, redo puts it back`, async ({ page }) => {
        await setupLocalBase(page)

        await draw(page, type)
        await expectComponentCount(page, 1)

        for (let i = 0; i < depth; i += 1) await triggerUndoKeyboard(page)
        await expectComponentCount(page, 0)

        await triggerRedoKeyboard(page)
        await expectComponentCount(page, 1)
    })
}
