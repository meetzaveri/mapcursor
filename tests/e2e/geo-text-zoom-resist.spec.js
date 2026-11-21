import { test, expect } from './helpers/test.js'
import {
    baseRow,
    GQL_MOCK_RESPONSES,
    pointAt,
    triggerUndoKeyboard,
} from './helpers/index.js'
import {
    SELECTION_HANDLE_FILL,
    selectionHandleRadiusPx,
} from '../../src/utils/selectionTheme.ts'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }
const FONT_SIZE = 18

const RESISTANT_ID = 'aaaaaaaa-1111-1111-1111-111111111111'
const SCALING_ID = 'bbbbbbbb-2222-2222-2222-222222222222'
const RESISTANT_LABEL = 'Stays Legible'
const SCALING_LABEL = 'Grows With Map'

const MIN_LEGIBLE_PX = 6
const MAX_REASONABLE_PX = 60

const geoTextRecord = (id, content, zoomResistant) => ({
    id,
    componentType: 'text',
    zoomResistant,
    children: null,
    ...pointAt(0, id === SCALING_ID ? 120 : 0, {
        content,
        fontSize: FONT_SIZE,
    }),
    x1: 0, x2: 0, y1: 0, y2: 0,
    fill: 'transparent', width: 120, height: 36,
    iconStroke: null, stroke: null, linewidth: 2, strokeType: null,
    textColor: '#3A342C', opacity: 1, position: 1,
    tailShapeId: null, tailEdge: null, headShapeId: null, headEdge: null,
    tailPortIndex: null, headPortIndex: null,
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
}

const sizes = (page, labels) =>
    page.evaluate((labels) => {
        const nodes = Array.from(document.querySelectorAll('text'))
        const out = {}
        labels.forEach((label) => {
            const el = nodes.find((n) => n.textContent === label)
            const ctm = el && el.getScreenCTM()
            out[label] = ctm
                ? parseFloat(el.getAttribute('font-size')) *
                  Math.hypot(ctm.a, ctm.b)
                : null
        })
        return out
    }, labels)

const visibleHandleDots = (page) =>
    page.evaluate((fill) => {
        const shown = (el) => {
            for (let n = el; n && n.tagName !== 'svg'; n = n.parentElement) {
                const o = parseFloat(window.getComputedStyle(n).opacity || '1')
                if (o === 0) return false
            }
            return true
        }
        return Array.from(
            document.querySelectorAll('[data-mc-selection-chrome] path')
        )
            .filter((el) => el.getAttribute('fill') === fill && shown(el))
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0 && Math.abs(r.width - r.height) < 1)
            .map((r) => ({
                cx: r.x + r.width / 2,
                cy: r.y + r.height / 2,
                size: r.width,
            }))
    }, SELECTION_HANDLE_FILL)

const sizesAt = async (page, scale, labels) => {
    await page.evaluate((s) => {
        const two = window.__mcTwo
        two.scene.scale = s
        window.dispatchEvent(
            new CustomEvent('zoomChanged', { detail: { scale: s } })
        )
        two.update()
    }, scale)
    return sizes(page, labels)
}

test('opting out of zoom-resistance makes map text scale with the map', async ({
    page,
}) => {
    await openMapBase(page, [
        geoTextRecord(SCALING_ID, SCALING_LABEL, false),
    ])
    await page.locator(`text=${SCALING_LABEL}`).first().waitFor({
        timeout: 15_000,
    })

    const atAnchor = await sizesAt(page, 1, [SCALING_LABEL])
    const anchorPx = atAnchor[SCALING_LABEL]
    expect(anchorPx, 'label missing at the anchor zoom').not.toBeNull()

    const zoomedOut = await sizesAt(page, Math.pow(2, -6), [SCALING_LABEL])
    const outPx = zoomedOut[SCALING_LABEL]

    expect(outPx).not.toBeNull()
    expect(
        outPx,
        `opted-out label rendered at ${outPx}px zoomed out, vs ${anchorPx}px at the anchor — it is not tracking the camera`
    ).toBeLessThan(anchorPx / 8)
    expect(
        outPx,
        'an opted-out label should fall below the legibility floor when zoomed out — that is the whole point of the default'
    ).toBeLessThan(MIN_LEGIBLE_PX)
})

test('zoom-resistance is per record: one label opts out, the other does not', async ({
    page,
}) => {
    await openMapBase(page, [
        geoTextRecord(RESISTANT_ID, RESISTANT_LABEL, null),
        geoTextRecord(SCALING_ID, SCALING_LABEL, false),
    ])
    await page.locator(`text=${RESISTANT_LABEL}`).first().waitFor({
        timeout: 15_000,
    })
    await page.locator(`text=${SCALING_LABEL}`).first().waitFor({
        timeout: 15_000,
    })

    const labels = [RESISTANT_LABEL, SCALING_LABEL]
    const baseline = await sizesAt(page, 1, labels)

    for (const mapZoom of [19, 16, 13, 10, 5, 1]) {
        const scale = Math.pow(2, mapZoom - ANCHOR.zoom)
        const px = await sizesAt(page, scale, labels)

        expect(
            px[RESISTANT_LABEL],
            `resistant label missing at map zoom ${mapZoom}`
        ).not.toBeNull()
        expect(
            px[RESISTANT_LABEL],
            `at map zoom ${mapZoom} the resistant label rendered at ${px[RESISTANT_LABEL]}px`
        ).toBeGreaterThan(MIN_LEGIBLE_PX)
        expect(
            px[RESISTANT_LABEL],
            `at map zoom ${mapZoom} the resistant label rendered at ${px[RESISTANT_LABEL]}px`
        ).toBeLessThan(MAX_REASONABLE_PX)

        const expected = baseline[SCALING_LABEL] * scale
        expect(
            px[SCALING_LABEL] / expected,
            `at map zoom ${mapZoom} the opted-out label rendered at ${px[SCALING_LABEL]}px, expected ≈${expected}px`
        ).toBeCloseTo(1, 2)

        if (scale < 1) {
            expect(
                px[SCALING_LABEL],
                `at map zoom ${mapZoom} the opted-out label (${px[SCALING_LABEL]}px) should be smaller than the resistant one (${px[RESISTANT_LABEL]}px)`
            ).toBeLessThan(px[RESISTANT_LABEL])
        } else if (scale > 1) {
            expect(
                px[SCALING_LABEL],
                `at map zoom ${mapZoom} the opted-out label (${px[SCALING_LABEL]}px) should be larger than the resistant one (${px[RESISTANT_LABEL]}px)`
            ).toBeGreaterThan(px[RESISTANT_LABEL])
        }
    }
})

test('toggling one label re-scales only that label, with no zoom', async ({
    page,
}) => {
    await openMapBase(page, [
        geoTextRecord(RESISTANT_ID, RESISTANT_LABEL, null),
        geoTextRecord(SCALING_ID, SCALING_LABEL, null),
    ])
    await page.locator(`text=${RESISTANT_LABEL}`).first().waitFor({
        timeout: 15_000,
    })
    await page.locator(`text=${SCALING_LABEL}`).first().waitFor({
        timeout: 15_000,
    })

    const labels = [RESISTANT_LABEL, SCALING_LABEL]
    const CAMERA = Math.pow(2, -5)
    const before = await sizesAt(page, CAMERA, labels)

    await page.evaluate((id) => {
        window.dispatchEvent(
            new CustomEvent('textResistChanged', {
                detail: { id, resist: 0 },
            })
        )
    }, SCALING_ID)

    const after = await sizes(page, labels)

    expect(
        after[SCALING_LABEL],
        `toggled label stayed at ${after[SCALING_LABEL]}px (was ${before[SCALING_LABEL]}px) — the resist change never reached the element`
    ).toBeLessThan(before[SCALING_LABEL] / 2)

    expect(
        after[RESISTANT_LABEL],
        `the untouched label moved from ${before[RESISTANT_LABEL]}px to ${after[RESISTANT_LABEL]}px — the toggle is leaking across records`
    ).toBeCloseTo(before[RESISTANT_LABEL], 1)
})

test('the Zoom resistant switch keeps the label exactly as it looked, zoomed far out', async ({
    page,
}) => {
    await openMapBase(page, [geoTextRecord(RESISTANT_ID, RESISTANT_LABEL, null)])
    const label = page.locator(`text=${RESISTANT_LABEL}`).first()
    await label.waitFor({ timeout: 15_000 })

    const CAMERA = 0.004
    const before = (await sizesAt(page, CAMERA, [RESISTANT_LABEL]))[
        RESISTANT_LABEL
    ]
    expect(before).toBeGreaterThan(MIN_LEGIBLE_PX)

    const box = await label.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    const toggle = page.locator('#floating-toolbar #zoom-resist-toggle')
    await expect(toggle).toBeVisible()

    await toggle.click()
    const off = (await sizes(page, [RESISTANT_LABEL]))[RESISTANT_LABEL]
    expect(
        off,
        `turning the switch off moved the label from ${before}px to ${off}px`
    ).toBeCloseTo(before, 0)

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(200)
    const dots = await visibleHandleDots(page)
    expect(dots, 'expected four visible corner handles').toHaveLength(4)
    const expectedDiameter = selectionHandleRadiusPx() * 2
    for (const d of dots) {
        expect(
            Math.abs(d.size - expectedDiameter),
            `a handle rendered at ${d.size}px`
        ).toBeLessThanOrEqual(3)
    }
    const corner = dots.reduce((a, b) => (b.cx + b.cy > a.cx + a.cy ? b : a))
    await page.mouse.move(corner.cx, corner.cy)
    await page.mouse.down()
    await page.mouse.move(corner.cx + 30, corner.cy + 20, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    const resized = (await sizes(page, [RESISTANT_LABEL]))[RESISTANT_LABEL]
    expect(
        resized,
        `dragging a corner handle did not resize the text (${off}px → ${resized}px)`
    ).toBeGreaterThan(off * 1.1)
    await triggerUndoKeyboard(page)
    await page.waitForTimeout(300)
    expect((await sizes(page, [RESISTANT_LABEL]))[RESISTANT_LABEL]).toBeCloseTo(
        off,
        0
    )

    const zoomedIn = (await sizesAt(page, CAMERA * 2, [RESISTANT_LABEL]))[
        RESISTANT_LABEL
    ]
    expect(zoomedIn / off).toBeCloseTo(2, 1)
    await sizesAt(page, CAMERA, [RESISTANT_LABEL])

    await toggle.click()
    const on = (await sizes(page, [RESISTANT_LABEL]))[RESISTANT_LABEL]
    expect(on, `turning it back on moved the label to ${on}px`).toBeCloseTo(
        before,
        0
    )

    await triggerUndoKeyboard(page)
    await page.waitForTimeout(300)
    const undone = (await sizes(page, [RESISTANT_LABEL]))[RESISTANT_LABEL]
    expect(undone).toBeCloseTo(before, 0)
    const undoneZoomed = (await sizesAt(page, CAMERA * 2, [RESISTANT_LABEL]))[
        RESISTANT_LABEL
    ]
    expect(undoneZoomed / undone).toBeCloseTo(2, 1)
})
