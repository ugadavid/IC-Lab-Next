const { dbConfig, getPool } = require("./db");

async function scalar(connection, sql, params = []) {
  const [rows] = await connection.execute(sql, params);
  return Number(rows[0]?.count || 0);
}

async function rows(connection, sql, params = []) {
  const [result] = await connection.execute(sql, params);
  return result;
}

function issue(list, level, table, id, explanation) {
  list.push({ level, table, id: id || "n/a", explanation });
}

async function main() {
  const config = dbConfig();
  const connection = await getPool().getConnection();
  const issues = [];
  try {
    await connection.query("SELECT 1 AS ok");
    const counts = {
      users: await scalar(connection, "SELECT COUNT(*) AS count FROM users"),
      courses: await scalar(connection, "SELECT COUNT(*) AS count FROM courses"),
      enrollments: await scalar(connection, "SELECT COUNT(*) AS count FROM enrollments"),
      assignments: await scalar(connection, "SELECT COUNT(*) AS count FROM course_activities"),
      ownership: await scalar(connection, "SELECT COUNT(*) AS count FROM activity_ownership"),
      aiConfigs: await scalar(connection, "SELECT COUNT(*) AS count FROM ai_configs"),
      activityAiConfigs: await scalar(connection, "SELECT COUNT(*) AS count FROM activity_ai_config"),
      aiProviders: await scalar(connection, "SELECT COUNT(*) AS count FROM ai_providers"),
      aiModels: await scalar(connection, "SELECT COUNT(*) AS count FROM ai_models"),
      runs: await scalar(connection, "SELECT COUNT(*) AS count FROM runs"),
      runEvents: await scalar(connection, "SELECT COUNT(*) AS count FROM run_events")
    };

    for (const row of await rows(connection, `
      SELECT r.id
      FROM runs r
      LEFT JOIN run_events e ON e.run_id = r.id
      GROUP BY r.id
      HAVING COUNT(e.id) = 0
    `)) {
      issue(issues, "warning", "runs", row.id, "run sans evenement associe");
    }

    for (const row of await rows(connection, `
      SELECT e.id, e.run_id
      FROM run_events e
      LEFT JOIN runs r ON r.id = e.run_id
      WHERE r.id IS NULL
    `)) {
      issue(issues, "error", "run_events", row.id, `evenement rattache a un run absent: ${row.run_id}`);
    }

    for (const row of await rows(connection, `
      SELECT a.id, a.course_id
      FROM course_activities a
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE c.id IS NULL
    `)) {
      issue(issues, "error", "course_activities", row.id, `assignation rattachee a un cours absent: ${row.course_id}`);
    }

    for (const row of await rows(connection, `
      SELECT a.id, a.prototype_id
      FROM course_activities a
      LEFT JOIN prototypes p ON p.id = a.prototype_id
      WHERE p.id IS NULL
    `)) {
      issue(issues, "error", "course_activities", row.id, `assignation rattachee a un prototype absent: ${row.prototype_id}`);
    }

    for (const row of await rows(connection, `
      SELECT e.id, e.user_id, e.course_id
      FROM enrollments e
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE u.id IS NULL OR c.id IS NULL
    `)) {
      issue(issues, "error", "enrollments", row.id, `inscription orpheline user=${row.user_id} course=${row.course_id}`);
    }

    for (const row of await rows(connection, `
      SELECT o.id, o.prototype_id
      FROM activity_ownership o
      LEFT JOIN prototypes p ON p.id = o.prototype_id
      WHERE p.id IS NULL
    `)) {
      issue(issues, "error", "activity_ownership", row.id, `ownership rattache a un prototype absent: ${row.prototype_id}`);
    }

    for (const row of await rows(connection, `
      SELECT prototype_id, activity_id, activity_source, COUNT(*) AS count
      FROM activity_ownership
      GROUP BY prototype_id, activity_id, activity_source
      HAVING COUNT(*) > 1
    `)) {
      issue(issues, "warning", "activity_ownership", `${row.prototype_id}/${row.activity_id}/${row.activity_source}`, `doublon potentiel ownership count=${row.count}`);
    }

    for (const row of await rows(connection, `
      SELECT prototype_id, activity_id, activity_source, COUNT(*) AS count
      FROM course_activities
      GROUP BY prototype_id, activity_id, activity_source
      HAVING COUNT(*) > 1
    `)) {
      issue(issues, "warning", "course_activities", `${row.prototype_id}/${row.activity_id}/${row.activity_source}`, `activite assignee plusieurs fois count=${row.count}`);
    }

    const errors = issues.filter((item) => item.level === "error").length;
    const warnings = issues.filter((item) => item.level === "warning").length;

    console.log("IC-Hub DB consistency check");
    console.log(`Database: ${config.database}`);
    console.log(`Users: ${counts.users}`);
    console.log(`Courses: ${counts.courses}`);
    console.log(`Enrollments: ${counts.enrollments}`);
    console.log(`Assignments: ${counts.assignments}`);
    console.log(`Ownership records: ${counts.ownership}`);
    console.log(`AI configs: ${counts.aiConfigs}`);
    console.log(`Activity AI config links: ${counts.activityAiConfigs}`);
    console.log(`AI providers: ${counts.aiProviders}`);
    console.log(`AI models: ${counts.aiModels}`);
    console.log(`Runs: ${counts.runs}`);
    console.log(`Run events: ${counts.runEvents}`);
    for (const item of issues) {
      console.log(`${item.level.toUpperCase()} ${item.table} ${item.id}: ${item.explanation}`);
    }
    console.log(`Warnings: ${warnings}`);
    console.log(`Errors: ${errors}`);
    console.log(`Status: ${errors ? "ERROR" : warnings ? "WARNINGS" : "OK"}`);
    if (errors) process.exitCode = 1;
  } finally {
    connection.release();
    await getPool().end();
  }
}

main().catch((error) => {
  console.error("IC-Hub DB consistency check failed");
  console.error(error.stack || error.message);
  process.exit(1);
});
