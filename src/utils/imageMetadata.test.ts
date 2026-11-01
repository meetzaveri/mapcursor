import { describe, it, expect } from 'vitest'
import { stripImageMetadata } from './imageMetadata'

const ascii = (text: string): number[] =>
    Array.from(text, (c) => c.charCodeAt(0))

const contains = (haystack: Uint8Array, needle: number[]): boolean => {
    outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) continue outer
        }
        return true
    }
    return false
}

// Big-endian TIFF with one IFD entry: Orientation (0x0112) = `orientation`.
const tiffWithOrientation = (orientation: number): number[] => [
    ...ascii('MM'),
    0x00, 0x2a, // TIFF magic
    0x00, 0x00, 0x00, 0x08, // IFD offset
    0x00, 0x01, // one entry
    0x01, 0x12, // tag: Orientation
    0x00, 0x03, // type: SHORT
    0x00, 0x00, 0x00, 0x01, // count
    0x00, orientation, 0x00, 0x00, // value
    0x00, 0x00, 0x00, 0x00, // next IFD: none
]

// A JPEG segment: FF marker, then a big-endian length that counts itself.
const segment = (marker: number, data: number[]): number[] => {
    const length = data.length + 2
    return [0xff, marker, length >> 8, length & 0xff, ...data]
}

const GPS_MARKER = ascii('GPSLatitude=51.5')

const buildJpeg = (orientation: number): Uint8Array =>
    new Uint8Array([
        0xff, 0xd8, // SOI
        ...segment(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]),
        ...segment(0xe1, [
            ...ascii('Exif\0\0'),
            ...tiffWithOrientation(orientation),
            ...GPS_MARKER,
        ]),
        ...segment(0xfe, ascii('shot on a phone')), // COM
        ...segment(0xdb, [0, ...new Array<number>(64).fill(1)]), // DQT
        ...segment(0xda, [1, 1, 0, 0, 0x3f, 0]), // SOS header
        0x12, 0x34, 0xff, 0x00, 0x56, // entropy data, with a stuffed FF00
        0xff, 0xd9, // EOI
        ...ascii('trailing depth map with its own Exif'),
    ])

describe('stripImageMetadata: JPEG', () => {
    it('drops EXIF (incl. GPS), comments and trailing bytes; keeps image data', () => {
        const input = buildJpeg(1)
        // Guard against a vacuous pass: the input really carries all of it.
        expect(contains(input, ascii('Exif'))).toBe(true)
        expect(contains(input, GPS_MARKER)).toBe(true)
        expect(contains(input, ascii('shot on a phone'))).toBe(true)
        expect(contains(input, ascii('trailing depth map'))).toBe(true)
        const out = stripImageMetadata(input, 'image/jpeg')
        expect(out).not.toBeNull()
        const b = out!.bytes
        expect(contains(b, ascii('Exif'))).toBe(false)
        expect(contains(b, GPS_MARKER)).toBe(false)
        expect(contains(b, ascii('shot on a phone'))).toBe(false)
        expect(contains(b, ascii('trailing depth map'))).toBe(false)
        expect(contains(b, ascii('JFIF'))).toBe(true)
        expect(contains(b, [0x12, 0x34, 0xff, 0x00, 0x56])).toBe(true)
        expect(Array.from(b.slice(-2))).toEqual([0xff, 0xd9])
        expect(out!.orientation).toBe(1)
    })

    // A rotated photo must be re-encoded by the caller, or it renders sideways
    // once the tag is gone.
    it('reports the EXIF orientation it removed', () => {
        expect(stripImageMetadata(buildJpeg(6), 'image/jpeg')?.orientation).toBe(
            6
        )
    })

    it('returns null for bytes it cannot parse, so the caller re-encodes', () => {
        expect(
            stripImageMetadata(new Uint8Array([0xff, 0xd8, 0x00]), 'image/jpeg')
        ).toBeNull()
    })
})

// The parser does not check CRCs, so zeros stand in for them.
const pngChunk = (type: string, data: number[]): number[] => {
    const n = data.length
    return [
        (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff,
        ...ascii(type),
        ...data,
        0, 0, 0, 0,
    ]
}

describe('stripImageMetadata: PNG', () => {
    it('drops eXIf/tEXt/tIME and keeps IHDR/IDAT/IEND', () => {
        const input = new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            ...pngChunk('IHDR', new Array<number>(13).fill(0)),
            ...pngChunk('eXIf', [...tiffWithOrientation(1), ...GPS_MARKER]),
            ...pngChunk('tEXt', ascii('Author\0someone')),
            ...pngChunk('tIME', [0x07, 0xea, 10, 31, 12, 0, 0]),
            ...pngChunk('IDAT', [1, 2, 3]),
            ...pngChunk('IEND', []),
        ])
        expect(contains(input, GPS_MARKER)).toBe(true)
        expect(contains(input, ascii('tEXt'))).toBe(true)
        const out = stripImageMetadata(input, 'image/png')
        expect(out).not.toBeNull()
        const b = out!.bytes
        expect(contains(b, ascii('eXIf'))).toBe(false)
        expect(contains(b, GPS_MARKER)).toBe(false)
        expect(contains(b, ascii('tEXt'))).toBe(false)
        expect(contains(b, ascii('tIME'))).toBe(false)
        expect(contains(b, ascii('IHDR'))).toBe(true)
        expect(contains(b, ascii('IDAT'))).toBe(true)
        expect(contains(b, ascii('IEND'))).toBe(true)
    })
})

describe('stripImageMetadata: unsupported type', () => {
    it('returns null', () => {
        expect(stripImageMetadata(new Uint8Array([1]), 'image/bmp')).toBeNull()
    })
})
