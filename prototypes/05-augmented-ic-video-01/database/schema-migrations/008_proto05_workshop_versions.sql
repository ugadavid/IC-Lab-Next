-- Instantanés explicites du montage image et son. Le média reste dans son espace d'origine.
CREATE TABLE media_workshop_versions (
  sequence_no BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id VARCHAR(36) NOT NULL,
  source_asset_id VARCHAR(191) NOT NULL,
  source_playable_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  project_json LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_workshop_version_id (id),
  KEY idx_workshop_source (source_asset_id, source_playable_id, sequence_no),
  CONSTRAINT fk_workshop_source FOREIGN KEY (source_asset_id, source_playable_id)
    REFERENCES media_playables (asset_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$
CREATE PROCEDURE `sp_workshop_version_read`(
  IN p_asset VARCHAR(191),
  IN p_playable VARCHAR(191),
  IN p_id VARCHAR(36)
)
BEGIN
  IF p_id IS NULL THEN
    SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS createdAt
    FROM media_workshop_versions
    WHERE source_asset_id = p_asset AND source_playable_id = p_playable
    ORDER BY sequence_no DESC;
  ELSE
    SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS createdAt, project_json
    FROM media_workshop_versions
    WHERE source_asset_id = p_asset AND source_playable_id = p_playable AND id = p_id;
  END IF;
END$$

CREATE PROCEDURE `sp_workshop_version_save`(
  IN p_asset VARCHAR(191),
  IN p_playable VARCHAR(191),
  IN p_id VARCHAR(36),
  IN p_name VARCHAR(191),
  IN p_project JSON
)
BEGIN
  IF JSON_VALID(p_project) <> 1
     OR NOT (BINARY JSON_UNQUOTE(JSON_EXTRACT(p_project, '$.assetId')) <=> BINARY p_asset)
     OR NOT (BINARY JSON_UNQUOTE(JSON_EXTRACT(p_project, '$.playableId')) <=> BINARY p_playable) THEN
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30542, MESSAGE_TEXT = 'Workshop project/source mismatch';
  END IF;
  INSERT INTO media_workshop_versions (id, source_asset_id, source_playable_id, name, project_json, created_at)
  VALUES (p_id, p_asset, p_playable, p_name, p_project, UTC_TIMESTAMP(3))
  ON DUPLICATE KEY UPDATE id = media_workshop_versions.id;

  IF NOT EXISTS (
    SELECT 1 FROM media_workshop_versions
    WHERE id = p_id AND source_asset_id = p_asset AND source_playable_id = p_playable
      AND BINARY name = BINARY p_name AND BINARY project_json = BINARY p_project
  ) THEN
    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30543, MESSAGE_TEXT = 'Workshop save identifier already used';
  END IF;
  SELECT id, name, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS createdAt
  FROM media_workshop_versions WHERE id = p_id AND source_asset_id = p_asset AND source_playable_id = p_playable;
END$$
DELIMITER ;
