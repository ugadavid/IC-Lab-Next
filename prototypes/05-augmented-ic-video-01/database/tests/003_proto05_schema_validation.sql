-- Proto05 MariaDB schema hardening revision 003 -- reproducible validation
-- Mission 130
--
-- Run only after installing database/drafts/003_proto05_schema_hardening.sql
-- in the dedicated ic_augmented_video work database. Persistent fixture IDs
-- start with m130_. Cleanup follows foreign-key order and never suspends
-- relational integrity.

USE ic_augmented_video;
SET NAMES utf8mb4;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_m130_assert$$
CREATE PROCEDURE sp_m130_assert(
  IN p_condition TINYINT(1),
  IN p_label VARCHAR(500)
)
BEGIN
  IF COALESCE(p_condition, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30910,
          MESSAGE_TEXT = p_label;
  END IF;

  SELECT 'PASS' AS result, p_label AS test;
END$$

DROP PROCEDURE IF EXISTS sp_m130_probe_error$$
CREATE PROCEDURE sp_m130_probe_error(
  IN p_sql TEXT,
  IN p_expected_errno INT,
  IN p_expected_sqlstate CHAR(5),
  IN p_expected_message_fragment VARCHAR(500),
  OUT p_matches TINYINT(1),
  OUT p_actual_errno INT,
  OUT p_actual_sqlstate CHAR(5),
  OUT p_actual_message TEXT
)
BEGIN
  DECLARE v_failed TINYINT(1) DEFAULT 0;
  DECLARE v_prepared TINYINT(1) DEFAULT 0;

  SET p_actual_errno = NULL;
  SET p_actual_sqlstate = NULL;
  SET p_actual_message = NULL;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
      GET DIAGNOSTICS CONDITION 1
        p_actual_sqlstate = RETURNED_SQLSTATE,
        p_actual_errno = MYSQL_ERRNO,
        p_actual_message = MESSAGE_TEXT;
      SET v_failed = 1;
    END;

    SET @m130_expected_error_sql = p_sql;
    PREPARE m130_expected_error_statement
      FROM @m130_expected_error_sql;
    SET v_prepared = 1;
    EXECUTE m130_expected_error_statement;
    DEALLOCATE PREPARE m130_expected_error_statement;
    SET v_prepared = 0;
  END;

  IF v_prepared = 1 THEN
    BEGIN
      DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
      DEALLOCATE PREPARE m130_expected_error_statement;
    END;
  END IF;

  SET p_matches = (
    v_failed = 1
    AND (p_expected_errno IS NULL OR p_actual_errno = p_expected_errno)
    AND (
      p_expected_sqlstate IS NULL
      OR p_actual_sqlstate = p_expected_sqlstate
    )
    AND (
      p_expected_message_fragment IS NULL
      OR LOCATE(p_expected_message_fragment, p_actual_message) > 0
    )
  );
END$$

DROP PROCEDURE IF EXISTS sp_m130_expect_error$$
CREATE PROCEDURE sp_m130_expect_error(
  IN p_sql TEXT,
  IN p_expected_errno INT,
  IN p_expected_sqlstate CHAR(5),
  IN p_expected_message_fragment VARCHAR(500),
  IN p_label VARCHAR(500)
)
BEGIN
  DECLARE v_matches TINYINT(1);
  DECLARE v_actual_errno INT;
  DECLARE v_actual_sqlstate CHAR(5);
  DECLARE v_actual_message TEXT;
  DECLARE v_failure_message TEXT;

  CALL sp_m130_probe_error(
    p_sql,
    p_expected_errno,
    p_expected_sqlstate,
    p_expected_message_fragment,
    v_matches,
    v_actual_errno,
    v_actual_sqlstate,
    v_actual_message
  );

  IF COALESCE(v_matches, 0) <> 1 THEN
    SET v_failure_message = CONCAT(
      p_label,
      ': expected errno=', COALESCE(p_expected_errno, -1),
      ' sqlstate=', COALESCE(p_expected_sqlstate, 'NULL'),
      ' fragment=', COALESCE(p_expected_message_fragment, 'NULL'),
      '; actual errno=', COALESCE(v_actual_errno, -1),
      ' sqlstate=', COALESCE(v_actual_sqlstate, 'NULL'),
      ' message=', COALESCE(v_actual_message, 'NO ERROR')
    );
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30911,
          MESSAGE_TEXT = v_failure_message;
  END IF;

  SELECT 'PASS' AS result, p_label AS test,
         v_actual_errno AS actual_errno,
         v_actual_sqlstate AS actual_sqlstate;
END$$

DROP PROCEDURE IF EXISTS sp_m130_cleanup$$
CREATE PROCEDURE sp_m130_cleanup()
BEGIN
  DECLARE v_assets_remaining INT DEFAULT 0;
  DECLARE v_deleted_assets INT DEFAULT 0;

  DELETE FROM storage_operations WHERE id LIKE 'm130\_%';
  DELETE FROM activity_media_links
  WHERE id LIKE 'm130\_%' OR activity_id LIKE 'm130\_%';
  DELETE FROM media_treatments WHERE id LIKE 'm130\_%';

  UPDATE media_assets
  SET default_playable_id = NULL
  WHERE id LIKE 'm130\_%';

  DELETE FROM media_playable_metadata WHERE playable_id LIKE 'm130\_%';
  DELETE FROM media_playables WHERE id LIKE 'm130\_%';
  DELETE FROM media_sources WHERE id LIKE 'm130\_%';
  DELETE FROM media_asset_tags WHERE asset_id LIKE 'm130\_%';

  SELECT COUNT(*) INTO v_assets_remaining
  FROM media_assets
  WHERE id LIKE 'm130\_%';

  WHILE v_assets_remaining > 0 DO
    DELETE asset
    FROM media_assets asset
    LEFT JOIN media_assets child
      ON child.parent_asset_id = asset.id
     AND child.id LIKE 'm130\_%'
    WHERE asset.id LIKE 'm130\_%'
      AND child.id IS NULL;

    SET v_deleted_assets = ROW_COUNT();
    IF v_deleted_assets = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30912,
            MESSAGE_TEXT = 'sp_m130_cleanup: media lineage cannot be purged';
    END IF;

    SELECT COUNT(*) INTO v_assets_remaining
    FROM media_assets
    WHERE id LIKE 'm130\_%';
  END WHILE;

  DELETE FROM activity_overlay_layers WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_overlays WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_annotations WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_phenomena WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_layer_visibility WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_layers WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_language_intervals WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_segment_speakers WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_segment_languages WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_segments WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_speakers WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_transcriptions WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_languages WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_pedagogical_qualifications
  WHERE activity_id LIKE 'm130\_%';
  DELETE FROM activity_pedagogical_text_fields
  WHERE activity_id LIKE 'm130\_%';

  -- Pedagogical variants are removed deepest-first before their roots.
  DELETE FROM activities WHERE id = 'm130_activity_grandchild';
  DELETE FROM activities WHERE id = 'm130_activity_variant';
  DELETE FROM activities WHERE id LIKE 'm130\_%';

  DELETE FROM activity_folders WHERE id LIKE 'm130\_%';
  DELETE FROM media_tags WHERE id LIKE 'm130\_%';
  DELETE FROM media_folders WHERE id LIKE 'm130\_%';
  DELETE FROM languages WHERE id LIKE 'm130\_%';
  DELETE FROM import_runs WHERE id LIKE 'm130\_%';
END$$

DELIMITER ;

CALL sp_m130_cleanup();

-- -------------------------------------------------------------------------
-- Precise error diagnostics and negative control
-- -------------------------------------------------------------------------

CALL sp_activity_create(
  'm130_activity_root', '0.1.45', 'Mission 130 bundle',
  'Non-empty read fixture', 'Observe', 'What changes?'
);

CALL sp_m130_probe_error(
  'CALL sp_activity_update_metadata(''m130_activity_root'', 99, ''draft'', ''Mission 130 bundle'', ''Non-empty read fixture'', ''Observe'', ''What changes?'')',
  99999,
  '45000',
  'revision conflict',
  @m130_negative_match,
  @m130_negative_errno,
  @m130_negative_sqlstate,
  @m130_negative_message
);
CALL sp_m130_assert(
  @m130_negative_match = 0
  AND @m130_negative_errno = 30220
  AND @m130_negative_sqlstate = '45000',
  'diagnostic helper rejects an incorrect expected errno'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_update_metadata(''m130_activity_root'', 99, ''draft'', ''Mission 130 bundle'', ''Non-empty read fixture'', ''Observe'', ''What changes?'')',
  30220,
  '45000',
  'revision conflict',
  'business SIGNAL is matched by errno, SQLSTATE, and message'
);

-- -------------------------------------------------------------------------
-- Pedagogical lineage: valid depth, cross-family rejection, NULLs and cycle
-- -------------------------------------------------------------------------

CALL sp_activity_create(
  'm130_activity_variant', '0.1.45', 'Mission 130 variant',
  NULL, NULL, NULL
);
CALL sp_activity_create(
  'm130_activity_grandchild', '0.1.45', 'Mission 130 second level',
  NULL, NULL, NULL
);
CALL sp_activity_create(
  'm130_activity_other_root', '0.1.45', 'Mission 130 other root',
  NULL, NULL, NULL
);
CALL sp_activity_create(
  'm130_activity_wrong_lineage', '0.1.45', 'Mission 130 wrong lineage',
  NULL, NULL, NULL
);

CALL sp_activity_set_pedagogical_identity(
  'm130_activity_variant', 1, '0.1', 'draft',
  'unknown', NULL, NULL, 'unknown', NULL, NULL,
  'unknown', NULL, NULL, 'unknown', NULL, NULL,
  'unknown', NULL, NULL,
  'known', 'variant',
  'm130_activity_root', 'm130_activity_root', NULL, NULL
);
CALL sp_activity_set_pedagogical_identity(
  'm130_activity_grandchild', 1, '0.1', 'draft',
  'unknown', NULL, NULL, 'unknown', NULL, NULL,
  'unknown', NULL, NULL, 'unknown', NULL, NULL,
  'unknown', NULL, NULL,
  'known', 'variant',
  'm130_activity_variant', 'm130_activity_root', NULL, NULL
);
CALL sp_m130_assert(
  (SELECT parent_activity_id
   FROM activity_pedagogical_identities
   WHERE activity_id = 'm130_activity_grandchild')
    = 'm130_activity_variant',
  'second-level pedagogical variant is valid'
);

CALL sp_m130_expect_error(
  'CALL sp_activity_set_pedagogical_identity(''m130_activity_wrong_lineage'', 1, ''0.1'', ''draft'', ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''known'', ''variant'', ''m130_activity_other_root'', ''m130_activity_root'', NULL, NULL)',
  30238,
  '45000',
  'parent belongs to another lineage',
  'procedure rejects a pedagogical parent from another root'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_pedagogical_identity(''m130_activity_wrong_lineage'', 1, ''0.1'', ''draft'', ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''known'', ''variant'', ''m130_activity_wrong_lineage'', ''m130_activity_root'', NULL, NULL)',
  30214,
  '45000',
  'incomplete variant lineage',
  'procedure rejects pedagogical self-parenting'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_pedagogical_identity(''m130_activity_variant'', 2, ''0.1'', ''draft'', ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''unknown'', NULL, NULL, ''known'', ''variant'', ''m130_activity_grandchild'', ''m130_activity_root'', NULL, NULL)',
  30239,
  '45000',
  'lineage cycle detected',
  'recursive procedure check rejects a pedagogical cycle'
);
CALL sp_m130_expect_error(
  'UPDATE activity_pedagogical_identities SET lineage_state=''known'', lineage_relation=''variant'', parent_activity_id=''m130_activity_other_root'', root_activity_id=''m130_activity_root'' WHERE activity_id=''m130_activity_wrong_lineage''',
  1452,
  '23000',
  'fk_pedagogical_identity_parent_lineage',
  'composite FK rejects a direct cross-lineage pedagogical parent'
);
CALL sp_m130_expect_error(
  'UPDATE activity_pedagogical_identities SET lineage_state=''known'', lineage_relation=''variant'', parent_activity_id=NULL, root_activity_id=''m130_activity_root'' WHERE activity_id=''m130_activity_wrong_lineage''',
  4025,
  '23000',
  'chk_pedagogical_lineage_shape',
  'pedagogical lineage CHECK rejects invalid NULL combination'
);

-- Complete the root identity so the read fixture is pedagogically non-empty.
CALL sp_activity_set_pedagogical_identity(
  'm130_activity_root', 1, '0.1', 'documented',
  'known', 'pedagogical-activity', NULL,
  'known', 30, NULL,
  'known', 'Observe language alternation', NULL,
  'known', 'Graduate learners', NULL,
  'known', 'Guided classroom activity', NULL,
  'known', 'root', NULL, 'm130_activity_root', NULL,
  JSON_OBJECT('mission', 130)
);

-- -------------------------------------------------------------------------
-- Media roots, locators, uniform attachment rules and family constraints
-- -------------------------------------------------------------------------

CALL sp_media_register_import(
  'm130_asset_local', 'm130_source_local', 'm130_playable_local',
  'Mission 130 local primary', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/local.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 130)
);
CALL sp_media_register_import(
  'm130_asset_supp', 'm130_source_supp', 'm130_playable_supp',
  'Mission 130 local supplement', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/supp.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 130)
);
CALL sp_media_register_import(
  'm130_asset_remote', 'm130_source_remote', 'm130_playable_remote',
  'Mission 130 remote supplement', 'direct-url', 'remote', 'https', 'master',
  'video/mp4', 'https://example.invalid/video.mp4',
  NULL, NULL, 'https://example.invalid/video.mp4', NULL,
  'available', JSON_OBJECT('mission', 130)
);
CALL sp_media_register_import(
  'm130_asset_other_family', 'm130_source_other', 'm130_playable_other',
  'Mission 130 other family', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/other.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 130)
);
CALL sp_media_register_import(
  'm130_asset_archived', 'm130_source_archived', 'm130_playable_archived',
  'Mission 130 archived', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/archived.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 130)
);
UPDATE media_assets SET lifecycle = 'archived'
WHERE id = 'm130_asset_archived';

CALL sp_media_register_import(
  'm130_asset_deleted', 'm130_source_deleted', 'm130_playable_deleted',
  'Mission 130 deleted', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/deleted.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 130)
);
UPDATE media_assets
SET lifecycle = 'deleted', deleted_at = CURRENT_TIMESTAMP(3)
WHERE id = 'm130_asset_deleted';

CALL sp_media_register_import(
  'm130_asset_unavailable', 'm130_source_unavailable',
  'm130_playable_unavailable',
  'Mission 130 unavailable', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/unavailable.mp4', NULL, NULL,
  'missing-local', JSON_OBJECT('mission', 130)
);

CALL sp_media_register_import(
  'm130_asset_pending', 'm130_source_pending', 'm130_playable_pending_default',
  'Mission 130 pending removal', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm130/pending-default.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 130)
);
CALL sp_media_register_playable(
  'm130_playable_pending', 'm130_asset_pending', 'm130_source_pending',
  'local-file', 'proto05', 'alternate', 'available',
  'proto05-test', 'm130/pending.mp4', NULL, NULL, 0,
  JSON_OBJECT('mission', 130)
);
CALL sp_storage_file_removal_request(
  'm130_storage_pending', 'm130_playable_pending'
);

CALL sp_activity_set_primary_media(
  'm130_activity_root', 2, 'm130_asset_local', 'm130_playable_local'
);
CALL sp_activity_set_supplementary_media(
  'm130_activity_root', 3, 'm130_asset_supp', 'm130_playable_supp', 10
);
CALL sp_activity_set_supplementary_media(
  'm130_activity_root', 4, 'm130_asset_remote', 'm130_playable_remote', 20
);

CALL sp_activity_create(
  'm130_activity_attach_primary', '0.1.45', 'Attachment primary checks',
  NULL, NULL, NULL
);
CALL sp_activity_create(
  'm130_activity_attach_supp', '0.1.45', 'Attachment supplement checks',
  NULL, NULL, NULL
);

CALL sp_m130_expect_error(
  'CALL sp_activity_set_primary_media(''m130_activity_attach_primary'', 1, ''m130_asset_archived'', ''m130_playable_archived'')',
  30210, '45000', 'active playable not available',
  'primary attachment rejects archived asset'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_supplementary_media(''m130_activity_attach_supp'', 1, ''m130_asset_archived'', ''m130_playable_archived'', 10)',
  30227, '45000', 'playable not available',
  'supplementary attachment rejects archived asset'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_primary_media(''m130_activity_attach_primary'', 1, ''m130_asset_deleted'', ''m130_playable_deleted'')',
  30210, '45000', 'active playable not available',
  'primary attachment rejects logically deleted asset'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_supplementary_media(''m130_activity_attach_supp'', 1, ''m130_asset_deleted'', ''m130_playable_deleted'', 10)',
  30227, '45000', 'playable not available',
  'supplementary attachment rejects logically deleted asset'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_primary_media(''m130_activity_attach_primary'', 1, ''m130_asset_pending'', ''m130_playable_pending'')',
  30210, '45000', 'active playable not available',
  'primary attachment rejects pending-removal playable'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_supplementary_media(''m130_activity_attach_supp'', 1, ''m130_asset_pending'', ''m130_playable_pending'', 10)',
  30227, '45000', 'playable not available',
  'supplementary attachment rejects pending-removal playable'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_primary_media(''m130_activity_attach_primary'', 1, ''m130_asset_unavailable'', ''m130_playable_unavailable'')',
  30210, '45000', 'active playable not available',
  'primary attachment rejects unavailable playable'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_supplementary_media(''m130_activity_attach_supp'', 1, ''m130_asset_unavailable'', ''m130_playable_unavailable'', 10)',
  30227, '45000', 'playable not available',
  'supplementary attachment rejects unavailable playable'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_primary_media(''m130_activity_attach_primary'', 1, ''m130_asset_local'', ''m130_playable_supp'')',
  30210, '45000', 'active playable not available',
  'primary attachment rejects incoherent asset-playable pair'
);
CALL sp_m130_expect_error(
  'CALL sp_activity_set_supplementary_media(''m130_activity_attach_supp'', 1, ''m130_asset_local'', ''m130_playable_supp'', 10)',
  30227, '45000', 'playable not available',
  'supplementary attachment rejects incoherent asset-playable pair'
);

CALL sp_m130_expect_error(
  'INSERT INTO media_assets (id, parent_asset_id, family_root_asset_id, title, lifecycle, derivation_type) VALUES (''m130_cross_family_child'', ''m130_asset_other_family'', ''m130_asset_local'', ''Cross family'', ''active'', ''test'')',
  1452, '23000', 'fk_media_asset_parent_lineage',
  'composite FK rejects media parent from another family'
);
CALL sp_m130_expect_error(
  'INSERT INTO media_assets (id, parent_asset_id, family_root_asset_id, title, lifecycle, derivation_type) VALUES (''m130_self_parent_asset'', ''m130_self_parent_asset'', ''m130_asset_local'', ''Self parent'', ''active'', ''test'')',
  4025, '23000', 'chk_media_asset_not_own_parent',
  'media lineage CHECK rejects self-parenting'
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_start(''m130_self_cycle_treatment'', ''m130_asset_local'', ''m130_playable_local'', ''m130_asset_local'', ''Self cycle'', ''test'', ''test'', ''Self cycle'', NULL, ''test'', ''1'', NULL)',
  30344, '45000', 'output cannot be its own parent',
  'media treatment procedure rejects direct lineage cycle'
);

-- -------------------------------------------------------------------------
-- Treatment graph, monotonic progress and immutable terminal states
-- -------------------------------------------------------------------------

CALL sp_media_treatment_start(
  'm130_treatment_transition',
  'm130_asset_other_family', 'm130_playable_other',
  'm130_transition_output', 'Mission 130 transition output', 'transcode',
  'transcode', 'Transition graph', 'm130-job-transition',
  'test-engine', '1', JSON_OBJECT('mission', 130)
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_update(''m130_treatment_transition'', ''queued'', 0, NULL, NULL)',
  30343, '45000', 'transition not allowed',
  'treatment rejects running to queued'
);
CALL sp_media_treatment_update(
  'm130_treatment_transition', 'running', 20,
  JSON_OBJECT('step', 1), NULL
);
CALL sp_media_treatment_update(
  'm130_treatment_transition', 'running', 20,
  JSON_OBJECT('step', 1), NULL
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_update(''m130_treatment_transition'', ''running'', 10, JSON_OBJECT(''step'', 1), NULL)',
  30342, '45000', 'progress regression',
  'treatment rejects progress regression'
);
CALL sp_media_treatment_update(
  'm130_treatment_transition', 'cancelling', 30,
  JSON_OBJECT('step', 2), NULL
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_update(''m130_treatment_transition'', ''running'', 30, JSON_OBJECT(''step'', 2), NULL)',
  30343, '45000', 'transition not allowed',
  'treatment rejects cancelling to running'
);
CALL sp_media_treatment_update(
  'm130_treatment_transition', 'cancelled', 30,
  JSON_OBJECT('step', 2), NULL
);
CALL sp_media_treatment_update(
  'm130_treatment_transition', 'cancelled', 30,
  JSON_OBJECT('step', 2), NULL
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_update(''m130_treatment_transition'', ''cancelled'', 31, JSON_OBJECT(''step'', 2), NULL)',
  30322, '45000', 'terminal treatment is immutable',
  'terminal treatment rejects arbitrary progress modification'
);

-- -------------------------------------------------------------------------
-- Strict completion idempotence, valid child/grandchild and publication FK
-- -------------------------------------------------------------------------

CALL sp_media_treatment_start(
  'm130_treatment_complete',
  'm130_asset_local', 'm130_playable_local',
  'm130_output_child', 'Mission 130 output child', 'transcode',
  'transcode', 'Strict completion', 'm130-job-complete',
  'test-engine', '1', JSON_OBJECT('mission', 130)
);
CALL sp_media_treatment_update(
  'm130_treatment_complete', 'running', 90,
  JSON_OBJECT('phase', 'encode'), NULL
);
CALL sp_media_treatment_complete(
  'm130_treatment_complete',
  'm130_output_child', 'm130_output_source', 'm130_output_playable',
  'Mission 130 output child', 'transcode',
  'proto05-test', 'm130/output-child.mp4', 'video/mp4',
  4096, 1200, REPEAT('b', 64), 'test-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);
CALL sp_media_treatment_complete(
  'm130_treatment_complete',
  'm130_output_child', 'm130_output_source', 'm130_output_playable',
  'Mission 130 output child', 'transcode',
  'proto05-test', 'm130/output-child.mp4', 'video/mp4',
  4096, 1200, REPEAT('b', 64), 'test-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_complete(''m130_treatment_complete'', ''m130_output_child'', ''m130_output_source'', ''m130_output_playable'', ''Mission 130 output child'', ''transcode'', ''proto05-test'', ''m130/other-key.mp4'', ''video/mp4'', 4096, 1200, REPEAT(''b'',64), ''test-ffmpeg'', JSON_OBJECT(''phase'',''complete''))',
  30340, '45000', 'completed result mismatch',
  'completion replay rejects another storage key'
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_complete(''m130_treatment_complete'', ''m130_output_child'', ''m130_output_source'', ''m130_output_playable'', ''Mission 130 output child'', ''transcode'', ''proto05-test'', ''m130/output-child.mp4'', ''video/mp4'', 4096, 1200, REPEAT(''c'',64), ''test-ffmpeg'', JSON_OBJECT(''phase'',''complete''))',
  30340, '45000', 'completed result mismatch',
  'completion replay rejects another digest'
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_complete(''m130_treatment_complete'', ''m130_output_child'', ''m130_output_source'', ''m130_output_playable'', ''Mission 130 output child'', ''transcode'', ''proto05-test'', ''m130/output-child.mp4'', ''video/webm'', 8192, 1200, REPEAT(''b'',64), ''test-ffmpeg'', JSON_OBJECT(''phase'',''complete''))',
  30340, '45000', 'completed result mismatch',
  'completion replay rejects contradictory size and mime type'
);
CALL sp_m130_assert(
  (SELECT COUNT(*) FROM media_assets WHERE id = 'm130_output_child') = 1
  AND
  (SELECT COUNT(*) FROM media_playables
   WHERE id = 'm130_output_playable') = 1
  AND
  (SELECT COUNT(*) FROM media_sources
   WHERE id = 'm130_output_source') = 1,
  'strict completion replay creates no duplicate result'
);
CALL sp_m130_expect_error(
  'UPDATE media_treatments SET published_playable_id=''m130_playable_supp'' WHERE id=''m130_treatment_complete''',
  1452, '23000', 'fk_treatment_published_playable',
  'composite FK rejects published playable from another output asset'
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_update(''m130_treatment_complete'', ''running'', 90, JSON_OBJECT(''phase'',''encode''), NULL)',
  30322, '45000', 'terminal treatment is immutable',
  'completed treatment cannot return to active state'
);

CALL sp_media_treatment_start(
  'm130_treatment_grandchild',
  'm130_output_child', 'm130_output_playable',
  'm130_output_grandchild', 'Mission 130 output grandchild', 'transcode',
  'transcode', 'Second-level derivation', 'm130-job-grandchild',
  'test-engine', '1', JSON_OBJECT('mission', 130)
);
CALL sp_media_treatment_complete(
  'm130_treatment_grandchild',
  'm130_output_grandchild',
  'm130_output_source_grandchild',
  'm130_output_playable_grandchild',
  'Mission 130 output grandchild', 'transcode',
  'proto05-test', 'm130/output-grandchild.mp4', 'video/mp4',
  2048, 600, REPEAT('d', 64), 'test-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);
CALL sp_m130_assert(
  (SELECT parent_asset_id FROM media_assets
   WHERE id = 'm130_output_grandchild') = 'm130_output_child'
  AND
  (SELECT family_root_asset_id FROM media_assets
   WHERE id = 'm130_output_grandchild') = 'm130_asset_local',
  'valid media child and grandchild remain in one family'
);
CALL sp_m130_expect_error(
  'CALL sp_media_treatment_start(''m130_indirect_cycle_treatment'', ''m130_output_grandchild'', ''m130_output_playable_grandchild'', ''m130_output_child'', ''Indirect cycle'', ''test'', ''test'', ''Indirect cycle'', NULL, ''test'', ''1'', NULL)',
  30345, '45000', 'output asset already exists',
  'media procedure rejects reuse of an ancestor as output'
);

-- -------------------------------------------------------------------------
-- Non-empty authoring graph and read contract preconditions
-- -------------------------------------------------------------------------

INSERT INTO languages (id, code, label)
VALUES
  ('m130_fr', 'fr', 'French'),
  ('m130_en', 'en', 'English');

INSERT INTO activity_languages (
  activity_id, language_id, local_label, sort_order
)
VALUES
  ('m130_activity_root', 'm130_fr', 'Français', 10),
  ('m130_activity_root', 'm130_en', 'English', 20);

INSERT INTO activity_transcriptions (
  activity_id, id, language_id, label
)
VALUES (
  'm130_activity_root', 'm130_transcription', 'm130_fr',
  'Mission 130 transcription'
);

INSERT INTO activity_speakers (activity_id, id, label, sort_order)
VALUES
  ('m130_activity_root', 'm130_speaker_1', 'Speaker 1', 10),
  ('m130_activity_root', 'm130_speaker_2', 'Speaker 2', 20);

INSERT INTO activity_segments (
  activity_id, id, start_ms, end_ms, text, sort_order
)
VALUES
  ('m130_activity_root', 'm130_segment_1', 0, 5000, 'Bonjour', 10),
  ('m130_activity_root', 'm130_segment_2', 5000, 10000, 'Hello', 20);

INSERT INTO activity_segment_speakers (
  activity_id, segment_id, speaker_id
)
VALUES
  ('m130_activity_root', 'm130_segment_1', 'm130_speaker_1'),
  ('m130_activity_root', 'm130_segment_2', 'm130_speaker_2');

INSERT INTO activity_segment_languages (
  activity_id, segment_id, language_id
)
VALUES
  ('m130_activity_root', 'm130_segment_1', 'm130_fr'),
  ('m130_activity_root', 'm130_segment_2', 'm130_en');

INSERT INTO activity_language_intervals (
  activity_id, id, segment_id, language_id,
  start_ms, end_ms, sort_order
)
VALUES
  ('m130_activity_root', 'm130_interval_1',
   'm130_segment_1', 'm130_fr', 0, 5000, 10),
  ('m130_activity_root', 'm130_interval_2',
   'm130_segment_2', 'm130_en', 5000, 10000, 20);

INSERT INTO activity_layers (
  activity_id, id, label, description, color, sort_order
)
VALUES
  ('m130_activity_root', 'm130_layer_public',
   'Learner layer', 'Visible to learners', '#00aa00', 10),
  ('m130_activity_root', 'm130_layer_private',
   'Teacher layer', 'Author-only notes', '#aa0000', 20);

INSERT INTO activity_layer_visibility (
  activity_id, layer_id, audience, is_visible, is_default
)
VALUES
  ('m130_activity_root', 'm130_layer_public', 'learner', 1, 1),
  ('m130_activity_root', 'm130_layer_public', 'teacher', 1, 1),
  ('m130_activity_root', 'm130_layer_private', 'teacher', 1, 0);

INSERT INTO activity_phenomena (
  activity_id, id, segment_id, layer_id, start_ms, end_ms, sort_order
)
VALUES
  ('m130_activity_root', 'm130_phenomenon_public',
   'm130_segment_1', 'm130_layer_public', 1000, 2000, 10),
  ('m130_activity_root', 'm130_phenomenon_private',
   'm130_segment_2', 'm130_layer_private', 6000, 7000, 20);

INSERT INTO activity_annotations (
  activity_id, id, segment_id, note, pedagogical_question, sort_order
)
VALUES
  ('m130_activity_root', 'm130_annotation_public',
   'm130_segment_1', 'Author note', 'What do you notice?', 10),
  ('m130_activity_root', 'm130_annotation_private',
   'm130_segment_2', 'Private author note', 'Teacher only?', 20);

INSERT INTO activity_overlays (
  activity_id, id, annotation_id,
  start_ms, end_ms, title, text, sort_order
)
VALUES
  ('m130_activity_root', 'm130_overlay_public', 'm130_annotation_public',
   1000, 2000, 'Public overlay', 'Learner content', 10),
  ('m130_activity_root', 'm130_overlay_private', 'm130_annotation_private',
   6000, 7000, 'Private overlay', 'Teacher content', 20);

INSERT INTO activity_overlay_layers (
  activity_id, overlay_id, layer_id
)
VALUES
  ('m130_activity_root', 'm130_overlay_public', 'm130_layer_public'),
  ('m130_activity_root', 'm130_overlay_private', 'm130_layer_private');

INSERT INTO activity_pedagogical_text_fields (
  activity_id, field_key, knowledge_state, value_text, note
)
VALUES
  ('m130_activity_root', 'learning-objectives', 'known', 'Observe alternation', NULL),
  ('m130_activity_root', 'prerequisites', 'not-applicable', 'None', NULL),
  ('m130_activity_root', 'modalities', 'known', 'Pair work', NULL),
  ('m130_activity_root', 'recommended-scenario', 'known', 'Observe and discuss', NULL),
  ('m130_activity_root', 'pedagogical-core', 'known', 'Language awareness', NULL),
  ('m130_activity_root', 'adaptable-elements', 'known', 'Timing', NULL);

CALL sp_activity_update_metadata(
  'm130_activity_root', 5, 'published', 'Mission 130 bundle',
  'Non-empty read fixture', 'Observe', 'What changes?'
);

CALL sp_m130_assert(
  (SELECT COUNT(*) FROM activity_media_links
   WHERE activity_id = 'm130_activity_root' AND role = 'primary') = 1
  AND
  (SELECT COUNT(*) FROM activity_media_links
   WHERE activity_id = 'm130_activity_root'
     AND role = 'supplementary') = 2
  AND
  (SELECT storage_scope FROM media_playables
   WHERE id = 'm130_playable_local') = 'proto05-test'
  AND
  (SELECT location_url FROM media_playables
   WHERE id = 'm130_playable_remote')
    = 'https://example.invalid/video.mp4',
  'fixture contains ordered media with local and remote locators'
);
CALL sp_m130_assert(
  (SELECT COUNT(*) FROM activity_segments
   WHERE activity_id = 'm130_activity_root') = 2
  AND
  (SELECT COUNT(*) FROM activity_languages
   WHERE activity_id = 'm130_activity_root') = 2
  AND
  (SELECT COUNT(*) FROM activity_speakers
   WHERE activity_id = 'm130_activity_root') = 2
  AND
  (SELECT COUNT(*) FROM activity_language_intervals
   WHERE activity_id = 'm130_activity_root') = 2
  AND
  (SELECT COUNT(*) FROM activity_phenomena
   WHERE activity_id = 'm130_activity_root') = 2
  AND
  (SELECT COUNT(*) FROM activity_annotations
   WHERE activity_id = 'm130_activity_root') = 2,
  'fixture contains the complete non-empty authoring graph'
);
CALL sp_m130_assert(
  LOCATE(
    'mp.storage_scope',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_activity_get')
  ) > 0
  AND LOCATE(
    'mp.storage_key',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_student_activity_bundle')
  ) > 0,
  'activity and student contracts expose server-side local locators'
);
CALL sp_m130_assert(
  LOCATE(
    'learner_visibility.is_visible = 1',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_student_activity_bundle')
  ) > 0,
  'student contract statically excludes author-only overlay layers'
);
CALL sp_m130_assert(
  LOCATE(
    'DECLARE v_is_student_readable TINYINT(1) DEFAULT 0',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_student_activity_bundle')
  ) > 0
  AND LOCATE(
    'primary_playable.asset_id = primary_asset.id',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_student_activity_bundle')
  ) > 0
  AND LOCATE(
    'primary_playable.kind = ''local-file''',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_student_activity_bundle')
  ) > 0
  AND LOCATE(
    'primary_playable.kind <> ''local-file''',
    (SELECT routine_definition
     FROM information_schema.routines
     WHERE routine_schema = DATABASE()
       AND routine_name = 'sp_student_activity_bundle')
  ) > 0
  AND (
    CHAR_LENGTH(
      (SELECT routine_definition
       FROM information_schema.routines
       WHERE routine_schema = DATABASE()
         AND routine_name = 'sp_student_activity_bundle')
    )
    - CHAR_LENGTH(
      REPLACE(
        (SELECT routine_definition
         FROM information_schema.routines
         WHERE routine_schema = DATABASE()
           AND routine_name = 'sp_student_activity_bundle'),
        'v_is_student_readable = 1',
        ''
      )
    )
  ) = 12 * CHAR_LENGTH('v_is_student_readable = 1'),
  'student contract applies one complete readability gate to all 12 result sets'
);

-- Execute all structured contracts on the populated fixture. SQL clients
-- expose each result-set header and row; result-set metadata is also inspected
-- statically outside this script because SQL cannot capture CALL result sets
-- into tables portably.
CALL sp_activity_get('m130_activity_root');

SELECT 'BUNDLE_CASE_READABLE' AS bundle_case;
CALL sp_student_activity_bundle('m130_activity_root');

CALL sp_media_update_playable_availability(
  'm130_playable_local', 'missing-local', 'Mission 131 unavailable gate'
);
SELECT 'BUNDLE_CASE_UNAVAILABLE' AS bundle_case;
CALL sp_student_activity_bundle('m130_activity_root');

CALL sp_media_update_playable_availability(
  'm130_playable_local', 'available', NULL
);
SELECT 'BUNDLE_CASE_RESTORED' AS bundle_case;
CALL sp_student_activity_bundle('m130_activity_root');

UPDATE media_assets
SET lifecycle = 'archived'
WHERE id = 'm130_asset_local';
SELECT 'BUNDLE_CASE_ARCHIVED' AS bundle_case;
CALL sp_student_activity_bundle('m130_activity_root');

UPDATE media_assets
SET lifecycle = 'active'
WHERE id = 'm130_asset_local';
UPDATE media_assets
SET lifecycle = 'deleted',
    deleted_at = CURRENT_TIMESTAMP(3)
WHERE id = 'm130_asset_local';
SELECT 'BUNDLE_CASE_DELETED' AS bundle_case;
CALL sp_student_activity_bundle('m130_activity_root');

UPDATE media_assets
SET lifecycle = 'active',
    deleted_at = NULL
WHERE id = 'm130_asset_local';
UPDATE media_playables
SET availability = 'pending-removal',
    availability_reason = 'Mission 131 pending-removal gate'
WHERE id = 'm130_playable_local';
SELECT 'BUNDLE_CASE_PENDING_REMOVAL' AS bundle_case;
CALL sp_student_activity_bundle('m130_activity_root');

UPDATE media_playables
SET availability = 'available',
    availability_reason = NULL
WHERE id = 'm130_playable_local';
CALL sp_m130_assert(
  (SELECT lifecycle FROM media_assets
   WHERE id = 'm130_asset_local') = 'active'
  AND
  (SELECT deleted_at FROM media_assets
   WHERE id = 'm130_asset_local') IS NULL
  AND
  (SELECT availability FROM media_playables
   WHERE id = 'm130_playable_local') = 'available'
  AND
  (SELECT removed_at FROM media_playables
   WHERE id = 'm130_playable_local') IS NULL,
  'student bundle state probes restore the canonical fixture'
);
SELECT 'BUNDLE_CASE_END' AS bundle_case;

CALL sp_author_activity_bundle('m130_activity_root');
CALL sp_media_get('m130_asset_local');
CALL sp_activity_library_search(NULL, 'published', NULL, NULL, 'title-asc', 20, 0);
CALL sp_media_library_search(NULL, NULL, NULL, NULL, NULL, 'title-asc', 50, 0);

CALL sp_storage_file_removal_fail(
  'm130_storage_pending', 'Mission 130 cleanup restoration'
);

INSERT INTO import_runs (
  id, source_kind, source_digest, source_label,
  status, dry_run, started_at, finished_at
)
VALUES
  ('m130_import_1', 'activity-json', REPEAT('a', 64), 'same snapshot',
   'validated', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('m130_import_2', 'activity-json', REPEAT('a', 64), 'same snapshot',
   'validated', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
CALL sp_m130_assert(
  (SELECT COUNT(*) FROM import_runs
   WHERE source_kind = 'activity-json'
     AND source_digest = REPEAT('a', 64)) = 2,
  'import history remains repeatable'
);

CALL sp_m130_cleanup();
CALL sp_m130_assert(
  (SELECT COUNT(*) FROM activities WHERE id LIKE 'm130\_%') = 0
  AND
  (SELECT COUNT(*) FROM media_assets WHERE id LIKE 'm130\_%') = 0
  AND
  (SELECT COUNT(*) FROM import_runs WHERE id LIKE 'm130\_%') = 0,
  'all Mission 130 persistent fixture rows are removed with FK checks active'
);

DROP PROCEDURE sp_m130_cleanup;
DROP PROCEDURE sp_m130_expect_error;
DROP PROCEDURE sp_m130_probe_error;
DROP PROCEDURE sp_m130_assert;

SELECT 'MISSION_130_VALIDATION_COMPLETE' AS result;
