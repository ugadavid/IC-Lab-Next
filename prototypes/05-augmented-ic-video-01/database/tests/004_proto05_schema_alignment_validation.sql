-- Mission 133 targeted validation for migration 002.
-- Runs only in ic_augmented_video and removes every m133_ fixture row.

USE ic_augmented_video;
SET NAMES utf8mb4;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_m133_assert$$
CREATE PROCEDURE sp_m133_assert(
  IN p_condition TINYINT(1),
  IN p_label VARCHAR(500)
)
BEGIN
  IF COALESCE(p_condition, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30930,
          MESSAGE_TEXT = p_label;
  END IF;
  SELECT 'PASS' AS result, p_label AS test;
END$$

DROP PROCEDURE IF EXISTS sp_m133_expect_error$$
CREATE PROCEDURE sp_m133_expect_error(
  IN p_sql TEXT,
  IN p_expected_errno INT,
  IN p_expected_message_fragment VARCHAR(500),
  IN p_label VARCHAR(500)
)
BEGIN
  DECLARE v_failed TINYINT(1) DEFAULT 0;
  DECLARE v_errno INT DEFAULT NULL;
  DECLARE v_message TEXT DEFAULT NULL;
  DECLARE v_prepared TINYINT(1) DEFAULT 0;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
      GET DIAGNOSTICS CONDITION 1
        v_errno = MYSQL_ERRNO,
        v_message = MESSAGE_TEXT;
      SET v_failed = 1;
    END;

    SET @m133_sql = p_sql;
    PREPARE m133_statement FROM @m133_sql;
    SET v_prepared = 1;
    EXECUTE m133_statement;
    DEALLOCATE PREPARE m133_statement;
    SET v_prepared = 0;
  END;

  IF v_prepared = 1 THEN
    BEGIN
      DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
      DEALLOCATE PREPARE m133_statement;
    END;
  END IF;

  IF v_failed <> 1
     OR (p_expected_errno IS NOT NULL AND v_errno <> p_expected_errno)
     OR (
       p_expected_message_fragment IS NOT NULL
       AND LOCATE(p_expected_message_fragment, v_message) = 0
     ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30931,
          MESSAGE_TEXT = p_label;
  END IF;

  SELECT 'PASS' AS result, p_label AS test,
         v_errno AS actual_errno;
END$$

DROP PROCEDURE IF EXISTS sp_m133_cleanup$$
CREATE PROCEDURE sp_m133_cleanup()
BEGIN
  DELETE FROM media_treatments WHERE id LIKE 'm133\_%';

  UPDATE media_assets
  SET default_playable_id = NULL
  WHERE id LIKE 'm133\_%';

  DELETE FROM media_playable_metadata WHERE playable_id LIKE 'm133\_%';
  DELETE FROM media_playables WHERE id LIKE 'm133\_%';
  DELETE FROM media_sources WHERE id LIKE 'm133\_%';
  DELETE FROM media_asset_tags WHERE asset_id LIKE 'm133\_%';

  DELETE FROM media_assets
  WHERE id = 'm133_output_asset';
  DELETE FROM media_assets
  WHERE id LIKE 'm133\_%';

  DELETE FROM activity_overlay_layers WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_overlays WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_annotations WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_phenomena WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_layer_visibility WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_layers WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_language_intervals WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_segment_languages WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_segment_speakers WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_segments WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_speakers WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_transcriptions WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_languages WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_pedagogical_qualifications
  WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_pedagogical_text_fields
  WHERE activity_id LIKE 'm133\_%';
  DELETE FROM activity_pedagogical_identities
  WHERE activity_id LIKE 'm133\_%'
    AND parent_activity_id IS NOT NULL;
  DELETE FROM activities WHERE id LIKE 'm133\_%';

  DELETE FROM media_tags WHERE id LIKE 'm133\_%';
  DELETE FROM languages WHERE id LIKE 'm133\_%';
END$$

DELIMITER ;

CALL sp_m133_cleanup();

-- Dedicated columns and unchanged object topology.
CALL sp_m133_assert(
  (
    SELECT DATA_TYPE = 'text' AND IS_NULLABLE = 'YES'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'media_assets'
      AND column_name = 'description'
  ),
  'media_assets.description is TEXT NULL'
);

CALL sp_m133_assert(
  (
    SELECT DATA_TYPE = 'varchar'
      AND CHARACTER_MAXIMUM_LENGTH = 32
      AND IS_NULLABLE = 'YES'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'media_tags'
      AND column_name = 'color'
  ),
  'media_tags.color is VARCHAR(32) NULL'
);

CALL sp_m133_assert(
  (
    SELECT DATA_TYPE = 'varchar'
      AND CHARACTER_MAXIMUM_LENGTH = 191
      AND IS_NULLABLE = 'YES'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'activities'
      AND column_name = 'layer_configuration_id'
  ),
  'activities.layer_configuration_id is VARCHAR(191) NULL'
);

CALL sp_m133_assert(
  (
    SELECT IS_NULLABLE = 'YES'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'activity_language_intervals'
      AND column_name = 'segment_id'
  ),
  'activity_language_intervals.segment_id is nullable'
);

CALL sp_m133_assert(
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE') = 32
  AND
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = DATABASE()
     AND routine_type = 'PROCEDURE'
     AND routine_name NOT LIKE 'sp_m133\_%') = 43
  AND
  (SELECT COUNT(*) FROM information_schema.referential_constraints
   WHERE constraint_schema = DATABASE()) = 48
  AND
  (SELECT COUNT(*) FROM information_schema.check_constraints
   WHERE constraint_schema = DATABASE()) = 70,
  'historical schema plus document metadata table remain stable'
);

CALL sp_m133_assert(
  (
    SELECT LOCATE('published_playable_id', LOWER(check_clause)) = 0
      AND LOCATE('output_asset_id', LOWER(check_clause)) > 0
      AND LOCATE('output_playable_id', LOWER(check_clause)) > 0
      AND LOCATE('finished_at', LOWER(check_clause)) > 0
    FROM information_schema.check_constraints
    WHERE constraint_schema = DATABASE()
      AND constraint_name = 'chk_media_treatment_completed_output'
  ),
  'completed output CHECK no longer requires publication'
);

-- Nullable interval contract and authoring procedure.
CALL sp_activity_create(
  'm133_activity', '0.1.45', 'Mission 133 activity',
  NULL, NULL, NULL
);
INSERT INTO languages (id, code, label)
VALUES ('m133_fr', 'm133-fr', 'Mission 133 French');

CALL sp_activity_replace_authoring(
  'm133_activity',
  1,
  JSON_OBJECT(
    'languages', JSON_ARRAY(
      JSON_OBJECT('id', 'm133_fr', 'label', 'Français', 'sortOrder', 0)
    ),
    'transcription', JSON_OBJECT(
      'id', 'm133_transcription',
      'languageId', 'm133_fr'
    ),
    'speakers', JSON_ARRAY(),
    'segments', JSON_ARRAY(),
    'segmentSpeakers', JSON_ARRAY(),
    'segmentLanguages', JSON_ARRAY(),
    'languageIntervals', JSON_ARRAY(
      JSON_OBJECT(
        'id', 'm133_interval_without_segment',
        'languageId', 'm133_fr',
        'startMs', 0,
        'endMs', 1000,
        'sortOrder', 0
      )
    ),
    'layers', JSON_ARRAY(),
    'layerVisibility', JSON_ARRAY(),
    'phenomena', JSON_ARRAY(),
    'annotations', JSON_ARRAY(),
    'overlays', JSON_ARRAY(),
    'overlayLayers', JSON_ARRAY(),
    'layerConfiguration', JSON_OBJECT('id', 'm133_layer_configuration'),
    'allowLearnerToggle', TRUE
  )
);

CALL sp_m133_assert(
  (SELECT layer_configuration_id
   FROM activities WHERE id = 'm133_activity') = 'm133_layer_configuration'
  AND
  (SELECT segment_id IS NULL
   FROM activity_language_intervals
   WHERE activity_id = 'm133_activity'
     AND id = 'm133_interval_without_segment') = 1,
  'authoring procedure preserves layerConfiguration.id and NULL segment'
);

CALL sp_activity_duplicate(
  'm133_activity',
  (SELECT revision FROM activities WHERE id = 'm133_activity'),
  'm133_activity_copy',
  'Mission 133 activity copy',
  0
);

CALL sp_m133_assert(
  (SELECT layer_configuration_id
   FROM activities WHERE id = 'm133_activity_copy')
    = 'layer-config-m133_activity_copy'
  AND
  (SELECT segment_id IS NULL
   FROM activity_language_intervals
   WHERE activity_id = 'm133_activity_copy'
     AND id = 'm133_interval_without_segment') = 1,
  'duplication regenerates layer configuration identity and preserves NULL segment'
);

CALL sp_m133_expect_error(
  'INSERT INTO activity_language_intervals (activity_id,id,segment_id,language_id,start_ms,end_ms,sort_order) VALUES (''m133_activity'',''m133_orphan_interval'',''m133_unknown_segment'',''m133_fr'',1000,2000,1)',
  1452,
  'fk_language_interval_segment',
  'unknown non-null interval segment remains rejected'
);

-- Dedicated media properties and dependent reads.
INSERT INTO media_assets (
  id, title, description, lifecycle
)
VALUES (
  'm133_asset', 'Mission 133 asset',
  'Dedicated media description', 'active'
);

CALL sp_media_tag_create('m133_tag', 'Mission 133 tag', '#123456');
CALL sp_media_tag_rename('m133_tag', 'Mission 133 renamed tag', '#654321');
CALL sp_media_asset_set_tags('m133_asset', JSON_ARRAY('m133_tag'));

CALL sp_m133_assert(
  (SELECT description FROM media_assets WHERE id = 'm133_asset')
    = 'Dedicated media description'
  AND
  (SELECT color FROM media_tags WHERE id = 'm133_tag') = '#654321',
  'dedicated media description and tag color survive writes'
);

CALL sp_m133_assert(
  LOCATE(
    'layer_configuration_id',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_activity_get')
  ) > 0
  AND
  LOCATE(
    'a.description',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_media_get')
  ) > 0
  AND
  LOCATE(
    't.color',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_media_get')
  ) > 0,
  'full activity and media reads expose dedicated properties'
);

-- A real procedure completion must preserve output without inventing publication.
INSERT INTO media_assets (id, title, lifecycle)
VALUES ('m133_source_asset', 'Mission 133 source', 'active');
INSERT INTO media_sources (
  id, asset_id, kind, provider, transport, role, mime_type, origin_url
)
VALUES (
  'm133_source', 'm133_source_asset', 'direct-url',
  'fixture', 'https', 'original-remote', 'video/mp4',
  'https://example.invalid/source.mp4'
);
INSERT INTO media_playables (
  id, asset_id, source_id, kind, provider, role, availability, location_url
)
VALUES (
  'm133_source_playable', 'm133_source_asset', 'm133_source',
  'direct-url', 'fixture', 'original-remote', 'available',
  'https://example.invalid/source.mp4'
);
UPDATE media_assets
SET default_playable_id = 'm133_source_playable'
WHERE id = 'm133_source_asset';

CALL sp_media_treatment_start(
  'm133_treatment',
  'm133_source_asset',
  'm133_source_playable',
  'm133_output_asset',
  'Mission 133 output',
  'transcode',
  'transcode',
  'Mission 133 completion',
  'm133-job',
  'fixture-engine',
  '1',
  JSON_OBJECT('mission', 133)
);

CALL sp_media_treatment_complete(
  'm133_treatment',
  'm133_output_asset',
  'm133_output_source',
  'm133_output_playable',
  'Mission 133 output',
  'transcode',
  'proto05-test',
  'm133/output.mp4',
  'video/mp4',
  1024,
  1000,
  REPEAT('a', 64),
  'fixture-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);

CALL sp_m133_assert(
  (SELECT status = 'completed'
     AND output_asset_id = 'm133_output_asset'
     AND output_playable_id = 'm133_output_playable'
     AND published_playable_id IS NULL
     AND finished_at IS NOT NULL
   FROM media_treatments WHERE id = 'm133_treatment'),
  'completion preserves output and leaves publication absent'
);

CALL sp_media_treatment_complete(
  'm133_treatment',
  'm133_output_asset',
  'm133_output_source',
  'm133_output_playable',
  'Mission 133 output',
  'transcode',
  'proto05-test',
  'm133/output.mp4',
  'video/mp4',
  1024,
  1000,
  REPEAT('a', 64),
  'fixture-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);

CALL sp_m133_expect_error(
  'UPDATE media_treatments SET published_playable_id=''m133_source_playable'' WHERE id=''m133_treatment''',
  1452,
  'fk_treatment_published_playable',
  'published playable must belong to the treatment output asset'
);

CALL sp_m133_expect_error(
  'INSERT INTO media_treatments (id,source_asset_id,source_playable_id,type,status,progress,started_at,finished_at) VALUES (''m133_bad_completed'',''m133_source_asset'',''m133_source_playable'',''transcode'',''completed'',100,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))',
  4025,
  'chk_media_treatment_completed_output',
  'completed treatment still requires a real output'
);

CALL sp_m133_assert(
  (SELECT COUNT(*) FROM information_schema.triggers
   WHERE trigger_schema = DATABASE()) = 0
  AND
  (SELECT COUNT(*) FROM information_schema.events
   WHERE event_schema = DATABASE()) = 0,
  'migration introduces no trigger or event'
);

CALL sp_m133_cleanup();

CALL sp_m133_assert(
  (SELECT COUNT(*) FROM activities WHERE id LIKE 'm133\_%') = 0
  AND
  (SELECT COUNT(*) FROM activity_language_intervals
   WHERE activity_id LIKE 'm133\_%') = 0
  AND
  (SELECT COUNT(*) FROM media_assets WHERE id LIKE 'm133\_%') = 0
  AND
  (SELECT COUNT(*) FROM media_tags WHERE id LIKE 'm133\_%') = 0
  AND
  (SELECT COUNT(*) FROM media_treatments WHERE id LIKE 'm133\_%') = 0,
  'all Mission 133 fixture rows are removed'
);

DROP PROCEDURE sp_m133_cleanup;
DROP PROCEDURE sp_m133_expect_error;
DROP PROCEDURE sp_m133_assert;

SELECT 'MISSION_133_VALIDATION_COMPLETE' AS result;
