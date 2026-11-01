// Validation for meta property values and names. The single place that knows
// what each property type accepts; the panel, the hook and import all go
// through here, so a value can only be stored in one shape per type.
//
// Shapes (the jsonb `value` column):
//   integer → a JSON number with no fraction
//   text    → a non-empty string
//   email   → a string that looks like an address
//   date    → an ISO calendar date, 'YYYY-MM-DD'
//   image   → an ImageAssetRef (types/asset.ts)

import { isImageAssetRef } from '../types/asset'
import type { MetaProperty, MetaPropertyType } from '../types/metaProperty'

export const META_TEXT_MAX_LENGTH = 2000
export const META_NAME_MAX_LENGTH = 60

export type MetaValueResult =
    | { ok: true; value: unknown }
    | { ok: false; error: string }

const fail = (error: string): MetaValueResult => ({ ok: false, error })

// Deliberately loose: one @, something either side, a dot in the domain.
// Anything stricter rejects real addresses; this only catches typos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function isCalendarDate(text: string): boolean {
    const m = DATE_RE.exec(text)
    if (!m) return false
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const date = new Date(Date.UTC(y, mo - 1, d))
    // Round-trips only for a real day: 2026-02-30 becomes March 2nd.
    return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === mo - 1 &&
        date.getUTCDate() === d
    )
}

/**
 * Check (and normalize) a value for a property type. Accepts what a form
 * field produces (strings) as well as already-typed values from storage.
 */
export function validateMetaValue(
    type: MetaPropertyType,
    raw: unknown
): MetaValueResult {
    switch (type) {
        case 'integer': {
            const n =
                typeof raw === 'string' && raw.trim() !== ''
                    ? Number(raw.trim())
                    : raw
            if (typeof n !== 'number' || !Number.isFinite(n)) {
                return fail('Enter a whole number.')
            }
            if (!Number.isInteger(n)) return fail('Enter a whole number.')
            if (!Number.isSafeInteger(n)) return fail('That number is too large.')
            return { ok: true, value: n }
        }
        case 'text': {
            if (typeof raw !== 'string' || raw.trim() === '') {
                return fail('Enter some text.')
            }
            if (raw.length > META_TEXT_MAX_LENGTH) {
                return fail(`Keep it under ${META_TEXT_MAX_LENGTH} characters.`)
            }
            return { ok: true, value: raw }
        }
        case 'email': {
            const text = typeof raw === 'string' ? raw.trim() : ''
            if (!EMAIL_RE.test(text)) return fail('Enter an email address.')
            return { ok: true, value: text }
        }
        case 'date': {
            const text = typeof raw === 'string' ? raw.trim() : ''
            if (!isCalendarDate(text)) return fail('Enter a date (YYYY-MM-DD).')
            return { ok: true, value: text }
        }
        case 'image': {
            if (!isImageAssetRef(raw)) return fail('Choose an image.')
            return { ok: true, value: raw }
        }
        default: {
            // Exhaustive: a new enum value from codegen fails to compile here.
            const unknownType: never = type
            return fail(`Unsupported type: ${String(unknownType)}`)
        }
    }
}

export type MetaNameResult =
    | { ok: true; name: string }
    | { ok: false; error: string }

/**
 * Normalize a property name and check it against the base's other properties.
 * Names are unique per base in the database (case-sensitive); here they are
 * unique case-insensitively, so "Photo" and "photo" can't both exist.
 * `exceptId` lets a rename keep its own name.
 */
export function validateMetaPropertyName(
    raw: string,
    existing: readonly MetaProperty[],
    exceptId?: string
): MetaNameResult {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (name === '') return { ok: false, error: 'Give the property a name.' }
    if (name.length > META_NAME_MAX_LENGTH) {
        return {
            ok: false,
            error: `Keep the name under ${META_NAME_MAX_LENGTH} characters.`,
        }
    }
    const taken = existing.some(
        (p) => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase()
    )
    if (taken) {
        return { ok: false, error: 'This map already has a property with that name.' }
    }
    return { ok: true, name }
}

/**
 * A value carried across a property's type change, or null when it can't be.
 *
 *   to Text   ← numbers, dates, emails (as written); images are cleared
 *   to Number ← text that is a whole number
 *   to Email  ← text that looks like an address
 *   to Date   ← text in YYYY-MM-DD form
 *   to Image  ← nothing converts
 *
 * Everything goes through validateMetaValue, so a converted value is exactly
 * what the new type would have accepted from the form.
 */
export function convertMetaValue(
    from: MetaPropertyType,
    to: MetaPropertyType,
    value: unknown
): { value: unknown } | null {
    if (from === to) return { value }
    if (from === 'image' || to === 'image') return null
    const checked = validateMetaValue(to, String(value))
    return checked.ok ? { value: checked.value } : null
}
