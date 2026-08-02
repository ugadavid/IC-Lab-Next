-- Mission 186: refuse asset deletion explicitly when an audio plan keeps a playable alive.
-- The self/root and parent references disappear with the row; only the
-- default playable must be cleared before deleting its playable children.

DELIMITER $$

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

  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN
    START TRANSACTION;
  END IF;

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
      AND (source_asset_id = p_asset_id OR output_asset_id = p_asset_id)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30333,
          MESSAGE_TEXT = 'sp_media_asset_delete: active treatment uses asset';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM media_audio_anonymization_plans plan
    WHERE plan.source_asset_id = p_asset_id
       OR plan.source_playable_id IN (
         SELECT id FROM media_playables WHERE asset_id = p_asset_id
       )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30508,
          MESSAGE_TEXT = 'sp_media_asset_delete: asset used by audio anonymization plan';
  END IF;

  DELETE FROM media_treatments
  WHERE source_asset_id = p_asset_id OR output_asset_id = p_asset_id;

  DELETE operation
  FROM storage_operations operation
  INNER JOIN media_playables playable ON playable.id = operation.playable_id
  WHERE playable.asset_id = p_asset_id;

  DELETE FROM activity_media_links WHERE media_asset_id = p_asset_id;

  UPDATE media_assets
  SET default_playable_id = NULL
  WHERE id = p_asset_id;

  DELETE FROM media_playables WHERE asset_id = p_asset_id;
  DELETE FROM media_sources WHERE asset_id = p_asset_id;
  DELETE FROM media_assets WHERE id = p_asset_id;

  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN
    COMMIT;
  END IF;

  SELECT p_asset_id AS id, 'deleted' AS lifecycle,
         CURRENT_TIMESTAMP(3) AS deleted_at;
END$$

DELIMITER ;
