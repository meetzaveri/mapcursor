import type { ToolSectionProps } from './toolSection'
import { AreaMark, RadiusMark, RouteMark, TextMark } from './toolIcons'
import {
    BarRow,
    KeyValue,
    OverlayCard,
    OverlayChip,
    Swatch,
    Tag,
} from './overlayCards'
import routeDemo from '../../assets/home-page-route-demo.png'
import areaDemo from '../../assets/home-page-area-cluster-demo.png'
import radiusDemo from '../../assets/home-page-radius-map-demo.png'
import textDemo from '../../assets/home-page-text-edit-demo.png'

// Figures in the overlays are read off the screenshots themselves, so the
// floating cards describe what is actually drawn in the image.
const THEFT_REPORTS = [
    { label: 'Henderson', value: 125 },
    { label: 'Winchester', value: 55 },
    { label: 'Enterprise', value: 44 },
    { label: 'North Las Vegas', value: 23 },
] as const
const THEFT_MAX = Math.max(...THEFT_REPORTS.map((r) => r.value))

export const TOOLS: readonly ToolSectionProps[] = [
    {
        id: 'route',
        index: '01 / ROUTE',
        mark: <RouteMark />,
        title: 'Route',
        body: 'Click from point to point to trace a road, a highway or a trail. Give each route its own color, width and line style. Save the look as a legend preset and the next route takes one click.',
        specs: [
            { label: 'Stroke', value: 'Color and width' },
            { label: 'Line', value: 'Solid, dashed or dotted' },
            { label: 'Legend', value: 'Reusable presets' },
        ],
        image: routeDemo,
        imageAlt:
            'Traffic corridor routes drawn in red, orange and indigo over a city map, with a legend listing each route type',
        overlays: (
            <>
                <OverlayCard
                    title="Legend"
                    meta="3 presets"
                    className="absolute -left-6 bottom-0 w-60"
                >
                    <KeyValue label="Route">
                        <span className="inline-flex items-center gap-2">
                            <Swatch className="bg-fill-coral" />
                            High traffic
                        </span>
                    </KeyValue>
                    <KeyValue label="Route">
                        <span className="inline-flex items-center gap-2">
                            <Swatch className="bg-fill-amber" />
                            Medium traffic
                        </span>
                    </KeyValue>
                    <KeyValue label="Route">
                        <span className="inline-flex items-center gap-2">
                            <Swatch className="bg-accent" />
                            Pedestrian zone
                        </span>
                    </KeyValue>
                </OverlayCard>
                <OverlayChip className="absolute -right-4 top-2">
                    <Swatch className="bg-fill-coral" />
                    High traffic corridor
                </OverlayChip>
            </>
        ),
    },
    {
        id: 'area',
        index: '02 / AREA',
        mark: <AreaMark />,
        title: 'Area',
        body: 'Click around a block, a district or a campus to outline it. The fill follows the outline color and stays see-through, so the streets underneath still read. Color commercial and residential zones apart and the legend keeps track.',
        specs: [
            { label: 'Outline', value: 'Color, width and line style' },
            { label: 'Fill', value: 'Matches the outline, see-through' },
            { label: 'Properties', value: 'Add notes, dates or photos' },
        ],
        image: areaDemo,
        imageAlt:
            'Commercial clusters outlined in blue and residential clusters in red over downtown Dallas',
        overlays: (
            <>
                <OverlayCard
                    title="Area details"
                    meta="Dallas, TX"
                    className="absolute -right-6 bottom-2 w-64"
                >
                    <KeyValue label="Preset">Commercial Cluster</KeyValue>
                    <KeyValue label="Type">Area</KeyValue>
                    <KeyValue label="Outline">
                        <span className="inline-flex items-center gap-2">
                            <Swatch className="bg-fill-blue" />
                            Solid
                        </span>
                    </KeyValue>
                </OverlayCard>
                <OverlayChip className="absolute -left-4 top-6">
                    <Swatch className="bg-fill-coral" />
                    Residential Cluster
                </OverlayChip>
            </>
        ),
        reverse: true,
    },
    {
        id: 'radius-map',
        index: '03 / RADIUS MAP',
        mark: <RadiusMark />,
        title: 'Radius Map',
        body: 'Drop a circle on a spot and type a number or a name inside it. Size it to the weight of what it stands for. In this theft report map, a bigger circle means more reports. Any circle can carry properties too, like a photo, opening hours or a contact email.',
        specs: [
            { label: 'Fill', value: 'Any color, half see-through' },
            { label: 'Label', value: 'Color, size and font' },
            { label: 'Legend', value: 'Apply a preset in one click' },
        ],
        image: radiusDemo,
        imageAlt:
            'Theft reports across Las Vegas shown as grey circles sized 23, 44, 55 and 125',
        overlays: (
            <OverlayCard
                title="Theft Hotspot"
                meta="Radius Map"
                className="absolute -left-6 bottom-0 w-64"
            >
                {THEFT_REPORTS.map((report) => (
                    <BarRow
                        key={report.label}
                        label={report.label}
                        value={report.value}
                        max={THEFT_MAX}
                    />
                ))}
            </OverlayCard>
        ),
    },
    {
        id: 'text',
        index: '04 / TEXT',
        mark: <TextMark />,
        title: 'Text',
        body: 'Write titles, place names and notes right on the map. Pick a color, a size from S to XL and a font. Turn on zoom resistant and a label keeps its size on screen while you zoom in and out.',
        specs: [
            { label: 'Style', value: 'Color, size S to XL, font' },
            { label: 'Zoom', value: 'Zoom resistant switch' },
            { label: 'Opacity', value: '0 to 100' },
        ],
        image: textDemo,
        imageAlt:
            'A road trip title selected on the map with the text styling panel open',
        overlays: (
            <OverlayCard
                title="Styling: Text"
                meta="selected"
                className="absolute -right-6 bottom-0 w-60"
            >
                <KeyValue label="Color">
                    <span className="inline-flex items-center gap-2 font-mono">
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: '#5E3A1A' }}
                        />
                        #5E3A1A
                    </span>
                </KeyValue>
                <KeyValue label="Size">
                    <span className="font-mono">XL</span>
                </KeyValue>
                <KeyValue label="Zoom resistant">
                    <Tag>On</Tag>
                </KeyValue>
            </OverlayCard>
        ),
        reverse: true,
    },
]
