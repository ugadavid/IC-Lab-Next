const mysql = require("mysql2/promise");

function dbConfig() {
  return {
    host: process.env.IC_HUB_DB_HOST || "127.0.0.1",
    port: Number(process.env.IC_HUB_DB_PORT || 3306),
    database: process.env.IC_HUB_DB_NAME || "ic_hub",
    user: process.env.IC_HUB_DB_USER || "ic_hub_user",
    password: process.env.IC_HUB_DB_PASSWORD || "ic_hub_pass",
    charset: "utf8mb4",
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10
  };
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig());
  }
  return pool;
}

async function testConnection() {
  const [rows] = await getPool().query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

module.exports = {
  dbConfig,
  getPool,
  testConnection
};
