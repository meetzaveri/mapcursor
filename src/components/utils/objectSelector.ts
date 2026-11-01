import Two from 'two.js'
import { markSelectionChrome } from '../../utils/svgExportShared'
import { scheduleRender } from '../../utils/renderScheduler'
import {
    getSelectionStroke,
    selectionHandleRadiusPx,
    selectionHandleHitRadiusPx,
    HANDLE_STROKE,
    SELECTION_BOX_LINEWIDTH_PX,
    SELECTION_HANDLE_FILL,
    SELECTION_HANDLE_LINEWIDTH_PX,
} from '../../utils/selectionTheme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwoLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GroupLike = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShapeLike = any

interface SelectorVertices {
    x1: number
    x2: number
    y1: number
    y2: number
}

// Style one grab dot: the shared off-white body + indigo ring every selection
// handle in the app wears (see utils/selectionTheme). Sizing is left to
// setScale, which is the only place that knows the camera.
function styleHandle(circle: ShapeLike): void {
    circle.fill = SELECTION_HANDLE_FILL
    circle.stroke = HANDLE_STROKE
    circle.linewidth = SELECTION_HANDLE_LINEWIDTH_PX
}

export default class Selector {
    two: TwoLike
    group: GroupLike
    area: ShapeLike = null
    circle1: ShapeLike = null
    circle2: ShapeLike = null
    circle3: ShapeLike = null
    circle4: ShapeLike = null
    circleGroup: ShapeLike = null
    // Transparent stand-ins that carry the pointer events for circle1..4. The
    // dots are drawn small enough not to bury what they describe; these keep
    // the grab area at the touch size. Consumers that wire a drag (groupobject)
    // must bind to these, not to the dots.
    hitCircle1: ShapeLike = null
    hitCircle2: ShapeLike = null
    hitCircle3: ShapeLike = null
    hitCircle4: ShapeLike = null
    hitGroup: ShapeLike = null
    areaGroup: ShapeLike = null
    showCircles: unknown
    vertices: SelectorVertices

    constructor(
        instance: TwoLike,
        group: GroupLike,
        x1: number,
        x2: number,
        y1: number,
        y2: number,
        showCircles: unknown
    ) {
        this.two = instance
        this.group = group
        this.showCircles = showCircles
        this.vertices = { x1, x2, y1, y2 }
    }

    /** One invisible stand-in, sized for a finger rather than for the eye. */
    private makeHitCircle(cx: number, cy: number): ShapeLike {
        const circle = this.two.makeCircle(cx, cy, selectionHandleHitRadiusPx())
        // `transparent` is still a paint, so the default `visiblePainted`
        // hit-testing applies to it — `none` would not be hittable at all.
        circle.fill = 'transparent'
        circle.noStroke()
        return circle
    }

    create(): void {
        const { x1, x2, y1, y2 } = this.vertices

        const area = this.two.makePath(x1, y1, x2, y1, x2, y2, x1, y2)
        area.fill = 'rgba(0,0,0,0)'
        area.opacity = 1
        area.linewidth = SELECTION_BOX_LINEWIDTH_PX
        area.stroke = getSelectionStroke()
        this.area = area

        let circleGroup: ShapeLike = null
        if (this.showCircles) {
            switch (this.showCircles) {
                case 2: {
                    const yAxisMidpoint = (y1 + y2) / 2
                    const r = selectionHandleRadiusPx()
                    const circleLeft = this.two.makeCircle(x1, yAxisMidpoint, r)
                    const circleRight = this.two.makeCircle(
                        x2,
                        yAxisMidpoint,
                        r
                    )
                    this.circle1 = circleLeft
                    this.circle2 = circleRight
                    this.circle3 = null
                    this.circle4 = null
                    styleHandle(circleLeft)
                    styleHandle(circleRight)
                    circleGroup = this.two.makeGroup(circleLeft, circleRight)
                    this.circleGroup = circleGroup
                    this.hitCircle1 = this.makeHitCircle(x1, yAxisMidpoint)
                    this.hitCircle2 = this.makeHitCircle(x2, yAxisMidpoint)
                    break
                }
                case 4: {
                    const r = selectionHandleRadiusPx()
                    const circle1 = this.two.makeCircle(x1, y1, r)
                    const circle2 = this.two.makeCircle(x2, y1, r)
                    const circle3 = this.two.makeCircle(x2, y2, r)
                    const circle4 = this.two.makeCircle(x1, y2, r)
                    this.circle1 = circle1
                    this.circle2 = circle2
                    this.circle3 = circle3
                    this.circle4 = circle4
                    circleGroup = this.two.makeGroup(
                        circle1,
                        circle2,
                        circle3,
                        circle4
                    )
                    circleGroup.opacity = 0
                    // Styled on the group so the ring/body survive Two.js's
                    // group-level property propagation, and again per circle so
                    // a later `group.stroke` write can't silently recolor them.
                    circleGroup.linewidth = SELECTION_HANDLE_LINEWIDTH_PX
                    circleGroup.fill = SELECTION_HANDLE_FILL
                    circleGroup.stroke = HANDLE_STROKE
                    ;[circle1, circle2, circle3, circle4].forEach(styleHandle)
                    this.circleGroup = circleGroup
                    this.hitCircle1 = this.makeHitCircle(x1, y1)
                    this.hitCircle2 = this.makeHitCircle(x2, y1)
                    this.hitCircle3 = this.makeHitCircle(x2, y2)
                    this.hitCircle4 = this.makeHitCircle(x1, y2)
                    break
                }
                default:
                    break
            }
        }

        // A group of their own, NOT circleGroup: that one is styled wholesale
        // (`circleGroup.stroke = HANDLE_STROKE`, and setScale writes its
        // linewidth), and Two.js propagates group styling to children — which
        // would paint a ring around every invisible hit circle.
        //
        // Added last so it renders on top. SVG hit-testing takes the topmost
        // node, and these are siblings of the dots rather than ancestors, so
        // nothing bubbles from a dot to its stand-in: with the dots on top the
        // centre of every handle would be dead.
        const hitCircles = [
            this.hitCircle1,
            this.hitCircle2,
            this.hitCircle3,
            this.hitCircle4,
        ].filter(Boolean)
        const hitGroup =
            hitCircles.length > 0 ? this.two.makeGroup(...hitCircles) : null
        this.hitGroup = hitGroup

        const areaGroup = this.two.makeGroup(area, circleGroup, hitGroup)

        this.areaGroup = areaGroup
        this.group.add(areaGroup)
        // Batched, NOT a direct two.update(): this runs once per element that
        // has edit chrome (every pencil), so a synchronous full-scene render
        // here is O(N²) across a base load. markSelectionChrome reads
        // `_renderer.elem`, so it must wait for the render — hence afterRender.
        scheduleRender(this.two, () => {
            // Tag the overlay so SVG/PNG exports can strip it — it lives inside
            // the group's <g>, so a clone of the group would otherwise carry it.
            markSelectionChrome(areaGroup)
        })

        const clearSelector = (): void => {
            this.areaGroup.opacity = 0
        }
        window.addEventListener('clearSelector', clearSelector, false)
    }

    show(): void {
        this.areaGroup.opacity = 1
    }

    hide(): void {
        this.areaGroup.opacity = 0
    }

    getInstance(): string {
        return this.areaGroup.id
    }

    setScale(scale: number): void {
        const s = scale > 0 ? scale : 1
        this.area.linewidth = SELECTION_BOX_LINEWIDTH_PX / s
        if (this.showCircles && this.circle1) {
            // `base / s` is the local-unit radius that renders as `base` screen
            // px, so the dots are the same size on screen at every zoom — the
            // same contract as canvas/selectionController.ts.
            //
            // Not capped. A `min(base / s, base * 3)` cap used to keep dots
            // from covering a selection that is tiny on screen, but it binds
            // whenever s < 1/3: map text with zoom resistance off has
            // s = camera scale (~0.004 at z8), so its handles, their grab
            // area and their outline all shrank to a fraction of a pixel and
            // the text could not be resized. A grab dot that can't be seen or
            // hit is worse than one that overlaps a small selection.
            const base = selectionHandleRadiusPx()
            const radius = base / s
            const hitRadius = selectionHandleHitRadiusPx() / s
            ;[
                this.hitCircle1,
                this.hitCircle2,
                this.hitCircle3,
                this.hitCircle4,
            ].forEach((c: ShapeLike) => {
                if (c) c.radius = hitRadius
            })
            const linewidth = SELECTION_HANDLE_LINEWIDTH_PX / s
            this.circle1.radius = radius
            this.circle1.linewidth = linewidth
            this.circle2.radius = radius
            this.circle2.linewidth = linewidth
            if (this.showCircles === 4) {
                this.circle3.radius = radius
                this.circle3.linewidth = linewidth
                this.circle4.radius = radius
                this.circle4.linewidth = linewidth
                this.circleGroup.linewidth = linewidth
            }
        }
    }

    update(x1: number, x2: number, y1: number, y2: number, scale = 1): void {
        this.vertices = { x1, x2, y1, y2 }

        this.area.vertices = [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Anchor(
                x1,
                y1,
                null,
                null,
                null,
                null,
                (Two as any).Commands.line
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Anchor(
                x2,
                y1,
                null,
                null,
                null,
                null,
                (Two as any).Commands.line
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Anchor(
                x2,
                y2,
                null,
                null,
                null,
                null,
                (Two as any).Commands.line
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (Two as any).Anchor(
                x1,
                y2,
                null,
                null,
                null,
                null,
                (Two as any).Commands.line
            ),
        ]

        if (this.showCircles) {
            this.circleGroup.opacity = 1
            // Each stand-in rides its dot exactly; they are only ever a
            // different radius, never a different place.
            const seat = (
                dot: ShapeLike,
                hit: ShapeLike,
                x: number,
                y: number
            ): void => {
                dot.translation.set(x, y)
                hit?.translation.set(x, y)
            }
            switch (this.showCircles) {
                case 2: {
                    const yAxisMidpoint = (y1 + y2) / 2
                    seat(this.circle1, this.hitCircle1, x1, yAxisMidpoint)
                    seat(this.circle2, this.hitCircle2, x2, yAxisMidpoint)
                    break
                }
                case 4:
                    seat(this.circle1, this.hitCircle1, x1, y1)
                    seat(this.circle2, this.hitCircle2, x2, y1)
                    seat(this.circle3, this.hitCircle3, x2, y2)
                    seat(this.circle4, this.hitCircle4, x1, y2)
                    break
                default:
                    break
            }
        }

        this.setScale(scale)
        this.areaGroup.opacity = 1
        this.two.update()
    }
}
