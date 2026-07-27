-- Proto05 MariaDB incremental schema alignment 002.
-- Mission 133, 2026-07-27.
--
-- Applies only to the installed revision 003 in ic_augmented_video.
-- This migration changes no JSON data and creates no database or account.
--
-- Rollback on an empty database:
--   1. restore the schema-only dump captured before this migration; or
--   2. restore the previous routine definitions, then execute:
--        ALTER TABLE media_treatments
--          DROP CONSTRAINT chk_media_treatment_completed_output,
--          ADD CONSTRAINT chk_media_treatment_completed_output CHECK (
--            status <> 'completed' OR (
--              output_asset_id IS NOT NULL
--              AND output_playable_id IS NOT NULL
--              AND published_playable_id IS NOT NULL
--              AND finished_at IS NOT NULL
--            )
--          );
--        ALTER TABLE activity_language_intervals
--          MODIFY segment_id VARCHAR(191) NOT NULL;
--        ALTER TABLE activities DROP COLUMN layer_configuration_id;
--        ALTER TABLE media_tags DROP COLUMN color;
--        ALTER TABLE media_assets DROP COLUMN description;

USE ic_augmented_video;

SET NAMES utf8mb4;

ALTER TABLE media_assets
  ADD COLUMN description TEXT NULL AFTER title;

ALTER TABLE media_tags
  ADD COLUMN color VARCHAR(32) NULL AFTER normalized_name;

ALTER TABLE activities
  ADD COLUMN layer_configuration_id VARCHAR(191) NULL
  AFTER pedagogical_question;

ALTER TABLE activity_language_intervals
  MODIFY segment_id VARCHAR(191) NULL;

ALTER TABLE media_treatments
  DROP CONSTRAINT chk_media_treatment_completed_output,
  ADD CONSTRAINT chk_media_treatment_completed_output
    CHECK (
      status <> 'completed'
      OR (
        output_asset_id IS NOT NULL
        AND output_playable_id IS NOT NULL
        AND finished_at IS NOT NULL
      )
    );

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_media_tag_create$$
CREATE PROCEDURE sp_media_tag_create(
  IN p_tag_id VARCHAR(191),
  IN p_name VARCHAR(191),
  IN p_color VARCHAR(32)
)
SQL SECURITY DEFINER
BEGIN
  IF COALESCE(TRIM(p_tag_id), '') = ''
     OR COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30109,
          MESSAGE_TEXT = 'sp_media_tag_create: id and name are required';
  END IF;

  IF p_color IS NOT NULL AND CHAR_LENGTH(p_color) > 32 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30116,
          MESSAGE_TEXT = 'sp_media_tag_create: color exceeds 32 characters';
  END IF;

  INSERT INTO media_tags (id, name, normalized_name, color)
  VALUES (p_tag_id, TRIM(p_name), LOWER(TRIM(p_name)), p_color);

  SELECT id, name, normalized_name, color, created_at, updated_at
  FROM media_tags
  WHERE id = p_tag_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_tag_rename$$
CREATE PROCEDURE sp_media_tag_rename(
  IN p_tag_id VARCHAR(191),
  IN p_name VARCHAR(191),
  IN p_color VARCHAR(32)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_changed TINYINT(1) DEFAULT 0;

  IF COALESCE(TRIM(p_name), '') = '' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30114,
          MESSAGE_TEXT = 'sp_media_tag_rename: name is required';
  END IF;

  IF p_color IS NOT NULL AND CHAR_LENGTH(p_color) > 32 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30117,
          MESSAGE_TEXT = 'sp_media_tag_rename: color exceeds 32 characters';
  END IF;

  UPDATE media_tags
  SET name = TRIM(p_name),
      normalized_name = LOWER(TRIM(p_name)),
      color = p_color
  WHERE id = p_tag_id
    AND NOT (
      name <=> TRIM(p_name)
      AND normalized_name <=> LOWER(TRIM(p_name))
      AND color <=> p_color
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

  SELECT id, name, normalized_name, color, created_at, updated_at,
         v_changed AS changed
  FROM media_tags
  WHERE id = p_tag_id;
END$$

-- Additional dependent routines are replaced below without changing their
-- transaction, authorization or result-set ordering contracts.

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
        segment_id VARCHAR(191) PATH '$.segmentId' NULL ON EMPTY,
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
    SET layer_configuration_id =
          COALESCE(
            JSON_VALUE(p_authoring_json, '$.layerConfiguration.id'),
            layer_configuration_id
          ),
        allow_learner_toggle =
          COALESCE(
            JSON_VALUE(p_authoring_json, '$.allowLearnerToggle'),
            allow_learner_toggle
          ),
        authoring_digest = v_requested_digest,
        revision = revision + 1
    WHERE id = p_activity_id;
  END IF;

  COMMIT;

  SELECT id, layer_configuration_id, revision, updated_at,
         v_changed AS changed
  FROM activities
  WHERE id = p_activity_id;
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
    '$[*]' COLUMNS (
      tag_id VARCHAR(191) CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci PATH '$'
    )
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
            '$[*]' COLUMNS (
              tag_id VARCHAR(191) CHARACTER SET utf8mb4
                COLLATE utf8mb4_unicode_ci PATH '$'
            )
          ) requested
          WHERE requested.tag_id = existing.tag_id
        )
    )
    +
    (
      SELECT COUNT(DISTINCT requested.tag_id)
      FROM JSON_TABLE(
        p_tag_ids_json,
        '$[*]' COLUMNS (
          tag_id VARCHAR(191) CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci PATH '$'
        )
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
      '$[*]' COLUMNS (
        tag_id VARCHAR(191) CHARACTER SET utf8mb4
          COLLATE utf8mb4_unicode_ci PATH '$'
      )
    ) requested;

    UPDATE media_assets SET updated_at = CURRENT_TIMESTAMP(3)
    WHERE id = p_asset_id;

    SET v_changed = 1;
  END IF;

  COMMIT;

  SELECT p_asset_id AS asset_id, v_changed AS changed;

  SELECT tag.id AS tag_id, tag.name AS tag_name, tag.color AS tag_color
  FROM media_asset_tags link
  JOIN media_tags tag ON tag.id = link.tag_id
  WHERE link.asset_id = p_asset_id
  ORDER BY tag.name;
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
      JSON_OBJECT(
        'treatmentId', p_treatment_id,
        'sourcePlayableId', v_source_playable_id
      )
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
    pedagogical_question, layer_configuration_id, revision,
    allow_learner_toggle
  )
  SELECT
    p_new_activity_id,
    CASE WHEN p_keep_folder = 1 THEN folder_id ELSE NULL END,
    version, 'draft', TRIM(p_new_title), description, instruction,
    pedagogical_question,
    CASE
      WHEN layer_configuration_id IS NULL THEN NULL
      ELSE CONCAT('layer-config-', p_new_activity_id)
    END,
    1, allow_learner_toggle
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

  SELECT id, folder_id, version, status, title,
         layer_configuration_id, revision, created_at, updated_at
  FROM activities
  WHERE id = p_new_activity_id;
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
         a.layer_configuration_id,
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

  -- Result set 11: language intervals, including unsegmented rows.
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
         a.title, a.description, a.lifecycle, a.derivation_type,
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
  SELECT t.id AS tag_id, t.name AS tag_name, t.color AS tag_color
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

DELIMITER ;
