import { test, expect } from './helpers/test.js'
import { baseRow, GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }

const STYLED_ID = 'aaaaaaaa-3333-3333-3333-333333333333'
const PLAIN_ID = 'bbbbbbbb-4444-4444-4444-444444444444'
const STYLED_LABEL = 'Styled Pin'
const PLAIN_LABEL = 'Plain Pin'
const NEW_LABEL = 'Fresh Pin'
const MAP_TEXT_ID = 'cccccccc-5555-5555-5555-555555555555'
const MAP_TEXT = 'Map Label'

const DEFAULT_FAMILY = 'Avenir'
const DEFAULT_SIZE = 18
const LADDER_S = 14
const LADDER_XL = 32

const pointRecord = (id, label, metadata) => ({
    id,
    componentType: 'point',
    zoomResistant: null,
    children: null,
    ...pointAt(200, id === PLAIN_ID ? 360 : 200, { label, ...metadata }),
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    fill: '#FF5630',
    width: 20,
    height: 20,
    iconStroke: null,
    stroke: '#FF5630',
    linewidth: 2,
    strokeType: null,
    textColor: null,
    opacity: 1,
    position: 1,
    tailShapeId: null,
    tailEdge: null,
    headShapeId: null,
    headEdge: null,
    tailPortIndex: null,
    headPortIndex: null,
})

const geoTextRecord = (id, content) => ({
    id,
    componentType: 'text',
    zoomResistant: null,
    children: null,
    ...pointAt(200, 120, { content, fontSize: 24 }),
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    fill: 'transparent',
    width: 120,
    height: 36,
    iconStroke: null,
    stroke: null,
    linewidth: 2,
    strokeType: null,
    textColor: '#3A342C',
    opacity: 1,
    position: 1,
    tailShapeId: null,
    tailEdge: null,
    headShapeId: null,
    headEdge: null,
    tailPortIndex: null,
    headPortIndex: null,
})

async function openMapBase(page, components) {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data =
                body.operationName === 'getComponentsForBase'
                    ? {
                          base: baseRow({
                              id: BASE_ID,
                              anchor: ANCHOR,
                          }),
                          components,
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
    for (const label of components.map(
        (c) => c.metadata.properties.label || c.metadata.properties.content
    )) {
        await page.locator(`text=${label}`).first().waitFor({ timeout: 15_000 })
    }
}

const centerOffset = (page, label) =>
    page.evaluate((label) => {
        const text = Array.from(document.querySelectorAll('text')).find(
            (n) => n.textContent === label
        )
        if (!text) return null
        const group = text.closest('g[data-component-id]')
        const circle = group.querySelector('circle, ellipse, path')
        const cb = circle.getBoundingClientRect()

        const size = Number(text.getAttribute('font-size'))
        const family = text.getAttribute('font-family')
        const ctx = document.createElement('canvas').getContext('2d')
        ctx.font = `${size}px "${family}"`
        const m = ctx.measureText('H')

        const ctm = text.getScreenCTM()
        const scale = Math.hypot(ctm.a, ctm.b)
        const start = text.getStartPositionOfChar(0)
        const baseline = new DOMPoint(start.x, start.y).matrixTransform(ctm).y
        const capCenter = baseline - (m.actualBoundingBoxAscent * scale) / 2
        return capCenter - (cb.y + cb.height / 2)
    }, label)

const renderedFont = (page, label) =>
    page.evaluate((label) => {
        const el = Array.from(document.querySelectorAll('text')).find(
            (n) => n.textContent === label
        )
        if (!el) return null
        return {
            family: el.getAttribute('font-family'),
            size: Number(el.getAttribute('font-size')),
        }
    }, label)

async function selectPoint(page, label) {
    const box = await page
        .locator(`text=${label}`)
        .first()
        .evaluate((el) => {
            const group = el.closest('g[data-component-id]')
            const r = group.getBoundingClientRect()
            return { x: r.x, y: r.y, width: r.width, height: r.height }
        })
    await page.mouse.click(box.x + 5, box.y + box.height / 2)
    await page.waitForSelector('#floating-toolbar [data-section="fill"]')
}

test('a point label renders the family and size on its own record', async ({
    page,
}) => {
    await openMapBase(page, [
        pointRecord(STYLED_ID, STYLED_LABEL, {
            textFontFamily: 'Frutiger',
            textFontSize: 32,
        }),
        pointRecord(PLAIN_ID, PLAIN_LABEL, {}),
    ])

    expect(await renderedFont(page, STYLED_LABEL)).toEqual({
        family: 'Frutiger',
        size: 32,
    })
    expect(await renderedFont(page, PLAIN_LABEL)).toEqual({
        family: DEFAULT_FAMILY,
        size: DEFAULT_SIZE,
    })
})

test('the toolbar restyles only the selected point', async ({ page }) => {
    await openMapBase(page, [
        pointRecord(STYLED_ID, STYLED_LABEL, {}),
        pointRecord(PLAIN_ID, PLAIN_LABEL, {}),
    ])

    await selectPoint(page, STYLED_LABEL)

    await page
        .locator('#floating-toolbar button[aria-label="Frutiger"]')
        .click()
    await page.locator('#floating-toolbar button:has-text("S")').first().click()

    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: 'Frutiger', size: LADDER_S })

    expect(await renderedFont(page, PLAIN_LABEL)).toEqual({
        family: DEFAULT_FAMILY,
        size: DEFAULT_SIZE,
    })
})

test('undo restores the label style, including the never-set case', async ({
    page,
}) => {
    await openMapBase(page, [pointRecord(STYLED_ID, STYLED_LABEL, {})])

    await selectPoint(page, STYLED_LABEL)
    await page
        .locator('#floating-toolbar button[aria-label="Frutiger"]')
        .click()
    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: 'Frutiger', size: DEFAULT_SIZE })

    await page.keyboard.press('Control+z')
    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: DEFAULT_FAMILY, size: DEFAULT_SIZE })
})

test('a new point inherits the current text size, off the point ladder', async ({
    page,
}) => {
    await openMapBase(page, [pointRecord(STYLED_ID, STYLED_LABEL, {})])

    await selectPoint(page, STYLED_LABEL)
    await page
        .locator('#floating-toolbar button:has-text("XL")')
        .first()
        .click()
    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: DEFAULT_FAMILY, size: LADDER_XL })

    await page.click('[aria-label="Point"]')
    const vp = page.viewportSize()
    await page.mouse.click(vp.width * 0.7, vp.height * 0.6)
    const input = page.locator('input[id^="point-label-input-"]')
    await input.waitFor()
    await input.fill(NEW_LABEL)
    await input.press('Enter')

    await expect
        .poll(() => renderedFont(page, NEW_LABEL))
        .toEqual({ family: DEFAULT_FAMILY, size: LADDER_XL })
})

test('the size picked on map text carries to the next point, off its ladder', async ({
    page,
}) => {
    await openMapBase(page, [geoTextRecord(MAP_TEXT_ID, MAP_TEXT)])

    const textEl = page.locator(`text=${MAP_TEXT}`).first()
    const box = await textEl.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForSelector('#floating-toolbar [data-section="textColor"]')
    await page
        .locator('#floating-toolbar button:has-text("XL")')
        .first()
        .click()
    await expect
        .poll(async () => (await renderedFont(page, MAP_TEXT)).size)
        .toBe(72)

    await page.click('[aria-label="Point"]')
    const vp = page.viewportSize()
    await page.mouse.click(vp.width * 0.7, vp.height * 0.6)
    const input = page.locator('input[id^="point-label-input-"]')
    await input.waitFor()
    await input.fill(NEW_LABEL)
    await input.press('Enter')

    await expect
        .poll(async () => (await renderedFont(page, NEW_LABEL)).size)
        .toBe(LADDER_XL)
})

test('the label sits level with the pin, at every size and font', async ({
    page,
}) => {
    await openMapBase(page, [
        pointRecord(STYLED_ID, STYLED_LABEL, { textFontSize: LADDER_XL }),
        pointRecord(PLAIN_ID, PLAIN_LABEL, {}),
    ])

    expect(Math.abs(await centerOffset(page, STYLED_LABEL))).toBeLessThan(1)
    expect(Math.abs(await centerOffset(page, PLAIN_LABEL))).toBeLessThan(1)

    await selectPoint(page, STYLED_LABEL)
    await page
        .locator('#floating-toolbar button[aria-label="Frutiger"]')
        .click()
    await page.locator('#floating-toolbar button:has-text("S")').first().click()
    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: 'Frutiger', size: LADDER_S })
    expect(Math.abs(await centerOffset(page, STYLED_LABEL))).toBeLessThan(1)
})
