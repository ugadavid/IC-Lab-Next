"use strict";

const fs = require("node:fs");

function rows() {
  return JSON.parse(fs.readFileSync(process.env.PROTO05_FAKE_MARIADB_ROWS, "utf8"));
}

async function createConnection(options) {
  const tables = rows();
  return {
    async query(sql) {
      if (/^SET SESSION (?:time_zone|TRANSACTION READ ONLY)/.test(sql)) return [[], []];
      if (sql === "SELECT CURRENT_USER() AS account, DATABASE() AS database_name") {
        return [[{ account: `${options.user}@%`, database_name: options.database }], []];
      }
      if (sql === "SHOW GRANTS") {
        return [[
          { grant: `GRANT USAGE ON *.* TO \`${options.user}\`@\`%\`` },
          { grant: `GRANT SELECT, SHOW VIEW ON \`${options.database}\`.* TO \`${options.user}\`@\`%\`` }
        ], []];
      }
      if (sql === "SELECT COUNT(*) AS activity_count FROM activities WHERE deleted_at IS NULL") {
        return [[{ activity_count: (tables.activities || []).length }], []];
      }
      const tableMatch = /^SELECT \* FROM `([a-z0-9_]+)`(?: WHERE .+)? ORDER BY .+$/.exec(sql);
      if (tableMatch) return [structuredClone(tables[tableMatch[1]] || []), []];
      throw new Error(`Requête inattendue dans le faux client readonly : ${sql}`);
    },
    async end() {}
  };
}

module.exports = { createConnection };
