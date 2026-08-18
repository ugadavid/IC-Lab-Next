"use strict";

const ENTRY_API_BASE_URL = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
const ENTRY_LANGUAGE_ORDER = ["fr", "es", "it", "pt", "en"];

const ENTRY_PUBLIC_LABELS = {
  noun: "Nom", verb: "Verbe", adjective: "Adjectif", adverb: "Adverbe",
  connector: "Connecteur", other: "Autre",
  COGNATE_STRONG: "Cognat fort", COGNATE_WEAK: "Cognat possible",
  FALSE_FRIEND: "Faux ami", RELATED_FORM: "Forme apparentée",
  manual_admin_v0: "Saisie manuelle dans l’administration",
  manual_seed: "Corpus initial Dico-IC",
  manual_seed_v2: "Corpus manuel enrichi",
  api_mock_support_v0: "Support historique du prototype API",
};

function entryPublicLabel(value) {
  return ENTRY_PUBLIC_LABELS[value] || value || "Non renseigné";
}

function confidenceLabel(value) {
  if (value === null || value === undefined) return "Non renseignée";
  const score = Number(value);
  const level = score >= 0.95 ? "Très élevée" : score >= 0.8 ? "Élevée" : score >= 0.6 ? "Moyenne" : "Faible";
  return `${level} (${score.toFixed(3)})`;
}

function provenanceLabel(value, missingMessage = "Provenance non renseignée dans le modèle V0.") {
  if (!value) return missingMessage;
  const label = entryPublicLabel(value);
  return label;
}

function sortEntryForms(forms) {
  const order = new Map(ENTRY_LANGUAGE_ORDER.map((language, index) => [language, index]));
  return [...forms].sort((left, right) => {
    const leftOrder = order.has(left.language) ? order.get(left.language) : Number.MAX_SAFE_INTEGER;
    const rightOrder = order.has(right.language) ? order.get(right.language) : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.language.localeCompare(right.language);
  });
}

function technicalValue(label, code) {
  return label === code ? label : `${label} · ${code}`;
}

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
  code.textContent = form.language === "en"
    ? "Langue de comparaison — non romane"
    : `Cœur roman · ${form.language.toUpperCase()}`;
  language.append(name, code);
  const lemma = document.createElement("p");
  lemma.className = "form-lemma";
  lemma.textContent = form.lemma;
  const details = document.createElement("dl");
  details.className = "entry-definition-list";
  appendDefinition(details, "Catégorie", technicalValue(entryPublicLabel(form.part_of_speech), form.part_of_speech));
  if (form.normalized_lemma && form.normalized_lemma !== form.lemma.toLocaleLowerCase("fr")) {
    appendDefinition(details, "Normalisée", form.normalized_lemma, "technical-inline");
  }
  appendDefinition(details, "Confiance", confidenceLabel(form.confidence_score));
  if (form.source_label) {
    const provenance = appendDefinition(details, "Provenance", provenanceLabel(form.source_label));
    provenance.title = `Code technique : ${form.source_label}`;
  }
  card.append(language, lemma, details);
  return card;
}

function renderEntryRelation(relation, formsById, languageNames) {
  const source = formsById.get(Number(relation.source_form_id));
  const target = formsById.get(Number(relation.target_form_id));
  const card = document.createElement("article");
  card.className = "relation-card";
  for (const [form, sideClass] of [[source, "source"], [target, "target"]]) {
    const side = document.createElement("div");
    side.className = `relation-form-side ${sideClass}`;
    const lemma = document.createElement("strong");
    lemma.textContent = form?.lemma || "Forme inconnue";
    const language = document.createElement("span");
    language.textContent = form ? `${languageNames.get(form.language) || form.language.toUpperCase()} · ${form.language.toUpperCase()}` : "—";
    side.append(lemma, language);
    if (sideClass === "source") {
      card.appendChild(side);
      const arrow = document.createElement("span");
      arrow.className = "relation-arrow-compact";
      arrow.textContent = relation.is_symmetric ? "↔" : "→";
      card.appendChild(arrow);
    } else {
      card.appendChild(side);
    }
  }
  const data = document.createElement("div");
  data.className = "relation-data";
  const type = document.createElement("strong");
  type.textContent = technicalValue(entryPublicLabel(relation.relation_type), relation.relation_type);
  const score = document.createElement("span");
  score.textContent = `Score ${relation.score === null ? "non renseigné" : Number(relation.score).toFixed(3)}`;
  const confidence = document.createElement("span");
  confidence.textContent = `Confiance ${confidenceLabel(relation.confidence_score)}`;
  const provenance = document.createElement("span");
  provenance.textContent = `Provenance : ${provenanceLabel(relation.source_label, "non renseignée")}`;
  if (relation.source_label) provenance.title = `Code technique : ${relation.source_label}`;
  data.append(type, score, confidence, provenance);
  card.appendChild(data);
  return card;
}

async function entryApiRequest(path) {
  const response = await fetch(`${ENTRY_API_BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Erreur HTTP ${response.status}.`);
  return data;
}

async function loadEntryPage() {
  const apiStatus = document.getElementById("apiStatus");
  const entryContent = document.getElementById("entryContent");
  const entryError = document.getElementById("entryError");
  const entryKey = new URLSearchParams(window.location.search).get("entry_key")?.trim().toUpperCase();
  if (!entryKey) throw new Error("Ajoutez une clé avec ?entry_key=INFORMATION_DATA.");
  const [entryResponse, languagesResponse] = await Promise.all([
    entryApiRequest(`/admin/lexical-entry/${encodeURIComponent(entryKey)}`),
    entryApiRequest("/languages"),
  ]);
  const { entry, relations } = entryResponse;
  const languageNames = new Map(languagesResponse.languages.map((language) => [language.code, language.name]));
  document.title = `${entry.gloss_fr} — Dico-IC`;
  document.getElementById("entryKey").textContent = entry.entry_key;
  document.getElementById("glossFr").textContent = entry.gloss_fr || "Glose française non renseignée";
  document.getElementById("glossEn").textContent = entry.gloss_en ? `Anglais : ${entry.gloss_en}` : "Glose anglaise non renseignée";
  document.getElementById("semanticDomain").textContent = entry.semantic_domain || "Non renseigné";
  document.getElementById("formCount").textContent = `· ${entry.forms.length}`;
  document.getElementById("relationCount").textContent = `· ${relations.length}`;
  const formsGrid = document.getElementById("formsGrid");
  const sortedForms = sortEntryForms(entry.forms);
  const formsById = new Map(sortedForms.map((form) => [Number(form.id), form]));
  for (const form of sortedForms) formsGrid.appendChild(renderEntryForm(form, languageNames));
  const relationsGrid = document.getElementById("relationsGrid");
  for (const relation of relations) relationsGrid.appendChild(renderEntryRelation(relation, formsById, languageNames));
  entryError.hidden = true;
  entryContent.hidden = false;
  apiStatus.dataset.state = "online";
  apiStatus.textContent = "Données Dico-IC chargées";
}

if (typeof document !== "undefined") {
  loadEntryPage().catch((error) => {
    document.getElementById("entryContent").hidden = true;
    document.getElementById("entryError").hidden = false;
    document.getElementById("entryErrorMessage").textContent = error.message;
    const apiStatus = document.getElementById("apiStatus");
    apiStatus.dataset.state = "error";
    apiStatus.textContent = "Chargement impossible";
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    ENTRY_LANGUAGE_ORDER,
    confidenceLabel,
    entryPublicLabel,
    provenanceLabel,
    sortEntryForms,
    technicalValue,
  };
}
