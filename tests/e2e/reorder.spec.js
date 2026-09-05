// Z-order: Bring Forward / Bring to Front / Send Backward / Send to Back.
//
// Three circles are drawn left-to-right so each is clickable on its own centre.
// New elements stack on top (position = max+1), so the initial z-order,
// back→front, is the insertion order: [a, b, c].
//
// Assertions read the RENDERED SVG, not the store. Each element is a sibling
// <g data-component-id> under the Two.js scene root, and reconcileZOrder
// physically reorders those siblings — so document order IS z-order.
//
// Shortcuts: bare [ / ] step backward/forward, ⌘[ / ⌘] jump to back/front. The
// handler accepts metaKey OR ctrlKey, so Meta works on Linux CI too.

import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    clickPointerTool,
} from './helpers/index.js'

const HALF = 40

async function setupThreeCircles(page) {
    const box = await getCanvasBox(page)
    const cy = box.y + box.height * 0.6
    const centres = {
        a: box.x + box.width * 0.3,
        b: box.x + box.width * 0.5,
        c: box.x + box.width * 0.7,
    }
    const drawAt = (key) =>
        drawShape(page, 'circle', {
            startX: centres[key] - HALF,
            startY: cy - HALF,
            endX: centres[key] + HALF,
            endY: cy + HALF,
        })

    const handles = { a: await drawAt('a'), b: await drawAt('b'), c: await drawAt('c') }
    const ids = {
        a: await handles.a.getAttribute('data-component-id'),
        b: await handles.b.getAttribute('data-component-id'),
        c: await handles.c.getAttribute('data-component-id'),
    }
    return { handles, ids }
}

/** Document (z) order of our three circles, back→front. */
async function zOrder(page, ids) {
    const order = await page.$$eval(
        '#main-two-root svg [data-component-id]',
        (els) => els.map((e) => e.getAttribute('data-component-id'))
    )
    const byId = { [ids.a]: 'a', [ids.b]: 'b', [ids.c]: 'c' }
    return order.filter((id) => byId[id]).map((id) => byId[id])
}

// Selecting waits for the floating toolbar, which is what proves
// selectionController.currentGroup is set — the reorder shortcuts read it.
async function selectCircle(page, handle) {
    await clickPointerTool(page)
    const b = await handle.boundingBox()
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForSelector('#floating-toolbar')
}

test.describe('z-order', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('insertion order is the initial z-order, back to front', async ({ page }) => {
        const { ids } = await setupThreeCircles(page)
        expect(await zOrder(page, ids)).toEqual(['a', 'b', 'c'])
    })

    test('Bring Forward moves a ahead of b, still behind c', async ({ page }) => {
        const { handles, ids } = await setupThreeCircles(page)
        await selectCircle(page, handles.a)
        await page.keyboard.press(']')
        await expect.poll(() => zOrder(page, ids)).toEqual(['b', 'a', 'c'])
    })

    test('Bring to Front moves a ahead of both', async ({ page }) => {
        const { handles, ids } = await setupThreeCircles(page)
        await selectCircle(page, handles.a)
        await page.keyboard.press('Meta+]')
        await expect.poll(() => zOrder(page, ids)).toEqual(['b', 'c', 'a'])
    })

    test('Send Backward steps a back one', async ({ page }) => {
        const { handles, ids } = await setupThreeCircles(page)
        await selectCircle(page, handles.a)
        // a starts backmost, so make a backward step meaningful first.
        await page.keyboard.press('Meta+]')
        await expect.poll(() => zOrder(page, ids)).toEqual(['b', 'c', 'a'])

        await page.keyboard.press('[')
        await expect.poll(() => zOrder(page, ids)).toEqual(['b', 'a', 'c'])
    })

    test('Send to Back returns a behind both', async ({ page }) => {
        const { handles, ids } = await setupThreeCircles(page)
        await selectCircle(page, handles.a)
        await page.keyboard.press('Meta+]')
        await expect.poll(() => zOrder(page, ids)).toEqual(['b', 'c', 'a'])

        await page.keyboard.press('Meta+[')
        await expect.poll(() => zOrder(page, ids)).toEqual(['a', 'b', 'c'])
    })
})
