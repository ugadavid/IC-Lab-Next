-- Mission 156: persisted multi-zone audio anonymization plans and inline derivations.
-- Additive only: migrations 001 and 002 remain byte-for-byte unchanged.

CREATE TABLE media_audio_anonymization_plans (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  source_asset_id       VARCHAR(191) NOT NULL,
  source_playable_id    VARCHAR(191) NOT NULL,
  duration_ms           BIGINT UNSIGNED NOT NULL,
  revision              BIGINT UNSIGNED NOT NULL DEFAULT 1,
  last_treatment_id     VARCHAR(191) NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_audio_plan_source UNIQUE (source_asset_id, source_playable_id),
  CONSTRAINT chk_audio_plan_duration CHECK (duration_ms > 0),
  CONSTRAINT chk_audio_plan_revision CHECK (revision > 0),
  CONSTRAINT fk_audio_plan_source_playable
    FOREIGN KEY (source_asset_id, source_playable_id)
    REFERENCES media_playables(asset_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_audio_plan_last_treatment
    FOREIGN KEY (last_treatment_id) REFERENCES media_treatments(id)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_audio_anonymization_passages (
  id                    VARCHAR(191) NOT NULL PRIMARY KEY,
  plan_id               VARCHAR(191) NOT NULL,
  sort_order            INT UNSIGNED NOT NULL,
  start_ms              BIGINT UNSIGNED NOT NULL,
  end_ms                BIGINT UNSIGNED NOT NULL,
  replacement_type      VARCHAR(32) NOT NULL,
  label                 VARCHAR(500) NULL,
  reason                TEXT NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                          ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_audio_passage_order UNIQUE (plan_id, sort_order),
  CONSTRAINT chk_audio_passage_range CHECK (end_ms > start_ms),
  CONSTRAINT chk_audio_passage_type
    CHECK (replacement_type IN ('soft-tone', 'beep', 'silence')),
  CONSTRAINT fk_audio_passage_plan
    FOREIGN KEY (plan_id) REFERENCES media_audio_anonymization_plans(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audio_passages_timeline
  ON media_audio_anonymization_passages(plan_id, start_ms, end_ms, id);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_audio_anonymization_plan_get$$
CREATE PROCEDURE sp_audio_anonymization_plan_get(
  IN p_plan_id VARCHAR(191),
  IN p_source_asset_id VARCHAR(191),
  IN p_source_playable_id VARCHAR(191)
)
SQL SECURITY DEFINER
BEGIN
  SELECT p.*
  FROM media_audio_anonymization_plans p
  WHERE (p_plan_id IS NOT NULL AND p.id = p_plan_id)
     OR (p_plan_id IS NULL
         AND p.source_asset_id = p_source_asset_id
         AND p.source_playable_id = p_source_playable_id)
  ORDER BY p.updated_at DESC, p.id
  LIMIT 1;

  SELECT passage.*
  FROM media_audio_anonymization_passages passage
  INNER JOIN media_audio_anonymization_plans plan ON plan.id = passage.plan_id
  WHERE (p_plan_id IS NOT NULL AND plan.id = p_plan_id)
     OR (p_plan_id IS NULL
         AND plan.source_asset_id = p_source_asset_id
         AND plan.source_playable_id = p_source_playable_id)
  ORDER BY passage.start_ms, passage.end_ms, passage.id;
END$$

DROP PROCEDURE IF EXISTS sp_audio_anonymization_plan_save$$
CREATE PROCEDURE sp_audio_anonymization_plan_save(
  IN p_plan_id VARCHAR(191),
  IN p_source_asset_id VARCHAR(191),
  IN p_source_playable_id VARCHAR(191),
  IN p_duration_ms BIGINT UNSIGNED,
  IN p_expected_revision BIGINT UNSIGNED,
  IN p_passages_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_revision BIGINT UNSIGNED DEFAULT 0;
  DECLARE v_index INT DEFAULT 0;
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_id VARCHAR(191);
  DECLARE v_start BIGINT UNSIGNED;
  DECLARE v_end BIGINT UNSIGNED;
  DECLARE v_previous_end BIGINT UNSIGNED DEFAULT 0;
  DECLARE v_type VARCHAR(32);
  DECLARE v_label VARCHAR(500);
  DECLARE v_reason TEXT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN ROLLBACK; END IF;
    RESIGNAL;
  END;

  IF COALESCE(TRIM(p_plan_id), '') = ''
     OR COALESCE(TRIM(p_source_asset_id), '') = ''
     OR COALESCE(TRIM(p_source_playable_id), '') = ''
     OR p_duration_ms IS NULL OR p_duration_ms = 0
     OR p_expected_revision IS NULL
     OR JSON_VALID(p_passages_json) = 0
     OR JSON_TYPE(p_passages_json) <> 'ARRAY'
     OR JSON_LENGTH(p_passages_json) > 200 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30501,
          MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: invalid plan';
  END IF;

  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN START TRANSACTION; END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM media_assets asset
    INNER JOIN media_playables playable
      ON playable.asset_id = asset.id
     AND playable.id = p_source_playable_id
    WHERE asset.id = p_source_asset_id
      AND asset.deleted_at IS NULL
      AND playable.removed_at IS NULL
      AND playable.availability IN ('available', 'unknown')
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30502,
          MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: source unavailable';
  END IF;

  SELECT COUNT(*), COALESCE(MAX(revision), 0)
    INTO v_exists, v_revision
  FROM media_audio_anonymization_plans
  WHERE id = p_plan_id
  FOR UPDATE;

  IF v_exists = 0 THEN
    IF p_expected_revision <> 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30503,
            MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: stale plan';
    END IF;
    IF EXISTS (
      SELECT 1 FROM media_audio_anonymization_plans
      WHERE source_asset_id = p_source_asset_id
        AND source_playable_id = p_source_playable_id
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30504,
            MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: source plan already exists';
    END IF;
    INSERT INTO media_audio_anonymization_plans (
      id, source_asset_id, source_playable_id, duration_ms, revision
    ) VALUES (
      p_plan_id, p_source_asset_id, p_source_playable_id, p_duration_ms, 1
    );
    SET v_revision = 1;
  ELSE
    IF v_revision <> p_expected_revision THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30503,
            MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: stale plan';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM media_audio_anonymization_plans
      WHERE id = p_plan_id
        AND source_asset_id = p_source_asset_id
        AND source_playable_id = p_source_playable_id
      FOR UPDATE
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30505,
            MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: source mismatch';
    END IF;
    SET v_revision = v_revision + 1;
    UPDATE media_audio_anonymization_plans
    SET duration_ms = p_duration_ms,
        revision = v_revision
    WHERE id = p_plan_id;
    DELETE FROM media_audio_anonymization_passages WHERE plan_id = p_plan_id;
  END IF;

  SET v_count = JSON_LENGTH(p_passages_json);
  WHILE v_index < v_count DO
    SET v_id = JSON_UNQUOTE(JSON_EXTRACT(p_passages_json, CONCAT('$[', v_index, '].id')));
    SET v_start = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_passages_json, CONCAT('$[', v_index, '].startMs'))) AS UNSIGNED);
    SET v_end = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_passages_json, CONCAT('$[', v_index, '].endMs'))) AS UNSIGNED);
    SET v_type = JSON_UNQUOTE(JSON_EXTRACT(p_passages_json, CONCAT('$[', v_index, '].replacementType')));
    SET v_label = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_passages_json, CONCAT('$[', v_index, '].label'))), 'null');
    SET v_reason = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_passages_json, CONCAT('$[', v_index, '].reason'))), 'null');
    IF COALESCE(TRIM(v_id), '') = ''
       OR v_start IS NULL OR v_end IS NULL OR v_end <= v_start
       OR v_end > p_duration_ms OR v_start < v_previous_end
       OR v_type NOT IN ('soft-tone', 'beep', 'silence') THEN
      SIGNAL SQLSTATE '45000'
        SET MYSQL_ERRNO = 30506,
            MESSAGE_TEXT = 'sp_audio_anonymization_plan_save: invalid passage';
    END IF;
    INSERT INTO media_audio_anonymization_passages (
      id, plan_id, sort_order, start_ms, end_ms,
      replacement_type, label, reason
    ) VALUES (
      v_id, p_plan_id, v_index, v_start, v_end,
      v_type, v_label, v_reason
    );
    SET v_previous_end = v_end;
    SET v_index = v_index + 1;
  END WHILE;

  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN COMMIT; END IF;

  SELECT p.* FROM media_audio_anonymization_plans p WHERE p.id = p_plan_id;
  SELECT passage.*
  FROM media_audio_anonymization_passages passage
  WHERE passage.plan_id = p_plan_id
  ORDER BY passage.start_ms, passage.end_ms, passage.id;
END$$

DROP PROCEDURE IF EXISTS sp_media_inline_treatment_start$$
CREATE PROCEDURE sp_media_inline_treatment_start(
  IN p_treatment_id VARCHAR(191),
  IN p_plan_id VARCHAR(191),
  IN p_source_asset_id VARCHAR(191),
  IN p_source_playable_id VARCHAR(191),
  IN p_type VARCHAR(64),
  IN p_label VARCHAR(500),
  IN p_runtime_job_id VARCHAR(191),
  IN p_engine VARCHAR(128),
  IN p_engine_version VARCHAR(64),
  IN p_parameters_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN ROLLBACK; END IF;
    RESIGNAL;
  END;
  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN START TRANSACTION; END IF;
  IF EXISTS (SELECT 1 FROM media_treatments WHERE id = p_treatment_id FOR UPDATE) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30511,
          MESSAGE_TEXT = 'sp_media_inline_treatment_start: treatment exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM media_playables
    WHERE id = p_source_playable_id
      AND asset_id = p_source_asset_id
      AND removed_at IS NULL
      AND availability = 'available'
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30512,
          MESSAGE_TEXT = 'sp_media_inline_treatment_start: source unavailable';
  END IF;
  IF p_plan_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM media_audio_anonymization_plans
    WHERE id = p_plan_id
      AND source_asset_id = p_source_asset_id
      AND source_playable_id = p_source_playable_id
    FOR UPDATE
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30513,
          MESSAGE_TEXT = 'sp_media_inline_treatment_start: plan mismatch';
  END IF;
  INSERT INTO media_treatments (
    id, source_asset_id, source_playable_id, type, label,
    status, progress, retained, runtime_job_id, engine, engine_version,
    parameters_json, diagnostics_json, started_at
  ) VALUES (
    p_treatment_id, p_source_asset_id, p_source_playable_id, p_type, p_label,
    'running', 0, 0, p_runtime_job_id, p_engine, p_engine_version,
    p_parameters_json, JSON_OBJECT(), CURRENT_TIMESTAMP(3)
  );
  IF p_plan_id IS NOT NULL THEN
    UPDATE media_audio_anonymization_plans
    SET last_treatment_id = p_treatment_id
    WHERE id = p_plan_id;
  END IF;
  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN COMMIT; END IF;
  SELECT * FROM media_treatments WHERE id = p_treatment_id;
END$$

DROP PROCEDURE IF EXISTS sp_media_inline_treatment_complete$$
CREATE PROCEDURE sp_media_inline_treatment_complete(
  IN p_treatment_id VARCHAR(191),
  IN p_output_source_id VARCHAR(191),
  IN p_output_playable_id VARCHAR(191),
  IN p_storage_scope VARCHAR(64),
  IN p_storage_key VARCHAR(768),
  IN p_mime_type VARCHAR(191),
  IN p_size_bytes BIGINT UNSIGNED,
  IN p_duration_ms BIGINT UNSIGNED,
  IN p_sha256 CHAR(64),
  IN p_audio_codec VARCHAR(64),
  IN p_has_audio TINYINT,
  IN p_ffmpeg_version VARCHAR(191),
  IN p_diagnostics_json JSON
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_status VARCHAR(32);
  DECLARE v_asset_id VARCHAR(191);
  DECLARE v_source_playable_id VARCHAR(191);
  DECLARE v_type VARCHAR(64);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN ROLLBACK; END IF;
    RESIGNAL;
  END;
  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN START TRANSACTION; END IF;
  SELECT status, source_asset_id, source_playable_id, type
    INTO v_status, v_asset_id, v_source_playable_id, v_type
  FROM media_treatments
  WHERE id = p_treatment_id
  FOR UPDATE;
  IF v_status <> 'running' THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30521,
          MESSAGE_TEXT = 'sp_media_inline_treatment_complete: treatment not running';
  END IF;
  INSERT INTO media_sources (
    id, asset_id, kind, provider, transport, role, mime_type,
    origin_json, provenance_json
  ) VALUES (
    p_output_source_id, v_asset_id, 'derived-output', 'proto05-derived',
    'filesystem', 'derivation-local', p_mime_type,
    JSON_OBJECT('sourcePlayableId', v_source_playable_id),
    JSON_OBJECT('treatmentId', p_treatment_id, 'type', v_type)
  );
  INSERT INTO media_playables (
    id, asset_id, source_id, kind, provider, role, availability,
    storage_scope, storage_key, provenance_json
  ) VALUES (
    p_output_playable_id, v_asset_id, p_output_source_id,
    'local-file', 'proto05-derived', 'derivation-local', 'available',
    p_storage_scope, p_storage_key,
    JSON_OBJECT('treatmentId', p_treatment_id, 'type', v_type)
  );
  INSERT INTO media_playable_metadata (
    playable_id, analysis_status, mime_type, duration_ms, size_bytes,
    sha256, audio_codec, has_audio, analyzer, analyzer_version, analyzed_at
  ) VALUES (
    p_output_playable_id, 'complete', p_mime_type, p_duration_ms, p_size_bytes,
    p_sha256, p_audio_codec, p_has_audio, 'treatment-output', LEFT(p_ffmpeg_version, 64),
    CURRENT_TIMESTAMP(3)
  );
  UPDATE media_treatments
  SET output_asset_id = v_asset_id,
      output_playable_id = p_output_playable_id,
      status = 'completed',
      progress = 100,
      ffmpeg_version = p_ffmpeg_version,
      diagnostics_json = p_diagnostics_json,
      finished_at = CURRENT_TIMESTAMP(3)
  WHERE id = p_treatment_id;
  UPDATE media_assets SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = v_asset_id;
  IF COALESCE(@proto05_runtime_transaction, 0) = 0 THEN COMMIT; END IF;
  SELECT * FROM media_treatments WHERE id = p_treatment_id;
END$$

DELIMITER ;
