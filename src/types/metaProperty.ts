import type {
    Meta_ObjectType_Enum,
    Meta_PropertyType_Enum,
} from '../schema/generated'

export type MetaPropertyType = Meta_PropertyType_Enum

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

export interface MetaProperty {
    id: string
    baseId: string | null
    name: string
    type: MetaPropertyType
    position: number
    createdBy: string | null
}

export interface MetaValue {
    id: string
    baseId: string | null
    propertyId: string
    objectId: string
    objectType: MetaObjectType
    value: unknown
    createdBy: string | null
}

export interface MetaPropertySet {
    properties: MetaProperty[]
    values: MetaValue[]
}
