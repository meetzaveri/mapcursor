// Legend presets.
//
// Two red areas and a yellow one mean nothing three weeks later, and mean even
// less to whoever opens the shared link. A preset is a named style bundle that
// captions them, and the binding it leaves behind is LIVE — which is the only
// reason the swatch in the legend can be trusted to match what is on the map.
//
// What these protect, in the order each is most likely to break:
//
//   1. Applying a preset actually restyles the mark (and only the right keys).
//   2. Editing a preset sweeps every element already bound to it. This is the
//      whole promise; without it the legend is decoration.
//   3. Hand-editing a bound mark UNBINDS it, rather than leaving a caption
//      claiming a colour the mark no longer wears.
//   4. Undo puts back the styling AND the binding, in one step — they ride one
//      history entry precisely so they cannot come apart.
//   5. Deleting a preset removes the caption and touches nothing else.
//   6. The whole legend survives a reload.

import { test, expect } from './helpers/test.js'
import {
    clickToolbarButton,
    drawArea,
    drawRoute,
    getCanvasBox,
    setupLocalBase,
    triggerUndoKeyboard,
} from './helpers/index.js'

// Asserted in Node, not the browser: these are pure functions, and importing
// them here is what keeps the spec honest about the real implementation rather
// than a copy of its rules. Never `import('/src/…')` inside page.evaluate —
// that only works against a dev server (see CLAUDE.md).
import {
    PRESET_STYLE_KEYS,
    presetStylePatch,
    LEGEND_STYLE_KEYS,
} from '../../src/types/legend.ts'

const AREA_A = [
    { x: 240, y: 200 },
    { x: 380, y: 200 },
    { x: 380, y: 320 },
]
const AREA_B = [
    { x: 460, y: 200 },
    { x: 600, y: 200 },
    { x: 600, y: 320 },
]
const AREA_C = [
    { x: 240, y: 470 },
    { x: 380, y: 470 },
    { x: 380, y: 560 },
]
const ROUTE = [
    { x: 250, y: 420 },
    { x: 400, y: 460 },
]

const RED = '#DE350B'
const BLUE = '#0065FF'

/** Offset a point spec into real page coordinates. */
const at = (box, pts) => pts.map((p) => ({ x: box.x + p.x, y: box.y + p.y }))

/**
 * Every area in the scene, read through __mcTwo.
 *
 * The store is the source of truth for the binding, but the PAINTED values are
 * what the user sees — and the two coming apart is the exact failure mode a
 * frozen-props element has, so both are read here.
 */
const readAreas = (page) =>
    page.evaluate(() =>
        Array.from(window.__mcTwo.scene.children)
            .filter((c) => c?.elementData?.componentType === 'area')
            .map((g) => ({
                id: g.elementData.id,
                boundTo: g.elementData.legendPresetId ?? null,
                stroke: g.elementData.stroke ?? null,
                linewidth: g.elementData.linewidth ?? null,
                strokeType: g.elementData.strokeType ?? null,
                paintedStroke: g.children?.[0]?.stroke ?? null,
            }))
    )

/**
 * The open wizard. Every interaction is scoped to it: the properties toolbar
 * behind the backdrop carries colour swatches with the same `title`, and an
 * unscoped locator picks one of those and then waits forever on the modal
 * backdrop that is covering it.
 */
const wizard = (page) => page.locator('.modal-portal')

/**
 * Wait for the modal to be GONE, not merely closed.
 *
 * `Modal` keeps its backdrop mounted until the close transition ends, and that
 * backdrop covers the canvas — so the first click after saving a preset lands
 * on it and is swallowed. Waiting on the dialog's own content detaching is not
 * enough; the wrapper outlives it.
 */
async function awaitModalGone(page) {
    await expect(page.locator('.modal-portal')).toHaveCount(0, {
        timeout: 10_000,
    })
}

/**
 * Step through whatever style pages the type has after its colour page (an
 * area has Fill and Stroke, a route Stroke, a point and a radius map none),
 * then save. Counting the pages here instead would break each time a type
 * gains one, which is exactly what happened when areas got a Fill page.
 */
async function finishWizard(w) {
    const save = w.getByRole('button', { name: 'Save preset' })
    for (let i = 0; i < 5 && !(await save.isVisible()); i++) {
        await w.getByRole('button', { name: 'Next' }).click()
    }
    await save.click()
}

/** Walk the wizard: name → type → colour → (fill, stroke) → save. */
async function createPreset(page, { name, type = 'Area', colour = RED } = {}) {
    // The panel's create button; the empty state and the populated state use
    // different labels, so accept either.
    const create = page.getByRole('button', {
        name: /Create a Legend|\+ New preset/,
    })
    await create.click()

    const w = wizard(page)
    const dialog = w.locator('#legend-preset-name')
    await dialog.waitFor({ state: 'visible', timeout: 10_000 })
    await dialog.fill(name)
    await w.getByRole('button', { name: type, exact: true }).click()
    await w.getByRole('button', { name: 'Next' }).click()

    // Colour page — swatches carry the hex as their `title` (see colorPicker).
    await w.locator(`[title="${colour}"]`).first().click()
    await w.getByRole('button', { name: 'Next' }).click()

    await finishWizard(w)
    await awaitModalGone(page)
}

/** Select an element by clicking a point known to be inside it. */
async function selectAt(page, x, y) {
    await clickToolbarButton(page, 'Select')
    await page.mouse.click(x, y)
    await page.waitForTimeout(200)
}

/** Click a chip in the secondary toolbar by its label. */
async function pickChip(page, label) {
    const row = page.locator('#mc-preset-chips')
    await row.waitFor({ state: 'visible', timeout: 10_000 })
    await row.getByRole('button', { name: label, exact: true }).click()
    await page.waitForTimeout(200)
}

/**
 * Click a legend row's Edit or Delete. The actions are collapsed to zero
 * width until the row is hovered or focused (legendPanel.tsx), so hover the
 * row first, as a user would; Playwright won't click a zero-width button.
 */
async function clickRowAction(page, action, presetName) {
    const button = page.getByRole('button', {
        name: `${action} ${presetName}`,
    })
    await page.locator('li[data-preset-id]', { has: button }).hover()
    await button.click()
}

test.describe('legend presets', () => {
    // --- Pure rules, asserted in Node ---------------------------------

    test('a filled mark takes its fill as its stroke; a stroked one does not', () => {
        // A point and a radius map read as ONE mark, so the preset's single
        // colour reaches the fill and the stroke column together. An area is
        // stroked, and its fill is derived on the canvas — so a preset must
        // never write one, or it would overwrite the derivation.
        //
        // The width keys in this style are deliberate: a radius map is
        // borderless, so even a preset that carries them (hand-edited, or
        // saved before the border was dropped) must not write a width onto the
        // mark.
        const circle = presetStylePatch({
            id: 'p',
            baseId: null,
            name: 'x',
            elementType: 'circle',
            style: { fill: RED, linewidth: 2, strokeType: null },
            position: 0,
        })
        expect(circle.fill).toBe(RED)
        expect(circle.stroke).toBe(RED)
        expect(circle.linewidth).toBeUndefined()
        expect(circle.strokeType).toBeUndefined()

        const area = presetStylePatch({
            id: 'p',
            baseId: null,
            name: 'x',
            elementType: 'area',
            style: { stroke: RED, linewidth: 2, strokeType: null },
            position: 0,
        })
        expect(area.stroke).toBe(RED)
        expect(area.fill).toBeUndefined()
    })

    test('every preset key is one the unbind rule watches', () => {
        // If a preset could write a key the drift rule does not watch, a user
        // could hand-edit that key and keep a caption that no longer matches.
        Object.values(PRESET_STYLE_KEYS)
            .flat()
            .forEach((key) => expect(LEGEND_STYLE_KEYS.has(key)).toBe(true))
    })

    test('a partially-filled preset blanks nothing', () => {
        // Mid-wizard a preset has only some keys. Writing `undefined` for the
        // rest would null real columns on whatever it was applied to.
        const patch = presetStylePatch({
            id: 'p',
            baseId: null,
            name: 'x',
            elementType: 'route',
            style: { stroke: BLUE },
            position: 0,
        })
        expect(patch).toEqual({ stroke: BLUE })
    })

    // --- The live binding, in the browser ------------------------------

    test('applying a preset restyles the mark and captions it', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))

        await createPreset(page, { name: 'Residential cluster', colour: RED })

        await selectAt(page, box.x + 330, box.y + 250)
        await pickChip(page, 'Residential cluster')

        const [area] = await readAreas(page)
        expect(area.stroke).toBe(RED)
        expect(area.paintedStroke).toBe(RED)
        expect(area.boundTo).not.toBeNull()
    })

    test('editing a preset sweeps every mark already bound to it', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))
        await drawArea(page, at(box, AREA_B))

        await createPreset(page, { name: 'Residential cluster', colour: RED })

        await selectAt(page, box.x + 330, box.y + 250)
        await pickChip(page, 'Residential cluster')
        await selectAt(page, box.x + 550, box.y + 250)
        await pickChip(page, 'Residential cluster')

        expect((await readAreas(page)).every((a) => a.stroke === RED)).toBe(
            true
        )

        // Re-open the preset from the legend and recolour it.
        await clickRowAction(page, 'Edit', 'Residential cluster')
        const w = wizard(page)
        await w
            .locator('#legend-preset-name')
            .waitFor({ state: 'visible', timeout: 10_000 })
        await w.getByRole('button', { name: 'Next' }).click()
        await w.locator(`[title="${BLUE}"]`).first().click()
        await w.getByRole('button', { name: 'Next' }).click()
        await finishWizard(w)
        await awaitModalGone(page)

        // BOTH areas follow, including the painted value — the elements froze
        // their props at mount, so only an explicit repaint gets them there.
        await expect
            .poll(
                async () => {
                    const areas = await readAreas(page)
                    return areas.every(
                        (a) => a.stroke === BLUE && a.paintedStroke === BLUE
                    )
                },
                { timeout: 10_000 }
            )
            .toBe(true)
    })

    test('hand-editing a bound mark unbinds it, and leaves its neighbour alone', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))
        await drawArea(page, at(box, AREA_B))

        await createPreset(page, { name: 'Residential cluster', colour: RED })
        await selectAt(page, box.x + 330, box.y + 250)
        await pickChip(page, 'Residential cluster')
        await selectAt(page, box.x + 550, box.y + 250)
        await pickChip(page, 'Residential cluster')

        // Recolour ONE of them through the ordinary properties toolbar.
        await selectAt(page, box.x + 330, box.y + 250)
        await page.waitForSelector('#floating-toolbar [data-section="stroke"]')
        await page
            .locator('#floating-toolbar')
            .locator(`[title="${BLUE}"]`)
            .first()
            .click()
        await page.waitForTimeout(250)

        const areas = await readAreas(page)
        const edited = areas.find((a) => a.stroke === BLUE)
        const untouched = areas.find((a) => a.stroke === RED)

        expect(edited.boundTo).toBeNull()
        expect(untouched.boundTo).not.toBeNull()
    })

    test('undo restores the styling and the binding together', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))

        await createPreset(page, { name: 'Residential cluster', colour: RED })
        await selectAt(page, box.x + 330, box.y + 250)

        const before = (await readAreas(page))[0]
        await pickChip(page, 'Residential cluster')
        expect((await readAreas(page))[0].boundTo).not.toBeNull()

        await triggerUndoKeyboard(page)

        // One step, both halves. The binding coming back on its own — or the
        // colour without it — means they are riding separate history entries.
        await expect
            .poll(
                async () => {
                    const a = (await readAreas(page))[0]
                    return { boundTo: a.boundTo, stroke: a.stroke }
                },
                { timeout: 10_000 }
            )
            .toEqual({ boundTo: null, stroke: before.stroke })
    })

    test('deleting a preset removes the caption and nothing else', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))

        await createPreset(page, { name: 'Residential cluster', colour: RED })
        await selectAt(page, box.x + 330, box.y + 250)
        await pickChip(page, 'Residential cluster')

        await clickRowAction(page, 'Delete', 'Residential cluster')

        await expect
            .poll(async () => (await readAreas(page))[0].boundTo, {
                timeout: 10_000,
            })
            .toBeNull()

        // The mark keeps exactly how it looks. Removing a caption is not a
        // request to restyle a map.
        expect((await readAreas(page))[0].stroke).toBe(RED)
    })

    test('a preset only offers itself to its own kind of mark', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))
        await drawRoute(page, at(box, ROUTE))

        // A route is a few pixels of stroke, so clicking "on the line" is not
        // a reliable hit — the suite selects one through a VERTEX HANDLE, which
        // is a real target. Read while the route is still selected from being
        // drawn; the handles stay in the DOM once it is deselected.
        //
        // Filtered by position, because the AREA has handles of its own and
        // they come first in the DOM: taking `querySelector` blind selects the
        // area, and then an area preset is offered — correctly — to an area.
        const vertex = await page.evaluate((minY) => {
            const hit = [...document.querySelectorAll('.is-vertex-handle')]
                .map((h) => {
                    const r = h.getBoundingClientRect()
                    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
                })
                .find((c) => c.y > minY)
            return hit ?? null
        }, box.y + 380)
        expect(vertex).not.toBeNull()

        await createPreset(page, { name: 'Residential cluster', colour: RED })

        // The route's chip row exists but carries no area preset.
        await selectAt(page, vertex.x, vertex.y)

        // Prove it really is the ROUTE that is selected before asserting what
        // it is offered — otherwise this passes for the wrong reason.
        await expect(page.locator('#floating-toolbar')).toContainText(
            'Styling: Route'
        )

        const row = page.locator('#mc-preset-chips')
        await row.waitFor({ state: 'visible', timeout: 10_000 })
        await expect(
            row.getByRole('button', { name: 'Residential cluster' })
        ).toHaveCount(0)
        await expect(row.getByRole('button', { name: 'None' })).toHaveCount(1)
    })

    // --- The tool drawer ------------------------------------------------

    test('selecting a preset-able tool opens the drawer; other tools do not', async ({
        page,
    }) => {
        await setupLocalBase(page)
        await createPreset(page, { name: 'Residential cluster', colour: RED })

        const row = page.locator('#mc-preset-chips')
        await expect(row).toHaveCount(0)

        // Each of the four opens it, with nothing drawn and nothing selected.
        for (const tool of ['Point', 'Area', 'Route', 'Radius Map']) {
            await clickToolbarButton(page, tool)
            await expect(row).toBeVisible({ timeout: 10_000 })
        }

        // A tool with no presets to offer has no drawer.
        await clickToolbarButton(page, 'Pencil')
        await expect(row).toHaveCount(0)
    })

    test('the drawer offers only the presets for the armed tool', async ({
        page,
    }) => {
        await setupLocalBase(page)
        await createPreset(page, { name: 'Residential cluster', colour: RED })

        await clickToolbarButton(page, 'Area')
        const row = page.locator('#mc-preset-chips')
        await expect(
            row.getByRole('button', { name: 'Residential cluster' })
        ).toHaveCount(1)

        await clickToolbarButton(page, 'Route')
        await expect(
            row.getByRole('button', { name: 'Residential cluster' })
        ).toHaveCount(0)
        await expect(row).toContainText('No presets for this yet')
    })

    test('a preset armed on the tool styles and captions the next mark drawn', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await createPreset(page, { name: 'Residential cluster', colour: RED })

        // Arm it BEFORE drawing — the whole point of the tool drawer.
        await clickToolbarButton(page, 'Area')
        await pickChip(page, 'Residential cluster')

        await drawArea(page, at(box, AREA_A))

        const [area] = await readAreas(page)
        expect(area.stroke).toBe(RED)
        expect(area.paintedStroke).toBe(RED)
        expect(area.boundTo).not.toBeNull()
    })

    test('an armed preset is sticky across draws until set back to None', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await createPreset(page, { name: 'Residential cluster', colour: RED })

        await clickToolbarButton(page, 'Area')
        await pickChip(page, 'Residential cluster')
        await drawArea(page, at(box, AREA_A))

        // Second area, without re-picking: captioning six clusters must not
        // mean picking the same preset six times.
        await clickToolbarButton(page, 'Area')
        await drawArea(page, at(box, AREA_B))
        expect((await readAreas(page)).every((a) => a.boundTo !== null)).toBe(
            true
        )

        // None disarms, and the next mark comes out uncaptioned.
        await clickToolbarButton(page, 'Area')
        await pickChip(page, 'None')
        await drawArea(page, at(box, AREA_C))

        const areas = await readAreas(page)
        expect(areas.length).toBe(3)
        expect(areas.filter((a) => a.boundTo === null).length).toBe(1)
    })

    test('deleting a preset disarms it, so the next mark is not bound to a ghost', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await createPreset(page, { name: 'Residential cluster', colour: RED })

        await clickToolbarButton(page, 'Area')
        await pickChip(page, 'Residential cluster')

        await clickRowAction(page, 'Delete', 'Residential cluster')
        await page.waitForTimeout(300)

        // A stale armed id would reach the insert as a dangling FK.
        await clickToolbarButton(page, 'Area')
        await drawArea(page, at(box, AREA_A))
        expect((await readAreas(page))[0].boundTo).toBeNull()
    })

    test('the legend survives a reload', async ({ page }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))

        await createPreset(page, { name: 'Residential cluster', colour: RED })
        await selectAt(page, box.x + 330, box.y + 250)
        await pickChip(page, 'Residential cluster')

        await page.reload()
        await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })

        await expect(
            page.locator('#mc-legend-panel').getByText('Residential cluster')
        ).toBeVisible({ timeout: 10_000 })

        await expect
            .poll(async () => (await readAreas(page))[0]?.boundTo ?? null, {
                timeout: 10_000,
            })
            .not.toBeNull()
    })
})
