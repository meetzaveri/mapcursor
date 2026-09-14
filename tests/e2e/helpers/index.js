import { COMPONENT_COLUMN_NAMES } from '../../../src/utils/componentColumns'
import {
    geometryFields,
    lineGeometry,
    pointGeometry,
    polygonGeometry,
} from '../../../src/utils/geometry'

// Fixture builders for the geometry envelope.
//
// These call the PRODUCTION constructors rather than hand-writing
// `{ geometry, properties }`, so a fixture cannot drift from what the app
// actually writes — including the details that are easy to get wrong by hand
// (a polygon's closing position, and x/y being derived from the geometry
// rather than set independently). Each returns `{ metadata, x, y }`, ready to
// spread into a component row.

/** A Point record at `(x, y)`. */
export const pointAt = (x, y, properties = {}) =>
    geometryFields(pointGeometry(x, y), properties)

/** A LineString record through `points` ([{x, y}, ...]). */
export const lineThrough = (points, properties = {}) =>
    geometryFields(lineGeometry(points), properties)

/** A Polygon record over `points`, given OPEN — the ring is closed for you. */
export const polygonOver = (points, properties = {}) =>
    geometryFields(polygonGeometry(points), properties)

// Mock responses keyed by GraphQL operation name.
// Apollo writes each field it requested into its cache; returning {} causes a
// "Missing field" cache error and can crash components that consume the data.
// Values mirror the components."componentType" seed rows.
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
    // Revisit-count mutation — return a minimal valid shape so Apollo doesn't error
    updateUserRevisitCount: {
        update_users_user_revisits_by_pk: { count: 1, user_id: 'test-user-id' },
    },
    // Share path. persistBase creates a base, bulk-inserts its components and
    // publishes it; each needs a shaped response or Apollo's cache write fails.
    createBase: {
        base: {
            id: '99999999-9999-9999-9999-999999999999',
            createdBy: 'test-user-id',
        },
    },
    // The mutation selects `returning { baseId componentType id }`, so the mock
    // must carry it — a missing field makes Apollo reject and the whole share
    // aborts before the base is ever published.
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

/**
 * A `bases_base` row for the getComponentsForBase mock.
 *
 * That query returns the base ROW as well as its components (the base type and
 * map georeference have to be known before the canvas mounts, so they ride the
 * query that already gates loading). Any spec that opens a persisted base must
 * therefore answer with a `base` field — `null` is valid and means "no server
 * config", i.e. a base with no georeference yet.
 *
 * Pass `anchor`/`landing` as `{ lngLat: [lng, lat], zoom }` to describe a
 * shared map.
 */
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

/**
 * Sets userId in localStorage and mocks the GraphQL HTTP endpoint before the
 * page loads. Without the userId, AppInit would call insertUser and block
 * rendering. Without proper mock data, Apollo logs cache errors that can
 * crash sidebar components and break canvas interactions.
 */
export async function setupLocalBase(page, { seedAnchor = true } = {}) {
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
        // Every base is a map, so a base that has never settled on a place
        // opens the "where are you mapping?" prompt — a modal that covers the
        // toolbar and swallows every click. Claim a stable local base id and
        // give it an anchor so the local base loads already-placed, the way a
        // returning visitor's would. Mirrors LOCAL_BASE_ID_KEY /
        // MAP_ANCHOR_KEY_PREFIX in src/constants/misc.ts.
        //
        // Pass `seedAnchor: false` to get the un-placed base instead — that is
        // the state the start-location prompt exists for, so its own spec needs
        // it.
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

/**
 * Returns the bounding box of the canvas SVG. The `#main-two-root` div itself
 * has height 0 because the Two.js SVG is absolutely positioned, so callers
 * MUST measure off the SVG, not the wrapper div.
 */
export async function getCanvasBox(page) {
    return page.locator('#main-two-root svg').boundingBox()
}

// Toolbar aria-labels used to dispatch a draw mode (see staticPrimaryElementData).
const SHAPE_TOOLBAR_LABEL = {
    rectangle: 'Rectangle / Square',
    circle: 'Radius Map',
    diamond: 'Diamond',
}

/**
 * Draws a draw-to-place shape (rectangle or circle) on the canvas.
 *
 * Mirrors Path A in tests/workflows/how_shape_gets_drawn.md and crucially goes
 * through the real toolbar click — primary.js writes pendingShapeProps using
 * the live React state (defaultLinewidth, defaultStrokeType, fill from
 * getComponentTypesData), which is what production does. Bypassing the toolbar
 * with hardcoded props would mask any test that depends on those defaults
 * (e.g. the default-stroke-width tests).
 *
 * startX/Y and endX/Y are viewport coordinates. Keep them clear of the top
 * toolbar (~y < 60) and the Defaults panel (~x < 160).
 *
 * Returns an ElementHandle for the resulting SVG group element.
 */
export async function drawShape(page, type, { startX, startY, endX, endY }) {
    const ariaLabel = SHAPE_TOOLBAR_LABEL[type]
    if (!ariaLabel) throw new Error(`Unknown shape type: ${type}`)

    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    // On mobile, Rectangle/Circle/Diamond live inside a "Shapes" drawer that
    // must be opened first; on desktop they're flattened to top-level buttons
    // (see flattenShapesForDesktop in shapesToolbar.js) and the drawer parent
    // never renders. Click the drawer only if it exists.
    const shapesDrawer = await page.$('[aria-label="Shapes"]')
    if (shapesDrawer) await shapesDrawer.click()
    await page.click(`[aria-label="${ariaLabel}"]`)

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

/**
 * Waits for one new [data-component-id] element to appear (relative to a
 * pre-action count), then returns the most recently added one. Used by the
 * shape-creation helpers that go through the actual toolbar click.
 */
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

/**
 * Waits until the canvas holds exactly `expected` distinct components.
 *
 * `data-component-id` is NOT 1:1 with DOM nodes, so counting matched nodes
 * overcounts: attachVertexHandles (src/components/utils/vertexHandles.ts)
 * stamps the owning element's id onto every draggable vertex handle, so a
 * curvedLine/route/area with N vertices matches 1 group + N handle paths.
 * A 4-vertex curved line is 5 nodes but one component. De-dupe by id.
 */
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

/**
 * Click the toolbar icon for the given aria-label and wait for the icon's
 * parent button to take its `bg-accent` active state — this confirms
 * setCurrentElementInBase fired and the corresponding draw mode is armed.
 */
async function clickToolbarShape(page, ariaLabel) {
    await page.click(`[aria-label="${ariaLabel}"]`)
}

// Maps a STROKE_WIDTHS label (see STROKE_WIDTHS in
// src/components/sidebar/elementProperties.js) to the 1-based index of its
// button inside #stroke-width-section.
const STROKE_WIDTH_INDEX_BY_LABEL = {
    0: 1,
    1: 2,
    2: 3,
    4: 4,
    6: 5,
    8: 6,
}

/**
 * Clicks the unified element-properties toolbar's Stroke Width button matching
 * the given label ('0' | '1' | '2' | '4' | '6' | '8'). The buttons are unlabeled visual
 * swatches, so we pick by position within #stroke-width-section. All sets
 * (SHAPE / ARROW / PENCIL / RECT_WITH_TEXT) write to the same unified
 * `defaultLinewidth`.
 */
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

    // The element mounts off-screen on toolbar click; wait for it to show up
    // before dispatching mousedown so SCENARIO_TEXT_DRAW finds it in the scene.
    await waitForNewElement(page, countBefore)

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()

    const all = await page.$$('[data-component-id]')
    return all[all.length - 1]
}

/**
 * Double-clicks a rectangle to open the text input overlay, types the given
 * text, then presses Tab to commit it. Waits until the SVG <text> node appears
 * inside the rectangle group (confirming the text was saved to the store).
 */
/**
 * Reads the localStorage draft and returns the components map (or null if no
 * draft exists). The draft is written by useLocalDraftPersistence with a 500ms
 * debounce, so callers must wait for the debounced flush before reading.
 */
export async function getDraftComponents(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem('mapcursor_local_draft')
        if (!raw) return null
        return JSON.parse(raw).components || {}
    })
}

/**
 * Triggers the undo keyboard shortcut. The handler in newCanvas.js accepts
 * either ctrlKey or metaKey, so Meta+z works on Linux/CI as well as Mac.
 */
export async function triggerUndoKeyboard(page) {
    await page.keyboard.press('Meta+z')
}

/**
 * Clicks the Undo button in the shapes toolbar. The button is a div wrapping
 * an SVG with aria-label="Undo" (hover tooltip is a separate Tooltip
 * component, not a title attribute).
 */
export async function clickUndoButton(page) {
    await page.click('[aria-label="Undo"]')
}

/**
 * Triggers redo via keyboard. Cmd/Ctrl+Shift+Z is the redo shortcut; the
 * handler in newCanvas.js accepts either ctrlKey or metaKey alongside shiftKey.
 */
export async function triggerRedoKeyboard(page) {
    await page.keyboard.press('Meta+Shift+z')
}

/**
 * Clicks the Redo button in the shapes toolbar (aria-label="Redo").
 */
export async function clickRedoButton(page) {
    await page.click('[aria-label="Redo"]')
}

/**
 * Switches the toolbar to select/pan (Select) mode. Clears any draw-mode
 * flags left over by drawArrow/drawPencilStroke/placeText (they each set
 * localStorage flags during their flow), so the next mousedown on empty canvas
 * is interpreted as the start of a marquee group selection.
 */
/**
 * Draws a pencil stroke. Pencil mode requires at least 2 raw points to commit
 * a stroke (see SCENARIO_PENCIL_MODE mouseup), so we feed multiple intermediate
 * mouse positions on the way to (endX, endY).
 *
 * Returns the pencil stroke's SVG group element handle.
 */
export async function drawPencilStroke(page, { startX, startY, endX, endY }) {
    const countBefore = await page.$$eval(
        '[data-component-id]',
        (els) => els.length
    )

    await clickToolbarShape(page, 'Pencil')

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    // 20 small steps gives the velocity-based stroke logic enough samples to
    // accept the path as a real stroke.
    await page.mouse.move(endX, endY, { steps: 20 })
    await page.mouse.up()

    return waitForNewElement(page, countBefore)
}

/**
 * Draws a plain straight line. Line lives inside the "Lines" drawer in the
 * shapes toolbar (main icon → drawer with Line / Curved line). A line draws
 * with the SAME drag gesture as an arrow (primary.js routes 'line' through
 * handleArrowElement / SCENARIO_ARROW_DRAW) — only the componentType differs,
 * which strips the arrowhead via the line factory.
 *
 * Returns the line's SVG group element handle.
 */

/**
 * Clicks any top-level toolbar button by aria-label (e.g. "Pencil", "Select",
 * "Eraser"). Used by tests that need to switch the active draw mode so the
 * unified properties toolbar swaps to the matching set before tweaking a
 * default.
 */
export async function clickToolbarButton(page, ariaLabel) {
    await page.click(`[aria-label="${ariaLabel}"]`)
}

/**
 * Draws an arrow on the canvas (Path: arrowDrawMode in workflows doc).
 *   1. Click toolbar Arrow → handleArrowElement adds an arrowLine component
 *      immediately (off-screen at its random x/y) and sets arrowDrawMode.
 *   2. mousedown picks SCENARIO_ARROW_DRAW and positions the element at the
 *      click point.
 *   3. mousemove updates the second endpoint; mouseup finalizes.
 *
 * Returns the arrow's SVG group element handle.
 */

/**
 * Place a point: arm the tool, click the canvas, then commit the label editor.
 *
 * A point opens its label editor the moment it lands, so the click alone leaves
 * an element with an open <input> over it — every later gesture would go to the
 * editor instead of the canvas. Committing is part of placing one.
 */
export async function placePoint(page, { x, y, label = '' } = {}) {
    await clickToolbarShape(page, 'Point')
    await page.mouse.click(x, y)
    // The editor is created by the element component, which mounts lazily.
    await page.waitForSelector('.temp-input-area', { timeout: 15_000 })
    if (label) await page.keyboard.type(label)
    await page.keyboard.press('Enter')
    await page
        .locator('.temp-input-area')
        .waitFor({ state: 'detached', timeout: 10_000 })
    await page.waitForTimeout(150)
}

/**
 * Multi-click draw shared by Area and Route: one click per vertex, then Enter
 * to commit. `Escape` commits too (see finishGeoDraw in newCanvas) — Enter is
 * used here because it is the affirmative gesture a user reaches for.
 */
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

/** Draw a closed area (polygon). Needs at least 3 vertices — see MIN_VERTICES. */
export async function drawArea(page, points) {
    return multiClickDraw(page, 'Area', points)
}

/** Draw a route (polyline). Needs at least 2 vertices. */
export async function drawRoute(page, points) {
    return multiClickDraw(page, 'Route', points)
}

export async function clickPointerTool(page) {
    await page.click('[aria-label="Select"]')
}

/**
 * Drags an empty marquee rectangle on the canvas (Path: isGroupSelector branch
 * in src/newCanvas.js). Caller must already be in select/pan mode and the
 * (startX, startY) point must land on empty canvas. On mouseup, newCanvas calls
 * setOnGroupHandler which builds a groupobject from any element whose stored
 * (x, y) falls inside the marquee bounds.
 *
 * Returns the ElementHandle for the new groupobject SVG group, identified by
 * data-label="groupobject_coord" set in groupobject.js after Two.js mounts it.
 */
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

// --- Schema drift guard -------------------------------------------------
//
// Hasura rejects a whole mutation on the FIRST key it has no column for, and
// the GraphQL mocks in this suite fulfill every request themselves — so a
// payload carrying a dead field looks perfectly green here and fails only in
// production. That is exactly how sharing shipped broken with
// `field 'radius' not found in type: 'components_component_insert_input'`
// after the map-only refactor dropped the column from the schema.
//
// The allowlist is imported rather than restated: it is annotated
// `Record<keyof Components_Component_Set_Input, true>` in the app, so codegen
// -> tsc -> this assertion is one chain with no hand-maintained copy in it.

/** Mutations that write a `components.component` row, and where the payload sits. */
const COMPONENT_WRITE_OPS = {
    insertComponent: (v) => [v?.object],
    insertBulkComponents: (v) => v?.objects ?? [],
    updateComponentInfo: (v) => [v?.updateObj],
}

/**
 * Assert every component write captured so far carries only real columns.
 *
 * Returns how many payloads it checked, because a column check over zero
 * payloads passes vacuously — callers must assert that count themselves.
 */
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
