"use strict";

const ENTRY_API_BASE_URL = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
const ENTRY_LANGUAGE_ORDER = ["fr", "es", "it", "pt", "en"];
const ENTRY_PUBLIC_LABELS = {
  noun: "Nom", verb: "Verbe", adjective: "Adjectif", adverb: "Adverbe", connector: "Connecteur", other: "Autre",
  COGNATE_STRONG: "Cognat fort", COGNATE_WEAK: "Cognat possible", FALSE_FRIEND: "Faux ami", RELATED_FORM: "Forme apparentée",
  manual_admin_v0: "Saisie manuelle dans l’administration", manual_seed: "Corpus initial Dico-IC",
  manual_seed_v2: "Corpus manuel enrichi", api_mock_support_v0: "Support historique du prototype API",
};

function entryPublicLabel(value) { return ENTRY_PUBLIC_LABELS[value] || value || "Non renseigné"; }

function confidenceLabel(value) {
  if (value === null || value === undefined) return "Non renseignée";
  const score = Number(value);
  const level = score >= 0.95 ? "Très élevée" : score >= 0.8 ? "Élevée" : score >= 0.6 ? "Moyenne" : "Faible";
  return `${level} (${score.toFixed(3)})`;
}

function provenanceLabel(value, missingMessage = "Provenance non renseignée dans le modèle V0.") {
  return value ? entryPublicLabel(value) : missingMessage;
}

function sortEntryForms(forms) {
  const order = new Map(ENTRY_LANGUAGE_ORDER.map((language, index) => [language, index]));
  return [...forms].sort((left, right) => {
    const leftOrder = order.has(left.language) ? order.get(left.language) : Number.MAX_SAFE_INTEGER;
    const rightOrder = order.has(right.language) ? order.get(right.language) : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.language.localeCompare(right.language) || Number(left.id) - Number(right.id);
  });
}

function documentedRelationModels(entry, relations) {
  const formsById = new Map(entry.forms.map((form) => [Number(form.id), form]));
  return relations.map((relation) => ({
    relation,
    source: formsById.get(Number(relation.source_form_id)),
    target: formsById.get(Number(relation.target_form_id)),
  })).filter((item) => item.source && item.target);
}

function technicalValue(label, code) { return label === code ? label : `${label} · ${code}`; }

function appendDefinition(list, label, value, className = "") {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  if (className) description.className = className;
  list.append(term, description);
  return description;
}

function renderEntryForm(form, languageNames) {
  const card = document.createElement("article");
  card.className = "entry-form-card";
  card.dataset.language = form.language;
  const language = document.createElement("div");
  language.className = "form-language";
  const name = document.createElement("strong");
  name.textContent = languageNames.get(form.language) || form.language.toUpperCase();
  const code = document.createElement("span");
  code.textContent = form.language === "en" ? "Langue de comparaison — non romane" : `Langue romane documentée · ${form.language.toUpperCase()}`;
  language.append(name, code);
  const lemma = document.createElement("p");
  lemma.className = "form-lemma";
  lemma.textContent = form.lemma;
  const details = document.createElement("dl");
  details.className = "entry-definition-list";
  appendDefinition(details, "Catégorie", technicalValue(entryPublicLabel(form.part_of_speech), form.part_of_speech));
  if (form.normalized_lemma && form.normalized_lemma !== form.lemma.toLocaleLowerCase("fr")) appendDefinition(details, "Normalisée", form.normalized_lemma, "technical-inline");
  appendDefinition(details, "Confiance", confidenceLabel(form.confidence_score));
  if (form.source_label) appendDefinition(details, "Provenance", provenanceLabel(form.source_label)).title = `Code technique : ${form.source_label}`;
  card.append(language, lemma, details);
  return card;
}

function renderRelationCard(model, languageNames) {
  const { relation, source, target } = model;
  const card = document.createElement("article");
  card.className = "documented-relation-card";
  if (source.language === "en" || target.language === "en") card.dataset.comparison = "english";
  const pair = document.createElement("div");
  pair.className = "documented-relation-pair";
  const title = document.createElement("h4");
  title.textContent = `${source.lemma} ↔ ${target.lemma}`;
  const languages = document.createElement("p");
  languages.textContent = `${languageNames.get(source.language) || source.language.toUpperCase()} · ${source.language.toUpperCase()} ↔ ${languageNames.get(target.language) || target.language.toUpperCase()} · ${target.language.toUpperCase()}`;
  pair.append(title, languages);
  const type = document.createElement("p");
  type.className = "documented-relation-type";
  type.textContent = technicalValue(entryPublicLabel(relation.relation_type), relation.relation_type);
  const details = document.createElement("dl");
  details.className = "entry-definition-list relation-definition-list";
  appendDefinition(details, "Score", relation.score === null ? "Non renseigné" : Number(relation.score).toFixed(3));
  appendDefinition(details, "Confiance", confidenceLabel(relation.confidence_score));
  appendDefinition(details, "Provenance", provenanceLabel(relation.source_label));
  card.append(pair, type, details);
  return card;
}

async function entryApiRequest(path) {
  const response = await fetch(`${ENTRY_API_BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Erreur HTTP ${response.status}.`);
  return data;
}

async function loadConsultation() {
  const entryKey = new URLSearchParams(window.location.search).get("entry_key");
  if (!entryKey) throw new Error("La clé conceptuelle manque dans l’URL.");
  const [entryData, languageData] = await Promise.all([
    entryApiRequest(`/admin/lexical-entry/${encodeURIComponent(entryKey)}`),
    entryApiRequest("/languages"),
  ]);
  const entry = entryData.entry;
  const relations = entryData.relations || [];
  const languageNames = new Map((languageData.languages || []).map((language) => [language.code, language.name]));
  const workbenchUrl = `./index-admin-entry-workbench-0.1.html?entry_key=${encodeURIComponent(entry.entry_key)}`;
  document.getElementById("workbenchLink").href = workbenchUrl;
  document.getElementById("emptyWorkbenchLink").href = workbenchUrl;
  document.title = `${entry.gloss_fr} — Dico-IC`;
  document.getElementById("entryKey").textContent = entry.entry_key;
  document.getElementById("glossFr").textContent = entry.gloss_fr || "Glose française non renseignée";
  document.getElementById("glossEn").textContent = entry.gloss_en ? `Anglais : ${entry.gloss_en}` : "Glose anglaise non renseignée";
  document.getElementById("semanticDomain").textContent = entry.semantic_domain || "Non renseigné";
  document.getElementById("formCount").textContent = `· ${entry.forms.length}`;
  document.getElementById("formsGrid").replaceChildren(...sortEntryForms(entry.forms).map((form) => renderEntryForm(form, languageNames)));
  const relationModels = documentedRelationModels(entry, relations);
  document.getElementById("relationCount").textContent = `· ${relationModels.length}`;
  document.getElementById("relationsGrid").replaceChildren(...relationModels.map((model) => renderRelationCard(model, languageNames)));
  document.getElementById("relationsGrid").hidden = relationModels.length === 0;
  document.getElementById("emptyRelations").hidden = relationModels.length !== 0;
  document.getElementById("entryContent").hidden = false;
  const apiStatus = document.getElementById("apiStatus");
  apiStatus.dataset.state = "ready";
  apiStatus.textContent = "Données Dico-IC chargées";
}

function initializeConsultation() {
  loadConsultation().catch((error) => {
    document.getElementById("entryContent").hidden = true;
    document.getElementById("entryError").hidden = false;
    document.getElementById("entryErrorMessage").textContent = error.message;
    const apiStatus = document.getElementById("apiStatus");
    apiStatus.dataset.state = "error";
    apiStatus.textContent = "Chargement impossible";
  });
}

if (typeof document !== "undefined") initializeConsultation();

if (typeof module !== "undefined") {
  module.exports = { confidenceLabel, documentedRelationModels, entryPublicLabel, provenanceLabel, sortEntryForms, technicalValue };
}
