/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: boolean | null | undefined;
  _gt?: boolean | null | undefined;
  _gte?: boolean | null | undefined;
  _in?: Array<boolean> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: boolean | null | undefined;
  _lte?: boolean | null | undefined;
  _neq?: boolean | null | undefined;
  _nin?: Array<boolean> | null | undefined;
};

/** Boolean expression to compare columns of type "Float". All fields are combined with logical 'AND'. */
export type Float_Comparison_Exp = {
  _eq?: number | null | undefined;
  _gt?: number | null | undefined;
  _gte?: number | null | undefined;
  _in?: Array<number> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: number | null | undefined;
  _lte?: number | null | undefined;
  _neq?: number | null | undefined;
  _nin?: Array<number> | null | undefined;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: number | null | undefined;
  _gt?: number | null | undefined;
  _gte?: number | null | undefined;
  _in?: Array<number> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: number | null | undefined;
  _lte?: number | null | undefined;
  _neq?: number | null | undefined;
  _nin?: Array<number> | null | undefined;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: string | null | undefined;
  _gt?: string | null | undefined;
  _gte?: string | null | undefined;
  /** does the column match the given case-insensitive pattern */
  _ilike?: string | null | undefined;
  _in?: Array<string> | null | undefined;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: string | null | undefined;
  _is_null?: boolean | null | undefined;
  /** does the column match the given pattern */
  _like?: string | null | undefined;
  _lt?: string | null | undefined;
  _lte?: string | null | undefined;
  _neq?: string | null | undefined;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: string | null | undefined;
  _nin?: Array<string> | null | undefined;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: string | null | undefined;
  /** does the column NOT match the given pattern */
  _nlike?: string | null | undefined;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: string | null | undefined;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: string | null | undefined;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: string | null | undefined;
  /** does the column match the given SQL regular expression */
  _similar?: string | null | undefined;
};

/** Boolean expression to filter rows from the table "bases.base". All fields are combined with a logical 'AND'. */
export type Bases_Base_Bool_Exp = {
  _and?: Array<Bases_Base_Bool_Exp> | null | undefined;
  _not?: Bases_Base_Bool_Exp | null | undefined;
  _or?: Array<Bases_Base_Bool_Exp> | null | undefined;
  createdAt?: Bigint_Comparison_Exp | null | undefined;
  createdBy?: String_Comparison_Exp | null | undefined;
  id?: Uuid_Comparison_Exp | null | undefined;
  isPublic?: Boolean_Comparison_Exp | null | undefined;
  landingLat?: Float8_Comparison_Exp | null | undefined;
  landingLng?: Float8_Comparison_Exp | null | undefined;
  landingZoom?: Float8_Comparison_Exp | null | undefined;
  legendPresets?: Legends_Preset_Bool_Exp | null | undefined;
  legendPresets_aggregate?: Legends_Preset_Aggregate_Bool_Exp | null | undefined;
  mapAnchorLat?: Float8_Comparison_Exp | null | undefined;
  mapAnchorLng?: Float8_Comparison_Exp | null | undefined;
  mapAnchorZoom?: Float8_Comparison_Exp | null | undefined;
  name?: String_Comparison_Exp | null | undefined;
  updatedAt?: Bigint_Comparison_Exp | null | undefined;
  updatedBy?: String_Comparison_Exp | null | undefined;
};

/** unique or primary key constraints on table "bases.base" */
export type Bases_Base_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'base_pkey';

/** input type for inserting data into table "bases.base" */
export type Bases_Base_Insert_Input = {
  createdAt?: number | null | undefined;
  createdBy?: string | null | undefined;
  id?: string | null | undefined;
  isPublic?: boolean | null | undefined;
  landingLat?: unknown;
  landingLng?: unknown;
  landingZoom?: unknown;
  legendPresets?: Legends_Preset_Arr_Rel_Insert_Input | null | undefined;
  mapAnchorLat?: unknown;
  mapAnchorLng?: unknown;
  mapAnchorZoom?: unknown;
  name?: string | null | undefined;
  updatedAt?: number | null | undefined;
  updatedBy?: string | null | undefined;
};

/** input type for inserting object relation for remote table "bases.base" */
export type Bases_Base_Obj_Rel_Insert_Input = {
  data: Bases_Base_Insert_Input;
  /** upsert condition */
  on_conflict?: Bases_Base_On_Conflict | null | undefined;
};

/** on_conflict condition type for table "bases.base" */
export type Bases_Base_On_Conflict = {
  constraint: Bases_Base_Constraint;
  update_columns?: Array<Bases_Base_Update_Column>;
  where?: Bases_Base_Bool_Exp | null | undefined;
};

/** update columns of table "bases.base" */
export type Bases_Base_Update_Column =
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'id'
  /** column name */
  | 'isPublic'
  /** column name */
  | 'landingLat'
  /** column name */
  | 'landingLng'
  /** column name */
  | 'landingZoom'
  /** column name */
  | 'mapAnchorLat'
  /** column name */
  | 'mapAnchorLng'
  /** column name */
  | 'mapAnchorZoom'
  /** column name */
  | 'name'
  /** column name */
  | 'updatedAt'
  /** column name */
  | 'updatedBy';

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: number | null | undefined;
  _gt?: number | null | undefined;
  _gte?: number | null | undefined;
  _in?: Array<number> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: number | null | undefined;
  _lte?: number | null | undefined;
  _neq?: number | null | undefined;
  _nin?: Array<number> | null | undefined;
};

/** Boolean expression to filter rows from the table "components.component". All fields are combined with a logical 'AND'. */
export type Components_Component_Bool_Exp = {
  _and?: Array<Components_Component_Bool_Exp> | null | undefined;
  _not?: Components_Component_Bool_Exp | null | undefined;
  _or?: Array<Components_Component_Bool_Exp> | null | undefined;
  base?: Bases_Base_Bool_Exp | null | undefined;
  baseId?: Uuid_Comparison_Exp | null | undefined;
  baseName?: String_Comparison_Exp | null | undefined;
  children?: Jsonb_Comparison_Exp | null | undefined;
  componentType?: String_Comparison_Exp | null | undefined;
  createdAt?: Bigint_Comparison_Exp | null | undefined;
  createdBy?: String_Comparison_Exp | null | undefined;
  fill?: String_Comparison_Exp | null | undefined;
  fillType?: String_Comparison_Exp | null | undefined;
  height?: Float8_Comparison_Exp | null | undefined;
  id?: Uuid_Comparison_Exp | null | undefined;
  legendPresetId?: Uuid_Comparison_Exp | null | undefined;
  linewidth?: Float8_Comparison_Exp | null | undefined;
  metadata?: Jsonb_Comparison_Exp | null | undefined;
  opacity?: Float_Comparison_Exp | null | undefined;
  position?: Int_Comparison_Exp | null | undefined;
  stroke?: String_Comparison_Exp | null | undefined;
  strokeType?: String_Comparison_Exp | null | undefined;
  textColor?: String_Comparison_Exp | null | undefined;
  updatedBy?: String_Comparison_Exp | null | undefined;
  width?: Float8_Comparison_Exp | null | undefined;
  x?: Float8_Comparison_Exp | null | undefined;
  x1?: Float8_Comparison_Exp | null | undefined;
  x2?: Float8_Comparison_Exp | null | undefined;
  y?: Float8_Comparison_Exp | null | undefined;
  y1?: Float8_Comparison_Exp | null | undefined;
  y2?: Float8_Comparison_Exp | null | undefined;
  zoomResistant?: Boolean_Comparison_Exp | null | undefined;
};

/** unique or primary key constraints on table "components.component" */
export type Components_Component_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'component_id_key'
  /** unique or primary key constraint on columns "id" */
  | 'component_pkey';

/** input type for inserting data into table "components.component" */
export type Components_Component_Insert_Input = {
  base?: Bases_Base_Obj_Rel_Insert_Input | null | undefined;
  baseId?: string | null | undefined;
  baseName?: string | null | undefined;
  children?: unknown;
  componentType?: string | null | undefined;
  createdAt?: number | null | undefined;
  createdBy?: string | null | undefined;
  fill?: string | null | undefined;
  fillType?: string | null | undefined;
  height?: unknown;
  id?: string | null | undefined;
  legendPresetId?: string | null | undefined;
  linewidth?: unknown;
  metadata?: unknown;
  opacity?: number | null | undefined;
  position?: number | null | undefined;
  stroke?: string | null | undefined;
  strokeType?: string | null | undefined;
  textColor?: string | null | undefined;
  updatedBy?: string | null | undefined;
  width?: unknown;
  x?: unknown;
  x1?: unknown;
  x2?: unknown;
  y?: unknown;
  y1?: unknown;
  y2?: unknown;
  /** geoText only. false = the label scales with the map (counter-scale resist 0). NULL or true = zoom-resistant (GEO_TEXT_RESIST). NULL means "never set" and reads as true. Every other componentType ignores this column: point/area/route/pencil keep their numeric metadata.resist. */
  zoomResistant?: boolean | null | undefined;
};

/** input type for inserting object relation for remote table "components.component" */
export type Components_Component_Obj_Rel_Insert_Input = {
  data: Components_Component_Insert_Input;
  /** upsert condition */
  on_conflict?: Components_Component_On_Conflict | null | undefined;
};

/** on_conflict condition type for table "components.component" */
export type Components_Component_On_Conflict = {
  constraint: Components_Component_Constraint;
  update_columns?: Array<Components_Component_Update_Column>;
  where?: Components_Component_Bool_Exp | null | undefined;
};

/** input type for updating data in table "components.component" */
export type Components_Component_Set_Input = {
  baseId?: string | null | undefined;
  baseName?: string | null | undefined;
  children?: unknown;
  componentType?: string | null | undefined;
  createdAt?: number | null | undefined;
  createdBy?: string | null | undefined;
  fill?: string | null | undefined;
  fillType?: string | null | undefined;
  height?: unknown;
  id?: string | null | undefined;
  legendPresetId?: string | null | undefined;
  linewidth?: unknown;
  metadata?: unknown;
  opacity?: number | null | undefined;
  position?: number | null | undefined;
  stroke?: string | null | undefined;
  strokeType?: string | null | undefined;
  textColor?: string | null | undefined;
  updatedBy?: string | null | undefined;
  width?: unknown;
  x?: unknown;
  x1?: unknown;
  x2?: unknown;
  y?: unknown;
  y1?: unknown;
  y2?: unknown;
  /** geoText only. false = the label scales with the map (counter-scale resist 0). NULL or true = zoom-resistant (GEO_TEXT_RESIST). NULL means "never set" and reads as true. Every other componentType ignores this column: point/area/route/pencil keep their numeric metadata.resist. */
  zoomResistant?: boolean | null | undefined;
};

/** update columns of table "components.component" */
export type Components_Component_Update_Column =
  /** column name */
  | 'baseId'
  /** column name */
  | 'baseName'
  /** column name */
  | 'children'
  /** column name */
  | 'componentType'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'fill'
  /** column name */
  | 'fillType'
  /** column name */
  | 'height'
  /** column name */
  | 'id'
  /** column name */
  | 'legendPresetId'
  /** column name */
  | 'linewidth'
  /** column name */
  | 'metadata'
  /** column name */
  | 'opacity'
  /** column name */
  | 'position'
  /** column name */
  | 'stroke'
  /** column name */
  | 'strokeType'
  /** column name */
  | 'textColor'
  /** column name */
  | 'updatedBy'
  /** column name */
  | 'width'
  /** column name */
  | 'x'
  /** column name */
  | 'x1'
  /** column name */
  | 'x2'
  /** column name */
  | 'y'
  /** column name */
  | 'y1'
  /** column name */
  | 'y2'
  /** column name */
  | 'zoomResistant';

/** Boolean expression to compare columns of type "float8". All fields are combined with logical 'AND'. */
export type Float8_Comparison_Exp = {
  _eq?: unknown;
  _gt?: unknown;
  _gte?: unknown;
  _in?: Array<unknown> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: unknown;
  _lte?: unknown;
  _neq?: unknown;
  _nin?: Array<unknown> | null | undefined;
};

export type Jsonb_Cast_Exp = {
  String?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: Jsonb_Cast_Exp | null | undefined;
  /** is the column contained in the given json value */
  _contained_in?: unknown;
  /** does the column contain the given json value at the top level */
  _contains?: unknown;
  _eq?: unknown;
  _gt?: unknown;
  _gte?: unknown;
  /** does the string exist as a top-level key in the column */
  _has_key?: string | null | undefined;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: Array<string> | null | undefined;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: Array<string> | null | undefined;
  _in?: Array<unknown> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: unknown;
  _lte?: unknown;
  _neq?: unknown;
  _nin?: Array<unknown> | null | undefined;
};

export type Legends_Preset_Aggregate_Bool_Exp = {
  count?: Legends_Preset_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Legends_Preset_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Legends_Preset_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Legends_Preset_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** input type for inserting array relation for remote table "legends.preset" */
export type Legends_Preset_Arr_Rel_Insert_Input = {
  data: Array<Legends_Preset_Insert_Input>;
  /** upsert condition */
  on_conflict?: Legends_Preset_On_Conflict | null | undefined;
};

/** Boolean expression to filter rows from the table "legends.preset". All fields are combined with a logical 'AND'. */
export type Legends_Preset_Bool_Exp = {
  _and?: Array<Legends_Preset_Bool_Exp> | null | undefined;
  _not?: Legends_Preset_Bool_Exp | null | undefined;
  _or?: Array<Legends_Preset_Bool_Exp> | null | undefined;
  base?: Bases_Base_Bool_Exp | null | undefined;
  baseId?: Uuid_Comparison_Exp | null | undefined;
  createdAt?: Bigint_Comparison_Exp | null | undefined;
  createdBy?: String_Comparison_Exp | null | undefined;
  elementType?: String_Comparison_Exp | null | undefined;
  id?: Uuid_Comparison_Exp | null | undefined;
  name?: String_Comparison_Exp | null | undefined;
  position?: Int_Comparison_Exp | null | undefined;
  style?: Jsonb_Comparison_Exp | null | undefined;
  updatedAt?: Bigint_Comparison_Exp | null | undefined;
  updatedBy?: String_Comparison_Exp | null | undefined;
};

/** unique or primary key constraints on table "legends.preset" */
export type Legends_Preset_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'preset_pkey';

/** input type for inserting data into table "legends.preset" */
export type Legends_Preset_Insert_Input = {
  base?: Bases_Base_Obj_Rel_Insert_Input | null | undefined;
  baseId?: string | null | undefined;
  createdAt?: number | null | undefined;
  createdBy?: string | null | undefined;
  elementType?: string | null | undefined;
  id?: string | null | undefined;
  name?: string | null | undefined;
  position?: number | null | undefined;
  style?: unknown;
  updatedAt?: number | null | undefined;
  updatedBy?: string | null | undefined;
};

/** on_conflict condition type for table "legends.preset" */
export type Legends_Preset_On_Conflict = {
  constraint: Legends_Preset_Constraint;
  update_columns?: Array<Legends_Preset_Update_Column>;
  where?: Legends_Preset_Bool_Exp | null | undefined;
};

/** select columns of table "legends.preset" */
export type Legends_Preset_Select_Column =
  /** column name */
  | 'baseId'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'elementType'
  /** column name */
  | 'id'
  /** column name */
  | 'name'
  /** column name */
  | 'position'
  /** column name */
  | 'style'
  /** column name */
  | 'updatedAt'
  /** column name */
  | 'updatedBy';

/** input type for updating data in table "legends.preset" */
export type Legends_Preset_Set_Input = {
  baseId?: string | null | undefined;
  createdAt?: number | null | undefined;
  createdBy?: string | null | undefined;
  elementType?: string | null | undefined;
  id?: string | null | undefined;
  name?: string | null | undefined;
  position?: number | null | undefined;
  style?: unknown;
  updatedAt?: number | null | undefined;
  updatedBy?: string | null | undefined;
};

/** update columns of table "legends.preset" */
export type Legends_Preset_Update_Column =
  /** column name */
  | 'baseId'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'elementType'
  /** column name */
  | 'id'
  /** column name */
  | 'name'
  /** column name */
  | 'position'
  /** column name */
  | 'style'
  /** column name */
  | 'updatedAt'
  /** column name */
  | 'updatedBy';

export type Meta_ObjectType_Enum =
  | 'area'
  /** radius map */
  | 'circle'
  | 'point'
  | 'route'
  /** geo-text */
  | 'text';

/** Boolean expression to compare columns of type "meta_objectType_enum". All fields are combined with logical 'AND'. */
export type Meta_ObjectType_Enum_Comparison_Exp = {
  _eq?: Meta_ObjectType_Enum | null | undefined;
  _in?: Array<Meta_ObjectType_Enum> | null | undefined;
  _is_null?: boolean | null | undefined;
  _neq?: Meta_ObjectType_Enum | null | undefined;
  _nin?: Array<Meta_ObjectType_Enum> | null | undefined;
};

export type Meta_PropertyType_Enum =
  | 'date'
  | 'email'
  | 'image'
  | 'integer'
  | 'text';

/** Boolean expression to compare columns of type "meta_propertyType_enum". All fields are combined with logical 'AND'. */
export type Meta_PropertyType_Enum_Comparison_Exp = {
  _eq?: Meta_PropertyType_Enum | null | undefined;
  _in?: Array<Meta_PropertyType_Enum> | null | undefined;
  _is_null?: boolean | null | undefined;
  _neq?: Meta_PropertyType_Enum | null | undefined;
  _nin?: Array<Meta_PropertyType_Enum> | null | undefined;
};

export type Meta_PropertyValue_Aggregate_Bool_Exp = {
  count?: Meta_PropertyValue_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Meta_PropertyValue_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Meta_PropertyValue_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Meta_PropertyValue_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** input type for inserting array relation for remote table "meta.propertyValue" */
export type Meta_PropertyValue_Arr_Rel_Insert_Input = {
  data: Array<Meta_PropertyValue_Insert_Input>;
  /** upsert condition */
  on_conflict?: Meta_PropertyValue_On_Conflict | null | undefined;
};

/** Boolean expression to filter rows from the table "meta.propertyValue". All fields are combined with a logical 'AND'. */
export type Meta_PropertyValue_Bool_Exp = {
  _and?: Array<Meta_PropertyValue_Bool_Exp> | null | undefined;
  _not?: Meta_PropertyValue_Bool_Exp | null | undefined;
  _or?: Array<Meta_PropertyValue_Bool_Exp> | null | undefined;
  base?: Bases_Base_Bool_Exp | null | undefined;
  baseId?: Uuid_Comparison_Exp | null | undefined;
  createdAt?: Timestamptz_Comparison_Exp | null | undefined;
  createdBy?: String_Comparison_Exp | null | undefined;
  id?: Uuid_Comparison_Exp | null | undefined;
  object?: Components_Component_Bool_Exp | null | undefined;
  objectId?: Uuid_Comparison_Exp | null | undefined;
  objectType?: Meta_ObjectType_Enum_Comparison_Exp | null | undefined;
  orphanedAt?: Timestamptz_Comparison_Exp | null | undefined;
  property?: Meta_Property_Bool_Exp | null | undefined;
  propertyId?: Uuid_Comparison_Exp | null | undefined;
  updatedAt?: Timestamptz_Comparison_Exp | null | undefined;
  updatedBy?: String_Comparison_Exp | null | undefined;
  value?: Jsonb_Comparison_Exp | null | undefined;
};

/** unique or primary key constraints on table "meta.propertyValue" */
export type Meta_PropertyValue_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'propertyValue_pkey'
  /** unique or primary key constraint on columns "propertyId", "objectId" */
  | 'propertyValue_property_object_key';

/** input type for inserting data into table "meta.propertyValue" */
export type Meta_PropertyValue_Insert_Input = {
  base?: Bases_Base_Obj_Rel_Insert_Input | null | undefined;
  baseId?: string | null | undefined;
  createdAt?: string | null | undefined;
  createdBy?: string | null | undefined;
  id?: string | null | undefined;
  object?: Components_Component_Obj_Rel_Insert_Input | null | undefined;
  objectId?: string | null | undefined;
  objectType?: Meta_ObjectType_Enum | null | undefined;
  orphanedAt?: string | null | undefined;
  property?: Meta_Property_Obj_Rel_Insert_Input | null | undefined;
  propertyId?: string | null | undefined;
  updatedAt?: string | null | undefined;
  updatedBy?: string | null | undefined;
  value?: unknown;
};

/** on_conflict condition type for table "meta.propertyValue" */
export type Meta_PropertyValue_On_Conflict = {
  constraint: Meta_PropertyValue_Constraint;
  update_columns?: Array<Meta_PropertyValue_Update_Column>;
  where?: Meta_PropertyValue_Bool_Exp | null | undefined;
};

/** select columns of table "meta.propertyValue" */
export type Meta_PropertyValue_Select_Column =
  /** column name */
  | 'baseId'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'id'
  /** column name */
  | 'objectId'
  /** column name */
  | 'objectType'
  /** column name */
  | 'orphanedAt'
  /** column name */
  | 'propertyId'
  /** column name */
  | 'updatedAt'
  /** column name */
  | 'updatedBy'
  /** column name */
  | 'value';

/** update columns of table "meta.propertyValue" */
export type Meta_PropertyValue_Update_Column =
  /** column name */
  | 'baseId'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'id'
  /** column name */
  | 'objectId'
  /** column name */
  | 'objectType'
  /** column name */
  | 'orphanedAt'
  /** column name */
  | 'propertyId'
  /** column name */
  | 'updatedAt'
  /** column name */
  | 'updatedBy'
  /** column name */
  | 'value';

/** Boolean expression to filter rows from the table "meta.property". All fields are combined with a logical 'AND'. */
export type Meta_Property_Bool_Exp = {
  _and?: Array<Meta_Property_Bool_Exp> | null | undefined;
  _not?: Meta_Property_Bool_Exp | null | undefined;
  _or?: Array<Meta_Property_Bool_Exp> | null | undefined;
  base?: Bases_Base_Bool_Exp | null | undefined;
  baseId?: Uuid_Comparison_Exp | null | undefined;
  createdAt?: Timestamptz_Comparison_Exp | null | undefined;
  createdBy?: String_Comparison_Exp | null | undefined;
  id?: Uuid_Comparison_Exp | null | undefined;
  name?: String_Comparison_Exp | null | undefined;
  position?: Int_Comparison_Exp | null | undefined;
  type?: Meta_PropertyType_Enum_Comparison_Exp | null | undefined;
  updatedAt?: Timestamptz_Comparison_Exp | null | undefined;
  updatedBy?: String_Comparison_Exp | null | undefined;
  values?: Meta_PropertyValue_Bool_Exp | null | undefined;
  values_aggregate?: Meta_PropertyValue_Aggregate_Bool_Exp | null | undefined;
};

/** unique or primary key constraints on table "meta.property" */
export type Meta_Property_Constraint =
  /** unique or primary key constraint on columns "baseId", "name" */
  | 'property_base_name_key'
  /** unique or primary key constraint on columns "id" */
  | 'property_pkey';

/** input type for inserting data into table "meta.property" */
export type Meta_Property_Insert_Input = {
  base?: Bases_Base_Obj_Rel_Insert_Input | null | undefined;
  baseId?: string | null | undefined;
  createdAt?: string | null | undefined;
  createdBy?: string | null | undefined;
  id?: string | null | undefined;
  name?: string | null | undefined;
  position?: number | null | undefined;
  type?: Meta_PropertyType_Enum | null | undefined;
  updatedAt?: string | null | undefined;
  updatedBy?: string | null | undefined;
  values?: Meta_PropertyValue_Arr_Rel_Insert_Input | null | undefined;
};

/** input type for inserting object relation for remote table "meta.property" */
export type Meta_Property_Obj_Rel_Insert_Input = {
  data: Meta_Property_Insert_Input;
  /** upsert condition */
  on_conflict?: Meta_Property_On_Conflict | null | undefined;
};

/** on_conflict condition type for table "meta.property" */
export type Meta_Property_On_Conflict = {
  constraint: Meta_Property_Constraint;
  update_columns?: Array<Meta_Property_Update_Column>;
  where?: Meta_Property_Bool_Exp | null | undefined;
};

/** input type for updating data in table "meta.property" */
export type Meta_Property_Set_Input = {
  baseId?: string | null | undefined;
  createdAt?: string | null | undefined;
  createdBy?: string | null | undefined;
  id?: string | null | undefined;
  name?: string | null | undefined;
  position?: number | null | undefined;
  type?: Meta_PropertyType_Enum | null | undefined;
  updatedAt?: string | null | undefined;
  updatedBy?: string | null | undefined;
};

/** update columns of table "meta.property" */
export type Meta_Property_Update_Column =
  /** column name */
  | 'baseId'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdBy'
  /** column name */
  | 'id'
  /** column name */
  | 'name'
  /** column name */
  | 'position'
  /** column name */
  | 'type'
  /** column name */
  | 'updatedAt'
  /** column name */
  | 'updatedBy';

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: string | null | undefined;
  _gt?: string | null | undefined;
  _gte?: string | null | undefined;
  _in?: Array<string> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: string | null | undefined;
  _lte?: string | null | undefined;
  _neq?: string | null | undefined;
  _nin?: Array<string> | null | undefined;
};

/** input type for inserting data into table "users.user" */
export type Users_User_Insert_Input = {
  createdAt?: string | null | undefined;
  email?: string | null | undefined;
  firstName?: string | null | undefined;
  id?: string | null | undefined;
  isActive?: boolean | null | undefined;
  lastName?: string | null | undefined;
  nickname?: string | null | undefined;
  planId?: string | null | undefined;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: string | null | undefined;
  _gt?: string | null | undefined;
  _gte?: string | null | undefined;
  _in?: Array<string> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: string | null | undefined;
  _lte?: string | null | undefined;
  _neq?: string | null | undefined;
  _nin?: Array<string> | null | undefined;
};

export type UpdateComponentInfoMutationVariables = Exact<{
  id?: string | null | undefined;
  updateObj?: Components_Component_Set_Input | null | undefined;
}>;


export type UpdateComponentInfoMutation = { update_components_component_by_pk: { id: string } | null };

export type InsertComponentMutationVariables = Exact<{
  object?: Components_Component_Insert_Input | null | undefined;
}>;


export type InsertComponentMutation = { component: { id: string, componentType: string } | null };

export type DeleteComponentByIdMutationVariables = Exact<{
  id?: string | null | undefined;
}>;


export type DeleteComponentByIdMutation = { delete_components_component_by_pk: { baseId: string } | null };

export type InsertBulkComponentsMutationVariables = Exact<{
  objects?: Array<Components_Component_Insert_Input> | Components_Component_Insert_Input;
}>;


export type InsertBulkComponentsMutation = { insert_components_component: { affected_rows: number, returning: Array<{ baseId: string, componentType: string, id: string }> } | null };

export type InsertUserMutationVariables = Exact<{
  object?: Users_User_Insert_Input;
}>;


export type InsertUserMutation = { user: { id: string, firstName: string | null } | null };

export type CreateBaseMutationVariables = Exact<{
  object?: Bases_Base_Insert_Input;
}>;


export type CreateBaseMutation = { base: { id: string, createdBy: string | null } | null };

export type DeleteComponentsMutationVariables = Exact<{
  _in?: Array<string> | string;
}>;


export type DeleteComponentsMutation = { deleteComponents: { affected_rows: number } | null };

export type UpdateBaseVisibilityMutationVariables = Exact<{
  id?: string | null | undefined;
}>;


export type UpdateBaseVisibilityMutation = { update_bases_base_by_pk: { id: string, isPublic: boolean } | null };

export type SharePersistedBaseMutationVariables = Exact<{
  id: string;
  landingLng?: unknown;
  landingLat?: unknown;
  landingZoom?: unknown;
}>;


export type SharePersistedBaseMutation = { base: { id: string, isPublic: boolean } | null };

export type UpdateUserRevisitCountMutationVariables = Exact<{
  userId: string;
  lastVisit: string;
}>;


export type UpdateUserRevisitCountMutation = { update_users_user_revisits_by_pk: { count: number, user_id: string, last_visit: string } | null };

export type InsertLegendPresetMutationVariables = Exact<{
  object?: Legends_Preset_Insert_Input | null | undefined;
}>;


export type InsertLegendPresetMutation = { preset: { id: string, baseId: string, name: string, elementType: string, style: unknown, position: number, createdBy: string } | null };

export type InsertBulkLegendPresetsMutationVariables = Exact<{
  objects?: Array<Legends_Preset_Insert_Input> | Legends_Preset_Insert_Input | null | undefined;
}>;


export type InsertBulkLegendPresetsMutation = { presets: { returning: Array<{ id: string, baseId: string, name: string, elementType: string, style: unknown, position: number, createdBy: string }> } | null };

export type UpdateLegendPresetMutationVariables = Exact<{
  id: string;
  updateObj?: Legends_Preset_Set_Input | null | undefined;
}>;


export type UpdateLegendPresetMutation = { update_legends_preset_by_pk: { id: string } | null };

export type DeleteLegendPresetMutationVariables = Exact<{
  id: string;
}>;


export type DeleteLegendPresetMutation = { delete_legends_preset_by_pk: { id: string } | null };

export type RestyleComponentsByPresetMutationVariables = Exact<{
  presetId: string;
  updateObj?: Components_Component_Set_Input | null | undefined;
}>;


export type RestyleComponentsByPresetMutation = { update_components_component: { affected_rows: number } | null };

export type InsertMetaPropertyMutationVariables = Exact<{
  object: Meta_Property_Insert_Input;
}>;


export type InsertMetaPropertyMutation = { property: { id: string, baseId: string, name: string, type: Meta_PropertyType_Enum, position: number, createdBy: string | null } | null };

export type InsertBulkMetaPropertiesMutationVariables = Exact<{
  objects: Array<Meta_Property_Insert_Input> | Meta_Property_Insert_Input;
}>;


export type InsertBulkMetaPropertiesMutation = { properties: { affected_rows: number } | null };

export type UpdateMetaPropertyMutationVariables = Exact<{
  id: string;
  updateObj: Meta_Property_Set_Input;
}>;


export type UpdateMetaPropertyMutation = { update_meta_property_by_pk: { id: string } | null };

export type DeleteMetaPropertyMutationVariables = Exact<{
  id: string;
}>;


export type DeleteMetaPropertyMutation = { delete_meta_property_by_pk: { id: string } | null };

export type UpsertMetaValueMutationVariables = Exact<{
  object: Meta_PropertyValue_Insert_Input;
}>;


export type UpsertMetaValueMutation = { value: { id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value: unknown, createdBy: string | null } | null };

export type InsertBulkMetaValuesMutationVariables = Exact<{
  objects: Array<Meta_PropertyValue_Insert_Input> | Meta_PropertyValue_Insert_Input;
}>;


export type InsertBulkMetaValuesMutation = { values: { affected_rows: number } | null };

export type DeleteMetaValueMutationVariables = Exact<{
  id: string;
}>;


export type DeleteMetaValueMutation = { delete_meta_propertyValue_by_pk: { id: string } | null };

export type DeleteMetaValueByCellMutationVariables = Exact<{
  propertyId: string;
  objectId: string;
}>;


export type DeleteMetaValueByCellMutation = { delete_meta_propertyValue: { affected_rows: number } | null };

export type GetComponentTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetComponentTypesQuery = { componentTypes: Array<{ label: string, metadata: unknown, logo: string | null, width: number | null, height: number | null, fill: string | null, textColor: string | null }> };

export type GetComponentsForBaseQueryVariables = Exact<{
  baseId?: string | null | undefined;
}>;


export type GetComponentsForBaseQuery = { base: { id: string, isPublic: boolean, mapAnchorLng: unknown, mapAnchorLat: unknown, mapAnchorZoom: unknown, landingLng: unknown, landingLat: unknown, landingZoom: unknown } | null, legendPresets: Array<{ id: string, baseId: string, name: string, elementType: string, style: unknown, position: number, createdBy: string }>, metaProperties: Array<{ id: string, baseId: string, name: string, type: Meta_PropertyType_Enum, position: number, createdBy: string | null }>, components: Array<{ id: string, componentType: string, legendPresetId: string | null, zoomResistant: boolean | null, children: unknown, metadata: unknown, x: unknown, x1: unknown, x2: unknown, y: unknown, y1: unknown, y2: unknown, fill: string, width: unknown, height: unknown, stroke: string | null, linewidth: unknown, strokeType: string | null, fillType: string | null, textColor: string | null, opacity: number | null, position: number }> };

export type GetBaseComponentCountQueryVariables = Exact<{
  baseId?: string;
}>;


export type GetBaseComponentCountQuery = { components: { aggregate: { count: number } | null } };

export type GetMetaValuesForObjectQueryVariables = Exact<{
  baseId: string;
  objectId: string;
}>;


export type GetMetaValuesForObjectQuery = { metaValues: Array<{ id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value: unknown, createdBy: string | null }> };

export type GetMetaValuesForObjectsQueryVariables = Exact<{
  baseId: string;
  objectIds: Array<string> | string;
}>;


export type GetMetaValuesForObjectsQuery = { metaValues: Array<{ id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value: unknown, createdBy: string | null }> };

export type GetMetaValuesForBaseQueryVariables = Exact<{
  baseId: string;
}>;


export type GetMetaValuesForBaseQuery = { metaValues: Array<{ id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value: unknown, createdBy: string | null }> };


export const UpdateComponentInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateComponentInfo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}},"defaultValue":{"kind":"StringValue","value":"","block":false}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"components_component_set_input"}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_components_component_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateComponentInfoMutation, UpdateComponentInfoMutationVariables>;
export const InsertComponentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertComponent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"object"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"components_component_insert_input"}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"component"},"name":{"kind":"Name","value":"insert_components_component_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"Variable","name":{"kind":"Name","value":"object"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"componentType"}}]}}]}}]} as unknown as DocumentNode<InsertComponentMutation, InsertComponentMutationVariables>;
export const DeleteComponentByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteComponentById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_components_component_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"baseId"}}]}}]}}]} as unknown as DocumentNode<DeleteComponentByIdMutation, DeleteComponentByIdMutationVariables>;
export const InsertBulkComponentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertBulkComponents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objects"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"components_component_insert_input"}}}}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insert_components_component"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objects"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}},{"kind":"Field","name":{"kind":"Name","value":"returning"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"componentType"}},{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<InsertBulkComponentsMutation, InsertBulkComponentsMutationVariables>;
export const InsertUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"object"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"users_user_insert_input"}}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"user"},"name":{"kind":"Name","value":"insert_users_user_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"Variable","name":{"kind":"Name","value":"object"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}}]}}]}}]} as unknown as DocumentNode<InsertUserMutation, InsertUserMutationVariables>;
export const CreateBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"createBase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"object"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"bases_base_insert_input"}}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"base"},"name":{"kind":"Name","value":"insert_bases_base_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"Variable","name":{"kind":"Name","value":"object"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<CreateBaseMutation, CreateBaseMutationVariables>;
export const DeleteComponentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteComponents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"_in"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"deleteComponents"},"name":{"kind":"Name","value":"delete_components_component"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"Variable","name":{"kind":"Name","value":"_in"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}}]}}]}}]} as unknown as DocumentNode<DeleteComponentsMutation, DeleteComponentsMutationVariables>;
export const UpdateBaseVisibilityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateBaseVisibility"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_bases_base_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"isPublic"},"value":{"kind":"BooleanValue","value":true}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}}]}}]}}]} as unknown as DocumentNode<UpdateBaseVisibilityMutation, UpdateBaseVisibilityMutationVariables>;
export const SharePersistedBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"sharePersistedBase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"landingLng"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"float8"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"landingLat"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"float8"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"landingZoom"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"float8"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"base"},"name":{"kind":"Name","value":"update_bases_base_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"isPublic"},"value":{"kind":"BooleanValue","value":true}},{"kind":"ObjectField","name":{"kind":"Name","value":"landingLng"},"value":{"kind":"Variable","name":{"kind":"Name","value":"landingLng"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"landingLat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"landingLat"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"landingZoom"},"value":{"kind":"Variable","name":{"kind":"Name","value":"landingZoom"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}}]}}]}}]} as unknown as DocumentNode<SharePersistedBaseMutation, SharePersistedBaseMutationVariables>;
export const UpdateUserRevisitCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateUserRevisitCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastVisit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"timestamptz"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_users_user_revisits_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"user_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_inc"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"count"},"value":{"kind":"StringValue","value":"1","block":false}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"last_visit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastVisit"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"last_visit"}}]}}]}}]} as unknown as DocumentNode<UpdateUserRevisitCountMutation, UpdateUserRevisitCountMutationVariables>;
export const InsertLegendPresetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertLegendPreset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"object"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"legends_preset_insert_input"}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"preset"},"name":{"kind":"Name","value":"insert_legends_preset_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"Variable","name":{"kind":"Name","value":"object"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"elementType"}},{"kind":"Field","name":{"kind":"Name","value":"style"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<InsertLegendPresetMutation, InsertLegendPresetMutationVariables>;
export const InsertBulkLegendPresetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertBulkLegendPresets"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objects"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"legends_preset_insert_input"}}}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"presets"},"name":{"kind":"Name","value":"insert_legends_preset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objects"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"returning"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"elementType"}},{"kind":"Field","name":{"kind":"Name","value":"style"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]}}]} as unknown as DocumentNode<InsertBulkLegendPresetsMutation, InsertBulkLegendPresetsMutationVariables>;
export const UpdateLegendPresetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateLegendPreset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"legends_preset_set_input"}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_legends_preset_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateLegendPresetMutation, UpdateLegendPresetMutationVariables>;
export const DeleteLegendPresetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteLegendPreset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_legends_preset_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteLegendPresetMutation, DeleteLegendPresetMutationVariables>;
export const RestyleComponentsByPresetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"restyleComponentsByPreset"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"presetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"components_component_set_input"}},"defaultValue":{"kind":"ObjectValue","fields":[]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_components_component"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"legendPresetId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"presetId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}}]}}]}}]} as unknown as DocumentNode<RestyleComponentsByPresetMutation, RestyleComponentsByPresetMutationVariables>;
export const InsertMetaPropertyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertMetaProperty"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"object"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"meta_property_insert_input"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"property"},"name":{"kind":"Name","value":"insert_meta_property_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"Variable","name":{"kind":"Name","value":"object"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<InsertMetaPropertyMutation, InsertMetaPropertyMutationVariables>;
export const InsertBulkMetaPropertiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertBulkMetaProperties"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objects"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"meta_property_insert_input"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"properties"},"name":{"kind":"Name","value":"insert_meta_property"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objects"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}}]}}]}}]} as unknown as DocumentNode<InsertBulkMetaPropertiesMutation, InsertBulkMetaPropertiesMutationVariables>;
export const UpdateMetaPropertyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateMetaProperty"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"meta_property_set_input"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"update_meta_property_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"pk_columns"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}},{"kind":"Argument","name":{"kind":"Name","value":"_set"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updateObj"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateMetaPropertyMutation, UpdateMetaPropertyMutationVariables>;
export const DeleteMetaPropertyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteMetaProperty"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_meta_property_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteMetaPropertyMutation, DeleteMetaPropertyMutationVariables>;
export const UpsertMetaValueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"upsertMetaValue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"object"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"meta_propertyValue_insert_input"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"value"},"name":{"kind":"Name","value":"insert_meta_propertyValue_one"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"object"},"value":{"kind":"Variable","name":{"kind":"Name","value":"object"}}},{"kind":"Argument","name":{"kind":"Name","value":"on_conflict"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"constraint"},"value":{"kind":"EnumValue","value":"propertyValue_property_object_key"}},{"kind":"ObjectField","name":{"kind":"Name","value":"update_columns"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"value"},{"kind":"EnumValue","value":"updatedAt"},{"kind":"EnumValue","value":"updatedBy"}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<UpsertMetaValueMutation, UpsertMetaValueMutationVariables>;
export const InsertBulkMetaValuesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"insertBulkMetaValues"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objects"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"meta_propertyValue_insert_input"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"values"},"name":{"kind":"Name","value":"insert_meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objects"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}}]}}]}}]} as unknown as DocumentNode<InsertBulkMetaValuesMutation, InsertBulkMetaValuesMutationVariables>;
export const DeleteMetaValueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteMetaValue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_meta_propertyValue_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeleteMetaValueMutation, DeleteMetaValueMutationVariables>;
export const DeleteMetaValueByCellDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"deleteMetaValueByCell"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"propertyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"delete_meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"propertyId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"propertyId"}}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"objectId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objectId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affected_rows"}}]}}]}}]} as unknown as DocumentNode<DeleteMetaValueByCellMutation, DeleteMetaValueByCellMutationVariables>;
export const GetComponentTypesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getComponentTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"componentTypes"},"name":{"kind":"Name","value":"components_componentType"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"logo"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"fill"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}}]}}]}}]} as unknown as DocumentNode<GetComponentTypesQuery, GetComponentTypesQueryVariables>;
export const GetComponentsForBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getComponentsForBase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"base"},"name":{"kind":"Name","value":"bases_base_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"mapAnchorLng"}},{"kind":"Field","name":{"kind":"Name","value":"mapAnchorLat"}},{"kind":"Field","name":{"kind":"Name","value":"mapAnchorZoom"}},{"kind":"Field","name":{"kind":"Name","value":"landingLng"}},{"kind":"Field","name":{"kind":"Name","value":"landingLat"}},{"kind":"Field","name":{"kind":"Name","value":"landingZoom"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"legendPresets"},"name":{"kind":"Name","value":"legends_preset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"position"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"elementType"}},{"kind":"Field","name":{"kind":"Name","value":"style"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"metaProperties"},"name":{"kind":"Name","value":"meta_property"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"position"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"components"},"name":{"kind":"Name","value":"components_component"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"position"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"componentType"}},{"kind":"Field","name":{"kind":"Name","value":"legendPresetId"}},{"kind":"Field","name":{"kind":"Name","value":"zoomResistant"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"x"}},{"kind":"Field","name":{"kind":"Name","value":"x1"}},{"kind":"Field","name":{"kind":"Name","value":"x2"}},{"kind":"Field","name":{"kind":"Name","value":"y"}},{"kind":"Field","name":{"kind":"Name","value":"y1"}},{"kind":"Field","name":{"kind":"Name","value":"y2"}},{"kind":"Field","name":{"kind":"Name","value":"fill"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"stroke"}},{"kind":"Field","name":{"kind":"Name","value":"linewidth"}},{"kind":"Field","name":{"kind":"Name","value":"strokeType"}},{"kind":"Field","name":{"kind":"Name","value":"fillType"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"opacity"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]}}]} as unknown as DocumentNode<GetComponentsForBaseQuery, GetComponentsForBaseQueryVariables>;
export const GetBaseComponentCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getBaseComponentCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"components"},"name":{"kind":"Name","value":"components_component_aggregate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<GetBaseComponentCountQuery, GetBaseComponentCountQueryVariables>;
export const GetMetaValuesForObjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getMetaValuesForObject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"metaValues"},"name":{"kind":"Name","value":"meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"objectId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objectId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<GetMetaValuesForObjectQuery, GetMetaValuesForObjectQueryVariables>;
export const GetMetaValuesForObjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getMetaValuesForObjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objectIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"metaValues"},"name":{"kind":"Name","value":"meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"objectId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objectIds"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<GetMetaValuesForObjectsQuery, GetMetaValuesForObjectsQueryVariables>;
export const GetMetaValuesForBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getMetaValuesForBase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"metaValues"},"name":{"kind":"Name","value":"meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<GetMetaValuesForBaseQuery, GetMetaValuesForBaseQueryVariables>;