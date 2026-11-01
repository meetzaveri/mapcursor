// Meta properties: named, typed fields a user attaches to an object, like
// columns in a Notion table. A property is DEFINED once per base and can then
// hold a VALUE on any supported object of that base.
// See .claude/context/meta-properties.md.
//
// Both unions come from the Hasura enum tables via codegen, so a type added to
// `meta.propertyType` / `meta.objectType` shows up here as a compile error in
// every exhaustive switch rather than as silent drift.

import type {
    Meta_ObjectType_Enum,
    Meta_PropertyType_Enum,
} from '../schema/generated'

export type MetaPropertyType = Meta_PropertyType_Enum

/** Every property type, in the order the wizard offers them. */
export const META_PROPERTY_TYPES: readonly MetaPropertyType[] = [
    'text',
    'integer',
    'date',
    'email',
    'image',
]

export const META_PROPERTY_TYPE_LABELS: Record<MetaPropertyType, string> = {
    text: 'Text',
    integer: 'Number',
    date: 'Date',
    email: 'Email',
    image: 'Image',
}

export function isMetaPropertyType(
    value: unknown
): value is MetaPropertyType {
    return META_PROPERTY_TYPES.includes(value as MetaPropertyType)
}

/**
 * The object types that take meta properties: the `componentType` values,
 * unchanged. `circle` is the radius map; `text` is geo-text.
 */
export type MetaObjectType = Meta_ObjectType_Enum

export const META_OBJECT_TYPES: readonly MetaObjectType[] = [
    'point',
    'route',
    'area',
    'circle',
    'text',
]

export function isMetaObjectType(value: unknown): value is MetaObjectType {
    return META_OBJECT_TYPES.includes(value as MetaObjectType)
}

/** A base-wide definition: the "column". `type` is fixed once created. */
export interface MetaProperty {
    id: string
    baseId: string | null
    name: string
    type: MetaPropertyType
    position: number
    createdBy: string | null
}

/**
 * One object's value for one property: the "cell". `value` is validated per
 * the property's type by utils/metaValue.ts; for `image` it is an
 * ImageAssetRef (types/asset.ts).
 */
export interface MetaValue {
    id: string
    baseId: string | null
    propertyId: string
    objectId: string
    objectType: MetaObjectType
    value: unknown
    createdBy: string | null
}

/** A base's meta properties, as the local sidecar and JSON export hold them. */
export interface MetaPropertySet {
    properties: MetaProperty[]
    values: MetaValue[]
}
