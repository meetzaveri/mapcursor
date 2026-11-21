import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
    UpdateComponentInfoMutation,
    UpdateComponentInfoMutationVariables,
    InsertComponentMutation,
    InsertComponentMutationVariables,
    DeleteComponentByIdMutation,
    DeleteComponentByIdMutationVariables,
    InsertBulkComponentsMutation,
    InsertBulkComponentsMutationVariables,
    CreateBaseMutation,
    CreateBaseMutationVariables,
    DeleteComponentsMutation,
    DeleteComponentsMutationVariables,
    UpdateBaseVisibilityMutation,
    UpdateBaseVisibilityMutationVariables,
    SharePersistedBaseMutation,
    SharePersistedBaseMutationVariables,
    UpdateUserRevisitCountMutation,
    UpdateUserRevisitCountMutationVariables,
    InsertLegendPresetMutation,
    InsertLegendPresetMutationVariables,
    InsertBulkLegendPresetsMutation,
    InsertBulkLegendPresetsMutationVariables,
    UpdateLegendPresetMutation,
    UpdateLegendPresetMutationVariables,
    DeleteLegendPresetMutation,
    DeleteLegendPresetMutationVariables,
    RestyleComponentsByPresetMutation,
    RestyleComponentsByPresetMutationVariables,
    InsertMetaPropertyMutation,
    InsertMetaPropertyMutationVariables,
    InsertBulkMetaPropertiesMutation,
    InsertBulkMetaPropertiesMutationVariables,
    UpdateMetaPropertyMutation,
    UpdateMetaPropertyMutationVariables,
    DeleteMetaPropertyMutation,
    DeleteMetaPropertyMutationVariables,
    UpsertMetaValueMutation,
    UpsertMetaValueMutationVariables,
    InsertBulkMetaValuesMutation,
    InsertBulkMetaValuesMutationVariables,
    DeleteMetaValueMutation,
    DeleteMetaValueMutationVariables,
    DeleteMetaValueByCellMutation,
    DeleteMetaValueByCellMutationVariables,
} from '../generated'

export const UPDATE_COMPONENT_INFO: TypedDocumentNode<
    UpdateComponentInfoMutation,
    UpdateComponentInfoMutationVariables
> = gql`
    mutation updateComponentInfo(
        $id: uuid = ""
        $updateObj: components_component_set_input = {}
    ) {
        update_components_component_by_pk(
            pk_columns: { id: $id }
            _set: $updateObj
        ) {
            id
        }
    }
`

export const INSERT_COMPONENT: TypedDocumentNode<
    InsertComponentMutation,
    InsertComponentMutationVariables
> = gql`
    mutation insertComponent($object: components_component_insert_input = {}) {
        component: insert_components_component_one(object: $object) {
            id
            componentType
        }
    }
`

export const DELETE_COMPONENT_BY_ID: TypedDocumentNode<
    DeleteComponentByIdMutation,
    DeleteComponentByIdMutationVariables
> = gql`
    mutation deleteComponentById($id: uuid = "") {
        delete_components_component_by_pk(id: $id) {
            baseId
        }
    }
`

export const INSERT_BULK_COMPONENTS: TypedDocumentNode<
    InsertBulkComponentsMutation,
    InsertBulkComponentsMutationVariables
> = gql`
    mutation insertBulkComponents(
        $objects: [components_component_insert_input!]! = {}
    ) {
        insert_components_component(objects: $objects) {
            affected_rows
            returning {
                baseId
                componentType
                id
            }
        }
    }
`

export const CREATE_BASE: TypedDocumentNode<
    CreateBaseMutation,
    CreateBaseMutationVariables
> = gql`
    mutation createBase($object: bases_base_insert_input! = {}) {
        base: insert_bases_base_one(object: $object) {
            id
            createdBy
        }
    }
`

export const DELETE_BULK_COMPONENTS: TypedDocumentNode<
    DeleteComponentsMutation,
    DeleteComponentsMutationVariables
> = gql`
    mutation deleteComponents($_in: [uuid!]! = "") {
        deleteComponents: delete_components_component(
            where: { id: { _in: $_in } }
        ) {
            affected_rows
        }
    }
`

export const UPDATE_BASE_VISIBILITY: TypedDocumentNode<
    UpdateBaseVisibilityMutation,
    UpdateBaseVisibilityMutationVariables
> = gql`
    mutation updateBaseVisibility($id: uuid = "") {
        update_bases_base_by_pk(
            pk_columns: { id: $id }
            _set: { isPublic: true }
        ) {
            id
            isPublic
        }
    }
`

export const SHARE_PERSISTED_BASE: TypedDocumentNode<
    SharePersistedBaseMutation,
    SharePersistedBaseMutationVariables
> = gql`
    mutation sharePersistedBase(
        $id: uuid!
        $landingLng: float8
        $landingLat: float8
        $landingZoom: float8
    ) {
        base: update_bases_base_by_pk(
            pk_columns: { id: $id }
            _set: {
                isPublic: true
                landingLng: $landingLng
                landingLat: $landingLat
                landingZoom: $landingZoom
            }
        ) {
            id
            isPublic
        }
    }
`

export const UPDATE_USER_REVISIT_COUNT: TypedDocumentNode<
    UpdateUserRevisitCountMutation,
    UpdateUserRevisitCountMutationVariables
> = gql`
    mutation updateUserRevisitCount(
        $userId: String!
        $lastVisit: timestamptz!
    ) {
        update_users_user_revisits_by_pk(
            pk_columns: { user_id: $userId }
            _inc: { count: "1" }
            _set: { last_visit: $lastVisit }
        ) {
            count
            user_id
            last_visit
        }
    }
`

export const INSERT_LEGEND_PRESET: TypedDocumentNode<
    InsertLegendPresetMutation,
    InsertLegendPresetMutationVariables
> = gql`
    mutation insertLegendPreset($object: legends_preset_insert_input = {}) {
        preset: insert_legends_preset_one(object: $object) {
            id
            baseId
            name
            elementType
            style
            position
            createdBy
        }
    }
`

export const INSERT_BULK_LEGEND_PRESETS: TypedDocumentNode<
    InsertBulkLegendPresetsMutation,
    InsertBulkLegendPresetsMutationVariables
> = gql`
    mutation insertBulkLegendPresets(
        $objects: [legends_preset_insert_input!] = {}
    ) {
        presets: insert_legends_preset(objects: $objects) {
            returning {
                id
                baseId
                name
                elementType
                style
                position
                createdBy
            }
        }
    }
`

export const UPDATE_LEGEND_PRESET: TypedDocumentNode<
    UpdateLegendPresetMutation,
    UpdateLegendPresetMutationVariables
> = gql`
    mutation updateLegendPreset(
        $id: uuid!
        $updateObj: legends_preset_set_input = {}
    ) {
        update_legends_preset_by_pk(pk_columns: { id: $id }, _set: $updateObj) {
            id
        }
    }
`

export const DELETE_LEGEND_PRESET: TypedDocumentNode<
    DeleteLegendPresetMutation,
    DeleteLegendPresetMutationVariables
> = gql`
    mutation deleteLegendPreset($id: uuid!) {
        delete_legends_preset_by_pk(id: $id) {
            id
        }
    }
`

export const RESTYLE_COMPONENTS_BY_PRESET: TypedDocumentNode<
    RestyleComponentsByPresetMutation,
    RestyleComponentsByPresetMutationVariables
> = gql`
    mutation restyleComponentsByPreset(
        $presetId: uuid!
        $updateObj: components_component_set_input = {}
    ) {
        update_components_component(
            where: { legendPresetId: { _eq: $presetId } }
            _set: $updateObj
        ) {
            affected_rows
        }
    }
`

export const INSERT_META_PROPERTY: TypedDocumentNode<
    InsertMetaPropertyMutation,
    InsertMetaPropertyMutationVariables
> = gql`
    mutation insertMetaProperty($object: meta_property_insert_input!) {
        property: insert_meta_property_one(object: $object) {
            id
            baseId
            name
            type
            position
            createdBy
        }
    }
`

export const INSERT_BULK_META_PROPERTIES: TypedDocumentNode<
    InsertBulkMetaPropertiesMutation,
    InsertBulkMetaPropertiesMutationVariables
> = gql`
    mutation insertBulkMetaProperties(
        $objects: [meta_property_insert_input!]!
    ) {
        properties: insert_meta_property(objects: $objects) {
            affected_rows
        }
    }
`

export const UPDATE_META_PROPERTY: TypedDocumentNode<
    UpdateMetaPropertyMutation,
    UpdateMetaPropertyMutationVariables
> = gql`
    mutation updateMetaProperty(
        $id: uuid!
        $updateObj: meta_property_set_input!
    ) {
        update_meta_property_by_pk(pk_columns: { id: $id }, _set: $updateObj) {
            id
        }
    }
`

export const DELETE_META_PROPERTY: TypedDocumentNode<
    DeleteMetaPropertyMutation,
    DeleteMetaPropertyMutationVariables
> = gql`
    mutation deleteMetaProperty($id: uuid!) {
        delete_meta_property_by_pk(id: $id) {
            id
        }
    }
`

export const UPSERT_META_VALUE: TypedDocumentNode<
    UpsertMetaValueMutation,
    UpsertMetaValueMutationVariables
> = gql`
    mutation upsertMetaValue($object: meta_propertyValue_insert_input!) {
        value: insert_meta_propertyValue_one(
            object: $object
            on_conflict: {
                constraint: propertyValue_property_object_key
                update_columns: [value, updatedAt, updatedBy]
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

export const INSERT_BULK_META_VALUES: TypedDocumentNode<
    InsertBulkMetaValuesMutation,
    InsertBulkMetaValuesMutationVariables
> = gql`
    mutation insertBulkMetaValues(
        $objects: [meta_propertyValue_insert_input!]!
    ) {
        values: insert_meta_propertyValue(objects: $objects) {
            affected_rows
        }
    }
`

export const DELETE_META_VALUE: TypedDocumentNode<
    DeleteMetaValueMutation,
    DeleteMetaValueMutationVariables
> = gql`
    mutation deleteMetaValue($id: uuid!) {
        delete_meta_propertyValue_by_pk(id: $id) {
            id
        }
    }
`

export const DELETE_META_VALUE_BY_CELL: TypedDocumentNode<
    DeleteMetaValueByCellMutation,
    DeleteMetaValueByCellMutationVariables
> = gql`
    mutation deleteMetaValueByCell($propertyId: uuid!, $objectId: uuid!) {
        delete_meta_propertyValue(
            where: {
                propertyId: { _eq: $propertyId }
                objectId: { _eq: $objectId }
            }
        ) {
            affected_rows
        }
    }
`
