import { test, expect } from './helpers/test.js'
import { baseRow, GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [72.5714, 23.0225], zoom: 16 }
const LABEL = 'Unresisted'
const ZOOMED_OUT = 1 / 8
const OLD_CAP_RENDER_PX = 300 * ZOOMED_OUT * 1.6

const textRecord = (id) => ({
    id,
    componentType: 'text',
    children: null,
    ...pointAt(0, 0, { content: LABEL, fontSize: 240 }),
    zoomResistant: false,
    x1: 0, x2: 0, y1: 0, y2: 0,
    fill: 'transparent', width: 120, height: 36,
    iconStroke: null, stroke: null, linewidth: 2, strokeType: null,
    textColor: '#3A342C', opacity: 1, position: 1,
    tailShapeId: null, tailEdge: null, headShapeId: null, headEdge: null,
    tailPortIndex: null, headPortIndex: null,
})

async function openMapWithLabel(page) {
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data =
                body.operationName === 'getComponentsForBase'
                    ? {
                          base: baseRow({ id: BASE_ID, type: 'map', anchor: ANCHOR }),
                          components: [textRecord('aaaaaaaa-2222-2222-2222-222222222222')],
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
    })
    await page.goto(`/map/${BASE_ID}`)
    await page.locator(`text=${LABEL}`).first().waitFor({ timeout: 15_000 })

    await page.evaluate((s) => {
        window.__mcZui.zoomSet(s, 0, 0)
        window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { scale: s } }))
        window.__mcTwo.update()
    }, ZOOMED_OUT)
    await page.evaluate((label) => {
        const el = Array.from(document.querySelectorAll('text')).find(
            (n) => n.textContent === label
        )
        const r = el.getBoundingClientRect()
        window.__mcZui.translateSurface(
            window.innerWidth / 2 - (r.left + r.width / 2),
            window.innerHeight / 2 - (r.top + r.height / 2)
        )
        window.__mcTwo.update()
    }, LABEL)
}

const readLabel = (page) =>
    page.evaluate((label) => {
        const el = Array.from(document.querySelectorAll('text')).find(
            (n) => n.textContent === label
        )
        if (!el) return null
        const g = el.closest('g[data-component-id]')
        const groups = Array.from(g.querySelectorAll('g'))
        const handle = groups[groups.length - 1]?.children?.[2]
        const tr = el.getBoundingClientRect()
        const hr = handle?.getBoundingClientRect()
        return {
            x: tr.left + tr.width / 2,
            y: tr.top + tr.height / 2,
            height: tr.height,
            handle: hr ? { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 } : null,
        }
    }, LABEL)

test('zoomed out, unresisted text grows past the old 300-unit cap', async ({ page }) => {
    await openMapWithLabel(page)

    const before = await readLabel(page)
    await page.mouse.click(before.x, before.y)
    await page.waitForTimeout(300)
    const selected = await readLabel(page)
    expect(selected.handle, 'selecting should show resize handles').not.toBeNull()

    await page.mouse.move(selected.handle.x, selected.handle.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
        await page.mouse.move(selected.handle.x + i * 25, selected.handle.y + i * 15)
    }
    await page.mouse.up()
    await page.waitForTimeout(300)

    const after = await readLabel(page)
    expect(
        after.height,
        `label stopped at ${after.height.toFixed(1)}px — still clamped in surface units`
    ).toBeGreaterThan(OLD_CAP_RENDER_PX)
})
