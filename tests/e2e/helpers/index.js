import { COMPONENT_COLUMN_NAMES } from '../../../src/utils/componentColumns'
import {
    geometryFields,
    lineGeometry,
    pointGeometry,
    polygonGeometry,
} from '../../../src/utils/geometry'

export const pointAt = (x, y, properties = {}) =>
    geometryFields(pointGeometry(x, y), properties)

export const lineThrough = (points, properties = {}) =>
    geometryFields(lineGeometry(points), properties)

export const polygonOver = (points, properties = {}) =>
    geometryFields(polygonGeometry(points), properties)

export const GQL_MOCK_RESPONSES = {
    getComponentTypes: {
        componentTypes: [
            {
                label: 'point',
                width: 20,
                height: 20,
                fill: '#FF5630',
                textColor: '#000',
                metadata: {},
                logo: null,
            },
            {
                label: 'area',
                width: 120,
                height: 120,
                fill: 'transparent',
                textColor: null,
                metadata: {},
                logo: null,
            },
            {
                label: 'route',
                width: 120,
                height: 0,
                fill: 'transparent',
                textColor: null,
                metadata: {},
                logo: null,
            },
            {
                label: 'circle',
                width: 120,
                height: 120,
                fill: '#A32D2D',
                textColor: '#000',
                metadata: {},
                logo: null,
            },
            {
                label: 'pencil',
                width: 120,
                height: 120,
                fill: '#f4f4f2',
                textColor: '#f4f4f2',
                metadata: [{}],
                logo: null,
            },
            {
                label: 'text',
                width: 120,
                height: 120,
                fill: 'transparent',
                textColor: '#000',
                metadata: { content: 'Your text here' },
                logo: null,
            },
        ],
    },
    updateUserRevisitCount: {
        update_users_user_revisits_by_pk: { count: 1, user_id: 'test-user-id' },
    },
    createBase: {
        base: {
            id: '99999999-9999-9999-9999-999999999999',
            createdBy: 'test-user-id',
        },
    },
    insertBulkComponents: {
        insert_components_component: {
            __typename: 'components_component_mutation_response',
            affected_rows: 0,
            returning: [],
        },
    },
    updateBaseVisibility: {
        update_bases_base_by_pk: {
            id: '99999999-9999-9999-9999-999999999999',
            isPublic: true,
        },
    },
    sharePersistedBase: {
        base: {
            id: '99999999-9999-9999-9999-999999999999',
            isPublic: true,
        },
    },
}

export function baseRow({
    id = '11111111-1111-1111-1111-111111111111',
    isPublic = true,
    anchor = null,
    landing = null,
} = {}) {
    return {
        __typename: 'bases_base',
        id,
        isPublic,
        mapAnchorLng: anchor ? anchor.lngLat[0] : null,
        mapAnchorLat: anchor ? anchor.lngLat[1] : null,
        mapAnchorZoom: anchor ? anchor.zoom : null,
        landingLng: landing ? landing.lngLat[0] : null,
        landingLat: landing ? landing.lngLat[1] : null,
        landingZoom: landing ? landing.zoom : null,
    }
}

export async function mockAuth(page) {
    await page.route('**/auth/{session,register}', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                token: 'test-token',
                userId: 'test-user-id',
            }),
        })
    )
}

export async function setupLocalBase(page, { seedAnchor = true } = {}) {
    await mockAuth(page)
    await page.route('**/v1/graphql', async (route) => {
        let responseData = {}
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            responseData = GQL_MOCK_RESPONSES[body.operationName] ?? {}
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: responseData }),
        })
    })

    await page.addInitScript((seed) => {
        localStorage.setItem('userId', 'test-user-id')
        if (!seed) return
        const localBaseId = '99999999-9999-9999-9999-999999999999'
        localStorage.setItem('mapcursor_local_base_id', localBaseId)
        localStorage.setItem(
            `mapcursor_map_anchor_${localBaseId}`,
            JSON.stringify({
                mapAnchor: { lngLat: [72.5714, 23.0225], zoom: 16 },
                savedAt: Date.now(),
            })
        )
    }, seedAnchor)

    await page.goto('/')
    await page.waitForSelector('#main-two-root svg', { timeout: 15_000 })
}

export async function getCanvasBox(page) {
    return page.locator('#main-two-root svg').boundingBox()
}

const SHAPE_TOOLBAR_LABEL = {
    rectangle: 'Rectangle / Square',
    circle: 'Radius Map',
    diamond: 'Diamond',
}

export async function drawShape(page, type, { startX, startY, endX, endY }) {
    const ariaLabel = SHAPE_TOOLBAR_LABEL[type]
    if (!ariaLabel) throw new Error(`Unknown shape type: ${type}`)

    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    const shapesDrawer = await page.$('[aria-label="Shapes"]')
    if (shapesDrawer) await shapesDrawer.click()
    await page.click(`[aria-label="${ariaLabel}"]`)

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

async function waitForNewElement(page, countBefore, { timeout } = {}) {
    await page.waitForFunction(
        (before) =>
            document.querySelectorAll('[data-component-id]').length > before,
        countBefore,
        { timeout }
    )
    const all = await page.$$('[data-component-id]')
    return all[all.length - 1]
}

export async function expectComponentCount(page, expected, { timeout } = {}) {
    await page.waitForFunction(
        (want) =>
            new Set(
                Array.from(
                    document.querySelectorAll('[data-component-id]'),
                    (el) => el.getAttribute('data-component-id')
                )
            ).size === want,
        expected,
        { timeout }
    )
}

async function clickToolbarShape(page, ariaLabel) {
    await page.click(`[aria-label="${ariaLabel}"]`)
}

const STROKE_WIDTH_INDEX_BY_LABEL = {
    0: 1,
    1: 2,
    2: 3,
    4: 4,
    6: 5,
    8: 6,
}

export async function setDefaultStrokeWidth(page, label) {
    const idx = STROKE_WIDTH_INDEX_BY_LABEL[label]
    if (!idx)
        throw new Error(
            `Unknown stroke width label: ${label}. Valid: 0, 1, 2, 4, 6, 8.`
        )
    await page.click(`#stroke-width-section button:nth-of-type(${idx})`)
}

export async function placeText(page, { x, y }) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    await clickToolbarShape(page, 'Text')

    await waitForNewElement(page, countBefore)

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()

    const all = await page.$$('[data-component-id]')
    return all[all.length - 1]
}

export async function getDraftComponents(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem('mapcursor_local_draft')
        if (!raw) return null
        return JSON.parse(raw).components || {}
    })
}

export async function triggerUndoKeyboard(page) {
    await page.keyboard.press('Meta+z')
}

export async function clickUndoButton(page) {
    await page.click('[aria-label="Undo"]')
}

export async function triggerRedoKeyboard(page) {
    await page.keyboard.press('Meta+Shift+z')
}

export async function clickRedoButton(page) {
    await page.click('[aria-label="Redo"]')
}

export async function drawPencilStroke(page, { startX, startY, endX, endY }) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    await clickToolbarShape(page, 'Pencil')

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 20 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

export async function clickToolbarButton(page, ariaLabel) {
    await page.click(`[aria-label="${ariaLabel}"]`)
}

export async function placePoint(page, { x, y, label = '' } = {}) {
    await clickToolbarShape(page, 'Point')
    await page.mouse.click(x, y)
    await page.waitForSelector('.temp-input-area', { timeout: 15_000 })
    if (label) await page.keyboard.type(label)
    await page.keyboard.press('Enter')
    await page
        .locator('.temp-input-area')
        .waitFor({ state: 'detached', timeout: 10_000 })
    await page.waitForTimeout(150)
}

async function multiClickDraw(page, tool, points) {
    if (points.length < 2) throw new Error(`${tool} needs at least 2 points`)
    await clickToolbarShape(page, tool)
    for (const p of points) {
        await page.mouse.click(p.x, p.y)
        await page.waitForTimeout(60)
    }
    await page.keyboard.press('Enter')
    await page.waitForTimeout(250)
}

export async function drawArea(page, points) {
    return multiClickDraw(page, 'Area', points)
}

export async function drawRoute(page, points) {
    return multiClickDraw(page, 'Route', points)
}

export async function clickPointerTool(page) {
    await page.click('[aria-label="Select"]')
}

export async function dragSelectArea(
    page,
    { startX, startY, endX, endY },
    { timeout } = {}
) {
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    await page.waitForSelector('[data-label="groupobject_coord"]', { timeout })
    return page.$('[data-label="groupobject_coord"]')
}

export const readCamera = () => {
    const two = window.__mcTwo
    if (!two) {
        throw new Error(
            '__mcTwo is missing: this build was made without VITE_E2E_HOOKS ' +
                '(see src/utils/e2eHooks.ts and netlify.toml)'
        )
    }
    return {
        scale: two.scene.scale,
        tx: two.scene.translation.x,
        ty: two.scene.translation.y,
    }
}

const COMPONENT_WRITE_OPS = {
    insertComponent: (v) => [v?.object],
    insertBulkComponents: (v) => v?.objects ?? [],
    updateComponentInfo: (v) => [v?.updateObj],
}

export function assertComponentColumns(requests) {
    let checked = 0
    const offenders = []

    requests.forEach((req) => {
        const extract = COMPONENT_WRITE_OPS[req?.operationName]
        if (!extract) return
        extract(req.variables).forEach((payload) => {
            if (!payload || typeof payload !== 'object') return
            checked += 1
            Object.keys(payload)
                .filter((key) => !COMPONENT_COLUMN_NAMES.includes(key))
                .forEach((key) => {
                    offenders.push(`${req.operationName}.${key}`)
                })
        })
    })

    if (offenders.length > 0) {
        throw new Error(
            'Component mutation carried field(s) with no Hasura column: ' +
                `${[...new Set(offenders)].join(', ')}.\n` +
                'Hasura rejects the whole mutation on the first one. Route the ' +
                'payload through toComponentColumns() (src/utils/componentColumns.ts), ' +
                'or add the column there if it is real.'
        )
    }
    return checked
}
