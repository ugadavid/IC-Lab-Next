-- Mission 164: canonical removal of one unreferenced local working copy.
-- Additive only: migrations 001 to 003 remain byte-for-byte unchanged.

DELIMITER $$

CREATE PROCEDURE sp_media_working_copy_delete(
  IN p_asset_id VARCHAR(191),
  IN p_playable_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_source_id VARCHAR(191);
  DECLARE v_storage_scope VARCHAR(64);
  DECLARE v_storage_key VARCHAR(768);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN
    START TRANSACTION;
  END IF;

  SELECT source_id, storage_scope, storage_key
  INTO v_source_id, v_storage_scope, v_storage_key
  FROM media_playables
  WHERE id = p_playable_id
    AND asset_id = p_asset_id
    AND kind = 'local-file'
    AND role = 'working-copy'
    AND removed_at IS NULL
  FOR UPDATE;

  IF v_source_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30401,
          MESSAGE_TEXT = 'sp_media_working_copy_delete: active working copy not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM activity_media_links
    WHERE media_playable_id = p_playable_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30402,
          MESSAGE_TEXT = 'sp_media_working_copy_delete: playable used by activity';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_treatments
    WHERE source_playable_id = p_playable_id
       OR output_playable_id = p_playable_id
       OR published_playable_id = p_playable_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30403,
          MESSAGE_TEXT = 'sp_media_working_copy_delete: playable used by treatment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_audio_anonymization_plans
    WHERE source_playable_id = p_playable_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30404,
          MESSAGE_TEXT = 'sp_media_working_copy_delete: playable used by audio plan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_playables
    WHERE id <> p_playable_id
      AND storage_scope <=> v_storage_scope
      AND storage_key <=> v_storage_key
      AND removed_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30405,
          MESSAGE_TEXT = 'sp_media_working_copy_delete: storage shared by another playable';
  END IF;

  UPDATE media_assets
  SET default_playable_id = (
        SELECT candidate.id
        FROM media_playables candidate
        WHERE candidate.asset_id = p_asset_id
          AND candidate.id <> p_playable_id
          AND candidate.removed_at IS NULL
        ORDER BY
          CASE candidate.role
            WHEN 'original-remote' THEN 1
            WHEN 'published-remote' THEN 2
            ELSE 3
          END,
          candidate.created_at,
          candidate.id
        LIMIT 1
      ),
      updated_at = CURRENT_TIMESTAMP(3)
  WHERE id = p_asset_id
    AND default_playable_id = p_playable_id;

  DELETE FROM storage_operations WHERE playable_id = p_playable_id;
  DELETE FROM media_playables WHERE id = p_playable_id AND asset_id = p_asset_id;
  DELETE FROM media_sources
  WHERE id = v_source_id
    AND asset_id = p_asset_id
    AND NOT EXISTS (
      SELECT 1 FROM media_playables WHERE source_id = v_source_id
    );

  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN
    COMMIT;
  END IF;

  SELECT p_asset_id AS asset_id, p_playable_id AS playable_id,
         v_source_id AS removed_source_id;
END$$

DELIMITER ;
