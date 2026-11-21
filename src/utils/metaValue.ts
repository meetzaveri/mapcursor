import { isImageAssetRef } from '../types/asset'
import type { MetaProperty, MetaPropertyType } from '../types/metaProperty'

export const META_TEXT_MAX_LENGTH = 2000
export const META_NAME_MAX_LENGTH = 60

export type MetaValueResult =
    | { ok: true; value: unknown }
    | { ok: false; error: string }

const fail = (error: string): MetaValueResult => ({ ok: false, error })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function isCalendarDate(text: string): boolean {
    const m = DATE_RE.exec(text)
    if (!m) return false
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const date = new Date(Date.UTC(y, mo - 1, d))
    return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === mo - 1 &&
        date.getUTCDate() === d
    )
}

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
            const unknownType: never = type
            return fail(`Unsupported type: ${String(unknownType)}`)
        }
    }
}

export type MetaNameResult =
    | { ok: true; name: string }
    | { ok: false; error: string }

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
