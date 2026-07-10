const crypto = require("node:crypto");
const { getPool } = require("../db/db");

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function json(value) {
  return value === undefined ? null : JSON.stringify(value);
}

function enrollmentId(item) {
  return item.id || `enroll_${item.userId}_${item.courseId}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function runEventId(runId, event, index) {
  return event.id || `event_${runId}_${event.at || event.createdAt || index}_${event.type}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function ownershipIdFor(prototypeId, activityId, activitySource) {
  return `own_${String(prototypeId).replace(/[^a-z0-9]+/gi, "_")}_${String(activityId).replace(/[^a-z0-9]+/gi, "_")}_${String(activitySource).replace(/[^a-z0-9]+/gi, "_")}`;
}

function generatedRunEventId(runId) {
  return `event_${runId}_${crypto.randomUUID()}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function mapOwnershipRow(row) {
  return {
    id: row.id,
    prototypeId: row.prototype_id,
    activityId: row.activity_id,
    activitySource: row.activity_source,
    title: row.title,
    ownerId: row.owner_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    institutionId: row.institution_id,
    visibility: row.visibility,
    provenance: parseJson(row.provenance_json, {}),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function countRows(connection, tableName) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(rows[0]?.count || 0);
}

async function readStore(name) {
  const pool = getPool();
  if (name === "users") {
    const [rows] = await pool.query("SELECT * FROM users ORDER BY created_at, id");
    return {
      users: rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        passwordHash: row.password_hash,
        passwordSalt: row.password_salt,
        institutionId: row.institution_id,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "sessions") {
    const [rows] = await pool.query("SELECT * FROM sessions ORDER BY created_at, id");
    return {
      sessions: rows.map((row) => ({
        id: row.id,
        tokenHash: row.token_hash,
        userId: row.user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        lastSeenAt: row.last_seen_at
      }))
    };
  }

  if (name === "institutions") {
    const [rows] = await pool.query("SELECT * FROM institutions ORDER BY name, id");
    return {
      version: "0.6",
      institutions: rows.map((row) => ({
        id: row.id,
        name: row.name,
        shortName: row.short_name,
        type: row.type,
        country: row.country,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "courses") {
    const [rows] = await pool.query("SELECT * FROM courses ORDER BY created_at, id");
    return {
      courses: rows.map((row) => ({
        id: row.id,
        title: row.title,
        teacherId: row.teacher_id,
        description: row.description || "",
        accessCode: row.access_code,
        level: row.level || "",
        institutionId: row.institution_id,
        ownerId: row.owner_id,
        visibility: row.visibility,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "enrollments") {
    const [rows] = await pool.query("SELECT * FROM enrollments ORDER BY joined_at, id");
    return {
      enrollments: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        joinedAt: row.joined_at
      }))
    };
  }

  if (name === "prototypes") {
    const [rows] = await pool.query("SELECT * FROM prototypes ORDER BY id");
    return {
      prototypes: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        status: row.status,
        baseUrl: row.base_url,
        libraryUrl: row.library_url,
        activityApiUrl: row.activity_api_url,
        launchUrl: row.launch_url,
        supportsActivities: Boolean(row.supports_activities),
        tags: parseJson(row.tags_json, []),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "assignments") {
    const [rows] = await pool.query("SELECT * FROM course_activities ORDER BY created_at, id");
    return {
      assignments: rows.map((row) => {
        const activitySnapshot = parseJson(row.activity_snapshot_json, null);
        return {
          id: row.id,
          courseId: row.course_id,
          prototypeId: row.prototype_id,
          activityId: row.activity_id,
          activitySource: row.activity_source,
          activityTitle: row.activity_title,
          activitySnapshot,
          manifestId: activitySnapshot?.manifestId || null,
          assignedBy: row.assigned_by,
          createdBy: row.created_by,
          updatedBy: row.updated_by,
          institutionId: row.institution_id,
          visibility: row.visibility,
          aiConfigId: row.ai_config_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      })
    };
  }

  if (name === "ownership") {
    const [rows] = await pool.query("SELECT * FROM activity_ownership ORDER BY created_at, id");
    return {
      version: "0.6",
      records: rows.map((row) => ({
        id: row.id,
        prototypeId: row.prototype_id,
        activityId: row.activity_id,
        activitySource: row.activity_source,
        title: row.title,
        ownerId: row.owner_id,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        institutionId: row.institution_id,
        visibility: row.visibility,
        provenance: parseJson(row.provenance_json, {}),
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "sharingSpaces") {
    const [rows] = await pool.query("SELECT * FROM sharing_spaces ORDER BY name, id");
    return {
      version: "0.6",
      spaces: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        institutionId: row.institution_id,
        visibility: row.visibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "runs") {
    const [runRows] = await pool.query("SELECT * FROM runs ORDER BY created_at, id");
    const [eventRows] = await pool.query("SELECT * FROM run_events ORDER BY created_at, id");
    const eventsByRun = new Map();
    eventRows.forEach((row) => {
      const event = {
        id: row.id,
        type: row.type,
        at: row.created_at,
        payload: parseJson(row.payload_json, {})
      };
      if (!eventsByRun.has(row.run_id)) eventsByRun.set(row.run_id, []);
      eventsByRun.get(row.run_id).push(event);
    });
    return {
      version: "0.6",
      updatedAt: new Date().toISOString(),
      runs: runRows.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        assignmentId: row.assignment_id,
        prototypeId: row.prototype_id,
        activityId: row.activity_id,
        activitySource: row.activity_source,
        studentId: row.student_id,
        status: row.status,
        launchTokenHash: row.launch_token_hash,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        durationMs: row.duration_ms,
        events: eventsByRun.get(row.id) || []
      }))
    };
  }

  if (name === "aiConfigs") {
    const [configRows] = await pool.query("SELECT * FROM ai_configs ORDER BY prototype_id, status, id");
    const [linkRows] = await pool.query("SELECT * FROM activity_ai_config ORDER BY created_at, id");
    return {
      version: "0.7",
      configs: configRows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        prototypeId: row.prototype_id,
        mode: row.mode,
        provider: row.provider,
        modelId: row.model_id,
        modelCatalogId: row.model_catalog_id,
        voiceMode: row.voice_mode,
        voiceProvider: row.voice_provider,
        estimatedCostLevel: row.estimated_cost_level,
        estimatedCostNotes: row.estimated_cost_notes,
        maxDurationSeconds: row.max_duration_seconds,
        languagePolicy: row.language_policy,
        pedagogicalRole: row.pedagogical_role,
        allowParticipantAgents: Boolean(row.allow_participant_agents),
        allowTutorAgent: Boolean(row.allow_tutor_agent),
        allowObserverAgent: Boolean(row.allow_observer_agent),
        costVisibleToTeacher: Boolean(row.cost_visible_to_teacher),
        requiresApiKey: Boolean(row.requires_api_key),
        status: row.status,
        warnings: parseJson(row.warnings_json, []),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      activityConfigs: linkRows.map((row) => ({
        id: row.id,
        activityOwnershipId: row.activity_ownership_id,
        aiConfigId: row.ai_config_id,
        assignedBy: row.assigned_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "aiProviders") {
    const [rows] = await pool.query("SELECT * FROM ai_providers ORDER BY id");
    return {
      version: "0.8",
      providers: rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        status: row.status,
        apiKeyEnvName: row.api_key_env_name || "",
        baseUrl: row.base_url || "",
        supportsModelSync: Boolean(row.supports_model_sync),
        supportsText: Boolean(row.supports_text),
        supportsAudio: Boolean(row.supports_audio),
        supportsRealtime: Boolean(row.supports_realtime),
        supportsEmbeddings: Boolean(row.supports_embeddings),
        notes: row.notes || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  }

  if (name === "aiModels") {
    const [rows] = await pool.query("SELECT * FROM ai_models ORDER BY provider_id, family, provider_model_id");
    return {
      version: "0.8",
      models: rows.map((row) => ({
        id: row.id,
        providerId: row.provider_id,
        providerModelId: row.provider_model_id,
        title: row.title,
        shortDescription: row.short_description || "",
        family: row.family || "",
        modality: row.modality || "",
        capabilities: parseJson(row.capabilities_json, []),
        status: row.status,
        source: row.source || "",
        contextWindow: row.context_window,
        costLevel: row.cost_level || "",
        icLabRecommendation: row.ic_lab_recommendation || "",
        pricing: parseJson(row.pricing_json, {
          unit: row.pricing_unit || "",
          inputUsd: row.input_price_usd === null ? null : Number(row.input_price_usd),
          cachedInputUsd: row.cached_input_price_usd === null ? null : Number(row.cached_input_price_usd),
          outputUsd: row.output_price_usd === null ? null : Number(row.output_price_usd),
          source: row.pricing_source || "",
          lastCheckedAt: row.pricing_last_checked_at || null
        }),
        recommendedUse: row.recommended_use || "",
        allowedForTeachers: Boolean(row.allowed_for_teachers),
        allowedForStudents: Boolean(row.allowed_for_students),
        allowedForRuntime: Boolean(row.allowed_for_runtime),
        notes: row.notes || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastSeenAt: row.last_seen_at
      }))
    };
  }

  throw new Error(`Store MariaDB inconnu: ${name}`);
}

async function createRun(run) {
  const pool = getPool();
  await pool.query("CALL sp_create_run(?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    run.id,
    run.courseId,
    run.assignmentId,
    run.prototypeId,
    run.activityId,
    run.activitySource,
    run.studentId,
    run.launchTokenHash,
    run.createdAt || null
  ]);
  return run;
}

async function appendRunEvent({ runId, launchToken, type, payload, createdAt }) {
  const pool = getPool();
  const [runs] = await pool.execute("SELECT launch_token_hash FROM runs WHERE id = ?", [runId]);
  const run = runs[0];
  if (!run) {
    return { statusCode: 404, body: { error: "Run introuvable." } };
  }
  if (run.launch_token_hash !== tokenHash(launchToken)) {
    return { statusCode: 401, body: { error: "launchToken invalide." } };
  }

  const [sets] = await pool.query("CALL sp_append_run_event(?, ?, ?, ?, ?)", [
    generatedRunEventId(runId),
    runId,
    type,
    json(payload || {}),
    createdAt
  ]);
  const row = Array.isArray(sets) && Array.isArray(sets[0]) ? sets[0][0] : null;
  return {
    statusCode: 200,
    body: {
      ok: true,
      eventCount: Number(row?.event_count || 0),
      status: row?.status || "unknown"
    }
  };
}

async function createAssignmentWithOwnership({ assignment, course, user, title }) {
  const pool = getPool();
  const stamp = assignment.createdAt || new Date().toISOString();
  const activitySource = assignment.activitySource || "server";
  const provenance = {
    kind: activitySource === "server" ? "external-prototype" : "manual",
    sourcePrototype: assignment.prototypeId,
    sourceActivityId: assignment.activityId,
    importedAt: stamp,
    registeredBy: user.id
  };
  const [sets] = await pool.query("CALL sp_assign_activity_with_ownership(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    assignment.id,
    assignment.courseId,
    assignment.prototypeId,
    assignment.activityId,
    activitySource,
    title || assignment.activityTitle || assignment.activityId,
    json(assignment.activitySnapshot),
    assignment.assignedBy || user.id,
    assignment.createdBy || user.id,
    assignment.updatedBy || user.id,
    assignment.institutionId || course?.institutionId || user.institutionId || null,
    assignment.visibility || course?.visibility || "course",
    assignment.aiConfigId || null,
    ownershipIdFor(assignment.prototypeId, assignment.activityId, activitySource),
    course?.ownerId || course?.teacherId || user.id,
    json(provenance),
    stamp
  ]);
  const row = Array.isArray(sets) && Array.isArray(sets[0]) ? sets[0][0] : null;
  return row ? mapOwnershipRow(row) : null;
}

async function healthSummary() {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT 1 AS ok");
    const counts = {};
    for (const tableName of ["users", "courses", "enrollments", "course_activities", "activity_ownership", "ai_configs", "activity_ai_config", "ai_providers", "ai_models", "runs", "run_events"]) {
      counts[tableName] = await countRows(connection, tableName);
    }
    const config = require("../db/db").dbConfig();
    return {
      ok: true,
      database: config.database,
      host: config.host,
      port: config.port,
      counts
    };
  } finally {
    connection.release();
  }
}

async function writeStore(name, store) {
  const pool = getPool();
  if (name === "users") {
    for (const user of store.users || []) {
      await pool.execute(
        `INSERT INTO users (id, display_name, email, role, password_hash, password_salt, institution_id, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), email=VALUES(email), role=VALUES(role), password_hash=VALUES(password_hash), password_salt=VALUES(password_salt), institution_id=VALUES(institution_id), created_by=VALUES(created_by), updated_by=VALUES(updated_by), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [user.id, user.displayName, user.email, user.role, user.passwordHash, user.passwordSalt, user.institutionId || null, user.createdBy || null, user.updatedBy || null, user.createdAt || null, user.updatedAt || null]
      );
    }
    return;
  }

  if (name === "sessions") {
    const ids = [];
    for (const session of store.sessions || []) {
      const sessionId = session.id || `session_${session.userId}_${session.createdAt || Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
      ids.push(sessionId);
      await pool.execute(
        `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), token_hash=VALUES(token_hash), created_at=VALUES(created_at), expires_at=VALUES(expires_at), last_seen_at=VALUES(last_seen_at)`,
        [sessionId, session.userId, session.tokenHash || (session.token ? tokenHash(session.token) : null), session.createdAt || null, session.expiresAt || null, session.lastSeenAt || null]
      );
    }
    if (ids.length) {
      await pool.query(`DELETE FROM sessions WHERE id NOT IN (${ids.map(() => "?").join(",")})`, ids);
    } else {
      await pool.query("DELETE FROM sessions");
    }
    return;
  }

  if (name === "institutions") {
    for (const item of store.institutions || []) {
      await pool.execute(
        `INSERT INTO institutions (id, name, short_name, type, country, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), short_name=VALUES(short_name), type=VALUES(type), country=VALUES(country), status=VALUES(status), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [item.id, item.name, item.shortName || null, item.type || null, item.country || null, item.status || null, item.createdAt || null, item.updatedAt || null]
      );
    }
    return;
  }

  if (name === "courses") {
    for (const course of store.courses || []) {
      await pool.execute(
        `INSERT INTO courses (id, title, teacher_id, description, access_code, level, institution_id, owner_id, visibility, created_by, updated_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), teacher_id=VALUES(teacher_id), description=VALUES(description), access_code=VALUES(access_code), level=VALUES(level), institution_id=VALUES(institution_id), owner_id=VALUES(owner_id), visibility=VALUES(visibility), created_by=VALUES(created_by), updated_by=VALUES(updated_by), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [course.id, course.title, course.teacherId, course.description || "", course.accessCode || null, course.level || "", course.institutionId || null, course.ownerId || null, course.visibility || null, course.createdBy || null, course.updatedBy || null, course.createdAt || null, course.updatedAt || null]
      );
    }
    return;
  }

  if (name === "enrollments") {
    for (const item of store.enrollments || []) {
      await pool.execute(
        `INSERT INTO enrollments (id, user_id, course_id, joined_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE joined_at=VALUES(joined_at)`,
        [enrollmentId(item), item.userId, item.courseId, item.joinedAt || null]
      );
    }
    return;
  }

  if (name === "prototypes") {
    for (const proto of store.prototypes || []) {
      await pool.execute(
        `INSERT INTO prototypes (id, title, description, status, base_url, library_url, activity_api_url, launch_url, supports_activities, tags_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), status=VALUES(status), base_url=VALUES(base_url), library_url=VALUES(library_url), activity_api_url=VALUES(activity_api_url), launch_url=VALUES(launch_url), supports_activities=VALUES(supports_activities), tags_json=VALUES(tags_json), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [proto.id, proto.title, proto.description || "", proto.status || null, proto.baseUrl || null, proto.libraryUrl || null, proto.activityApiUrl || null, proto.launchUrl || null, proto.supportsActivities ? 1 : 0, json(proto.tags || []), proto.createdAt || null, proto.updatedAt || null]
      );
    }
    return;
  }

  if (name === "assignments") {
    for (const item of store.assignments || []) {
      await pool.execute(
        `INSERT INTO course_activities (id, course_id, prototype_id, activity_id, activity_source, activity_title, activity_snapshot_json, assigned_by, created_by, updated_by, institution_id, visibility, ai_config_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE course_id=VALUES(course_id), prototype_id=VALUES(prototype_id), activity_id=VALUES(activity_id), activity_source=VALUES(activity_source), activity_title=VALUES(activity_title), activity_snapshot_json=VALUES(activity_snapshot_json), assigned_by=VALUES(assigned_by), created_by=VALUES(created_by), updated_by=VALUES(updated_by), institution_id=VALUES(institution_id), visibility=VALUES(visibility), ai_config_id=VALUES(ai_config_id), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [item.id, item.courseId, item.prototypeId, item.activityId, item.activitySource, item.activityTitle || item.activityId, json(item.activitySnapshot), item.assignedBy || null, item.createdBy || null, item.updatedBy || null, item.institutionId || null, item.visibility || null, item.aiConfigId || null, item.createdAt || null, item.updatedAt || null]
      );
    }
    return;
  }

  if (name === "ownership") {
    for (const record of store.records || []) {
      await pool.execute(
        `INSERT INTO activity_ownership (id, prototype_id, activity_id, activity_source, title, owner_id, created_by, updated_by, institution_id, visibility, provenance_json, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), owner_id=VALUES(owner_id), created_by=VALUES(created_by), updated_by=VALUES(updated_by), institution_id=VALUES(institution_id), visibility=VALUES(visibility), provenance_json=VALUES(provenance_json), notes=VALUES(notes), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [record.id, record.prototypeId, record.activityId, record.activitySource, record.title || record.activityId, record.ownerId || null, record.createdBy || null, record.updatedBy || null, record.institutionId || null, record.visibility || null, json(record.provenance || {}), record.notes || null, record.createdAt || null, record.updatedAt || null]
      );
    }
    return;
  }

  if (name === "sharingSpaces") {
    for (const space of store.spaces || []) {
      await pool.execute(
        `INSERT INTO sharing_spaces (id, name, type, institution_id, visibility, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), institution_id=VALUES(institution_id), visibility=VALUES(visibility), created_at=VALUES(created_at), updated_at=VALUES(updated_at)`,
        [space.id, space.name, space.type || null, space.institutionId || null, space.visibility || null, space.createdAt || null, space.updatedAt || null]
      );
    }
    return;
  }

  if (name === "runs") {
    for (const run of store.runs || []) {
      await pool.execute(
        `INSERT INTO runs (id, course_id, assignment_id, prototype_id, activity_id, activity_source, student_id, status, launch_token_hash, created_at, started_at, completed_at, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), started_at=VALUES(started_at), completed_at=VALUES(completed_at), duration_ms=VALUES(duration_ms)`,
        [run.id, run.courseId, run.assignmentId, run.prototypeId, run.activityId, run.activitySource, run.studentId, run.status, run.launchTokenHash, run.createdAt || null, run.startedAt || null, run.completedAt || null, run.durationMs ?? null]
      );
      for (const [index, event] of (run.events || []).entries()) {
        await pool.execute(
          `INSERT INTO run_events (id, run_id, type, payload_json, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE type=VALUES(type), payload_json=VALUES(payload_json), created_at=VALUES(created_at)`,
          [runEventId(run.id, event, index), run.id, event.type, json(event.payload || {}), event.at || event.createdAt || null]
        );
      }
    }
    return;
  }

  if (name === "aiConfigs") {
    for (const config of store.configs || []) {
      await pool.execute(
        `INSERT INTO ai_configs (id, title, description, prototype_id, mode, provider, model_id, model_catalog_id, voice_mode, voice_provider, estimated_cost_level, estimated_cost_notes, max_duration_seconds, language_policy, pedagogical_role, allow_participant_agents, allow_tutor_agent, allow_observer_agent, cost_visible_to_teacher, requires_api_key, status, warnings_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), prototype_id=VALUES(prototype_id), mode=VALUES(mode), provider=VALUES(provider), model_id=VALUES(model_id), model_catalog_id=VALUES(model_catalog_id), voice_mode=VALUES(voice_mode), voice_provider=VALUES(voice_provider), estimated_cost_level=VALUES(estimated_cost_level), estimated_cost_notes=VALUES(estimated_cost_notes), max_duration_seconds=VALUES(max_duration_seconds), language_policy=VALUES(language_policy), pedagogical_role=VALUES(pedagogical_role), allow_participant_agents=VALUES(allow_participant_agents), allow_tutor_agent=VALUES(allow_tutor_agent), allow_observer_agent=VALUES(allow_observer_agent), cost_visible_to_teacher=VALUES(cost_visible_to_teacher), requires_api_key=VALUES(requires_api_key), status=VALUES(status), warnings_json=VALUES(warnings_json), updated_at=VALUES(updated_at)`,
        [config.id, config.title, config.description || "", config.prototypeId, config.mode, config.provider || "none", config.modelId || null, config.modelCatalogId || null, config.voiceMode || null, config.voiceProvider || null, config.estimatedCostLevel || null, config.estimatedCostNotes || null, config.maxDurationSeconds ?? null, config.languagePolicy || null, config.pedagogicalRole || null, config.allowParticipantAgents ? 1 : 0, config.allowTutorAgent ? 1 : 0, config.allowObserverAgent ? 1 : 0, config.costVisibleToTeacher === false ? 0 : 1, config.requiresApiKey ? 1 : 0, config.status || "planned", json(config.warnings || []), config.createdAt || null, config.updatedAt || null]
      );
    }
    for (const link of store.activityConfigs || []) {
      await pool.execute(
        `INSERT INTO activity_ai_config (id, activity_ownership_id, ai_config_id, assigned_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE ai_config_id=VALUES(ai_config_id), assigned_by=VALUES(assigned_by), updated_at=VALUES(updated_at)`,
        [link.id, link.activityOwnershipId, link.aiConfigId, link.assignedBy || null, link.createdAt || null, link.updatedAt || null]
      );
    }
    return;
  }

  if (name === "aiProviders") {
    for (const provider of store.providers || []) {
      await pool.execute(
        `INSERT INTO ai_providers (id, title, type, status, api_key_env_name, base_url, supports_model_sync, supports_text, supports_audio, supports_realtime, supports_embeddings, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), type=VALUES(type), status=VALUES(status), api_key_env_name=VALUES(api_key_env_name), base_url=VALUES(base_url), supports_model_sync=VALUES(supports_model_sync), supports_text=VALUES(supports_text), supports_audio=VALUES(supports_audio), supports_realtime=VALUES(supports_realtime), supports_embeddings=VALUES(supports_embeddings), notes=VALUES(notes), updated_at=VALUES(updated_at)`,
        [provider.id, provider.title, provider.type, provider.status || "planned", provider.apiKeyEnvName || null, provider.baseUrl || null, provider.supportsModelSync ? 1 : 0, provider.supportsText ? 1 : 0, provider.supportsAudio ? 1 : 0, provider.supportsRealtime ? 1 : 0, provider.supportsEmbeddings ? 1 : 0, provider.notes || null, provider.createdAt || null, provider.updatedAt || null]
      );
    }
    return;
  }

  if (name === "aiModels") {
    for (const model of store.models || []) {
      const pricing = model.pricing || {};
      await pool.execute(
        `INSERT INTO ai_models (id, provider_id, provider_model_id, title, short_description, family, modality, capabilities_json, status, source, context_window, cost_level, ic_lab_recommendation, recommended_use, pricing_json, input_price_usd, cached_input_price_usd, output_price_usd, pricing_unit, pricing_source, pricing_last_checked_at, allowed_for_teachers, allowed_for_students, allowed_for_runtime, notes, created_at, updated_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), short_description=VALUES(short_description), family=VALUES(family), modality=VALUES(modality), capabilities_json=VALUES(capabilities_json), status=VALUES(status), source=VALUES(source), context_window=VALUES(context_window), cost_level=VALUES(cost_level), ic_lab_recommendation=VALUES(ic_lab_recommendation), recommended_use=VALUES(recommended_use), pricing_json=VALUES(pricing_json), input_price_usd=VALUES(input_price_usd), cached_input_price_usd=VALUES(cached_input_price_usd), output_price_usd=VALUES(output_price_usd), pricing_unit=VALUES(pricing_unit), pricing_source=VALUES(pricing_source), pricing_last_checked_at=VALUES(pricing_last_checked_at), allowed_for_teachers=VALUES(allowed_for_teachers), allowed_for_students=VALUES(allowed_for_students), allowed_for_runtime=VALUES(allowed_for_runtime), notes=VALUES(notes), updated_at=VALUES(updated_at), last_seen_at=VALUES(last_seen_at)`,
        [model.id, model.providerId, model.providerModelId, model.title, model.shortDescription || null, model.family || null, model.modality || null, json(model.capabilities || []), model.status || "available", model.source || null, model.contextWindow ?? null, model.costLevel || null, model.icLabRecommendation || null, model.recommendedUse || null, json(pricing), pricing.inputUsd ?? null, pricing.cachedInputUsd ?? null, pricing.outputUsd ?? null, pricing.unit || null, pricing.source || null, pricing.lastCheckedAt || null, model.allowedForTeachers ? 1 : 0, model.allowedForStudents ? 1 : 0, model.allowedForRuntime ? 1 : 0, model.notes || model.adminNotes || null, model.createdAt || null, model.updatedAt || null, model.lastSeenAt || null]
      );
    }
    return;
  }

  throw new Error(`Store MariaDB inconnu: ${name}`);
}

module.exports = {
  appendRunEvent,
  createAssignmentWithOwnership,
  createRun,
  healthSummary,
  readStore,
  writeStore,
  tokenHash
};
