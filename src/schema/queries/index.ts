import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
    GetComponentTypesQuery,
    GetComponentTypesQueryVariables,
    GetComponentsForBaseQuery,
    GetComponentsForBaseQueryVariables,
    GetBaseComponentCountQuery,
    GetBaseComponentCountQueryVariables,
    GetMetaValuesForObjectQuery,
    GetMetaValuesForObjectQueryVariables,
    GetMetaValuesForObjectsQuery,
    GetMetaValuesForObjectsQueryVariables,
    GetMetaValuesForBaseQuery,
    GetMetaValuesForBaseQueryVariables,
} from '../generated'

export const GET_COMPONENT_TYPES: TypedDocumentNode<
    GetComponentTypesQuery,
    GetComponentTypesQueryVariables
> = gql`
    query getComponentTypes {
        componentTypes: components_componentType {
            label
            metadata
            logo
            width
            height
            fill
            textColor
        }
    }
`

export const GET_COMPONENTS_FOR_BASE_QUERY: TypedDocumentNode<
    GetComponentsForBaseQuery,
    GetComponentsForBaseQueryVariables
> = gql`
    query getComponentsForBase($baseId: uuid = "") {
        # The base ROW, not just its elements. Rides this query rather than
        # getting one of its own because views/Base/index.tsx already gates
        # rendering on this query's loading flag — and the georeference has to
        # be known BEFORE the canvas mounts, or the camera restores under the
        # wrong zoom limits. A second query would need a second gate; this
        # needs none.
        base: bases_base_by_pk(id: $baseId) {
            id
            isPublic
            mapAnchorLng
            mapAnchorLat
            mapAnchorZoom
            landingLng
            landingLat
            landingZoom
        }
        # The base's legend presets. Rides this query for exactly the reason
        # the base row does: one gate, already in place. A query of its own
        # would need its own loading state, and a legend that pops in after
        # the canvas has painted reads as a glitch.
        legendPresets: legends_preset(
            where: { baseId: { _eq: $baseId } }
            order_by: { position: asc }
        ) {
            id
            baseId
            name
            elementType
            style
            position
            createdBy
        }
        # The base's meta property DEFINITIONS (the "columns"). Small, and
        # needed by the panel the instant an object is selected, so they ride
        # this query like the legend. The per-object VALUES do not: they are
        # fetched on selection by GET_META_VALUES_FOR_OBJECT.
        metaProperties: meta_property(
            where: { baseId: { _eq: $baseId } }
            order_by: { position: asc }
        ) {
            id
            baseId
            name
            type
            position
            createdBy
        }
        components: components_component(
            where: { baseId: { _eq: $baseId } }
            order_by: { position: asc }
        ) {
            id
            componentType
            legendPresetId
            zoomResistant
            children
            metadata
            x
            x1
            x2
            y
            y1
            y2
            fill
            width
            height
            stroke
            linewidth
            strokeType
            textColor
            opacity
            position
        }
    }
`

export const GET_BASE_COMPONENT_COUNT_QUERY: TypedDocumentNode<
    GetBaseComponentCountQuery,
    GetBaseComponentCountQueryVariables
> = gql`
    query getBaseComponentCount($baseId: uuid! = "") {
        components: components_component_aggregate(
            where: { baseId: { _eq: $baseId } }
        ) {
            aggregate {
                count
            }
        }
    }
`

/**
 * One object's meta values, fetched when it is selected. `baseId` is in the
 * filter as well as `objectId` so a value can only ever be read in the base it
 * was written in, which is the same pairing the orphan sweep matches on.
 */
export const GET_META_VALUES_FOR_OBJECT: TypedDocumentNode<
    GetMetaValuesForObjectQuery,
    GetMetaValuesForObjectQueryVariables
> = gql`
    query getMetaValuesForObject($baseId: uuid!, $objectId: uuid!) {
        metaValues: meta_propertyValue(
            where: {
                baseId: { _eq: $baseId }
                objectId: { _eq: $objectId }
            }
        ) {
            id
            baseId
            propertyId
            objectId
            objectType
            value
            createdBy
        }
    }
`

/** The values on a set of objects (paste copies them onto the new objects). */
export const GET_META_VALUES_FOR_OBJECTS: TypedDocumentNode<
    GetMetaValuesForObjectsQuery,
    GetMetaValuesForObjectsQueryVariables
> = gql`
    query getMetaValuesForObjects($baseId: uuid!, $objectIds: [uuid!]!) {
        metaValues: meta_propertyValue(
            where: {
                baseId: { _eq: $baseId }
                objectId: { _in: $objectIds }
            }
        ) {
            id
            baseId
            propertyId
            objectId
            objectType
            value
            createdBy
        }
    }
`

/** Every value on a base (JSON export of a shared base). */
export const GET_META_VALUES_FOR_BASE: TypedDocumentNode<
    GetMetaValuesForBaseQuery,
    GetMetaValuesForBaseQueryVariables
> = gql`
    query getMetaValuesForBase($baseId: uuid!) {
        metaValues: meta_propertyValue(where: { baseId: { _eq: $baseId } }) {
            id
            baseId
            propertyId
            objectId
            objectType
            value
            createdBy
        }
    }
`
