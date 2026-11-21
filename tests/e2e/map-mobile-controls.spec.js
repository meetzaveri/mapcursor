import { test, expect } from './helpers/test.js'
import { baseRow, GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
})

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }

const TEXT_ID = 'bbbbbbbb-2222-2222-2222-222222222222'
const LABEL = 'Hello Map'

const geoTextRecord = () => ({
    id: TEXT_ID,
    componentType: 'text',
    zoomResistant: null,
    children: null,
    ...pointAt(100, 560, { content: LABEL, fontSize: 24 }),
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

async function openMapBase(page) {
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
                          components: [geoTextRecord()],
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
    await page.locator(`text=${LABEL}`).first().waitFor({ timeout: 15_000 })
    await page.evaluate(() => {
        const two = window.__mcTwo
        two.scene.translation.set(0, 0)
        two.scene.scale = 1
        two.update()
    })
    await page.waitForTimeout(300)
}

async function selectLabel(page) {
    const box = await page.locator(`text=${LABEL}`).first().boundingBox()
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(400)
}

const canvasText = (page) =>
    page.evaluate(() =>
        Array.from(document.querySelectorAll('text')).map((n) => n.textContent)
    )

test('the delete button removes map text, canvas and all', async ({ page }) => {
    await openMapBase(page)
    await selectLabel(page)

    const del = page.locator('[aria-label="Delete selection"]')
    await expect(del).toHaveCount(1)
    await del.tap()

    await expect.poll(() => canvasText(page)).not.toContain(LABEL)
    expect(
        await page.evaluate(
            (id) =>
                !!window.__mcTwo.scene.children.find(
                    (c) => c?.elementData?.id === id
                ),
            TEXT_ID
        ),
        'the element is still in the Two.js scene'
    ).toBe(false)
})

test('the pencil opens the editor; ✓ keeps the edit and ✗ discards it', async ({
    page,
}) => {
    await openMapBase(page)
    await selectLabel(page)

    const pencil = page.locator('[aria-label="Edit text"]')
    await expect(pencil).toHaveCount(1)
    await pencil.tap()
    await expect(page.locator('textarea.temp-input-area')).toHaveCount(1)

    await expect(page.locator('[aria-label="Delete selection"]')).toHaveCount(0)

    await page.locator('textarea.temp-input-area').fill('Discarded Text')
    await page.locator('[aria-label="Discard text changes"]').tap()
    await expect.poll(() => canvasText(page)).toContain(LABEL)

    await pencil.tap()
    await expect(page.locator('textarea.temp-input-area')).toHaveCount(1)
    await page.locator('textarea.temp-input-area').fill('Confirmed Text')
    await page.locator('[aria-label="Done editing"]').tap()
    await expect.poll(() => canvasText(page)).toContain('Confirmed Text')

    expect(
        await page.evaluate(
            (id) =>
                !!window.__mcTwo.scene.children.find(
                    (c) => c?.elementData?.id === id
                ),
            TEXT_ID
        )
    ).toBe(true)
})

test('search lives in the menu, and its modal owns the screen', async ({
    page,
}) => {
    await openMapBase(page)

    await expect(
        page.locator('input[aria-label="Search a place"]')
    ).toHaveCount(0)

    await page.locator('[title="Menu"]').first().tap()
    await page.locator('button:has-text("Search a place")').first().tap()
    await expect(
        page.locator('input[aria-label="Search a place"]')
    ).toHaveCount(1)

    const probes = await page.evaluate(() => {
        const at = (x, y) => {
            const el = document.elementFromPoint(x, y)
            return el ? !!el.closest('.modal-portal') : null
        }
        return {
            menu: at(30, 28),
            topRight: at(360, 28),
            toolbar: at(195, 28),
            bottomRight: at(370, 800),
        }
    })
    expect(probes).toEqual({
        menu: true,
        topRight: true,
        toolbar: true,
        bottomRight: true,
    })
})
