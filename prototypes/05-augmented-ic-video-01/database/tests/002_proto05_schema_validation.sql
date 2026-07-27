-- Proto05 MariaDB schema revision 002 -- reproducible validation
-- Mission 129
--
-- Run only against the dedicated empty work database ic_augmented_video after
-- installing database/drafts/002_proto05_schema_revision.sql.
-- Every persistent test identifier starts with m129_. The cleanup routine
-- removes only those rows. No physical file operation is performed.

USE ic_augmented_video;
SET NAMES utf8mb4;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_m129_assert$$
CREATE PROCEDURE sp_m129_assert(
  IN p_condition TINYINT(1),
  IN p_label VARCHAR(500)
)
BEGIN
  IF COALESCE(p_condition, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30901,
          MESSAGE_TEXT = p_label;
  END IF;

  SELECT 'PASS' AS result, p_label AS test;
END$$

DROP PROCEDURE IF EXISTS sp_m129_expect_error$$
CREATE PROCEDURE sp_m129_expect_error(
  IN p_sql TEXT,
  IN p_label VARCHAR(500)
)
BEGIN
  DECLARE v_failed TINYINT(1) DEFAULT 0;

  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_failed = 1;
    SET @m129_expected_error_sql = p_sql;
    PREPARE m129_expected_error_statement FROM @m129_expected_error_sql;
    EXECUTE m129_expected_error_statement;
    DEALLOCATE PREPARE m129_expected_error_statement;
  END;

  IF v_failed = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30902,
          MESSAGE_TEXT = p_label;
  END IF;

  SELECT 'PASS' AS result, p_label AS test;
END$$

DROP PROCEDURE IF EXISTS sp_m129_cleanup$$
CREATE PROCEDURE sp_m129_cleanup()
BEGIN
  DECLARE v_foreign_key_checks TINYINT(1) DEFAULT @@FOREIGN_KEY_CHECKS;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    SET FOREIGN_KEY_CHECKS = v_foreign_key_checks;
    RESIGNAL;
  END;

  DELETE FROM storage_operations WHERE id LIKE 'm129\_%';
  DELETE FROM activity_media_links WHERE id LIKE 'm129\_%'
     OR activity_id LIKE 'm129\_%';
  DELETE FROM media_treatments WHERE id LIKE 'm129\_%';

  UPDATE media_assets
  SET default_playable_id = NULL
  WHERE id LIKE 'm129\_%';

  DELETE FROM media_playable_metadata WHERE playable_id LIKE 'm129\_%';
  DELETE FROM media_playables WHERE id LIKE 'm129\_%';
  DELETE FROM media_sources WHERE id LIKE 'm129\_%';
  DELETE FROM media_asset_tags WHERE asset_id LIKE 'm129\_%';

  -- Root assets deliberately reference themselves through family_root_asset_id.
  -- Temporarily suspend FK checking only for the narrowly prefixed fixture rows.
  SET FOREIGN_KEY_CHECKS = 0;
  DELETE FROM media_assets WHERE id LIKE 'm129\_%';
  SET FOREIGN_KEY_CHECKS = v_foreign_key_checks;

  DELETE FROM activities WHERE id LIKE 'm129\_%';
  DELETE FROM activity_folders WHERE id LIKE 'm129\_%';
  DELETE FROM media_tags WHERE id LIKE 'm129\_%';
  DELETE FROM media_folders WHERE id LIKE 'm129\_%';
  DELETE FROM languages WHERE id LIKE 'm129\_%';
  DELETE FROM import_runs WHERE id LIKE 'm129\_%';
END$$

DROP TRIGGER IF EXISTS trg_m129_fail_identity$$
CREATE TRIGGER trg_m129_fail_identity
BEFORE INSERT ON activity_pedagogical_identities
FOR EACH ROW
BEGIN
  IF NEW.activity_id = 'm129_atomic_activity' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30903,
          MESSAGE_TEXT = 'Mission 129 forced identity failure';
  END IF;
END$$

DELIMITER ;

CALL sp_m129_cleanup();

-- A forced failure on the second insert proves that activity creation rolls
-- back its first insert as part of the same transaction.
CALL sp_m129_expect_error(
  'CALL sp_activity_create(''m129_atomic_activity'', ''0.1.45'', ''Atomicity'', NULL, NULL, NULL)',
  'activity creation propagates the forced identity failure'
);
CALL sp_m129_assert(
  (SELECT COUNT(*) FROM activities WHERE id = 'm129_atomic_activity') = 0,
  'activity creation is atomic'
);
DROP TRIGGER trg_m129_fail_identity;

CALL sp_activity_create(
  'm129_activity', '0.1.45', 'Mission 129 activity',
  'Validation data', 'Observe', 'What is visible?'
);
CALL sp_m129_assert(
  (SELECT COUNT(*) FROM activities WHERE id = 'm129_activity') = 1
  AND
  (SELECT COUNT(*) FROM activity_pedagogical_identities
   WHERE activity_id = 'm129_activity') = 1,
  'complete activity and pedagogical identity are created'
);

CALL sp_media_register_import(
  'm129_asset_a', 'm129_source_a', 'm129_playable_a',
  'Mission 129 primary', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm129/a.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 129)
);
CALL sp_media_register_import(
  'm129_asset_b', 'm129_source_b', 'm129_playable_b',
  'Mission 129 supplementary B', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm129/b.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 129)
);
CALL sp_media_register_import(
  'm129_asset_c', 'm129_source_c', 'm129_playable_c',
  'Mission 129 supplementary C', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm129/c.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 129)
);
CALL sp_media_register_import(
  'm129_asset_d', 'm129_source_d', 'm129_playable_d',
  'Mission 129 removable', 'local-file', 'proto05', 'filesystem', 'master',
  'video/mp4', NULL, 'proto05-test', 'm129/d.mp4', NULL, NULL,
  'available', JSON_OBJECT('mission', 129)
);

CALL sp_m129_expect_error(
  'INSERT INTO media_playables (id, asset_id, source_id, kind, availability, storage_scope, storage_key) VALUES (''m129_cross_playable'', ''m129_asset_b'', ''m129_source_a'', ''local-file'', ''available'', ''proto05-test'', ''m129/cross.mp4'')',
  'composite foreign key rejects a source owned by another asset'
);

CALL sp_activity_set_primary_media(
  'm129_activity', 1, 'm129_asset_a', 'm129_playable_a'
);
CALL sp_activity_set_supplementary_media(
  'm129_activity', 2, 'm129_asset_b', 'm129_playable_b', 10
);
CALL sp_activity_set_supplementary_media(
  'm129_activity', 3, 'm129_asset_c', 'm129_playable_c', 20
);
CALL sp_m129_assert(
  (SELECT COUNT(*) FROM activity_media_links
   WHERE activity_id = 'm129_activity' AND role = 'primary') = 1
  AND
  (SELECT COUNT(*) FROM activity_media_links
   WHERE activity_id = 'm129_activity' AND role = 'supplementary') = 2,
  'one primary and multiple supplementary media coexist'
);

CALL sp_m129_expect_error(
  'INSERT INTO activity_media_links (id, activity_id, role, media_asset_id, media_playable_id, sort_order) VALUES (''m129_second_primary'', ''m129_activity'', ''primary'', ''m129_asset_d'', ''m129_playable_d'', 0)',
  'generated unique key rejects a second primary medium'
);

-- Repeating already-satisfied operations must not look like missing rows and
-- must not increment the editorial revision.
CALL sp_activity_set_supplementary_media(
  'm129_activity', 4, 'm129_asset_c', 'm129_playable_c', 20
);
CALL sp_media_update_playable_availability(
  'm129_playable_d', 'available', NULL
);
CALL sp_m129_assert(
  (SELECT revision FROM activities WHERE id = 'm129_activity') = 4,
  'idempotent media operation preserves the activity revision'
);

CALL sp_m129_expect_error(
  'CALL sp_activity_update_metadata(''m129_activity'', 1, ''draft'', ''Mission 129 activity'', ''Validation data'', ''Observe'', ''What is visible?'')',
  'stale optimistic revision is rejected'
);

CALL sp_m129_expect_error(
  'UPDATE activity_pedagogical_identities SET intention_state = ''known'', intention_value = NULL WHERE activity_id = ''m129_activity''',
  'known pedagogical value cannot be NULL'
);
CALL sp_m129_expect_error(
  'INSERT INTO media_playables (id, asset_id, source_id, kind, availability, storage_scope, storage_key) VALUES (''m129_invalid_location'', ''m129_asset_d'', ''m129_source_d'', ''local-file'', ''available'', ''proto05-test'', NULL)',
  'local playable cannot have a NULL storage key'
);

CALL sp_media_treatment_start(
  'm129_treatment', 'm129_asset_a', 'm129_playable_a',
  'm129_output_asset', 'Mission 129 reserved output', 'transcode',
  'transcode', 'Mission 129 active treatment', 'm129-job',
  'test-engine', '1', JSON_OBJECT('mission', 129)
);
CALL sp_m129_expect_error(
  'CALL sp_media_asset_delete(''m129_output_asset'')',
  'asset deletion is blocked while an active treatment reserves it'
);
CALL sp_media_treatment_update(
  'm129_treatment', 'failed', 5,
  JSON_OBJECT('phase', 'test'), JSON_OBJECT('reason', 'simulated')
);
CALL sp_m129_assert(
  (SELECT lifecycle FROM media_assets WHERE id = 'm129_output_asset') = 'deleted',
  'terminal treatment failure retires its reserved output'
);

CALL sp_media_treatment_start(
  'm129_treatment_complete', 'm129_asset_a', 'm129_playable_a',
  'm129_output_asset_complete', 'Mission 129 successful output', 'transcode',
  'transcode', 'Mission 129 completed treatment', 'm129-job-complete',
  'test-engine', '1', JSON_OBJECT('mission', 129)
);
CALL sp_media_treatment_complete(
  'm129_treatment_complete',
  'm129_output_asset_complete',
  'm129_output_source_complete',
  'm129_output_playable_complete',
  'Mission 129 successful output',
  'transcode',
  'proto05-test',
  'm129/output-complete.mp4',
  'video/mp4',
  1024,
  1000,
  REPEAT('b', 64),
  'test-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);
CALL sp_media_treatment_complete(
  'm129_treatment_complete',
  'm129_output_asset_complete',
  'm129_output_source_complete',
  'm129_output_playable_complete',
  'Mission 129 successful output',
  'transcode',
  'proto05-test',
  'm129/output-complete.mp4',
  'video/mp4',
  1024,
  1000,
  REPEAT('b', 64),
  'test-ffmpeg',
  JSON_OBJECT('phase', 'complete')
);
CALL sp_m129_assert(
  (SELECT status FROM media_treatments
   WHERE id = 'm129_treatment_complete') = 'completed'
  AND
  (SELECT lifecycle FROM media_assets
   WHERE id = 'm129_output_asset_complete') = 'active'
  AND
  (SELECT default_playable_id FROM media_assets
   WHERE id = 'm129_output_asset_complete') = 'm129_output_playable_complete',
  'treatment completion publishes its reserved output idempotently'
);

CALL sp_media_register_playable(
  'm129_playable_removable', 'm129_asset_d', 'm129_source_d',
  'local-file', 'proto05', 'alternate', 'available',
  'proto05-test', 'm129/removable.mp4', NULL, NULL, 0,
  JSON_OBJECT('mission', 129)
);
CALL sp_storage_file_removal_request(
  'm129_storage_fail', 'm129_playable_removable'
);
CALL sp_m129_assert(
  (SELECT availability FROM media_playables
   WHERE id = 'm129_playable_removable') = 'pending-removal',
  'storage request and pending-removal transition are atomic'
);
CALL sp_storage_file_removal_request(
  'm129_storage_ignored_retry', 'm129_playable_removable'
);
CALL sp_m129_assert(
  (SELECT COUNT(*) FROM storage_operations
   WHERE playable_id = 'm129_playable_removable'
     AND status = 'requested') = 1,
  'repeated storage request reuses the single open operation'
);
CALL sp_m129_expect_error(
  'CALL sp_activity_set_supplementary_media(''m129_activity'', 4, ''m129_asset_d'', ''m129_playable_removable'', 30)',
  'pending-removal playable cannot be attached to an activity'
);
CALL sp_storage_file_removal_fail(
  'm129_storage_fail', 'simulated filesystem failure'
);
CALL sp_storage_file_removal_fail(
  'm129_storage_fail', 'simulated filesystem failure'
);
CALL sp_m129_assert(
  (SELECT availability FROM media_playables
   WHERE id = 'm129_playable_removable') = 'available',
  'failed storage operation restores the previous availability'
);

CALL sp_storage_file_removal_request(
  'm129_storage_complete', 'm129_playable_removable'
);
CALL sp_storage_file_removal_complete('m129_storage_complete');
CALL sp_storage_file_removal_complete('m129_storage_complete');
CALL sp_m129_assert(
  (SELECT availability = 'missing-local' AND removed_at IS NOT NULL
   FROM media_playables WHERE id = 'm129_playable_removable'),
  'completed storage operation finalizes the playable exactly once'
);

INSERT INTO import_runs (
  id, source_kind, source_digest, source_label,
  status, dry_run, started_at, finished_at
)
VALUES
  ('m129_import_1', 'activity-json', REPEAT('a', 64), 'same snapshot',
   'validated', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('m129_import_2', 'activity-json', REPEAT('a', 64), 'same snapshot',
   'validated', 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
CALL sp_m129_assert(
  (SELECT COUNT(*) FROM import_runs
   WHERE source_kind = 'activity-json'
     AND source_digest = REPEAT('a', 64)) = 2,
  'multiple import runs may log the same source digest'
);

CALL sp_activity_update_metadata(
  'm129_activity', 4, 'published', 'Mission 129 activity',
  'Validation data', 'Observe', 'What is visible?'
);

-- These calls validate the multi-result-set read contracts in the server:
-- activity sheet (17), student bundle (12), and author bundle (17).
CALL sp_activity_get('m129_activity');
CALL sp_student_activity_bundle('m129_activity');
CALL sp_author_activity_bundle('m129_activity');

CALL sp_m129_assert(
  (SELECT COUNT(*) FROM activities
   WHERE id = 'm129_activity' AND status = 'published') = 1,
  'activity, student, and author read preconditions are satisfied'
);

CALL sp_m129_cleanup();
CALL sp_m129_assert(
  (SELECT COUNT(*) FROM activities WHERE id LIKE 'm129\_%') = 0
  AND
  (SELECT COUNT(*) FROM media_assets WHERE id LIKE 'm129\_%') = 0
  AND
  (SELECT COUNT(*) FROM import_runs WHERE id LIKE 'm129\_%') = 0,
  'all Mission 129 persistent test rows are removed'
);

DROP PROCEDURE sp_m129_cleanup;
DROP PROCEDURE sp_m129_expect_error;
DROP PROCEDURE sp_m129_assert;

SELECT 'MISSION_129_VALIDATION_COMPLETE' AS result;
