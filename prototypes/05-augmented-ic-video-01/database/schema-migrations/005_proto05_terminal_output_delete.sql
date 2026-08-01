-- Mission 165: canonical removal of one terminal treatment and its local output.
-- Additive only: migrations 001 to 004 remain byte-for-byte unchanged.

DELIMITER $$

CREATE PROCEDURE sp_media_terminal_output_delete(
  IN p_asset_id VARCHAR(191),
  IN p_treatment_id VARCHAR(191),
  IN p_playable_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_status VARCHAR(32);
  DECLARE v_output_asset_id VARCHAR(191);
  DECLARE v_output_playable_id VARCHAR(191);
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

  SELECT status, output_asset_id, output_playable_id
  INTO v_status, v_output_asset_id, v_output_playable_id
  FROM media_treatments
  WHERE id = p_treatment_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30501,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: treatment not found';
  END IF;

  IF v_status NOT IN ('completed', 'failed', 'cancelled', 'interrupted') THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30502,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: treatment is not terminal';
  END IF;

  IF NOT (v_output_asset_id <=> p_asset_id)
     OR NOT (v_output_playable_id <=> p_playable_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30503,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: output identity mismatch';
  END IF;

  SELECT source_id, storage_scope, storage_key
  INTO v_source_id, v_storage_scope, v_storage_key
  FROM media_playables
  WHERE id = p_playable_id
    AND asset_id = p_asset_id
    AND kind = 'local-file'
    AND role = 'derivation-local'
    AND removed_at IS NULL
  FOR UPDATE;

  IF v_source_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30504,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: active local output not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM activity_media_links
    WHERE media_playable_id = p_playable_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30505,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: output used by activity';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_treatments
    WHERE id <> p_treatment_id
      AND (
        source_playable_id = p_playable_id
        OR output_playable_id = p_playable_id
        OR published_playable_id = p_playable_id
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30506,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: output used by another treatment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_audio_anonymization_plans
    WHERE source_playable_id = p_playable_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30507,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: output used by audio plan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM media_playables
    WHERE id <> p_playable_id
      AND storage_scope <=> v_storage_scope
      AND storage_key <=> v_storage_key
      AND removed_at IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30508,
          MESSAGE_TEXT = 'sp_media_terminal_output_delete: storage shared by another playable';
  END IF;

  UPDATE media_assets
  SET default_playable_id = CASE
        WHEN default_playable_id = p_playable_id THEN (
          SELECT candidate.id
          FROM media_playables candidate
          WHERE candidate.asset_id = p_asset_id
            AND candidate.id <> p_playable_id
            AND candidate.removed_at IS NULL
          ORDER BY
            CASE candidate.role
              WHEN 'original-remote' THEN 1
              WHEN 'working-copy' THEN 2
              WHEN 'published-remote' THEN 3
              ELSE 4
            END,
            candidate.created_at,
            candidate.id
          LIMIT 1
        )
        ELSE default_playable_id
      END,
      updated_at = CURRENT_TIMESTAMP(3)
  WHERE id = p_asset_id
    AND deleted_at IS NULL;

  DELETE FROM storage_operations WHERE playable_id = p_playable_id;
  DELETE FROM media_treatments WHERE id = p_treatment_id;
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

  SELECT p_asset_id AS asset_id, p_treatment_id AS treatment_id,
         p_playable_id AS playable_id, v_source_id AS removed_source_id;
END$$

DELIMITER ;
