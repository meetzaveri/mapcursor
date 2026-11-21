import type {
    ComponentMetadata,
    SurfaceGeometry,
    SurfacePosition,
} from '../types/base'

export interface GeometrySource {
    metadata?: unknown
}

export interface GeometryFields {
    metadata: ComponentMetadata
    x: number
    y: number
}

function isPosition(value: unknown): value is SurfacePosition {
    return (
        Array.isArray(value) &&
        value.length >= 2 &&
        Number.isFinite(value[0]) &&
        Number.isFinite(value[1])
    )
}

function isPositionList(value: unknown): value is SurfacePosition[] {
    return Array.isArray(value) && value.every(isPosition)
}

export function isGeometry(value: unknown): value is SurfaceGeometry {
    if (!value || typeof value !== 'object') return false
    const g = value as { type?: unknown; coordinates?: unknown }
    if (g.type === 'Point') return isPosition(g.coordinates)
    if (g.type === 'LineString') return isPositionList(g.coordinates)
    if (g.type === 'Polygon') {
        return (
            Array.isArray(g.coordinates) &&
            g.coordinates.length > 0 &&
            g.coordinates.every(isPositionList)
        )
    }
    return false
}

export function readGeometry(
    source: GeometrySource | null | undefined
): SurfaceGeometry | null {
    const metadata = source?.metadata
    if (!metadata || typeof metadata !== 'object') return null
    const geometry = (metadata as { geometry?: unknown }).geometry
    return isGeometry(geometry) ? geometry : null
}

export function readProperties(
    source: GeometrySource | null | undefined
): Record<string, unknown> {
    const metadata = source?.metadata
    if (!metadata || typeof metadata !== 'object') return {}
    const properties = (metadata as { properties?: unknown }).properties
    if (!properties || typeof properties !== 'object') return {}
    return properties as Record<string, unknown>
}

function openRing(ring: SurfacePosition[]): SurfacePosition[] {
    if (ring.length < 2) return ring
    const first = ring[0]!
    const last = ring[ring.length - 1]!
    const closed = first[0] === last[0] && first[1] === last[1]
    return closed ? ring.slice(0, -1) : ring
}

export function geometryPositions(
    geometry: SurfaceGeometry | null | undefined
): SurfacePosition[] {
    if (!geometry) return []
    if (geometry.type === 'Point') return [geometry.coordinates]
    if (geometry.type === 'LineString') return geometry.coordinates
    return openRing(geometry.coordinates[0] ?? [])
}

function originOf(geometry: SurfaceGeometry): SurfacePosition {
    if (geometry.type === 'Point') return geometry.coordinates
    if (geometry.type === 'LineString') {
        return geometry.coordinates[0] ?? [0, 0]
    }
    return geometry.coordinates[0]?.[0] ?? [0, 0]
}

export function geometryOrigin(
    source: GeometrySource | null | undefined
): { x: number; y: number } | null {
    const geometry = readGeometry(source)
    if (!geometry) return null
    const [x, y] = originOf(geometry)
    return { x, y }
}

export function geometryCenter(
    source: GeometrySource | null | undefined
): { x: number; y: number } | null {
    const positions = geometryPositions(readGeometry(source))
    if (positions.length === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [px, py] of positions) {
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
    }
    if (minX === Infinity) return null
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

type PositionLike = SurfacePosition | { x: number; y: number }

function toPosition(point: PositionLike): SurfacePosition {
    if (Array.isArray(point)) return [point[0], point[1]]
    return [point.x, point.y]
}

export function pointGeometry(x: number, y: number): SurfaceGeometry {
    return { type: 'Point', coordinates: [x, y] }
}

export function lineGeometry(points: PositionLike[]): SurfaceGeometry {
    return { type: 'LineString', coordinates: points.map(toPosition) }
}

export function polygonGeometry(points: PositionLike[]): SurfaceGeometry {
    const ring = points.map(toPosition)
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        ring.push([first[0], first[1]])
    }
    return { type: 'Polygon', coordinates: [ring] }
}

export function geometryFields(
    geometry: SurfaceGeometry,
    properties: Record<string, unknown> = {}
): GeometryFields {
    const [x, y] = originOf(geometry)
    return {
        metadata: { geometry, properties: { ...properties } },
        x: Math.round(x),
        y: Math.round(y),
    }
}

export function setGeometry(
    source: GeometrySource | null | undefined,
    geometry: SurfaceGeometry
): GeometryFields {
    return geometryFields(geometry, readProperties(source))
}

export function setProperties(
    source: GeometrySource | null | undefined,
    patch: Record<string, unknown>
): { metadata?: ComponentMetadata } {
    const geometry = readGeometry(source)
    if (!geometry) return {}
    return {
        metadata: {
            geometry,
            properties: { ...readProperties(source), ...patch },
        },
    }
}

export function replaceProperties(
    source: GeometrySource | null | undefined,
    properties: Record<string, unknown>
): { metadata?: ComponentMetadata } {
    const geometry = readGeometry(source)
    if (!geometry) return {}
    return { metadata: { geometry, properties: { ...properties } } }
}

function mapPositions(
    geometry: SurfaceGeometry,
    fn: (position: SurfacePosition) => SurfacePosition
): SurfaceGeometry {
    if (geometry.type === 'Point') {
        return { type: 'Point', coordinates: fn(geometry.coordinates) }
    }
    if (geometry.type === 'LineString') {
        return { type: 'LineString', coordinates: geometry.coordinates.map(fn) }
    }
    return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) => ring.map(fn)),
    }
}

export function translateGeometry(
    source: GeometrySource | null | undefined,
    dx: number,
    dy: number,
    { round = true }: { round?: boolean } = {}
): GeometryFields | null {
    const geometry = readGeometry(source)
    if (!geometry) return null
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
    const shift = round
        ? (value: number) => Math.round(value)
        : (value: number) => value
    const moved = mapPositions(geometry, ([x, y]) => [
        shift(x + dx),
        shift(y + dy),
    ])
    return setGeometry(source, moved)
}

export function moveGeometryTo(
    source: GeometrySource | null | undefined,
    x: number,
    y: number
): GeometryFields | null {
    const origin = geometryOrigin(source)
    if (!origin) return null
    return translateGeometry(source, x - origin.x, y - origin.y)
}

export function scaleGeometry(
    source: GeometrySource | null | undefined,
    factor: number,
    about: { x: number; y: number }
): GeometryFields | null {
    const geometry = readGeometry(source)
    if (!geometry) return null
    if (!Number.isFinite(factor) || factor === 0) return null
    const scaled = mapPositions(geometry, ([x, y]) => [
        about.x + (x - about.x) * factor,
        about.y + (y - about.y) * factor,
    ])
    return setGeometry(source, scaled)
}
