"use strict";

const DATA_MODES = Object.freeze(["json", "compare", "mariadb-readonly", "mariadb"]);

function dataModeFromEnvironment(environment = process.env) {
  const value = String(environment.PROTO05_DATA_MODE || "json").trim();
  if (!DATA_MODES.includes(value)) {
    throw new Error(`PROTO05_DATA_MODE invalide. Valeurs acceptées : ${DATA_MODES.join(", ")}.`);
  }
  return value;
}

function requiredConfiguration(environment, key) {
  const value = environment[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Configuration MariaDB incomplète : ${key} est obligatoire.`);
  }
  return value.trim();
}

function mariadbConfigurationFromEnvironment(environment = process.env) {
  const portText = requiredConfiguration(environment, "PROTO05_MARIADB_PORT");
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Configuration MariaDB invalide : PROTO05_MARIADB_PORT doit être un port valide.");
  }
  return Object.freeze({
    host: requiredConfiguration(environment, "PROTO05_MARIADB_HOST"),
    port,
    database: requiredConfiguration(environment, "PROTO05_MARIADB_DATABASE"),
    user: requiredConfiguration(environment, "PROTO05_MARIADB_USER"),
    password: requiredConfiguration(environment, "PROTO05_MARIADB_PASSWORD")
  });
}

function readonlyMutationPayload(mode) {
  return {
    code: "PROTO05_READONLY_MODE",
    error: `Mutation refusée : le mode ${mode} est strictement en lecture seule.`,
    dataMode: mode
  };
}

module.exports = {
  DATA_MODES,
  dataModeFromEnvironment,
  mariadbConfigurationFromEnvironment,
  readonlyMutationPayload
};
