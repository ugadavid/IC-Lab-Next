"use strict";

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

module.exports = {
  mariadbConfigurationFromEnvironment
};
