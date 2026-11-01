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
    InsertUserMutation,
    InsertUserMutationVariables,
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

export const INSERT_USER_ONE: TypedDocumentNode<
    InsertUserMutation,
    InsertUserMutationVariables
> = gql`
    mutation insertUser($object: users_user_insert_input! = {}) {
        user: insert_users_user_one(object: $object) {
            id
            firstName
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

/**
 * Share a base that is ALREADY persisted: publish it and refresh the view a
 * recipient lands on.
 *
 * Separate from `updateBaseVisibility` because re-sharing has to move the
 * landing view — the owner has almost certainly panned since the base was
 * created — while `updateBaseVisibility` is the create-time publish and has no
 * view to move.
 *
 * The anchor is deliberately NOT in the `_set`. It is the georeference every
 * stored element's x/y was measured against, so rewriting it would slide the
 * whole world under ink that stays put. It is written once, at create time.
 * Columns are named explicitly rather than taking a `bases_base_set_input`, so
 * this mutation can only ever touch these four.
 */
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

// --- Legend presets ----------------------------------------------------
//
// `createdBy` is never in an insert payload. Hasura stamps it from the
// `x-hasura-user-id` header via a column preset on the insert permission
// (see legends_preset.yaml), so the creator is recorded server-side and the
// client cannot claim to be someone else. It IS selected back, which is what
// lets a shared legend say who authored an entry.

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

/**
 * Used by `persistBase`, which has to carry a local canvas's whole legend over
 * in one shot before the components that reference it are inserted.
 */
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

/**
 * Deleting a preset must NOT disturb the marks it captioned. The FK is
 * `ON DELETE SET NULL`, so every bound element keeps its styling and simply
 * stops being explained — removing a caption is not a request to restyle a map.
 */
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

/**
 * The live binding, server-side: one statement restyles every element carrying
 * this preset's id. The client mirrors the same patch onto the in-memory store
 * and the Two.js scene (see utils/applyLegendPreset.ts) — this is the durable
 * half, not a substitute for it.
 */
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

// --- Meta properties -----------------------------------------------------
//
// Two tables: `meta_property` is the base-wide definition (the "column"),
// `meta_propertyValue` is one object's value for one property (the "cell").
// See .claude/context/meta-properties.md. As with legend presets, ids are
// minted client-side and `createdBy` is stamped server-side by an insert
// preset, so it is never in a payload. `orphanedAt` is written only by the
// weekly sweep and is in no user permission.
//
// Field lists are written out in every document on purpose: codegen reads these
// templates statically and cannot evaluate a `${...}` interpolation, so a shared
// fragment string made it skip this WHOLE file and drop every mutation type.

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

/** Used by `persistBase` to carry a local base's definitions over in one shot. */
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

/**
 * Rename, reorder or retype. A retype also rewrites the property's values;
 * see changePropertyType in hooks/useMetaProperties.ts.
 */
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

/** Cascades to every value of this property (FK `ON DELETE CASCADE`). */
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

/**
 * Set one object's value for one property. An upsert on
 * (propertyId, objectId), so "set" and "change" are the same call and two tabs
 * can never create a second row for the same cell. On conflict the existing
 * row keeps its id; only `value` and the audit columns move.
 */
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

/** Used by `persistBase` and by paste of objects that carry values. */
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

/** Detach a property from one object. The definition is untouched. */
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

/**
 * Remove one object's value for one property, addressed by the CELL rather
 * than the row id. Undo/redo works in cells: an upsert onto an existing cell
 * keeps the server's row id, so a history entry can't rely on ids.
 */
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
