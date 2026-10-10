// Land use, drawn so you can actually see it.
//
// Positron is built to sit UNDER data, so it draws land the way it draws water
// (see `paintWater` in mapBackdrop): barely. Its `landcover` layer draws only
// wood/grass/recreation_ground, in a 6%-saturated green that reads as grey, and
// its `landuse` layer draws only residential/cemetery/stadium. Farmland,
// industrial, commercial, retail and quarries are all in the tiles and simply
// never drawn. For someone surveying a town, that data is the map.
//
// So we add two fill layers of our own over CARTO's source, rather than
// repainting Positron's: its filters exclude most of the classes we want, and
// leaving its layers alone means a CARTO style update can't break ours.
//
// The palette is two families, deliberately pale for the same reason water is:
// the ink drawn on top must stay the loudest thing on screen.
//   green  — vegetation and green space (wood darker, grass/park lighter)
//   yellow — open and worked land (farmland/bare paler, built-use deeper)
//
// Class names are the OpenMapTiles schema CARTO packages
// (https://openmaptiles.org/schema/). A class we don't list just isn't drawn.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLibreMap = any

const SOURCE_ID = 'carto'

/** Ours sit above Positron's own land fills and below water, roads and labels. */
const BEFORE_LAYER_ID = 'waterway'

const LANDCOVER_LAYER_ID = 'mc-landcover'
const LANDUSE_LAYER_ID = 'mc-landuse'

const WOOD = '#d3e6c8'
const GRASS = '#e2eed8'
const FARMLAND = '#f4eed3'
const BARE = '#efe9d6'
const BUILT_USE = '#f1e4bd'

/**
 * `landcover` — what covers the ground. `grass` is OpenMapTiles' umbrella for
 * meadow, grassland, scrub, heath, park, garden, recreation_ground and so on;
 * `farmland` likewise covers orchards, vineyards and plant nurseries.
 */
const LANDCOVER_COLOR = [
    'match',
    ['get', 'class'],
    'wood',
    WOOD,
    'grass',
    GRASS,
    'farmland',
    FARMLAND,
    ['sand', 'rock'],
    BARE,
    'transparent',
]

/** `landuse` — what the land is for. */
const LANDUSE_COLOR = [
    'match',
    ['get', 'class'],
    ['industrial', 'commercial', 'retail', 'garages', 'quarry'],
    BUILT_USE,
    ['cemetery', 'stadium', 'pitch', 'playground'],
    GRASS,
    'transparent',
]

const LANDCOVER_CLASSES = ['wood', 'grass', 'farmland', 'sand', 'rock']
const LANDUSE_CLASSES = [
    'industrial',
    'commercial',
    'retail',
    'garages',
    'quarry',
    'cemetery',
    'stadium',
    'pitch',
    'playground',
]

function classFilter(classes: string[]): unknown[] {
    return ['in', ['get', 'class'], ['literal', classes]]
}

/**
 * Add the land layers, once the style has its source.
 *
 * Same contract as `paintWater`: hooked to `styledata`, which fires on every
 * style mutation, so it checks before adding and is a no-op once done. Must
 * never take the backdrop down — worst case the map keeps Positron's grey.
 */
export function addLandLayers(map: MapLibreMap): void {
    try {
        if (!map.getSource(SOURCE_ID)) return
        const beforeId = map.getLayer(BEFORE_LAYER_ID)
            ? BEFORE_LAYER_ID
            : undefined

        if (!map.getLayer(LANDCOVER_LAYER_ID)) {
            map.addLayer(
                {
                    id: LANDCOVER_LAYER_ID,
                    type: 'fill',
                    source: SOURCE_ID,
                    'source-layer': 'landcover',
                    filter: classFilter(LANDCOVER_CLASSES),
                    paint: { 'fill-color': LANDCOVER_COLOR },
                },
                beforeId
            )
        }
        // Added after landcover so it draws on top: an industrial estate
        // tagged over farmland should read as industrial.
        if (!map.getLayer(LANDUSE_LAYER_ID)) {
            map.addLayer(
                {
                    id: LANDUSE_LAYER_ID,
                    type: 'fill',
                    source: SOURCE_ID,
                    'source-layer': 'landuse',
                    filter: classFilter(LANDUSE_CLASSES),
                    paint: { 'fill-color': LANDUSE_COLOR },
                },
                beforeId
            )
        }
    } catch (err) {
        console.error('Land layers failed', err)
    }
}
