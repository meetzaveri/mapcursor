// Undo and redo, across every element mapcursor can author.
//
// The history stack is one shared mechanism, but each element type reaches it
// through its own creation path — a point commits from its label editor, a
// route from a multi-click finish, a circle from a drag, a pencil from a
// pointer stream. A regression usually breaks one path and leaves the others
// alone, which is why this walks all of them rather than trusting one.
//
// Assertions count rendered `[data-component-id]` nodes rather than reading the
// local draft. The draft writer skips an EMPTY store (`useLocalDraftPersistence`
// returns early rather than writing `{}`), so undoing the only element on the
// canvas leaves the previous draft in place — a real behaviour, but it makes the
// draft useless as an oracle for "is it gone".
//
// UNDO DEPTH IS NOT 1 FOR EVERY TYPE, and that is the trap this spec exists to
// pin down. The elements that open an editor when they land record their
// creation as several history entries — text is ADD (toolbar click seeds it
// off-screen) + UNDO_VERTICES (the click that positions it) + UPDATE_BULK (the
// editor commit writing width/height/metadata) — and only the last pop removes
// the element. A point is the same shape of thing.
//
// The second half of the trap: an open text editor SWALLOWS Cmd+Z on purpose,
// so the keystroke reaches the browser's native text undo instead of the canvas.
// A test that places text and immediately hits undo therefore does nothing at
// all, forever, and reads like a broken undo stack. Dismiss the editor first,
// the way a user would.

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

/** Draw one element of `type` at a fixed spot on the canvas. */
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
            // Placing text auto-opens its editor with focus, and canvas undo
            // stands down while a text field is focused. Dismiss it the way a
            // user would, so the next Cmd+Z is a canvas undo.
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

// How many undos it takes to unmake one element of each type — see the note at
// the top. A drag- or click-committed element is a single ADD; the two that
// open an editor cost three.
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
