export const offsetHeight = 0
export const GROUP_COMPONENT = 'groupobject'
export const IMAGE_COMPONENT = 'image'

export const IMAGE_SETTLED_EVENT = 'imageNodeSettled'
export const INSERT_IMAGE_FILES_EVENT = 'insertImageFiles'

export const DEFAULT_TEXT_FONT_FAMILY = 'Avenir'

export const HANDLE_STROKE = '#6965db'

export const RUBBER_MODE_KEY = 'rubberMode'

export type EraserSize = 'small' | 'medium' | 'large'
export const ERASER_SIZE_KEY = 'eraserSize'
export const DEFAULT_ERASER_SIZE: EraserSize = 'medium'
export const ERASER_SIZES: readonly EraserSize[] = ['small', 'medium', 'large']

export const ERASER_DOT_PX: Record<EraserSize, number> = {
    small: 6,
    medium: 10,
    large: 14,
}

export const ERASER_SIZE_RADIUS: Record<EraserSize, number> = {
    small: 0,
    medium: 10,
    large: 20,
}

export const VIEWPORT_KEY_PREFIX = 'mapcursor_viewport_'
export const MOBILE_VIEWPORT_KEY_PREFIX = 'mapcursor_mobile_viewport_'
export const VIEWPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const MAP_ANCHOR_KEY_PREFIX = 'mapcursor_map_anchor_'

export const LEGEND_PRESETS_KEY_PREFIX = 'mapcursor_legend_presets_'

export const META_PROPERTIES_KEY_PREFIX = 'mapcursor_meta_'

export const ARMED_LEGEND_PRESETS_KEY = 'mapcursor_armed_legend_presets'

export const componentTypes = {
    point: 'point',
    area: 'area',
    route: 'route',
    circle: 'circle',
    pencil: 'pencil',
    text: 'text',
} as const

export const mapObjectTypes = {
    point: 'point',
    area: 'area',
    route: 'route',
} as const

export type MapObjectType = keyof typeof mapObjectTypes

export const isMapObjectType = (type: string | null | undefined): boolean =>
    type === mapObjectTypes.point ||
    type === mapObjectTypes.area ||
    type === mapObjectTypes.route

export const isStandaloneTextType = (
    type: string | null | undefined
): boolean => type === 'text'

export const ARROW_DRAW_MODE_KEY = 'arrowDrawMode'
export const TEXT_DRAW_MODE_KEY = 'textDrawMode'
export const PENDING_SHAPE_TYPE_KEY = 'pendingShapeType'
export const PENDING_SHAPE_PROPS_KEY = 'pendingShapeProps'
export const LAST_ADDED_ELEMENT_ID_KEY = 'lastAddedElementId'
export const PENCIL_MODE_KEY = 'pencilMode'
export const PAN_MODE_KEY = 'panMode'

export const DRAW_MODE_KEY = 'drawMode'
export const DRAW_TYPE_KEY = 'drawType'
export const DRAW_PROPS_KEY = 'drawProps'
export const POINT_PLACE_MODE_KEY = 'pointPlaceMode'

export const DEFAULT_RESIST = 0.9

export const TEXT_RESIST = 0.9

export const IMAGE_RESIST = 0

export const TEXT_RESIST_CHANGED_EVENT = 'textResistChanged'

export const FONTS_LOADED_EVENT = 'fontsLoaded'

export const SELECT_COMPONENT_EVENT = 'selectComponent'

export const TEXT_SELECTOR_REFRESH_EVENT = 'textSelectorRefresh'

export const TEXT_EDIT_START_EVENT = 'textEditStart'
export const TEXT_EDIT_END_EVENT = 'textEditEnd'
export const TEXT_EDIT_COMMIT_EVENT = 'commitTextEdit'
export const TEXT_EDIT_CANCEL_EVENT = 'cancelTextEdit'
export const POINT_RADIUS = 8
export const POINT_LABEL_GAP = 5
export const POINT_COLOR = '#FF5630'
export const POINT_LABEL_COLOR = '#000'

export const POINT_BORDER_COLOR = '#fff'
export const POINT_BORDER_WIDTH = 2

export const POINT_SHADOW_LAYERS: readonly { spread: number; alpha: number }[] =
    [
        { spread: 2.5, alpha: 0.08 },
        { spread: 1.25, alpha: 0.16 },
    ]
export const POINT_SHADOW_OFFSET_Y = 0.75

export const CIRCLE_LABEL_COLOR = '#000'
export const POINT_LABEL_FONT_SIZE = 18

export const POINT_LABEL_SIZES: { label: string; value: number }[] = [
    { label: 'S', value: 14 },
    { label: 'M', value: POINT_LABEL_FONT_SIZE },
    { label: 'L', value: 24 },
    { label: 'XL', value: 32 },
]

export function pointLabelSizeFor(label: string | null | undefined): number {
    return (
        POINT_LABEL_SIZES.find((s) => s.label === label)?.value ??
        POINT_LABEL_FONT_SIZE
    )
}

export const ELEMENT_DEFAULTS: Record<
    MapObjectType,
    { stroke: string; linewidth: number }
> = {
    point: { stroke: POINT_COLOR, linewidth: 3 },
    area: { stroke: '#A32D2D', linewidth: 2 },
    route: { stroke: '#3B82F6', linewidth: 3 },
}

export const CIRCLE_DEFAULTS = {
    fill: '#A32D2D',
    linewidth: 0,
    opacity: 0.5,
} as const

export const PREVIEW_DOT_PX = 5
export const PREVIEW_MIN_STROKE_PX = 3
export const PREVIEW_SEGMENT_OPACITY = 0.85
export const PREVIEW_RUBBER_OPACITY = 0.6

export const MIN_VERTICES: Record<'area' | 'route', number> = {
    area: 3,
    route: 2,
}

export const PENCIL_DEFAULT_COLOR = '#000'
export const SHAPE_DEFAULT_STROKE = '#000'

export const DRAFT_STORAGE_KEY = 'mapcursor_local_draft'
export const DRAFT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000
export const BACKGROUND_BASE_STORAGE_KEY = 'mapcursor_background_base_id'
export const STORAGE_QUOTA_ERROR_NAME = 'QuotaExceededError'

export const HINT_SLOT_BOTTOM = '20px'

export const HINT_SLOT_Z = 20

export const HINT_SLOT_MOBILE_TOP = '8px'
export const HINT_SLOT_MOBILE_LEFT = '58px'
export const HINT_SLOT_MOBILE_RIGHT = '69px'

export const TEXT_ZOOM_HINT_DISMISSED_KEY = 'mapcursor_text_zoom_hint_dismissed'

export const LOCAL_BASE_ID_KEY = 'mapcursor_local_base_id'

export const DRAG_SCANS_ENABLED_KEY = 'mapcursor_drag_scans_enabled'

export const VIEWPORT_CULLING_ENABLED_KEY = 'mapcursor_viewport_culling_enabled'

export const ROUTE_SNAP_ENABLED_KEY = 'mapcursor_route_snap_enabled'

export const ROUTE_SNAP_MIN_MOVE_PX = 3

export const HOVER_THRESHOLD = 15
export const HOVER_COLOR = 'rgba(105, 101, 219, 0.7)'
export const SELECTION_PREVIEW_STROKE = '#505F79'
export const DEFAULT_PREVIEW_OPACITY = 0.6
export const LINE_HEIGHT_MULTIPLIER = 1.6
export const PENCIL_DISTANCE_THROTTLE = 3
export const DEFAULT_TEXT_SIZE = 36

export const LEGEND_PANEL_MOVED_EVENT = 'legendPanelMoved'
