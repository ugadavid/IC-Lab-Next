-- Mission 136 validation for document projection metadata.
-- Run after migrations 004 and 005 have completed successfully.

USE ic_augmented_video;
SET NAMES utf8mb4;
SET SESSION time_zone = '+00:00';

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_m136_assert$$
CREATE PROCEDURE sp_m136_assert(
  IN p_condition TINYINT(1),
  IN p_label VARCHAR(500)
)
BEGIN
  IF COALESCE(p_condition, 0) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30960,
          MESSAGE_TEXT = p_label;
  END IF;
  SELECT 'PASS' AS result, p_label AS test;
END$$

DROP PROCEDURE IF EXISTS sp_m136_expect_error$$
CREATE PROCEDURE sp_m136_expect_error(
  IN p_sql TEXT,
  IN p_label VARCHAR(500)
)
BEGIN
  DECLARE v_failed TINYINT(1) DEFAULT 0;
  DECLARE v_prepared TINYINT(1) DEFAULT 0;

  BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
      SET v_failed = 1;
    END;

    SET @m136_sql = p_sql;
    PREPARE m136_statement FROM @m136_sql;
    SET v_prepared = 1;
    EXECUTE m136_statement;
    DEALLOCATE PREPARE m136_statement;
    SET v_prepared = 0;
  END;

  IF v_prepared = 1 THEN
    BEGIN
      DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
      DEALLOCATE PREPARE m136_statement;
    END;
  END IF;

  IF v_failed <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MYSQL_ERRNO = 30961,
          MESSAGE_TEXT = p_label;
  END IF;

  SELECT 'PASS' AS result, p_label AS test;
END$$

DELIMITER ;

CALL sp_m136_assert(
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE') = 32
  AND
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = DATABASE()
     AND routine_type = 'PROCEDURE'
     AND routine_name NOT LIKE 'sp_m136\_%') = 43
  AND
  (SELECT COUNT(*) FROM information_schema.referential_constraints
   WHERE constraint_schema = DATABASE()) = 48
  AND
  (SELECT COUNT(*) FROM information_schema.check_constraints
   WHERE constraint_schema = DATABASE()) = 68
  AND
  (SELECT COUNT(*) FROM information_schema.triggers
   WHERE trigger_schema = DATABASE()) = 0
  AND
  (SELECT COUNT(*) FROM information_schema.events
   WHERE event_schema = DATABASE()) = 0,
  'schema topology is exactly 32 tables, 43 procedures, 48 FKs and 68 CHECKs'
);

CALL sp_m136_assert(
  (
    SELECT ENGINE = 'InnoDB'
      AND TABLE_COLLATION = 'utf8mb4_unicode_ci'
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
      AND table_type = 'BASE TABLE'
  ),
  'document metadata uses the expected InnoDB table'
);

CALL sp_m136_assert(
  (
    SELECT COUNT(*) = 3
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
  )
  AND
  (
    SELECT DATA_TYPE = 'varchar'
      AND CHARACTER_MAXIMUM_LENGTH = 64
      AND IS_NULLABLE = 'NO'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
      AND column_name = 'document_key'
  )
  AND
  (
    SELECT DATA_TYPE = 'varchar'
      AND CHARACTER_MAXIMUM_LENGTH = 32
      AND IS_NULLABLE = 'NO'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
      AND column_name = 'schema_version'
  )
  AND
  (
    SELECT DATA_TYPE = 'datetime'
      AND DATETIME_PRECISION = 3
      AND IS_NULLABLE = 'YES'
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
      AND column_name = 'source_updated_at_utc'
  ),
  'document metadata columns preserve their exact types and nullability'
);

CALL sp_m136_assert(
  (
    SELECT COUNT(*) = 1 AND MAX(column_name) = 'document_key'
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
      AND constraint_name = 'PRIMARY'
  )
  AND
  (
    SELECT COUNT(*) = 3
    FROM information_schema.check_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
      AND constraint_name IN (
        'chk_data_projection_document_key',
        'chk_data_projection_schema_version',
        'chk_data_projection_updated_at'
      )
  )
  AND
  (
    SELECT COUNT(*) = 0
    FROM information_schema.referential_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = 'data_projection_metadata'
  ),
  'document metadata primary key, CHECKs and absence of FKs are exact'
);

CALL sp_m136_assert(
  (SELECT COUNT(*) FROM data_projection_metadata) = 4
  AND
  (SELECT schema_version = '0.1'
     AND DATE_FORMAT(source_updated_at_utc, '%Y-%m-%dT%H:%i:%s.%f')
       = '2026-07-26T17:30:42.426000'
   FROM data_projection_metadata WHERE document_key = 'activities')
  AND
  (SELECT schema_version = '0.1'
     AND DATE_FORMAT(source_updated_at_utc, '%Y-%m-%dT%H:%i:%s.%f')
       = '2026-07-26T20:07:58.978000'
   FROM data_projection_metadata WHERE document_key = 'activity-library')
  AND
  (SELECT schema_version = '1.0'
     AND DATE_FORMAT(source_updated_at_utc, '%Y-%m-%dT%H:%i:%s.%f')
       = '2026-07-26T18:39:12.425000'
   FROM data_projection_metadata WHERE document_key = 'media-library')
  AND
  (SELECT schema_version = '0.1'
     AND source_updated_at_utc IS NULL
   FROM data_projection_metadata WHERE document_key = 'video-catalog'),
  'four canonical rows and three millisecond timestamps are exact'
);

START TRANSACTION;

CALL sp_m136_expect_error(
  'UPDATE data_projection_metadata SET document_key = ''unknown-document'' WHERE document_key = ''activities''',
  'unknown document keys are rejected'
);

CALL sp_m136_expect_error(
  'UPDATE data_projection_metadata SET schema_version = ''v1'' WHERE document_key = ''activities''',
  'invalid schema versions are rejected'
);

CALL sp_m136_expect_error(
  'UPDATE data_projection_metadata SET source_updated_at_utc = NULL WHERE document_key = ''activities''',
  'required document timestamps are rejected when absent'
);

CALL sp_m136_expect_error(
  'UPDATE data_projection_metadata SET source_updated_at_utc = ''2026-07-26 00:00:00.000'' WHERE document_key = ''video-catalog''',
  'video catalog rejects an invented timestamp'
);

ROLLBACK;

CALL sp_m136_assert(
  (SELECT COUNT(*) FROM data_projection_metadata) = 4,
  'constraint tests leave the canonical rows unchanged'
);

DROP PROCEDURE sp_m136_expect_error;
DROP PROCEDURE sp_m136_assert;

SELECT 'MISSION_136_VALIDATION_COMPLETE' AS result;
