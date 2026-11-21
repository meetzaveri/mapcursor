import { test, expect } from './helpers/test.js'
import {
    clickToolbarButton,
    drawArea,
    drawRoute,
    getCanvasBox,
    setupLocalBase,
    triggerUndoKeyboard,
} from './helpers/index.js'

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

const at = (box, pts) => pts.map((p) => ({ x: box.x + p.x, y: box.y + p.y }))

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

const wizard = (page) => page.locator('.modal-portal')

async function awaitModalGone(page) {
    await expect(page.locator('.modal-portal')).toHaveCount(0, {
        timeout: 10_000,
    })
}

async function finishWizard(w) {
    const save = w.getByRole('button', { name: 'Save preset' })
    for (let i = 0; i < 5 && !(await save.isVisible()); i++) {
        await w.getByRole('button', { name: 'Next' }).click()
    }
    await save.click()
}

async function createPreset(page, { name, type = 'Area', colour = RED } = {}) {
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

    await w.locator(`[title="${colour}"]`).first().click()
    await w.getByRole('button', { name: 'Next' }).click()

    await finishWizard(w)
    await awaitModalGone(page)
}

async function selectAt(page, x, y) {
    await clickToolbarButton(page, 'Select')
    await page.mouse.click(x, y)
    await page.waitForTimeout(200)
}

async function pickChip(page, label) {
    const row = page.locator('#mc-preset-chips')
    await row.waitFor({ state: 'visible', timeout: 10_000 })
    await row.getByRole('button', { name: label, exact: true }).click()
    await page.waitForTimeout(200)
}

async function clickRowAction(page, action, presetName) {
    const button = page.getByRole('button', {
        name: `${action} ${presetName}`,
    })
    await page.locator('li[data-preset-id]', { has: button }).hover()
    await button.click()
}

test.describe('legend presets', () => {
    test('a filled mark takes its fill as its stroke; a stroked one does not', () => {
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
        Object.values(PRESET_STYLE_KEYS)
            .flat()
            .forEach((key) => expect(LEGEND_STYLE_KEYS.has(key)).toBe(true))
    })

    test('a partially-filled preset blanks nothing', () => {
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

        expect((await readAreas(page))[0].stroke).toBe(RED)
    })

    test('a preset only offers itself to its own kind of mark', async ({
        page,
    }) => {
        await setupLocalBase(page)
        const box = await getCanvasBox(page)
        await drawArea(page, at(box, AREA_A))
        await drawRoute(page, at(box, ROUTE))

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

        await selectAt(page, vertex.x, vertex.y)

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

    test('selecting a preset-able tool opens the drawer; other tools do not', async ({
        page,
    }) => {
        await setupLocalBase(page)
        await createPreset(page, { name: 'Residential cluster', colour: RED })

        const row = page.locator('#mc-preset-chips')
        await expect(row).toHaveCount(0)

        for (const tool of ['Point', 'Area', 'Route', 'Radius Map']) {
            await clickToolbarButton(page, tool)
            await expect(row).toBeVisible({ timeout: 10_000 })
        }

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

        await clickToolbarButton(page, 'Area')
        await drawArea(page, at(box, AREA_B))
        expect((await readAreas(page)).every((a) => a.boundTo !== null)).toBe(
            true
        )

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
