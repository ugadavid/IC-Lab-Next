-- Proto05 MariaDB relational model -- installable hardening revision 003.
-- Mission 130, 2026-07-27.
--
-- Installs the complete Proto05 schema in the existing DBA-provisioned
-- ic_augmented_video database. This file creates neither a database nor a
-- user and contains no credential. Binary media remain outside MariaDB.
--
-- Hard decisions represented here:
--   * target database: ic_augmented_video;
--   * MariaDB is the only runtime source of truth after cutover;
--   * logical media asset, origin, playable representation and treatment are
--     separate entities;
--   * one primary folder per activity and per media asset;
--   * missing files keep their playable identity and storage locator;
--   * routine deletes are logical; physical file removal is a two-phase
--     outbox operation confirmed by the Node filesystem adapter;
--   * activity-owned authoring rows use (activity_id, local_id), which permits
--     a duplicate to preserve local references without global ID collisions.

USE ic_augmented_video;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Schema lifecycle and explicit JSON imports
-- ---------------------------------------------------------------------------

CREATE TABLE schema_migrations (
  version             VARCHAR(64) NOT NULL PRIMARY KEY,
  description         VARCHAR(255) NOT NULL,
  checksum_sha256     CHAR(64) NOT NULL,
  applied_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_by          VARCHAR(191) NULL,
  CONSTRAINT uq_schema_migration_checksum UNIQUE (checksum_sha256)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Versioned SQL migrations; never populated automatically from JSON.';

CREATE TABLE import_runs (
  id                  VARCHAR(191) NOT NULL PRIMARY KEY,
  source_kind         VARCHAR(64) NOT NULL,
  source_digest       CHAR(64) NOT NULL,
  source_label        VARCHAR(255) NULL,
  status              VARCHAR(32) NOT NULL,
  dry_run             TINYINT(1) NOT NULL DEFAULT 1,
  started_at          DATETIME(3) NOT NULL,
  finished_at         DATETIME(3) NULL,
  counts_json         JSON NULL,
  diagnostics_json    JSON NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_import_status
    CHECK (status IN ('planned', 'running', 'validated', 'failed', 'rolled-back')),
  CONSTRAINT chk_import_counts_json
    CHECK (counts_json IS NULL OR JSON_VALID(counts_json)),
  CONSTRAINT chk_import_diagnostics_json
    CHECK (diagnostics_json IS NULL OR JSON_VALID(diagnostics_json))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit trail for explicit imports; not a startup seed registry.';

CREATE INDEX idx_import_runs_snapshot
  ON import_runs(source_kind, source_digest, started_at);

-- ---------------------------------------------------------------------------
-- Shared references and folders
-- ---------------------------------------------------------------------------

CREATE TABLE languages (
  id                  VARCHAR(64) NOT NULL PRIMARY KEY,
  code                VARCHAR(16) NOT NULL,
  label               VARCHAR(191) NOT NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_language_code UNIQUE (code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Proto05 language references; ownership of the shared catalog remains a DBA decision.';

CREATE TABLE activity_folders (
  id                  VARCHAR(191) NOT NULL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  normalized_name     VARCHAR(255) NOT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_activity_folder_name UNIQUE (normalized_name),
  CONSTRAINT chk_activity_folder_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_folders (
  id                  VARCHAR(191) NOT NULL PRIMARY KEY,
  parent_folder_id    VARCHAR(191) NULL,
  parent_folder_key   VARCHAR(191)
                        AS (COALESCE(parent_folder_id, '')) PERSISTENT,
  name                VARCHAR(255) NOT NULL,
  normalized_name     VARCHAR(255) NOT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_media_folder_sibling_name
    UNIQUE (parent_folder_key, normalized_name),
  CONSTRAINT chk_media_folder_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  CONSTRAINT chk_media_folder_not_self CHECK (parent_folder_id IS NULL OR parent_folder_id <> id),
  CONSTRAINT fk_media_folder_parent
    FOREIGN KEY (parent_folder_id) REFERENCES media_folders(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_folders_parent
  ON media_folders(parent_folder_id, sort_order, name);

CREATE TABLE media_tags (
  id                  VARCHAR(191) NOT NULL PRIMARY KEY,
  name                VARCHAR(191) NOT NULL,
  normalized_name     VARCHAR(191) NOT NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_media_tag_name UNIQUE (normalized_name),
  CONSTRAINT chk_media_tag_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Activities and pedagogical identity
-- ---------------------------------------------------------------------------

CREATE TABLE activities (
  id                        VARCHAR(191) NOT NULL PRIMARY KEY,
  folder_id                 VARCHAR(191) NULL,
  version                   VARCHAR(32) NOT NULL,
  status                    VARCHAR(32) NOT NULL DEFAULT 'draft',
  title                     VARCHAR(500) NOT NULL,
  description               TEXT NULL,
  instruction               TEXT NULL,
  pedagogical_question      TEXT NULL,
  revision                  BIGINT UNSIGNED NOT NULL DEFAULT 1,
  authoring_digest          CHAR(64) NULL,
  pedagogical_details_digest CHAR(64) NULL,
  allow_learner_toggle      TINYINT(1) NOT NULL DEFAULT 1,
  created_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at                DATETIME(3) NULL,
  CONSTRAINT chk_activity_status
    CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
  CONSTRAINT chk_activity_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT fk_activity_folder
    FOREIGN KEY (folder_id) REFERENCES activity_folders(id)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_activities_library
  ON activities(deleted_at, status, folder_id, title);

CREATE INDEX idx_activities_updated
  ON activities(deleted_at, updated_at);

CREATE TABLE activity_pedagogical_identities (
  activity_id               VARCHAR(191) NOT NULL PRIMARY KEY,
  schema_version            VARCHAR(32) NULL,
  design_status             VARCHAR(64) NULL,
  resource_nature_state     VARCHAR(32) NULL,
  resource_nature_value     TEXT NULL,
  resource_nature_note      TEXT NULL,
  duration_state            VARCHAR(32) NULL,
  duration_minutes          INT UNSIGNED NULL,
  duration_note             TEXT NULL,
  intention_state           VARCHAR(32) NULL,
  intention_value           TEXT NULL,
  intention_note            TEXT NULL,
  audience_state            VARCHAR(32) NULL,
  audience_value            TEXT NULL,
  audience_note             TEXT NULL,
  use_context_state         VARCHAR(32) NULL,
  use_context_value         TEXT NULL,
  use_context_note          TEXT NULL,
  lineage_state             VARCHAR(32) NULL,
  lineage_relation          VARCHAR(32) NULL,
  parent_activity_id        VARCHAR(191) NULL,
  root_activity_id          VARCHAR(191) NULL,
  lineage_note              TEXT NULL,
  extended_fields_json      JSON NULL,
  created_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                            ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_pedagogical_identity_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pedagogical_identity_parent
    FOREIGN KEY (parent_activity_id) REFERENCES activities(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_pedagogical_identity_root
    FOREIGN KEY (root_activity_id) REFERENCES activities(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_pedagogical_identity_lineage_member
    UNIQUE (root_activity_id, activity_id),
  CONSTRAINT fk_pedagogical_identity_parent_lineage
    FOREIGN KEY (root_activity_id, parent_activity_id)
    REFERENCES activity_pedagogical_identities(root_activity_id, activity_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_pedagogical_duration
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 1440),
  CONSTRAINT chk_pedagogical_design_status
    CHECK (
      design_status IS NULL
      OR design_status IN ('draft', 'documented', 'to-review', 'archived')
    ),
  CONSTRAINT chk_pedagogical_knowledge_states
    CHECK (
      (resource_nature_state IS NULL OR resource_nature_state IN (
        'known', 'unknown', 'to-verify'
      ))
      AND (duration_state IS NULL OR duration_state IN (
        'known', 'unknown', 'to-verify', 'not-applicable'
      ))
      AND (intention_state IS NULL OR intention_state IN (
        'known', 'unknown', 'to-verify', 'not-applicable'
      ))
      AND (audience_state IS NULL OR audience_state IN (
        'known', 'unknown', 'to-verify', 'not-applicable'
      ))
      AND (use_context_state IS NULL OR use_context_state IN (
        'known', 'unknown', 'to-verify', 'not-applicable'
      ))
      AND (lineage_state IS NULL OR lineage_state IN (
        'known', 'unknown', 'to-verify'
      ))
    ),
  CONSTRAINT chk_pedagogical_qualified_values
    CHECK (
      (
        (intention_state IS NULL
          AND intention_value IS NULL
          AND intention_note IS NULL)
        OR intention_state = 'unknown'
        OR (intention_state IN ('known', 'to-verify', 'not-applicable')
          AND intention_value IS NOT NULL
          AND CHAR_LENGTH(TRIM(intention_value)) > 0)
      )
      AND (
        (audience_state IS NULL
          AND audience_value IS NULL
          AND audience_note IS NULL)
        OR audience_state = 'unknown'
        OR (audience_state IN ('known', 'to-verify', 'not-applicable')
          AND audience_value IS NOT NULL
          AND CHAR_LENGTH(TRIM(audience_value)) > 0)
      )
      AND (
        (use_context_state IS NULL
          AND use_context_value IS NULL
          AND use_context_note IS NULL)
        OR use_context_state = 'unknown'
        OR (use_context_state IN ('known', 'to-verify', 'not-applicable')
          AND use_context_value IS NOT NULL
          AND CHAR_LENGTH(TRIM(use_context_value)) > 0)
      )
      AND (
        (resource_nature_state IS NULL
          AND resource_nature_value IS NULL
          AND resource_nature_note IS NULL)
        OR resource_nature_state = 'unknown'
        OR (resource_nature_state = 'known'
          AND resource_nature_value IS NOT NULL)
        OR (resource_nature_state = 'to-verify'
          AND (
            resource_nature_value IS NOT NULL
            OR (
              resource_nature_note IS NOT NULL
              AND CHAR_LENGTH(TRIM(resource_nature_note)) > 0
            )
          ))
      )
      AND (
        (duration_state IS NULL
          AND duration_minutes IS NULL
          AND duration_note IS NULL)
        OR duration_state = 'unknown'
        OR (duration_state = 'known' AND duration_minutes IS NOT NULL)
        OR (duration_state = 'to-verify'
          AND (
            duration_minutes IS NOT NULL
            OR (
              duration_note IS NOT NULL
              AND CHAR_LENGTH(TRIM(duration_note)) > 0
            )
          ))
        OR (duration_state = 'not-applicable'
          AND duration_note IS NOT NULL
          AND CHAR_LENGTH(TRIM(duration_note)) > 0)
      )
    ),
  CONSTRAINT chk_pedagogical_resource_nature
    CHECK (
      resource_nature_value IS NULL
      OR resource_nature_value IN (
        'functional-test', 'pedagogical-activity', 'demonstration', 'other'
      )
    ),
  CONSTRAINT chk_pedagogical_lineage_relation
    CHECK (
      lineage_relation IS NULL
      OR lineage_relation IN ('root', 'variant')
    ),
  CONSTRAINT chk_pedagogical_lineage_not_own_parent
    CHECK (parent_activity_id IS NULL OR parent_activity_id <> activity_id),
  CONSTRAINT chk_pedagogical_lineage_shape
    CHECK (
      COALESCE(
        (lineage_state IS NULL
          AND lineage_relation IS NULL
          AND parent_activity_id IS NULL
          AND root_activity_id IS NULL
          AND lineage_note IS NULL)
        OR (lineage_state = 'unknown'
          AND lineage_relation IS NULL
          AND parent_activity_id IS NULL
          AND root_activity_id IS NULL)
        OR (lineage_state = 'to-verify'
          AND lineage_relation IS NULL
          AND parent_activity_id IS NULL
          AND root_activity_id IS NULL
          AND lineage_note IS NOT NULL
          AND CHAR_LENGTH(TRIM(lineage_note)) > 0)
        OR (lineage_state = 'known'
          AND lineage_relation = 'root'
          AND parent_activity_id IS NULL
          AND root_activity_id = activity_id)
        OR (lineage_state = 'known'
          AND lineage_relation = 'variant'
          AND parent_activity_id IS NOT NULL
          AND root_activity_id IS NOT NULL
          AND root_activity_id <> activity_id),
        FALSE
      )
    ),
  CONSTRAINT chk_pedagogical_extended_json
    CHECK (extended_fields_json IS NULL OR JSON_VALID(extended_fields_json))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stable searchable fields are relational; unsettled identity extensions remain explicit JSON pending DBA/product review.';

CREATE INDEX idx_pedagogical_identity_lineage
  ON activity_pedagogical_identities(root_activity_id, parent_activity_id);

CREATE TABLE activity_pedagogical_text_fields (
  activity_id               VARCHAR(191) NOT NULL,
  field_key                 VARCHAR(64) NOT NULL,
  knowledge_state           VARCHAR(32) NOT NULL,
  value_text                TEXT NULL,
  note                      TEXT NULL,
  PRIMARY KEY (activity_id, field_key),
  CONSTRAINT fk_pedagogical_text_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_pedagogical_text_field
    CHECK (field_key IN (
      'learning-objectives', 'prerequisites', 'modalities',
      'recommended-scenario', 'pedagogical-core', 'adaptable-elements',
      'origin', 'responsibility', 'limitations'
    )),
  CONSTRAINT chk_pedagogical_text_state
    CHECK (knowledge_state IN (
      'known', 'unknown', 'to-verify', 'not-applicable'
    )),
  CONSTRAINT chk_pedagogical_text_value
    CHECK (
      knowledge_state = 'unknown'
      OR (value_text IS NOT NULL AND CHAR_LENGTH(TRIM(value_text)) > 0)
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pedagogical_text_state
  ON activity_pedagogical_text_fields(field_key, knowledge_state, activity_id);

CREATE TABLE activity_pedagogical_qualifications (
  activity_id               VARCHAR(191) NOT NULL,
  id                        VARCHAR(191) NOT NULL,
  level                     VARCHAR(64) NOT NULL,
  validated_by              VARCHAR(500) NOT NULL,
  validated_at              DATE NOT NULL,
  context_text              TEXT NOT NULL,
  evidence_type             VARCHAR(64) NOT NULL,
  evidence_text             TEXT NOT NULL,
  note                      TEXT NULL,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_pedagogical_qualification_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_pedagogical_qualification_level
    CHECK (level IN (
      'documented-by-author', 'reviewed-by-expert',
      'experimented', 'reused-by-third-party'
    )),
  CONSTRAINT chk_pedagogical_qualification_evidence
    CHECK (evidence_type IN (
      'author-declaration', 'expert-review', 'observed-use',
      'third-party-reappropriation', 'other'
    ))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pedagogical_qualifications_level
  ON activity_pedagogical_qualifications(level, validated_at, activity_id);

-- ---------------------------------------------------------------------------
-- Activity-owned authoring graph
-- ---------------------------------------------------------------------------

CREATE TABLE activity_languages (
  activity_id         VARCHAR(191) NOT NULL,
  language_id         VARCHAR(64) NOT NULL,
  local_label         VARCHAR(191) NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, language_id),
  CONSTRAINT fk_activity_language_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity_language_language
    FOREIGN KEY (language_id) REFERENCES languages(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_transcriptions (
  activity_id         VARCHAR(191) NOT NULL PRIMARY KEY,
  id                  VARCHAR(191) NOT NULL,
  language_id         VARCHAR(64) NULL,
  label               VARCHAR(255) NULL,
  CONSTRAINT uq_activity_transcription_local_id UNIQUE (activity_id, id),
  CONSTRAINT fk_activity_transcription_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity_transcription_language
    FOREIGN KEY (activity_id, language_id)
    REFERENCES activity_languages(activity_id, language_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Proto05 currently exposes one transcription per activity; its segmentIds are represented by the ordered activity_segments collection.';

CREATE TABLE activity_speakers (
  activity_id         VARCHAR(191) NOT NULL,
  id                  VARCHAR(191) NOT NULL,
  label               VARCHAR(255) NOT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_activity_speaker_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_segments (
  activity_id         VARCHAR(191) NOT NULL,
  id                  VARCHAR(191) NOT NULL,
  start_ms            BIGINT UNSIGNED NOT NULL,
  end_ms              BIGINT UNSIGNED NOT NULL,
  text                LONGTEXT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_activity_segment_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_activity_segment_time CHECK (end_ms > start_ms)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_activity_segments_timeline
  ON activity_segments(activity_id, start_ms, end_ms);

CREATE TABLE activity_segment_speakers (
  activity_id         VARCHAR(191) NOT NULL,
  segment_id          VARCHAR(191) NOT NULL,
  speaker_id          VARCHAR(191) NOT NULL,
  PRIMARY KEY (activity_id, segment_id, speaker_id),
  CONSTRAINT fk_segment_speaker_segment
    FOREIGN KEY (activity_id, segment_id)
    REFERENCES activity_segments(activity_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_segment_speaker_speaker
    FOREIGN KEY (activity_id, speaker_id)
    REFERENCES activity_speakers(activity_id, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_segment_languages (
  activity_id         VARCHAR(191) NOT NULL,
  segment_id          VARCHAR(191) NOT NULL,
  language_id         VARCHAR(64) NOT NULL,
  PRIMARY KEY (activity_id, segment_id, language_id),
  CONSTRAINT fk_segment_language_segment
    FOREIGN KEY (activity_id, segment_id)
    REFERENCES activity_segments(activity_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_segment_language_language
    FOREIGN KEY (activity_id, language_id)
    REFERENCES activity_languages(activity_id, language_id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_language_intervals (
  activity_id         VARCHAR(191) NOT NULL,
  id                  VARCHAR(191) NOT NULL,
  segment_id          VARCHAR(191) NOT NULL,
  language_id         VARCHAR(64) NOT NULL,
  start_ms            BIGINT UNSIGNED NOT NULL,
  end_ms              BIGINT UNSIGNED NOT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_language_interval_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_language_interval_segment
    FOREIGN KEY (activity_id, segment_id)
    REFERENCES activity_segments(activity_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_language_interval_language
    FOREIGN KEY (activity_id, language_id)
    REFERENCES activity_languages(activity_id, language_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_language_interval_time CHECK (end_ms > start_ms)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_language_intervals_timeline
  ON activity_language_intervals(activity_id, start_ms, end_ms);

CREATE TABLE activity_layers (
  activity_id         VARCHAR(191) NOT NULL,
  id                  VARCHAR(191) NOT NULL,
  label               VARCHAR(255) NOT NULL,
  description         TEXT NULL,
  color               VARCHAR(32) NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_activity_layer_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_layer_visibility (
  activity_id         VARCHAR(191) NOT NULL,
  layer_id            VARCHAR(191) NOT NULL,
  audience            VARCHAR(32) NOT NULL,
  is_visible          TINYINT(1) NOT NULL DEFAULT 1,
  is_default          TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, layer_id, audience),
  CONSTRAINT fk_layer_visibility_layer
    FOREIGN KEY (activity_id, layer_id)
    REFERENCES activity_layers(activity_id, id)
    ON DELETE CASCADE,
  CONSTRAINT chk_layer_visibility_audience
    CHECK (audience IN ('learner', 'teacher'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_phenomena (
  activity_id         VARCHAR(191) NOT NULL,
  id                  VARCHAR(191) NOT NULL,
  segment_id          VARCHAR(191) NOT NULL,
  layer_id            VARCHAR(191) NOT NULL,
  start_ms            BIGINT UNSIGNED NOT NULL,
  end_ms              BIGINT UNSIGNED NOT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_phenomenon_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_phenomenon_segment
    FOREIGN KEY (activity_id, segment_id)
    REFERENCES activity_segments(activity_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_phenomenon_layer
    FOREIGN KEY (activity_id, layer_id)
    REFERENCES activity_layers(activity_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_phenomenon_time CHECK (end_ms > start_ms)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_activity_phenomena_timeline
  ON activity_phenomena(activity_id, start_ms, end_ms);

CREATE TABLE activity_annotations (
  activity_id           VARCHAR(191) NOT NULL,
  id                    VARCHAR(191) NOT NULL,
  segment_id            VARCHAR(191) NOT NULL,
  note                  LONGTEXT NULL,
  pedagogical_question  LONGTEXT NULL,
  sort_order            INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_annotation_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_annotation_segment
    FOREIGN KEY (activity_id, segment_id)
    REFERENCES activity_segments(activity_id, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_overlays (
  activity_id         VARCHAR(191) NOT NULL,
  id                  VARCHAR(191) NOT NULL,
  annotation_id       VARCHAR(191) NULL,
  start_ms            BIGINT UNSIGNED NOT NULL,
  end_ms              BIGINT UNSIGNED NOT NULL,
  title               VARCHAR(500) NULL,
  text                LONGTEXT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (activity_id, id),
  CONSTRAINT fk_overlay_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_overlay_annotation
    FOREIGN KEY (activity_id, annotation_id)
    REFERENCES activity_annotations(activity_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_overlay_time CHECK (end_ms > start_ms)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_activity_overlays_timeline
  ON activity_overlays(activity_id, start_ms, end_ms);

CREATE TABLE activity_overlay_layers (
  activity_id         VARCHAR(191) NOT NULL,
  overlay_id          VARCHAR(191) NOT NULL,
  layer_id            VARCHAR(191) NOT NULL,
  PRIMARY KEY (activity_id, overlay_id, layer_id),
  CONSTRAINT fk_overlay_layer_overlay
    FOREIGN KEY (activity_id, overlay_id)
    REFERENCES activity_overlays(activity_id, id)
    ON DELETE CASCADE,
  CONSTRAINT fk_overlay_layer_layer
    FOREIGN KEY (activity_id, layer_id)
    REFERENCES activity_layers(activity_id, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Media identity, origins, representations and treatments
-- ---------------------------------------------------------------------------

CREATE TABLE media_assets (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  folder_id             VARCHAR(191) NULL,
  parent_asset_id       VARCHAR(191) NULL,
  family_root_asset_id  VARCHAR(191) NULL,
  lineage_root_key      VARCHAR(191)
                          AS (COALESCE(family_root_asset_id, id)) PERSISTENT,
  default_playable_id   VARCHAR(191) NULL,
  title                 VARCHAR(500) NOT NULL,
  lifecycle             VARCHAR(32) NOT NULL DEFAULT 'active',
  derivation_type       VARCHAR(64) NULL,
  provenance_json       JSON NULL,
  rights_json           JSON NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at            DATETIME(3) NULL,
  CONSTRAINT chk_media_asset_lifecycle
    CHECK (lifecycle IN ('reserved', 'active', 'archived', 'deleted')),
  CONSTRAINT chk_media_asset_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_media_asset_not_own_parent
    CHECK (parent_asset_id IS NULL OR parent_asset_id <> id),
  CONSTRAINT chk_media_asset_lineage_shape
    CHECK (
      (parent_asset_id IS NULL AND family_root_asset_id IS NULL)
      OR (
        parent_asset_id IS NOT NULL
        AND family_root_asset_id IS NOT NULL
        AND family_root_asset_id <> id
      )
    ),
  CONSTRAINT chk_media_asset_provenance_json
    CHECK (provenance_json IS NULL OR JSON_VALID(provenance_json)),
  CONSTRAINT chk_media_asset_rights_json
    CHECK (rights_json IS NULL OR JSON_VALID(rights_json)),
  CONSTRAINT fk_media_asset_folder
    FOREIGN KEY (folder_id) REFERENCES media_folders(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_media_asset_lineage_member
    UNIQUE (lineage_root_key, id),
  CONSTRAINT fk_media_asset_family_root
    FOREIGN KEY (family_root_asset_id) REFERENCES media_assets(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_media_asset_parent_lineage
    FOREIGN KEY (family_root_asset_id, parent_asset_id)
    REFERENCES media_assets(lineage_root_key, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_assets_library
  ON media_assets(deleted_at, lifecycle, folder_id, title);

CREATE INDEX idx_media_assets_family
  ON media_assets(family_root_asset_id, parent_asset_id);

CREATE INDEX idx_media_assets_default_playable
  ON media_assets(id, default_playable_id);

CREATE TABLE media_sources (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  asset_id              VARCHAR(191) NOT NULL,
  kind                  VARCHAR(64) NOT NULL,
  provider              VARCHAR(64) NULL,
  transport             VARCHAR(64) NULL,
  role                  VARCHAR(64) NULL,
  mime_type             VARCHAR(191) NULL,
  origin_url            TEXT NULL,
  origin_json           JSON NULL,
  provenance_json       JSON NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_media_source_kind
    CHECK (kind IN ('local-file', 'direct-url', 'hls', 'youtube-embed', 'derived-output')),
  CONSTRAINT chk_media_source_origin_json
    CHECK (origin_json IS NULL OR JSON_VALID(origin_json)),
  CONSTRAINT chk_media_source_provenance_json
    CHECK (provenance_json IS NULL OR JSON_VALID(provenance_json)),
  CONSTRAINT uq_media_source_asset_id UNIQUE (asset_id, id),
  CONSTRAINT fk_media_source_asset
    FOREIGN KEY (asset_id) REFERENCES media_assets(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_sources_asset_kind
  ON media_sources(asset_id, kind, provider);

CREATE TABLE media_playables (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  asset_id              VARCHAR(191) NOT NULL,
  source_id             VARCHAR(191) NOT NULL,
  kind                  VARCHAR(64) NOT NULL,
  provider              VARCHAR(64) NULL,
  role                  VARCHAR(64) NULL,
  availability          VARCHAR(32) NOT NULL DEFAULT 'unknown',
  availability_reason   VARCHAR(191) NULL,
  storage_scope         VARCHAR(64) NULL,
  storage_key           VARCHAR(768) NULL,
  storage_key_digest    CHAR(64)
                          AS (
                            CASE
                              WHEN storage_scope IS NULL OR storage_key IS NULL
                              THEN NULL
                              ELSE SHA2(CONCAT(storage_scope, ':', storage_key), 256)
                            END
                          ) PERSISTENT,
  location_url          TEXT NULL,
  embed_video_id        VARCHAR(191) NULL,
  provenance_json       JSON NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  removed_at            DATETIME(3) NULL,
  CONSTRAINT uq_media_playable_asset_id UNIQUE (asset_id, id),
  CONSTRAINT uq_media_playable_storage_digest UNIQUE (storage_key_digest),
  CONSTRAINT chk_media_playable_kind
    CHECK (kind IN ('local-file', 'direct-url', 'hls', 'youtube-embed')),
  CONSTRAINT chk_media_playable_availability
    CHECK (availability IN (
      'available', 'missing-local', 'unreachable-remote',
      'blocked', 'pending', 'pending-removal', 'unknown'
    )),
  CONSTRAINT chk_media_playable_location
    CHECK (
      (
        kind = 'local-file'
        AND storage_scope IS NOT NULL
        AND CHAR_LENGTH(TRIM(storage_scope)) > 0
        AND storage_key IS NOT NULL
        AND CHAR_LENGTH(TRIM(storage_key)) > 0
        AND location_url IS NULL
        AND embed_video_id IS NULL
      )
      OR
      (
        kind <> 'local-file'
        AND storage_scope IS NULL
        AND storage_key IS NULL
        AND (
          (location_url IS NOT NULL AND CHAR_LENGTH(TRIM(location_url)) > 0)
          OR (embed_video_id IS NOT NULL AND CHAR_LENGTH(TRIM(embed_video_id)) > 0)
        )
      )
    ),
  CONSTRAINT chk_media_playable_provenance_json
    CHECK (provenance_json IS NULL OR JSON_VALID(provenance_json)),
  CONSTRAINT fk_media_playable_asset
    FOREIGN KEY (asset_id) REFERENCES media_assets(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_media_playable_source_asset
    FOREIGN KEY (asset_id, source_id)
    REFERENCES media_sources(asset_id, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_playables_asset_availability
  ON media_playables(asset_id, availability, role);

CREATE INDEX idx_media_playables_source
  ON media_playables(asset_id, source_id);

-- Composite FK proves that the default playable belongs to the asset.
ALTER TABLE media_assets
  ADD CONSTRAINT fk_media_asset_default_playable
  FOREIGN KEY (id, default_playable_id)
  REFERENCES media_playables(asset_id, id)
  ON DELETE RESTRICT;

CREATE TABLE media_playable_metadata (
  playable_id           VARCHAR(191) NOT NULL PRIMARY KEY,
  analysis_status       VARCHAR(64) NOT NULL DEFAULT 'unknown',
  mime_type             VARCHAR(191) NULL,
  duration_ms           BIGINT UNSIGNED NULL,
  size_bytes            BIGINT UNSIGNED NULL,
  sha256                CHAR(64) NULL,
  width                 INT UNSIGNED NULL,
  height                INT UNSIGNED NULL,
  frame_rate            DECIMAL(10,4) NULL,
  video_codec           VARCHAR(64) NULL,
  audio_codec           VARCHAR(64) NULL,
  has_audio             TINYINT(1) NULL,
  analyzer              VARCHAR(128) NULL,
  analyzer_version      VARCHAR(64) NULL,
  analyzed_at           DATETIME(3) NULL,
  error_text            TEXT NULL,
  CONSTRAINT fk_playable_metadata_playable
    FOREIGN KEY (playable_id) REFERENCES media_playables(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_playable_metadata_sha256
    CHECK (sha256 IS NULL OR sha256 REGEXP '^[0-9a-f]{64}$')
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_playable_metadata_sha256
  ON media_playable_metadata(sha256);

CREATE TABLE media_asset_tags (
  asset_id              VARCHAR(191) NOT NULL,
  tag_id                VARCHAR(191) NOT NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (asset_id, tag_id),
  CONSTRAINT fk_asset_tag_asset
    FOREIGN KEY (asset_id) REFERENCES media_assets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_asset_tag_tag
    FOREIGN KEY (tag_id) REFERENCES media_tags(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_asset_tags_tag
  ON media_asset_tags(tag_id, asset_id);

CREATE TABLE media_treatments (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  source_asset_id       VARCHAR(191) NOT NULL,
  source_playable_id    VARCHAR(191) NOT NULL,
  output_asset_id       VARCHAR(191) NULL,
  output_playable_id    VARCHAR(191) NULL,
  published_playable_id VARCHAR(191) NULL,
  type                  VARCHAR(64) NOT NULL,
  label                 VARCHAR(500) NULL,
  status                VARCHAR(32) NOT NULL,
  progress              DECIMAL(5,2) NOT NULL DEFAULT 0,
  retained              TINYINT(1) NOT NULL DEFAULT 1,
  source_preparation_id VARCHAR(191) NULL,
  runtime_job_id        VARCHAR(191) NULL,
  engine                VARCHAR(128) NULL,
  engine_version        VARCHAR(64) NULL,
  ffmpeg_version        VARCHAR(191) NULL,
  parameters_json       JSON NULL,
  diagnostics_json      JSON NULL,
  error_json            JSON NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at            DATETIME(3) NULL,
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  finished_at           DATETIME(3) NULL,
  CONSTRAINT chk_media_treatment_status
    CHECK (status IN (
      'queued', 'running', 'cancelling', 'completed',
      'failed', 'cancelled', 'interrupted'
    )),
  CONSTRAINT chk_media_treatment_progress
    CHECK (
      progress >= 0
      AND progress <= 100
      AND (status <> 'queued' OR progress = 0)
      AND (status <> 'completed' OR progress = 100)
      AND (status NOT IN ('running', 'cancelling') OR progress < 100)
    ),
  CONSTRAINT chk_media_treatment_completed_output
    CHECK (
      status <> 'completed'
      OR (
        output_asset_id IS NOT NULL
        AND output_playable_id IS NOT NULL
        AND published_playable_id IS NOT NULL
        AND finished_at IS NOT NULL
      )
    ),
  CONSTRAINT chk_media_treatment_started
    CHECK (
      status = 'queued'
      OR started_at IS NOT NULL
    ),
  CONSTRAINT chk_media_treatment_parameters_json
    CHECK (parameters_json IS NULL OR JSON_VALID(parameters_json)),
  CONSTRAINT chk_media_treatment_diagnostics_json
    CHECK (diagnostics_json IS NULL OR JSON_VALID(diagnostics_json)),
  CONSTRAINT chk_media_treatment_error_json
    CHECK (error_json IS NULL OR JSON_VALID(error_json)),
  CONSTRAINT fk_treatment_source_playable
    FOREIGN KEY (source_asset_id, source_playable_id)
    REFERENCES media_playables(asset_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_treatment_output_playable
    FOREIGN KEY (output_asset_id, output_playable_id)
    REFERENCES media_playables(asset_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_treatment_published_playable
    FOREIGN KEY (output_asset_id, published_playable_id)
    REFERENCES media_playables(asset_id, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_treatments_source
  ON media_treatments(source_asset_id, status, created_at);

CREATE INDEX idx_media_treatments_output
  ON media_treatments(output_asset_id, output_playable_id);

CREATE INDEX idx_media_treatments_active_output
  ON media_treatments(output_asset_id, status);

CREATE TABLE activity_media_links (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  activity_id           VARCHAR(191) NOT NULL,
  role                  VARCHAR(32) NOT NULL DEFAULT 'primary',
  media_asset_id        VARCHAR(191) NOT NULL,
  media_playable_id     VARCHAR(191) NOT NULL,
  sort_order            INT UNSIGNED NOT NULL DEFAULT 0,
  primary_activity_id   VARCHAR(191)
                          AS (
                            CASE WHEN role = 'primary' THEN activity_id ELSE NULL END
                          ) PERSISTENT,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_activity_media_primary UNIQUE (primary_activity_id),
  CONSTRAINT uq_activity_media_asset UNIQUE (activity_id, media_asset_id),
  CONSTRAINT uq_activity_media_order UNIQUE (activity_id, role, sort_order),
  CONSTRAINT chk_activity_media_role
    CHECK (role IN ('primary', 'supplementary')),
  CONSTRAINT chk_activity_media_order
    CHECK (
      (role = 'primary' AND sort_order = 0)
      OR (role = 'supplementary')
    ),
  CONSTRAINT fk_activity_media_activity
    FOREIGN KEY (activity_id) REFERENCES activities(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_activity_media_playable
    FOREIGN KEY (media_asset_id, media_playable_id)
    REFERENCES media_playables(asset_id, id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_activity_media_asset
  ON activity_media_links(media_asset_id, media_playable_id);

CREATE INDEX idx_activity_media_activity
  ON activity_media_links(activity_id, role, sort_order);

-- Two-phase filesystem outbox. MariaDB never deletes a binary itself.
CREATE TABLE storage_operations (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  playable_id           VARCHAR(191) NOT NULL,
  operation_type        VARCHAR(32) NOT NULL,
  status                VARCHAR(32) NOT NULL DEFAULT 'requested',
  open_playable_id      VARCHAR(191)
                          AS (
                            CASE WHEN status = 'requested' THEN playable_id ELSE NULL END
                          ) PERSISTENT,
  storage_scope         VARCHAR(64) NOT NULL,
  storage_key           VARCHAR(768) NOT NULL,
  expected_sha256       CHAR(64) NULL,
  previous_availability VARCHAR(32) NOT NULL,
  previous_reason       VARCHAR(191) NULL,
  requested_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at          DATETIME(3) NULL,
  error_text            TEXT NULL,
  CONSTRAINT uq_storage_operation_open
    UNIQUE (open_playable_id, operation_type),
  CONSTRAINT chk_storage_operation_type
    CHECK (operation_type IN ('delete-file')),
  CONSTRAINT chk_storage_operation_status
    CHECK (status IN ('requested', 'completed', 'failed', 'cancelled')),
  CONSTRAINT chk_storage_previous_availability
    CHECK (previous_availability IN (
      'available', 'missing-local', 'unreachable-remote',
      'blocked', 'pending', 'unknown'
    )),
  CONSTRAINT fk_storage_operation_playable
    FOREIGN KEY (playable_id) REFERENCES media_playables(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_storage_operations_queue
  ON storage_operations(status, requested_at);

-- ---------------------------------------------------------------------------
-- Stored procedure contract -- mutations
-- ---------------------------------------------------------------------------

-- Security doctrine:
--   * routines use SQL SECURITY DEFINER so an application account can later
--     receive EXECUTE without direct table-write privileges;
--   * no explicit DEFINER account is embedded: the account used by the DBA to
--     install this script becomes the definer, avoiding a host-specific name;
--   * production grants/revokes remain a separate DBA operation.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_activity_folder_create$$
CREATE PROCEDURE sp_activity_folder_create(
  IN p_folder_id VARCHAR(191),
  IN p_name VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  IF COALESCE(TRIM(p_folder_id), '') = ''
     OR COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30001,
          MESSAGE_TEXT = 'sp_activity_folder_create: id and name are required';
  END IF;

  INSERT INTO activity_folders (id, name, normalized_name)
  VALUES (p_folder_id, TRIM(p_name), LOWER(TRIM(p_name)));

  SELECT id, name, sort_order, created_at, updated_at
  FROM activity_folders
  WHERE id = p_folder_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_duplicate$$
CREATE PROCEDURE sp_activity_duplicate(
  IN p_source_activity_id VARCHAR(191),
  IN p_expected_source_revision BIGINT UNSIGNED,
  IN p_new_activity_id VARCHAR(191),
  IN p_new_title VARCHAR(500),
  IN p_keep_folder TINYINT(1)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT 1 INTO v_exists
  FROM activities
  WHERE id = p_source_activity_id
    AND deleted_at IS NULL
    AND revision = p_expected_source_revision
  LIMIT 1
  FOR UPDATE;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30206,
          MESSAGE_TEXT = 'sp_activity_duplicate: source not found or revision conflict';
  END IF;

  IF EXISTS (SELECT 1 FROM activities WHERE id = p_new_activity_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30207,
          MESSAGE_TEXT = 'sp_activity_duplicate: target id already exists';
  END IF;

  INSERT INTO activities (
    id, folder_id, version, status, title, description, instruction,
    pedagogical_question, revision, allow_learner_toggle
  )
  SELECT
    p_new_activity_id,
    CASE WHEN p_keep_folder = 1 THEN folder_id ELSE NULL END,
    version, 'draft', TRIM(p_new_title), description, instruction,
    pedagogical_question, 1, allow_learner_toggle
  FROM activities
  WHERE id = p_source_activity_id;

  INSERT INTO activity_pedagogical_identities (
    activity_id, schema_version, design_status,
    resource_nature_state, resource_nature_value, resource_nature_note,
    duration_state, duration_minutes, duration_note,
    intention_state, intention_value, intention_note,
    audience_state, audience_value, audience_note,
    use_context_state, use_context_value, use_context_note,
    lineage_state, lineage_relation, parent_activity_id,
    root_activity_id, lineage_note, extended_fields_json
  )
  SELECT
    p_new_activity_id, schema_version, 'to-review',
    resource_nature_state, resource_nature_value, resource_nature_note,
    duration_state, duration_minutes, duration_note,
    intention_state, intention_value, intention_note,
    audience_state, audience_value, audience_note,
    use_context_state, use_context_value, use_context_note,
    CASE
      WHEN lineage_state = 'known' THEN 'known'
      ELSE 'to-verify'
    END,
    'variant',
    p_source_activity_id,
    CASE
      WHEN lineage_state = 'known' AND lineage_relation = 'root'
      THEN p_source_activity_id
      WHEN lineage_state = 'known' AND lineage_relation = 'variant'
      THEN root_activity_id
      ELSE NULL
    END,
    CASE
      WHEN lineage_state = 'known' THEN NULL
      ELSE 'Parent direct établi par duplication ; racine antérieure à vérifier.'
    END,
    extended_fields_json
  FROM activity_pedagogical_identities
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_pedagogical_text_fields (
    activity_id, field_key, knowledge_state, value_text, note
  )
  SELECT p_new_activity_id, field_key, knowledge_state, value_text, note
  FROM activity_pedagogical_text_fields
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_languages
    (activity_id, language_id, local_label, sort_order)
  SELECT p_new_activity_id, language_id, local_label, sort_order
  FROM activity_languages
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_transcriptions (
    activity_id, id, language_id, label
  )
  SELECT p_new_activity_id, id, language_id, label
  FROM activity_transcriptions
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_speakers
    (activity_id, id, label, sort_order)
  SELECT p_new_activity_id, id, label, sort_order
  FROM activity_speakers
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_segments
    (activity_id, id, start_ms, end_ms, text, sort_order)
  SELECT p_new_activity_id, id, start_ms, end_ms, text, sort_order
  FROM activity_segments
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_segment_speakers
    (activity_id, segment_id, speaker_id)
  SELECT p_new_activity_id, segment_id, speaker_id
  FROM activity_segment_speakers
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_segment_languages
    (activity_id, segment_id, language_id)
  SELECT p_new_activity_id, segment_id, language_id
  FROM activity_segment_languages
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_language_intervals
    (activity_id, id, segment_id, language_id, start_ms, end_ms, sort_order)
  SELECT p_new_activity_id, id, segment_id, language_id,
         start_ms, end_ms, sort_order
  FROM activity_language_intervals
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_layers
    (activity_id, id, label, description, color, sort_order)
  SELECT p_new_activity_id, id, label, description, color, sort_order
  FROM activity_layers
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_layer_visibility
    (activity_id, layer_id, audience, is_visible, is_default)
  SELECT p_new_activity_id, layer_id, audience, is_visible, is_default
  FROM activity_layer_visibility
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_phenomena
    (activity_id, id, segment_id, layer_id, start_ms, end_ms, sort_order)
  SELECT p_new_activity_id, id, segment_id, layer_id,
         start_ms, end_ms, sort_order
  FROM activity_phenomena
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_annotations
    (activity_id, id, segment_id, note, pedagogical_question, sort_order)
  SELECT p_new_activity_id, id, segment_id,
         note, pedagogical_question, sort_order
  FROM activity_annotations
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_overlays
    (activity_id, id, annotation_id, start_ms, end_ms, title, text, sort_order)
  SELECT p_new_activity_id, id, annotation_id,
         start_ms, end_ms, title, text, sort_order
  FROM activity_overlays
  WHERE activity_id = p_source_activity_id;

  INSERT INTO activity_overlay_layers
    (activity_id, overlay_id, layer_id)
  SELECT p_new_activity_id, overlay_id, layer_id
  FROM activity_overlay_layers
  WHERE activity_id = p_source_activity_id;

  -- Every newly created activity-media link follows the same attachability
  -- rule as the dedicated primary and supplementary procedures.
  IF EXISTS (
    SELECT 1
    FROM activity_media_links l
    INNER JOIN media_assets a ON a.id = l.media_asset_id
    INNER JOIN media_playables p
      ON p.id = l.media_playable_id AND p.asset_id = l.media_asset_id
    WHERE l.activity_id = p_source_activity_id
      AND (
        a.lifecycle <> 'active'
        OR a.deleted_at IS NOT NULL
        OR p.availability <> 'available'
        OR p.removed_at IS NOT NULL
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30236,
          MESSAGE_TEXT = 'sp_activity_duplicate: source media is not attachable';
  END IF;

  INSERT INTO activity_media_links
    (id, activity_id, role, media_asset_id, media_playable_id, sort_order)
  SELECT UUID(), p_new_activity_id, role,
         media_asset_id, media_playable_id, sort_order
  FROM activity_media_links
  WHERE activity_id = p_source_activity_id;

  COMMIT;

  SELECT id, folder_id, version, status, title, revision,
         created_at, updated_at
  FROM activities
  WHERE id = p_new_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_delete$$
CREATE PROCEDURE sp_activity_delete(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_deleted_at DATETIME(3);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT revision, deleted_at
    INTO v_current_revision, v_deleted_at
  FROM activities
  WHERE id = p_activity_id
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30208,
          MESSAGE_TEXT = 'sp_activity_delete: activity not found';
  END IF;

  IF v_deleted_at IS NULL AND v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30232,
          MESSAGE_TEXT = 'sp_activity_delete: revision conflict';
  END IF;

  IF v_deleted_at IS NULL AND EXISTS (
    SELECT 1
    FROM activity_pedagogical_identities pi
    INNER JOIN activities child ON child.id = pi.activity_id
    WHERE pi.parent_activity_id = p_activity_id
      AND child.deleted_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30217,
          MESSAGE_TEXT = 'sp_activity_delete: active pedagogical variants remain';
  END IF;

  IF v_deleted_at IS NULL THEN
    UPDATE activities
    SET status = 'deleted',
        deleted_at = CURRENT_TIMESTAMP(3),
        revision = revision + 1
    WHERE id = p_activity_id;
    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT id, status, revision, deleted_at, v_changed AS changed
  FROM activities
  WHERE id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_set_primary_media$$
CREATE PROCEDURE sp_activity_set_primary_media(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_media_asset_id VARCHAR(191),
  IN p_media_playable_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_link_id VARCHAR(191);
  DECLARE v_current_asset_id VARCHAR(191);
  DECLARE v_current_playable_id VARCHAR(191);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT revision INTO v_current_revision
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30209,
          MESSAGE_TEXT = 'sp_activity_set_primary_media: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30223,
          MESSAGE_TEXT = 'sp_activity_set_primary_media: revision conflict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM media_playables p
    INNER JOIN media_assets a ON a.id = p.asset_id
    WHERE p.id = p_media_playable_id
      AND p.asset_id = p_media_asset_id
      AND p.removed_at IS NULL
      AND p.availability = 'available'
      AND a.lifecycle = 'active'
      AND a.deleted_at IS NULL
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30210,
          MESSAGE_TEXT = 'sp_activity_set_primary_media: active playable not available';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM activity_media_links
    WHERE activity_id = p_activity_id
      AND role = 'supplementary'
      AND media_asset_id = p_media_asset_id
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30224,
          MESSAGE_TEXT = 'sp_activity_set_primary_media: asset already supplementary';
  END IF;

  SELECT id, media_asset_id, media_playable_id
    INTO v_link_id, v_current_asset_id, v_current_playable_id
  FROM activity_media_links
  WHERE activity_id = p_activity_id AND role = 'primary'
  FOR UPDATE;

  IF v_link_id IS NULL THEN
    INSERT INTO activity_media_links (
      id, activity_id, role, media_asset_id, media_playable_id, sort_order
    )
    VALUES (
      UUID(), p_activity_id, 'primary',
      p_media_asset_id, p_media_playable_id, 0
    );
    SET v_changed = 1;
  ELSEIF NOT (
    v_current_asset_id <=> p_media_asset_id
    AND v_current_playable_id <=> p_media_playable_id
  ) THEN
    UPDATE activity_media_links
    SET media_asset_id = p_media_asset_id,
        media_playable_id = p_media_playable_id
    WHERE id = v_link_id;
    SET v_changed = 1;
  END IF;

  IF v_changed = 1 THEN
    UPDATE activities
    SET revision = revision + 1
    WHERE id = p_activity_id;
  END IF;

  COMMIT;

  SELECT l.id AS link_id, l.activity_id, l.role,
         l.media_asset_id, l.media_playable_id, l.sort_order,
         a.revision, v_changed AS changed, l.updated_at
  FROM activity_media_links l
  INNER JOIN activities a ON a.id = l.activity_id
  WHERE l.activity_id = p_activity_id AND l.role = 'primary';
END$$

DROP PROCEDURE IF EXISTS sp_activity_set_supplementary_media$$
CREATE PROCEDURE sp_activity_set_supplementary_media(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_media_asset_id VARCHAR(191),
  IN p_media_playable_id VARCHAR(191),
  IN p_sort_order INT UNSIGNED
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_link_id VARCHAR(191);
  DECLARE v_current_playable_id VARCHAR(191);
  DECLARE v_current_sort_order INT UNSIGNED;
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT revision INTO v_current_revision
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30225,
          MESSAGE_TEXT = 'sp_activity_set_supplementary_media: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30226,
          MESSAGE_TEXT = 'sp_activity_set_supplementary_media: revision conflict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM media_playables p
    INNER JOIN media_assets a ON a.id = p.asset_id
    WHERE p.id = p_media_playable_id
      AND p.asset_id = p_media_asset_id
      AND p.removed_at IS NULL
      AND p.availability = 'available'
      AND a.lifecycle = 'active'
      AND a.deleted_at IS NULL
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30227,
          MESSAGE_TEXT = 'sp_activity_set_supplementary_media: playable not available';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM activity_media_links
    WHERE activity_id = p_activity_id
      AND role = 'primary'
      AND media_asset_id = p_media_asset_id
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30228,
          MESSAGE_TEXT = 'sp_activity_set_supplementary_media: asset already primary';
  END IF;

  SELECT id, media_playable_id, sort_order
    INTO v_link_id, v_current_playable_id, v_current_sort_order
  FROM activity_media_links
  WHERE activity_id = p_activity_id
    AND role = 'supplementary'
    AND media_asset_id = p_media_asset_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM activity_media_links
    WHERE activity_id = p_activity_id
      AND role = 'supplementary'
      AND sort_order = p_sort_order
      AND (v_link_id IS NULL OR id <> v_link_id)
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30229,
          MESSAGE_TEXT = 'sp_activity_set_supplementary_media: sort order already used';
  END IF;

  IF v_link_id IS NULL THEN
    INSERT INTO activity_media_links (
      id, activity_id, role, media_asset_id, media_playable_id, sort_order
    )
    VALUES (
      UUID(), p_activity_id, 'supplementary',
      p_media_asset_id, p_media_playable_id, p_sort_order
    );
    SET v_changed = 1;
  ELSEIF NOT (
    v_current_playable_id <=> p_media_playable_id
    AND v_current_sort_order <=> p_sort_order
  ) THEN
    UPDATE activity_media_links
    SET media_playable_id = p_media_playable_id,
        sort_order = p_sort_order
    WHERE id = v_link_id;
    SET v_changed = 1;
  END IF;

  IF v_changed = 1 THEN
    UPDATE activities SET revision = revision + 1
    WHERE id = p_activity_id;
  END IF;

  COMMIT;

  SELECT l.id AS link_id, l.activity_id, l.role,
         l.media_asset_id, l.media_playable_id, l.sort_order,
         a.revision, v_changed AS changed, l.updated_at
  FROM activity_media_links l
  INNER JOIN activities a ON a.id = l.activity_id
  WHERE l.activity_id = p_activity_id
    AND l.role = 'supplementary'
    AND l.media_asset_id = p_media_asset_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_remove_supplementary_media$$
CREATE PROCEDURE sp_activity_remove_supplementary_media(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_media_asset_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_link_id VARCHAR(191);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT revision INTO v_current_revision
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30230,
          MESSAGE_TEXT = 'sp_activity_remove_supplementary_media: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30231,
          MESSAGE_TEXT = 'sp_activity_remove_supplementary_media: revision conflict';
  END IF;

  SELECT id INTO v_link_id
  FROM activity_media_links
  WHERE activity_id = p_activity_id
    AND role = 'supplementary'
    AND media_asset_id = p_media_asset_id
  FOR UPDATE;

  IF v_link_id IS NOT NULL THEN
    DELETE FROM activity_media_links WHERE id = v_link_id;
    UPDATE activities SET revision = revision + 1
    WHERE id = p_activity_id;
    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT p_activity_id AS activity_id,
         p_media_asset_id AS media_asset_id,
         (SELECT revision FROM activities WHERE id = p_activity_id) AS revision,
         v_changed AS changed;
END$$

DROP PROCEDURE IF EXISTS sp_activity_replace_authoring$$
CREATE PROCEDURE sp_activity_replace_authoring(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_authoring_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_current_digest CHAR(64);
  DECLARE v_requested_digest CHAR(64);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_authoring_json IS NULL OR JSON_VALID(p_authoring_json) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30211,
          MESSAGE_TEXT = 'sp_activity_replace_authoring: invalid authoring JSON';
  END IF;

  START TRANSACTION;

  SELECT revision, authoring_digest
    INTO v_current_revision, v_current_digest
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30212,
          MESSAGE_TEXT = 'sp_activity_replace_authoring: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30222,
          MESSAGE_TEXT = 'sp_activity_replace_authoring: revision conflict';
  END IF;

  SET v_requested_digest = SHA2(CAST(p_authoring_json AS CHAR), 256);
  SET v_changed = NOT (v_current_digest <=> v_requested_digest);

  IF v_changed = 1 THEN
  DELETE FROM activity_overlay_layers WHERE activity_id = p_activity_id;
  DELETE FROM activity_overlays WHERE activity_id = p_activity_id;
  DELETE FROM activity_annotations WHERE activity_id = p_activity_id;
  DELETE FROM activity_phenomena WHERE activity_id = p_activity_id;
  DELETE FROM activity_layer_visibility WHERE activity_id = p_activity_id;
  DELETE FROM activity_layers WHERE activity_id = p_activity_id;
  DELETE FROM activity_language_intervals WHERE activity_id = p_activity_id;
  DELETE FROM activity_segment_languages WHERE activity_id = p_activity_id;
  DELETE FROM activity_segment_speakers WHERE activity_id = p_activity_id;
  DELETE FROM activity_segments WHERE activity_id = p_activity_id;
  DELETE FROM activity_speakers WHERE activity_id = p_activity_id;
  DELETE FROM activity_transcriptions WHERE activity_id = p_activity_id;
  DELETE FROM activity_languages WHERE activity_id = p_activity_id;

  INSERT INTO activity_languages (
    activity_id, language_id, local_label, sort_order
  )
  SELECT p_activity_id, j.language_id, j.local_label, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.languages[*]'
    COLUMNS (
      language_id VARCHAR(64) PATH '$.id',
      local_label VARCHAR(191) PATH '$.label' NULL ON EMPTY,
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_transcriptions (
    activity_id, id, language_id, label
  )
  SELECT
    p_activity_id,
    JSON_VALUE(p_authoring_json, '$.transcription.id'),
    JSON_VALUE(p_authoring_json, '$.transcription.languageId'),
    JSON_VALUE(p_authoring_json, '$.transcription.label')
  FROM DUAL
  WHERE JSON_VALUE(p_authoring_json, '$.transcription.id') IS NOT NULL;

  INSERT INTO activity_speakers (
    activity_id, id, label, sort_order
  )
  SELECT p_activity_id, j.id, j.label, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.speakers[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      label VARCHAR(255) PATH '$.label',
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_segments (
    activity_id, id, start_ms, end_ms, text, sort_order
  )
  SELECT p_activity_id, j.id, j.start_ms, j.end_ms, j.text, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.segments[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      start_ms BIGINT UNSIGNED PATH '$.startMs',
      end_ms BIGINT UNSIGNED PATH '$.endMs',
      text LONGTEXT PATH '$.text' NULL ON EMPTY,
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_segment_speakers (
    activity_id, segment_id, speaker_id
  )
  SELECT p_activity_id, j.segment_id, j.speaker_id
  FROM JSON_TABLE(
    p_authoring_json, '$.segmentSpeakers[*]'
    COLUMNS (
      segment_id VARCHAR(191) PATH '$.segmentId',
      speaker_id VARCHAR(191) PATH '$.speakerId'
    )
  ) AS j;

  INSERT INTO activity_segment_languages (
    activity_id, segment_id, language_id
  )
  SELECT p_activity_id, j.segment_id, j.language_id
  FROM JSON_TABLE(
    p_authoring_json, '$.segmentLanguages[*]'
    COLUMNS (
      segment_id VARCHAR(191) PATH '$.segmentId',
      language_id VARCHAR(64) PATH '$.languageId'
    )
  ) AS j;

  INSERT INTO activity_language_intervals (
    activity_id, id, segment_id, language_id,
    start_ms, end_ms, sort_order
  )
  SELECT p_activity_id, j.id, j.segment_id, j.language_id,
         j.start_ms, j.end_ms, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.languageIntervals[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      segment_id VARCHAR(191) PATH '$.segmentId',
      language_id VARCHAR(64) PATH '$.languageId',
      start_ms BIGINT UNSIGNED PATH '$.startMs',
      end_ms BIGINT UNSIGNED PATH '$.endMs',
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_layers (
    activity_id, id, label, description, color, sort_order
  )
  SELECT p_activity_id, j.id, j.label, j.description, j.color, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.layers[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      label VARCHAR(255) PATH '$.label',
      description TEXT PATH '$.description' NULL ON EMPTY,
      color VARCHAR(32) PATH '$.color' NULL ON EMPTY,
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_layer_visibility (
    activity_id, layer_id, audience, is_visible, is_default
  )
  SELECT p_activity_id, j.layer_id, j.audience, j.is_visible, j.is_default
  FROM JSON_TABLE(
    p_authoring_json, '$.layerVisibility[*]'
    COLUMNS (
      layer_id VARCHAR(191) PATH '$.layerId',
      audience VARCHAR(32) PATH '$.audience',
      is_visible TINYINT PATH '$.isVisible' DEFAULT '1' ON EMPTY,
      is_default TINYINT PATH '$.isDefault' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_phenomena (
    activity_id, id, segment_id, layer_id,
    start_ms, end_ms, sort_order
  )
  SELECT p_activity_id, j.id, j.segment_id, j.layer_id,
         j.start_ms, j.end_ms, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.phenomena[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      segment_id VARCHAR(191) PATH '$.segmentId',
      layer_id VARCHAR(191) PATH '$.layerId',
      start_ms BIGINT UNSIGNED PATH '$.startMs',
      end_ms BIGINT UNSIGNED PATH '$.endMs',
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_annotations (
    activity_id, id, segment_id, note,
    pedagogical_question, sort_order
  )
  SELECT p_activity_id, j.id, j.segment_id, j.note,
         j.pedagogical_question, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.annotations[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      segment_id VARCHAR(191) PATH '$.segmentId',
      note LONGTEXT PATH '$.note' NULL ON EMPTY,
      pedagogical_question LONGTEXT PATH '$.pedagogicalQuestion' NULL ON EMPTY,
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_overlays (
    activity_id, id, annotation_id, start_ms, end_ms,
    title, text, sort_order
  )
  SELECT p_activity_id, j.id, j.annotation_id, j.start_ms, j.end_ms,
         j.title, j.text, j.sort_order
  FROM JSON_TABLE(
    p_authoring_json, '$.overlays[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      annotation_id VARCHAR(191) PATH '$.annotationId' NULL ON EMPTY,
      start_ms BIGINT UNSIGNED PATH '$.startMs',
      end_ms BIGINT UNSIGNED PATH '$.endMs',
      title VARCHAR(500) PATH '$.title' NULL ON EMPTY,
      text LONGTEXT PATH '$.text' NULL ON EMPTY,
      sort_order INT PATH '$.sortOrder' DEFAULT '0' ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_overlay_layers (
    activity_id, overlay_id, layer_id
  )
  SELECT p_activity_id, j.overlay_id, j.layer_id
  FROM JSON_TABLE(
    p_authoring_json, '$.overlayLayers[*]'
    COLUMNS (
      overlay_id VARCHAR(191) PATH '$.overlayId',
      layer_id VARCHAR(191) PATH '$.layerId'
    )
  ) AS j;

  UPDATE activities
  SET allow_learner_toggle =
        COALESCE(JSON_VALUE(p_authoring_json, '$.allowLearnerToggle'),
                 allow_learner_toggle),
      authoring_digest = v_requested_digest,
      revision = revision + 1
  WHERE id = p_activity_id;
  END IF;

  COMMIT;

  SELECT id, revision, updated_at, v_changed AS changed
  FROM activities
  WHERE id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_folder_rename$$
CREATE PROCEDURE sp_activity_folder_rename(
  IN p_folder_id VARCHAR(191),
  IN p_name VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30002,
          MESSAGE_TEXT = 'sp_activity_folder_rename: name is required';
  END IF;

  UPDATE activity_folders
  SET name = TRIM(p_name),
      normalized_name = LOWER(TRIM(p_name))
  WHERE id = p_folder_id
    AND NOT (
      name <=> TRIM(p_name)
      AND normalized_name <=> LOWER(TRIM(p_name))
    );

  SET v_changed = IF(ROW_COUNT() > 0, 1, 0);

  IF v_changed = 0
     AND NOT EXISTS (
       SELECT 1 FROM activity_folders WHERE id = p_folder_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30003,
          MESSAGE_TEXT = 'sp_activity_folder_rename: folder not found';
  END IF;

  SELECT id, name, sort_order, created_at, updated_at,
         v_changed AS changed
  FROM activity_folders
  WHERE id = p_folder_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_folder_delete$$
CREATE PROCEDURE sp_activity_folder_delete(
  IN p_folder_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_unclassified_count INT DEFAULT 0;
  DECLARE v_exists INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT 1 INTO v_exists
  FROM activity_folders
  WHERE id = p_folder_id
  LIMIT 1
  FOR UPDATE;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30004,
          MESSAGE_TEXT = 'sp_activity_folder_delete: folder not found';
  END IF;

  SELECT COUNT(*) INTO v_unclassified_count
  FROM activities
  WHERE folder_id = p_folder_id
    AND deleted_at IS NULL;

  -- FK ON DELETE SET NULL performs the unclassification.
  DELETE FROM activity_folders WHERE id = p_folder_id;

  COMMIT;

  SELECT p_folder_id AS deleted_folder_id,
         v_unclassified_count AS unclassified_activity_count,
         0 AS deleted_activity_count;
END$$

DROP PROCEDURE IF EXISTS sp_activity_assign_folder$$
CREATE PROCEDURE sp_activity_assign_folder(
  IN p_activity_id VARCHAR(191),
  IN p_folder_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF p_folder_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM activity_folders WHERE id = p_folder_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30005,
          MESSAGE_TEXT = 'sp_activity_assign_folder: folder not found';
  END IF;

  UPDATE activities
  SET folder_id = p_folder_id
  WHERE id = p_activity_id
    AND deleted_at IS NULL
    AND NOT (folder_id <=> p_folder_id);

  SET v_changed = IF(ROW_COUNT() > 0, 1, 0);

  IF v_changed = 0
     AND NOT EXISTS (
       SELECT 1 FROM activities
       WHERE id = p_activity_id AND deleted_at IS NULL
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30006,
          MESSAGE_TEXT = 'sp_activity_assign_folder: activity not found';
  END IF;

  SELECT id AS activity_id, folder_id, updated_at,
         v_changed AS changed
  FROM activities
  WHERE id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_folder_create$$
CREATE PROCEDURE sp_media_folder_create(
  IN p_folder_id VARCHAR(191),
  IN p_parent_folder_id VARCHAR(191),
  IN p_name VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  IF COALESCE(TRIM(p_folder_id), '') = ''
     OR COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30101,
          MESSAGE_TEXT = 'sp_media_folder_create: id and name are required';
  END IF;

  IF p_parent_folder_id = p_folder_id THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30102,
          MESSAGE_TEXT = 'sp_media_folder_create: folder cannot parent itself';
  END IF;

  INSERT INTO media_folders (
    id, parent_folder_id, name, normalized_name
  )
  VALUES (
    p_folder_id, p_parent_folder_id, TRIM(p_name), LOWER(TRIM(p_name))
  );

  SELECT id, parent_folder_id, name, sort_order, created_at, updated_at
  FROM media_folders
  WHERE id = p_folder_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_folder_rename$$
CREATE PROCEDURE sp_media_folder_rename(
  IN p_folder_id VARCHAR(191),
  IN p_name VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30103,
          MESSAGE_TEXT = 'sp_media_folder_rename: name is required';
  END IF;

  UPDATE media_folders
  SET name = TRIM(p_name),
      normalized_name = LOWER(TRIM(p_name))
  WHERE id = p_folder_id
    AND NOT (
      name <=> TRIM(p_name)
      AND normalized_name <=> LOWER(TRIM(p_name))
    );

  SET v_changed = IF(ROW_COUNT() > 0, 1, 0);

  IF v_changed = 0
     AND NOT EXISTS (
       SELECT 1 FROM media_folders WHERE id = p_folder_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30104,
          MESSAGE_TEXT = 'sp_media_folder_rename: folder not found';
  END IF;

  SELECT id, parent_folder_id, name, sort_order, created_at, updated_at,
         v_changed AS changed
  FROM media_folders
  WHERE id = p_folder_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_folder_delete$$
CREATE PROCEDURE sp_media_folder_delete(
  IN p_folder_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_child_count INT DEFAULT 0;
  DECLARE v_unclassified_count INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF NOT EXISTS (
    SELECT 1 FROM media_folders WHERE id = p_folder_id FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30105,
          MESSAGE_TEXT = 'sp_media_folder_delete: folder not found';
  END IF;

  SELECT COUNT(*) INTO v_child_count
  FROM media_folders
  WHERE parent_folder_id = p_folder_id;

  IF v_child_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30106,
          MESSAGE_TEXT = 'sp_media_folder_delete: child folders must be moved first';
  END IF;

  SELECT COUNT(*) INTO v_unclassified_count
  FROM media_assets
  WHERE folder_id = p_folder_id
    AND deleted_at IS NULL;

  DELETE FROM media_folders WHERE id = p_folder_id;

  COMMIT;

  SELECT p_folder_id AS deleted_folder_id,
         v_unclassified_count AS unclassified_asset_count,
         0 AS deleted_asset_count;
END$$

DROP PROCEDURE IF EXISTS sp_media_asset_assign_folder$$
CREATE PROCEDURE sp_media_asset_assign_folder(
  IN p_asset_id VARCHAR(191),
  IN p_folder_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF p_folder_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM media_folders WHERE id = p_folder_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30107,
          MESSAGE_TEXT = 'sp_media_asset_assign_folder: folder not found';
  END IF;

  UPDATE media_assets
  SET folder_id = p_folder_id
  WHERE id = p_asset_id
    AND deleted_at IS NULL
    AND NOT (folder_id <=> p_folder_id);

  SET v_changed = IF(ROW_COUNT() > 0, 1, 0);

  IF v_changed = 0
     AND NOT EXISTS (
       SELECT 1 FROM media_assets
       WHERE id = p_asset_id AND deleted_at IS NULL
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30108,
          MESSAGE_TEXT = 'sp_media_asset_assign_folder: asset not found';
  END IF;

  SELECT id AS asset_id, folder_id, updated_at,
         v_changed AS changed
  FROM media_assets
  WHERE id = p_asset_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_tag_create$$
CREATE PROCEDURE sp_media_tag_create(
  IN p_tag_id VARCHAR(191),
  IN p_name VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  IF COALESCE(TRIM(p_tag_id), '') = ''
     OR COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30109,
          MESSAGE_TEXT = 'sp_media_tag_create: id and name are required';
  END IF;

  INSERT INTO media_tags (id, name, normalized_name)
  VALUES (p_tag_id, TRIM(p_name), LOWER(TRIM(p_name)));

  SELECT id, name, created_at, updated_at
  FROM media_tags
  WHERE id = p_tag_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_tag_rename$$
CREATE PROCEDURE sp_media_tag_rename(
  IN p_tag_id VARCHAR(191),
  IN p_name VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30114,
          MESSAGE_TEXT = 'sp_media_tag_rename: name is required';
  END IF;

  UPDATE media_tags
  SET name = TRIM(p_name),
      normalized_name = LOWER(TRIM(p_name))
  WHERE id = p_tag_id
    AND NOT (
      name <=> TRIM(p_name)
      AND normalized_name <=> LOWER(TRIM(p_name))
    );

  SET v_changed = IF(ROW_COUNT() > 0, 1, 0);

  IF v_changed = 0
     AND NOT EXISTS (
       SELECT 1 FROM media_tags WHERE id = p_tag_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30115,
          MESSAGE_TEXT = 'sp_media_tag_rename: tag not found';
  END IF;

  SELECT id, name, created_at, updated_at,
         v_changed AS changed
  FROM media_tags
  WHERE id = p_tag_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_tag_delete$$
CREATE PROCEDURE sp_media_tag_delete(
  IN p_tag_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_detached_asset_count INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF NOT EXISTS (
    SELECT 1 FROM media_tags WHERE id = p_tag_id FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30113,
          MESSAGE_TEXT = 'sp_media_tag_delete: tag not found';
  END IF;

  SELECT COUNT(*) INTO v_detached_asset_count
  FROM media_asset_tags
  WHERE tag_id = p_tag_id;

  DELETE FROM media_tags WHERE id = p_tag_id;

  COMMIT;

  SELECT p_tag_id AS deleted_tag_id,
         v_detached_asset_count AS detached_asset_count,
         0 AS deleted_asset_count;
END$$

DROP PROCEDURE IF EXISTS sp_media_asset_set_tags$$
CREATE PROCEDURE sp_media_asset_set_tags(
  IN p_asset_id VARCHAR(191),
  IN p_tag_ids_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_unknown_count INT DEFAULT 0;
  DECLARE v_difference_count INT DEFAULT 0;
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_tag_ids_json IS NULL OR JSON_VALID(p_tag_ids_json) = 0
     OR JSON_TYPE(p_tag_ids_json) <> 'ARRAY' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30110,
          MESSAGE_TEXT = 'sp_media_asset_set_tags: tag_ids must be a JSON array';
  END IF;

  START TRANSACTION;

  IF NOT EXISTS (
    SELECT 1
    FROM media_assets
    WHERE id = p_asset_id AND deleted_at IS NULL
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30111,
          MESSAGE_TEXT = 'sp_media_asset_set_tags: asset not found';
  END IF;

  SELECT COUNT(*) INTO v_unknown_count
  FROM JSON_TABLE(
    p_tag_ids_json,
    '$[*]' COLUMNS (tag_id VARCHAR(191) PATH '$')
  ) requested
  LEFT JOIN media_tags tag ON tag.id = requested.tag_id
  WHERE tag.id IS NULL;

  IF v_unknown_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30112,
          MESSAGE_TEXT = 'sp_media_asset_set_tags: unknown tag';
  END IF;

  SELECT
    (
      SELECT COUNT(*)
      FROM media_asset_tags existing
      WHERE existing.asset_id = p_asset_id
        AND NOT EXISTS (
          SELECT 1
          FROM JSON_TABLE(
            p_tag_ids_json,
            '$[*]' COLUMNS (tag_id VARCHAR(191) PATH '$')
          ) requested
          WHERE requested.tag_id = existing.tag_id
        )
    )
    +
    (
      SELECT COUNT(DISTINCT requested.tag_id)
      FROM JSON_TABLE(
        p_tag_ids_json,
        '$[*]' COLUMNS (tag_id VARCHAR(191) PATH '$')
      ) requested
      WHERE NOT EXISTS (
        SELECT 1
        FROM media_asset_tags existing
        WHERE existing.asset_id = p_asset_id
          AND existing.tag_id = requested.tag_id
      )
    )
  INTO v_difference_count;

  IF v_difference_count > 0 THEN
    DELETE FROM media_asset_tags WHERE asset_id = p_asset_id;

    INSERT INTO media_asset_tags (asset_id, tag_id)
    SELECT DISTINCT p_asset_id, requested.tag_id
    FROM JSON_TABLE(
      p_tag_ids_json,
      '$[*]' COLUMNS (tag_id VARCHAR(191) PATH '$')
    ) requested;

    UPDATE media_assets SET updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = p_asset_id;

    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT p_asset_id AS asset_id, v_changed AS changed;

  SELECT tag.id AS tag_id, tag.name AS tag_name
  FROM media_asset_tags link
  JOIN media_tags tag ON tag.id = link.tag_id
  WHERE link.asset_id = p_asset_id
  ORDER BY tag.name;
END$$

DROP PROCEDURE IF EXISTS sp_activity_create$$
CREATE PROCEDURE sp_activity_create(
  IN p_activity_id VARCHAR(191),
  IN p_version VARCHAR(32),
  IN p_title VARCHAR(500),
  IN p_description TEXT,
  IN p_instruction TEXT,
  IN p_pedagogical_question TEXT
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF COALESCE(TRIM(p_activity_id), '') = ''
     OR COALESCE(TRIM(p_title), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30201,
          MESSAGE_TEXT = 'sp_activity_create: id and title are required';
  END IF;

  START TRANSACTION;

  INSERT INTO activities (
    id, version, status, title, description, instruction,
    pedagogical_question
  )
  VALUES (
    p_activity_id, COALESCE(NULLIF(p_version, ''), '0.1.0'), 'draft',
    TRIM(p_title), p_description, p_instruction, p_pedagogical_question
  );

  INSERT INTO activity_pedagogical_identities (
    activity_id, schema_version, design_status,
    resource_nature_state, duration_state,
    intention_state, audience_state, use_context_state,
    lineage_state, lineage_relation, parent_activity_id, root_activity_id
  )
  VALUES (
    p_activity_id, '0.1', 'draft',
    'unknown', 'unknown',
    'unknown', 'unknown', 'unknown',
    'known', 'root', NULL, p_activity_id
  );

  COMMIT;

  SELECT id, version, status, title, description, instruction,
         pedagogical_question, revision, created_at, updated_at,
         1 AS changed
  FROM activities
  WHERE id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_update_metadata$$
CREATE PROCEDURE sp_activity_update_metadata(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_status VARCHAR(32),
  IN p_title VARCHAR(500),
  IN p_description TEXT,
  IN p_instruction TEXT,
  IN p_pedagogical_question TEXT
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF COALESCE(TRIM(p_title), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30202,
          MESSAGE_TEXT = 'sp_activity_update_metadata: title is required';
  END IF;

  START TRANSACTION;

  SELECT revision INTO v_current_revision
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30203,
          MESSAGE_TEXT = 'sp_activity_update_metadata: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30220,
          MESSAGE_TEXT = 'sp_activity_update_metadata: revision conflict';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM activities
    WHERE id = p_activity_id
      AND (
        NOT (status <=> p_status)
        OR NOT (title <=> TRIM(p_title))
        OR NOT (description <=> p_description)
        OR NOT (instruction <=> p_instruction)
        OR NOT (pedagogical_question <=> p_pedagogical_question)
      )
  ) THEN
    UPDATE activities
    SET status = p_status,
        title = TRIM(p_title),
        description = p_description,
        instruction = p_instruction,
        pedagogical_question = p_pedagogical_question,
        revision = revision + 1
    WHERE id = p_activity_id;

    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT id, version, status, title, description, instruction,
         pedagogical_question, revision, created_at, updated_at,
         v_changed AS changed
  FROM activities
  WHERE id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_set_pedagogical_identity$$
CREATE PROCEDURE sp_activity_set_pedagogical_identity(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_schema_version VARCHAR(32),
  IN p_design_status VARCHAR(64),
  IN p_resource_nature_state VARCHAR(32),
  IN p_resource_nature_value TEXT,
  IN p_resource_nature_note TEXT,
  IN p_duration_state VARCHAR(32),
  IN p_duration_minutes INT UNSIGNED,
  IN p_duration_note TEXT,
  IN p_intention_state VARCHAR(32),
  IN p_intention_value TEXT,
  IN p_intention_note TEXT,
  IN p_audience_state VARCHAR(32),
  IN p_audience_value TEXT,
  IN p_audience_note TEXT,
  IN p_use_context_state VARCHAR(32),
  IN p_use_context_value TEXT,
  IN p_use_context_note TEXT,
  IN p_lineage_state VARCHAR(32),
  IN p_lineage_relation VARCHAR(32),
  IN p_parent_activity_id VARCHAR(191),
  IN p_root_activity_id VARCHAR(191),
  IN p_lineage_note TEXT,
  IN p_extended_fields_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_cycle_count INT DEFAULT 0;
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_extended_fields_json IS NOT NULL
     AND JSON_VALID(p_extended_fields_json) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30204,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: invalid extended JSON';
  END IF;

  IF p_lineage_state = 'known'
     AND p_lineage_relation = 'root'
     AND (
       p_parent_activity_id IS NOT NULL
       OR p_root_activity_id <> p_activity_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30213,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: invalid root lineage';
  END IF;

  IF p_lineage_state = 'known'
     AND p_lineage_relation = 'variant'
     AND (
       p_parent_activity_id IS NULL
       OR p_root_activity_id IS NULL
       OR p_parent_activity_id = p_activity_id
       OR p_root_activity_id = p_activity_id
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30214,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: incomplete variant lineage';
  END IF;

  IF (p_lineage_state IS NULL OR p_lineage_state <> 'known')
     AND (
       p_lineage_relation IS NOT NULL
       OR p_parent_activity_id IS NOT NULL
       OR p_root_activity_id IS NOT NULL
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30237,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: unresolved lineage must not name relations';
  END IF;

  START TRANSACTION;

  SELECT revision INTO v_current_revision
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30205,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30221,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: revision conflict';
  END IF;

  IF p_parent_activity_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM activities
       WHERE id = p_parent_activity_id AND deleted_at IS NULL
       FOR UPDATE
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30215,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: parent activity not found';
  END IF;

  IF p_root_activity_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM activities
       WHERE id = p_root_activity_id AND deleted_at IS NULL
       FOR UPDATE
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30216,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: root activity not found';
  END IF;

  IF p_lineage_state = 'known'
     AND p_lineage_relation = 'variant'
     AND NOT EXISTS (
       SELECT 1
       FROM activity_pedagogical_identities parent_identity
       INNER JOIN activity_pedagogical_identities root_identity
         ON root_identity.activity_id = p_root_activity_id
        AND root_identity.lineage_state = 'known'
        AND root_identity.lineage_relation = 'root'
        AND root_identity.root_activity_id = p_root_activity_id
       WHERE parent_identity.activity_id = p_parent_activity_id
         AND parent_identity.lineage_state = 'known'
         AND parent_identity.root_activity_id = p_root_activity_id
       FOR UPDATE
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30238,
          MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: parent belongs to another lineage';
  END IF;

  IF p_lineage_state = 'known'
     AND p_lineage_relation = 'variant' THEN
    WITH RECURSIVE lineage_ancestors AS (
      SELECT activity_id, parent_activity_id
      FROM activity_pedagogical_identities
      WHERE activity_id = p_parent_activity_id
      UNION
      SELECT pi.activity_id, pi.parent_activity_id
      FROM activity_pedagogical_identities pi
      INNER JOIN lineage_ancestors ancestor
        ON pi.activity_id = ancestor.parent_activity_id
    )
    SELECT COUNT(*) INTO v_cycle_count
    FROM lineage_ancestors
    WHERE activity_id = p_activity_id;

    IF v_cycle_count > 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30239,
            MESSAGE_TEXT = 'sp_activity_set_pedagogical_identity: lineage cycle detected';
    END IF;
  END IF;

  SET v_changed = NOT EXISTS (
    SELECT 1
    FROM activity_pedagogical_identities pi
    WHERE pi.activity_id = p_activity_id
      AND pi.schema_version <=> p_schema_version
      AND pi.design_status <=> p_design_status
      AND pi.resource_nature_state <=> p_resource_nature_state
      AND pi.resource_nature_value <=> p_resource_nature_value
      AND pi.resource_nature_note <=> p_resource_nature_note
      AND pi.duration_state <=> p_duration_state
      AND pi.duration_minutes <=> p_duration_minutes
      AND pi.duration_note <=> p_duration_note
      AND pi.intention_state <=> p_intention_state
      AND pi.intention_value <=> p_intention_value
      AND pi.intention_note <=> p_intention_note
      AND pi.audience_state <=> p_audience_state
      AND pi.audience_value <=> p_audience_value
      AND pi.audience_note <=> p_audience_note
      AND pi.use_context_state <=> p_use_context_state
      AND pi.use_context_value <=> p_use_context_value
      AND pi.use_context_note <=> p_use_context_note
      AND pi.lineage_state <=> p_lineage_state
      AND pi.lineage_relation <=> p_lineage_relation
      AND pi.parent_activity_id <=> p_parent_activity_id
      AND pi.root_activity_id <=> p_root_activity_id
      AND pi.lineage_note <=> p_lineage_note
      AND pi.extended_fields_json <=> p_extended_fields_json
  );

  IF v_changed = 1 THEN
    INSERT INTO activity_pedagogical_identities (
    activity_id, schema_version, design_status,
    resource_nature_state, resource_nature_value, resource_nature_note,
    duration_state, duration_minutes, duration_note,
    intention_state, intention_value, intention_note,
    audience_state, audience_value, audience_note,
    use_context_state, use_context_value, use_context_note,
    lineage_state, lineage_relation, parent_activity_id,
    root_activity_id, lineage_note,
    extended_fields_json
  )
  VALUES (
    p_activity_id, p_schema_version, p_design_status,
    p_resource_nature_state, p_resource_nature_value, p_resource_nature_note,
    p_duration_state, p_duration_minutes, p_duration_note,
    p_intention_state, p_intention_value, p_intention_note,
    p_audience_state, p_audience_value, p_audience_note,
    p_use_context_state, p_use_context_value, p_use_context_note,
    p_lineage_state, p_lineage_relation, p_parent_activity_id,
    p_root_activity_id, p_lineage_note,
    p_extended_fields_json
    )
    ON DUPLICATE KEY UPDATE
    schema_version = VALUES(schema_version),
    design_status = VALUES(design_status),
    resource_nature_state = VALUES(resource_nature_state),
    resource_nature_value = VALUES(resource_nature_value),
    resource_nature_note = VALUES(resource_nature_note),
    duration_state = VALUES(duration_state),
    duration_minutes = VALUES(duration_minutes),
    duration_note = VALUES(duration_note),
    intention_state = VALUES(intention_state),
    intention_value = VALUES(intention_value),
    intention_note = VALUES(intention_note),
    audience_state = VALUES(audience_state),
    audience_value = VALUES(audience_value),
    audience_note = VALUES(audience_note),
    use_context_state = VALUES(use_context_state),
    use_context_value = VALUES(use_context_value),
    use_context_note = VALUES(use_context_note),
    lineage_state = VALUES(lineage_state),
    lineage_relation = VALUES(lineage_relation),
    parent_activity_id = VALUES(parent_activity_id),
    root_activity_id = VALUES(root_activity_id),
    lineage_note = VALUES(lineage_note),
      extended_fields_json = VALUES(extended_fields_json);

    UPDATE activities
    SET revision = revision + 1
    WHERE id = p_activity_id;
  END IF;

  COMMIT;

  SELECT
         pi.activity_id,
         pi.schema_version,
         pi.design_status,
         pi.resource_nature_state,
         pi.resource_nature_value,
         pi.resource_nature_note,
         pi.duration_state,
         pi.duration_minutes,
         pi.duration_note,
         pi.intention_state,
         pi.intention_value,
         pi.intention_note,
         pi.audience_state,
         pi.audience_value,
         pi.audience_note,
         pi.use_context_state,
         pi.use_context_value,
         pi.use_context_note,
         pi.lineage_state,
         pi.lineage_relation,
         pi.parent_activity_id,
         pi.root_activity_id,
         pi.lineage_note,
         pi.extended_fields_json,
         a.revision,
         v_changed AS changed,
         CASE
           WHEN intention_state IN ('known', 'not-applicable')
            AND audience_state IN ('known', 'not-applicable')
            AND use_context_state IN ('known', 'not-applicable')
            AND 6 = (
              SELECT COUNT(*)
              FROM activity_pedagogical_text_fields tf
              WHERE tf.activity_id = pi.activity_id
                AND tf.field_key IN (
                  'learning-objectives', 'prerequisites', 'modalities',
                  'recommended-scenario', 'pedagogical-core',
                  'adaptable-elements'
                )
                AND tf.knowledge_state IN ('known', 'not-applicable')
            )
           THEN 'complete'
           ELSE 'incomplete'
         END AS completeness
  FROM activity_pedagogical_identities pi
  INNER JOIN activities a ON a.id = pi.activity_id
  WHERE pi.activity_id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_activity_replace_pedagogical_details$$
CREATE PROCEDURE sp_activity_replace_pedagogical_details(
  IN p_activity_id VARCHAR(191),
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_text_fields_json JSON,
  IN p_qualifications_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_revision BIGINT UNSIGNED;
  DECLARE v_current_digest CHAR(64);
  DECLARE v_requested_digest CHAR(64);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_text_fields_json IS NULL
     OR JSON_VALID(p_text_fields_json) = 0
     OR p_qualifications_json IS NULL
     OR JSON_VALID(p_qualifications_json) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30218,
          MESSAGE_TEXT = 'sp_activity_replace_pedagogical_details: invalid JSON';
  END IF;

  START TRANSACTION;

  SELECT revision, pedagogical_details_digest
    INTO v_current_revision, v_current_digest
  FROM activities
  WHERE id = p_activity_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_revision IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30219,
          MESSAGE_TEXT = 'sp_activity_replace_pedagogical_details: activity not found';
  END IF;

  IF v_current_revision <> p_expected_revision THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30233,
          MESSAGE_TEXT = 'sp_activity_replace_pedagogical_details: revision conflict';
  END IF;

  SET v_requested_digest = SHA2(
    CONCAT(
      CAST(p_text_fields_json AS CHAR),
      CHAR(10),
      CAST(p_qualifications_json AS CHAR)
    ),
    256
  );
  SET v_changed = NOT (v_current_digest <=> v_requested_digest);

  IF v_changed = 1 THEN
  DELETE FROM activity_pedagogical_qualifications
  WHERE activity_id = p_activity_id;

  DELETE FROM activity_pedagogical_text_fields
  WHERE activity_id = p_activity_id;

  INSERT INTO activity_pedagogical_text_fields (
    activity_id, field_key, knowledge_state, value_text, note
  )
  SELECT p_activity_id, j.field_key, j.knowledge_state, j.value_text, j.note
  FROM JSON_TABLE(
    p_text_fields_json, '$[*]'
    COLUMNS (
      field_key VARCHAR(64) PATH '$.fieldKey',
      knowledge_state VARCHAR(32) PATH '$.state',
      value_text TEXT PATH '$.value' NULL ON EMPTY,
      note TEXT PATH '$.note' NULL ON EMPTY
    )
  ) AS j;

  INSERT INTO activity_pedagogical_qualifications (
    activity_id, id, level, validated_by, validated_at,
    context_text, evidence_type, evidence_text, note
  )
  SELECT p_activity_id, j.id, j.level, j.validated_by, j.validated_at,
         j.context_text, j.evidence_type, j.evidence_text, j.note
  FROM JSON_TABLE(
    p_qualifications_json, '$[*]'
    COLUMNS (
      id VARCHAR(191) PATH '$.id',
      level VARCHAR(64) PATH '$.level',
      validated_by VARCHAR(500) PATH '$.validatedBy',
      validated_at DATE PATH '$.validatedAt',
      context_text TEXT PATH '$.context',
      evidence_type VARCHAR(64) PATH '$.evidenceType',
      evidence_text TEXT PATH '$.evidence',
      note TEXT PATH '$.note' NULL ON EMPTY
    )
  ) AS j;

  UPDATE activities
  SET pedagogical_details_digest = v_requested_digest,
      revision = revision + 1
  WHERE id = p_activity_id;
  END IF;

  COMMIT;

  SELECT id, revision, updated_at, v_changed AS changed
  FROM activities
  WHERE id = p_activity_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_register_import$$
CREATE PROCEDURE sp_media_register_import(
  IN p_asset_id VARCHAR(191),
  IN p_source_id VARCHAR(191),
  IN p_playable_id VARCHAR(191),
  IN p_title VARCHAR(500),
  IN p_source_kind VARCHAR(64),
  IN p_provider VARCHAR(64),
  IN p_transport VARCHAR(64),
  IN p_role VARCHAR(64),
  IN p_mime_type VARCHAR(191),
  IN p_origin_url TEXT,
  IN p_storage_scope VARCHAR(64),
  IN p_storage_key VARCHAR(768),
  IN p_location_url TEXT,
  IN p_embed_video_id VARCHAR(191),
  IN p_availability VARCHAR(32),
  IN p_provenance_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_provenance_json IS NOT NULL
     AND JSON_VALID(p_provenance_json) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30301,
          MESSAGE_TEXT = 'sp_media_register_import: invalid provenance JSON';
  END IF;

  IF p_availability = 'pending-removal' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30334,
          MESSAGE_TEXT = 'sp_media_register_import: pending-removal is not an initial state';
  END IF;

  START TRANSACTION;

  INSERT INTO media_assets (
    id, family_root_asset_id, title, lifecycle, provenance_json
  )
  VALUES (
    p_asset_id, NULL, TRIM(p_title), 'active', p_provenance_json
  );

  INSERT INTO media_sources (
    id, asset_id, kind, provider, transport, role,
    mime_type, origin_url, provenance_json
  )
  VALUES (
    p_source_id, p_asset_id, p_source_kind, p_provider, p_transport, p_role,
    p_mime_type, p_origin_url, p_provenance_json
  );

  INSERT INTO media_playables (
    id, asset_id, source_id, kind, provider, role,
    availability, storage_scope, storage_key,
    location_url, embed_video_id, provenance_json
  )
  VALUES (
    p_playable_id, p_asset_id, p_source_id, p_source_kind, p_provider, p_role,
    p_availability, p_storage_scope, p_storage_key,
    p_location_url, p_embed_video_id, p_provenance_json
  );

  INSERT INTO media_playable_metadata (
    playable_id, analysis_status, mime_type
  )
  VALUES (
    p_playable_id, 'pending', p_mime_type
  );

  UPDATE media_assets
  SET default_playable_id = p_playable_id
  WHERE id = p_asset_id;

  COMMIT;

  SELECT a.id AS asset_id, a.default_playable_id,
         s.id AS source_id, p.id AS playable_id, p.availability
  FROM media_assets a
  INNER JOIN media_sources s ON s.asset_id = a.id
  INNER JOIN media_playables p ON p.source_id = s.id
  WHERE a.id = p_asset_id AND p.id = p_playable_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_register_playable$$
CREATE PROCEDURE sp_media_register_playable(
  IN p_playable_id VARCHAR(191),
  IN p_asset_id VARCHAR(191),
  IN p_source_id VARCHAR(191),
  IN p_kind VARCHAR(64),
  IN p_provider VARCHAR(64),
  IN p_role VARCHAR(64),
  IN p_availability VARCHAR(32),
  IN p_storage_scope VARCHAR(64),
  IN p_storage_key VARCHAR(768),
  IN p_location_url TEXT,
  IN p_embed_video_id VARCHAR(191),
  IN p_make_default TINYINT(1),
  IN p_provenance_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF p_availability = 'pending-removal' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30335,
          MESSAGE_TEXT = 'sp_media_register_playable: pending-removal is not an initial state';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM media_sources s
    INNER JOIN media_assets a ON a.id = s.asset_id
    WHERE s.id = p_source_id
      AND s.asset_id = p_asset_id
      AND a.lifecycle = 'active'
      AND a.deleted_at IS NULL
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30302,
          MESSAGE_TEXT = 'sp_media_register_playable: source does not belong to asset';
  END IF;

  INSERT INTO media_playables (
    id, asset_id, source_id, kind, provider, role, availability,
    storage_scope, storage_key, location_url, embed_video_id, provenance_json
  )
  VALUES (
    p_playable_id, p_asset_id, p_source_id, p_kind, p_provider, p_role,
    p_availability, p_storage_scope, p_storage_key,
    p_location_url, p_embed_video_id, p_provenance_json
  );

  INSERT INTO media_playable_metadata (playable_id, analysis_status)
  VALUES (p_playable_id, 'pending');

  IF p_make_default = 1 THEN
    UPDATE media_assets
    SET default_playable_id = p_playable_id
    WHERE id = p_asset_id AND deleted_at IS NULL;
  END IF;

  COMMIT;

  SELECT id, asset_id, source_id, kind, availability, role
  FROM media_playables
  WHERE id = p_playable_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_update_playable_availability$$
CREATE PROCEDURE sp_media_update_playable_availability(
  IN p_playable_id VARCHAR(191),
  IN p_availability VARCHAR(32),
  IN p_reason VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF p_availability = 'pending-removal' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30320,
          MESSAGE_TEXT = 'sp_media_update_playable_availability: use storage removal request';
  END IF;

  UPDATE media_playables
  SET availability = p_availability,
      availability_reason = p_reason
  WHERE id = p_playable_id
    AND removed_at IS NULL
    AND availability <> 'pending-removal'
    AND NOT (
      availability <=> p_availability
      AND availability_reason <=> p_reason
    );

  SET v_changed = IF(ROW_COUNT() > 0, 1, 0);

  IF v_changed = 0
     AND NOT EXISTS (
       SELECT 1
       FROM media_playables
       WHERE id = p_playable_id
         AND removed_at IS NULL
         AND availability <> 'pending-removal'
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30303,
          MESSAGE_TEXT = 'sp_media_update_playable_availability: playable not found';
  END IF;

  SELECT id, asset_id, availability, availability_reason, updated_at,
         v_changed AS changed
  FROM media_playables
  WHERE id = p_playable_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_set_playable_metadata$$
CREATE PROCEDURE sp_media_set_playable_metadata(
  IN p_playable_id VARCHAR(191),
  IN p_analysis_status VARCHAR(64),
  IN p_mime_type VARCHAR(191),
  IN p_duration_ms BIGINT UNSIGNED,
  IN p_size_bytes BIGINT UNSIGNED,
  IN p_sha256 CHAR(64),
  IN p_width INT UNSIGNED,
  IN p_height INT UNSIGNED,
  IN p_frame_rate DECIMAL(10,4),
  IN p_video_codec VARCHAR(64),
  IN p_audio_codec VARCHAR(64),
  IN p_has_audio TINYINT(1),
  IN p_analyzer VARCHAR(128),
  IN p_analyzer_version VARCHAR(64),
  IN p_error_text TEXT
)
SQL SECURITY DEFINER
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM media_playables
    WHERE id = p_playable_id AND removed_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30318,
          MESSAGE_TEXT = 'sp_media_set_playable_metadata: playable not found';
  END IF;

  INSERT INTO media_playable_metadata (
    playable_id, analysis_status, mime_type, duration_ms, size_bytes,
    sha256, width, height, frame_rate, video_codec, audio_codec,
    has_audio, analyzer, analyzer_version, analyzed_at, error_text
  )
  VALUES (
    p_playable_id, p_analysis_status, p_mime_type, p_duration_ms, p_size_bytes,
    LOWER(p_sha256), p_width, p_height, p_frame_rate, p_video_codec,
    p_audio_codec, p_has_audio, p_analyzer, p_analyzer_version,
    CURRENT_TIMESTAMP(3), p_error_text
  )
  ON DUPLICATE KEY UPDATE
    analysis_status = VALUES(analysis_status),
    mime_type = VALUES(mime_type),
    duration_ms = VALUES(duration_ms),
    size_bytes = VALUES(size_bytes),
    sha256 = VALUES(sha256),
    width = VALUES(width),
    height = VALUES(height),
    frame_rate = VALUES(frame_rate),
    video_codec = VALUES(video_codec),
    audio_codec = VALUES(audio_codec),
    has_audio = VALUES(has_audio),
    analyzer = VALUES(analyzer),
    analyzer_version = VALUES(analyzer_version),
    analyzed_at = VALUES(analyzed_at),
    error_text = VALUES(error_text);

  SELECT playable_id, analysis_status, mime_type, duration_ms, size_bytes,
         sha256, width, height, frame_rate, video_codec, audio_codec,
         has_audio, analyzer, analyzer_version, analyzed_at, error_text
  FROM media_playable_metadata
  WHERE playable_id = p_playable_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_treatment_start$$
CREATE PROCEDURE sp_media_treatment_start(
  IN p_treatment_id VARCHAR(191),
  IN p_source_asset_id VARCHAR(191),
  IN p_source_playable_id VARCHAR(191),
  IN p_output_asset_id VARCHAR(191),
  IN p_output_title VARCHAR(500),
  IN p_derivation_type VARCHAR(64),
  IN p_type VARCHAR(64),
  IN p_label VARCHAR(500),
  IN p_runtime_job_id VARCHAR(191),
  IN p_engine VARCHAR(128),
  IN p_engine_version VARCHAR(64),
  IN p_parameters_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_family_root_id VARCHAR(191);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF p_output_asset_id = p_source_asset_id THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30344,
          MESSAGE_TEXT = 'sp_media_treatment_start: output cannot be its own parent';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_assets WHERE id = p_output_asset_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30345,
          MESSAGE_TEXT = 'sp_media_treatment_start: output asset already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM media_assets a
    INNER JOIN media_playables p ON p.asset_id = a.id
    WHERE a.id = p_source_asset_id
      AND a.lifecycle = 'active'
      AND a.deleted_at IS NULL
      AND p.id = p_source_playable_id
      AND p.removed_at IS NULL
      AND p.availability = 'available'
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30304,
          MESSAGE_TEXT = 'sp_media_treatment_start: source playable unavailable';
  END IF;

  SELECT COALESCE(family_root_asset_id, id) INTO v_family_root_id
  FROM media_assets
  WHERE id = p_source_asset_id
  FOR UPDATE;

  INSERT INTO media_assets (
    id, parent_asset_id, family_root_asset_id,
    title, lifecycle, derivation_type
  )
  VALUES (
    p_output_asset_id, p_source_asset_id, v_family_root_id,
    TRIM(p_output_title), 'reserved', p_derivation_type
  );

  INSERT INTO media_treatments (
    id, source_asset_id, source_playable_id, output_asset_id, type, label,
    status, progress, runtime_job_id, engine, engine_version,
    parameters_json, started_at
  )
  VALUES (
    p_treatment_id, p_source_asset_id, p_source_playable_id,
    p_output_asset_id, p_type, p_label,
    'running', 0, p_runtime_job_id, p_engine, p_engine_version,
    p_parameters_json, CURRENT_TIMESTAMP(3)
  );

  COMMIT;

  SELECT id, status, progress, source_asset_id, source_playable_id,
         output_asset_id, started_at
  FROM media_treatments
  WHERE id = p_treatment_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_treatment_update$$
CREATE PROCEDURE sp_media_treatment_update(
  IN p_treatment_id VARCHAR(191),
  IN p_status VARCHAR(32),
  IN p_progress DECIMAL(5,2),
  IN p_diagnostics_json JSON,
  IN p_error_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_current_status VARCHAR(32);
  DECLARE v_current_progress DECIMAL(5,2);
  DECLARE v_current_diagnostics_json JSON;
  DECLARE v_current_error_json JSON;
  DECLARE v_output_asset_id VARCHAR(191);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_status IS NULL OR p_status NOT IN (
    'queued', 'running', 'cancelling',
    'failed', 'cancelled', 'interrupted'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30321,
          MESSAGE_TEXT = 'sp_media_treatment_update: status not allowed here';
  END IF;

  IF p_progress IS NULL
     OR p_progress < 0
     OR p_progress > 100
     OR (p_status = 'queued' AND p_progress <> 0)
     OR (p_status IN ('running', 'cancelling') AND p_progress >= 100) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30341,
          MESSAGE_TEXT = 'sp_media_treatment_update: invalid progress for status';
  END IF;

  START TRANSACTION;

  SELECT status, progress, diagnostics_json, error_json, output_asset_id
    INTO v_current_status, v_current_progress,
         v_current_diagnostics_json, v_current_error_json, v_output_asset_id
  FROM media_treatments
  WHERE id = p_treatment_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30305,
          MESSAGE_TEXT = 'sp_media_treatment_update: treatment not found';
  END IF;

  IF v_current_status <=> p_status
     AND v_current_progress <=> p_progress
     AND v_current_diagnostics_json <=> p_diagnostics_json
     AND v_current_error_json <=> p_error_json THEN
    SET v_changed = 0;
  ELSE
  IF v_current_status IN (
    'completed', 'failed', 'cancelled', 'interrupted'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30322,
          MESSAGE_TEXT = 'sp_media_treatment_update: terminal treatment is immutable';
  END IF;

  IF p_progress < v_current_progress THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30342,
          MESSAGE_TEXT = 'sp_media_treatment_update: progress regression';
  END IF;

  IF NOT (
    (v_current_status = 'queued'
      AND p_status IN (
        'queued', 'running', 'cancelling',
        'cancelled', 'failed', 'interrupted'
      ))
    OR (v_current_status = 'running'
      AND p_status IN ('running', 'cancelling', 'failed', 'interrupted'))
    OR (v_current_status = 'cancelling'
      AND p_status IN ('cancelling', 'cancelled', 'failed', 'interrupted'))
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30343,
          MESSAGE_TEXT = 'sp_media_treatment_update: transition not allowed';
  END IF;

    UPDATE media_treatments
    SET status = p_status,
        progress = p_progress,
        diagnostics_json = p_diagnostics_json,
        error_json = p_error_json,
        started_at = CASE
          WHEN p_status <> 'queued'
          THEN COALESCE(started_at, CURRENT_TIMESTAMP(3))
          ELSE started_at
        END,
        finished_at = CASE
          WHEN p_status IN ('failed', 'cancelled', 'interrupted')
          THEN CURRENT_TIMESTAMP(3)
          ELSE finished_at
        END
    WHERE id = p_treatment_id;

    IF p_status IN ('failed', 'cancelled', 'interrupted')
       AND v_output_asset_id IS NOT NULL THEN
      UPDATE media_assets
      SET lifecycle = 'deleted',
          deleted_at = CURRENT_TIMESTAMP(3)
      WHERE id = v_output_asset_id
        AND lifecycle = 'reserved'
        AND deleted_at IS NULL;
    END IF;

    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT id, status, progress, diagnostics_json, error_json, updated_at,
         v_changed AS changed
  FROM media_treatments
  WHERE id = p_treatment_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_treatment_complete$$
CREATE PROCEDURE sp_media_treatment_complete(
  IN p_treatment_id VARCHAR(191),
  IN p_output_asset_id VARCHAR(191),
  IN p_output_source_id VARCHAR(191),
  IN p_output_playable_id VARCHAR(191),
  IN p_title VARCHAR(500),
  IN p_derivation_type VARCHAR(64),
  IN p_storage_scope VARCHAR(64),
  IN p_storage_key VARCHAR(768),
  IN p_mime_type VARCHAR(191),
  IN p_size_bytes BIGINT UNSIGNED,
  IN p_duration_ms BIGINT UNSIGNED,
  IN p_sha256 CHAR(64),
  IN p_ffmpeg_version VARCHAR(191),
  IN p_diagnostics_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_status VARCHAR(32);
  DECLARE v_source_asset_id VARCHAR(191);
  DECLARE v_source_playable_id VARCHAR(191);
  DECLARE v_reserved_output_asset_id VARCHAR(191);
  DECLARE v_existing_output_playable_id VARCHAR(191);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status, source_asset_id, source_playable_id,
         output_asset_id, output_playable_id
    INTO v_status, v_source_asset_id, v_source_playable_id,
         v_reserved_output_asset_id, v_existing_output_playable_id
  FROM media_treatments
  WHERE id = p_treatment_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30306,
          MESSAGE_TEXT = 'sp_media_treatment_complete: treatment not found';
  END IF;

  IF v_status = 'completed' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM media_treatments t
      INNER JOIN media_assets a
        ON a.id = t.output_asset_id
      INNER JOIN media_playables p
        ON p.asset_id = t.output_asset_id
       AND p.id = t.output_playable_id
       AND p.id = t.published_playable_id
      INNER JOIN media_sources s
        ON s.asset_id = p.asset_id
       AND s.id = p.source_id
      INNER JOIN media_playable_metadata m
        ON m.playable_id = p.id
      WHERE t.id = p_treatment_id
        AND t.status = 'completed'
        AND t.progress = 100
        AND t.output_asset_id = p_output_asset_id
        AND t.output_playable_id = p_output_playable_id
        AND t.published_playable_id = p_output_playable_id
        AND a.lifecycle = 'active'
        AND a.deleted_at IS NULL
        AND a.title <=> TRIM(p_title)
        AND a.derivation_type <=> p_derivation_type
        AND s.id = p_output_source_id
        AND s.kind = 'derived-output'
        AND s.mime_type <=> p_mime_type
        AND p.kind = 'local-file'
        AND p.availability = 'available'
        AND p.removed_at IS NULL
        AND p.storage_scope <=> p_storage_scope
        AND p.storage_key <=> p_storage_key
        AND p.location_url IS NULL
        AND p.embed_video_id IS NULL
        AND m.mime_type <=> p_mime_type
        AND m.size_bytes <=> p_size_bytes
        AND m.duration_ms <=> p_duration_ms
        AND m.sha256 <=> p_sha256
        AND t.ffmpeg_version <=> p_ffmpeg_version
        AND t.diagnostics_json <=> p_diagnostics_json
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30340,
            MESSAGE_TEXT = 'sp_media_treatment_complete: completed result mismatch';
    END IF;
  ELSE
    IF v_status <> 'running' THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30324,
            MESSAGE_TEXT = 'sp_media_treatment_complete: treatment not completable';
    END IF;

    IF v_reserved_output_asset_id <> p_output_asset_id THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30325,
            MESSAGE_TEXT = 'sp_media_treatment_complete: reserved output mismatch';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM media_assets
      WHERE id = p_output_asset_id
        AND parent_asset_id = v_source_asset_id
        AND lifecycle = 'reserved'
        AND deleted_at IS NULL
      FOR UPDATE
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30326,
            MESSAGE_TEXT = 'sp_media_treatment_complete: reserved output unavailable';
    END IF;

  INSERT INTO media_sources (
    id, asset_id, kind, provider, transport, role, mime_type, provenance_json
  )
  VALUES (
    p_output_source_id, p_output_asset_id, 'derived-output',
    'proto05', 'filesystem', 'derived', p_mime_type,
    JSON_OBJECT('treatmentId', p_treatment_id,
                'sourcePlayableId', v_source_playable_id)
  );

  INSERT INTO media_playables (
    id, asset_id, source_id, kind, provider, role,
    availability, storage_scope, storage_key, provenance_json
  )
  VALUES (
    p_output_playable_id, p_output_asset_id, p_output_source_id,
    'local-file', 'proto05', 'derived', 'available',
    p_storage_scope, p_storage_key,
    JSON_OBJECT('treatmentId', p_treatment_id)
  );

  INSERT INTO media_playable_metadata (
    playable_id, analysis_status, mime_type, duration_ms,
    size_bytes, sha256, analyzer, analyzer_version, analyzed_at
  )
  VALUES (
    p_output_playable_id, 'complete', p_mime_type, p_duration_ms,
    p_size_bytes, p_sha256, 'treatment-output',
    p_ffmpeg_version, CURRENT_TIMESTAMP(3)
  );

  UPDATE media_assets
  SET title = TRIM(p_title),
      derivation_type = p_derivation_type,
      lifecycle = 'active',
      default_playable_id = p_output_playable_id
  WHERE id = p_output_asset_id;

  UPDATE media_treatments
  SET output_asset_id = p_output_asset_id,
      output_playable_id = p_output_playable_id,
      published_playable_id = p_output_playable_id,
      status = 'completed',
      progress = 100,
      ffmpeg_version = p_ffmpeg_version,
      diagnostics_json = p_diagnostics_json,
      finished_at = CURRENT_TIMESTAMP(3)
  WHERE id = p_treatment_id;

    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT id, status, progress, output_asset_id,
         output_playable_id, published_playable_id, finished_at,
         v_changed AS changed
  FROM media_treatments
  WHERE id = p_treatment_id;
END$$

DROP PROCEDURE IF EXISTS sp_storage_file_removal_request$$
CREATE PROCEDURE sp_storage_file_removal_request(
  IN p_operation_id VARCHAR(191),
  IN p_playable_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_scope VARCHAR(64);
  DECLARE v_key VARCHAR(768);
  DECLARE v_sha256 CHAR(64);
  DECLARE v_availability VARCHAR(32);
  DECLARE v_reason VARCHAR(191);
  DECLARE v_default_playable_id VARCHAR(191);
  DECLARE v_asset_deleted_at DATETIME(3);
  DECLARE v_return_operation_id VARCHAR(191);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT p.storage_scope, p.storage_key, m.sha256,
         p.availability, p.availability_reason,
         a.default_playable_id, a.deleted_at
    INTO v_scope, v_key, v_sha256,
         v_availability, v_reason,
         v_default_playable_id, v_asset_deleted_at
  FROM media_playables p
  LEFT JOIN media_playable_metadata m ON m.playable_id = p.id
  INNER JOIN media_assets a ON a.id = p.asset_id
  WHERE p.id = p_playable_id
    AND p.kind = 'local-file'
    AND p.removed_at IS NULL
  FOR UPDATE;

  IF v_scope IS NULL OR v_key IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30307,
          MESSAGE_TEXT = 'sp_storage_file_removal_request: removable local playable required';
  END IF;

  IF v_availability = 'pending-removal' THEN
    SELECT id INTO v_return_operation_id
    FROM storage_operations
    WHERE playable_id = p_playable_id
      AND operation_type = 'delete-file'
      AND status = 'requested'
    FOR UPDATE;

    IF v_return_operation_id IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30327,
            MESSAGE_TEXT = 'sp_storage_file_removal_request: pending state without open operation';
    END IF;
  ELSE
  IF v_asset_deleted_at IS NULL
     AND v_default_playable_id <=> p_playable_id THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30328,
          MESSAGE_TEXT = 'sp_storage_file_removal_request: active default playable cannot be removed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM activity_media_links l
    INNER JOIN activities a ON a.id = l.activity_id
    WHERE l.media_playable_id = p_playable_id
      AND a.deleted_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30308,
          MESSAGE_TEXT = 'sp_storage_file_removal_request: playable still in use';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM media_treatments
    WHERE source_playable_id = p_playable_id
      AND status IN ('queued', 'running', 'cancelling')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30319,
          MESSAGE_TEXT = 'sp_storage_file_removal_request: treatment still active';
  END IF;

  UPDATE media_playables
  SET availability = 'pending-removal',
      availability_reason = CONCAT('storage-operation:', p_operation_id)
  WHERE id = p_playable_id;

  INSERT INTO storage_operations (
    id, playable_id, operation_type, status,
    storage_scope, storage_key, expected_sha256,
    previous_availability, previous_reason
  )
  VALUES (
    p_operation_id, p_playable_id, 'delete-file', 'requested',
    v_scope, v_key, v_sha256, v_availability, v_reason
  );

  SET v_return_operation_id = p_operation_id;
  SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT id, playable_id, status, storage_scope, storage_key,
         expected_sha256, previous_availability, previous_reason,
         requested_at, v_changed AS changed
  FROM storage_operations
  WHERE id = v_return_operation_id;
END$$

DROP PROCEDURE IF EXISTS sp_storage_file_removal_complete$$
CREATE PROCEDURE sp_storage_file_removal_complete(
  IN p_operation_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_playable_id VARCHAR(191);
  DECLARE v_status VARCHAR(32);
  DECLARE v_playable_availability VARCHAR(32);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT playable_id, status INTO v_playable_id, v_status
  FROM storage_operations
  WHERE id = p_operation_id
  FOR UPDATE;

  IF v_playable_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30309,
          MESSAGE_TEXT = 'sp_storage_file_removal_complete: operation not found';
  END IF;

  IF v_status = 'requested' THEN
    SELECT availability INTO v_playable_availability
    FROM media_playables
    WHERE id = v_playable_id
    FOR UPDATE;

    IF v_playable_availability <> 'pending-removal' THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30329,
            MESSAGE_TEXT = 'sp_storage_file_removal_complete: playable not pending removal';
    END IF;

    UPDATE storage_operations
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP(3)
    WHERE id = p_operation_id;

    UPDATE media_playables
    SET availability = 'missing-local',
        availability_reason = 'physical-file-removed',
        removed_at = CURRENT_TIMESTAMP(3)
    WHERE id = v_playable_id;

    SET v_changed = 1;
  ELSEIF v_status <> 'completed' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30330,
          MESSAGE_TEXT = 'sp_storage_file_removal_complete: operation not completable';
  END IF;

  COMMIT;

  SELECT id, playable_id, status, completed_at, v_changed AS changed
  FROM storage_operations
  WHERE id = p_operation_id;
END$$

DROP PROCEDURE IF EXISTS sp_storage_file_removal_fail$$
CREATE PROCEDURE sp_storage_file_removal_fail(
  IN p_operation_id VARCHAR(191),
  IN p_error_text TEXT
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_playable_id VARCHAR(191);
  DECLARE v_status VARCHAR(32);
  DECLARE v_previous_availability VARCHAR(32);
  DECLARE v_previous_reason VARCHAR(191);
  DECLARE v_changed TINYINT(1) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT playable_id, status, previous_availability, previous_reason
    INTO v_playable_id, v_status, v_previous_availability, v_previous_reason
  FROM storage_operations
  WHERE id = p_operation_id
  FOR UPDATE;

  IF v_playable_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30310,
          MESSAGE_TEXT = 'sp_storage_file_removal_fail: operation not found';
  END IF;

  IF v_status = 'requested' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM media_playables
      WHERE id = v_playable_id
        AND availability = 'pending-removal'
      FOR UPDATE
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30331,
            MESSAGE_TEXT = 'sp_storage_file_removal_fail: playable not pending removal';
    END IF;

    UPDATE storage_operations
    SET status = 'failed',
        error_text = p_error_text,
        completed_at = CURRENT_TIMESTAMP(3)
    WHERE id = p_operation_id;

    UPDATE media_playables
    SET availability = v_previous_availability,
        availability_reason = v_previous_reason
    WHERE id = v_playable_id;

    SET v_changed = 1;
  ELSEIF v_status <> 'failed' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30332,
          MESSAGE_TEXT = 'sp_storage_file_removal_fail: operation not failable';
  END IF;

  COMMIT;

  SELECT id, playable_id, status, error_text, completed_at,
         v_changed AS changed
  FROM storage_operations
  WHERE id = p_operation_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_asset_delete$$
CREATE PROCEDURE sp_media_asset_delete(
  IN p_asset_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF NOT EXISTS (
    SELECT 1 FROM media_assets
    WHERE id = p_asset_id AND deleted_at IS NULL
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30311,
          MESSAGE_TEXT = 'sp_media_asset_delete: active asset not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM activity_media_links l
    INNER JOIN activities a ON a.id = l.activity_id
    WHERE l.media_asset_id = p_asset_id AND a.deleted_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30312,
          MESSAGE_TEXT = 'sp_media_asset_delete: asset still used by an activity';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_assets
    WHERE parent_asset_id = p_asset_id AND deleted_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30313,
          MESSAGE_TEXT = 'sp_media_asset_delete: active derived assets remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM media_treatments
    WHERE status IN ('queued', 'running', 'cancelling')
      AND (
        source_asset_id = p_asset_id
        OR output_asset_id = p_asset_id
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30333,
          MESSAGE_TEXT = 'sp_media_asset_delete: active treatment uses asset';
  END IF;

  UPDATE media_assets
  SET lifecycle = 'deleted',
      deleted_at = CURRENT_TIMESTAMP(3)
  WHERE id = p_asset_id;

  COMMIT;

  SELECT id, lifecycle, deleted_at
  FROM media_assets
  WHERE id = p_asset_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_derivation_delete$$
CREATE PROCEDURE sp_media_derivation_delete(
  IN p_asset_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM media_assets
    WHERE id = p_asset_id
      AND parent_asset_id IS NOT NULL
      AND deleted_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30314,
          MESSAGE_TEXT = 'sp_media_derivation_delete: active derivation required';
  END IF;

  CALL sp_media_asset_delete(p_asset_id);
END$$

DROP PROCEDURE IF EXISTS sp_media_lineage_delete$$
CREATE PROCEDURE sp_media_lineage_delete(
  IN p_family_root_asset_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF NOT EXISTS (
    SELECT 1 FROM media_assets
    WHERE id = p_family_root_asset_id
      AND COALESCE(family_root_asset_id, id) = p_family_root_asset_id
      AND deleted_at IS NULL
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30315,
          MESSAGE_TEXT = 'sp_media_lineage_delete: active family root required';
  END IF;

  -- Lock every current family member before checking uses and active jobs.
  -- The no-op assignment is intentional: InnoDB locks matching rows.
  UPDATE media_assets
  SET id = id
  WHERE COALESCE(family_root_asset_id, id) = p_family_root_asset_id
    AND deleted_at IS NULL;

  IF EXISTS (
    SELECT 1
    FROM activity_media_links l
    INNER JOIN activities a ON a.id = l.activity_id
    INNER JOIN media_assets m ON m.id = l.media_asset_id
    WHERE COALESCE(m.family_root_asset_id, m.id) = p_family_root_asset_id
      AND a.deleted_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30316,
          MESSAGE_TEXT = 'sp_media_lineage_delete: family still used by an activity';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM media_treatments t
    WHERE t.status IN ('queued', 'running', 'cancelling')
      AND (
        EXISTS (
          SELECT 1
          FROM media_assets source_asset
          WHERE source_asset.id = t.source_asset_id
            AND COALESCE(source_asset.family_root_asset_id, source_asset.id)
                = p_family_root_asset_id
        )
        OR EXISTS (
          SELECT 1
          FROM media_assets output_asset
          WHERE output_asset.id = t.output_asset_id
            AND COALESCE(output_asset.family_root_asset_id, output_asset.id)
                = p_family_root_asset_id
        )
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30317,
          MESSAGE_TEXT = 'sp_media_lineage_delete: treatment still active';
  END IF;

  UPDATE media_assets
  SET lifecycle = 'deleted',
      deleted_at = CURRENT_TIMESTAMP(3)
  WHERE COALESCE(family_root_asset_id, id) = p_family_root_asset_id
    AND deleted_at IS NULL;

  COMMIT;

  SELECT id, parent_asset_id, family_root_asset_id, lifecycle, deleted_at
  FROM media_assets
  WHERE COALESCE(family_root_asset_id, id) = p_family_root_asset_id
  ORDER BY created_at, id;
END$$

-- ---------------------------------------------------------------------------
-- Stored procedure contract -- structured reads
-- ---------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_activity_library_search$$
CREATE PROCEDURE sp_activity_library_search(
  IN p_query VARCHAR(500),
  IN p_status VARCHAR(32),
  IN p_completeness VARCHAR(32),
  IN p_folder_id VARCHAR(191),
  IN p_sort VARCHAR(32),
  IN p_limit INT UNSIGNED,
  IN p_offset INT UNSIGNED
)
SQL SECURITY DEFINER
BEGIN
  SELECT
    a.id, a.folder_id, f.name AS folder_name,
    a.version, a.status, a.title, a.description, a.instruction,
    a.pedagogical_question, a.revision,
    CASE
      WHEN pi.activity_id IS NOT NULL
       AND pi.intention_state IN ('known', 'not-applicable')
       AND pi.audience_state IN ('known', 'not-applicable')
       AND pi.use_context_state IN ('known', 'not-applicable')
       AND 6 = (
         SELECT COUNT(*)
         FROM activity_pedagogical_text_fields tf
         WHERE tf.activity_id = a.id
           AND tf.field_key IN (
             'learning-objectives', 'prerequisites', 'modalities',
             'recommended-scenario', 'pedagogical-core',
             'adaptable-elements'
           )
           AND tf.knowledge_state IN ('known', 'not-applicable')
       )
      THEN 'complete'
      ELSE 'incomplete'
    END AS completeness,
    aml.media_asset_id, aml.media_playable_id,
    ma.title AS media_title,
    mp.kind AS media_playable_kind,
    mp.storage_scope AS media_storage_scope,
    mp.storage_key AS media_storage_key,
    mp.location_url AS media_location_url,
    mp.embed_video_id AS media_embed_video_id,
    mp.availability AS media_availability,
    mp.availability_reason AS media_availability_reason,
    a.created_at, a.updated_at
  FROM activities a
  LEFT JOIN activity_folders f ON f.id = a.folder_id
  LEFT JOIN activity_pedagogical_identities pi ON pi.activity_id = a.id
  LEFT JOIN activity_media_links aml
    ON aml.activity_id = a.id AND aml.role = 'primary'
  LEFT JOIN media_assets ma ON ma.id = aml.media_asset_id
  LEFT JOIN media_playables mp ON mp.id = aml.media_playable_id
  WHERE a.deleted_at IS NULL
    AND (p_status IS NULL OR a.status = p_status)
    AND (
      p_folder_id IS NULL
      OR (p_folder_id = '__uncategorized__' AND a.folder_id IS NULL)
      OR a.folder_id = p_folder_id
    )
    AND (
      p_completeness IS NULL
      OR p_completeness = CASE
        WHEN pi.activity_id IS NOT NULL
         AND pi.intention_state IN ('known', 'not-applicable')
         AND pi.audience_state IN ('known', 'not-applicable')
         AND pi.use_context_state IN ('known', 'not-applicable')
         AND 6 = (
           SELECT COUNT(*)
           FROM activity_pedagogical_text_fields tf
           WHERE tf.activity_id = a.id
             AND tf.field_key IN (
               'learning-objectives', 'prerequisites', 'modalities',
               'recommended-scenario', 'pedagogical-core',
               'adaptable-elements'
             )
             AND tf.knowledge_state IN ('known', 'not-applicable')
         )
        THEN 'complete'
        ELSE 'incomplete'
      END
    )
    AND (
      p_query IS NULL OR TRIM(p_query) = ''
      OR a.id LIKE CONCAT('%', p_query, '%')
      OR a.title LIKE CONCAT('%', p_query, '%')
      OR COALESCE(a.description, '') LIKE CONCAT('%', p_query, '%')
      OR COALESCE(a.instruction, '') LIKE CONCAT('%', p_query, '%')
      OR COALESCE(a.pedagogical_question, '') LIKE CONCAT('%', p_query, '%')
      OR COALESCE(pi.intention_value, '') LIKE CONCAT('%', p_query, '%')
      OR COALESCE(pi.audience_value, '') LIKE CONCAT('%', p_query, '%')
      OR COALESCE(pi.use_context_value, '') LIKE CONCAT('%', p_query, '%')
      OR EXISTS (
        SELECT 1
        FROM activity_pedagogical_text_fields tfq
        WHERE tfq.activity_id = a.id
          AND (
            COALESCE(tfq.value_text, '') LIKE CONCAT('%', p_query, '%')
            OR COALESCE(tfq.note, '') LIKE CONCAT('%', p_query, '%')
          )
      )
      OR COALESCE(ma.title, '') LIKE CONCAT('%', p_query, '%')
    )
  ORDER BY
    CASE WHEN p_sort = 'title-desc' THEN a.title END DESC,
    CASE WHEN p_sort = 'updated-desc' THEN a.updated_at END DESC,
    CASE WHEN p_sort = 'updated-asc' THEN a.updated_at END ASC,
    a.title ASC, a.id ASC
  LIMIT p_limit OFFSET p_offset;
END$$

DROP PROCEDURE IF EXISTS sp_media_library_search$$
CREATE PROCEDURE sp_media_library_search(
  IN p_query VARCHAR(500),
  IN p_source_kind VARCHAR(64),
  IN p_availability VARCHAR(32),
  IN p_folder_id VARCHAR(191),
  IN p_tag_id VARCHAR(191),
  IN p_sort VARCHAR(32),
  IN p_limit INT UNSIGNED,
  IN p_offset INT UNSIGNED
)
SQL SECURITY DEFINER
BEGIN
  SELECT
    a.id, a.folder_id, f.name AS folder_name,
    a.parent_asset_id, a.family_root_asset_id,
    a.default_playable_id, a.title, a.lifecycle, a.derivation_type,
    dp.kind AS default_kind, dp.provider AS default_provider,
    dp.availability AS default_availability,
    dp.availability_reason,
    dp.storage_scope AS default_storage_scope,
    dp.storage_key AS default_storage_key,
    dp.location_url AS default_location_url,
    dp.embed_video_id AS default_embed_video_id,
    COUNT(DISTINCT s.id) AS source_count,
    COUNT(DISTINCT p.id) AS playable_count,
    COUNT(DISTINCT t.tag_id) AS tag_count,
    a.created_at, a.updated_at
  FROM media_assets a
  LEFT JOIN media_folders f ON f.id = a.folder_id
  LEFT JOIN media_playables dp ON dp.id = a.default_playable_id
  LEFT JOIN media_sources s ON s.asset_id = a.id
  LEFT JOIN media_playables p ON p.asset_id = a.id
  LEFT JOIN media_asset_tags t ON t.asset_id = a.id
  WHERE a.deleted_at IS NULL
    AND a.lifecycle = 'active'
    AND (
      p_folder_id IS NULL
      OR (p_folder_id = '__uncategorized__' AND a.folder_id IS NULL)
      OR a.folder_id = p_folder_id
    )
    AND (p_source_kind IS NULL OR s.kind = p_source_kind)
    AND (p_availability IS NULL OR dp.availability = p_availability)
    AND (
      p_tag_id IS NULL
      OR EXISTS (
        SELECT 1 FROM media_asset_tags mt
        WHERE mt.asset_id = a.id AND mt.tag_id = p_tag_id
      )
    )
    AND (
      p_query IS NULL OR TRIM(p_query) = ''
      OR a.id LIKE CONCAT('%', p_query, '%')
      OR a.title LIKE CONCAT('%', p_query, '%')
      OR COALESCE(f.name, '') LIKE CONCAT('%', p_query, '%')
      OR EXISTS (
        SELECT 1
        FROM media_asset_tags mtq
        INNER JOIN media_tags tq ON tq.id = mtq.tag_id
        WHERE mtq.asset_id = a.id
          AND tq.name LIKE CONCAT('%', p_query, '%')
      )
      OR EXISTS (
        SELECT 1
        FROM media_sources sq
        WHERE sq.asset_id = a.id
          AND (
            sq.id LIKE CONCAT('%', p_query, '%')
            OR COALESCE(sq.origin_url, '') LIKE CONCAT('%', p_query, '%')
          )
      )
    )
  GROUP BY
    a.id, a.folder_id, f.name, a.parent_asset_id, a.family_root_asset_id,
    a.default_playable_id, a.title, a.lifecycle, a.derivation_type,
    dp.kind, dp.provider, dp.availability, dp.availability_reason,
    dp.storage_scope, dp.storage_key, dp.location_url, dp.embed_video_id,
    a.created_at, a.updated_at
  ORDER BY
    CASE WHEN p_sort = 'title-desc' THEN a.title END DESC,
    CASE WHEN p_sort = 'created-desc' THEN a.created_at END DESC,
    CASE WHEN p_sort = 'availability' THEN dp.availability END ASC,
    a.title ASC, a.id ASC
  LIMIT p_limit OFFSET p_offset;
END$$

DROP PROCEDURE IF EXISTS sp_activity_get$$
CREATE PROCEDURE sp_activity_get(
  IN p_activity_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  -- Result set 1: activity metadata and pedagogical identity.
  SELECT
         a.id AS activity_id,
         a.folder_id,
         a.version AS activity_version,
         a.status AS activity_status,
         a.title AS activity_title,
         a.description AS activity_description,
         a.instruction AS activity_instruction,
         a.pedagogical_question,
         a.revision,
         a.allow_learner_toggle,
         a.created_at AS activity_created_at,
         a.updated_at AS activity_updated_at,
         pi.schema_version AS pedagogical_schema_version,
         pi.design_status,
         pi.resource_nature_state,
         pi.resource_nature_value,
         pi.resource_nature_note,
         pi.duration_state,
         pi.duration_minutes,
         pi.duration_note,
         pi.intention_state,
         pi.intention_value,
         pi.intention_note,
         pi.audience_state,
         pi.audience_value,
         pi.audience_note,
         pi.use_context_state,
         pi.use_context_value,
         pi.use_context_note,
         pi.lineage_state,
         pi.lineage_relation,
         pi.parent_activity_id,
         pi.root_activity_id,
         pi.lineage_note,
         pi.extended_fields_json
  FROM activities a
  LEFT JOIN activity_pedagogical_identities pi ON pi.activity_id = a.id
  WHERE a.id = p_activity_id AND a.deleted_at IS NULL;

  -- Result set 2: qualified pedagogical text fields.
  SELECT activity_id, field_key, knowledge_state, value_text, note
  FROM activity_pedagogical_text_fields
  WHERE activity_id = p_activity_id ORDER BY field_key;

  -- Result set 3: pedagogical qualifications.
  SELECT activity_id, id AS qualification_id, level, validated_by,
         validated_at, context_text, evidence_type, evidence_text, note
  FROM activity_pedagogical_qualifications
  WHERE activity_id = p_activity_id ORDER BY validated_at, id;

  -- Result set 4: primary and supplementary media in display order.
  SELECT l.id AS link_id, l.activity_id, l.role, l.sort_order,
         l.media_asset_id, ma.title AS media_title,
         l.media_playable_id, mp.kind AS playable_kind,
         mp.provider AS playable_provider,
         mp.availability AS playable_availability,
         mp.availability_reason,
         mp.storage_scope, mp.storage_key,
         mp.location_url, mp.embed_video_id,
         pm.mime_type, pm.duration_ms, pm.size_bytes
  FROM activity_media_links l
  INNER JOIN media_assets ma ON ma.id = l.media_asset_id
  INNER JOIN media_playables mp ON mp.id = l.media_playable_id
  LEFT JOIN media_playable_metadata pm ON pm.playable_id = mp.id
  WHERE l.activity_id = p_activity_id
  ORDER BY (l.role = 'primary') DESC, l.sort_order, l.id;

  -- Result set 5: activity languages.
  SELECT activity_id, language_id, local_label, sort_order
  FROM activity_languages
  WHERE activity_id = p_activity_id ORDER BY sort_order, language_id;

  -- Result set 6: transcription identity.
  SELECT activity_id, id AS transcription_id, language_id, label
  FROM activity_transcriptions
  WHERE activity_id = p_activity_id;

  -- Result set 7: speakers.
  SELECT activity_id, id AS speaker_id, label, sort_order
  FROM activity_speakers
  WHERE activity_id = p_activity_id ORDER BY sort_order, id;

  -- Result set 8: segments.
  SELECT activity_id, id AS segment_id, start_ms, end_ms, text, sort_order
  FROM activity_segments
  WHERE activity_id = p_activity_id ORDER BY start_ms, sort_order, id;

  -- Result set 9: segment-speaker links.
  SELECT activity_id, segment_id, speaker_id
  FROM activity_segment_speakers
  WHERE activity_id = p_activity_id ORDER BY segment_id, speaker_id;

  -- Result set 10: segment-language links.
  SELECT activity_id, segment_id, language_id
  FROM activity_segment_languages
  WHERE activity_id = p_activity_id ORDER BY segment_id, language_id;

  -- Result set 11: language intervals.
  SELECT activity_id, id AS interval_id, segment_id, language_id,
         start_ms, end_ms, sort_order
  FROM activity_language_intervals
  WHERE activity_id = p_activity_id ORDER BY start_ms, sort_order, id;

  -- Result set 12: layers.
  SELECT activity_id, id AS layer_id, label, description, color, sort_order
  FROM activity_layers
  WHERE activity_id = p_activity_id ORDER BY sort_order, id;

  -- Result set 13: layer visibility.
  SELECT activity_id, layer_id, audience, is_visible, is_default
  FROM activity_layer_visibility
  WHERE activity_id = p_activity_id ORDER BY audience, layer_id;

  -- Result set 14: phenomena.
  SELECT activity_id, id AS phenomenon_id, segment_id, layer_id,
         start_ms, end_ms, sort_order
  FROM activity_phenomena
  WHERE activity_id = p_activity_id ORDER BY start_ms, sort_order, id;

  -- Result set 15: teacher annotations.
  SELECT activity_id, id AS annotation_id, segment_id, note,
         pedagogical_question, sort_order
  FROM activity_annotations
  WHERE activity_id = p_activity_id ORDER BY sort_order, id;

  -- Result set 16: overlays.
  SELECT activity_id, id AS overlay_id, annotation_id,
         start_ms, end_ms, title, text, sort_order
  FROM activity_overlays
  WHERE activity_id = p_activity_id ORDER BY start_ms, sort_order, id;

  -- Result set 17: overlay-layer links.
  SELECT activity_id, overlay_id, layer_id
  FROM activity_overlay_layers
  WHERE activity_id = p_activity_id ORDER BY overlay_id, layer_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_get$$
CREATE PROCEDURE sp_media_get(
  IN p_asset_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  -- Result set 1: logical asset.
  SELECT a.id AS asset_id, a.folder_id, f.name AS folder_name,
         a.parent_asset_id, a.family_root_asset_id, a.default_playable_id,
         a.title, a.lifecycle, a.derivation_type,
         a.provenance_json, a.rights_json,
         a.created_at, a.updated_at, a.deleted_at
  FROM media_assets a
  LEFT JOIN media_folders f ON f.id = a.folder_id
  WHERE a.id = p_asset_id
    AND a.lifecycle = 'active'
    AND a.deleted_at IS NULL;

  -- Result set 2: origins.
  SELECT id AS source_id, asset_id, kind, provider, transport, role,
         mime_type, origin_url, origin_json, provenance_json, created_at
  FROM media_sources
  WHERE asset_id = p_asset_id ORDER BY created_at, id;

  -- Result set 3: playable representations and technical metadata.
  SELECT p.id AS playable_id, p.asset_id, p.source_id, p.kind,
         p.provider, p.role, p.availability, p.availability_reason,
         p.storage_scope, p.storage_key, p.location_url, p.embed_video_id,
         p.provenance_json, p.created_at, p.updated_at, p.removed_at,
         m.analysis_status, m.mime_type, m.duration_ms,
         m.size_bytes, m.sha256, m.width, m.height, m.frame_rate,
         m.video_codec, m.audio_codec, m.has_audio, m.analyzed_at,
         m.error_text
  FROM media_playables p
  LEFT JOIN media_playable_metadata m ON m.playable_id = p.id
  WHERE p.asset_id = p_asset_id
  ORDER BY (p.id = (
    SELECT default_playable_id FROM media_assets WHERE id = p_asset_id
  )) DESC, p.created_at, p.id;

  -- Result set 4: tags.
  SELECT t.id AS tag_id, t.name AS tag_name
  FROM media_asset_tags mt
  INNER JOIN media_tags t ON t.id = mt.tag_id
  WHERE mt.asset_id = p_asset_id
  ORDER BY t.normalized_name;

  -- Result set 5: active activity uses.
  SELECT l.id AS link_id, l.activity_id, l.role, l.sort_order,
         a.title AS activity_title, a.status AS activity_status
  FROM activity_media_links l
  INNER JOIN activities a ON a.id = l.activity_id
  WHERE l.media_asset_id = p_asset_id AND a.deleted_at IS NULL
  ORDER BY a.title, l.role;
END$$

DROP PROCEDURE IF EXISTS sp_media_lineage_get$$
CREATE PROCEDURE sp_media_lineage_get(
  IN p_asset_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  SELECT
    a.id, a.parent_asset_id, a.family_root_asset_id,
    a.default_playable_id, a.title, a.lifecycle, a.derivation_type,
    p.availability AS default_availability,
    a.created_at, a.updated_at, a.deleted_at
  FROM media_assets requested
  INNER JOIN media_assets a
    ON COALESCE(a.family_root_asset_id, a.id)
       = COALESCE(requested.family_root_asset_id, requested.id)
  LEFT JOIN media_playables p ON p.id = a.default_playable_id
  WHERE requested.id = p_asset_id
  ORDER BY a.created_at, a.id;
END$$

DROP PROCEDURE IF EXISTS sp_media_treatments_search$$
CREATE PROCEDURE sp_media_treatments_search(
  IN p_asset_id VARCHAR(191),
  IN p_status VARCHAR(32),
  IN p_limit INT UNSIGNED,
  IN p_offset INT UNSIGNED
)
SQL SECURITY DEFINER
BEGIN
  SELECT t.id AS treatment_id,
         t.source_asset_id, t.source_playable_id,
         t.output_asset_id, t.output_playable_id, t.published_playable_id,
         t.type, t.label, t.status, t.progress, t.retained,
         t.source_preparation_id, t.runtime_job_id,
         t.engine, t.engine_version, t.ffmpeg_version,
         t.parameters_json, t.diagnostics_json, t.error_json,
         t.created_at, t.started_at, t.updated_at, t.finished_at
  FROM media_treatments t
  WHERE (
      p_asset_id IS NULL
      OR t.source_asset_id = p_asset_id
      OR t.output_asset_id = p_asset_id
    )
    AND (p_status IS NULL OR t.status = p_status)
  ORDER BY t.created_at DESC, t.id DESC
  LIMIT p_limit OFFSET p_offset;
END$$

DROP PROCEDURE IF EXISTS sp_student_activity_bundle$$
CREATE PROCEDURE sp_student_activity_bundle(
  IN p_activity_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_is_student_readable TINYINT(1) DEFAULT 0;

  -- Compute the complete student-readability gate once. Every result set
  -- below is then guarded by this same decision.
  SELECT EXISTS (
    SELECT 1
    FROM activities readable_activity
    INNER JOIN activity_media_links primary_link
      ON primary_link.activity_id = readable_activity.id
     AND primary_link.role = 'primary'
    INNER JOIN media_assets primary_asset
      ON primary_asset.id = primary_link.media_asset_id
    INNER JOIN media_playables primary_playable
      ON primary_playable.id = primary_link.media_playable_id
     AND primary_playable.asset_id = primary_asset.id
    WHERE readable_activity.id = p_activity_id
      AND readable_activity.status = 'published'
      AND readable_activity.deleted_at IS NULL
      AND primary_asset.lifecycle = 'active'
      AND primary_asset.deleted_at IS NULL
      AND primary_playable.availability = 'available'
      AND primary_playable.removed_at IS NULL
      AND (
        (
          primary_playable.kind = 'local-file'
          AND primary_playable.storage_scope IS NOT NULL
          AND CHAR_LENGTH(TRIM(primary_playable.storage_scope)) > 0
          AND primary_playable.storage_key IS NOT NULL
          AND CHAR_LENGTH(TRIM(primary_playable.storage_key)) > 0
          AND primary_playable.location_url IS NULL
          AND primary_playable.embed_video_id IS NULL
        )
        OR
        (
          primary_playable.kind <> 'local-file'
          AND primary_playable.storage_scope IS NULL
          AND primary_playable.storage_key IS NULL
          AND (
            (
              primary_playable.location_url IS NOT NULL
              AND CHAR_LENGTH(TRIM(primary_playable.location_url)) > 0
            )
            OR
            (
              primary_playable.embed_video_id IS NOT NULL
              AND CHAR_LENGTH(TRIM(primary_playable.embed_video_id)) > 0
            )
          )
        )
      )
  )
  INTO v_is_student_readable;

  -- Result set 1: published activity header. Empty means not student-readable.
  SELECT
    a.id AS activity_id, a.version, a.title, a.description, a.instruction,
    a.pedagogical_question, a.allow_learner_toggle, a.revision
  FROM activities a
  WHERE a.id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL;

  -- Result set 2: available primary and supplementary media.
  -- storage_scope/storage_key are server locators. The future Node adapter
  -- must translate them to a served or signed URL before browser exposure.
  SELECT l.activity_id, l.id AS link_id, l.role, l.sort_order,
         l.media_asset_id, ma.title AS media_title,
         l.media_playable_id, mp.kind AS playable_kind,
         mp.provider, mp.storage_scope, mp.storage_key,
         mp.location_url, mp.embed_video_id,
         mp.availability, mp.availability_reason,
         pm.duration_ms, pm.size_bytes, pm.mime_type
  FROM activity_media_links l
  INNER JOIN activities a ON a.id = l.activity_id
  INNER JOIN media_assets ma ON ma.id = l.media_asset_id
  INNER JOIN media_playables mp ON mp.id = l.media_playable_id
  LEFT JOIN media_playable_metadata pm ON pm.playable_id = mp.id
  WHERE l.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL
    AND ma.lifecycle = 'active'
    AND ma.deleted_at IS NULL
    AND mp.availability = 'available'
    AND mp.removed_at IS NULL
  ORDER BY (l.role = 'primary') DESC, l.sort_order, l.id;

  -- Result set 3: languages.
  SELECT al.activity_id, al.language_id, al.local_label, al.sort_order
  FROM activity_languages al
  INNER JOIN activities a ON a.id = al.activity_id
  WHERE al.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published' AND a.deleted_at IS NULL
  ORDER BY al.sort_order, al.language_id;

  -- Result set 4: speakers.
  SELECT s.activity_id, s.id AS speaker_id, s.label, s.sort_order
  FROM activity_speakers s
  INNER JOIN activities a ON a.id = s.activity_id
  WHERE s.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published' AND a.deleted_at IS NULL
  ORDER BY s.sort_order, s.id;

  -- Result set 5: segments.
  SELECT s.activity_id, s.id AS segment_id,
         s.start_ms, s.end_ms, s.text, s.sort_order
  FROM activity_segments s
  INNER JOIN activities a ON a.id = s.activity_id
  WHERE s.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL
  ORDER BY s.start_ms, s.sort_order, s.id;

  -- Result set 6: segment-speaker links.
  SELECT ss.activity_id, ss.segment_id, ss.speaker_id
  FROM activity_segment_speakers ss
  INNER JOIN activities a ON a.id = ss.activity_id
  WHERE ss.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published' AND a.deleted_at IS NULL
  ORDER BY ss.segment_id, ss.speaker_id;

  -- Result set 7: segment-language links.
  SELECT sl.activity_id, sl.segment_id, sl.language_id
  FROM activity_segment_languages sl
  INNER JOIN activities a ON a.id = sl.activity_id
  WHERE sl.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published' AND a.deleted_at IS NULL
  ORDER BY sl.segment_id, sl.language_id;

  -- Result set 8: language intervals.
  SELECT li.activity_id, li.id AS interval_id,
         li.segment_id, li.language_id,
         li.start_ms, li.end_ms, li.sort_order
  FROM activity_language_intervals li
  INNER JOIN activities a ON a.id = li.activity_id
  WHERE li.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published' AND a.deleted_at IS NULL
  ORDER BY li.start_ms, li.sort_order, li.id;

  -- Result set 9: learner-visible layers.
  SELECT l.activity_id, l.id AS layer_id, l.label, l.description, l.color,
         v.is_visible, v.is_default
  FROM activity_layers l
  INNER JOIN activity_layer_visibility v
    ON v.activity_id = l.activity_id AND v.layer_id = l.id
  INNER JOIN activities a ON a.id = l.activity_id
  WHERE l.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND v.audience = 'learner'
    AND v.is_visible = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL
  ORDER BY l.sort_order, l.id;

  -- Result set 10: phenomena on learner-visible layers.
  SELECT p.activity_id, p.id AS phenomenon_id, p.segment_id, p.layer_id,
         p.start_ms, p.end_ms, p.sort_order
  FROM activity_phenomena p
  INNER JOIN activity_layer_visibility v
    ON v.activity_id = p.activity_id
   AND v.layer_id = p.layer_id
   AND v.audience = 'learner'
   AND v.is_visible = 1
  INNER JOIN activities a ON a.id = p.activity_id
  WHERE p.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL
  ORDER BY p.start_ms, p.sort_order, p.id;

  -- Result set 11: overlays.
  SELECT o.activity_id, o.id AS overlay_id, o.annotation_id,
         o.start_ms, o.end_ms, o.title, o.text, o.sort_order
  FROM activity_overlays o
  INNER JOIN activities a ON a.id = o.activity_id
  WHERE o.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL
    AND (
      NOT EXISTS (
        SELECT 1
        FROM activity_overlay_layers any_overlay_layer
        WHERE any_overlay_layer.activity_id = o.activity_id
          AND any_overlay_layer.overlay_id = o.id
      )
      OR EXISTS (
        SELECT 1
        FROM activity_overlay_layers learner_overlay_layer
        INNER JOIN activity_layer_visibility learner_visibility
          ON learner_visibility.activity_id =
             learner_overlay_layer.activity_id
         AND learner_visibility.layer_id = learner_overlay_layer.layer_id
         AND learner_visibility.audience = 'learner'
         AND learner_visibility.is_visible = 1
        WHERE learner_overlay_layer.activity_id = o.activity_id
          AND learner_overlay_layer.overlay_id = o.id
      )
    )
  ORDER BY o.start_ms, o.sort_order, o.id;

  -- Result set 12: overlay-layer links restricted to learner-visible layers.
  SELECT ol.activity_id, ol.overlay_id, ol.layer_id
  FROM activity_overlay_layers ol
  INNER JOIN activity_layer_visibility v
    ON v.activity_id = ol.activity_id
   AND v.layer_id = ol.layer_id
   AND v.audience = 'learner'
   AND v.is_visible = 1
  INNER JOIN activities a ON a.id = ol.activity_id
  WHERE ol.activity_id = p_activity_id
    AND v_is_student_readable = 1
    AND a.status = 'published'
    AND a.deleted_at IS NULL
  ORDER BY ol.overlay_id, ol.layer_id;
END$$

DROP PROCEDURE IF EXISTS sp_author_activity_bundle$$
CREATE PROCEDURE sp_author_activity_bundle(
  IN p_activity_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  CALL sp_activity_get(p_activity_id);
END$$

DELIMITER ;
