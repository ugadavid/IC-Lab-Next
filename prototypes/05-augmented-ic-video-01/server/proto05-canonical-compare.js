"use strict";

const UNORDERED_COLLECTION_KEYS = new Set([
  "activities",
  "languages",
  "assets",
  "sources",
  "playables",
  "treatments",
  "videos",
  "folders",
  "tags",
  "speakerIds",
  "languageIds",
  "phenomenonIds",
  "layerIds",
  "tagIds",
  "sourceIds",
  "playableIds",
  "defaultVisibleLayerIds",
  "learnerVisibleLayerIds",
  "teacherVisibleLayerIds"
]);

const NON_SEMANTIC_DOCUMENT_PATHS = new Set([
  "$.activities.updatedAt",
  "$.activityLibrary.updatedAt",
  "$.videoCatalog.updatedAt",
  "$.videoLibrary.updatedAt"
]);

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, stableValue(value[key])])
  );
}

function stableText(value) {
  return JSON.stringify(stableValue(value));
}

function collectionKey(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["id", "activityId", "assetId", "playableId", "languageId", "layerId"]) {
      if (typeof value[key] === "string") return `${key}:${value[key]}:${stableText(value)}`;
    }
  }
  return stableText(value);
}

function normalizedForComparison(value, path = "$", key = null) {
  if (NON_SEMANTIC_DOCUMENT_PATHS.has(path)) return "<documentary-timestamp>";
  if (Array.isArray(value)) {
    const normalized = value.map((item, index) => normalizedForComparison(item, `${path}[${index}]`));
    if (UNORDERED_COLLECTION_KEYS.has(key)) normalized.sort((left, right) => collectionKey(left).localeCompare(collectionKey(right)));
    return normalized;
  }
  if (!value || typeof value !== "object") return value;
  const source = { ...value };
  if (path.startsWith("$.videoCatalog.videos[") && !Object.prototype.hasOwnProperty.call(source, "durationMs")) {
    source.durationMs = null;
  }
  if (
    source.kind === "local-file"
    && (source.location?.storageKey || source.storageKey)
    && ["available", "missing-local"].includes(source.availability)
    && [null, undefined, "missing-file"].includes(source.availabilityReason)
  ) {
    source.availability = "<local-filesystem-observation>";
    source.availabilityReason = "<local-filesystem-observation>";
    if (["available", "pending"].includes(source.status)) {
      source.status = "<local-filesystem-observation>";
    }
  }
  return Object.fromEntries(
    Object.keys(source).sort().map(childKey => [
      childKey,
      normalizedForComparison(source[childKey], `${path}.${childKey}`, childKey)
    ])
  );
}

function summarized(value) {
  const text = stableText(value);
  return text.length <= 240 ? text : `${text.slice(0, 237)}...`;
}

function compareCanonical(left, right, options = {}) {
  const operation = options.operation || "read";
  const entityId = options.entityId || null;
  const differences = [];

  function visit(jsonValue, mariaValue, path) {
    if (differences.length >= (options.maxDifferences || 200)) return;
    const jsonType = valueType(jsonValue);
    const mariaType = valueType(mariaValue);
    if (jsonType !== mariaType) {
      differences.push({
        operation,
        entityId,
        path,
        kind: "type",
        json: summarized(jsonValue),
        mariadb: summarized(mariaValue)
      });
      return;
    }
    if (jsonType === "array") {
      if (jsonValue.length !== mariaValue.length) {
        differences.push({
          operation,
          entityId,
          path,
          kind: "array-length",
          json: String(jsonValue.length),
          mariadb: String(mariaValue.length)
        });
      }
      const length = Math.min(jsonValue.length, mariaValue.length);
      for (let index = 0; index < length; index += 1) visit(jsonValue[index], mariaValue[index], `${path}[${index}]`);
      return;
    }
    if (jsonType === "object") {
      const keys = [...new Set([...Object.keys(jsonValue), ...Object.keys(mariaValue)])].sort();
      for (const key of keys) {
        const jsonHas = Object.prototype.hasOwnProperty.call(jsonValue, key);
        const mariaHas = Object.prototype.hasOwnProperty.call(mariaValue, key);
        if (jsonHas !== mariaHas) {
          differences.push({
            operation,
            entityId,
            path: `${path}.${key}`,
            kind: jsonHas ? "missing-in-mariadb" : "extra-in-mariadb",
            json: jsonHas ? summarized(jsonValue[key]) : "<absent>",
            mariadb: mariaHas ? summarized(mariaValue[key]) : "<absent>"
          });
        } else {
          visit(jsonValue[key], mariaValue[key], `${path}.${key}`);
        }
      }
      return;
    }
    if (!Object.is(jsonValue, mariaValue)) {
      differences.push({
        operation,
        entityId,
        path,
        kind: "value",
        json: summarized(jsonValue),
        mariadb: summarized(mariaValue)
      });
    }
  }

  visit(
    normalizedForComparison(left),
    normalizedForComparison(right),
    "$"
  );
  return {
    operation,
    entityId,
    total: differences.length,
    differences
  };
}

module.exports = {
  compareCanonical,
  normalizedForComparison,
  stableText
};
