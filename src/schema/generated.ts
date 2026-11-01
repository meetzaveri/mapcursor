import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  bigint: { input: number; output: number; }
  float8: { input: any; output: any; }
  jsonb: { input: unknown; output: unknown; }
  timestamptz: { input: string; output: string; }
  uuid: { input: string; output: string; }
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _gt?: InputMaybe<Scalars['Boolean']['input']>;
  _gte?: InputMaybe<Scalars['Boolean']['input']>;
  _in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Boolean']['input']>;
  _lte?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
  _nin?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

/** Boolean expression to compare columns of type "Float". All fields are combined with logical 'AND'. */
export type Float_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Float']['input']>;
  _gt?: InputMaybe<Scalars['Float']['input']>;
  _gte?: InputMaybe<Scalars['Float']['input']>;
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Float']['input']>;
  _lte?: InputMaybe<Scalars['Float']['input']>;
  _neq?: InputMaybe<Scalars['Float']['input']>;
  _nin?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "bases.base" */
export type Bases_Base = {
  __typename?: 'bases_base';
  createdAt: Scalars['bigint']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  isPublic: Scalars['Boolean']['output'];
  landingLat?: Maybe<Scalars['float8']['output']>;
  landingLng?: Maybe<Scalars['float8']['output']>;
  landingZoom?: Maybe<Scalars['float8']['output']>;
  /** An array relationship */
  legendPresets: Array<Legends_Preset>;
  /** An aggregate relationship */
  legendPresets_aggregate: Legends_Preset_Aggregate;
  mapAnchorLat?: Maybe<Scalars['float8']['output']>;
  mapAnchorLng?: Maybe<Scalars['float8']['output']>;
  mapAnchorZoom?: Maybe<Scalars['float8']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['bigint']['output'];
  updatedBy?: Maybe<Scalars['String']['output']>;
};


/** columns and relationships of "bases.base" */
export type Bases_BaseLegendPresetsArgs = {
  distinct_on?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Legends_Preset_Order_By>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};


/** columns and relationships of "bases.base" */
export type Bases_BaseLegendPresets_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Legends_Preset_Order_By>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};

/** aggregated selection of "bases.base" */
export type Bases_Base_Aggregate = {
  __typename?: 'bases_base_aggregate';
  aggregate?: Maybe<Bases_Base_Aggregate_Fields>;
  nodes: Array<Bases_Base>;
};

/** aggregate fields of "bases.base" */
export type Bases_Base_Aggregate_Fields = {
  __typename?: 'bases_base_aggregate_fields';
  avg?: Maybe<Bases_Base_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Bases_Base_Max_Fields>;
  min?: Maybe<Bases_Base_Min_Fields>;
  stddev?: Maybe<Bases_Base_Stddev_Fields>;
  stddev_pop?: Maybe<Bases_Base_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Bases_Base_Stddev_Samp_Fields>;
  sum?: Maybe<Bases_Base_Sum_Fields>;
  var_pop?: Maybe<Bases_Base_Var_Pop_Fields>;
  var_samp?: Maybe<Bases_Base_Var_Samp_Fields>;
  variance?: Maybe<Bases_Base_Variance_Fields>;
};


/** aggregate fields of "bases.base" */
export type Bases_Base_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Bases_Base_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Bases_Base_Avg_Fields = {
  __typename?: 'bases_base_avg_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "bases.base". All fields are combined with a logical 'AND'. */
export type Bases_Base_Bool_Exp = {
  _and?: InputMaybe<Array<Bases_Base_Bool_Exp>>;
  _not?: InputMaybe<Bases_Base_Bool_Exp>;
  _or?: InputMaybe<Array<Bases_Base_Bool_Exp>>;
  createdAt?: InputMaybe<Bigint_Comparison_Exp>;
  createdBy?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  isPublic?: InputMaybe<Boolean_Comparison_Exp>;
  landingLat?: InputMaybe<Float8_Comparison_Exp>;
  landingLng?: InputMaybe<Float8_Comparison_Exp>;
  landingZoom?: InputMaybe<Float8_Comparison_Exp>;
  legendPresets?: InputMaybe<Legends_Preset_Bool_Exp>;
  legendPresets_aggregate?: InputMaybe<Legends_Preset_Aggregate_Bool_Exp>;
  mapAnchorLat?: InputMaybe<Float8_Comparison_Exp>;
  mapAnchorLng?: InputMaybe<Float8_Comparison_Exp>;
  mapAnchorZoom?: InputMaybe<Float8_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  updatedAt?: InputMaybe<Bigint_Comparison_Exp>;
  updatedBy?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "bases.base" */
export type Bases_Base_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'base_pkey';

/** input type for incrementing numeric columns in table "bases.base" */
export type Bases_Base_Inc_Input = {
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  landingLat?: InputMaybe<Scalars['float8']['input']>;
  landingLng?: InputMaybe<Scalars['float8']['input']>;
  landingZoom?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLat?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLng?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorZoom?: InputMaybe<Scalars['float8']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
};

/** input type for inserting data into table "bases.base" */
export type Bases_Base_Insert_Input = {
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  landingLat?: InputMaybe<Scalars['float8']['input']>;
  landingLng?: InputMaybe<Scalars['float8']['input']>;
  landingZoom?: InputMaybe<Scalars['float8']['input']>;
  legendPresets?: InputMaybe<Legends_Preset_Arr_Rel_Insert_Input>;
  mapAnchorLat?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLng?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorZoom?: InputMaybe<Scalars['float8']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Bases_Base_Max_Fields = {
  __typename?: 'bases_base_max_fields';
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  landingLat?: Maybe<Scalars['float8']['output']>;
  landingLng?: Maybe<Scalars['float8']['output']>;
  landingZoom?: Maybe<Scalars['float8']['output']>;
  mapAnchorLat?: Maybe<Scalars['float8']['output']>;
  mapAnchorLng?: Maybe<Scalars['float8']['output']>;
  mapAnchorZoom?: Maybe<Scalars['float8']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['bigint']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Bases_Base_Min_Fields = {
  __typename?: 'bases_base_min_fields';
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  landingLat?: Maybe<Scalars['float8']['output']>;
  landingLng?: Maybe<Scalars['float8']['output']>;
  landingZoom?: Maybe<Scalars['float8']['output']>;
  mapAnchorLat?: Maybe<Scalars['float8']['output']>;
  mapAnchorLng?: Maybe<Scalars['float8']['output']>;
  mapAnchorZoom?: Maybe<Scalars['float8']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['bigint']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "bases.base" */
export type Bases_Base_Mutation_Response = {
  __typename?: 'bases_base_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Bases_Base>;
};

/** input type for inserting object relation for remote table "bases.base" */
export type Bases_Base_Obj_Rel_Insert_Input = {
  data: Bases_Base_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Bases_Base_On_Conflict>;
};

/** on_conflict condition type for table "bases.base" */
export type Bases_Base_On_Conflict = {
  constraint: Bases_Base_Constraint;
  update_columns?: Array<Bases_Base_Update_Column>;
  where?: InputMaybe<Bases_Base_Bool_Exp>;
};

/** Ordering options when selecting data from "bases.base". */
export type Bases_Base_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  isPublic?: InputMaybe<Order_By>;
  landingLat?: InputMaybe<Order_By>;
  landingLng?: InputMaybe<Order_By>;
  landingZoom?: InputMaybe<Order_By>;
  legendPresets_aggregate?: InputMaybe<Legends_Preset_Aggregate_Order_By>;
  mapAnchorLat?: InputMaybe<Order_By>;
  mapAnchorLng?: InputMaybe<Order_By>;
  mapAnchorZoom?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
};

/** primary key columns input for table: bases.base */
export type Bases_Base_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "bases.base" */
export type Bases_Base_Select_Column =
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

/** input type for updating data in table "bases.base" */
export type Bases_Base_Set_Input = {
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  landingLat?: InputMaybe<Scalars['float8']['input']>;
  landingLng?: InputMaybe<Scalars['float8']['input']>;
  landingZoom?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLat?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLng?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorZoom?: InputMaybe<Scalars['float8']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Bases_Base_Stddev_Fields = {
  __typename?: 'bases_base_stddev_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Bases_Base_Stddev_Pop_Fields = {
  __typename?: 'bases_base_stddev_pop_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Bases_Base_Stddev_Samp_Fields = {
  __typename?: 'bases_base_stddev_samp_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "bases_base" */
export type Bases_Base_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Bases_Base_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Bases_Base_Stream_Cursor_Value_Input = {
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  landingLat?: InputMaybe<Scalars['float8']['input']>;
  landingLng?: InputMaybe<Scalars['float8']['input']>;
  landingZoom?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLat?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorLng?: InputMaybe<Scalars['float8']['input']>;
  mapAnchorZoom?: InputMaybe<Scalars['float8']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Bases_Base_Sum_Fields = {
  __typename?: 'bases_base_sum_fields';
  createdAt?: Maybe<Scalars['bigint']['output']>;
  landingLat?: Maybe<Scalars['float8']['output']>;
  landingLng?: Maybe<Scalars['float8']['output']>;
  landingZoom?: Maybe<Scalars['float8']['output']>;
  mapAnchorLat?: Maybe<Scalars['float8']['output']>;
  mapAnchorLng?: Maybe<Scalars['float8']['output']>;
  mapAnchorZoom?: Maybe<Scalars['float8']['output']>;
  updatedAt?: Maybe<Scalars['bigint']['output']>;
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

export type Bases_Base_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Bases_Base_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Bases_Base_Set_Input>;
  /** filter the rows which have to be updated */
  where: Bases_Base_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Bases_Base_Var_Pop_Fields = {
  __typename?: 'bases_base_var_pop_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Bases_Base_Var_Samp_Fields = {
  __typename?: 'bases_base_var_samp_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Bases_Base_Variance_Fields = {
  __typename?: 'bases_base_variance_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  landingLat?: Maybe<Scalars['Float']['output']>;
  landingLng?: Maybe<Scalars['Float']['output']>;
  landingZoom?: Maybe<Scalars['Float']['output']>;
  mapAnchorLat?: Maybe<Scalars['Float']['output']>;
  mapAnchorLng?: Maybe<Scalars['Float']['output']>;
  mapAnchorZoom?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to compare columns of type "bigint". All fields are combined with logical 'AND'. */
export type Bigint_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['bigint']['input']>;
  _gt?: InputMaybe<Scalars['bigint']['input']>;
  _gte?: InputMaybe<Scalars['bigint']['input']>;
  _in?: InputMaybe<Array<Scalars['bigint']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['bigint']['input']>;
  _lte?: InputMaybe<Scalars['bigint']['input']>;
  _neq?: InputMaybe<Scalars['bigint']['input']>;
  _nin?: InputMaybe<Array<Scalars['bigint']['input']>>;
};

/** columns and relationships of "components.component" */
export type Components_Component = {
  __typename?: 'components_component';
  /** An object relationship */
  base: Bases_Base;
  baseId: Scalars['uuid']['output'];
  baseName?: Maybe<Scalars['String']['output']>;
  children?: Maybe<Scalars['jsonb']['output']>;
  componentType: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy: Scalars['String']['output'];
  fill: Scalars['String']['output'];
  height: Scalars['float8']['output'];
  id: Scalars['uuid']['output'];
  legendPresetId?: Maybe<Scalars['uuid']['output']>;
  linewidth?: Maybe<Scalars['float8']['output']>;
  metadata?: Maybe<Scalars['jsonb']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position: Scalars['Int']['output'];
  stroke?: Maybe<Scalars['String']['output']>;
  strokeType?: Maybe<Scalars['String']['output']>;
  textColor?: Maybe<Scalars['String']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
  width: Scalars['float8']['output'];
  x: Scalars['float8']['output'];
  x1: Scalars['float8']['output'];
  x2: Scalars['float8']['output'];
  y: Scalars['float8']['output'];
  y1: Scalars['float8']['output'];
  y2: Scalars['float8']['output'];
  /** geoText only. false = the label scales with the map (counter-scale resist 0). NULL or true = zoom-resistant (GEO_TEXT_RESIST). NULL means "never set" and reads as true. Every other componentType ignores this column: point/area/route/pencil keep their numeric metadata.resist. */
  zoomResistant?: Maybe<Scalars['Boolean']['output']>;
};


/** columns and relationships of "components.component" */
export type Components_ComponentChildrenArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};


/** columns and relationships of "components.component" */
export type Components_ComponentMetadataArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "components.componentType" */
export type Components_ComponentType = {
  __typename?: 'components_componentType';
  category: Scalars['String']['output'];
  fill?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['uuid']['output'];
  label: Scalars['String']['output'];
  logo?: Maybe<Scalars['String']['output']>;
  metadata: Scalars['jsonb']['output'];
  textColor?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};


/** columns and relationships of "components.componentType" */
export type Components_ComponentTypeMetadataArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "components.componentType" */
export type Components_ComponentType_Aggregate = {
  __typename?: 'components_componentType_aggregate';
  aggregate?: Maybe<Components_ComponentType_Aggregate_Fields>;
  nodes: Array<Components_ComponentType>;
};

/** aggregate fields of "components.componentType" */
export type Components_ComponentType_Aggregate_Fields = {
  __typename?: 'components_componentType_aggregate_fields';
  avg?: Maybe<Components_ComponentType_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Components_ComponentType_Max_Fields>;
  min?: Maybe<Components_ComponentType_Min_Fields>;
  stddev?: Maybe<Components_ComponentType_Stddev_Fields>;
  stddev_pop?: Maybe<Components_ComponentType_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Components_ComponentType_Stddev_Samp_Fields>;
  sum?: Maybe<Components_ComponentType_Sum_Fields>;
  var_pop?: Maybe<Components_ComponentType_Var_Pop_Fields>;
  var_samp?: Maybe<Components_ComponentType_Var_Samp_Fields>;
  variance?: Maybe<Components_ComponentType_Variance_Fields>;
};


/** aggregate fields of "components.componentType" */
export type Components_ComponentType_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Components_ComponentType_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Components_ComponentType_Append_Input = {
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
};

/** aggregate avg on columns */
export type Components_ComponentType_Avg_Fields = {
  __typename?: 'components_componentType_avg_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "components.componentType". All fields are combined with a logical 'AND'. */
export type Components_ComponentType_Bool_Exp = {
  _and?: InputMaybe<Array<Components_ComponentType_Bool_Exp>>;
  _not?: InputMaybe<Components_ComponentType_Bool_Exp>;
  _or?: InputMaybe<Array<Components_ComponentType_Bool_Exp>>;
  category?: InputMaybe<String_Comparison_Exp>;
  fill?: InputMaybe<String_Comparison_Exp>;
  height?: InputMaybe<Int_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  label?: InputMaybe<String_Comparison_Exp>;
  logo?: InputMaybe<String_Comparison_Exp>;
  metadata?: InputMaybe<Jsonb_Comparison_Exp>;
  textColor?: InputMaybe<String_Comparison_Exp>;
  width?: InputMaybe<Int_Comparison_Exp>;
};

/** unique or primary key constraints on table "components.componentType" */
export type Components_ComponentType_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'componentType_pkey';

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Components_ComponentType_Delete_At_Path_Input = {
  metadata?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Components_ComponentType_Delete_Elem_Input = {
  metadata?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Components_ComponentType_Delete_Key_Input = {
  metadata?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "components.componentType" */
export type Components_ComponentType_Inc_Input = {
  height?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "components.componentType" */
export type Components_ComponentType_Insert_Input = {
  category?: InputMaybe<Scalars['String']['input']>;
  fill?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate max on columns */
export type Components_ComponentType_Max_Fields = {
  __typename?: 'components_componentType_max_fields';
  category?: Maybe<Scalars['String']['output']>;
  fill?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  logo?: Maybe<Scalars['String']['output']>;
  textColor?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** aggregate min on columns */
export type Components_ComponentType_Min_Fields = {
  __typename?: 'components_componentType_min_fields';
  category?: Maybe<Scalars['String']['output']>;
  fill?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  logo?: Maybe<Scalars['String']['output']>;
  textColor?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** response of any mutation on the table "components.componentType" */
export type Components_ComponentType_Mutation_Response = {
  __typename?: 'components_componentType_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Components_ComponentType>;
};

/** on_conflict condition type for table "components.componentType" */
export type Components_ComponentType_On_Conflict = {
  constraint: Components_ComponentType_Constraint;
  update_columns?: Array<Components_ComponentType_Update_Column>;
  where?: InputMaybe<Components_ComponentType_Bool_Exp>;
};

/** Ordering options when selecting data from "components.componentType". */
export type Components_ComponentType_Order_By = {
  category?: InputMaybe<Order_By>;
  fill?: InputMaybe<Order_By>;
  height?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  label?: InputMaybe<Order_By>;
  logo?: InputMaybe<Order_By>;
  metadata?: InputMaybe<Order_By>;
  textColor?: InputMaybe<Order_By>;
  width?: InputMaybe<Order_By>;
};

/** primary key columns input for table: components.componentType */
export type Components_ComponentType_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Components_ComponentType_Prepend_Input = {
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "components.componentType" */
export type Components_ComponentType_Select_Column =
  /** column name */
  | 'category'
  /** column name */
  | 'fill'
  /** column name */
  | 'height'
  /** column name */
  | 'id'
  /** column name */
  | 'label'
  /** column name */
  | 'logo'
  /** column name */
  | 'metadata'
  /** column name */
  | 'textColor'
  /** column name */
  | 'width';

/** input type for updating data in table "components.componentType" */
export type Components_ComponentType_Set_Input = {
  category?: InputMaybe<Scalars['String']['input']>;
  fill?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate stddev on columns */
export type Components_ComponentType_Stddev_Fields = {
  __typename?: 'components_componentType_stddev_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Components_ComponentType_Stddev_Pop_Fields = {
  __typename?: 'components_componentType_stddev_pop_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Components_ComponentType_Stddev_Samp_Fields = {
  __typename?: 'components_componentType_stddev_samp_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "components_componentType" */
export type Components_ComponentType_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Components_ComponentType_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Components_ComponentType_Stream_Cursor_Value_Input = {
  category?: InputMaybe<Scalars['String']['input']>;
  fill?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  logo?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** aggregate sum on columns */
export type Components_ComponentType_Sum_Fields = {
  __typename?: 'components_componentType_sum_fields';
  height?: Maybe<Scalars['Int']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "components.componentType" */
export type Components_ComponentType_Update_Column =
  /** column name */
  | 'category'
  /** column name */
  | 'fill'
  /** column name */
  | 'height'
  /** column name */
  | 'id'
  /** column name */
  | 'label'
  /** column name */
  | 'logo'
  /** column name */
  | 'metadata'
  /** column name */
  | 'textColor'
  /** column name */
  | 'width';

export type Components_ComponentType_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Components_ComponentType_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Components_ComponentType_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Components_ComponentType_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Components_ComponentType_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Components_ComponentType_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Components_ComponentType_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Components_ComponentType_Set_Input>;
  /** filter the rows which have to be updated */
  where: Components_ComponentType_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Components_ComponentType_Var_Pop_Fields = {
  __typename?: 'components_componentType_var_pop_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Components_ComponentType_Var_Samp_Fields = {
  __typename?: 'components_componentType_var_samp_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Components_ComponentType_Variance_Fields = {
  __typename?: 'components_componentType_variance_fields';
  height?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
};

/** aggregated selection of "components.component" */
export type Components_Component_Aggregate = {
  __typename?: 'components_component_aggregate';
  aggregate?: Maybe<Components_Component_Aggregate_Fields>;
  nodes: Array<Components_Component>;
};

/** aggregate fields of "components.component" */
export type Components_Component_Aggregate_Fields = {
  __typename?: 'components_component_aggregate_fields';
  avg?: Maybe<Components_Component_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Components_Component_Max_Fields>;
  min?: Maybe<Components_Component_Min_Fields>;
  stddev?: Maybe<Components_Component_Stddev_Fields>;
  stddev_pop?: Maybe<Components_Component_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Components_Component_Stddev_Samp_Fields>;
  sum?: Maybe<Components_Component_Sum_Fields>;
  var_pop?: Maybe<Components_Component_Var_Pop_Fields>;
  var_samp?: Maybe<Components_Component_Var_Samp_Fields>;
  variance?: Maybe<Components_Component_Variance_Fields>;
};


/** aggregate fields of "components.component" */
export type Components_Component_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Components_Component_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Components_Component_Append_Input = {
  children?: InputMaybe<Scalars['jsonb']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
};

/** aggregate avg on columns */
export type Components_Component_Avg_Fields = {
  __typename?: 'components_component_avg_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "components.component". All fields are combined with a logical 'AND'. */
export type Components_Component_Bool_Exp = {
  _and?: InputMaybe<Array<Components_Component_Bool_Exp>>;
  _not?: InputMaybe<Components_Component_Bool_Exp>;
  _or?: InputMaybe<Array<Components_Component_Bool_Exp>>;
  base?: InputMaybe<Bases_Base_Bool_Exp>;
  baseId?: InputMaybe<Uuid_Comparison_Exp>;
  baseName?: InputMaybe<String_Comparison_Exp>;
  children?: InputMaybe<Jsonb_Comparison_Exp>;
  componentType?: InputMaybe<String_Comparison_Exp>;
  createdAt?: InputMaybe<Bigint_Comparison_Exp>;
  createdBy?: InputMaybe<String_Comparison_Exp>;
  fill?: InputMaybe<String_Comparison_Exp>;
  height?: InputMaybe<Float8_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  legendPresetId?: InputMaybe<Uuid_Comparison_Exp>;
  linewidth?: InputMaybe<Float8_Comparison_Exp>;
  metadata?: InputMaybe<Jsonb_Comparison_Exp>;
  opacity?: InputMaybe<Float_Comparison_Exp>;
  position?: InputMaybe<Int_Comparison_Exp>;
  stroke?: InputMaybe<String_Comparison_Exp>;
  strokeType?: InputMaybe<String_Comparison_Exp>;
  textColor?: InputMaybe<String_Comparison_Exp>;
  updatedBy?: InputMaybe<String_Comparison_Exp>;
  width?: InputMaybe<Float8_Comparison_Exp>;
  x?: InputMaybe<Float8_Comparison_Exp>;
  x1?: InputMaybe<Float8_Comparison_Exp>;
  x2?: InputMaybe<Float8_Comparison_Exp>;
  y?: InputMaybe<Float8_Comparison_Exp>;
  y1?: InputMaybe<Float8_Comparison_Exp>;
  y2?: InputMaybe<Float8_Comparison_Exp>;
  zoomResistant?: InputMaybe<Boolean_Comparison_Exp>;
};

/** unique or primary key constraints on table "components.component" */
export type Components_Component_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'component_id_key'
  /** unique or primary key constraint on columns "id" */
  | 'component_pkey';

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Components_Component_Delete_At_Path_Input = {
  children?: InputMaybe<Array<Scalars['String']['input']>>;
  metadata?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Components_Component_Delete_Elem_Input = {
  children?: InputMaybe<Scalars['Int']['input']>;
  metadata?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Components_Component_Delete_Key_Input = {
  children?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "components.component" */
export type Components_Component_Inc_Input = {
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  height?: InputMaybe<Scalars['float8']['input']>;
  linewidth?: InputMaybe<Scalars['float8']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  width?: InputMaybe<Scalars['float8']['input']>;
  x?: InputMaybe<Scalars['float8']['input']>;
  x1?: InputMaybe<Scalars['float8']['input']>;
  x2?: InputMaybe<Scalars['float8']['input']>;
  y?: InputMaybe<Scalars['float8']['input']>;
  y1?: InputMaybe<Scalars['float8']['input']>;
  y2?: InputMaybe<Scalars['float8']['input']>;
};

/** input type for inserting data into table "components.component" */
export type Components_Component_Insert_Input = {
  base?: InputMaybe<Bases_Base_Obj_Rel_Insert_Input>;
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  baseName?: InputMaybe<Scalars['String']['input']>;
  children?: InputMaybe<Scalars['jsonb']['input']>;
  componentType?: InputMaybe<Scalars['String']['input']>;
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  fill?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['float8']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  legendPresetId?: InputMaybe<Scalars['uuid']['input']>;
  linewidth?: InputMaybe<Scalars['float8']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  stroke?: InputMaybe<Scalars['String']['input']>;
  strokeType?: InputMaybe<Scalars['String']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['float8']['input']>;
  x?: InputMaybe<Scalars['float8']['input']>;
  x1?: InputMaybe<Scalars['float8']['input']>;
  x2?: InputMaybe<Scalars['float8']['input']>;
  y?: InputMaybe<Scalars['float8']['input']>;
  y1?: InputMaybe<Scalars['float8']['input']>;
  y2?: InputMaybe<Scalars['float8']['input']>;
  /** geoText only. false = the label scales with the map (counter-scale resist 0). NULL or true = zoom-resistant (GEO_TEXT_RESIST). NULL means "never set" and reads as true. Every other componentType ignores this column: point/area/route/pencil keep their numeric metadata.resist. */
  zoomResistant?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate max on columns */
export type Components_Component_Max_Fields = {
  __typename?: 'components_component_max_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  baseName?: Maybe<Scalars['String']['output']>;
  componentType?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  fill?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['float8']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  legendPresetId?: Maybe<Scalars['uuid']['output']>;
  linewidth?: Maybe<Scalars['float8']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  stroke?: Maybe<Scalars['String']['output']>;
  strokeType?: Maybe<Scalars['String']['output']>;
  textColor?: Maybe<Scalars['String']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['float8']['output']>;
  x?: Maybe<Scalars['float8']['output']>;
  x1?: Maybe<Scalars['float8']['output']>;
  x2?: Maybe<Scalars['float8']['output']>;
  y?: Maybe<Scalars['float8']['output']>;
  y1?: Maybe<Scalars['float8']['output']>;
  y2?: Maybe<Scalars['float8']['output']>;
};

/** aggregate min on columns */
export type Components_Component_Min_Fields = {
  __typename?: 'components_component_min_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  baseName?: Maybe<Scalars['String']['output']>;
  componentType?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  fill?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['float8']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  legendPresetId?: Maybe<Scalars['uuid']['output']>;
  linewidth?: Maybe<Scalars['float8']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  stroke?: Maybe<Scalars['String']['output']>;
  strokeType?: Maybe<Scalars['String']['output']>;
  textColor?: Maybe<Scalars['String']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['float8']['output']>;
  x?: Maybe<Scalars['float8']['output']>;
  x1?: Maybe<Scalars['float8']['output']>;
  x2?: Maybe<Scalars['float8']['output']>;
  y?: Maybe<Scalars['float8']['output']>;
  y1?: Maybe<Scalars['float8']['output']>;
  y2?: Maybe<Scalars['float8']['output']>;
};

/** response of any mutation on the table "components.component" */
export type Components_Component_Mutation_Response = {
  __typename?: 'components_component_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Components_Component>;
};

/** input type for inserting object relation for remote table "components.component" */
export type Components_Component_Obj_Rel_Insert_Input = {
  data: Components_Component_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Components_Component_On_Conflict>;
};

/** on_conflict condition type for table "components.component" */
export type Components_Component_On_Conflict = {
  constraint: Components_Component_Constraint;
  update_columns?: Array<Components_Component_Update_Column>;
  where?: InputMaybe<Components_Component_Bool_Exp>;
};

/** Ordering options when selecting data from "components.component". */
export type Components_Component_Order_By = {
  base?: InputMaybe<Bases_Base_Order_By>;
  baseId?: InputMaybe<Order_By>;
  baseName?: InputMaybe<Order_By>;
  children?: InputMaybe<Order_By>;
  componentType?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  fill?: InputMaybe<Order_By>;
  height?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  legendPresetId?: InputMaybe<Order_By>;
  linewidth?: InputMaybe<Order_By>;
  metadata?: InputMaybe<Order_By>;
  opacity?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  stroke?: InputMaybe<Order_By>;
  strokeType?: InputMaybe<Order_By>;
  textColor?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
  width?: InputMaybe<Order_By>;
  x?: InputMaybe<Order_By>;
  x1?: InputMaybe<Order_By>;
  x2?: InputMaybe<Order_By>;
  y?: InputMaybe<Order_By>;
  y1?: InputMaybe<Order_By>;
  y2?: InputMaybe<Order_By>;
  zoomResistant?: InputMaybe<Order_By>;
};

/** primary key columns input for table: components.component */
export type Components_Component_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Components_Component_Prepend_Input = {
  children?: InputMaybe<Scalars['jsonb']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
};

/** select columns of table "components.component" */
export type Components_Component_Select_Column =
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

/** input type for updating data in table "components.component" */
export type Components_Component_Set_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  baseName?: InputMaybe<Scalars['String']['input']>;
  children?: InputMaybe<Scalars['jsonb']['input']>;
  componentType?: InputMaybe<Scalars['String']['input']>;
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  fill?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['float8']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  legendPresetId?: InputMaybe<Scalars['uuid']['input']>;
  linewidth?: InputMaybe<Scalars['float8']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  stroke?: InputMaybe<Scalars['String']['input']>;
  strokeType?: InputMaybe<Scalars['String']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['float8']['input']>;
  x?: InputMaybe<Scalars['float8']['input']>;
  x1?: InputMaybe<Scalars['float8']['input']>;
  x2?: InputMaybe<Scalars['float8']['input']>;
  y?: InputMaybe<Scalars['float8']['input']>;
  y1?: InputMaybe<Scalars['float8']['input']>;
  y2?: InputMaybe<Scalars['float8']['input']>;
  /** geoText only. false = the label scales with the map (counter-scale resist 0). NULL or true = zoom-resistant (GEO_TEXT_RESIST). NULL means "never set" and reads as true. Every other componentType ignores this column: point/area/route/pencil keep their numeric metadata.resist. */
  zoomResistant?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate stddev on columns */
export type Components_Component_Stddev_Fields = {
  __typename?: 'components_component_stddev_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Components_Component_Stddev_Pop_Fields = {
  __typename?: 'components_component_stddev_pop_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Components_Component_Stddev_Samp_Fields = {
  __typename?: 'components_component_stddev_samp_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "components_component" */
export type Components_Component_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Components_Component_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Components_Component_Stream_Cursor_Value_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  baseName?: InputMaybe<Scalars['String']['input']>;
  children?: InputMaybe<Scalars['jsonb']['input']>;
  componentType?: InputMaybe<Scalars['String']['input']>;
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  fill?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['float8']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  legendPresetId?: InputMaybe<Scalars['uuid']['input']>;
  linewidth?: InputMaybe<Scalars['float8']['input']>;
  metadata?: InputMaybe<Scalars['jsonb']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  stroke?: InputMaybe<Scalars['String']['input']>;
  strokeType?: InputMaybe<Scalars['String']['input']>;
  textColor?: InputMaybe<Scalars['String']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  width?: InputMaybe<Scalars['float8']['input']>;
  x?: InputMaybe<Scalars['float8']['input']>;
  x1?: InputMaybe<Scalars['float8']['input']>;
  x2?: InputMaybe<Scalars['float8']['input']>;
  y?: InputMaybe<Scalars['float8']['input']>;
  y1?: InputMaybe<Scalars['float8']['input']>;
  y2?: InputMaybe<Scalars['float8']['input']>;
  /** geoText only. false = the label scales with the map (counter-scale resist 0). NULL or true = zoom-resistant (GEO_TEXT_RESIST). NULL means "never set" and reads as true. Every other componentType ignores this column: point/area/route/pencil keep their numeric metadata.resist. */
  zoomResistant?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate sum on columns */
export type Components_Component_Sum_Fields = {
  __typename?: 'components_component_sum_fields';
  createdAt?: Maybe<Scalars['bigint']['output']>;
  height?: Maybe<Scalars['float8']['output']>;
  linewidth?: Maybe<Scalars['float8']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  width?: Maybe<Scalars['float8']['output']>;
  x?: Maybe<Scalars['float8']['output']>;
  x1?: Maybe<Scalars['float8']['output']>;
  x2?: Maybe<Scalars['float8']['output']>;
  y?: Maybe<Scalars['float8']['output']>;
  y1?: Maybe<Scalars['float8']['output']>;
  y2?: Maybe<Scalars['float8']['output']>;
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

export type Components_Component_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Components_Component_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Components_Component_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Components_Component_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Components_Component_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Components_Component_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Components_Component_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Components_Component_Set_Input>;
  /** filter the rows which have to be updated */
  where: Components_Component_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Components_Component_Var_Pop_Fields = {
  __typename?: 'components_component_var_pop_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Components_Component_Var_Samp_Fields = {
  __typename?: 'components_component_var_samp_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Components_Component_Variance_Fields = {
  __typename?: 'components_component_variance_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  height?: Maybe<Scalars['Float']['output']>;
  linewidth?: Maybe<Scalars['Float']['output']>;
  opacity?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  width?: Maybe<Scalars['Float']['output']>;
  x?: Maybe<Scalars['Float']['output']>;
  x1?: Maybe<Scalars['Float']['output']>;
  x2?: Maybe<Scalars['Float']['output']>;
  y?: Maybe<Scalars['Float']['output']>;
  y1?: Maybe<Scalars['Float']['output']>;
  y2?: Maybe<Scalars['Float']['output']>;
};

/** ordering argument of a cursor */
export type Cursor_Ordering =
  /** ascending ordering of the cursor */
  | 'ASC'
  /** descending ordering of the cursor */
  | 'DESC';

/** Boolean expression to compare columns of type "float8". All fields are combined with logical 'AND'. */
export type Float8_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['float8']['input']>;
  _gt?: InputMaybe<Scalars['float8']['input']>;
  _gte?: InputMaybe<Scalars['float8']['input']>;
  _in?: InputMaybe<Array<Scalars['float8']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['float8']['input']>;
  _lte?: InputMaybe<Scalars['float8']['input']>;
  _neq?: InputMaybe<Scalars['float8']['input']>;
  _nin?: InputMaybe<Array<Scalars['float8']['input']>>;
};

export type Jsonb_Cast_Exp = {
  String?: InputMaybe<String_Comparison_Exp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  _cast?: InputMaybe<Jsonb_Cast_Exp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']['input']>;
  _eq?: InputMaybe<Scalars['jsonb']['input']>;
  _gt?: InputMaybe<Scalars['jsonb']['input']>;
  _gte?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']['input']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']['input']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['jsonb']['input']>;
  _lte?: InputMaybe<Scalars['jsonb']['input']>;
  _neq?: InputMaybe<Scalars['jsonb']['input']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']['input']>>;
};

/** columns and relationships of "legends.preset" */
export type Legends_Preset = {
  __typename?: 'legends_preset';
  /** An object relationship */
  base: Bases_Base;
  baseId: Scalars['uuid']['output'];
  createdAt: Scalars['bigint']['output'];
  createdBy: Scalars['String']['output'];
  elementType: Scalars['String']['output'];
  id: Scalars['uuid']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  style: Scalars['jsonb']['output'];
  updatedAt: Scalars['bigint']['output'];
  updatedBy?: Maybe<Scalars['String']['output']>;
};


/** columns and relationships of "legends.preset" */
export type Legends_PresetStyleArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "legends.preset" */
export type Legends_Preset_Aggregate = {
  __typename?: 'legends_preset_aggregate';
  aggregate?: Maybe<Legends_Preset_Aggregate_Fields>;
  nodes: Array<Legends_Preset>;
};

export type Legends_Preset_Aggregate_Bool_Exp = {
  count?: InputMaybe<Legends_Preset_Aggregate_Bool_Exp_Count>;
};

export type Legends_Preset_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Legends_Preset_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "legends.preset" */
export type Legends_Preset_Aggregate_Fields = {
  __typename?: 'legends_preset_aggregate_fields';
  avg?: Maybe<Legends_Preset_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Legends_Preset_Max_Fields>;
  min?: Maybe<Legends_Preset_Min_Fields>;
  stddev?: Maybe<Legends_Preset_Stddev_Fields>;
  stddev_pop?: Maybe<Legends_Preset_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Legends_Preset_Stddev_Samp_Fields>;
  sum?: Maybe<Legends_Preset_Sum_Fields>;
  var_pop?: Maybe<Legends_Preset_Var_Pop_Fields>;
  var_samp?: Maybe<Legends_Preset_Var_Samp_Fields>;
  variance?: Maybe<Legends_Preset_Variance_Fields>;
};


/** aggregate fields of "legends.preset" */
export type Legends_Preset_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "legends.preset" */
export type Legends_Preset_Aggregate_Order_By = {
  avg?: InputMaybe<Legends_Preset_Avg_Order_By>;
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Legends_Preset_Max_Order_By>;
  min?: InputMaybe<Legends_Preset_Min_Order_By>;
  stddev?: InputMaybe<Legends_Preset_Stddev_Order_By>;
  stddev_pop?: InputMaybe<Legends_Preset_Stddev_Pop_Order_By>;
  stddev_samp?: InputMaybe<Legends_Preset_Stddev_Samp_Order_By>;
  sum?: InputMaybe<Legends_Preset_Sum_Order_By>;
  var_pop?: InputMaybe<Legends_Preset_Var_Pop_Order_By>;
  var_samp?: InputMaybe<Legends_Preset_Var_Samp_Order_By>;
  variance?: InputMaybe<Legends_Preset_Variance_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Legends_Preset_Append_Input = {
  style?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "legends.preset" */
export type Legends_Preset_Arr_Rel_Insert_Input = {
  data: Array<Legends_Preset_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Legends_Preset_On_Conflict>;
};

/** aggregate avg on columns */
export type Legends_Preset_Avg_Fields = {
  __typename?: 'legends_preset_avg_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by avg() on columns of table "legends.preset" */
export type Legends_Preset_Avg_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** Boolean expression to filter rows from the table "legends.preset". All fields are combined with a logical 'AND'. */
export type Legends_Preset_Bool_Exp = {
  _and?: InputMaybe<Array<Legends_Preset_Bool_Exp>>;
  _not?: InputMaybe<Legends_Preset_Bool_Exp>;
  _or?: InputMaybe<Array<Legends_Preset_Bool_Exp>>;
  base?: InputMaybe<Bases_Base_Bool_Exp>;
  baseId?: InputMaybe<Uuid_Comparison_Exp>;
  createdAt?: InputMaybe<Bigint_Comparison_Exp>;
  createdBy?: InputMaybe<String_Comparison_Exp>;
  elementType?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  position?: InputMaybe<Int_Comparison_Exp>;
  style?: InputMaybe<Jsonb_Comparison_Exp>;
  updatedAt?: InputMaybe<Bigint_Comparison_Exp>;
  updatedBy?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "legends.preset" */
export type Legends_Preset_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'preset_pkey';

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Legends_Preset_Delete_At_Path_Input = {
  style?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Legends_Preset_Delete_Elem_Input = {
  style?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Legends_Preset_Delete_Key_Input = {
  style?: InputMaybe<Scalars['String']['input']>;
};

/** input type for incrementing numeric columns in table "legends.preset" */
export type Legends_Preset_Inc_Input = {
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
};

/** input type for inserting data into table "legends.preset" */
export type Legends_Preset_Insert_Input = {
  base?: InputMaybe<Bases_Base_Obj_Rel_Insert_Input>;
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  elementType?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  style?: InputMaybe<Scalars['jsonb']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Legends_Preset_Max_Fields = {
  __typename?: 'legends_preset_max_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  elementType?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['bigint']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** order by max() on columns of table "legends.preset" */
export type Legends_Preset_Max_Order_By = {
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  elementType?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Legends_Preset_Min_Fields = {
  __typename?: 'legends_preset_min_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  createdAt?: Maybe<Scalars['bigint']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  elementType?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['bigint']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** order by min() on columns of table "legends.preset" */
export type Legends_Preset_Min_Order_By = {
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  elementType?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "legends.preset" */
export type Legends_Preset_Mutation_Response = {
  __typename?: 'legends_preset_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Legends_Preset>;
};

/** on_conflict condition type for table "legends.preset" */
export type Legends_Preset_On_Conflict = {
  constraint: Legends_Preset_Constraint;
  update_columns?: Array<Legends_Preset_Update_Column>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};

/** Ordering options when selecting data from "legends.preset". */
export type Legends_Preset_Order_By = {
  base?: InputMaybe<Bases_Base_Order_By>;
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  elementType?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  style?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
};

/** primary key columns input for table: legends.preset */
export type Legends_Preset_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Legends_Preset_Prepend_Input = {
  style?: InputMaybe<Scalars['jsonb']['input']>;
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
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  elementType?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  style?: InputMaybe<Scalars['jsonb']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Legends_Preset_Stddev_Fields = {
  __typename?: 'legends_preset_stddev_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev() on columns of table "legends.preset" */
export type Legends_Preset_Stddev_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** aggregate stddev_pop on columns */
export type Legends_Preset_Stddev_Pop_Fields = {
  __typename?: 'legends_preset_stddev_pop_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_pop() on columns of table "legends.preset" */
export type Legends_Preset_Stddev_Pop_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** aggregate stddev_samp on columns */
export type Legends_Preset_Stddev_Samp_Fields = {
  __typename?: 'legends_preset_stddev_samp_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by stddev_samp() on columns of table "legends.preset" */
export type Legends_Preset_Stddev_Samp_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** Streaming cursor of the table "legends_preset" */
export type Legends_Preset_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Legends_Preset_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Legends_Preset_Stream_Cursor_Value_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['bigint']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  elementType?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  style?: InputMaybe<Scalars['jsonb']['input']>;
  updatedAt?: InputMaybe<Scalars['bigint']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Legends_Preset_Sum_Fields = {
  __typename?: 'legends_preset_sum_fields';
  createdAt?: Maybe<Scalars['bigint']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['bigint']['output']>;
};

/** order by sum() on columns of table "legends.preset" */
export type Legends_Preset_Sum_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
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

export type Legends_Preset_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Legends_Preset_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Legends_Preset_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Legends_Preset_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Legends_Preset_Delete_Key_Input>;
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Legends_Preset_Inc_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Legends_Preset_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Legends_Preset_Set_Input>;
  /** filter the rows which have to be updated */
  where: Legends_Preset_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Legends_Preset_Var_Pop_Fields = {
  __typename?: 'legends_preset_var_pop_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by var_pop() on columns of table "legends.preset" */
export type Legends_Preset_Var_Pop_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** aggregate var_samp on columns */
export type Legends_Preset_Var_Samp_Fields = {
  __typename?: 'legends_preset_var_samp_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by var_samp() on columns of table "legends.preset" */
export type Legends_Preset_Var_Samp_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** aggregate variance on columns */
export type Legends_Preset_Variance_Fields = {
  __typename?: 'legends_preset_variance_fields';
  createdAt?: Maybe<Scalars['Float']['output']>;
  position?: Maybe<Scalars['Float']['output']>;
  updatedAt?: Maybe<Scalars['Float']['output']>;
};

/** order by variance() on columns of table "legends.preset" */
export type Legends_Preset_Variance_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
};

/** columns and relationships of "meta.objectType" */
export type Meta_ObjectType = {
  __typename?: 'meta_objectType';
  comment?: Maybe<Scalars['String']['output']>;
  value: Scalars['String']['output'];
};

/** aggregated selection of "meta.objectType" */
export type Meta_ObjectType_Aggregate = {
  __typename?: 'meta_objectType_aggregate';
  aggregate?: Maybe<Meta_ObjectType_Aggregate_Fields>;
  nodes: Array<Meta_ObjectType>;
};

/** aggregate fields of "meta.objectType" */
export type Meta_ObjectType_Aggregate_Fields = {
  __typename?: 'meta_objectType_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Meta_ObjectType_Max_Fields>;
  min?: Maybe<Meta_ObjectType_Min_Fields>;
};


/** aggregate fields of "meta.objectType" */
export type Meta_ObjectType_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Meta_ObjectType_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "meta.objectType". All fields are combined with a logical 'AND'. */
export type Meta_ObjectType_Bool_Exp = {
  _and?: InputMaybe<Array<Meta_ObjectType_Bool_Exp>>;
  _not?: InputMaybe<Meta_ObjectType_Bool_Exp>;
  _or?: InputMaybe<Array<Meta_ObjectType_Bool_Exp>>;
  comment?: InputMaybe<String_Comparison_Exp>;
  value?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "meta.objectType" */
export type Meta_ObjectType_Constraint =
  /** unique or primary key constraint on columns "value" */
  | 'objectType_pkey';

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
  _eq?: InputMaybe<Meta_ObjectType_Enum>;
  _in?: InputMaybe<Array<Meta_ObjectType_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Meta_ObjectType_Enum>;
  _nin?: InputMaybe<Array<Meta_ObjectType_Enum>>;
};

/** input type for inserting data into table "meta.objectType" */
export type Meta_ObjectType_Insert_Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Meta_ObjectType_Max_Fields = {
  __typename?: 'meta_objectType_max_fields';
  comment?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Meta_ObjectType_Min_Fields = {
  __typename?: 'meta_objectType_min_fields';
  comment?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "meta.objectType" */
export type Meta_ObjectType_Mutation_Response = {
  __typename?: 'meta_objectType_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Meta_ObjectType>;
};

/** on_conflict condition type for table "meta.objectType" */
export type Meta_ObjectType_On_Conflict = {
  constraint: Meta_ObjectType_Constraint;
  update_columns?: Array<Meta_ObjectType_Update_Column>;
  where?: InputMaybe<Meta_ObjectType_Bool_Exp>;
};

/** Ordering options when selecting data from "meta.objectType". */
export type Meta_ObjectType_Order_By = {
  comment?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: meta.objectType */
export type Meta_ObjectType_Pk_Columns_Input = {
  value: Scalars['String']['input'];
};

/** select columns of table "meta.objectType" */
export type Meta_ObjectType_Select_Column =
  /** column name */
  | 'comment'
  /** column name */
  | 'value';

/** input type for updating data in table "meta.objectType" */
export type Meta_ObjectType_Set_Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** Streaming cursor of the table "meta_objectType" */
export type Meta_ObjectType_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Meta_ObjectType_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Meta_ObjectType_Stream_Cursor_Value_Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** update columns of table "meta.objectType" */
export type Meta_ObjectType_Update_Column =
  /** column name */
  | 'comment'
  /** column name */
  | 'value';

export type Meta_ObjectType_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Meta_ObjectType_Set_Input>;
  /** filter the rows which have to be updated */
  where: Meta_ObjectType_Bool_Exp;
};

/** columns and relationships of "meta.property" */
export type Meta_Property = {
  __typename?: 'meta_property';
  /** An object relationship */
  base: Bases_Base;
  baseId: Scalars['uuid']['output'];
  createdAt: Scalars['timestamptz']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  type: Meta_PropertyType_Enum;
  updatedAt: Scalars['timestamptz']['output'];
  updatedBy?: Maybe<Scalars['String']['output']>;
  /** An array relationship */
  values: Array<Meta_PropertyValue>;
  /** An aggregate relationship */
  values_aggregate: Meta_PropertyValue_Aggregate;
};


/** columns and relationships of "meta.property" */
export type Meta_PropertyValuesArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyValue_Order_By>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};


/** columns and relationships of "meta.property" */
export type Meta_PropertyValues_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyValue_Order_By>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};

/** columns and relationships of "meta.propertyType" */
export type Meta_PropertyType = {
  __typename?: 'meta_propertyType';
  comment?: Maybe<Scalars['String']['output']>;
  value: Scalars['String']['output'];
};

/** aggregated selection of "meta.propertyType" */
export type Meta_PropertyType_Aggregate = {
  __typename?: 'meta_propertyType_aggregate';
  aggregate?: Maybe<Meta_PropertyType_Aggregate_Fields>;
  nodes: Array<Meta_PropertyType>;
};

/** aggregate fields of "meta.propertyType" */
export type Meta_PropertyType_Aggregate_Fields = {
  __typename?: 'meta_propertyType_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Meta_PropertyType_Max_Fields>;
  min?: Maybe<Meta_PropertyType_Min_Fields>;
};


/** aggregate fields of "meta.propertyType" */
export type Meta_PropertyType_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Meta_PropertyType_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "meta.propertyType". All fields are combined with a logical 'AND'. */
export type Meta_PropertyType_Bool_Exp = {
  _and?: InputMaybe<Array<Meta_PropertyType_Bool_Exp>>;
  _not?: InputMaybe<Meta_PropertyType_Bool_Exp>;
  _or?: InputMaybe<Array<Meta_PropertyType_Bool_Exp>>;
  comment?: InputMaybe<String_Comparison_Exp>;
  value?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "meta.propertyType" */
export type Meta_PropertyType_Constraint =
  /** unique or primary key constraint on columns "value" */
  | 'propertyType_pkey';

export type Meta_PropertyType_Enum =
  | 'date'
  | 'email'
  | 'image'
  | 'integer'
  | 'text';

/** Boolean expression to compare columns of type "meta_propertyType_enum". All fields are combined with logical 'AND'. */
export type Meta_PropertyType_Enum_Comparison_Exp = {
  _eq?: InputMaybe<Meta_PropertyType_Enum>;
  _in?: InputMaybe<Array<Meta_PropertyType_Enum>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Meta_PropertyType_Enum>;
  _nin?: InputMaybe<Array<Meta_PropertyType_Enum>>;
};

/** input type for inserting data into table "meta.propertyType" */
export type Meta_PropertyType_Insert_Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Meta_PropertyType_Max_Fields = {
  __typename?: 'meta_propertyType_max_fields';
  comment?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Meta_PropertyType_Min_Fields = {
  __typename?: 'meta_propertyType_min_fields';
  comment?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "meta.propertyType" */
export type Meta_PropertyType_Mutation_Response = {
  __typename?: 'meta_propertyType_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Meta_PropertyType>;
};

/** on_conflict condition type for table "meta.propertyType" */
export type Meta_PropertyType_On_Conflict = {
  constraint: Meta_PropertyType_Constraint;
  update_columns?: Array<Meta_PropertyType_Update_Column>;
  where?: InputMaybe<Meta_PropertyType_Bool_Exp>;
};

/** Ordering options when selecting data from "meta.propertyType". */
export type Meta_PropertyType_Order_By = {
  comment?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: meta.propertyType */
export type Meta_PropertyType_Pk_Columns_Input = {
  value: Scalars['String']['input'];
};

/** select columns of table "meta.propertyType" */
export type Meta_PropertyType_Select_Column =
  /** column name */
  | 'comment'
  /** column name */
  | 'value';

/** input type for updating data in table "meta.propertyType" */
export type Meta_PropertyType_Set_Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** Streaming cursor of the table "meta_propertyType" */
export type Meta_PropertyType_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Meta_PropertyType_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Meta_PropertyType_Stream_Cursor_Value_Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** update columns of table "meta.propertyType" */
export type Meta_PropertyType_Update_Column =
  /** column name */
  | 'comment'
  /** column name */
  | 'value';

export type Meta_PropertyType_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Meta_PropertyType_Set_Input>;
  /** filter the rows which have to be updated */
  where: Meta_PropertyType_Bool_Exp;
};

/** columns and relationships of "meta.propertyValue" */
export type Meta_PropertyValue = {
  __typename?: 'meta_propertyValue';
  /** An object relationship */
  base: Bases_Base;
  baseId: Scalars['uuid']['output'];
  createdAt: Scalars['timestamptz']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['uuid']['output'];
  /** An object relationship */
  object?: Maybe<Components_Component>;
  objectId: Scalars['uuid']['output'];
  objectType: Meta_ObjectType_Enum;
  orphanedAt?: Maybe<Scalars['timestamptz']['output']>;
  /** An object relationship */
  property: Meta_Property;
  propertyId: Scalars['uuid']['output'];
  updatedAt: Scalars['timestamptz']['output'];
  updatedBy?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['jsonb']['output']>;
};


/** columns and relationships of "meta.propertyValue" */
export type Meta_PropertyValueValueArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** aggregated selection of "meta.propertyValue" */
export type Meta_PropertyValue_Aggregate = {
  __typename?: 'meta_propertyValue_aggregate';
  aggregate?: Maybe<Meta_PropertyValue_Aggregate_Fields>;
  nodes: Array<Meta_PropertyValue>;
};

export type Meta_PropertyValue_Aggregate_Bool_Exp = {
  count?: InputMaybe<Meta_PropertyValue_Aggregate_Bool_Exp_Count>;
};

export type Meta_PropertyValue_Aggregate_Bool_Exp_Count = {
  arguments?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
  filter?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
  predicate: Int_Comparison_Exp;
};

/** aggregate fields of "meta.propertyValue" */
export type Meta_PropertyValue_Aggregate_Fields = {
  __typename?: 'meta_propertyValue_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Meta_PropertyValue_Max_Fields>;
  min?: Maybe<Meta_PropertyValue_Min_Fields>;
};


/** aggregate fields of "meta.propertyValue" */
export type Meta_PropertyValue_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** order by aggregate values of table "meta.propertyValue" */
export type Meta_PropertyValue_Aggregate_Order_By = {
  count?: InputMaybe<Order_By>;
  max?: InputMaybe<Meta_PropertyValue_Max_Order_By>;
  min?: InputMaybe<Meta_PropertyValue_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Meta_PropertyValue_Append_Input = {
  value?: InputMaybe<Scalars['jsonb']['input']>;
};

/** input type for inserting array relation for remote table "meta.propertyValue" */
export type Meta_PropertyValue_Arr_Rel_Insert_Input = {
  data: Array<Meta_PropertyValue_Insert_Input>;
  /** upsert condition */
  on_conflict?: InputMaybe<Meta_PropertyValue_On_Conflict>;
};

/** Boolean expression to filter rows from the table "meta.propertyValue". All fields are combined with a logical 'AND'. */
export type Meta_PropertyValue_Bool_Exp = {
  _and?: InputMaybe<Array<Meta_PropertyValue_Bool_Exp>>;
  _not?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
  _or?: InputMaybe<Array<Meta_PropertyValue_Bool_Exp>>;
  base?: InputMaybe<Bases_Base_Bool_Exp>;
  baseId?: InputMaybe<Uuid_Comparison_Exp>;
  createdAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  createdBy?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  object?: InputMaybe<Components_Component_Bool_Exp>;
  objectId?: InputMaybe<Uuid_Comparison_Exp>;
  objectType?: InputMaybe<Meta_ObjectType_Enum_Comparison_Exp>;
  orphanedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  property?: InputMaybe<Meta_Property_Bool_Exp>;
  propertyId?: InputMaybe<Uuid_Comparison_Exp>;
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  updatedBy?: InputMaybe<String_Comparison_Exp>;
  value?: InputMaybe<Jsonb_Comparison_Exp>;
};

/** unique or primary key constraints on table "meta.propertyValue" */
export type Meta_PropertyValue_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'propertyValue_pkey'
  /** unique or primary key constraint on columns "propertyId", "objectId" */
  | 'propertyValue_property_object_key';

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Meta_PropertyValue_Delete_At_Path_Input = {
  value?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Meta_PropertyValue_Delete_Elem_Input = {
  value?: InputMaybe<Scalars['Int']['input']>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Meta_PropertyValue_Delete_Key_Input = {
  value?: InputMaybe<Scalars['String']['input']>;
};

/** input type for inserting data into table "meta.propertyValue" */
export type Meta_PropertyValue_Insert_Input = {
  base?: InputMaybe<Bases_Base_Obj_Rel_Insert_Input>;
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  object?: InputMaybe<Components_Component_Obj_Rel_Insert_Input>;
  objectId?: InputMaybe<Scalars['uuid']['input']>;
  objectType?: InputMaybe<Meta_ObjectType_Enum>;
  orphanedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  property?: InputMaybe<Meta_Property_Obj_Rel_Insert_Input>;
  propertyId?: InputMaybe<Scalars['uuid']['input']>;
  updatedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['jsonb']['input']>;
};

/** aggregate max on columns */
export type Meta_PropertyValue_Max_Fields = {
  __typename?: 'meta_propertyValue_max_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  createdAt?: Maybe<Scalars['timestamptz']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  objectId?: Maybe<Scalars['uuid']['output']>;
  orphanedAt?: Maybe<Scalars['timestamptz']['output']>;
  propertyId?: Maybe<Scalars['uuid']['output']>;
  updatedAt?: Maybe<Scalars['timestamptz']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** order by max() on columns of table "meta.propertyValue" */
export type Meta_PropertyValue_Max_Order_By = {
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  objectId?: InputMaybe<Order_By>;
  orphanedAt?: InputMaybe<Order_By>;
  propertyId?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
};

/** aggregate min on columns */
export type Meta_PropertyValue_Min_Fields = {
  __typename?: 'meta_propertyValue_min_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  createdAt?: Maybe<Scalars['timestamptz']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  objectId?: Maybe<Scalars['uuid']['output']>;
  orphanedAt?: Maybe<Scalars['timestamptz']['output']>;
  propertyId?: Maybe<Scalars['uuid']['output']>;
  updatedAt?: Maybe<Scalars['timestamptz']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** order by min() on columns of table "meta.propertyValue" */
export type Meta_PropertyValue_Min_Order_By = {
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  objectId?: InputMaybe<Order_By>;
  orphanedAt?: InputMaybe<Order_By>;
  propertyId?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
};

/** response of any mutation on the table "meta.propertyValue" */
export type Meta_PropertyValue_Mutation_Response = {
  __typename?: 'meta_propertyValue_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Meta_PropertyValue>;
};

/** on_conflict condition type for table "meta.propertyValue" */
export type Meta_PropertyValue_On_Conflict = {
  constraint: Meta_PropertyValue_Constraint;
  update_columns?: Array<Meta_PropertyValue_Update_Column>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};

/** Ordering options when selecting data from "meta.propertyValue". */
export type Meta_PropertyValue_Order_By = {
  base?: InputMaybe<Bases_Base_Order_By>;
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  object?: InputMaybe<Components_Component_Order_By>;
  objectId?: InputMaybe<Order_By>;
  objectType?: InputMaybe<Order_By>;
  orphanedAt?: InputMaybe<Order_By>;
  property?: InputMaybe<Meta_Property_Order_By>;
  propertyId?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
  value?: InputMaybe<Order_By>;
};

/** primary key columns input for table: meta.propertyValue */
export type Meta_PropertyValue_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Meta_PropertyValue_Prepend_Input = {
  value?: InputMaybe<Scalars['jsonb']['input']>;
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

/** input type for updating data in table "meta.propertyValue" */
export type Meta_PropertyValue_Set_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  objectId?: InputMaybe<Scalars['uuid']['input']>;
  objectType?: InputMaybe<Meta_ObjectType_Enum>;
  orphanedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  propertyId?: InputMaybe<Scalars['uuid']['input']>;
  updatedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['jsonb']['input']>;
};

/** Streaming cursor of the table "meta_propertyValue" */
export type Meta_PropertyValue_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Meta_PropertyValue_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Meta_PropertyValue_Stream_Cursor_Value_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  objectId?: InputMaybe<Scalars['uuid']['input']>;
  objectType?: InputMaybe<Meta_ObjectType_Enum>;
  orphanedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  propertyId?: InputMaybe<Scalars['uuid']['input']>;
  updatedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['jsonb']['input']>;
};

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

export type Meta_PropertyValue_Updates = {
  /** append existing jsonb value of filtered columns with new jsonb value */
  _append?: InputMaybe<Meta_PropertyValue_Append_Input>;
  /** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
  _delete_at_path?: InputMaybe<Meta_PropertyValue_Delete_At_Path_Input>;
  /** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
  _delete_elem?: InputMaybe<Meta_PropertyValue_Delete_Elem_Input>;
  /** delete key/value pair or string element. key/value pairs are matched based on their key value */
  _delete_key?: InputMaybe<Meta_PropertyValue_Delete_Key_Input>;
  /** prepend existing jsonb value of filtered columns with new jsonb value */
  _prepend?: InputMaybe<Meta_PropertyValue_Prepend_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Meta_PropertyValue_Set_Input>;
  /** filter the rows which have to be updated */
  where: Meta_PropertyValue_Bool_Exp;
};

/** aggregated selection of "meta.property" */
export type Meta_Property_Aggregate = {
  __typename?: 'meta_property_aggregate';
  aggregate?: Maybe<Meta_Property_Aggregate_Fields>;
  nodes: Array<Meta_Property>;
};

/** aggregate fields of "meta.property" */
export type Meta_Property_Aggregate_Fields = {
  __typename?: 'meta_property_aggregate_fields';
  avg?: Maybe<Meta_Property_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Meta_Property_Max_Fields>;
  min?: Maybe<Meta_Property_Min_Fields>;
  stddev?: Maybe<Meta_Property_Stddev_Fields>;
  stddev_pop?: Maybe<Meta_Property_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Meta_Property_Stddev_Samp_Fields>;
  sum?: Maybe<Meta_Property_Sum_Fields>;
  var_pop?: Maybe<Meta_Property_Var_Pop_Fields>;
  var_samp?: Maybe<Meta_Property_Var_Samp_Fields>;
  variance?: Maybe<Meta_Property_Variance_Fields>;
};


/** aggregate fields of "meta.property" */
export type Meta_Property_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Meta_Property_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Meta_Property_Avg_Fields = {
  __typename?: 'meta_property_avg_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "meta.property". All fields are combined with a logical 'AND'. */
export type Meta_Property_Bool_Exp = {
  _and?: InputMaybe<Array<Meta_Property_Bool_Exp>>;
  _not?: InputMaybe<Meta_Property_Bool_Exp>;
  _or?: InputMaybe<Array<Meta_Property_Bool_Exp>>;
  base?: InputMaybe<Bases_Base_Bool_Exp>;
  baseId?: InputMaybe<Uuid_Comparison_Exp>;
  createdAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  createdBy?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<Uuid_Comparison_Exp>;
  name?: InputMaybe<String_Comparison_Exp>;
  position?: InputMaybe<Int_Comparison_Exp>;
  type?: InputMaybe<Meta_PropertyType_Enum_Comparison_Exp>;
  updatedAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  updatedBy?: InputMaybe<String_Comparison_Exp>;
  values?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
  values_aggregate?: InputMaybe<Meta_PropertyValue_Aggregate_Bool_Exp>;
};

/** unique or primary key constraints on table "meta.property" */
export type Meta_Property_Constraint =
  /** unique or primary key constraint on columns "baseId", "name" */
  | 'property_base_name_key'
  /** unique or primary key constraint on columns "id" */
  | 'property_pkey';

/** input type for incrementing numeric columns in table "meta.property" */
export type Meta_Property_Inc_Input = {
  position?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "meta.property" */
export type Meta_Property_Insert_Input = {
  base?: InputMaybe<Bases_Base_Obj_Rel_Insert_Input>;
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Meta_PropertyType_Enum>;
  updatedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Meta_PropertyValue_Arr_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Meta_Property_Max_Fields = {
  __typename?: 'meta_property_max_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  createdAt?: Maybe<Scalars['timestamptz']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['timestamptz']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Meta_Property_Min_Fields = {
  __typename?: 'meta_property_min_fields';
  baseId?: Maybe<Scalars['uuid']['output']>;
  createdAt?: Maybe<Scalars['timestamptz']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['uuid']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  position?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['timestamptz']['output']>;
  updatedBy?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "meta.property" */
export type Meta_Property_Mutation_Response = {
  __typename?: 'meta_property_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Meta_Property>;
};

/** input type for inserting object relation for remote table "meta.property" */
export type Meta_Property_Obj_Rel_Insert_Input = {
  data: Meta_Property_Insert_Input;
  /** upsert condition */
  on_conflict?: InputMaybe<Meta_Property_On_Conflict>;
};

/** on_conflict condition type for table "meta.property" */
export type Meta_Property_On_Conflict = {
  constraint: Meta_Property_Constraint;
  update_columns?: Array<Meta_Property_Update_Column>;
  where?: InputMaybe<Meta_Property_Bool_Exp>;
};

/** Ordering options when selecting data from "meta.property". */
export type Meta_Property_Order_By = {
  base?: InputMaybe<Bases_Base_Order_By>;
  baseId?: InputMaybe<Order_By>;
  createdAt?: InputMaybe<Order_By>;
  createdBy?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  name?: InputMaybe<Order_By>;
  position?: InputMaybe<Order_By>;
  type?: InputMaybe<Order_By>;
  updatedAt?: InputMaybe<Order_By>;
  updatedBy?: InputMaybe<Order_By>;
  values_aggregate?: InputMaybe<Meta_PropertyValue_Aggregate_Order_By>;
};

/** primary key columns input for table: meta.property */
export type Meta_Property_Pk_Columns_Input = {
  id: Scalars['uuid']['input'];
};

/** select columns of table "meta.property" */
export type Meta_Property_Select_Column =
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

/** input type for updating data in table "meta.property" */
export type Meta_Property_Set_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Meta_PropertyType_Enum>;
  updatedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Meta_Property_Stddev_Fields = {
  __typename?: 'meta_property_stddev_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Meta_Property_Stddev_Pop_Fields = {
  __typename?: 'meta_property_stddev_pop_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Meta_Property_Stddev_Samp_Fields = {
  __typename?: 'meta_property_stddev_samp_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "meta_property" */
export type Meta_Property_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Meta_Property_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Meta_Property_Stream_Cursor_Value_Input = {
  baseId?: InputMaybe<Scalars['uuid']['input']>;
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  createdBy?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['uuid']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<Meta_PropertyType_Enum>;
  updatedAt?: InputMaybe<Scalars['timestamptz']['input']>;
  updatedBy?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Meta_Property_Sum_Fields = {
  __typename?: 'meta_property_sum_fields';
  position?: Maybe<Scalars['Int']['output']>;
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

export type Meta_Property_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Meta_Property_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Meta_Property_Set_Input>;
  /** filter the rows which have to be updated */
  where: Meta_Property_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Meta_Property_Var_Pop_Fields = {
  __typename?: 'meta_property_var_pop_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Meta_Property_Var_Samp_Fields = {
  __typename?: 'meta_property_var_samp_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Meta_Property_Variance_Fields = {
  __typename?: 'meta_property_variance_fields';
  position?: Maybe<Scalars['Float']['output']>;
};

/** mutation root */
export type Mutation_Root = {
  __typename?: 'mutation_root';
  /** delete data from the table: "bases.base" */
  delete_bases_base?: Maybe<Bases_Base_Mutation_Response>;
  /** delete single row from the table: "bases.base" */
  delete_bases_base_by_pk?: Maybe<Bases_Base>;
  /** delete data from the table: "components.component" */
  delete_components_component?: Maybe<Components_Component_Mutation_Response>;
  /** delete data from the table: "components.componentType" */
  delete_components_componentType?: Maybe<Components_ComponentType_Mutation_Response>;
  /** delete single row from the table: "components.componentType" */
  delete_components_componentType_by_pk?: Maybe<Components_ComponentType>;
  /** delete single row from the table: "components.component" */
  delete_components_component_by_pk?: Maybe<Components_Component>;
  /** delete data from the table: "legends.preset" */
  delete_legends_preset?: Maybe<Legends_Preset_Mutation_Response>;
  /** delete single row from the table: "legends.preset" */
  delete_legends_preset_by_pk?: Maybe<Legends_Preset>;
  /** delete data from the table: "meta.objectType" */
  delete_meta_objectType?: Maybe<Meta_ObjectType_Mutation_Response>;
  /** delete single row from the table: "meta.objectType" */
  delete_meta_objectType_by_pk?: Maybe<Meta_ObjectType>;
  /** delete data from the table: "meta.property" */
  delete_meta_property?: Maybe<Meta_Property_Mutation_Response>;
  /** delete data from the table: "meta.propertyType" */
  delete_meta_propertyType?: Maybe<Meta_PropertyType_Mutation_Response>;
  /** delete single row from the table: "meta.propertyType" */
  delete_meta_propertyType_by_pk?: Maybe<Meta_PropertyType>;
  /** delete data from the table: "meta.propertyValue" */
  delete_meta_propertyValue?: Maybe<Meta_PropertyValue_Mutation_Response>;
  /** delete single row from the table: "meta.propertyValue" */
  delete_meta_propertyValue_by_pk?: Maybe<Meta_PropertyValue>;
  /** delete single row from the table: "meta.property" */
  delete_meta_property_by_pk?: Maybe<Meta_Property>;
  /** delete data from the table: "test" */
  delete_test?: Maybe<Test_Mutation_Response>;
  /** delete single row from the table: "test" */
  delete_test_by_pk?: Maybe<Test>;
  /** delete data from the table: "users.user" */
  delete_users_user?: Maybe<Users_User_Mutation_Response>;
  /** delete single row from the table: "users.user" */
  delete_users_user_by_pk?: Maybe<Users_User>;
  /** delete data from the table: "users.user_revisits" */
  delete_users_user_revisits?: Maybe<Users_User_Revisits_Mutation_Response>;
  /** delete single row from the table: "users.user_revisits" */
  delete_users_user_revisits_by_pk?: Maybe<Users_User_Revisits>;
  /** insert data into the table: "bases.base" */
  insert_bases_base?: Maybe<Bases_Base_Mutation_Response>;
  /** insert a single row into the table: "bases.base" */
  insert_bases_base_one?: Maybe<Bases_Base>;
  /** insert data into the table: "components.component" */
  insert_components_component?: Maybe<Components_Component_Mutation_Response>;
  /** insert data into the table: "components.componentType" */
  insert_components_componentType?: Maybe<Components_ComponentType_Mutation_Response>;
  /** insert a single row into the table: "components.componentType" */
  insert_components_componentType_one?: Maybe<Components_ComponentType>;
  /** insert a single row into the table: "components.component" */
  insert_components_component_one?: Maybe<Components_Component>;
  /** insert data into the table: "legends.preset" */
  insert_legends_preset?: Maybe<Legends_Preset_Mutation_Response>;
  /** insert a single row into the table: "legends.preset" */
  insert_legends_preset_one?: Maybe<Legends_Preset>;
  /** insert data into the table: "meta.objectType" */
  insert_meta_objectType?: Maybe<Meta_ObjectType_Mutation_Response>;
  /** insert a single row into the table: "meta.objectType" */
  insert_meta_objectType_one?: Maybe<Meta_ObjectType>;
  /** insert data into the table: "meta.property" */
  insert_meta_property?: Maybe<Meta_Property_Mutation_Response>;
  /** insert data into the table: "meta.propertyType" */
  insert_meta_propertyType?: Maybe<Meta_PropertyType_Mutation_Response>;
  /** insert a single row into the table: "meta.propertyType" */
  insert_meta_propertyType_one?: Maybe<Meta_PropertyType>;
  /** insert data into the table: "meta.propertyValue" */
  insert_meta_propertyValue?: Maybe<Meta_PropertyValue_Mutation_Response>;
  /** insert a single row into the table: "meta.propertyValue" */
  insert_meta_propertyValue_one?: Maybe<Meta_PropertyValue>;
  /** insert a single row into the table: "meta.property" */
  insert_meta_property_one?: Maybe<Meta_Property>;
  /** insert data into the table: "test" */
  insert_test?: Maybe<Test_Mutation_Response>;
  /** insert a single row into the table: "test" */
  insert_test_one?: Maybe<Test>;
  /** insert data into the table: "users.user" */
  insert_users_user?: Maybe<Users_User_Mutation_Response>;
  /** insert a single row into the table: "users.user" */
  insert_users_user_one?: Maybe<Users_User>;
  /** insert data into the table: "users.user_revisits" */
  insert_users_user_revisits?: Maybe<Users_User_Revisits_Mutation_Response>;
  /** insert a single row into the table: "users.user_revisits" */
  insert_users_user_revisits_one?: Maybe<Users_User_Revisits>;
  /** update data of the table: "bases.base" */
  update_bases_base?: Maybe<Bases_Base_Mutation_Response>;
  /** update single row of the table: "bases.base" */
  update_bases_base_by_pk?: Maybe<Bases_Base>;
  /** update multiples rows of table: "bases.base" */
  update_bases_base_many?: Maybe<Array<Maybe<Bases_Base_Mutation_Response>>>;
  /** update data of the table: "components.component" */
  update_components_component?: Maybe<Components_Component_Mutation_Response>;
  /** update data of the table: "components.componentType" */
  update_components_componentType?: Maybe<Components_ComponentType_Mutation_Response>;
  /** update single row of the table: "components.componentType" */
  update_components_componentType_by_pk?: Maybe<Components_ComponentType>;
  /** update multiples rows of table: "components.componentType" */
  update_components_componentType_many?: Maybe<Array<Maybe<Components_ComponentType_Mutation_Response>>>;
  /** update single row of the table: "components.component" */
  update_components_component_by_pk?: Maybe<Components_Component>;
  /** update multiples rows of table: "components.component" */
  update_components_component_many?: Maybe<Array<Maybe<Components_Component_Mutation_Response>>>;
  /** update data of the table: "legends.preset" */
  update_legends_preset?: Maybe<Legends_Preset_Mutation_Response>;
  /** update single row of the table: "legends.preset" */
  update_legends_preset_by_pk?: Maybe<Legends_Preset>;
  /** update multiples rows of table: "legends.preset" */
  update_legends_preset_many?: Maybe<Array<Maybe<Legends_Preset_Mutation_Response>>>;
  /** update data of the table: "meta.objectType" */
  update_meta_objectType?: Maybe<Meta_ObjectType_Mutation_Response>;
  /** update single row of the table: "meta.objectType" */
  update_meta_objectType_by_pk?: Maybe<Meta_ObjectType>;
  /** update multiples rows of table: "meta.objectType" */
  update_meta_objectType_many?: Maybe<Array<Maybe<Meta_ObjectType_Mutation_Response>>>;
  /** update data of the table: "meta.property" */
  update_meta_property?: Maybe<Meta_Property_Mutation_Response>;
  /** update data of the table: "meta.propertyType" */
  update_meta_propertyType?: Maybe<Meta_PropertyType_Mutation_Response>;
  /** update single row of the table: "meta.propertyType" */
  update_meta_propertyType_by_pk?: Maybe<Meta_PropertyType>;
  /** update multiples rows of table: "meta.propertyType" */
  update_meta_propertyType_many?: Maybe<Array<Maybe<Meta_PropertyType_Mutation_Response>>>;
  /** update data of the table: "meta.propertyValue" */
  update_meta_propertyValue?: Maybe<Meta_PropertyValue_Mutation_Response>;
  /** update single row of the table: "meta.propertyValue" */
  update_meta_propertyValue_by_pk?: Maybe<Meta_PropertyValue>;
  /** update multiples rows of table: "meta.propertyValue" */
  update_meta_propertyValue_many?: Maybe<Array<Maybe<Meta_PropertyValue_Mutation_Response>>>;
  /** update single row of the table: "meta.property" */
  update_meta_property_by_pk?: Maybe<Meta_Property>;
  /** update multiples rows of table: "meta.property" */
  update_meta_property_many?: Maybe<Array<Maybe<Meta_Property_Mutation_Response>>>;
  /** update data of the table: "test" */
  update_test?: Maybe<Test_Mutation_Response>;
  /** update single row of the table: "test" */
  update_test_by_pk?: Maybe<Test>;
  /** update multiples rows of table: "test" */
  update_test_many?: Maybe<Array<Maybe<Test_Mutation_Response>>>;
  /** update data of the table: "users.user" */
  update_users_user?: Maybe<Users_User_Mutation_Response>;
  /** update single row of the table: "users.user" */
  update_users_user_by_pk?: Maybe<Users_User>;
  /** update multiples rows of table: "users.user" */
  update_users_user_many?: Maybe<Array<Maybe<Users_User_Mutation_Response>>>;
  /** update data of the table: "users.user_revisits" */
  update_users_user_revisits?: Maybe<Users_User_Revisits_Mutation_Response>;
  /** update single row of the table: "users.user_revisits" */
  update_users_user_revisits_by_pk?: Maybe<Users_User_Revisits>;
  /** update multiples rows of table: "users.user_revisits" */
  update_users_user_revisits_many?: Maybe<Array<Maybe<Users_User_Revisits_Mutation_Response>>>;
};


/** mutation root */
export type Mutation_RootDelete_Bases_BaseArgs = {
  where: Bases_Base_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Bases_Base_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Components_ComponentArgs = {
  where: Components_Component_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Components_ComponentTypeArgs = {
  where: Components_ComponentType_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Components_ComponentType_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Components_Component_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Legends_PresetArgs = {
  where: Legends_Preset_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Legends_Preset_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Meta_ObjectTypeArgs = {
  where: Meta_ObjectType_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Meta_ObjectType_By_PkArgs = {
  value: Scalars['String']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Meta_PropertyArgs = {
  where: Meta_Property_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Meta_PropertyTypeArgs = {
  where: Meta_PropertyType_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Meta_PropertyType_By_PkArgs = {
  value: Scalars['String']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Meta_PropertyValueArgs = {
  where: Meta_PropertyValue_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Meta_PropertyValue_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Meta_Property_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


/** mutation root */
export type Mutation_RootDelete_TestArgs = {
  where: Test_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Test_By_PkArgs = {
  id: Scalars['Int']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Users_UserArgs = {
  where: Users_User_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Users_User_By_PkArgs = {
  id: Scalars['String']['input'];
};


/** mutation root */
export type Mutation_RootDelete_Users_User_RevisitsArgs = {
  where: Users_User_Revisits_Bool_Exp;
};


/** mutation root */
export type Mutation_RootDelete_Users_User_Revisits_By_PkArgs = {
  user_id: Scalars['String']['input'];
};


/** mutation root */
export type Mutation_RootInsert_Bases_BaseArgs = {
  objects: Array<Bases_Base_Insert_Input>;
  on_conflict?: InputMaybe<Bases_Base_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Bases_Base_OneArgs = {
  object: Bases_Base_Insert_Input;
  on_conflict?: InputMaybe<Bases_Base_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Components_ComponentArgs = {
  objects: Array<Components_Component_Insert_Input>;
  on_conflict?: InputMaybe<Components_Component_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Components_ComponentTypeArgs = {
  objects: Array<Components_ComponentType_Insert_Input>;
  on_conflict?: InputMaybe<Components_ComponentType_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Components_ComponentType_OneArgs = {
  object: Components_ComponentType_Insert_Input;
  on_conflict?: InputMaybe<Components_ComponentType_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Components_Component_OneArgs = {
  object: Components_Component_Insert_Input;
  on_conflict?: InputMaybe<Components_Component_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Legends_PresetArgs = {
  objects: Array<Legends_Preset_Insert_Input>;
  on_conflict?: InputMaybe<Legends_Preset_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Legends_Preset_OneArgs = {
  object: Legends_Preset_Insert_Input;
  on_conflict?: InputMaybe<Legends_Preset_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_ObjectTypeArgs = {
  objects: Array<Meta_ObjectType_Insert_Input>;
  on_conflict?: InputMaybe<Meta_ObjectType_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_ObjectType_OneArgs = {
  object: Meta_ObjectType_Insert_Input;
  on_conflict?: InputMaybe<Meta_ObjectType_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_PropertyArgs = {
  objects: Array<Meta_Property_Insert_Input>;
  on_conflict?: InputMaybe<Meta_Property_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_PropertyTypeArgs = {
  objects: Array<Meta_PropertyType_Insert_Input>;
  on_conflict?: InputMaybe<Meta_PropertyType_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_PropertyType_OneArgs = {
  object: Meta_PropertyType_Insert_Input;
  on_conflict?: InputMaybe<Meta_PropertyType_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_PropertyValueArgs = {
  objects: Array<Meta_PropertyValue_Insert_Input>;
  on_conflict?: InputMaybe<Meta_PropertyValue_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_PropertyValue_OneArgs = {
  object: Meta_PropertyValue_Insert_Input;
  on_conflict?: InputMaybe<Meta_PropertyValue_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Meta_Property_OneArgs = {
  object: Meta_Property_Insert_Input;
  on_conflict?: InputMaybe<Meta_Property_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_TestArgs = {
  objects: Array<Test_Insert_Input>;
  on_conflict?: InputMaybe<Test_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Test_OneArgs = {
  object: Test_Insert_Input;
  on_conflict?: InputMaybe<Test_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_UserArgs = {
  objects: Array<Users_User_Insert_Input>;
  on_conflict?: InputMaybe<Users_User_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_User_OneArgs = {
  object: Users_User_Insert_Input;
  on_conflict?: InputMaybe<Users_User_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_User_RevisitsArgs = {
  objects: Array<Users_User_Revisits_Insert_Input>;
  on_conflict?: InputMaybe<Users_User_Revisits_On_Conflict>;
};


/** mutation root */
export type Mutation_RootInsert_Users_User_Revisits_OneArgs = {
  object: Users_User_Revisits_Insert_Input;
  on_conflict?: InputMaybe<Users_User_Revisits_On_Conflict>;
};


/** mutation root */
export type Mutation_RootUpdate_Bases_BaseArgs = {
  _inc?: InputMaybe<Bases_Base_Inc_Input>;
  _set?: InputMaybe<Bases_Base_Set_Input>;
  where: Bases_Base_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Bases_Base_By_PkArgs = {
  _inc?: InputMaybe<Bases_Base_Inc_Input>;
  _set?: InputMaybe<Bases_Base_Set_Input>;
  pk_columns: Bases_Base_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Bases_Base_ManyArgs = {
  updates: Array<Bases_Base_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Components_ComponentArgs = {
  _append?: InputMaybe<Components_Component_Append_Input>;
  _delete_at_path?: InputMaybe<Components_Component_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Components_Component_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Components_Component_Delete_Key_Input>;
  _inc?: InputMaybe<Components_Component_Inc_Input>;
  _prepend?: InputMaybe<Components_Component_Prepend_Input>;
  _set?: InputMaybe<Components_Component_Set_Input>;
  where: Components_Component_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Components_ComponentTypeArgs = {
  _append?: InputMaybe<Components_ComponentType_Append_Input>;
  _delete_at_path?: InputMaybe<Components_ComponentType_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Components_ComponentType_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Components_ComponentType_Delete_Key_Input>;
  _inc?: InputMaybe<Components_ComponentType_Inc_Input>;
  _prepend?: InputMaybe<Components_ComponentType_Prepend_Input>;
  _set?: InputMaybe<Components_ComponentType_Set_Input>;
  where: Components_ComponentType_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Components_ComponentType_By_PkArgs = {
  _append?: InputMaybe<Components_ComponentType_Append_Input>;
  _delete_at_path?: InputMaybe<Components_ComponentType_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Components_ComponentType_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Components_ComponentType_Delete_Key_Input>;
  _inc?: InputMaybe<Components_ComponentType_Inc_Input>;
  _prepend?: InputMaybe<Components_ComponentType_Prepend_Input>;
  _set?: InputMaybe<Components_ComponentType_Set_Input>;
  pk_columns: Components_ComponentType_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Components_ComponentType_ManyArgs = {
  updates: Array<Components_ComponentType_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Components_Component_By_PkArgs = {
  _append?: InputMaybe<Components_Component_Append_Input>;
  _delete_at_path?: InputMaybe<Components_Component_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Components_Component_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Components_Component_Delete_Key_Input>;
  _inc?: InputMaybe<Components_Component_Inc_Input>;
  _prepend?: InputMaybe<Components_Component_Prepend_Input>;
  _set?: InputMaybe<Components_Component_Set_Input>;
  pk_columns: Components_Component_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Components_Component_ManyArgs = {
  updates: Array<Components_Component_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Legends_PresetArgs = {
  _append?: InputMaybe<Legends_Preset_Append_Input>;
  _delete_at_path?: InputMaybe<Legends_Preset_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Legends_Preset_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Legends_Preset_Delete_Key_Input>;
  _inc?: InputMaybe<Legends_Preset_Inc_Input>;
  _prepend?: InputMaybe<Legends_Preset_Prepend_Input>;
  _set?: InputMaybe<Legends_Preset_Set_Input>;
  where: Legends_Preset_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Legends_Preset_By_PkArgs = {
  _append?: InputMaybe<Legends_Preset_Append_Input>;
  _delete_at_path?: InputMaybe<Legends_Preset_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Legends_Preset_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Legends_Preset_Delete_Key_Input>;
  _inc?: InputMaybe<Legends_Preset_Inc_Input>;
  _prepend?: InputMaybe<Legends_Preset_Prepend_Input>;
  _set?: InputMaybe<Legends_Preset_Set_Input>;
  pk_columns: Legends_Preset_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Legends_Preset_ManyArgs = {
  updates: Array<Legends_Preset_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_ObjectTypeArgs = {
  _set?: InputMaybe<Meta_ObjectType_Set_Input>;
  where: Meta_ObjectType_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_ObjectType_By_PkArgs = {
  _set?: InputMaybe<Meta_ObjectType_Set_Input>;
  pk_columns: Meta_ObjectType_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_ObjectType_ManyArgs = {
  updates: Array<Meta_ObjectType_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyArgs = {
  _inc?: InputMaybe<Meta_Property_Inc_Input>;
  _set?: InputMaybe<Meta_Property_Set_Input>;
  where: Meta_Property_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyTypeArgs = {
  _set?: InputMaybe<Meta_PropertyType_Set_Input>;
  where: Meta_PropertyType_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyType_By_PkArgs = {
  _set?: InputMaybe<Meta_PropertyType_Set_Input>;
  pk_columns: Meta_PropertyType_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyType_ManyArgs = {
  updates: Array<Meta_PropertyType_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyValueArgs = {
  _append?: InputMaybe<Meta_PropertyValue_Append_Input>;
  _delete_at_path?: InputMaybe<Meta_PropertyValue_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Meta_PropertyValue_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Meta_PropertyValue_Delete_Key_Input>;
  _prepend?: InputMaybe<Meta_PropertyValue_Prepend_Input>;
  _set?: InputMaybe<Meta_PropertyValue_Set_Input>;
  where: Meta_PropertyValue_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyValue_By_PkArgs = {
  _append?: InputMaybe<Meta_PropertyValue_Append_Input>;
  _delete_at_path?: InputMaybe<Meta_PropertyValue_Delete_At_Path_Input>;
  _delete_elem?: InputMaybe<Meta_PropertyValue_Delete_Elem_Input>;
  _delete_key?: InputMaybe<Meta_PropertyValue_Delete_Key_Input>;
  _prepend?: InputMaybe<Meta_PropertyValue_Prepend_Input>;
  _set?: InputMaybe<Meta_PropertyValue_Set_Input>;
  pk_columns: Meta_PropertyValue_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_PropertyValue_ManyArgs = {
  updates: Array<Meta_PropertyValue_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_Property_By_PkArgs = {
  _inc?: InputMaybe<Meta_Property_Inc_Input>;
  _set?: InputMaybe<Meta_Property_Set_Input>;
  pk_columns: Meta_Property_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Meta_Property_ManyArgs = {
  updates: Array<Meta_Property_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_TestArgs = {
  _inc?: InputMaybe<Test_Inc_Input>;
  _set?: InputMaybe<Test_Set_Input>;
  where: Test_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Test_By_PkArgs = {
  _inc?: InputMaybe<Test_Inc_Input>;
  _set?: InputMaybe<Test_Set_Input>;
  pk_columns: Test_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Test_ManyArgs = {
  updates: Array<Test_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Users_UserArgs = {
  _set?: InputMaybe<Users_User_Set_Input>;
  where: Users_User_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Users_User_By_PkArgs = {
  _set?: InputMaybe<Users_User_Set_Input>;
  pk_columns: Users_User_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Users_User_ManyArgs = {
  updates: Array<Users_User_Updates>;
};


/** mutation root */
export type Mutation_RootUpdate_Users_User_RevisitsArgs = {
  _inc?: InputMaybe<Users_User_Revisits_Inc_Input>;
  _set?: InputMaybe<Users_User_Revisits_Set_Input>;
  where: Users_User_Revisits_Bool_Exp;
};


/** mutation root */
export type Mutation_RootUpdate_Users_User_Revisits_By_PkArgs = {
  _inc?: InputMaybe<Users_User_Revisits_Inc_Input>;
  _set?: InputMaybe<Users_User_Revisits_Set_Input>;
  pk_columns: Users_User_Revisits_Pk_Columns_Input;
};


/** mutation root */
export type Mutation_RootUpdate_Users_User_Revisits_ManyArgs = {
  updates: Array<Users_User_Revisits_Updates>;
};

/** column ordering options */
export type Order_By =
  /** in ascending order, nulls last */
  | 'asc'
  /** in ascending order, nulls first */
  | 'asc_nulls_first'
  /** in ascending order, nulls last */
  | 'asc_nulls_last'
  /** in descending order, nulls first */
  | 'desc'
  /** in descending order, nulls first */
  | 'desc_nulls_first'
  /** in descending order, nulls last */
  | 'desc_nulls_last';

export type Query_Root = {
  __typename?: 'query_root';
  /** fetch data from the table: "bases.base" */
  bases_base: Array<Bases_Base>;
  /** fetch aggregated fields from the table: "bases.base" */
  bases_base_aggregate: Bases_Base_Aggregate;
  /** fetch data from the table: "bases.base" using primary key columns */
  bases_base_by_pk?: Maybe<Bases_Base>;
  /** fetch data from the table: "components.component" */
  components_component: Array<Components_Component>;
  /** fetch data from the table: "components.componentType" */
  components_componentType: Array<Components_ComponentType>;
  /** fetch aggregated fields from the table: "components.componentType" */
  components_componentType_aggregate: Components_ComponentType_Aggregate;
  /** fetch data from the table: "components.componentType" using primary key columns */
  components_componentType_by_pk?: Maybe<Components_ComponentType>;
  /** fetch aggregated fields from the table: "components.component" */
  components_component_aggregate: Components_Component_Aggregate;
  /** fetch data from the table: "components.component" using primary key columns */
  components_component_by_pk?: Maybe<Components_Component>;
  /** fetch data from the table: "legends.preset" */
  legends_preset: Array<Legends_Preset>;
  /** fetch aggregated fields from the table: "legends.preset" */
  legends_preset_aggregate: Legends_Preset_Aggregate;
  /** fetch data from the table: "legends.preset" using primary key columns */
  legends_preset_by_pk?: Maybe<Legends_Preset>;
  /** fetch data from the table: "meta.objectType" */
  meta_objectType: Array<Meta_ObjectType>;
  /** fetch aggregated fields from the table: "meta.objectType" */
  meta_objectType_aggregate: Meta_ObjectType_Aggregate;
  /** fetch data from the table: "meta.objectType" using primary key columns */
  meta_objectType_by_pk?: Maybe<Meta_ObjectType>;
  /** fetch data from the table: "meta.property" */
  meta_property: Array<Meta_Property>;
  /** fetch data from the table: "meta.propertyType" */
  meta_propertyType: Array<Meta_PropertyType>;
  /** fetch aggregated fields from the table: "meta.propertyType" */
  meta_propertyType_aggregate: Meta_PropertyType_Aggregate;
  /** fetch data from the table: "meta.propertyType" using primary key columns */
  meta_propertyType_by_pk?: Maybe<Meta_PropertyType>;
  /** fetch data from the table: "meta.propertyValue" */
  meta_propertyValue: Array<Meta_PropertyValue>;
  /** fetch aggregated fields from the table: "meta.propertyValue" */
  meta_propertyValue_aggregate: Meta_PropertyValue_Aggregate;
  /** fetch data from the table: "meta.propertyValue" using primary key columns */
  meta_propertyValue_by_pk?: Maybe<Meta_PropertyValue>;
  /** fetch aggregated fields from the table: "meta.property" */
  meta_property_aggregate: Meta_Property_Aggregate;
  /** fetch data from the table: "meta.property" using primary key columns */
  meta_property_by_pk?: Maybe<Meta_Property>;
  /** fetch data from the table: "test" */
  test: Array<Test>;
  /** fetch aggregated fields from the table: "test" */
  test_aggregate: Test_Aggregate;
  /** fetch data from the table: "test" using primary key columns */
  test_by_pk?: Maybe<Test>;
  /** fetch data from the table: "users.user" */
  users_user: Array<Users_User>;
  /** fetch aggregated fields from the table: "users.user" */
  users_user_aggregate: Users_User_Aggregate;
  /** fetch data from the table: "users.user" using primary key columns */
  users_user_by_pk?: Maybe<Users_User>;
  /** fetch data from the table: "users.user_revisits" */
  users_user_revisits: Array<Users_User_Revisits>;
  /** fetch aggregated fields from the table: "users.user_revisits" */
  users_user_revisits_aggregate: Users_User_Revisits_Aggregate;
  /** fetch data from the table: "users.user_revisits" using primary key columns */
  users_user_revisits_by_pk?: Maybe<Users_User_Revisits>;
};


export type Query_RootBases_BaseArgs = {
  distinct_on?: InputMaybe<Array<Bases_Base_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Bases_Base_Order_By>>;
  where?: InputMaybe<Bases_Base_Bool_Exp>;
};


export type Query_RootBases_Base_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Bases_Base_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Bases_Base_Order_By>>;
  where?: InputMaybe<Bases_Base_Bool_Exp>;
};


export type Query_RootBases_Base_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootComponents_ComponentArgs = {
  distinct_on?: InputMaybe<Array<Components_Component_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_Component_Order_By>>;
  where?: InputMaybe<Components_Component_Bool_Exp>;
};


export type Query_RootComponents_ComponentTypeArgs = {
  distinct_on?: InputMaybe<Array<Components_ComponentType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_ComponentType_Order_By>>;
  where?: InputMaybe<Components_ComponentType_Bool_Exp>;
};


export type Query_RootComponents_ComponentType_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Components_ComponentType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_ComponentType_Order_By>>;
  where?: InputMaybe<Components_ComponentType_Bool_Exp>;
};


export type Query_RootComponents_ComponentType_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootComponents_Component_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Components_Component_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_Component_Order_By>>;
  where?: InputMaybe<Components_Component_Bool_Exp>;
};


export type Query_RootComponents_Component_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootLegends_PresetArgs = {
  distinct_on?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Legends_Preset_Order_By>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};


export type Query_RootLegends_Preset_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Legends_Preset_Order_By>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};


export type Query_RootLegends_Preset_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootMeta_ObjectTypeArgs = {
  distinct_on?: InputMaybe<Array<Meta_ObjectType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_ObjectType_Order_By>>;
  where?: InputMaybe<Meta_ObjectType_Bool_Exp>;
};


export type Query_RootMeta_ObjectType_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_ObjectType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_ObjectType_Order_By>>;
  where?: InputMaybe<Meta_ObjectType_Bool_Exp>;
};


export type Query_RootMeta_ObjectType_By_PkArgs = {
  value: Scalars['String']['input'];
};


export type Query_RootMeta_PropertyArgs = {
  distinct_on?: InputMaybe<Array<Meta_Property_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_Property_Order_By>>;
  where?: InputMaybe<Meta_Property_Bool_Exp>;
};


export type Query_RootMeta_PropertyTypeArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyType_Order_By>>;
  where?: InputMaybe<Meta_PropertyType_Bool_Exp>;
};


export type Query_RootMeta_PropertyType_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyType_Order_By>>;
  where?: InputMaybe<Meta_PropertyType_Bool_Exp>;
};


export type Query_RootMeta_PropertyType_By_PkArgs = {
  value: Scalars['String']['input'];
};


export type Query_RootMeta_PropertyValueArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyValue_Order_By>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};


export type Query_RootMeta_PropertyValue_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyValue_Order_By>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};


export type Query_RootMeta_PropertyValue_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootMeta_Property_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_Property_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_Property_Order_By>>;
  where?: InputMaybe<Meta_Property_Bool_Exp>;
};


export type Query_RootMeta_Property_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Query_RootTestArgs = {
  distinct_on?: InputMaybe<Array<Test_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Test_Order_By>>;
  where?: InputMaybe<Test_Bool_Exp>;
};


export type Query_RootTest_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Test_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Test_Order_By>>;
  where?: InputMaybe<Test_Bool_Exp>;
};


export type Query_RootTest_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Query_RootUsers_UserArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Order_By>>;
  where?: InputMaybe<Users_User_Bool_Exp>;
};


export type Query_RootUsers_User_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Order_By>>;
  where?: InputMaybe<Users_User_Bool_Exp>;
};


export type Query_RootUsers_User_By_PkArgs = {
  id: Scalars['String']['input'];
};


export type Query_RootUsers_User_RevisitsArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Revisits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Revisits_Order_By>>;
  where?: InputMaybe<Users_User_Revisits_Bool_Exp>;
};


export type Query_RootUsers_User_Revisits_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Revisits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Revisits_Order_By>>;
  where?: InputMaybe<Users_User_Revisits_Bool_Exp>;
};


export type Query_RootUsers_User_Revisits_By_PkArgs = {
  user_id: Scalars['String']['input'];
};

export type Subscription_Root = {
  __typename?: 'subscription_root';
  /** fetch data from the table: "bases.base" */
  bases_base: Array<Bases_Base>;
  /** fetch aggregated fields from the table: "bases.base" */
  bases_base_aggregate: Bases_Base_Aggregate;
  /** fetch data from the table: "bases.base" using primary key columns */
  bases_base_by_pk?: Maybe<Bases_Base>;
  /** fetch data from the table in a streaming manner: "bases.base" */
  bases_base_stream: Array<Bases_Base>;
  /** fetch data from the table: "components.component" */
  components_component: Array<Components_Component>;
  /** fetch data from the table: "components.componentType" */
  components_componentType: Array<Components_ComponentType>;
  /** fetch aggregated fields from the table: "components.componentType" */
  components_componentType_aggregate: Components_ComponentType_Aggregate;
  /** fetch data from the table: "components.componentType" using primary key columns */
  components_componentType_by_pk?: Maybe<Components_ComponentType>;
  /** fetch data from the table in a streaming manner: "components.componentType" */
  components_componentType_stream: Array<Components_ComponentType>;
  /** fetch aggregated fields from the table: "components.component" */
  components_component_aggregate: Components_Component_Aggregate;
  /** fetch data from the table: "components.component" using primary key columns */
  components_component_by_pk?: Maybe<Components_Component>;
  /** fetch data from the table in a streaming manner: "components.component" */
  components_component_stream: Array<Components_Component>;
  /** fetch data from the table: "legends.preset" */
  legends_preset: Array<Legends_Preset>;
  /** fetch aggregated fields from the table: "legends.preset" */
  legends_preset_aggregate: Legends_Preset_Aggregate;
  /** fetch data from the table: "legends.preset" using primary key columns */
  legends_preset_by_pk?: Maybe<Legends_Preset>;
  /** fetch data from the table in a streaming manner: "legends.preset" */
  legends_preset_stream: Array<Legends_Preset>;
  /** fetch data from the table: "meta.objectType" */
  meta_objectType: Array<Meta_ObjectType>;
  /** fetch aggregated fields from the table: "meta.objectType" */
  meta_objectType_aggregate: Meta_ObjectType_Aggregate;
  /** fetch data from the table: "meta.objectType" using primary key columns */
  meta_objectType_by_pk?: Maybe<Meta_ObjectType>;
  /** fetch data from the table in a streaming manner: "meta.objectType" */
  meta_objectType_stream: Array<Meta_ObjectType>;
  /** fetch data from the table: "meta.property" */
  meta_property: Array<Meta_Property>;
  /** fetch data from the table: "meta.propertyType" */
  meta_propertyType: Array<Meta_PropertyType>;
  /** fetch aggregated fields from the table: "meta.propertyType" */
  meta_propertyType_aggregate: Meta_PropertyType_Aggregate;
  /** fetch data from the table: "meta.propertyType" using primary key columns */
  meta_propertyType_by_pk?: Maybe<Meta_PropertyType>;
  /** fetch data from the table in a streaming manner: "meta.propertyType" */
  meta_propertyType_stream: Array<Meta_PropertyType>;
  /** fetch data from the table: "meta.propertyValue" */
  meta_propertyValue: Array<Meta_PropertyValue>;
  /** fetch aggregated fields from the table: "meta.propertyValue" */
  meta_propertyValue_aggregate: Meta_PropertyValue_Aggregate;
  /** fetch data from the table: "meta.propertyValue" using primary key columns */
  meta_propertyValue_by_pk?: Maybe<Meta_PropertyValue>;
  /** fetch data from the table in a streaming manner: "meta.propertyValue" */
  meta_propertyValue_stream: Array<Meta_PropertyValue>;
  /** fetch aggregated fields from the table: "meta.property" */
  meta_property_aggregate: Meta_Property_Aggregate;
  /** fetch data from the table: "meta.property" using primary key columns */
  meta_property_by_pk?: Maybe<Meta_Property>;
  /** fetch data from the table in a streaming manner: "meta.property" */
  meta_property_stream: Array<Meta_Property>;
  /** fetch data from the table: "test" */
  test: Array<Test>;
  /** fetch aggregated fields from the table: "test" */
  test_aggregate: Test_Aggregate;
  /** fetch data from the table: "test" using primary key columns */
  test_by_pk?: Maybe<Test>;
  /** fetch data from the table in a streaming manner: "test" */
  test_stream: Array<Test>;
  /** fetch data from the table: "users.user" */
  users_user: Array<Users_User>;
  /** fetch aggregated fields from the table: "users.user" */
  users_user_aggregate: Users_User_Aggregate;
  /** fetch data from the table: "users.user" using primary key columns */
  users_user_by_pk?: Maybe<Users_User>;
  /** fetch data from the table: "users.user_revisits" */
  users_user_revisits: Array<Users_User_Revisits>;
  /** fetch aggregated fields from the table: "users.user_revisits" */
  users_user_revisits_aggregate: Users_User_Revisits_Aggregate;
  /** fetch data from the table: "users.user_revisits" using primary key columns */
  users_user_revisits_by_pk?: Maybe<Users_User_Revisits>;
  /** fetch data from the table in a streaming manner: "users.user_revisits" */
  users_user_revisits_stream: Array<Users_User_Revisits>;
  /** fetch data from the table in a streaming manner: "users.user" */
  users_user_stream: Array<Users_User>;
};


export type Subscription_RootBases_BaseArgs = {
  distinct_on?: InputMaybe<Array<Bases_Base_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Bases_Base_Order_By>>;
  where?: InputMaybe<Bases_Base_Bool_Exp>;
};


export type Subscription_RootBases_Base_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Bases_Base_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Bases_Base_Order_By>>;
  where?: InputMaybe<Bases_Base_Bool_Exp>;
};


export type Subscription_RootBases_Base_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootBases_Base_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Bases_Base_Stream_Cursor_Input>>;
  where?: InputMaybe<Bases_Base_Bool_Exp>;
};


export type Subscription_RootComponents_ComponentArgs = {
  distinct_on?: InputMaybe<Array<Components_Component_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_Component_Order_By>>;
  where?: InputMaybe<Components_Component_Bool_Exp>;
};


export type Subscription_RootComponents_ComponentTypeArgs = {
  distinct_on?: InputMaybe<Array<Components_ComponentType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_ComponentType_Order_By>>;
  where?: InputMaybe<Components_ComponentType_Bool_Exp>;
};


export type Subscription_RootComponents_ComponentType_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Components_ComponentType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_ComponentType_Order_By>>;
  where?: InputMaybe<Components_ComponentType_Bool_Exp>;
};


export type Subscription_RootComponents_ComponentType_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootComponents_ComponentType_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Components_ComponentType_Stream_Cursor_Input>>;
  where?: InputMaybe<Components_ComponentType_Bool_Exp>;
};


export type Subscription_RootComponents_Component_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Components_Component_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Components_Component_Order_By>>;
  where?: InputMaybe<Components_Component_Bool_Exp>;
};


export type Subscription_RootComponents_Component_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootComponents_Component_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Components_Component_Stream_Cursor_Input>>;
  where?: InputMaybe<Components_Component_Bool_Exp>;
};


export type Subscription_RootLegends_PresetArgs = {
  distinct_on?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Legends_Preset_Order_By>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};


export type Subscription_RootLegends_Preset_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Legends_Preset_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Legends_Preset_Order_By>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};


export type Subscription_RootLegends_Preset_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootLegends_Preset_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Legends_Preset_Stream_Cursor_Input>>;
  where?: InputMaybe<Legends_Preset_Bool_Exp>;
};


export type Subscription_RootMeta_ObjectTypeArgs = {
  distinct_on?: InputMaybe<Array<Meta_ObjectType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_ObjectType_Order_By>>;
  where?: InputMaybe<Meta_ObjectType_Bool_Exp>;
};


export type Subscription_RootMeta_ObjectType_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_ObjectType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_ObjectType_Order_By>>;
  where?: InputMaybe<Meta_ObjectType_Bool_Exp>;
};


export type Subscription_RootMeta_ObjectType_By_PkArgs = {
  value: Scalars['String']['input'];
};


export type Subscription_RootMeta_ObjectType_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Meta_ObjectType_Stream_Cursor_Input>>;
  where?: InputMaybe<Meta_ObjectType_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyArgs = {
  distinct_on?: InputMaybe<Array<Meta_Property_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_Property_Order_By>>;
  where?: InputMaybe<Meta_Property_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyTypeArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyType_Order_By>>;
  where?: InputMaybe<Meta_PropertyType_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyType_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyType_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyType_Order_By>>;
  where?: InputMaybe<Meta_PropertyType_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyType_By_PkArgs = {
  value: Scalars['String']['input'];
};


export type Subscription_RootMeta_PropertyType_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Meta_PropertyType_Stream_Cursor_Input>>;
  where?: InputMaybe<Meta_PropertyType_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyValueArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyValue_Order_By>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyValue_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_PropertyValue_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_PropertyValue_Order_By>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};


export type Subscription_RootMeta_PropertyValue_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootMeta_PropertyValue_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Meta_PropertyValue_Stream_Cursor_Input>>;
  where?: InputMaybe<Meta_PropertyValue_Bool_Exp>;
};


export type Subscription_RootMeta_Property_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Meta_Property_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Meta_Property_Order_By>>;
  where?: InputMaybe<Meta_Property_Bool_Exp>;
};


export type Subscription_RootMeta_Property_By_PkArgs = {
  id: Scalars['uuid']['input'];
};


export type Subscription_RootMeta_Property_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Meta_Property_Stream_Cursor_Input>>;
  where?: InputMaybe<Meta_Property_Bool_Exp>;
};


export type Subscription_RootTestArgs = {
  distinct_on?: InputMaybe<Array<Test_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Test_Order_By>>;
  where?: InputMaybe<Test_Bool_Exp>;
};


export type Subscription_RootTest_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Test_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Test_Order_By>>;
  where?: InputMaybe<Test_Bool_Exp>;
};


export type Subscription_RootTest_By_PkArgs = {
  id: Scalars['Int']['input'];
};


export type Subscription_RootTest_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Test_Stream_Cursor_Input>>;
  where?: InputMaybe<Test_Bool_Exp>;
};


export type Subscription_RootUsers_UserArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Order_By>>;
  where?: InputMaybe<Users_User_Bool_Exp>;
};


export type Subscription_RootUsers_User_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Order_By>>;
  where?: InputMaybe<Users_User_Bool_Exp>;
};


export type Subscription_RootUsers_User_By_PkArgs = {
  id: Scalars['String']['input'];
};


export type Subscription_RootUsers_User_RevisitsArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Revisits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Revisits_Order_By>>;
  where?: InputMaybe<Users_User_Revisits_Bool_Exp>;
};


export type Subscription_RootUsers_User_Revisits_AggregateArgs = {
  distinct_on?: InputMaybe<Array<Users_User_Revisits_Select_Column>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<Users_User_Revisits_Order_By>>;
  where?: InputMaybe<Users_User_Revisits_Bool_Exp>;
};


export type Subscription_RootUsers_User_Revisits_By_PkArgs = {
  user_id: Scalars['String']['input'];
};


export type Subscription_RootUsers_User_Revisits_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Users_User_Revisits_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_User_Revisits_Bool_Exp>;
};


export type Subscription_RootUsers_User_StreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<Users_User_Stream_Cursor_Input>>;
  where?: InputMaybe<Users_User_Bool_Exp>;
};

/** columns and relationships of "test" */
export type Test = {
  __typename?: 'test';
  id: Scalars['Int']['output'];
  temp?: Maybe<Scalars['String']['output']>;
};

/** aggregated selection of "test" */
export type Test_Aggregate = {
  __typename?: 'test_aggregate';
  aggregate?: Maybe<Test_Aggregate_Fields>;
  nodes: Array<Test>;
};

/** aggregate fields of "test" */
export type Test_Aggregate_Fields = {
  __typename?: 'test_aggregate_fields';
  avg?: Maybe<Test_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Test_Max_Fields>;
  min?: Maybe<Test_Min_Fields>;
  stddev?: Maybe<Test_Stddev_Fields>;
  stddev_pop?: Maybe<Test_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Test_Stddev_Samp_Fields>;
  sum?: Maybe<Test_Sum_Fields>;
  var_pop?: Maybe<Test_Var_Pop_Fields>;
  var_samp?: Maybe<Test_Var_Samp_Fields>;
  variance?: Maybe<Test_Variance_Fields>;
};


/** aggregate fields of "test" */
export type Test_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Test_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Test_Avg_Fields = {
  __typename?: 'test_avg_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "test". All fields are combined with a logical 'AND'. */
export type Test_Bool_Exp = {
  _and?: InputMaybe<Array<Test_Bool_Exp>>;
  _not?: InputMaybe<Test_Bool_Exp>;
  _or?: InputMaybe<Array<Test_Bool_Exp>>;
  id?: InputMaybe<Int_Comparison_Exp>;
  temp?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "test" */
export type Test_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'test_pkey';

/** input type for incrementing numeric columns in table "test" */
export type Test_Inc_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
};

/** input type for inserting data into table "test" */
export type Test_Insert_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  temp?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Test_Max_Fields = {
  __typename?: 'test_max_fields';
  id?: Maybe<Scalars['Int']['output']>;
  temp?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Test_Min_Fields = {
  __typename?: 'test_min_fields';
  id?: Maybe<Scalars['Int']['output']>;
  temp?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "test" */
export type Test_Mutation_Response = {
  __typename?: 'test_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Test>;
};

/** on_conflict condition type for table "test" */
export type Test_On_Conflict = {
  constraint: Test_Constraint;
  update_columns?: Array<Test_Update_Column>;
  where?: InputMaybe<Test_Bool_Exp>;
};

/** Ordering options when selecting data from "test". */
export type Test_Order_By = {
  id?: InputMaybe<Order_By>;
  temp?: InputMaybe<Order_By>;
};

/** primary key columns input for table: test */
export type Test_Pk_Columns_Input = {
  id: Scalars['Int']['input'];
};

/** select columns of table "test" */
export type Test_Select_Column =
  /** column name */
  | 'id'
  /** column name */
  | 'temp';

/** input type for updating data in table "test" */
export type Test_Set_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  temp?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Test_Stddev_Fields = {
  __typename?: 'test_stddev_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Test_Stddev_Pop_Fields = {
  __typename?: 'test_stddev_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Test_Stddev_Samp_Fields = {
  __typename?: 'test_stddev_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "test" */
export type Test_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Test_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Test_Stream_Cursor_Value_Input = {
  id?: InputMaybe<Scalars['Int']['input']>;
  temp?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Test_Sum_Fields = {
  __typename?: 'test_sum_fields';
  id?: Maybe<Scalars['Int']['output']>;
};

/** update columns of table "test" */
export type Test_Update_Column =
  /** column name */
  | 'id'
  /** column name */
  | 'temp';

export type Test_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Test_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Test_Set_Input>;
  /** filter the rows which have to be updated */
  where: Test_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Test_Var_Pop_Fields = {
  __typename?: 'test_var_pop_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Test_Var_Samp_Fields = {
  __typename?: 'test_var_samp_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Test_Variance_Fields = {
  __typename?: 'test_variance_fields';
  id?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['timestamptz']['input']>;
  _gt?: InputMaybe<Scalars['timestamptz']['input']>;
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _in?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
  _neq?: InputMaybe<Scalars['timestamptz']['input']>;
  _nin?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
};

/** columns and relationships of "users.user" */
export type Users_User = {
  __typename?: 'users_user';
  createdAt: Scalars['timestamptz']['output'];
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  planId?: Maybe<Scalars['String']['output']>;
};

/** aggregated selection of "users.user" */
export type Users_User_Aggregate = {
  __typename?: 'users_user_aggregate';
  aggregate?: Maybe<Users_User_Aggregate_Fields>;
  nodes: Array<Users_User>;
};

/** aggregate fields of "users.user" */
export type Users_User_Aggregate_Fields = {
  __typename?: 'users_user_aggregate_fields';
  count: Scalars['Int']['output'];
  max?: Maybe<Users_User_Max_Fields>;
  min?: Maybe<Users_User_Min_Fields>;
};


/** aggregate fields of "users.user" */
export type Users_User_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_User_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Boolean expression to filter rows from the table "users.user". All fields are combined with a logical 'AND'. */
export type Users_User_Bool_Exp = {
  _and?: InputMaybe<Array<Users_User_Bool_Exp>>;
  _not?: InputMaybe<Users_User_Bool_Exp>;
  _or?: InputMaybe<Array<Users_User_Bool_Exp>>;
  createdAt?: InputMaybe<Timestamptz_Comparison_Exp>;
  email?: InputMaybe<String_Comparison_Exp>;
  firstName?: InputMaybe<String_Comparison_Exp>;
  id?: InputMaybe<String_Comparison_Exp>;
  isActive?: InputMaybe<Boolean_Comparison_Exp>;
  lastName?: InputMaybe<String_Comparison_Exp>;
  nickname?: InputMaybe<String_Comparison_Exp>;
  planId?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "users.user" */
export type Users_User_Constraint =
  /** unique or primary key constraint on columns "id" */
  | 'user_pkey';

/** input type for inserting data into table "users.user" */
export type Users_User_Insert_Input = {
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  planId?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Users_User_Max_Fields = {
  __typename?: 'users_user_max_fields';
  createdAt?: Maybe<Scalars['timestamptz']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  planId?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Users_User_Min_Fields = {
  __typename?: 'users_user_min_fields';
  createdAt?: Maybe<Scalars['timestamptz']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  planId?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "users.user" */
export type Users_User_Mutation_Response = {
  __typename?: 'users_user_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Users_User>;
};

/** on_conflict condition type for table "users.user" */
export type Users_User_On_Conflict = {
  constraint: Users_User_Constraint;
  update_columns?: Array<Users_User_Update_Column>;
  where?: InputMaybe<Users_User_Bool_Exp>;
};

/** Ordering options when selecting data from "users.user". */
export type Users_User_Order_By = {
  createdAt?: InputMaybe<Order_By>;
  email?: InputMaybe<Order_By>;
  firstName?: InputMaybe<Order_By>;
  id?: InputMaybe<Order_By>;
  isActive?: InputMaybe<Order_By>;
  lastName?: InputMaybe<Order_By>;
  nickname?: InputMaybe<Order_By>;
  planId?: InputMaybe<Order_By>;
};

/** primary key columns input for table: users.user */
export type Users_User_Pk_Columns_Input = {
  id: Scalars['String']['input'];
};

/** columns and relationships of "users.user_revisits" */
export type Users_User_Revisits = {
  __typename?: 'users_user_revisits';
  count: Scalars['bigint']['output'];
  last_visit: Scalars['timestamptz']['output'];
  user_id: Scalars['String']['output'];
};

/** aggregated selection of "users.user_revisits" */
export type Users_User_Revisits_Aggregate = {
  __typename?: 'users_user_revisits_aggregate';
  aggregate?: Maybe<Users_User_Revisits_Aggregate_Fields>;
  nodes: Array<Users_User_Revisits>;
};

/** aggregate fields of "users.user_revisits" */
export type Users_User_Revisits_Aggregate_Fields = {
  __typename?: 'users_user_revisits_aggregate_fields';
  avg?: Maybe<Users_User_Revisits_Avg_Fields>;
  count: Scalars['Int']['output'];
  max?: Maybe<Users_User_Revisits_Max_Fields>;
  min?: Maybe<Users_User_Revisits_Min_Fields>;
  stddev?: Maybe<Users_User_Revisits_Stddev_Fields>;
  stddev_pop?: Maybe<Users_User_Revisits_Stddev_Pop_Fields>;
  stddev_samp?: Maybe<Users_User_Revisits_Stddev_Samp_Fields>;
  sum?: Maybe<Users_User_Revisits_Sum_Fields>;
  var_pop?: Maybe<Users_User_Revisits_Var_Pop_Fields>;
  var_samp?: Maybe<Users_User_Revisits_Var_Samp_Fields>;
  variance?: Maybe<Users_User_Revisits_Variance_Fields>;
};


/** aggregate fields of "users.user_revisits" */
export type Users_User_Revisits_Aggregate_FieldsCountArgs = {
  columns?: InputMaybe<Array<Users_User_Revisits_Select_Column>>;
  distinct?: InputMaybe<Scalars['Boolean']['input']>;
};

/** aggregate avg on columns */
export type Users_User_Revisits_Avg_Fields = {
  __typename?: 'users_user_revisits_avg_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** Boolean expression to filter rows from the table "users.user_revisits". All fields are combined with a logical 'AND'. */
export type Users_User_Revisits_Bool_Exp = {
  _and?: InputMaybe<Array<Users_User_Revisits_Bool_Exp>>;
  _not?: InputMaybe<Users_User_Revisits_Bool_Exp>;
  _or?: InputMaybe<Array<Users_User_Revisits_Bool_Exp>>;
  count?: InputMaybe<Bigint_Comparison_Exp>;
  last_visit?: InputMaybe<Timestamptz_Comparison_Exp>;
  user_id?: InputMaybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "users.user_revisits" */
export type Users_User_Revisits_Constraint =
  /** unique or primary key constraint on columns "user_id" */
  | 'user_revisits_pkey';

/** input type for incrementing numeric columns in table "users.user_revisits" */
export type Users_User_Revisits_Inc_Input = {
  count?: InputMaybe<Scalars['bigint']['input']>;
};

/** input type for inserting data into table "users.user_revisits" */
export type Users_User_Revisits_Insert_Input = {
  count?: InputMaybe<Scalars['bigint']['input']>;
  last_visit?: InputMaybe<Scalars['timestamptz']['input']>;
  user_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate max on columns */
export type Users_User_Revisits_Max_Fields = {
  __typename?: 'users_user_revisits_max_fields';
  count?: Maybe<Scalars['bigint']['output']>;
  last_visit?: Maybe<Scalars['timestamptz']['output']>;
  user_id?: Maybe<Scalars['String']['output']>;
};

/** aggregate min on columns */
export type Users_User_Revisits_Min_Fields = {
  __typename?: 'users_user_revisits_min_fields';
  count?: Maybe<Scalars['bigint']['output']>;
  last_visit?: Maybe<Scalars['timestamptz']['output']>;
  user_id?: Maybe<Scalars['String']['output']>;
};

/** response of any mutation on the table "users.user_revisits" */
export type Users_User_Revisits_Mutation_Response = {
  __typename?: 'users_user_revisits_mutation_response';
  /** number of rows affected by the mutation */
  affected_rows: Scalars['Int']['output'];
  /** data from the rows affected by the mutation */
  returning: Array<Users_User_Revisits>;
};

/** on_conflict condition type for table "users.user_revisits" */
export type Users_User_Revisits_On_Conflict = {
  constraint: Users_User_Revisits_Constraint;
  update_columns?: Array<Users_User_Revisits_Update_Column>;
  where?: InputMaybe<Users_User_Revisits_Bool_Exp>;
};

/** Ordering options when selecting data from "users.user_revisits". */
export type Users_User_Revisits_Order_By = {
  count?: InputMaybe<Order_By>;
  last_visit?: InputMaybe<Order_By>;
  user_id?: InputMaybe<Order_By>;
};

/** primary key columns input for table: users.user_revisits */
export type Users_User_Revisits_Pk_Columns_Input = {
  user_id: Scalars['String']['input'];
};

/** select columns of table "users.user_revisits" */
export type Users_User_Revisits_Select_Column =
  /** column name */
  | 'count'
  /** column name */
  | 'last_visit'
  /** column name */
  | 'user_id';

/** input type for updating data in table "users.user_revisits" */
export type Users_User_Revisits_Set_Input = {
  count?: InputMaybe<Scalars['bigint']['input']>;
  last_visit?: InputMaybe<Scalars['timestamptz']['input']>;
  user_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate stddev on columns */
export type Users_User_Revisits_Stddev_Fields = {
  __typename?: 'users_user_revisits_stddev_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_pop on columns */
export type Users_User_Revisits_Stddev_Pop_Fields = {
  __typename?: 'users_user_revisits_stddev_pop_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** aggregate stddev_samp on columns */
export type Users_User_Revisits_Stddev_Samp_Fields = {
  __typename?: 'users_user_revisits_stddev_samp_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** Streaming cursor of the table "users_user_revisits" */
export type Users_User_Revisits_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_User_Revisits_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_User_Revisits_Stream_Cursor_Value_Input = {
  count?: InputMaybe<Scalars['bigint']['input']>;
  last_visit?: InputMaybe<Scalars['timestamptz']['input']>;
  user_id?: InputMaybe<Scalars['String']['input']>;
};

/** aggregate sum on columns */
export type Users_User_Revisits_Sum_Fields = {
  __typename?: 'users_user_revisits_sum_fields';
  count?: Maybe<Scalars['bigint']['output']>;
};

/** update columns of table "users.user_revisits" */
export type Users_User_Revisits_Update_Column =
  /** column name */
  | 'count'
  /** column name */
  | 'last_visit'
  /** column name */
  | 'user_id';

export type Users_User_Revisits_Updates = {
  /** increments the numeric columns with given value of the filtered values */
  _inc?: InputMaybe<Users_User_Revisits_Inc_Input>;
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Users_User_Revisits_Set_Input>;
  /** filter the rows which have to be updated */
  where: Users_User_Revisits_Bool_Exp;
};

/** aggregate var_pop on columns */
export type Users_User_Revisits_Var_Pop_Fields = {
  __typename?: 'users_user_revisits_var_pop_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** aggregate var_samp on columns */
export type Users_User_Revisits_Var_Samp_Fields = {
  __typename?: 'users_user_revisits_var_samp_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** aggregate variance on columns */
export type Users_User_Revisits_Variance_Fields = {
  __typename?: 'users_user_revisits_variance_fields';
  count?: Maybe<Scalars['Float']['output']>;
};

/** select columns of table "users.user" */
export type Users_User_Select_Column =
  /** column name */
  | 'createdAt'
  /** column name */
  | 'email'
  /** column name */
  | 'firstName'
  /** column name */
  | 'id'
  /** column name */
  | 'isActive'
  /** column name */
  | 'lastName'
  /** column name */
  | 'nickname'
  /** column name */
  | 'planId';

/** input type for updating data in table "users.user" */
export type Users_User_Set_Input = {
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  planId?: InputMaybe<Scalars['String']['input']>;
};

/** Streaming cursor of the table "users_user" */
export type Users_User_Stream_Cursor_Input = {
  /** Stream column input with initial value */
  initial_value: Users_User_Stream_Cursor_Value_Input;
  /** cursor ordering */
  ordering?: InputMaybe<Cursor_Ordering>;
};

/** Initial value of the column from where the streaming should start */
export type Users_User_Stream_Cursor_Value_Input = {
  createdAt?: InputMaybe<Scalars['timestamptz']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  planId?: InputMaybe<Scalars['String']['input']>;
};

/** update columns of table "users.user" */
export type Users_User_Update_Column =
  /** column name */
  | 'createdAt'
  /** column name */
  | 'email'
  /** column name */
  | 'firstName'
  /** column name */
  | 'id'
  /** column name */
  | 'isActive'
  /** column name */
  | 'lastName'
  /** column name */
  | 'nickname'
  /** column name */
  | 'planId';

export type Users_User_Updates = {
  /** sets the columns of the filtered rows to the given values */
  _set?: InputMaybe<Users_User_Set_Input>;
  /** filter the rows which have to be updated */
  where: Users_User_Bool_Exp;
};

/** Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: InputMaybe<Scalars['uuid']['input']>;
  _gt?: InputMaybe<Scalars['uuid']['input']>;
  _gte?: InputMaybe<Scalars['uuid']['input']>;
  _in?: InputMaybe<Array<Scalars['uuid']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['uuid']['input']>;
  _lte?: InputMaybe<Scalars['uuid']['input']>;
  _neq?: InputMaybe<Scalars['uuid']['input']>;
  _nin?: InputMaybe<Array<Scalars['uuid']['input']>>;
};

export type UpdateComponentInfoMutationVariables = Exact<{
  id?: InputMaybe<Scalars['uuid']['input']>;
  updateObj?: InputMaybe<Components_Component_Set_Input>;
}>;


export type UpdateComponentInfoMutation = { __typename?: 'mutation_root', update_components_component_by_pk?: { __typename?: 'components_component', id: string } | null };

export type InsertComponentMutationVariables = Exact<{
  object?: InputMaybe<Components_Component_Insert_Input>;
}>;


export type InsertComponentMutation = { __typename?: 'mutation_root', component?: { __typename?: 'components_component', id: string, componentType: string } | null };

export type DeleteComponentByIdMutationVariables = Exact<{
  id?: InputMaybe<Scalars['uuid']['input']>;
}>;


export type DeleteComponentByIdMutation = { __typename?: 'mutation_root', delete_components_component_by_pk?: { __typename?: 'components_component', baseId: string } | null };

export type InsertBulkComponentsMutationVariables = Exact<{
  objects?: Array<Components_Component_Insert_Input> | Components_Component_Insert_Input;
}>;


export type InsertBulkComponentsMutation = { __typename?: 'mutation_root', insert_components_component?: { __typename?: 'components_component_mutation_response', affected_rows: number, returning: Array<{ __typename?: 'components_component', baseId: string, componentType: string, id: string }> } | null };

export type InsertUserMutationVariables = Exact<{
  object?: Users_User_Insert_Input;
}>;


export type InsertUserMutation = { __typename?: 'mutation_root', user?: { __typename?: 'users_user', id: string, firstName?: string | null } | null };

export type CreateBaseMutationVariables = Exact<{
  object?: Bases_Base_Insert_Input;
}>;


export type CreateBaseMutation = { __typename?: 'mutation_root', base?: { __typename?: 'bases_base', id: string, createdBy?: string | null } | null };

export type DeleteComponentsMutationVariables = Exact<{
  _in?: Array<Scalars['uuid']['input']> | Scalars['uuid']['input'];
}>;


export type DeleteComponentsMutation = { __typename?: 'mutation_root', deleteComponents?: { __typename?: 'components_component_mutation_response', affected_rows: number } | null };

export type UpdateBaseVisibilityMutationVariables = Exact<{
  id?: InputMaybe<Scalars['uuid']['input']>;
}>;


export type UpdateBaseVisibilityMutation = { __typename?: 'mutation_root', update_bases_base_by_pk?: { __typename?: 'bases_base', id: string, isPublic: boolean } | null };

export type SharePersistedBaseMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  landingLng?: InputMaybe<Scalars['float8']['input']>;
  landingLat?: InputMaybe<Scalars['float8']['input']>;
  landingZoom?: InputMaybe<Scalars['float8']['input']>;
}>;


export type SharePersistedBaseMutation = { __typename?: 'mutation_root', base?: { __typename?: 'bases_base', id: string, isPublic: boolean } | null };

export type UpdateUserRevisitCountMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  lastVisit: Scalars['timestamptz']['input'];
}>;


export type UpdateUserRevisitCountMutation = { __typename?: 'mutation_root', update_users_user_revisits_by_pk?: { __typename?: 'users_user_revisits', count: number, user_id: string, last_visit: string } | null };

export type InsertLegendPresetMutationVariables = Exact<{
  object?: InputMaybe<Legends_Preset_Insert_Input>;
}>;


export type InsertLegendPresetMutation = { __typename?: 'mutation_root', preset?: { __typename?: 'legends_preset', id: string, baseId: string, name: string, elementType: string, style: unknown, position: number, createdBy: string } | null };

export type InsertBulkLegendPresetsMutationVariables = Exact<{
  objects?: InputMaybe<Array<Legends_Preset_Insert_Input> | Legends_Preset_Insert_Input>;
}>;


export type InsertBulkLegendPresetsMutation = { __typename?: 'mutation_root', presets?: { __typename?: 'legends_preset_mutation_response', returning: Array<{ __typename?: 'legends_preset', id: string, baseId: string, name: string, elementType: string, style: unknown, position: number, createdBy: string }> } | null };

export type UpdateLegendPresetMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  updateObj?: InputMaybe<Legends_Preset_Set_Input>;
}>;


export type UpdateLegendPresetMutation = { __typename?: 'mutation_root', update_legends_preset_by_pk?: { __typename?: 'legends_preset', id: string } | null };

export type DeleteLegendPresetMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteLegendPresetMutation = { __typename?: 'mutation_root', delete_legends_preset_by_pk?: { __typename?: 'legends_preset', id: string } | null };

export type RestyleComponentsByPresetMutationVariables = Exact<{
  presetId: Scalars['uuid']['input'];
  updateObj?: InputMaybe<Components_Component_Set_Input>;
}>;


export type RestyleComponentsByPresetMutation = { __typename?: 'mutation_root', update_components_component?: { __typename?: 'components_component_mutation_response', affected_rows: number } | null };

export type InsertMetaPropertyMutationVariables = Exact<{
  object: Meta_Property_Insert_Input;
}>;


export type InsertMetaPropertyMutation = { __typename?: 'mutation_root', property?: { __typename?: 'meta_property', id: string, baseId: string, name: string, type: Meta_PropertyType_Enum, position: number, createdBy?: string | null } | null };

export type InsertBulkMetaPropertiesMutationVariables = Exact<{
  objects: Array<Meta_Property_Insert_Input> | Meta_Property_Insert_Input;
}>;


export type InsertBulkMetaPropertiesMutation = { __typename?: 'mutation_root', properties?: { __typename?: 'meta_property_mutation_response', affected_rows: number } | null };

export type UpdateMetaPropertyMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
  updateObj: Meta_Property_Set_Input;
}>;


export type UpdateMetaPropertyMutation = { __typename?: 'mutation_root', update_meta_property_by_pk?: { __typename?: 'meta_property', id: string } | null };

export type DeleteMetaPropertyMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteMetaPropertyMutation = { __typename?: 'mutation_root', delete_meta_property_by_pk?: { __typename?: 'meta_property', id: string } | null };

export type UpsertMetaValueMutationVariables = Exact<{
  object: Meta_PropertyValue_Insert_Input;
}>;


export type UpsertMetaValueMutation = { __typename?: 'mutation_root', value?: { __typename?: 'meta_propertyValue', id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value?: unknown | null, createdBy?: string | null } | null };

export type InsertBulkMetaValuesMutationVariables = Exact<{
  objects: Array<Meta_PropertyValue_Insert_Input> | Meta_PropertyValue_Insert_Input;
}>;


export type InsertBulkMetaValuesMutation = { __typename?: 'mutation_root', values?: { __typename?: 'meta_propertyValue_mutation_response', affected_rows: number } | null };

export type DeleteMetaValueMutationVariables = Exact<{
  id: Scalars['uuid']['input'];
}>;


export type DeleteMetaValueMutation = { __typename?: 'mutation_root', delete_meta_propertyValue_by_pk?: { __typename?: 'meta_propertyValue', id: string } | null };

export type DeleteMetaValueByCellMutationVariables = Exact<{
  propertyId: Scalars['uuid']['input'];
  objectId: Scalars['uuid']['input'];
}>;


export type DeleteMetaValueByCellMutation = { __typename?: 'mutation_root', delete_meta_propertyValue?: { __typename?: 'meta_propertyValue_mutation_response', affected_rows: number } | null };

export type GetComponentTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetComponentTypesQuery = { __typename?: 'query_root', componentTypes: Array<{ __typename?: 'components_componentType', label: string, metadata: unknown, logo?: string | null, width?: number | null, height?: number | null, fill?: string | null, textColor?: string | null }> };

export type GetComponentsForBaseQueryVariables = Exact<{
  baseId?: InputMaybe<Scalars['uuid']['input']>;
}>;


export type GetComponentsForBaseQuery = { __typename?: 'query_root', base?: { __typename?: 'bases_base', id: string, isPublic: boolean, mapAnchorLng?: any | null, mapAnchorLat?: any | null, mapAnchorZoom?: any | null, landingLng?: any | null, landingLat?: any | null, landingZoom?: any | null } | null, legendPresets: Array<{ __typename?: 'legends_preset', id: string, baseId: string, name: string, elementType: string, style: unknown, position: number, createdBy: string }>, metaProperties: Array<{ __typename?: 'meta_property', id: string, baseId: string, name: string, type: Meta_PropertyType_Enum, position: number, createdBy?: string | null }>, components: Array<{ __typename?: 'components_component', id: string, componentType: string, legendPresetId?: string | null, zoomResistant?: boolean | null, children?: unknown | null, metadata?: unknown | null, x: any, x1: any, x2: any, y: any, y1: any, y2: any, fill: string, width: any, height: any, stroke?: string | null, linewidth?: any | null, strokeType?: string | null, textColor?: string | null, opacity?: number | null, position: number }> };

export type GetBaseComponentCountQueryVariables = Exact<{
  baseId?: Scalars['uuid']['input'];
}>;


export type GetBaseComponentCountQuery = { __typename?: 'query_root', components: { __typename?: 'components_component_aggregate', aggregate?: { __typename?: 'components_component_aggregate_fields', count: number } | null } };

export type GetMetaValuesForObjectQueryVariables = Exact<{
  baseId: Scalars['uuid']['input'];
  objectId: Scalars['uuid']['input'];
}>;


export type GetMetaValuesForObjectQuery = { __typename?: 'query_root', metaValues: Array<{ __typename?: 'meta_propertyValue', id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value?: unknown | null, createdBy?: string | null }> };

export type GetMetaValuesForObjectsQueryVariables = Exact<{
  baseId: Scalars['uuid']['input'];
  objectIds: Array<Scalars['uuid']['input']> | Scalars['uuid']['input'];
}>;


export type GetMetaValuesForObjectsQuery = { __typename?: 'query_root', metaValues: Array<{ __typename?: 'meta_propertyValue', id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value?: unknown | null, createdBy?: string | null }> };

export type GetMetaValuesForBaseQueryVariables = Exact<{
  baseId: Scalars['uuid']['input'];
}>;


export type GetMetaValuesForBaseQuery = { __typename?: 'query_root', metaValues: Array<{ __typename?: 'meta_propertyValue', id: string, baseId: string, propertyId: string, objectId: string, objectType: Meta_ObjectType_Enum, value?: unknown | null, createdBy?: string | null }> };


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
export const GetComponentsForBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getComponentsForBase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"base"},"name":{"kind":"Name","value":"bases_base_by_pk"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isPublic"}},{"kind":"Field","name":{"kind":"Name","value":"mapAnchorLng"}},{"kind":"Field","name":{"kind":"Name","value":"mapAnchorLat"}},{"kind":"Field","name":{"kind":"Name","value":"mapAnchorZoom"}},{"kind":"Field","name":{"kind":"Name","value":"landingLng"}},{"kind":"Field","name":{"kind":"Name","value":"landingLat"}},{"kind":"Field","name":{"kind":"Name","value":"landingZoom"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"legendPresets"},"name":{"kind":"Name","value":"legends_preset"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"position"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"elementType"}},{"kind":"Field","name":{"kind":"Name","value":"style"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"metaProperties"},"name":{"kind":"Name","value":"meta_property"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"position"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"position"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"components"},"name":{"kind":"Name","value":"components_component"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"position"},"value":{"kind":"EnumValue","value":"asc"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"componentType"}},{"kind":"Field","name":{"kind":"Name","value":"legendPresetId"}},{"kind":"Field","name":{"kind":"Name","value":"zoomResistant"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"}},{"kind":"Field","name":{"kind":"Name","value":"x"}},{"kind":"Field","name":{"kind":"Name","value":"x1"}},{"kind":"Field","name":{"kind":"Name","value":"x2"}},{"kind":"Field","name":{"kind":"Name","value":"y"}},{"kind":"Field","name":{"kind":"Name","value":"y1"}},{"kind":"Field","name":{"kind":"Name","value":"y2"}},{"kind":"Field","name":{"kind":"Name","value":"fill"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"stroke"}},{"kind":"Field","name":{"kind":"Name","value":"linewidth"}},{"kind":"Field","name":{"kind":"Name","value":"strokeType"}},{"kind":"Field","name":{"kind":"Name","value":"textColor"}},{"kind":"Field","name":{"kind":"Name","value":"opacity"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]}}]} as unknown as DocumentNode<GetComponentsForBaseQuery, GetComponentsForBaseQueryVariables>;
export const GetBaseComponentCountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getBaseComponentCount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}},"defaultValue":{"kind":"StringValue","value":"","block":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"components"},"name":{"kind":"Name","value":"components_component_aggregate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aggregate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]}}]} as unknown as DocumentNode<GetBaseComponentCountQuery, GetBaseComponentCountQueryVariables>;
export const GetMetaValuesForObjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getMetaValuesForObject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"metaValues"},"name":{"kind":"Name","value":"meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"objectId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objectId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<GetMetaValuesForObjectQuery, GetMetaValuesForObjectQueryVariables>;
export const GetMetaValuesForObjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getMetaValuesForObjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objectIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"metaValues"},"name":{"kind":"Name","value":"meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}},{"kind":"ObjectField","name":{"kind":"Name","value":"objectId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_in"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objectIds"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<GetMetaValuesForObjectsQuery, GetMetaValuesForObjectsQueryVariables>;
export const GetMetaValuesForBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"getMetaValuesForBase"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"uuid"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"metaValues"},"name":{"kind":"Name","value":"meta_propertyValue"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"baseId"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baseId"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baseId"}},{"kind":"Field","name":{"kind":"Name","value":"propertyId"}},{"kind":"Field","name":{"kind":"Name","value":"objectId"}},{"kind":"Field","name":{"kind":"Name","value":"objectType"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}}]}}]}}]} as unknown as DocumentNode<GetMetaValuesForBaseQuery, GetMetaValuesForBaseQueryVariables>;