// A point's label carries its own font family and size — per record, off the
// point's own ladder (POINT_LABEL_SIZES), never the whiteboard text defaults.
//
// Three things make this worth a spec rather than trusting the generic text
// path. A point's label is a bare Two.Text parked in the point's group, not a
// text layer, and `selectedComponent.shape.data` for a point is the CIRCLE —
// so the shared handlers would restyle nothing. The label's rendered style is
// rebuilt by the factory (buildPointVisual), so a style that isn't threaded
// through the factory silently reverts on the next rebuild. And the toolbar
// deliberately skips the useElementDefaults sync for both keys, so styling one
// pin must not follow the selection onto the next.

import { test, expect } from './helpers/test.js'
import { baseRow, GQL_MOCK_RESPONSES, pointAt } from './helpers/index.js'

const BASE_ID = '11111111-1111-1111-1111-111111111111'
// Santa Clara County, at the default anchor zoom (mirrors the other map specs).
const ANCHOR = { lngLat: [-121.95, 37.35], zoom: 16 }

const STYLED_ID = 'aaaaaaaa-3333-3333-3333-333333333333'
const PLAIN_ID = 'bbbbbbbb-4444-4444-4444-444444444444'
const STYLED_LABEL = 'Styled Pin'
const PLAIN_LABEL = 'Plain Pin'
const NEW_LABEL = 'Fresh Pin'
const MAP_TEXT_ID = 'cccccccc-5555-5555-5555-555555555555'
const MAP_TEXT = 'Map Label'

// src/constants/misc.ts — the shipped design default and the point ladder.
const DEFAULT_FAMILY = 'Avenir'
const DEFAULT_SIZE = 18
const LADDER_S = 14
const LADDER_XL = 32

const pointRecord = (id, label, metadata) => ({
    id,
    componentType: 'point',
    zoomResistant: null,
    children: null,
    // Placed well inside the viewport, and offset from each other so the two
    // pins never overlap and each keeps its own hit area. They used to sit at
    // surface (0, 0) and reach the screen only because the factory teleported
    // anything at the origin to (500, 200) — a coercion that was a live bug on
    // a map base, where (0, 0) IS the georeference anchor.
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

// A map-base text element — the other half of "the current text style". It
// runs the whiteboard ladder (24–72), which is what makes the cross-ladder
// hand-off worth asserting.
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

/**
 * How far the label's CAP BAND centre sits from the circle's centre, in px.
 *
 * Zero is aligned. Two.js's `baseline: 'middle'` used to leave this at −2 to
 * −4px (the label floating above the pin) because SVG's middle baseline
 * centres the x-height, not the glyphs — see utils/fontMetrics.ts.
 *
 * The cap band has to be reconstructed from the family's own metrics rather
 * than read off the box: `getBoundingClientRect` on an SVG <text> returns the
 * FONT box (ascent + descent), which straddles the cap band evenly only for a
 * font whose ascent and descent happen to be symmetric about it. Caveat Brush
 * was such a font (90/25 against a cap of 66.2 — the two centres agree to
 * 0.06px), which is why the naive box-centre comparison this replaced passed
 * for years; Avenir is not (76/24 against a cap of 70.8, a 3px disagreement at
 * 32px). Measuring the box was always measuring the wrong thing.
 *
 * The baseline likewise comes from `getStartPositionOfChar`, not from
 * `rect.top + fontBoundingBoxAscent`. Those are two different fonts' opinions of
 * the same ascent — Blink lays SVG text out with the face re-scaled to its
 * on-screen ppem and rounds THAT face's ascent to whole pixels, while canvas
 * reports the unrounded metric — so reconstructing the baseline from the box
 * mixed in a rounding error that varied by platform and font (0.19px here,
 * enough to carry a 0.74px placement bug past a 1px tolerance on macOS while CI
 * failed it at 1.10px). getStartPositionOfChar returns the text origin itself.
 */
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
        // 'H': no overshoot, no descender, so its ink ascent IS the cap height
        // — the same measurement utils/fontMetrics.ts places the label by.
        const m = ctx.measureText('H')

        // Both the baseline and the cap height are in the text's own user
        // units; the CTM carries them to the screen the circle was measured in
        // (a pin counter-scales its group, so the two are not the same space).
        const ctm = text.getScreenCTM()
        const scale = Math.hypot(ctm.a, ctm.b)
        const start = text.getStartPositionOfChar(0)
        const baseline = new DOMPoint(start.x, start.y).matrixTransform(ctm).y
        const capCenter = baseline - (m.actualBoundingBoxAscent * scale) / 2
        return capCenter - (cb.y + cb.height / 2)
    }, label)

/** The rendered font of a label, read off the SVG Two.js actually painted. */
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

/** Click a pin to select it, then wait for its properties toolbar. */
async function selectPoint(page, label) {
    const box = await page
        .locator(`text=${label}`)
        .first()
        .evaluate((el) => {
            // The label sits beside the circle; the circle is the pin's hit
            // area, so aim at the group's own box rather than the glyphs.
            const group = el.closest('g[data-component-id]')
            const r = group.getBoundingClientRect()
            return { x: r.x, y: r.y, width: r.width, height: r.height }
        })
    // Left edge + a few px: the circle is drawn at the group's origin, with the
    // label extending to the right.
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
        // No text metadata at all — every point written before these controls
        // existed looks like this, and must render the design default.
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

    // The toolbar reads the untouched point as the ladder's M and the design
    // family — not the whiteboard defaults, which are a different ladder.
    await page
        .locator('#floating-toolbar button[aria-label="Frutiger"]')
        .click()
    await page.locator('#floating-toolbar button:has-text("S")').first().click()

    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: 'Frutiger', size: LADDER_S })

    // Per record: the other pin heard nothing.
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

    // The point had NO textFontFamily before this edit, so the revert has to
    // clear the key, not merge the new one back over the old record.
    await page.keyboard.press('Control+z')
    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: DEFAULT_FAMILY, size: DEFAULT_SIZE })
})

test('a new point inherits the current text size, off the point ladder', async ({
    page,
}) => {
    await openMapBase(page, [pointRecord(STYLED_ID, STYLED_LABEL, {})])

    // Pick XL on an existing label. The size default travels as the LADDER
    // LABEL, so what is remembered is "XL", not "32px".
    await selectPoint(page, STYLED_LABEL)
    await page
        .locator('#floating-toolbar button:has-text("XL")')
        .first()
        .click()
    await expect
        .poll(() => renderedFont(page, STYLED_LABEL))
        .toEqual({ family: DEFAULT_FAMILY, size: LADDER_XL })

    // Place a fresh point: toolbar Point tool, then a click on empty canvas.
    // The label editor opens by itself on placement.
    await page.click('[aria-label="Point"]')
    // Viewport coordinates, not #main-two-root's box: the two.js root is a
    // zero-height wrapper, so its box would put the click up in the toolbar.
    const vp = page.viewportSize()
    await page.mouse.click(vp.width * 0.7, vp.height * 0.6)
    const input = page.locator('input[id^="point-label-input-"]')
    await input.waitFor()
    await input.fill(NEW_LABEL)
    await input.press('Enter')

    // The new pin came out at the point ladder's XL (32), not the whiteboard
    // ladder's XL (72) and not the design default.
    await expect
        .poll(() => renderedFont(page, NEW_LABEL))
        .toEqual({ family: DEFAULT_FAMILY, size: LADDER_XL })
})

test('the size picked on map text carries to the next point, off its ladder', async ({
    page,
}) => {
    await openMapBase(page, [geoTextRecord(MAP_TEXT_ID, MAP_TEXT)])

    // XL on a geoText is 72px — the whiteboard ladder. What is remembered is
    // the LABEL, so the point that follows must come out at the POINT ladder's
    // XL (32), not at 72 and not at the design default.
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
        // Descenders must not drag the label off centre: it is the cap band
        // that is centred, so "Plain Pin" and "jpqy" hang from the same line.
        pointRecord(PLAIN_ID, PLAIN_LABEL, {}),
    ])

    // 1px of slack for glyph-metric rounding; the bug this guards was 2–4px.
    expect(Math.abs(await centerOffset(page, STYLED_LABEL))).toBeLessThan(1)
    expect(Math.abs(await centerOffset(page, PLAIN_LABEL))).toBeLessThan(1)

    // A live restyle re-places the label too — the cap band moves with both the
    // size and the family, so applyProperty has to re-centre, not just restyle.
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
