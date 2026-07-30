-- Mission 144 — read-only validation for the Video++ metadata storage.

SELECT IF(
  (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_assets'
      AND COLUMN_NAME = 'editorial_metadata_json'
      AND DATA_TYPE = 'longtext'
      AND IS_NULLABLE = 'YES'
  ) = 1,
  'PASS editorial_metadata_json',
  'FAIL editorial_metadata_json'
) AS result;

SELECT IF(
  (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'media_assets'
      AND CONSTRAINT_NAME = 'chk_media_asset_editorial_metadata_json'
      AND CONSTRAINT_TYPE = 'CHECK'
  ) = 1,
  'PASS editorial metadata CHECK',
  'FAIL editorial metadata CHECK'
) AS result;

SELECT IF(
  (
    SELECT COUNT(*)
    FROM media_assets
    WHERE deleted_at IS NULL
      AND editorial_metadata_json IS NOT NULL
      AND NOT JSON_VALID(editorial_metadata_json)
  ) = 0,
  'PASS existing rows',
  'FAIL existing rows'
) AS result;
