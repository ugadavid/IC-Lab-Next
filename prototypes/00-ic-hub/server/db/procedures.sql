DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_run$$
CREATE PROCEDURE sp_create_run(
  IN p_run_id VARCHAR(128),
  IN p_course_id VARCHAR(128),
  IN p_assignment_id VARCHAR(128),
  IN p_prototype_id VARCHAR(128),
  IN p_activity_id VARCHAR(255),
  IN p_activity_source VARCHAR(128),
  IN p_student_id VARCHAR(128),
  IN p_launch_token_hash CHAR(64),
  IN p_created_at VARCHAR(40)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF COALESCE(p_run_id, '') = ''
    OR COALESCE(p_course_id, '') = ''
    OR COALESCE(p_assignment_id, '') = ''
    OR COALESCE(p_prototype_id, '') = ''
    OR COALESCE(p_activity_id, '') = ''
    OR COALESCE(p_activity_source, '') = ''
    OR COALESCE(p_student_id, '') = ''
    OR COALESCE(p_launch_token_hash, '') = ''
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sp_create_run: missing required field';
  END IF;

  START TRANSACTION;

  INSERT INTO runs (
    id,
    course_id,
    assignment_id,
    prototype_id,
    activity_id,
    activity_source,
    student_id,
    status,
    launch_token_hash,
    created_at,
    started_at,
    completed_at,
    duration_ms
  )
  VALUES (
    p_run_id,
    p_course_id,
    p_assignment_id,
    p_prototype_id,
    p_activity_id,
    p_activity_source,
    p_student_id,
    'created',
    p_launch_token_hash,
    p_created_at,
    NULL,
    NULL,
    NULL
  );

  COMMIT;

  SELECT * FROM runs WHERE id = p_run_id;
END$$

DROP PROCEDURE IF EXISTS sp_append_run_event$$
CREATE PROCEDURE sp_append_run_event(
  IN p_event_id VARCHAR(128),
  IN p_run_id VARCHAR(128),
  IN p_type VARCHAR(128),
  IN p_payload_json LONGTEXT,
  IN p_created_at VARCHAR(40)
)
BEGIN
  DECLARE v_not_found BOOLEAN DEFAULT FALSE;
  DECLARE v_status VARCHAR(64);
  DECLARE v_created_at VARCHAR(40);
  DECLARE v_started_at VARCHAR(40);
  DECLARE v_completed_at VARCHAR(40);
  DECLARE v_duration_ms BIGINT;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = TRUE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF COALESCE(p_event_id, '') = ''
    OR COALESCE(p_run_id, '') = ''
    OR COALESCE(p_type, '') = ''
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sp_append_run_event: missing required field';
  END IF;

  IF p_payload_json IS NULL OR JSON_VALID(p_payload_json) = 0 THEN
    SET p_payload_json = '{}';
  END IF;

  START TRANSACTION;

  SELECT status, created_at, started_at, completed_at, duration_ms
  INTO v_status, v_created_at, v_started_at, v_completed_at, v_duration_ms
  FROM runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF v_not_found THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sp_append_run_event: run not found';
  END IF;

  INSERT INTO run_events (id, run_id, type, payload_json, created_at)
  VALUES (p_event_id, p_run_id, p_type, p_payload_json, p_created_at);

  IF p_type = 'proto_loaded' AND v_status = 'created' THEN
    SET v_status = 'launched';
  END IF;

  IF p_type = 'meeting_started' AND v_status <> 'completed' THEN
    SET v_status = 'started';
    SET v_started_at = COALESCE(v_started_at, p_created_at);
  END IF;

  IF p_type = 'activity_completed' THEN
    SET v_status = 'completed';
    SET v_completed_at = p_created_at;
    SET v_duration_ms = GREATEST(
      0,
      TIMESTAMPDIFF(
        MICROSECOND,
        STR_TO_DATE(REPLACE(REPLACE(COALESCE(v_started_at, v_created_at), 'T', ' '), 'Z', ''), '%Y-%m-%d %H:%i:%s.%f'),
        STR_TO_DATE(REPLACE(REPLACE(p_created_at, 'T', ' '), 'Z', ''), '%Y-%m-%d %H:%i:%s.%f')
      ) DIV 1000
    );
  END IF;

  IF p_type = 'error' AND v_status <> 'completed' THEN
    SET v_status = 'error';
  END IF;

  UPDATE runs
  SET status = v_status,
      started_at = v_started_at,
      completed_at = v_completed_at,
      duration_ms = v_duration_ms
  WHERE id = p_run_id;

  COMMIT;

  SELECT r.*, COUNT(e.id) AS event_count
  FROM runs r
  LEFT JOIN run_events e ON e.run_id = r.id
  WHERE r.id = p_run_id
  GROUP BY r.id;
END$$

DROP PROCEDURE IF EXISTS sp_assign_activity_with_ownership$$
CREATE PROCEDURE sp_assign_activity_with_ownership(
  IN p_assignment_id VARCHAR(128),
  IN p_course_id VARCHAR(128),
  IN p_prototype_id VARCHAR(128),
  IN p_activity_id VARCHAR(255),
  IN p_activity_source VARCHAR(128),
  IN p_activity_title VARCHAR(255),
  IN p_activity_snapshot_json LONGTEXT,
  IN p_assigned_by VARCHAR(128),
  IN p_created_by VARCHAR(128),
  IN p_updated_by VARCHAR(128),
  IN p_institution_id VARCHAR(128),
  IN p_visibility VARCHAR(64),
  IN p_ai_config_id VARCHAR(128),
  IN p_ownership_id VARCHAR(128),
  IN p_owner_id VARCHAR(128),
  IN p_provenance_json LONGTEXT,
  IN p_created_at VARCHAR(40)
)
BEGIN
  DECLARE v_existing_ownership_id VARCHAR(128);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF COALESCE(p_assignment_id, '') = ''
    OR COALESCE(p_course_id, '') = ''
    OR COALESCE(p_prototype_id, '') = ''
    OR COALESCE(p_activity_id, '') = ''
    OR COALESCE(p_activity_source, '') = ''
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'sp_assign_activity_with_ownership: missing required field';
  END IF;

  IF p_activity_snapshot_json IS NULL OR JSON_VALID(p_activity_snapshot_json) = 0 THEN
    SET p_activity_snapshot_json = NULL;
  END IF;

  IF p_provenance_json IS NULL OR JSON_VALID(p_provenance_json) = 0 THEN
    SET p_provenance_json = '{}';
  END IF;

  START TRANSACTION;

  INSERT INTO course_activities (
    id,
    course_id,
    prototype_id,
    activity_id,
    activity_source,
    activity_title,
    activity_snapshot_json,
    assigned_by,
    created_by,
    updated_by,
    institution_id,
    visibility,
    ai_config_id,
    created_at,
    updated_at
  )
  VALUES (
    p_assignment_id,
    p_course_id,
    p_prototype_id,
    p_activity_id,
    p_activity_source,
    COALESCE(NULLIF(p_activity_title, ''), p_activity_id),
    p_activity_snapshot_json,
    p_assigned_by,
    p_created_by,
    p_updated_by,
    p_institution_id,
    p_visibility,
    p_ai_config_id,
    p_created_at,
    p_created_at
  );

  SELECT id
  INTO v_existing_ownership_id
  FROM activity_ownership
  WHERE prototype_id = p_prototype_id
    AND activity_id = p_activity_id
    AND activity_source = p_activity_source
  LIMIT 1
  FOR UPDATE;

  IF v_existing_ownership_id IS NULL THEN
    INSERT INTO activity_ownership (
      id,
      prototype_id,
      activity_id,
      activity_source,
      title,
      owner_id,
      created_by,
      updated_by,
      institution_id,
      visibility,
      provenance_json,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      p_ownership_id,
      p_prototype_id,
      p_activity_id,
      p_activity_source,
      COALESCE(NULLIF(p_activity_title, ''), p_activity_id),
      p_owner_id,
      p_created_by,
      p_updated_by,
      p_institution_id,
      p_visibility,
      p_provenance_json,
      NULL,
      p_created_at,
      p_created_at
    );
    SET v_existing_ownership_id = p_ownership_id;
  END IF;

  COMMIT;

  SELECT * FROM activity_ownership WHERE id = v_existing_ownership_id;
END$$

DROP VIEW IF EXISTS vw_activity_ownership_full$$
CREATE VIEW vw_activity_ownership_full AS
SELECT
  o.id,
  o.prototype_id,
  p.title AS prototype_title,
  o.activity_id,
  o.activity_source,
  o.title,
  o.owner_id,
  u.display_name AS owner_display_name,
  u.email AS owner_email,
  o.institution_id,
  i.name AS institution_name,
  i.short_name AS institution_short_name,
  o.visibility,
  o.provenance_json,
  o.created_at,
  o.updated_at
FROM activity_ownership o
LEFT JOIN prototypes p ON p.id = o.prototype_id
LEFT JOIN users u ON u.id = o.owner_id
LEFT JOIN institutions i ON i.id = o.institution_id$$

DELIMITER ;
