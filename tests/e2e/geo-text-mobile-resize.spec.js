import { test, expect } from './helpers/test.js'
import { baseRow, GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
})

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }
const LABEL = 'Santa Clara'
const COUNTY_SCALE = Math.pow(2, 10 - 16)
const MIN_TOUCH_TARGET_PX = 20

const geoTextRecord = (id) => ({
    id,
    componentType: 'text',
    children: null,
    ...pointAt(0, 0, { content: LABEL, fontSize: 18 }),
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
                          components: [geoTextRecord('aaaaaaaa-1111-1111-1111-111111111111')],
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
    }, COUNTY_SCALE)

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

async function touchGesture(page, points) {
    await page.evaluate((pts) => {
        const fire = (type, x, y) => {
            const target = document.elementFromPoint(x, y) || document.body
            const t = new Touch({
                identifier: 1, target,
                clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y,
            })
            const live = type === 'touchend' ? [] : [t]
            target.dispatchEvent(
                new TouchEvent(type, {
                    bubbles: true, cancelable: true,
                    touches: live, targetTouches: live, changedTouches: [t],
                })
            )
        }
        fire('touchstart', pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) fire('touchmove', pts[i].x, pts[i].y)
        const last = pts[pts.length - 1]
        fire('touchend', last.x, last.y)
    }, points)
}

const readChrome = (page) =>
    page.evaluate((label) => {
        const el = Array.from(document.querySelectorAll('text')).find(
            (n) => n.textContent === label
        )
        if (!el) return null
        const g = el.closest('g[data-component-id]')
        const groups = Array.from(g.querySelectorAll('g'))
        const handleGroup = groups[groups.length - 1]
        const handle = handleGroup?.children?.[2]
        const tr = el.getBoundingClientRect()
        const hr = handle?.getBoundingClientRect()
        return {
            textHeight: tr.height,
            handle: hr
                ? { size: hr.width, x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 }
                : null,
        }
    }, LABEL)

const labelCentre = (page) =>
    page.evaluate((label) => {
        const el = Array.from(document.querySelectorAll('text')).find(
            (n) => n.textContent === label
        )
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, LABEL)

test('a finger can grab the resize handle and scale map text', async ({ page }) => {
    await openMapWithLabel(page)

    const centre = await labelCentre(page)
    expect(centre, 'the label should be on screen').not.toBeNull()
    await touchGesture(page, [centre])
    await page.waitForTimeout(300)

    const before = await readChrome(page)
    expect(before.handle, 'the selection chrome should expose resize handles').not.toBeNull()
    expect(
        before.handle.size,
        `resize handle is ${before.handle.size.toFixed(1)}px — too small for a finger`
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX)

    const OFF = 6
    await touchGesture(page, [
        { x: before.handle.x + OFF, y: before.handle.y + OFF },
        { x: before.handle.x + 25, y: before.handle.y + 25 },
        { x: before.handle.x + 60, y: before.handle.y + 60 },
    ])
    await page.waitForTimeout(400)

    const after = await readChrome(page)
    expect(
        after.textHeight,
        'dragging the handle outward should grow the text'
    ).toBeGreaterThan(before.textHeight)
})
