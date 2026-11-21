import { test, expect } from './helpers/test.js'
import {
    baseRow,
    GQL_MOCK_RESPONSES,
    getCanvasBox,
    drawShape,
    getDraftComponents,
    setupLocalBase,
    triggerUndoKeyboard,
} from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }

async function openMapBase(page) {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data =
                body.operationName === 'getComponentsForBase'
                    ? {
                          base: baseRow({ id: BASE_ID, anchor: ANCHOR }),
                          components: [],
                      }
                    : (GQL_MOCK_RESPONSES[body.operationName] ?? {})
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(() => {
        localStorage.setItem('userId', 'test-user-id')
        localStorage.setItem('mapcursor_welcome_dismissed', '1')
        localStorage.setItem('mapcursor_text_zoom_hint_dismissed', '1')
    })
    await page.goto(`/map/${BASE_ID}`)
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
    await page.evaluate(() => {
        const two = window.__mcTwo
        two.scene.translation.set(0, 0)
        two.scene.scale = 1
        two.update()
    })
    await page.waitForTimeout(300)
}

const CIRCLE = { startX: 300, startY: 250, endX: 460, endY: 410 }

const SMALL_CIRCLE = { startX: 300, startY: 250, endX: 321, endY: 271 }

const TIGHT_LABEL = '131212 212121 21'

const LONG_LABEL =
    'Warehouse district catchment area north of the rail yard'

const INK = '#0065FF'

async function drawCircle(page, spec = CIRCLE) {
    const box = await getCanvasBox(page)
    await drawShape(page, 'circle', {
        startX: box.x + spec.startX,
        startY: box.y + spec.startY,
        endX: box.x + spec.endX,
        endY: box.y + spec.endY,
    })
    return { x: box.x + spec.startX, y: box.y + spec.startY }
}

async function nameCircle(page, centre, text) {
    await page.mouse.dblclick(centre.x, centre.y)
    const editor = page.locator('textarea.temp-input-area')
    await editor.waitFor({ state: 'visible', timeout: 15_000 })
    await editor.fill(text)
    await page.mouse.click(centre.x + 320, centre.y + 220)
    await editor.waitFor({ state: 'detached', timeout: 10_000 })
    await page.waitForTimeout(200)
}

const readCircle = (page) =>
    page.evaluate(() => {
        const g = Array.from(window.__mcTwo.scene.children).find(
            (c) => c?.elementData?.componentType === 'circle'
        )
        if (!g) return null
        const layer = Array.from(g.children).find(
            (c) => c?.__mcCircleLabel === true
        )
        const lines = layer
            ? Array.from(layer.children)
                  .filter((c) => typeof c?.value === 'string')
                  .map((c) => c.value)
            : []
        const first = layer
            ? Array.from(layer.children).find(
                  (c) => typeof c?.value === 'string'
              )
            : null
        return {
            id: g.elementData.id,
            label: g.elementData.metadata?.properties?.label ?? null,
            textColor: g.elementData.textColor ?? null,
            fill: g.elementData.fill ?? null,
            stroke: g.elementData.stroke ?? null,
            paintedFill: g.children?.[0]?.fill ?? null,
            paintedStroke: g.children?.[0]?.stroke ?? null,
            paintedInk: first?.fill ?? null,
            metadataTextFill: g.elementData.metadata?.properties?.textFill,
            width: g.elementData.width,
            height: g.elementData.height,
            paintedWidth: g.children?.[0]?.width ?? null,
            ringLinewidth: g.children?.[0]?.linewidth ?? null,
            labelScale: typeof layer?.scale === 'number' ? layer.scale : null,
            lines,
        }
    })

async function setZoom(page, scale) {
    await page.evaluate((s) => {
        const two = window.__mcTwo
        two.scene.scale = s
        two.update()
        window.dispatchEvent(
            new CustomEvent('zoomChanged', { detail: { scale: s } })
        )
    }, scale)
    await page.waitForTimeout(150)
}

test.describe('the map circle label', () => {
    test('names a circle', async ({ page }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')

        const rec = await readCircle(page)
        expect(rec.label).toBe('Warehouse')
        expect(rec.lines).toEqual(['Warehouse'])
    })

    test('the name survives a reload', async ({ page }) => {
        await setupLocalBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')

        const rec = await readCircle(page)
        await expect
            .poll(
                async () =>
                    (await getDraftComponents(page))?.[rec.id]?.metadata
                        ?.properties?.label,
                { timeout: 10_000 }
            )
            .toBe('Warehouse')

        await page.reload()
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
        await expect
            .poll(async () => (await readCircle(page))?.lines, {
                timeout: 15_000,
            })
            .toEqual(['Warehouse'])
    })

    test('naming a circle never changes its radius', async ({ page }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)

        const before = await readCircle(page)
        await nameCircle(page, centre, LONG_LABEL)
        const after = await readCircle(page)

        expect(after.lines.length).toBeGreaterThan(1)
        expect(after.width).toBe(before.width)
        expect(after.height).toBe(before.height)
        expect(after.paintedWidth).toBe(before.paintedWidth)
    })

    test('the wrap is fixed at the scale-1 reference, so zoom never re-flows it', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, LONG_LABEL)

        const atIdentity = (await readCircle(page)).lines
        expect(atIdentity.length).toBeGreaterThan(1)

        for (const scale of [0.0625, 0.25, 4, 16]) {
            await setZoom(page, scale)
            expect((await readCircle(page)).lines).toEqual(atIdentity)
        }
    })

    test('a tight circle wraps its name where the editor said it would', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page, SMALL_CIRCLE)

        await page.mouse.dblclick(centre.x, centre.y)
        const editor = page.locator('textarea.temp-input-area')
        await editor.waitFor({ state: 'visible', timeout: 15_000 })
        await editor.fill(TIGHT_LABEL)
        const editorLines = await editor.evaluate((el) => {
            const cs = getComputedStyle(el)
            return Math.round(el.scrollHeight / parseFloat(cs.lineHeight))
        })
        await page.mouse.click(centre.x + 320, centre.y + 220)
        await editor.waitFor({ state: 'detached', timeout: 10_000 })
        await page.waitForTimeout(200)

        const { lines, width } = await readCircle(page)
        expect(width).toBeLessThan(80)
        expect(lines).toEqual(['131212', '212121', '21'])
        expect(lines.length).toBe(editorLines)
    })

    test('the label scales with the map; the borderless disc has no stroke', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')

        await setZoom(page, 1)
        const at1 = await readCircle(page)
        await setZoom(page, 0.25)
        const zoomedOut = await readCircle(page)

        expect(at1.labelScale).toBeCloseTo(1, 5)
        expect(zoomedOut.labelScale).toBeCloseTo(1, 5)
        expect(at1.ringLinewidth).toBe(0)
        expect(zoomedOut.ringLinewidth).toBe(0)

    })

    test('the Radius Map panel restyles the label off the point ladder', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')

        await page.mouse.click(centre.x, centre.y)
        await page.waitForSelector('#floating-toolbar [data-section="fill"]')

        await page
            .locator('#floating-toolbar button[aria-label="Frutiger"]')
            .click()
        await page
            .locator('#floating-toolbar button:has-text("XL")')
            .first()
            .click()

        await expect
            .poll(async () => {
                const el = await page.evaluate(() => {
                    const n = Array.from(
                        document.querySelectorAll('text')
                    ).find((t) => t.textContent === 'Warehouse')
                    return n
                        ? {
                              family: n.getAttribute('font-family'),
                              size: Number(n.getAttribute('font-size')),
                          }
                        : null
                })
                return el
            })
            .toEqual({ family: 'Frutiger', size: 32 })

        const rec = await readCircle(page)
        expect(rec.width).toBe(rec.paintedWidth)
        expect(rec.width).toBe(rec.height)
    })

    test('the panel recolours the label, per record and reversibly', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')

        expect((await readCircle(page)).paintedInk).toBe('#000')

        await page.mouse.click(centre.x, centre.y)
        await page.waitForSelector('#floating-toolbar [data-section="fill"]')

        const picker = page.locator('#floating-toolbar [data-section="textColor"]')
        await picker.locator('button').first().click()
        await picker.locator(`button[title="${INK}"]`).first().click()

        await expect
            .poll(async () => (await readCircle(page)).paintedInk, {
                timeout: 10_000,
            })
            .toBe(INK)

        const recoloured = await readCircle(page)
        expect(recoloured.textColor).toBe(INK)
        expect(recoloured.metadataTextFill).toBeUndefined()

        expect(recoloured.width).toBe(recoloured.height)

        await triggerUndoKeyboard(page)
        await expect
            .poll(async () => (await readCircle(page)).paintedInk, {
                timeout: 10_000,
            })
            .toBe('#000')
    })

    test('the panel offers no Zoom resistant switch for a circle', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')

        await page.mouse.click(centre.x, centre.y)
        await page.waitForSelector('#floating-toolbar [data-section="fill"]')

        await expect(
            page.locator('#floating-toolbar #zoom-resist-toggle')
        ).toHaveCount(0)
    })

    test('undo puts the name back on screen, not just in the store', async ({
        page,
    }) => {
        await openMapBase(page)
        const centre = await drawCircle(page)
        await nameCircle(page, centre, 'Warehouse')
        await nameCircle(page, centre, 'Depot')
        expect((await readCircle(page)).lines).toEqual(['Depot'])

        await triggerUndoKeyboard(page)
        await page.waitForTimeout(400)

        await expect
            .poll(async () => (await readCircle(page))?.lines, {
                timeout: 10_000,
            })
            .toEqual(['Warehouse'])
    })
})
