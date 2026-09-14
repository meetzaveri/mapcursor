// Copy and paste (Cmd/Ctrl+C, Cmd/Ctrl+V).
//
// The clipboard clones a record, re-keys its id, offsets it and hands the
// selection to the clone. Two things make it worth testing per element type
// rather than once: the absolute-vertex family (area, route, pencil) stores its
// geometry in `metadata` and is positioned off `vertexMetadataCenter` rather
// than x/y, and a point carries its label in metadata too. A clone that keeps
// the source's id, or lands back on the source's coordinates, looks identical
// on screen until you move one of them.

import { test, expect } from './helpers/test.js'
import {
    setupLocalBase,
    getCanvasBox,
    drawShape,
    drawPencilStroke,
    placePoint,
    drawArea,
    drawRoute,
    clickPointerTool,
    expectComponentCount,
    getDraftComponents,
} from './helpers/index.js'

const recordsOf = async (page, type) => {
    const draft = await getDraftComponents(page)
    return Object.values(draft ?? {}).filter((c) => c.componentType === type)
}

// useLocalDraftPersistence debounces its writes, so a read taken straight after
// a gesture sees the PREVIOUS draft. Poll until the expected count lands.
async function waitForRecords(page, type, count) {
    await expect.poll(async () => (await recordsOf(page, type)).length, {
        timeout: 10_000,
    }).toBe(count)
    return recordsOf(page, type)
}

async function copyPaste(page) {
    await page.keyboard.press('Meta+c')
    await page.waitForTimeout(150)
    await page.keyboard.press('Meta+v')
    await page.waitForTimeout(600)
}

test.describe('copy/paste', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('a circle clones to a second, independent record', async ({ page }) => {
        const box = await getCanvasBox(page)
        const circle = await drawShape(page, 'circle', {
            startX: box.x + 260,
            startY: box.y + 200,
            endX: box.x + 380,
            endY: box.y + 320,
        })
        await clickPointerTool(page)
        const b = await circle.boundingBox()
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
        await page.waitForSelector('#floating-toolbar')

        await copyPaste(page)
        await expectComponentCount(page, 2)

        const circles = await waitForRecords(page, 'circle', 2)
        // Distinct ids, or the two are the same row and one will vanish on load.
        expect(new Set(circles.map((c) => c.id)).size).toBe(2)
    })

    test('a point clones with its label', async ({ page }) => {
        const box = await getCanvasBox(page)
        await placePoint(page, {
            x: box.x + 320,
            y: box.y + 260,
            label: 'The Old Peacock',
        })
        await clickPointerTool(page)
        await page.mouse.click(box.x + 320, box.y + 260)
        await page.waitForTimeout(300)

        await copyPaste(page)

        const points = await waitForRecords(page, 'point', 2)
        expect(new Set(points.map((p) => p.id)).size).toBe(2)
        // The label rides in metadata; a clone that drops it is a blank pin.
        expect(
            points.every(
                (p) => p.metadata?.properties?.label === 'The Old Peacock'
            )
        ).toBe(true)
    })

    for (const [type, draw] of Object.entries({
        area: (page, box) =>
            drawArea(page, [
                { x: box.x + 240, y: box.y + 200 },
                { x: box.x + 420, y: box.y + 220 },
                { x: box.x + 360, y: box.y + 360 },
            ]),
        route: (page, box) =>
            drawRoute(page, [
                { x: box.x + 220, y: box.y + 180 },
                { x: box.x + 380, y: box.y + 260 },
                { x: box.x + 520, y: box.y + 200 },
            ]),
        pencil: (page, box) =>
            drawPencilStroke(page, {
                startX: box.x + 250,
                startY: box.y + 250,
                endX: box.x + 420,
                endY: box.y + 330,
            }),
    })) {
        test(`a ${type} clones its vertex geometry to a new position`, async ({
            page,
        }) => {
            const box = await getCanvasBox(page)
            await draw(page, box)
            await clickPointerTool(page)

            const [source] = await waitForRecords(page, type, 1)

            // Select through the rendered node — these are paths, so a centre
            // click on the bounding box can miss the stroke entirely.
            await page.evaluate((id) => {
                window.dispatchEvent(
                    new CustomEvent('selectComponent', { detail: { id } })
                )
            }, source.id)
            await page.waitForTimeout(400)

            await copyPaste(page)

            const all = await waitForRecords(page, type, 2)
            expect(new Set(all.map((r) => r.id)).size).toBe(2)

            // These types own their geometry in `metadata`, so the clone's
            // vertices — not its x/y — are what must have moved.
            const verts = all.map((r) =>
                r.metadata?.geometry?.coordinates ?? null
            )
            expect(verts.every(Boolean)).toBe(true)
            expect(JSON.stringify(verts[0])).not.toEqual(JSON.stringify(verts[1]))
        })
    }
})
