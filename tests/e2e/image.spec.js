import { test, expect } from './helpers/test.js'
import {
    baseRow,
    getCanvasBox,
    GQL_MOCK_RESPONSES,
    readCamera,
    setupLocalBase,
} from './helpers/index.js'
import {
    assetCount,
    draftImages,
    dropFile,
    imageRect,
    insertImageViaToolbar,
    makePng,
    waitForDraftImages,
    waitForPaintedImage,
    IMAGE_GROUP,
    PENDING_NODE,
} from './helpers/images.js'
import { IMAGE_RESIST } from '../../src/constants/misc.ts'
const SELECTION_CHROME_ATTR = 'data-mc-selection-chrome'

const IMG_W = 400
const IMG_H = 300
const TOL = 3

async function placeByDrop(page) {
    const box = await getCanvasBox(page)
    const drop = {
        clientX: Math.round(box.x + box.width * 0.55),
        clientY: Math.round(box.y + box.height * 0.55),
    }
    await dropFile(page, await makePng(page, { width: IMG_W, height: IMG_H }), drop)
    await waitForPaintedImage(page)
    await waitForDraftImages(page, 1)
    return drop
}

async function zoom(page, deltaY, notches) {
    const box = await getCanvasBox(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    for (let i = 0; i < notches; i++) {
        await page.mouse.wheel(0, deltaY)
        await page.waitForTimeout(80)
    }
    await page.waitForTimeout(400)
}

test.describe('image elements', () => {
    test.beforeEach(async ({ page }) => {
        await setupLocalBase(page)
    })

    test('a dropped image lands at the drop point, at its natural size', async ({
        page,
    }) => {
        const drop = await placeByDrop(page)
        const r = await imageRect(page)
        expect(Math.abs(r.cx - drop.clientX)).toBeLessThanOrEqual(TOL)
        expect(Math.abs(r.cy - drop.clientY)).toBeLessThanOrEqual(TOL)
        expect(Math.abs(r.width - IMG_W)).toBeLessThanOrEqual(TOL)
        expect(Math.abs(r.height - IMG_H)).toBeLessThanOrEqual(TOL)
        await expect(page.locator(PENDING_NODE)).toHaveCount(0)
    })

    test('the toolbar tool places the image at the centre of the canvas', async ({
        page,
    }) => {
        await insertImageViaToolbar(
            page,
            await makePng(page, { width: IMG_W, height: IMG_H })
        )
        await waitForPaintedImage(page)
        const box = await getCanvasBox(page)
        const r = await imageRect(page)
        expect(Math.abs(r.cx - (box.x + box.width / 2))).toBeLessThanOrEqual(TOL)
        expect(Math.abs(r.cy - (box.y + box.height / 2))).toBeLessThanOrEqual(TOL)
        expect(r.top).toBeGreaterThan(box.y)
    })

    test('it scales with the map while zooming, not zoom-resistant', async ({
        page,
    }) => {
        await placeByDrop(page)
        const before = await imageRect(page)
        const scale0 = (await page.evaluate(readCamera)).scale

        await zoom(page, 400, 6)
        const scale1 = (await page.evaluate(readCamera)).scale
        expect(scale1).toBeLessThan(scale0 * 0.6)
        const zoomedOut = await imageRect(page)

        const expected = before.width * (scale1 / scale0) ** (1 - IMAGE_RESIST)
        expect(Math.abs(zoomedOut.width - expected)).toBeLessThanOrEqual(TOL)
        expect(zoomedOut.width).toBeLessThan(before.width * 0.6)

        await zoom(page, -400, 6)
        const back = await imageRect(page)
        const scale2 = (await page.evaluate(readCamera)).scale
        const expectedBack = before.width * (scale2 / scale0) ** (1 - IMAGE_RESIST)
        expect(Math.abs(back.width - expectedBack)).toBeLessThanOrEqual(TOL)
    })

    test('selected while zoomed far out, it still shows four corner handles', async ({
        page,
    }) => {
        const box = await getCanvasBox(page)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        for (let i = 0; i < 46; i++) {
            await page.mouse.wheel(0, 400)
            await page.waitForTimeout(40)
        }
        await page.waitForTimeout(500)
        expect((await page.evaluate(readCamera)).scale).toBeLessThan(0.006)

        await placeByDrop(page)
        const r = await imageRect(page)
        await page.mouse.click(r.cx, r.cy)
        await page.waitForSelector('.shape-selected')

        const dots = await page.evaluate((attr) =>
            Array.from(document.querySelectorAll(`[${attr}] path`))
                .map((el) => el.getBoundingClientRect())
                .filter((b) => b.width > 4 && b.width < 20 && Math.abs(b.width - b.height) < 1)
                .map((b) => ({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 })),
            SELECTION_CHROME_ATTR
        )
        const corners = [
            [r.left, r.top],
            [r.right, r.top],
            [r.right, r.bottom],
            [r.left, r.bottom],
        ]
        for (const [x, y] of corners) {
            expect(
                dots.some((d) => Math.abs(d.cx - x) <= 6 && Math.abs(d.cy - y) <= 6),
                `no handle at corner (${Math.round(x)}, ${Math.round(y)})`
            ).toBe(true)
        }
    })

    test('a corner resize sticks, and a reload restores the bitmap', async ({
        page,
    }) => {
        await placeByDrop(page)
        const r = await imageRect(page)
        await page.mouse.click(r.cx, r.cy)
        await page.waitForSelector('.shape-selected')

        await page.mouse.move(r.right + 5, r.bottom + 5)
        await page.mouse.down()
        await page.mouse.move(r.right + 65, r.bottom + 45, { steps: 8 })
        await page.mouse.move(r.right + 125, r.bottom + 85, { steps: 8 })
        await page.mouse.up()

        await page.waitForFunction(
            (w) => {
                const raw = localStorage.getItem('mapcursor_local_draft')
                const img = Object.values(JSON.parse(raw).components).find(
                    (c) => c.componentType === 'image'
                )
                return img && img.width > w
            },
            IMG_W
        )
        const [resized] = await draftImages(page)
        expect(resized.width).toBeGreaterThan(IMG_W + 60)

        await page.reload()
        await waitForPaintedImage(page)
        const after = await imageRect(page)
        expect(Math.abs(after.width - resized.width)).toBeLessThanOrEqual(TOL)
        expect(await assetCount(page)).toBe(1)
    })

    test('Shift + eraser keeps the image; a plain eraser removes it', async ({
        page,
    }) => {
        await placeByDrop(page)
        const r = await imageRect(page)
        await page.click('[aria-label="Eraser"]')

        const sweep = async (shift) => {
            if (shift) await page.keyboard.down('Shift')
            await page.mouse.move(r.cx - 40, r.cy)
            await page.mouse.down()
            await page.mouse.move(r.cx + 40, r.cy, { steps: 10 })
            await page.mouse.up()
            if (shift) await page.keyboard.up('Shift')
            await page.waitForTimeout(1400)
        }

        await sweep(true)
        await expect(page.locator(IMAGE_GROUP)).toHaveCount(1)
        await sweep(false)
        await expect(page.locator(IMAGE_GROUP)).toHaveCount(0)
    })

    test('a JSON export carries the image bytes', async ({ page }) => {
        await placeByDrop(page)
        const [record] = await draftImages(page)
        const assetId = record.metadata.properties.image.assetId

        await page.click('[title="Menu"]')
        await page.getByText('Export canvas').click()
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByText('Export as JSON').click(),
        ])
        const fs = await import('node:fs')
        const file = JSON.parse(fs.readFileSync(await download.path(), 'utf8'))
        expect(file.formatVersion).toBe('2.1')
        expect(file.assets?.[assetId]).toMatch(/^data:image\/png;base64,/)
    })
})

test('a shared canvas does not offer the Image tool', async ({ page }) => {
    const BASE_ID = '22222222-2222-2222-2222-222222222222'
    await page.route('**/v1/graphql', async (route) => {
        const body = JSON.parse(route.request().postData() || '{}')
        const data =
            body.operationName === 'getComponentsForBase'
                ? {
                      base: baseRow({
                          id: BASE_ID,
                          anchor: { lngLat: [72.5714, 23.0225], zoom: 16 },
                      }),
                      components: [],
                      legendPresets: [],
                      metaProperties: [],
                  }
                : (GQL_MOCK_RESPONSES[body.operationName] ?? {})
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(() => localStorage.setItem('userId', 'test-user-id'))
    await page.goto(`/map/${BASE_ID}`)
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
    await expect(page.locator('[aria-label="Eraser"]')).toHaveCount(1)
    await expect(page.locator('[aria-label="Image"]')).toHaveCount(0)
})
