-- Mission 144 — dedicated storage for optional editorial metadata on media assets.
--
-- Impact:
--   - adds one nullable JSON column and one JSON-validity CHECK;
--   - does not rewrite existing rows;
--   - leaves title, description, provenance, rights, lineage and playable data unchanged.
--
-- Required backup before applying:
--   mariadb-dump --single-transaction --no-tablespaces ic_augmented_video media_assets
--
-- Rollback:
--   ALTER TABLE media_assets
--     DROP CONSTRAINT chk_media_asset_editorial_metadata_json,
--     DROP COLUMN editorial_metadata_json;

ALTER TABLE media_assets
  ADD COLUMN editorial_metadata_json JSON NULL AFTER description,
  ADD CONSTRAINT chk_media_asset_editorial_metadata_json
    CHECK (
      editorial_metadata_json IS NULL
      OR JSON_VALID(editorial_metadata_json)
    );
