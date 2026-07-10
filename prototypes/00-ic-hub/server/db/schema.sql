SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt VARCHAR(255) NOT NULL,
  institution_id VARCHAR(128) NULL,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_institution (institution_id),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at VARCHAR(40) NULL,
  expires_at VARCHAR(40) NULL,
  last_seen_at VARCHAR(40) NULL,
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS institutions (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(128) NULL,
  type VARCHAR(128) NULL,
  country VARCHAR(128) NULL,
  status VARCHAR(64) NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_institutions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  teacher_id VARCHAR(128) NOT NULL,
  description TEXT NULL,
  access_code VARCHAR(128) NULL,
  level VARCHAR(128) NULL,
  institution_id VARCHAR(128) NULL,
  owner_id VARCHAR(128) NULL,
  visibility VARCHAR(64) NULL,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_courses_teacher (teacher_id),
  KEY idx_courses_institution (institution_id),
  KEY idx_courses_access_code (access_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  course_id VARCHAR(128) NOT NULL,
  joined_at VARCHAR(40) NULL,
  UNIQUE KEY uq_enrollments_user_course (user_id, course_id),
  KEY idx_enrollments_course (course_id),
  KEY idx_enrollments_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prototypes (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(128) NULL,
  base_url TEXT NULL,
  library_url TEXT NULL,
  activity_api_url TEXT NULL,
  launch_url TEXT NULL,
  supports_activities TINYINT(1) NOT NULL DEFAULT 0,
  tags_json LONGTEXT NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_prototypes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_activities (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  course_id VARCHAR(128) NOT NULL,
  prototype_id VARCHAR(128) NOT NULL,
  activity_id VARCHAR(255) NOT NULL,
  activity_source VARCHAR(128) NOT NULL,
  activity_title VARCHAR(255) NULL,
  activity_snapshot_json LONGTEXT NULL,
  assigned_by VARCHAR(128) NULL,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  institution_id VARCHAR(128) NULL,
  visibility VARCHAR(64) NULL,
  ai_config_id VARCHAR(128) NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_course_activities_course (course_id),
  KEY idx_course_activities_proto_activity (prototype_id, activity_id, activity_source),
  KEY idx_course_activities_ai_config (ai_config_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE course_activities
  ADD COLUMN IF NOT EXISTS ai_config_id VARCHAR(128) NULL,
  ADD KEY IF NOT EXISTS idx_course_activities_ai_config (ai_config_id);

CREATE TABLE IF NOT EXISTS activity_ownership (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  prototype_id VARCHAR(128) NOT NULL,
  activity_id VARCHAR(255) NOT NULL,
  activity_source VARCHAR(128) NOT NULL,
  title VARCHAR(255) NULL,
  owner_id VARCHAR(128) NULL,
  created_by VARCHAR(128) NULL,
  updated_by VARCHAR(128) NULL,
  institution_id VARCHAR(128) NULL,
  visibility VARCHAR(64) NULL,
  provenance_json LONGTEXT NULL,
  notes TEXT NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  UNIQUE KEY uq_activity_ownership_source (prototype_id, activity_id, activity_source),
  KEY idx_activity_ownership_owner (owner_id),
  KEY idx_activity_ownership_institution (institution_id),
  KEY idx_activity_ownership_visibility (visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sharing_spaces (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(128) NULL,
  institution_id VARCHAR(128) NULL,
  visibility VARCHAR(64) NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_sharing_spaces_institution (institution_id),
  KEY idx_sharing_spaces_visibility (visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS runs (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  course_id VARCHAR(128) NOT NULL,
  assignment_id VARCHAR(128) NOT NULL,
  prototype_id VARCHAR(128) NOT NULL,
  activity_id VARCHAR(255) NOT NULL,
  activity_source VARCHAR(128) NOT NULL,
  student_id VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  launch_token_hash CHAR(64) NOT NULL,
  created_at VARCHAR(40) NULL,
  started_at VARCHAR(40) NULL,
  completed_at VARCHAR(40) NULL,
  duration_ms BIGINT NULL,
  KEY idx_runs_course (course_id),
  KEY idx_runs_student (student_id),
  KEY idx_runs_activity (prototype_id, activity_id, activity_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS run_events (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  run_id VARCHAR(128) NOT NULL,
  type VARCHAR(128) NOT NULL,
  payload_json LONGTEXT NULL,
  created_at VARCHAR(40) NULL,
  KEY idx_run_events_run (run_id),
  KEY idx_run_events_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_configs (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  prototype_id VARCHAR(128) NOT NULL,
  mode VARCHAR(128) NOT NULL,
  provider VARCHAR(128) NOT NULL,
  model_id VARCHAR(255) NULL,
  model_catalog_id VARCHAR(128) NULL,
  voice_mode VARCHAR(128) NULL,
  voice_provider VARCHAR(128) NULL,
  estimated_cost_level VARCHAR(64) NULL,
  estimated_cost_notes TEXT NULL,
  max_duration_seconds INT NULL,
  language_policy VARCHAR(128) NULL,
  pedagogical_role VARCHAR(128) NULL,
  allow_participant_agents TINYINT(1) NOT NULL DEFAULT 0,
  allow_tutor_agent TINYINT(1) NOT NULL DEFAULT 0,
  allow_observer_agent TINYINT(1) NOT NULL DEFAULT 0,
  cost_visible_to_teacher TINYINT(1) NOT NULL DEFAULT 1,
  requires_api_key TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(64) NOT NULL,
  warnings_json LONGTEXT NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_ai_configs_prototype (prototype_id),
  KEY idx_ai_configs_status (status),
  KEY idx_ai_configs_mode (mode),
  KEY idx_ai_configs_model_catalog (model_catalog_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ai_configs
  ADD COLUMN IF NOT EXISTS model_catalog_id VARCHAR(128) NULL,
  ADD KEY IF NOT EXISTS idx_ai_configs_model_catalog (model_catalog_id);

CREATE TABLE IF NOT EXISTS ai_providers (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  api_key_env_name VARCHAR(128) NULL,
  base_url TEXT NULL,
  supports_model_sync TINYINT(1) NOT NULL DEFAULT 0,
  supports_text TINYINT(1) NOT NULL DEFAULT 0,
  supports_audio TINYINT(1) NOT NULL DEFAULT 0,
  supports_realtime TINYINT(1) NOT NULL DEFAULT 0,
  supports_embeddings TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  KEY idx_ai_providers_type (type),
  KEY idx_ai_providers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_models (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  provider_id VARCHAR(128) NOT NULL,
  provider_model_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  short_description TEXT NULL,
  family VARCHAR(128) NULL,
  modality VARCHAR(128) NULL,
  capabilities_json LONGTEXT NULL,
  status VARCHAR(64) NOT NULL,
  source VARCHAR(128) NULL,
  context_window INT NULL,
  cost_level VARCHAR(64) NULL,
  ic_lab_recommendation VARCHAR(128) NULL,
  recommended_use TEXT NULL,
  pricing_json LONGTEXT NULL,
  input_price_usd DECIMAL(12, 6) NULL,
  cached_input_price_usd DECIMAL(12, 6) NULL,
  output_price_usd DECIMAL(12, 6) NULL,
  pricing_unit VARCHAR(128) NULL,
  pricing_source VARCHAR(255) NULL,
  pricing_last_checked_at VARCHAR(40) NULL,
  allowed_for_teachers TINYINT(1) NOT NULL DEFAULT 0,
  allowed_for_students TINYINT(1) NOT NULL DEFAULT 0,
  allowed_for_runtime TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  last_seen_at VARCHAR(40) NULL,
  UNIQUE KEY uq_ai_models_provider_model (provider_id, provider_model_id),
  KEY idx_ai_models_provider (provider_id),
  KEY idx_ai_models_family (family),
  KEY idx_ai_models_modality (modality),
  KEY idx_ai_models_status (status),
  KEY idx_ai_models_recommendation (ic_lab_recommendation),
  KEY idx_ai_models_allowed_runtime (allowed_for_runtime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ai_models
  ADD COLUMN IF NOT EXISTS short_description TEXT NULL,
  ADD COLUMN IF NOT EXISTS ic_lab_recommendation VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS pricing_json LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS input_price_usd DECIMAL(12, 6) NULL,
  ADD COLUMN IF NOT EXISTS cached_input_price_usd DECIMAL(12, 6) NULL,
  ADD COLUMN IF NOT EXISTS output_price_usd DECIMAL(12, 6) NULL,
  ADD COLUMN IF NOT EXISTS pricing_unit VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS pricing_source VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS pricing_last_checked_at VARCHAR(40) NULL,
  ADD KEY IF NOT EXISTS idx_ai_models_recommendation (ic_lab_recommendation);

CREATE TABLE IF NOT EXISTS activity_ai_config (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  activity_ownership_id VARCHAR(128) NOT NULL,
  ai_config_id VARCHAR(128) NOT NULL,
  assigned_by VARCHAR(128) NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL,
  UNIQUE KEY uq_activity_ai_config_owner_config (activity_ownership_id, ai_config_id),
  KEY idx_activity_ai_config_owner (activity_ownership_id),
  KEY idx_activity_ai_config_config (ai_config_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
