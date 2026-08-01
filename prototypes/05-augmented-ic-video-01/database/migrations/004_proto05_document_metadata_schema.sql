-- Proto05 document projection metadata schema migration 004.
-- Mission 136, 2026-07-27.
--
-- This strict DDL targets only ic_augmented_video. It creates one table and
-- changes no existing table, routine or data. CREATE TABLE causes an implicit
-- MariaDB commit. The historical data importer that originally followed this
-- DDL has since been retired.
--
-- This retained historical DDL remains strict (no IF NOT EXISTS), documenting
-- that an incompatible table was never to be silently accepted.

USE ic_augmented_video;

SET NAMES utf8mb4;

CREATE TABLE data_projection_metadata (
  document_key          VARCHAR(64) NOT NULL,
  schema_version        VARCHAR(32) NOT NULL,
  source_updated_at_utc DATETIME(3) NULL,
  PRIMARY KEY (document_key),
  CONSTRAINT chk_data_projection_document_key
    CHECK (
      document_key IN (
        'activities',
        'activity-library',
        'video-catalog',
        'media-library'
      )
    ),
  CONSTRAINT chk_data_projection_schema_version
    CHECK (schema_version REGEXP '^[0-9]+[.][0-9]+$'),
  CONSTRAINT chk_data_projection_updated_at
    CHECK (
      (
        document_key IN (
          'activities',
          'activity-library',
          'media-library'
        )
        AND source_updated_at_utc IS NOT NULL
      )
      OR
      (
        document_key = 'video-catalog'
        AND source_updated_at_utc IS NULL
      )
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Canonical root metadata required to rebuild Proto05 document projections without reading JSON.';
