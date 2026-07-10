const { dbConfig, getPool } = require("./db");

async function hasRoutine(connection, schema, routineName) {
  const [rows] = await connection.execute(
    `SELECT ROUTINE_NAME
     FROM INFORMATION_SCHEMA.ROUTINES
     WHERE ROUTINE_SCHEMA = ?
       AND ROUTINE_TYPE = 'PROCEDURE'
       AND ROUTINE_NAME = ?`,
    [schema, routineName]
  );
  return rows.length > 0;
}

async function hasView(connection, schema, viewName) {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.VIEWS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?`,
    [schema, viewName]
  );
  return rows.length > 0;
}

async function main() {
  const config = dbConfig();
  const connection = await getPool().getConnection();
  const requiredProcedures = [
    "sp_create_run",
    "sp_append_run_event",
    "sp_assign_activity_with_ownership"
  ];
  const optionalViews = ["vw_activity_ownership_full"];
  let missing = 0;

  try {
    console.log("IC-Hub DB routines check");
    console.log(`Database: ${config.database}`);
    for (const name of requiredProcedures) {
      const ok = await hasRoutine(connection, config.database, name);
      if (!ok) missing += 1;
      console.log(`${name}: ${ok ? "OK" : "MISSING"}`);
    }
    for (const name of optionalViews) {
      const ok = await hasView(connection, config.database, name);
      console.log(`${name}: ${ok ? "OK" : "MISSING"}`);
    }
    console.log(`Status: ${missing ? "ERROR" : "OK"}`);
    if (missing) process.exitCode = 1;
  } finally {
    connection.release();
    await getPool().end();
  }
}

main().catch((error) => {
  console.error("IC-Hub DB routines check failed");
  console.error(error.stack || error.message);
  process.exit(1);
});
