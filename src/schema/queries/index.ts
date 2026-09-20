import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
    GetComponentTypesQuery,
    GetComponentTypesQueryVariables,
    GetComponentsForBaseQuery,
    GetComponentsForBaseQueryVariables,
    GetBaseComponentCountQuery,
    GetBaseComponentCountQueryVariables,
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
