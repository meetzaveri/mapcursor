# Meta properties (and the image assets they share with image elements)

Status: **in progress.** Database and Hasura metadata are applied.

- Phase 1 (image storage layer) landed: `types/asset.ts`,
  `utils/assetStore.ts`, `utils/assetUses.ts`, `utils/imageFile.ts`,
  `utils/imageMetadata.ts`, with cleanup on draft load in
  `useLocalDraftPersistence`.
- Phase 2 (standalone image element) landed: see "Image elements" below.
- Phase 3 (meta property data layer) landed: see "Client storage" below.
- Phase 4 (panel, wizard, meta-value image source, share note) landed: see
  "UI" below.
- Phase 5 (e2e) landed. Specs: `image.spec.js`, `image-metadata.spec.js`
  (ported from craftbase), `meta-properties.spec.js`, `meta-share.spec.js`
  (its mock REFUSES meta inserts with columns the `user` role can't insert),
  and `anchor-and-draft.spec.js` (regressions: anchor expiry/import, empty
  canvas draft). Shared helpers: `tests/e2e/helpers/images.js`. Wait on
  conditions, never fixed sleeps: the draft write is debounced and loses
  races under parallel workers.

Update this as phases land, the way `geo-objects-plan.md` was.

Phases: 1 image storage layer, 2 image element, 3 meta property data
(GraphQL, codegen, `useMetaProperties`), 4 panel + meta-value asset source,
5 E2E.

Meta properties are named, typed fields a user attaches to an object, like
columns in a Notion table. A property is **defined once per base** and can then
be attached to **any supported object** on that base. Example: define "Photo"
(image) once, then fill it in for each point.

## Scope

- **Object types that take meta properties:** `point`, `route`, `area`,
  `circle` (the radius map) and `text` (geo-text). These are the
  `componentType` values, unchanged.
- **No meta properties on:** `pencil`, `groupobject`, `image`, and any tool
  state (select, pan, eraser). The panel is hidden for these.
- **Property types:** `integer`, `text`, `email`, `image`, `date`. A property
  can be renamed and retyped. Retyping converts the values that fit the new
  type and clears the rest (`convertMetaValue` in `utils/metaValue.ts`: to Text
  everything but images converts; to Number/Email/Date only text that already
  fits; to Image nothing). The dialog says how many of each first, and undo
  restores the old type and every original value. Retyping TO Image is
  refused on a shared canvas. Needs `type` in the `user` update permission on
  `meta.property` (added 2026-11-01).

## Schema (mapcursor-hasura)

The source of truth is the migration
`hasura/migrations/default/1793441959717_add_meta_property_schema/up.sql` in
mapcursor-hasura. The metadata lives in `meta_*.yaml` beside it. Don't copy
the DDL here; read it there. In short:

- `meta."propertyType"` and `meta."objectType"` are Hasura enum tables.
  Property types: `integer`, `text`, `email`, `image`, `date`. Object types:
  `point`, `route`, `area`, `circle` (radius map), `text` (geo-text).
- `meta.property` is the base-wide definition: `id`, `baseId`, `name`,
  `type`, `position`. `UNIQUE ("baseId", name)` as `property_base_name_key`.
- `meta."propertyValue"` is one object's value: `id`, `baseId`,
  `propertyId` (FK, cascade), `objectId` (**no FK**), `objectType`, `value`
  jsonb, `orphanedAt`. `UNIQUE ("propertyId", "objectId")` as
  `propertyValue_property_object_key`, the upsert target.
- The manual relationship `propertyValue.object` maps `objectId → id` and
  `baseId → baseId` on `components.component`, and the orphan sweep uses it.
- **The mapcursor-hasura repo is edited by the user, not by Claude.** Hand
  migration and metadata changes over as steps.

- Permissions copy `legends.preset`: the base's `isPublic` or `createdBy`.
- **Deleting a property definition** cascades to its values. The UI confirms
  with the number of objects that will lose a value.
- **`value` shapes by type:** `integer` is a jsonb number with no fraction,
  `text` and `email` are jsonb strings, `date` is an ISO `YYYY-MM-DD` string,
  and `image` is an `ImageAssetRef` (below). They are validated on the client
  in one `validateMetaValue(type, value)`. A DB trigger for this is optional.

## Orphans

**Why `objectId` has no foreign key.** Undoing a delete re-inserts the
component **with its original id** (see `undo-history.md`). With
`ON DELETE CASCADE` on `objectId`, deleting a point would destroy its values,
and undo would bring back a bare point. So values outlive their object, and:

- **The client never shows orphans.** The panel queries values by the selected
  `objectId`, so a value whose object is gone is never asked for.
- **The client never deletes values when an object is deleted.** Undo depends
  on it.
- **A local base cleans up on its own.** Values whose `objectId` is missing from
  the draft are dropped when the draft loads (the undo stack is empty then), and
  are not carried over by `persistBase`.
- **A shared base is cleaned up on the server** by the weekly sweep below.

### Weekly sweep (Hasura cron trigger)

This runs in two phases, so an orphan survives at least 7 days (up to 14 with a
weekly schedule) before it is deleted. If the object comes back in the meantime
(undo of a delete on a long-open tab), the mark is cleared.

```sql
CREATE OR REPLACE FUNCTION meta.sweep_orphan_values()
RETURNS SETOF meta."propertyValue"
LANGUAGE sql VOLATILE AS $$
    -- 1. Revive: the object came back (undo of a delete).
    UPDATE meta."propertyValue" v
       SET "orphanedAt" = NULL
     WHERE v."orphanedAt" IS NOT NULL
       AND EXISTS (SELECT 1 FROM components.component c
                    WHERE c.id = v."objectId" AND c."baseId" = v."baseId");

    -- 2. Mark: newly orphaned values.
    UPDATE meta."propertyValue" v
       SET "orphanedAt" = now()
     WHERE v."orphanedAt" IS NULL
       AND NOT EXISTS (SELECT 1 FROM components.component c
                        WHERE c.id = v."objectId" AND c."baseId" = v."baseId");

    -- 3. Delete: orphaned for at least a week. Returns what was removed.
    DELETE FROM meta."propertyValue"
     WHERE "orphanedAt" < now() - interval '7 days'
    RETURNING *;
$$;
```

Read-only check, for spot-checking before turning the cron on:

```sql
SELECT v."baseId", count(*) AS orphans, min(v."createdAt") AS oldest
  FROM meta."propertyValue" v
 WHERE NOT EXISTS (SELECT 1 FROM components.component c
                    WHERE c.id = v."objectId" AND c."baseId" = v."baseId")
 GROUP BY v."baseId"
 ORDER BY orphans DESC;
```

Schedule: `0 3 * * 0` (Sundays 03:00 UTC). A Hasura cron trigger calls a
**webhook**, which runs the GraphQL mutation below with the admin secret. The
SQL function above is the equivalent for `pg_cron` or a manual run. Only one
of the two is needed.

The GraphQL route needs a manual object relationship `object` on
`meta.propertyValue`. It maps `objectId → components.component.id` **and**
`baseId → baseId`. This is a relationship only, with no FK, so undo still
works. `orphanedAt` is not in any `user` role permission; only the sweep
writes it.

```graphql
# Hasura runs the fields of one mutation request in order, in one transaction.
mutation SweepOrphanMetaValues($now: timestamptz!, $cutoff: timestamptz!) {
    revived: update_meta_propertyValue(
        where: { orphanedAt: { _is_null: false }, object: {} }
        _set: { orphanedAt: null }
    ) {
        affected_rows
    }
    marked: update_meta_propertyValue(
        where: { orphanedAt: { _is_null: true }, _not: { object: {} } }
        _set: { orphanedAt: $now }
    ) {
        affected_rows
    }
    deleted: delete_meta_propertyValue(
        where: { orphanedAt: { _lt: $cutoff } }
    ) {
        affected_rows
    }
}
```

`$now` is the run time and `$cutoff` is `$now - 7 days`, both computed by the
webhook. `object: {}` is true when the related component exists.

Unused property **definitions** are not orphans: like an empty Notion column,
a definition with no values is kept on purpose.

## Image assets: one store, two kinds of owner

Image bytes live in IndexedDB (`mapcursor-assets`, store `images`), keyed by
the content hash and stored as `{ bytes: ArrayBuffer, type }`. They use an
ArrayBuffer because Safari private windows reject Blob values. The structure is
ported from craftbase `feat/image-support-local`, `imageAssetStore.ts`.

**A blob does not record who owns it. The reference does.** Two kinds of record
hold the same reference shape:

```ts
export interface ImageAssetRef {
    assetId: string // content hash, the IndexedDB key
    url: string | null // null until shared-base hosting exists
    mimeType: string
    naturalWidth: number
    naturalHeight: number
}
```

- An **image element** keeps it at `metadata.properties.image`, built through
  `geometry.ts`.
- An **image meta value** keeps it as `value`.

Ownership is derived from these references, never stored on the blob.
`collectAssetUses()` (`src/utils/assetUses.ts`) combines a list of sources,
`imageComponentSource` and `metaValueSource`, into
`{ assetId, owner: { kind: 'image-component' | 'meta-value', ... }, baseId }`.
Owner tags on blobs were rejected because the same photo is stored once, so it
can have owners of both kinds, and localStorage and IndexedDB cannot be updated
together atomically. Undo, paste and import would make the tags drift.

Every task that asks "who uses this blob" goes through `collectAssetUses()`:

- **Clean-up on draft load.** Keep any `assetId` a source mentions. It reads
  storage (the draft and **every** `mapcursor_meta_*` sidecar key), not React
  state, and skips entirely if any source fails to parse or the draft is
  deferred. Scanning only image elements, as craftbase does, would delete
  every photo attached to a point on the next reload.
- **JSON export:** `assets: { assetId: dataUrl }` across both kinds.
- **Future share upload:** see the end of this file.

Both kinds of image go through one path: `prepareImageFile`, which **strips
EXIF/GPS**, then `putImageAsset`. Do not read GPS out of photos to place
points. Stripping stays consistent with image elements.

## Client storage

- **Files.** `types/metaProperty.ts` (types; the unions come from the codegen
  enums), `utils/metaValue.ts` (value and name validation, the only place that
  knows each type's shape), `utils/metaPropertyStore.ts` (pure data ops:
  normalize, sidecar, orphans, re-key), `hooks/useMetaProperties.ts` (state
  and writes, exposed as `meta` on `BaseContext`).
- **Local base (`/`):** a sidecar `mapcursor_meta_<baseId>` =
  `{ properties, values }`, outside the draft blob like the legend sidecar,
  and outside the TTL sweep (it is content). The whole set is held in memory.
- **Shared base:** Hasura. Definitions come with `GET_COMPONENTS_FOR_BASE_QUERY`;
  values are fetched per object on selection (`loadValues`), network-only.
  Setting a value is an upsert on `propertyValue_property_object_key`, so an
  existing cell keeps its id. Definition writes are optimistic and roll back
  if the server refuses (e.g. the same name created in another tab); value
  writes reject, so the panel can show the error.
- **Images are local-only:** on a shared base the hook refuses to create an
  `image` property or set an image value (`META_IMAGE_SHARED_ERROR`).
- **`persistBase`** remembers old → new component ids (`componentIdMap`), then
  after inserting components calls `meta.persistToBase`: definitions re-minted,
  values re-pointed, image properties (and so their values) left behind. The
  `/` session keeps its original ids, so its sidecar is copied to the new
  local id unchanged, like the legend.
- **Paste** (`useCanvasClipboard`'s `onPasted`) copies the source objects'
  values onto the copies (`copyValuesToObjects`). Definitions are shared;
  image refs keep their `assetId`.
- **JSON export** (`formatVersion` 2.1) adds `metaProperties` =
  `{ properties, values }`, minus values whose object isn't in the file.
  **Open as new** writes the file's set for the new local id. **Merge** runs
  `mergeMetaSets`: same name and type reuses the existing property; same name,
  other type, becomes "Name (2)".
- **Orphans, locally:** dropped on draft load (`useLocalDraftPersistence`),
  before the image cleanup so a dropped image value frees its bytes.
- **Undo/redo:** every user edit (add property to an object, edit value,
  remove from object, rename, change type, delete property) is one `META`
  entry in the
  shared history (see `undo-history.md`), so Ctrl/Cmd+Z and the toolbar undo
  them in order with canvas edits. Deleting a property snapshots all its
  values first, so undo restores them. Paste copies, imports and shares are
  not user edits and record nothing.

## UI

`src/components/metaProperties/`, mounted next to the legend in `base.tsx`.

- **When:** `useSelectedMetaObject` — exactly one selected point / route /
  area / radius map / geo-text (read from `selectedComponent`, like the
  properties toolbar). Hidden for groups, pencil, images and tool modes.
- **Desktop:** a card on the right edge, tucked 8px under the legend (the
  same gap the legend keeps under the place search), same chrome as the
  legend. `useUnderLegendPlacement` follows the legend collapsing or growing
  (a ResizeObserver) and caps the card's height; it scrolls.
- **Mobile:** a button at the middle of the right edge (same style as the
  element-properties button) opens the same body in a sheet (Modal).
- **List:** one row per property on the object, in property order. Click a
  value to edit in place (Enter saves, Escape cancels, Shift+Enter is a new
  line in text). Hover actions: edit value, rename property, remove from this
  object, delete property (confirmed, with a count on a local canvas). An
  image shows as a thumbnail; click for the lightbox.
- **Wizard:** step 1 reuses a property of the map or names a new one and picks
  a type; step 2 is the value. A new definition is created only on Save.
  On a shared canvas the Image type is disabled with the reason shown.
- **Image values** go through `storeImageFile` (EXIF/GPS stripped, one file
  only), and are protected from cleanup by `metaSidecarSource` in
  `utils/assetUses.ts`, which reads every `mapcursor_meta_*` sidecar. JSON
  export uses `metaSetSource` on the exported set only, so a file never
  carries another canvas's photos.
- **Click-away:** point/text hide their selection on an outside mousedown;
  the panel (`#mc-meta-panel`) and its dialogs (`data-meta-panel-dialog`) are
  exempt via `utils/canvasChrome.ts`, like `#floating-toolbar`.
- **Share dialog:** `shareImagesNote.tsx` explains, in plain language, that
  image elements AND `image` properties (named) stay on this device, that the
  property itself won't appear on the shared canvas, and that nothing is
  deleted.

## Image elements (standalone)

Ported from craftbase `feat/image-support-local`. Two ways in, one insert path
(`hooks/useImageDrop.ts`): drag-and-drop onto the canvas (placed at the drop
point) and the toolbar Image tool (`primary.tsx` opens the picker, then
`requestImageInsert` fires `INSERT_IMAGE_FILES_EVENT` and the canvas places
the files at the viewport centre). The tool is one-shot, not a draw mode.

- **Record.** `utils/imageRecord.ts` builds it: a `Point` geometry at the
  centre, the `ImageAssetRef` at `metadata.properties.image`, and
  `width`/`height` in the group's LOCAL units.
- **Constant screen size, like geo-text.** `image` is in
  `GROUP_SCALED_TYPES` at `TEXT_RESIST` (`utils/counterScale.ts`), with no
  "Zoom resistant" switch. On screen = local × camera × counter-scale, so
  `imageLocalSize` divides that out to place the long edge at 480 screen px.
- **Resize** is the selection controller's `IMAGE_ADAPTER`. It converts at the
  boundary: the box and drag math use surface units (local × `group.scale`),
  and `storedSize` saves the local size. No zoom hook is needed, because every
  render re-runs `syncToTarget`.
- **Rendering.** `factory/image.ts` makes the frame rect (hit, selection and
  resize target). `utils/imageNode.ts` puts a native `<image>` under it,
  resolving `url ?? blob URL(assetId)`. `utils/imagePendingNode.ts` is the
  loading spinner, dropped on `IMAGE_SETTLED_EVENT`.
- **Shift + eraser** erases strokes but skips images (`componentIdAtPoint` in
  `newCanvas.tsx` reads `data-component-type`).
- **Properties toolbar:** the `IMAGE` set is opacity only.
- **Local-only guards:** the Image tool is hidden on shared bases;
  `addToLocalComponentStore` refuses images there; `persistBase` filters them
  out; the shared load path skips them; JSON import on a shared base drops
  them (`excludeImages`) and the chooser says how many; the share dialog warns
  (`shareImagesNote.tsx`).
- **Exports.** JSON `formatVersion` 2.1 inlines `assets`, and import restores
  them before applying records. SVG/PNG go through `prepareImagesForExport`,
  which swaps `blob:` hrefs for data URLs and drops loading spinners.
- **Gotcha.** `#main-two-root` has zero height (the svg inside is absolutely
  positioned). Measure `#main-two-root svg` for the viewport centre.

## Future: hosting images for shared bases

`uploadBaseAssets(collectAssetUses())` at the start of `persistBase`:

1. Upload each unique `assetId` once.
2. Fill in `url` while building the insert rows. For an image element it goes
   in `metadata.properties.image.url` (or a typed column). For a meta value it
   goes in `value.url`.
3. Remove the image filters.

There is no second update pass, and the renderer already prefers `url` over
`assetId`.
