import { test, expect } from './helpers/test.js'
import {
    clickRedoButton,
    clickUndoButton,
    GQL_MOCK_RESPONSES,
    lineThrough,
    mockAuth,
    pointAt,
    triggerRedoKeyboard,
    triggerUndoKeyboard,
} from './helpers/index.js'
import { assetCount, makePng } from './helpers/images.js'

const LOCAL_BASE = '99999999-9999-9999-9999-999999999999'
const PANEL = '#mc-meta-panel'
const DIALOG = '[data-meta-panel-dialog]'

const POINT_AT = { x: 700, y: 450 }

const row = (extra) => ({
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    width: 20,
    height: 20,
    fill: '#FF5630',
    stroke: null,
    linewidth: null,
    strokeType: null,
    textColor: null,
    children: {},
    isDummy: null,
    updatedBy: null,
    createdAt: null,
    baseId: LOCAL_BASE,
    position: 1,
    ...extra,
})

const POINT = row({
    id: 'p1',
    componentType: 'point',
    ...pointAt(POINT_AT.x, POINT_AT.y, { label: 'Vastrapur Lake' }),
})
const ROUTE = row({
    id: 'r1',
    componentType: 'route',
    stroke: '#0065FF',
    linewidth: 4,
    position: 2,
    ...lineThrough([
        { x: 300, y: 650 },
        { x: 520, y: 650 },
    ]),
})

async function openSeeded(page, { components = [POINT, ROUTE], meta = null } = {}) {
    await mockAuth(page)
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            data = GQL_MOCK_RESPONSES[body.operationName] ?? {}
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        })
    })
    await page.addInitScript(
        ({ base, components, meta }) => {
            if (sessionStorage.getItem('seeded')) return
            sessionStorage.setItem('seeded', '1')
            localStorage.setItem('userId', 'test-user-id')
            localStorage.setItem('mapcursor_local_base_id', base)
            localStorage.setItem(
                `mapcursor_map_anchor_${base}`,
                JSON.stringify({
                    mapAnchor: { lngLat: [72.5714, 23.0225], zoom: 16 },
                    savedAt: Date.now(),
                })
            )
            localStorage.setItem(
                'mapcursor_local_draft',
                JSON.stringify({
                    baseId: base,
                    timestamp: Date.now(),
                    components: Object.fromEntries(components.map((c) => [c.id, c])),
                })
            )
            if (meta) {
                localStorage.setItem(`mapcursor_meta_${base}`, JSON.stringify(meta))
            }
        },
        { base: LOCAL_BASE, components, meta }
    )
    await page.goto('/')
    await page.waitForSelector('[data-component-id="p1"]', { timeout: 15_000 })
    await page.waitForTimeout(500)
}

const sidecar = (page) =>
    page.evaluate(
        (base) => JSON.parse(localStorage.getItem(`mapcursor_meta_${base}`) || 'null'),
        LOCAL_BASE
    )

const propertyNames = async (page) =>
    ((await sidecar(page))?.properties ?? []).map((p) => `${p.name}:${p.type}`)

const rows = async (page) =>
    (await page.locator(`${PANEL} li[data-meta-property-id]`).allInnerTexts()).map(
        (t) => t.replace(/\n+/g, '=').trim()
    )

async function selectPoint(page) {
    const box = await page.evaluate(() => {
        const g = document.querySelector('[data-component-id="p1"]')
        const dot = g.querySelector('circle, ellipse') || g
        const r = dot.getBoundingClientRect()
        return { x: r.left + Math.min(r.width, 20) / 2, y: r.top + r.height / 2 }
    })
    await page.mouse.click(box.x, box.y)
    await page.locator(PANEL).waitFor()
}

async function addProperty(page, { name, type = 'Text', value, existing = false }) {
    const panel = page.locator(PANEL)
    await panel.getByText('+ Add property').click()
    if (existing) {
        await panel.getByRole('button', { name, exact: true }).click()
    } else {
        const create = panel.getByText('+ Or create a new property')
        if (await create.count()) await create.click()
        await panel.getByPlaceholder('Name, e.g. Opening hours').fill(name)
        await panel.getByLabel('Select Type').selectOption({ label: type })
    }
    await panel.getByText('Next →').click()
    if (value !== undefined) {
        await panel.locator('textarea, input').first().fill(String(value))
    }
}

async function saveWizard(page) {
    await page.locator(PANEL).getByText('Save').click()
    await page.waitForTimeout(300)
}

async function rowAction(page, label) {
    await page.locator(`${PANEL} li[data-meta-property-id]`).first().hover()
    await page.locator(PANEL).getByRole('button', { name: label }).click()
}

test.describe('meta properties panel', () => {
    test('shows only while one supported object is selected', async ({ page }) => {
        await openSeeded(page)
        await expect(page.locator(PANEL)).toHaveCount(0)

        await selectPoint(page)
        await expect(page.locator(PANEL)).toContainText('Point')
        await expect(page.locator(PANEL)).toContainText('No properties on this point yet')

        await page.mouse.click(1000, 250)
        await expect(page.locator(PANEL)).toHaveCount(0)

        await page.mouse.click(410, 650)
        await expect(page.locator(PANEL)).toContainText('Route')
    })

    test('drags by its grip, keeps the selection, and docks on double-click', async ({
        page,
    }) => {
        await openSeeded(page)
        await selectPoint(page)
        const panel = page.locator(PANEL)
        await expect(panel).toContainText('Point')
        const docked = await panel.boundingBox()

        const grip = panel.getByRole('button', { name: /Drag to move/ })
        const g = await grip.boundingBox()
        const from = { x: g.x + g.width / 2, y: g.y + g.height / 2 }
        await page.mouse.move(from.x, from.y)
        await page.mouse.down()
        await page.mouse.move(from.x - 400, from.y + 120, { steps: 10 })
        await page.mouse.up()

        const moved = await panel.boundingBox()
        expect(moved.x).toBeCloseTo(docked.x - 400, -1)
        expect(moved.y).toBeCloseTo(docked.y + 120, -1)
        await expect(panel).toContainText('Point')

        await page.mouse.click(1000, 250)
        await expect(panel).toHaveCount(0)
        await selectPoint(page)
        const again = await panel.boundingBox()
        expect(again.x).toBeCloseTo(moved.x, 0)
        expect(again.y).toBeCloseTo(moved.y, 0)

        await panel.getByRole('button', { name: /Drag to move/ }).dblclick()
        const home = await panel.boundingBox()
        expect(home.x).toBeCloseTo(docked.x, 0)
        expect(home.y).toBeCloseTo(docked.y, 0)
    })

    test('the wizard refuses a value that does not fit, then saves it', async ({
        page,
    }) => {
        await openSeeded(page)
        await selectPoint(page)
        await addProperty(page, { name: 'Rating', type: 'Number', value: '4.5' })
        await saveWizard(page)
        await expect(page.locator(PANEL)).toContainText('Enter a whole number.')
        expect(await propertyNames(page)).toEqual([])

        await page.locator(PANEL).locator('input').first().fill('4')
        await saveWizard(page)
        expect(await rows(page)).toEqual(['Rating=4'])
        expect(await propertyNames(page)).toEqual(['Rating:integer'])

        await page.reload()
        await page.waitForSelector('[data-component-id="p1"]')
        await selectPoint(page)
        expect(await rows(page)).toEqual(['Rating=4'])
    })

    test('a photo attached to a place survives a reload', async ({ page }) => {
        await openSeeded(page)
        await selectPoint(page)
        await addProperty(page, { name: 'Photo', type: 'Image' })
        const [chooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.locator(PANEL).getByText('Choose an image').click(),
        ])
        expect(chooser.isMultiple()).toBe(false)
        await chooser.setFiles({
            name: 'storefront.png',
            mimeType: 'image/png',
            buffer: await makePng(page, { width: 640, height: 480 }),
        })
        await page.locator(PANEL).getByText('Replace image').waitFor()
        await saveWizard(page)
        expect(await assetCount(page)).toBe(1)

        await page.reload()
        await page.waitForSelector('[data-component-id="p1"]')
        await page.waitForTimeout(1000)
        expect(await assetCount(page)).toBe(1)
        await selectPoint(page)
        await expect(page.locator(`${PANEL} img`)).toHaveCount(1)

        await page.locator(PANEL).getByRole('button', { name: 'View image' }).click()
        await expect(page.locator(`${DIALOG} img`)).toHaveCount(1)
    })

    test('every edit undoes and redoes', async ({ page }) => {
        await openSeeded(page)
        await selectPoint(page)

        await addProperty(page, { name: 'Quantity', value: '12' })
        await saveWizard(page)
        expect(await rows(page)).toEqual(['Quantity=12'])
        await triggerUndoKeyboard(page)
        await expect.poll(() => rows(page)).toEqual([])
        expect(await propertyNames(page)).toEqual([])
        await triggerRedoKeyboard(page)
        await expect.poll(() => rows(page)).toEqual(['Quantity=12'])

        await page.locator(PANEL).getByRole('button', { name: 'Edit Quantity' }).click()
        await page.locator(`${PANEL} textarea`).fill('a dozen')
        await page.locator(`${PANEL} textarea`).press('Enter')
        await expect.poll(() => rows(page)).toEqual(['Quantity=a dozen'])
        await clickUndoButton(page)
        await expect.poll(() => rows(page)).toEqual(['Quantity=12'])
        await clickRedoButton(page)
        await expect.poll(() => rows(page)).toEqual(['Quantity=a dozen'])
        await triggerUndoKeyboard(page)
        await expect.poll(() => rows(page)).toEqual(['Quantity=12'])

        await rowAction(page, 'Remove from this point')
        await expect.poll(() => rows(page)).toEqual([])
        expect(await propertyNames(page)).toEqual(['Quantity:text'])
        await triggerUndoKeyboard(page)
        await expect.poll(() => rows(page)).toEqual(['Quantity=12'])

        await rowAction(page, 'Rename property')
        await page.locator(`${DIALOG} input`).fill('Count')
        await page.locator(`${DIALOG} input`).press('Enter')
        await expect.poll(() => rows(page)).toEqual(['Count=12'])
        await triggerUndoKeyboard(page)
        await expect.poll(() => rows(page)).toEqual(['Quantity=12'])

        await rowAction(page, 'Change type')
        await page.locator(DIALOG).getByRole('radio', { name: 'Number' }).click()
        await expect(page.locator(DIALOG)).toContainText('1 value will be converted.')
        await page.locator(DIALOG).getByRole('button', { name: 'Change type' }).click()
        await expect.poll(() => propertyNames(page)).toEqual(['Quantity:integer'])
        await triggerUndoKeyboard(page)
        await expect.poll(() => propertyNames(page)).toEqual(['Quantity:text'])
        await triggerRedoKeyboard(page)
        await expect.poll(() => propertyNames(page)).toEqual(['Quantity:integer'])

        await rowAction(page, 'Delete property from map')
        await expect(page.locator(DIALOG)).toContainText('You can undo this')
        await page.locator(DIALOG).getByRole('button', { name: 'Delete property' }).click()
        await expect.poll(() => propertyNames(page)).toEqual([])
        await triggerUndoKeyboard(page)
        await expect.poll(() => propertyNames(page)).toEqual(['Quantity:integer'])
        await expect.poll(() => rows(page)).toEqual(['Quantity=12'])
    })

    test('undo walks canvas and meta edits in the order they were made', async ({
        page,
    }) => {
        await openSeeded(page)
        await selectPoint(page)
        await addProperty(page, { name: 'Hours', value: '9–5' })
        await saveWizard(page)

        await page.mouse.move(POINT_AT.x + 1, POINT_AT.y)
        await page.mouse.down()
        await page.mouse.move(POINT_AT.x + 81, POINT_AT.y, { steps: 8 })
        await page.mouse.up()
        const x = () =>
            page.evaluate(
                () => JSON.parse(localStorage.getItem('mapcursor_local_draft')).components.p1.x
            )
        await expect.poll(x).toBeGreaterThan(POINT_AT.x + 40)

        await triggerUndoKeyboard(page)
        await expect.poll(x).toBe(POINT_AT.x)
        expect(await propertyNames(page)).toEqual(['Hours:text'])
        await triggerUndoKeyboard(page)
        await expect.poll(() => propertyNames(page)).toEqual([])
    })

    test('a pasted copy gets its own values', async ({ page }) => {
        await openSeeded(page)
        await selectPoint(page)
        await addProperty(page, { name: 'Hours', value: '9–5' })
        await saveWizard(page)

        await page.keyboard.press('ControlOrMeta+c')
        await page.mouse.move(POINT_AT.x + 200, POINT_AT.y - 150)
        await page.keyboard.press('ControlOrMeta+v')
        await expect
            .poll(async () => ((await sidecar(page))?.values ?? []).length)
            .toBe(2)
        const { values } = await sidecar(page)
        const copy = values.find((v) => v.objectId !== 'p1')
        expect(copy.value).toBe('9–5')
        await expect
            .poll(() =>
                page.evaluate(() =>
                    Object.keys(
                        JSON.parse(localStorage.getItem('mapcursor_local_draft')).components
                    )
                )
            )
            .toContain(copy.objectId)
    })

    test('values whose object is gone are dropped on load', async ({ page }) => {
        const property = {
            id: 'prop-hours',
            baseId: LOCAL_BASE,
            name: 'Hours',
            type: 'text',
            position: 0,
            createdBy: null,
        }
        const value = (id, objectId) => ({
            id,
            baseId: LOCAL_BASE,
            propertyId: 'prop-hours',
            objectId,
            objectType: 'point',
            value: 'x',
            createdBy: null,
        })
        await openSeeded(page, {
            meta: {
                properties: [property],
                values: [value('live', 'p1'), value('orphan', 'deleted-long-ago')],
            },
        })
        const { properties, values } = await sidecar(page)
        expect(properties.map((p) => p.name)).toEqual(['Hours'])
        expect(values.map((v) => v.id)).toEqual(['live'])
    })

    test('typing in the panel never reaches canvas shortcuts', async ({ page }) => {
        await openSeeded(page)
        await selectPoint(page)
        await addProperty(page, { name: 'Notes' })
        const field = page.locator(`${PANEL} textarea`)
        await field.type('pp')
        await field.press('Backspace')
        await expect(field).toHaveValue('p')
        await expect(page.locator('[data-component-id="p1"]')).toHaveCount(1)
        await expect(page.locator(PANEL)).toHaveCount(1)
    })

    test('a JSON export carries the properties and their photos', async ({ page }) => {
        await openSeeded(page)
        await selectPoint(page)
        await addProperty(page, { name: 'Hours', value: '9–5' })
        await saveWizard(page)
        await addProperty(page, { name: 'Photo', type: 'Image' })
        const [chooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.locator(PANEL).getByText('Choose an image').click(),
        ])
        await chooser.setFiles({
            name: 'p.png',
            mimeType: 'image/png',
            buffer: await makePng(page, { width: 64, height: 64 }),
        })
        await page.locator(PANEL).getByText('Replace image').waitFor()
        await saveWizard(page)

        await page.mouse.click(1000, 250)
        await page.click('[title="Menu"]')
        await page.getByText('Export canvas').click()
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByText('Export as JSON').click(),
        ])
        const fs = await import('node:fs')
        const file = JSON.parse(fs.readFileSync(await download.path(), 'utf8'))
        expect(file.metaProperties.properties.map((p) => p.name)).toEqual([
            'Hours',
            'Photo',
        ])
        const photo = file.metaProperties.values.find(
            (v) => typeof v.value === 'object'
        )
        expect(file.assets[photo.value.assetId]).toMatch(/^data:image\/png;base64,/)
    })
})
