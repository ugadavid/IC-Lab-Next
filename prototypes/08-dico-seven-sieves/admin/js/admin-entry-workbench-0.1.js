"use strict";

const ENTRY_API_BASE_URL = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
const ENTRY_LANGUAGE_ORDER = ["fr", "es", "it", "pt", "en"];
const ENTRY_PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb", "connector", "other"];

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

function relationPairKey(leftId, rightId) {
  return [Number(leftId), Number(rightId)].sort((left, right) => left - right).join(":");
}

function buildFormPairs(forms, relations = []) {
  const sorted = sortEntryForms(forms);
  const relationsByPair = new Map();
  for (const relation of relations) {
    const key = relationPairKey(relation.source_form_id, relation.target_form_id);
    if (!relationsByPair.has(key)) relationsByPair.set(key, relation);
  }
  const pairs = [];
  for (let left = 0; left < sorted.length; left += 1) {
    for (let right = left + 1; right < sorted.length; right += 1) {
      const source = sorted[left];
      const target = sorted[right];
      const key = relationPairKey(source.id, target.id);
      pairs.push({ key, source, target, relation: relationsByPair.get(key) || null });
    }
  }
  return pairs;
}

function relationCoverage(pairs) {
  return { present: pairs.filter((pair) => pair.relation).length, total: pairs.length };
}

function entryPayload(entry) {
  return {
    entry_key: entry.entry_key,
    gloss_fr: entry.gloss_fr || "",
    gloss_en: entry.gloss_en || null,
    semantic_domain: entry.semantic_domain || null,
    forms: sortEntryForms(entry.forms).map((form) => ({
      id: Number(form.id), language: form.language, lemma: form.lemma, part_of_speech: form.part_of_speech || "other",
    })),
  };
}

function stableEntryPayload(payload) {
  return JSON.stringify({
    ...payload,
    gloss_en: payload.gloss_en || null,
    semantic_domain: payload.semantic_domain || null,
    forms: sortEntryForms(payload.forms),
  });
}

function createEntryEditSession(entry) {
  const loaded = entryPayload(entry);
  let draft = JSON.parse(JSON.stringify(loaded));
  let error = null;
  return {
    get draft() { return JSON.parse(JSON.stringify(draft)); },
    get dirty() { return stableEntryPayload(draft) !== stableEntryPayload(loaded); },
    get error() { return error; },
    replace(nextDraft) { draft = JSON.parse(JSON.stringify(nextDraft)); error = null; },
    cancel() { draft = JSON.parse(JSON.stringify(loaded)); error = null; return this.draft; },
    fail(message) { error = message; return this.draft; },
    saved(savedEntry) { return createEntryEditSession(savedEntry); },
  };
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
  if (form.source_label) {
    const provenance = appendDefinition(details, "Provenance", provenanceLabel(form.source_label));
    provenance.title = `Code technique : ${form.source_label}`;
  }
  card.append(language, lemma, details);
  return card;
}

function pairFormsCell(pair, languageNames) {
  const cell = document.createElement("td");
  cell.className = "pair-forms";
  const title = document.createElement("strong");
  title.textContent = `${pair.source.language.toUpperCase()} ↔ ${pair.target.language.toUpperCase()}`;
  const forms = document.createElement("span");
  forms.textContent = `${pair.source.lemma} ↔ ${pair.target.lemma}`;
  const names = document.createElement("span");
  names.textContent = `${languageNames.get(pair.source.language) || pair.source.language} · ${languageNames.get(pair.target.language) || pair.target.language}`;
  cell.append(title, forms, names);
  return cell;
}

function setPageMessage(kind, message) {
  const target = document.getElementById("entryPageMessage");
  target.className = `form-message ${kind || ""}`.trim();
  target.textContent = message || "";
}

async function entryApiRequest(path, options = {}) {
  const response = await fetch(`${ENTRY_API_BASE_URL}${path}`, { ...options, headers: { Accept: "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Erreur HTTP ${response.status}.`);
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

let entryState = null;
let entryEditSession = null;
let entrySaveController = null;
let entrySaveRevision = 0;
let activePair = null;
let relationBaseline = "";
let relationSaveRevision = 0;

function renderEditRows(entry, languageNames) {
  const body = document.getElementById("entryEditForms");
  body.replaceChildren();
  for (const form of sortEntryForms(entry.forms)) {
    const row = document.createElement("tr");
    row.dataset.formId = String(form.id);
    row.dataset.language = form.language;
    const language = document.createElement("td");
    language.textContent = `${languageNames.get(form.language) || form.language.toUpperCase()} · ${form.language.toUpperCase()}`;
    const lemmaCell = document.createElement("td");
    const lemma = document.createElement("input");
    lemma.className = "edit-form-lemma";
    lemma.required = true;
    lemma.maxLength = 255;
    lemma.value = form.lemma;
    lemma.setAttribute("aria-label", `Lemme ${form.language.toUpperCase()}`);
    lemmaCell.appendChild(lemma);
    const posCell = document.createElement("td");
    const pos = document.createElement("select");
    pos.className = "edit-form-pos";
    pos.setAttribute("aria-label", `Catégorie grammaticale ${form.language.toUpperCase()}`);
    for (const value of ENTRY_PARTS_OF_SPEECH) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = `${entryPublicLabel(value)} · ${value}`;
      option.selected = value === (form.part_of_speech || "other");
      pos.appendChild(option);
    }
    posCell.appendChild(pos);
    const provenance = document.createElement("td");
    provenance.textContent = provenanceLabel(form.source_label);
    row.append(language, lemmaCell, posCell, provenance);
    body.appendChild(row);
  }
}

function collectEntryDraft() {
  return {
    entry_key: entryState.entry.entry_key,
    gloss_fr: document.getElementById("editGlossFr").value.trim(),
    gloss_en: document.getElementById("editGlossEn").value.trim() || null,
    semantic_domain: document.getElementById("editSemanticDomain").value.trim() || null,
    forms: [...document.querySelectorAll("#entryEditForms tr")].map((row) => ({
      id: Number(row.dataset.formId),
      language: row.dataset.language,
      lemma: row.querySelector(".edit-form-lemma").value.trim(),
      part_of_speech: row.querySelector(".edit-form-pos").value,
    })),
  };
}

function updateDirtyState() {
  if (entryEditSession && !document.getElementById("entryEditForm").hidden) entryEditSession.replace(collectEntryDraft());
}

function openEntryEditor() {
  entryEditSession = createEntryEditSession(entryState.entry);
  document.getElementById("editEntryKey").textContent = entryState.entry.entry_key;
  document.getElementById("editGlossFr").value = entryState.entry.gloss_fr || "";
  document.getElementById("editGlossEn").value = entryState.entry.gloss_en || "";
  document.getElementById("editSemanticDomain").value = entryState.entry.semantic_domain || "";
  renderEditRows(entryState.entry, entryState.languageNames);
  document.getElementById("entryEditMessage").textContent = "";
  document.getElementById("entryEditForm").hidden = false;
  document.getElementById("editEntryButton").hidden = true;
  document.getElementById("editGlossFr").focus();
}

function cancelEntryEditor() {
  entrySaveRevision += 1;
  entrySaveController?.abort();
  entrySaveController = null;
  entryEditSession?.cancel();
  document.getElementById("entryEditForm").reset();
  document.getElementById("entryEditForm").hidden = true;
  document.getElementById("editEntryButton").hidden = false;
  entryEditSession = null;
  setPageMessage("info", "Modification annulée. Les valeurs chargées sont restaurées.");
  document.getElementById("editEntryButton").focus();
}

function renderRelationPairs() {
  const body = document.getElementById("relationPairsBody");
  body.replaceChildren();
  const pairs = buildFormPairs(entryState.entry.forms, entryState.relations);
  const coverage = relationCoverage(pairs);
  const missing = coverage.total - coverage.present;
  const formCount = entryState.entry.forms.length;
  document.getElementById("relationCount").textContent = `· ${coverage.present} présente${coverage.present > 1 ? "s" : ""} · ${missing} absente${missing > 1 ? "s" : ""} · ${coverage.total} paires entre les ${formCount} formes actuellement documentées`;
  for (const pair of pairs) {
    const row = document.createElement("tr");
    if (pair.source.language === "en" || pair.target.language === "en") row.className = "pair-comparison";
    row.appendChild(pairFormsCell(pair, entryState.languageNames));
    const state = document.createElement("td");
    state.className = "pair-state";
    state.dataset.state = pair.relation ? "present" : "missing";
    state.textContent = pair.relation ? "Relation présente" : "Relation à documenter";
    const type = document.createElement("td");
    type.textContent = pair.relation ? technicalValue(entryPublicLabel(pair.relation.relation_type), pair.relation.relation_type) : "—";
    const score = document.createElement("td");
    score.textContent = pair.relation ? `Score ${Number(pair.relation.score).toFixed(3)} · ${confidenceLabel(pair.relation.confidence_score)}` : "—";
    const provenance = document.createElement("td");
    provenance.textContent = pair.relation ? provenanceLabel(pair.relation.source_label, "Non renseignée") : "—";
    const action = document.createElement("td");
    action.className = "pair-action";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button secondary compact-button";
    button.textContent = pair.relation ? "Modifier la relation" : "Ajouter la relation";
    button.addEventListener("click", () => openRelationEditor(pair));
    action.appendChild(button);
    row.append(state, type, score, provenance, action);
    body.appendChild(row);
  }
}

function renderPage() {
  const { entry, languageNames } = entryState;
  document.title = `${entry.gloss_fr} — Dico-IC`;
  document.getElementById("entryKey").textContent = entry.entry_key;
  document.getElementById("glossFr").textContent = entry.gloss_fr || "Glose française non renseignée";
  document.getElementById("glossEn").textContent = entry.gloss_en ? `Anglais : ${entry.gloss_en}` : "Glose anglaise non renseignée";
  document.getElementById("semanticDomain").textContent = entry.semantic_domain || "Non renseigné";
  document.getElementById("formCount").textContent = `· ${entry.forms.length}`;
  const formsGrid = document.getElementById("formsGrid");
  formsGrid.replaceChildren(...sortEntryForms(entry.forms).map((form) => renderEntryForm(form, languageNames)));
  renderRelationPairs();
}

function relationDraftValue() {
  return JSON.stringify({
    relation_type: document.getElementById("relationType").value,
    score: Number(document.getElementById("relationScore").value),
    source_label: document.getElementById("relationSourceLabel").value.trim() || "manual_admin_v0",
  });
}

function closeRelationEditor(message = "") {
  activePair = null;
  relationBaseline = "";
  const dialog = document.getElementById("relationDialog");
  if (dialog.open) dialog.close();
  if (message) setPageMessage("info", message);
}

function openRelationEditor(pair) {
  activePair = pair;
  const relation = pair.relation;
  document.getElementById("relationDialogTitle").textContent = relation ? "Modifier la relation" : "Ajouter la relation";
  document.getElementById("relationPairLabel").textContent = `${pair.source.language.toUpperCase()} · ${pair.source.lemma} ↔ ${pair.target.language.toUpperCase()} · ${pair.target.lemma}`;
  document.getElementById("relationType").value = relation?.relation_type || "COGNATE_STRONG";
  document.getElementById("relationScore").value = relation?.score ?? "0.95";
  document.getElementById("relationSourceLabel").value = relation?.source_label || "manual_admin_v0";
  document.getElementById("relationMessage").textContent = "";
  relationBaseline = relationDraftValue();
  const dialog = document.getElementById("relationDialog");
  if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  document.getElementById("relationType").focus();
}

async function refreshEntry() {
  const revision = ++entrySaveRevision;
  const response = await entryApiRequest(`/admin/lexical-entry/${encodeURIComponent(entryState.entry.entry_key)}`);
  if (revision !== entrySaveRevision) return false;
  entryState.entry = response.entry;
  entryState.relations = response.relations;
  renderPage();
  return true;
}

async function submitEntryEdit(event) {
  event.preventDefault();
  const draft = collectEntryDraft();
  entryEditSession.replace(draft);
  const message = document.getElementById("entryEditMessage");
  if (!draft.gloss_fr || draft.forms.some((form) => !form.lemma)) {
    message.className = "form-message error";
    message.textContent = "Renseignez la glose française et tous les lemmes.";
    return;
  }
  if (!entryEditSession.dirty) {
    message.className = "form-message info";
    message.textContent = "Aucune modification à enregistrer.";
    return;
  }
  const revision = ++entrySaveRevision;
  entrySaveController?.abort();
  entrySaveController = new AbortController();
  document.getElementById("saveEntryButton").disabled = true;
  message.className = "form-message info";
  message.textContent = "Enregistrement…";
  try {
    const data = await entryApiRequest(`/admin/lexical-entry/${encodeURIComponent(entryState.entry.entry_key)}`, {
      method: "PUT", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(draft), signal: entrySaveController.signal,
    });
    if (revision !== entrySaveRevision) return;
    entryState.entry = data.entry;
    entryEditSession = entryEditSession.saved(data.entry);
    document.getElementById("entryEditForm").hidden = true;
    document.getElementById("editEntryButton").hidden = false;
    renderPage();
    setPageMessage("success", data.message);
  } catch (error) {
    if (revision !== entrySaveRevision || error.name === "AbortError") return;
    entryEditSession.fail(error.message);
    message.className = "form-message error";
    message.textContent = `Erreur : ${error.message}`;
  } finally {
    if (revision === entrySaveRevision) document.getElementById("saveEntryButton").disabled = false;
  }
}

async function submitRelation(event) {
  event.preventDefault();
  if (!activePair) return;
  const relationMessage = document.getElementById("relationMessage");
  const draft = JSON.parse(relationDraftValue());
  if (!Number.isFinite(draft.score) || draft.score < 0 || draft.score > 1) {
    relationMessage.className = "form-message error";
    relationMessage.textContent = "Le score doit être compris entre 0 et 1.";
    return;
  }
  if (activePair.relation && relationDraftValue() === relationBaseline) {
    relationMessage.className = "form-message info";
    relationMessage.textContent = "Aucune modification à enregistrer.";
    return;
  }
  const pair = activePair;
  const revision = ++relationSaveRevision;
  document.getElementById("saveRelationButton").disabled = true;
  relationMessage.className = "form-message info";
  relationMessage.textContent = "Enregistrement…";
  const payload = { source_form_id: pair.source.id, target_form_id: pair.target.id, ...draft };
  try {
    const endpoint = pair.relation ? `/admin/form-relation/${pair.relation.id}` : "/admin/form-relation";
    const data = await entryApiRequest(endpoint, {
      method: pair.relation ? "PUT" : "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(payload),
    });
    if (revision !== relationSaveRevision) return;
    closeRelationEditor();
    await refreshEntry();
    setPageMessage("success", data.message);
  } catch (error) {
    if (revision !== relationSaveRevision) return;
    relationMessage.className = "form-message error";
    relationMessage.textContent = `Erreur : ${error.message}`;
  } finally {
    if (revision === relationSaveRevision) document.getElementById("saveRelationButton").disabled = false;
  }
}

async function loadEntryPage() {
  const entryKey = new URLSearchParams(window.location.search).get("entry_key")?.trim().toUpperCase();
  if (!entryKey) throw new Error("Ajoutez une clé avec ?entry_key=INFORMATION_DATA.");
  document.getElementById("consultationLink").href = `./index-admin-entry-0.1.1.html?entry_key=${encodeURIComponent(entryKey)}`;
  const [entryResponse, languagesResponse] = await Promise.all([
    entryApiRequest(`/admin/lexical-entry/${encodeURIComponent(entryKey)}`), entryApiRequest("/languages"),
  ]);
  entryState = {
    entry: entryResponse.entry,
    relations: entryResponse.relations,
    languageNames: new Map(languagesResponse.languages.map((language) => [language.code, language.name])),
  };
  renderPage();
  document.getElementById("entryError").hidden = true;
  document.getElementById("entryContent").hidden = false;
  const apiStatus = document.getElementById("apiStatus");
  apiStatus.dataset.state = "online";
  apiStatus.textContent = "Données Dico-IC chargées";
}

function initializeEntryPage() {
  document.getElementById("editEntryButton").addEventListener("click", openEntryEditor);
  document.getElementById("cancelEntryButton").addEventListener("click", cancelEntryEditor);
  document.getElementById("entryEditForm").addEventListener("input", updateDirtyState);
  document.getElementById("entryEditForm").addEventListener("change", updateDirtyState);
  document.getElementById("entryEditForm").addEventListener("submit", submitEntryEdit);
  document.getElementById("relationForm").addEventListener("submit", submitRelation);
  document.getElementById("cancelRelationButton").addEventListener("click", () => closeRelationEditor("Modification de relation annulée."));
  document.getElementById("closeRelationButton").addEventListener("click", () => closeRelationEditor("Modification de relation annulée."));
  window.addEventListener("beforeunload", (event) => {
    updateDirtyState();
    const relationDirty = Boolean(activePair && relationDraftValue() !== relationBaseline);
    if (entryEditSession?.dirty || relationDirty) { event.preventDefault(); event.returnValue = ""; }
  });
  loadEntryPage().catch((error) => {
    document.getElementById("entryContent").hidden = true;
    document.getElementById("entryError").hidden = false;
    document.getElementById("entryErrorMessage").textContent = error.message;
    const apiStatus = document.getElementById("apiStatus");
    apiStatus.dataset.state = "error";
    apiStatus.textContent = "Chargement impossible";
  });
}

if (typeof document !== "undefined") initializeEntryPage();

if (typeof module !== "undefined") {
  module.exports = {
    ENTRY_LANGUAGE_ORDER, buildFormPairs, confidenceLabel, createEntryEditSession, entryPayload, entryPublicLabel,
    provenanceLabel, relationCoverage, relationPairKey, sortEntryForms, stableEntryPayload, technicalValue,
  };
}
