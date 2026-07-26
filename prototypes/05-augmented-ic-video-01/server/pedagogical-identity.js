"use strict";

const KNOWLEDGE_STATES = new Set(["known", "unknown", "to-verify", "not-applicable"]);
const RESOURCE_NATURES = new Set(["functional-test", "pedagogical-activity", "demonstration", "other"]);
const DESIGN_STATUSES = new Set(["draft", "documented", "to-review", "archived"]);
const QUALIFICATION_LEVELS = [
  "documented-by-author",
  "reviewed-by-expert",
  "experimented",
  "reused-by-third-party"
];
const EVIDENCE_TYPES = new Set([
  "author-declaration",
  "expert-review",
  "observed-use",
  "third-party-reappropriation",
  "other"
]);
const QUALIFIED_TEXT_FIELDS = [
  "intention",
  "audience",
  "useContext",
  "learningObjectives",
  "prerequisites",
  "modalities",
  "recommendedScenario",
  "pedagogicalCore",
  "adaptableElements",
  "origin",
  "responsibility",
  "limitations"
];
const COMPLETENESS_FIELDS = [
  "intention",
  "audience",
  "useContext",
  "learningObjectives",
  "prerequisites",
  "modalities",
  "recommendedScenario",
  "pedagogicalCore",
  "adaptableElements"
];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireObject(value, label) {
  if (!isObject(value)) throw new Error(`${label} doit être un objet.`);
  return value;
}

function requireString(value, label, { allowEmpty = false, max = 5000 } = {}) {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) {
    throw new Error(`${label} doit être une chaîne${allowEmpty ? "" : " non vide"} de ${max} caractères maximum.`);
  }
  return value;
}

function validateKnowledgeState(value, label, { allowNotApplicable = true } = {}) {
  requireObject(value, label);
  if (!KNOWLEDGE_STATES.has(value.state)) throw new Error(`${label}.state est inconnu.`);
  if (!allowNotApplicable && value.state === "not-applicable") throw new Error(`${label} ne peut pas être non applicable.`);
  return value.state;
}

function validateQualifiedText(value, label, options = {}) {
  const state = validateKnowledgeState(value, label, options);
  if (state === "known" || state === "to-verify" || state === "not-applicable") {
    requireString(value.value, `${label}.value`);
  } else if (value.value !== undefined && (typeof value.value !== "string" || value.value.length > 5000)) {
    throw new Error(`${label}.value doit être une chaîne de 5000 caractères maximum.`);
  }
}

function validateResourceNature(value) {
  const state = validateKnowledgeState(value, "pedagogicalIdentity.resourceNature", { allowNotApplicable: false });
  if (state === "known") {
    if (!RESOURCE_NATURES.has(value.value)) throw new Error("pedagogicalIdentity.resourceNature.value est inconnu.");
  } else if (value.value !== undefined && !RESOURCE_NATURES.has(value.value)) {
    throw new Error("pedagogicalIdentity.resourceNature.value est inconnu.");
  }
  if ((state === "to-verify" || value.value === "other") && value.note !== undefined) {
    requireString(value.note, "pedagogicalIdentity.resourceNature.note");
  }
  if (state === "to-verify" && !value.note?.trim()) {
    throw new Error("pedagogicalIdentity.resourceNature.note doit préciser ce qui reste à vérifier.");
  }
}

function validateDuration(value) {
  const label = "pedagogicalIdentity.indicativeDuration";
  const state = validateKnowledgeState(value, label);
  if (state === "known") {
    if (!Number.isInteger(value.minutes) || value.minutes <= 0 || value.minutes > 24 * 60) {
      throw new Error(`${label}.minutes doit être un entier compris entre 1 et 1440.`);
    }
  } else if (value.minutes !== undefined && (!Number.isInteger(value.minutes) || value.minutes <= 0 || value.minutes > 24 * 60)) {
    throw new Error(`${label}.minutes doit être un entier compris entre 1 et 1440.`);
  }
  if (state === "to-verify" || state === "not-applicable") requireString(value.note, `${label}.note`);
  else if (value.note !== undefined) requireString(value.note, `${label}.note`, { allowEmpty: true });
}

function validateLineage(value, activityId) {
  const label = "pedagogicalIdentity.lineage";
  const state = validateKnowledgeState(value, label, { allowNotApplicable: false });
  if (value.relation !== undefined && !["root", "variant"].includes(value.relation)) {
    throw new Error(`${label}.relation est inconnue.`);
  }
  if (state === "known") {
    if (value.relation === "root") {
      if (value.parentActivityId !== null) throw new Error(`${label}.parentActivityId doit être nul pour une racine.`);
      if (value.rootActivityId !== activityId) throw new Error(`${label}.rootActivityId doit être l’activité elle-même pour une racine.`);
    } else if (value.relation === "variant") {
      requireString(value.parentActivityId, `${label}.parentActivityId`, { max: 200 });
      requireString(value.rootActivityId, `${label}.rootActivityId`, { max: 200 });
    } else {
      throw new Error(`${label}.relation est obligatoire lorsque la filiation est établie.`);
    }
  }
  if (value.parentActivityId !== undefined && value.parentActivityId !== null) {
    requireString(value.parentActivityId, `${label}.parentActivityId`, { max: 200 });
    if (value.parentActivityId === activityId) throw new Error(`${label} ne peut pas référencer l’activité elle-même comme parent.`);
  }
  if (value.rootActivityId !== undefined && value.rootActivityId !== null) {
    requireString(value.rootActivityId, `${label}.rootActivityId`, { max: 200 });
  }
  if (state === "to-verify") requireString(value.note, `${label}.note`);
  else if (value.note !== undefined) requireString(value.note, `${label}.note`, { allowEmpty: true });
}

function validateQualification(value, index) {
  const label = `pedagogicalIdentity.qualifications[${index}]`;
  requireObject(value, label);
  requireString(value.id, `${label}.id`, { max: 200 });
  if (!QUALIFICATION_LEVELS.includes(value.level)) throw new Error(`${label}.level est inconnu.`);
  requireString(value.validatedBy, `${label}.validatedBy`, { max: 500 });
  requireString(value.validatedAt, `${label}.validatedAt`, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.validatedAt) || Number.isNaN(Date.parse(`${value.validatedAt}T00:00:00Z`))) {
    throw new Error(`${label}.validatedAt doit être une date YYYY-MM-DD valide.`);
  }
  requireString(value.context, `${label}.context`);
  if (!EVIDENCE_TYPES.has(value.evidenceType)) throw new Error(`${label}.evidenceType est inconnu.`);
  requireString(value.evidence, `${label}.evidence`);
  if (value.note !== undefined) requireString(value.note, `${label}.note`, { allowEmpty: true });
}

function validatePedagogicalIdentity(identity, activityId) {
  requireObject(identity, "pedagogicalIdentity");
  if (identity.schemaVersion !== "0.1") throw new Error("pedagogicalIdentity.schemaVersion doit être 0.1.");
  validateResourceNature(identity.resourceNature);
  if (!DESIGN_STATUSES.has(identity.designStatus)) throw new Error("pedagogicalIdentity.designStatus est inconnu.");
  for (const field of QUALIFIED_TEXT_FIELDS) validateQualifiedText(identity[field], `pedagogicalIdentity.${field}`);
  validateDuration(identity.indicativeDuration);
  validateLineage(identity.lineage, activityId);
  if (!Array.isArray(identity.qualifications)) throw new Error("pedagogicalIdentity.qualifications doit être un tableau.");
  const ids = new Set();
  identity.qualifications.forEach((qualification, index) => {
    validateQualification(qualification, index);
    if (ids.has(qualification.id)) throw new Error(`Identifiant de qualification dupliqué : ${qualification.id}.`);
    ids.add(qualification.id);
  });
  return identity;
}

function unknownText() {
  return { state: "unknown" };
}

function createEmptyPedagogicalIdentity(activityId, options = {}) {
  return {
    schemaVersion: "0.1",
    resourceNature: { state: "unknown" },
    designStatus: options.designStatus || "draft",
    intention: unknownText(),
    audience: unknownText(),
    useContext: unknownText(),
    learningObjectives: unknownText(),
    prerequisites: unknownText(),
    indicativeDuration: { state: "unknown" },
    modalities: unknownText(),
    recommendedScenario: unknownText(),
    pedagogicalCore: unknownText(),
    adaptableElements: unknownText(),
    origin: unknownText(),
    responsibility: unknownText(),
    limitations: unknownText(),
    lineage: options.lineage || {
      state: "known",
      relation: "root",
      parentActivityId: null,
      rootActivityId: activityId
    },
    qualifications: []
  };
}

function pedagogicalIdentityForDuplicate(source, copyId) {
  const identity = source.pedagogicalIdentity
    ? clone(source.pedagogicalIdentity)
    : createEmptyPedagogicalIdentity(copyId);
  const sourceLineage = source.pedagogicalIdentity?.lineage;
  identity.schemaVersion = "0.1";
  identity.designStatus = "to-review";
  identity.qualifications = [];
  if (sourceLineage?.state === "known" && sourceLineage.relation === "root") {
    identity.lineage = {
      state: "known",
      relation: "variant",
      parentActivityId: source.id,
      rootActivityId: source.id
    };
  } else if (sourceLineage?.state === "known" && sourceLineage.relation === "variant") {
    identity.lineage = {
      state: "known",
      relation: "variant",
      parentActivityId: source.id,
      rootActivityId: sourceLineage.rootActivityId
    };
  } else {
    identity.lineage = {
      state: "to-verify",
      relation: "variant",
      parentActivityId: source.id,
      rootActivityId: null,
      note: "Parent direct établi par duplication ; racine pédagogique antérieure à vérifier."
    };
  }
  validatePedagogicalIdentity(identity, copyId);
  return identity;
}

function assertPedagogicalLineage(activity, activities) {
  if (!activity.pedagogicalIdentity) return;
  validatePedagogicalIdentity(activity.pedagogicalIdentity, activity.id);
  const byId = new Map(activities.map(item => [item.id, item]));
  byId.set(activity.id, activity);
  const lineage = activity.pedagogicalIdentity.lineage;
  if (lineage.parentActivityId && !byId.has(lineage.parentActivityId)) {
    throw new Error(`Activité parente pédagogique introuvable : ${lineage.parentActivityId}.`);
  }
  if (lineage.state === "known" && lineage.relation === "variant" && !byId.has(lineage.rootActivityId)) {
    throw new Error(`Activité racine pédagogique introuvable : ${lineage.rootActivityId}.`);
  }
  if (lineage.state === "known" && lineage.relation === "variant") {
    const parentLineage = byId.get(lineage.parentActivityId)?.pedagogicalIdentity?.lineage;
    if (parentLineage?.state === "known") {
      const expectedRoot = parentLineage.relation === "root" ? lineage.parentActivityId : parentLineage.rootActivityId;
      if (lineage.rootActivityId !== expectedRoot) throw new Error("La racine pédagogique de la variante est incohérente avec son parent.");
    }
  }
  const visited = new Set();
  let cursor = activity;
  while (cursor?.pedagogicalIdentity?.lineage?.parentActivityId) {
    if (visited.has(cursor.id)) throw new Error("La filiation pédagogique contient un cycle.");
    visited.add(cursor.id);
    cursor = byId.get(cursor.pedagogicalIdentity.lineage.parentActivityId);
  }
}

function resolvedKnowledge(value) {
  return value?.state === "known" || value?.state === "not-applicable";
}

function summarizePedagogicalIdentity(activity) {
  if (!activity.pedagogicalIdentity) {
    return {
      presence: "absent",
      completeness: "incomplete",
      missingFields: ["pedagogicalIdentity"],
      qualificationLevel: "unqualified",
      qualificationLevels: [],
      requalificationRequired: false
    };
  }
  try {
    validatePedagogicalIdentity(activity.pedagogicalIdentity, activity.id);
  } catch (error) {
    return {
      presence: "invalid",
      completeness: "incomplete",
      missingFields: ["pedagogicalIdentity"],
      qualificationLevel: "unqualified",
      qualificationLevels: [],
      requalificationRequired: true,
      validationError: error.message
    };
  }
  const identity = activity.pedagogicalIdentity;
  const missingFields = [];
  if (identity.resourceNature.state !== "known") missingFields.push("resourceNature");
  for (const field of COMPLETENESS_FIELDS) if (!resolvedKnowledge(identity[field])) missingFields.push(field);
  if (!resolvedKnowledge(identity.indicativeDuration)) missingFields.push("indicativeDuration");
  const qualificationLevels = [...new Set(identity.qualifications.map(item => item.level))];
  const qualificationLevel = [...QUALIFICATION_LEVELS].reverse().find(level => qualificationLevels.includes(level)) || "unqualified";
  return {
    presence: "present",
    completeness: missingFields.length ? "incomplete" : "complete",
    missingFields,
    qualificationLevel,
    qualificationLevels,
    requalificationRequired: identity.designStatus === "to-review"
      || (identity.lineage.relation === "variant" && identity.qualifications.length === 0),
    resourceNature: identity.resourceNature,
    designStatus: identity.designStatus,
    intention: identity.intention,
    audience: identity.audience,
    useContext: identity.useContext
  };
}

module.exports = {
  DESIGN_STATUSES,
  EVIDENCE_TYPES,
  KNOWLEDGE_STATES,
  QUALIFICATION_LEVELS,
  RESOURCE_NATURES,
  assertPedagogicalLineage,
  createEmptyPedagogicalIdentity,
  pedagogicalIdentityForDuplicate,
  summarizePedagogicalIdentity,
  validatePedagogicalIdentity
};
