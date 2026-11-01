// Sharing a canvas that has meta properties.
//
// What these protect:
//
//   1. The share dialog tells the user, in plain words, that images stay on
//      this device: image elements, AND `image` properties (named), which are
//      left off the shared canvas entirely.
//   2. The share carries every other property and value across, re-keyed:
//      definitions get new ids, and each value points at the SHARED copy of
//      its object (persistBase re-mints component ids).
//   3. Every meta write carries only columns the `user` role may insert, so
//      Hasura would accept it. The mock below REFUSES anything else, like the
//      component column guard in map-share.spec.js.

import { test, expect } from './helpers/test.js'
import {
    assertComponentColumns,
    GQL_MOCK_RESPONSES,
    pointAt,
} from './helpers/index.js'

const LOCAL_BASE = '99999999-9999-9999-9999-999999999999'

// The `user` role's insert columns, from mapcursor-hasura
// metadata/databases/default/tables/meta_property.yaml and
// meta_propertyValue.yaml. `createdBy` is an insert PRESET there, so a
// payload that carries it is rejected; `orphanedAt` is the sweep's alone.
const META_INSERT_COLUMNS = {
    insertBulkMetaProperties: [
        'baseId', 'createdAt', 'id', 'name', 'position', 'type', 'updatedAt', 'updatedBy',
    ],
    insertBulkMetaValues: [
        'baseId', 'createdAt', 'id', 'objectId', 'objectType', 'propertyId',
        'updatedAt', 'updatedBy', 'value',
    ],
}

function metaColumnErrors(body) {
    const allowed = META_INSERT_COLUMNS[body.operationName]
    if (!allowed) return []
    return (body.variables?.objects ?? []).flatMap((row) =>
        Object.keys(row)
            .filter((k) => !allowed.includes(k))
            .map((k) => `${body.operationName}.${k}`)
    )
}

const record = (extra) => ({
    x1: 0, x2: 0, y1: 0, y2: 0, width: 20, height: 20,
    fill: '#FF5630', stroke: null, linewidth: null, strokeType: null,
    textColor: null, children: {}, isDummy: null, updatedBy: null,
    createdAt: null, baseId: LOCAL_BASE, position: 1,
    ...extra,
})

const IMG = {
    assetId: 'not-needed-for-share',
    url: null,
    mimeType: 'image/png',
    naturalWidth: 10,
    naturalHeight: 10,
}

const POINT = record({
    id: 'local-point',
    componentType: 'point',
    ...pointAt(700, 450, { label: 'Vastrapur Lake' }),
})
const IMAGE_ELEMENT = record({
    id: 'local-image',
    componentType: 'image',
    width: 100,
    height: 80,
    ...pointAt(400, 300, { image: IMG }),
})

const META = {
    properties: [
        { id: 'prop-hours', baseId: LOCAL_BASE, name: 'Opening hours', type: 'text', position: 0, createdBy: null },
        { id: 'prop-photo', baseId: LOCAL_BASE, name: 'Storefront', type: 'image', position: 1, createdBy: null },
    ],
    values: [
        { id: 'v-hours', baseId: LOCAL_BASE, propertyId: 'prop-hours', objectId: 'local-point', objectType: 'point', value: '9am–6pm', createdBy: null },
        { id: 'v-photo', baseId: LOCAL_BASE, propertyId: 'prop-photo', objectId: 'local-point', objectType: 'point', value: IMG, createdBy: null },
    ],
}

async function openSharableCanvas(page, { components }) {
    const requests = []
    await page.route('**/v1/graphql', async (route) => {
        let data = {}
        let errors = null
        try {
            const body = JSON.parse(route.request().postData() || '{}')
            requests.push(body)
            const bad = metaColumnErrors(body)
            try {
                assertComponentColumns([body])
            } catch (err) {
                bad.push(err.message)
            }
            if (bad.length) {
                errors = [{ message: `rejected: ${bad.join(', ')}` }]
            } else if (body.operationName === 'insertBulkMetaProperties') {
                data = { properties: { affected_rows: body.variables.objects.length } }
            } else if (body.operationName === 'insertBulkMetaValues') {
                data = { values: { affected_rows: body.variables.objects.length } }
            } else {
                data = GQL_MOCK_RESPONSES[body.operationName] ?? {}
            }
        } catch (_) {}
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(errors ? { errors } : { data }),
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
            localStorage.setItem(`mapcursor_meta_${base}`, JSON.stringify(meta))
        },
        { base: LOCAL_BASE, components, meta: META }
    )
    await page.goto('/')
    await page.waitForSelector('[data-component-id="local-point"]', { timeout: 15_000 })
    await page.waitForTimeout(500)
    return requests
}

test('the share dialog explains, in plain words, that images stay here', async ({
    page,
}) => {
    await openSharableCanvas(page, { components: [POINT, IMAGE_ELEMENT] })
    await page.click('#mc-share-button')
    const note = page.locator('[role="note"]')
    await expect(note).toContainText('your images will stay on this device')
    await expect(note).toContainText('Images you’ve placed on the map')
    await expect(note).toContainText('“Storefront” property won’t be shared')
    await expect(note).toContainText('Everything else you’ve added')
    await expect(note).toContainText('Nothing is deleted')
})

test('sharing carries properties and values across, re-keyed, minus images', async ({
    page,
    context,
}) => {
    const requests = await openSharableCanvas(page, { components: [POINT] })
    context.on('page', (p) => void p.close().catch(() => {}))
    await page.click('#mc-share-button')
    await page.click('button:has-text("Yes, share")')
    await expect
        .poll(() => requests.some((r) => r.operationName === 'insertBulkMetaValues'))
        .toBe(true)

    // Nothing was refused: every write carried only insertable columns.
    expect(requests.filter((r) => metaColumnErrors(r).length)).toEqual([])
    expect(assertComponentColumns(requests)).toBeGreaterThan(0)

    const components = requests.find((r) => r.operationName === 'insertBulkComponents')
        .variables.objects
    const sharedPoint = components.find((c) => c.componentType === 'point')
    expect(sharedPoint.id).not.toBe('local-point')

    const [props] = requests
        .filter((r) => r.operationName === 'insertBulkMetaProperties')
        .map((r) => r.variables.objects)
    // The image property is left behind, as the dialog said.
    expect(props.map((p) => p.name)).toEqual(['Opening hours'])
    expect(props[0].id).not.toBe('prop-hours')
    expect(props[0].baseId).toBe(sharedPoint.baseId)

    const [values] = requests
        .filter((r) => r.operationName === 'insertBulkMetaValues')
        .map((r) => r.variables.objects)
    expect(values).toHaveLength(1)
    expect(values[0]).toMatchObject({
        objectId: sharedPoint.id,
        propertyId: props[0].id,
        baseId: sharedPoint.baseId,
        value: '9am–6pm',
    })

    // Definitions before values: values carry them as a real FK.
    const order = requests.map((r) => r.operationName)
    expect(order.indexOf('insertBulkMetaProperties')).toBeLessThan(
        order.indexOf('insertBulkMetaValues')
    )
    expect(order.indexOf('insertBulkComponents')).toBeLessThan(
        order.indexOf('insertBulkMetaValues')
    )
})
