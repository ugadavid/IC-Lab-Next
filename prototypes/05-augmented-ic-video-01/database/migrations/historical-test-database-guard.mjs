"use strict";

const PRODUCTION_DATABASE = "ic_augmented_video";
const TEST_DATABASE_PATTERN = /^proto05_(?:test|m\d+)_[a-z0-9_]+$/;

function guardError(code, message, database = null) {
  return Object.assign(new Error(message), { code, database });
}

function assertExplicitHistoricalTestDatabase(database, { explicit = false } = {}) {
  if (!explicit || typeof database !== "string" || !database.trim()) {
    throw guardError(
      "HISTORICAL_TEST_DATABASE_REQUIRED",
      "Cet outil historique exige une cible de test explicite via --database."
    );
  }
  const normalized = database.trim();
  if (normalized.toLowerCase() === PRODUCTION_DATABASE) {
    throw guardError(
      "HISTORICAL_PRODUCTION_DATABASE_FORBIDDEN",
      `Cet outil historique refuse la base métier réelle ${PRODUCTION_DATABASE}.`,
      normalized
    );
  }
  if (!TEST_DATABASE_PATTERN.test(normalized)) {
    throw guardError(
      "HISTORICAL_TEST_DATABASE_NAME_REQUIRED",
      "La cible explicite doit être une base de test Proto05 nommée proto05_test_* ou proto05_m<mission>_*.",
      normalized
    );
  }
  return normalized;
}

export {
  PRODUCTION_DATABASE,
  TEST_DATABASE_PATTERN,
  assertExplicitHistoricalTestDatabase
};
