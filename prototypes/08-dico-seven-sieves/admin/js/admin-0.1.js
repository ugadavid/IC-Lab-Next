"use strict";

const API_BASE_URL = window.location.origin;
const DEFAULT_FORM_LANGUAGES = ["fr", "es", "it", "pt"];
const PAGE_LIMIT = 30;

let languages = [];
let currentEntries = [];
let currentSearch = "";
let currentOffset = 0;
let totalEntries = 0;
let editingEntryKey = null;
let connectorHelpItems = [];
let connectorHelpOffset = 0;
let connectorHelpTotal = 0;
let editingConnectorHelpId = null;

const apiStatus = document.getElementById("apiStatus");
const modelCounts = document.getElementById("modelCounts");
const coverageCounts = document.getElementById("coverageCounts");
const modelTableBody = document.getElementById("modelTableBody");
const languagesTableBody = document.getElementById("languagesTableBody");
const languageCount = document.getElementById("languageCount");
const entriesTableBody = document.getElementById("entriesTableBody");
const lexiconMeta = document.getElementById("lexiconMeta");
const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");
const paginationLabel = document.getElementById("paginationLabel");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const refreshButton = document.getElementById("refreshButton");
const entryForm = document.getElementById("entryForm");
const formsTableBody = document.getElementById("formsTableBody");
const addFormButton = document.getElementById("addFormButton");
const resetEntryButton = document.getElementById("resetEntryButton");
const submitEntryButton = document.getElementById("submitEntryButton");
const formMessage = document.getElementById("formMessage");
const entryModeTitle = document.getElementById("entryModeTitle");
const entryModeNote = document.getElementById("entryModeNote");
const relationForm = document.getElementById("relationForm");
const sourceFormSearch = document.getElementById("sourceFormSearch");
const targetFormSearch = document.getElementById("targetFormSearch");
const sourceFormSelect = document.getElementById("sourceFormSelect");
const targetFormSelect = document.getElementById("targetFormSelect");
const relationMessage = document.getElementById("relationMessage");
const createRelationButton = document.getElementById("createRelationButton");
const relationSearchForm = document.getElementById("relationSearchForm");
const relationSearchInput = document.getElementById("relationSearchInput");
const relationsTableBody = document.getElementById("relationsTableBody");
const inflectedForm = document.getElementById("inflectedForm");
const inflectedTargetSearch = document.getElementById("inflectedTargetSearch");
const inflectedTargetSelect = document.getElementById("inflectedTargetSelect");
const inflectedMessage = document.getElementById("inflectedMessage");
const createInflectedButton = document.getElementById("createInflectedButton");
const inflectedSearchForm = document.getElementById("inflectedSearchForm");
const inflectedSearchInput = document.getElementById("inflectedSearchInput");
const inflectedStatusFilter = document.getElementById("inflectedStatusFilter");
const inflectedMeta = document.getElementById("inflectedMeta");
const inflectedTableBody = document.getElementById("inflectedTableBody");
const connectorHelpForm = document.getElementById("connectorHelpForm");
const connectorHelpFormTitle = document.getElementById("connectorHelpFormTitle");
const connectorHelpMessage = document.getElementById("connectorHelpMessage");
const saveConnectorHelpButton = document.getElementById("saveConnectorHelpButton");
const resetConnectorHelpButton = document.getElementById("resetConnectorHelpButton");
const connectorHelpSearchForm = document.getElementById("connectorHelpSearchForm");
const connectorHelpSearchInput = document.getElementById("connectorHelpSearchInput");
const connectorLanguageFilter = document.getElementById("connectorLanguageFilter");
const connectorFunctionFilter = document.getElementById("connectorFunctionFilter");
const connectorStatusFilter = document.getElementById("connectorStatusFilter");
const connectorHelpMeta = document.getElementById("connectorHelpMeta");
const connectorHelpTableBody = document.getElementById("connectorHelpTableBody");
const connectorPreviousButton = document.getElementById("connectorPreviousButton");
const connectorNextButton = document.getElementById("connectorNextButton");
const connectorPaginationLabel = document.getElementById("connectorPaginationLabel");
const connectorFunctionReference = document.getElementById("connectorFunctionReference");

const PUBLIC_LABELS = {
  language: "Langue référencée",
  lexical_entry: "Entrée conceptuelle",
  lexical_form: "Forme linguistique",
  inflected_form: "Forme fléchie attestée",
  connector_help: "Aide discursive",
  form_relation: "Relation entre formes",
  pattern_rule: "Règle de correspondance",
  ic_feature: "Trait d’intercompréhension",
  noun: "Nom", verb: "Verbe", adjective: "Adjectif", adverb: "Adverbe",
  connector: "Connecteur", other: "Autre",
  COGNATE_STRONG: "Cognat fort", COGNATE_WEAK: "Cognat possible",
  FALSE_FRIEND: "Faux ami", RELATED_FORM: "Forme apparentée",
  VALIDATED: "Vérifié", PROPOSED: "Proposé", REJECTED: "Écarté", ARCHIVED: "Archivé",
  PLURAL: "Pluriel",
  manual_admin_v0: "Saisie manuelle dans l’administration",
  manual_seed: "Corpus initial renseigné manuellement",
  manual_seed_v2: "Corpus manuel enrichi",
  connector_help_v0_seed: "Corpus initial d’aides discursives",
  api_mock_support_v0: "Support historique du prototype API",
};

function publicLabel(value) {
  return PUBLIC_LABELS[value] || value || "Non renseigné";
}

function labelWithCode(value) {
  const label = publicLabel(value);
  return label === value ? label : `${label} · ${value}`;
}

function setApiState(state, message) {
  apiStatus.dataset.state = state;
  apiStatus.textContent = message;
}

function setFormMessage(kind, message) {
  formMessage.className = `form-message ${kind}`;
  formMessage.textContent = message;
}

function setRelationMessage(kind, message) {
  relationMessage.className = `form-message ${kind}`;
  relationMessage.textContent = message;
}

function setInflectedMessage(kind, message) {
  inflectedMessage.className = `form-message ${kind}`;
  inflectedMessage.textContent = message;
}

function setConnectorHelpMessage(kind, message) {
  connectorHelpMessage.className = `form-message ${kind}`;
  connectorHelpMessage.textContent = message;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Erreur HTTP ${response.status}.`);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

function appendCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";
  if (className) cell.className = className;
  row.appendChild(cell);
  return cell;
}

function renderModel(model) {
  const labels = {
    languages: "Langues",
    lexical_entries: "Entrées conceptuelles",
    lexical_forms: "Formes linguistiques",
    inflected_forms: "Formes fléchies attestées",
    connector_helps: "Aides discursives",
    form_relations: "Relations",
    pattern_rules: "Règles",
    ic_features: "Traits IC",
  };
  modelCounts.replaceChildren();
  for (const [key, label] of Object.entries(labels)) {
    const metric = document.createElement("div");
    metric.className = "metric";
    const value = document.createElement("strong");
    value.textContent = String(model.counts[key] ?? 0);
    const caption = document.createElement("span");
    caption.textContent = label;
    metric.append(value, caption);
    modelCounts.appendChild(metric);
  }

  const coverageMetrics = [
    [model.counts.lexical_entries, "Concepts au total"],
    [model.coverage?.central_romance_entries, "Concepts avec FR · ES · IT · PT"],
    [model.coverage?.comparison_english_entries, "Concepts avec FR · ES · IT · PT · EN"],
    [model.counts.lexical_forms, "Formes linguistiques documentées"],
  ];
  coverageCounts.replaceChildren();
  for (const [count, captionText] of coverageMetrics) {
    const metric = document.createElement("div");
    metric.className = "coverage-metric";
    const value = document.createElement("strong");
    value.textContent = String(count ?? 0);
    const caption = document.createElement("span");
    caption.textContent = captionText;
    metric.append(value, caption);
    coverageCounts.appendChild(metric);
  }

  modelTableBody.replaceChildren();
  for (const table of model.tables) {
    const row = document.createElement("tr");
    const objectCell = appendCell(row, publicLabel(table.name));
    const technicalName = document.createElement("small");
    technicalName.className = "technical-detail";
    technicalName.textContent = table.name;
    objectCell.appendChild(technicalName);
    appendCell(row, table.role);
    modelTableBody.appendChild(row);
  }
}

function renderLanguages(items) {
  languagesTableBody.replaceChildren();
  languageCount.textContent = `${items.length} langue${items.length > 1 ? "s" : ""}`;
  for (const language of items) {
    const row = document.createElement("tr");
    appendCell(row, language.code.toUpperCase(), "code-value");
    appendCell(row, language.name);
    appendCell(row, language.family);
    appendCell(row, language.is_romance ? "Oui" : "Non", language.is_romance ? "status-yes" : "status-no");
    appendCell(row, language.is_active ? "Active" : "Inactive", language.is_active ? "status-yes" : "status-no");
    languagesTableBody.appendChild(row);
  }
}

function renderEntries(entries, page) {
  entriesTableBody.replaceChildren();
  currentEntries = entries;
  totalEntries = page.total;
  const start = page.total === 0 ? 0 : page.offset + 1;
  const end = page.offset + entries.length;
  lexiconMeta.textContent = page.search
    ? `${page.total} résultat(s) pour « ${page.search} ».`
    : `${page.total} entrée(s) lexicales.`;
  paginationLabel.textContent = `${start}–${end} / ${page.total}`;
  previousPageButton.disabled = page.offset === 0;
  nextPageButton.disabled = page.offset + page.limit >= page.total;

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = appendCell(row, "Aucune entrée trouvée.", "empty-cell");
    cell.colSpan = 5;
    entriesTableBody.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    appendCell(row, entry.entry_key, "code-value");
    appendCell(row, entry.gloss_fr);
    appendCell(row, entry.semantic_domain);
    const formsCell = document.createElement("td");
    const list = document.createElement("div");
    list.className = "form-list";
    for (const form of entry.forms) {
      const tag = document.createElement("span");
      tag.className = "form-tag";
      tag.textContent = `${form.language.toUpperCase()} · ${form.lemma} · ${publicLabel(form.part_of_speech)}`;
      tag.title = `Normalisé : ${form.normalized_lemma || "non renseigné"}`;
      list.appendChild(tag);
    }
    if (entry.forms.length === 0) list.textContent = "Aucune forme";
    formsCell.appendChild(list);
    row.appendChild(formsCell);

    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button secondary compact-button";
    editButton.textContent = "Modifier";
    editButton.dataset.entryKey = entry.entry_key;
    const aiRelationsLink = document.createElement("a");
    aiRelationsLink.className = "button secondary compact-button";
    aiRelationsLink.href = `./index-admin-ai-relations-0.1.html?entry_key=${encodeURIComponent(entry.entry_key)}`;
    aiRelationsLink.textContent = "Relations IA";
    const viewLink = document.createElement("a");
    viewLink.className = "button primary compact-button";
    viewLink.href = `./index-admin-entry-0.1.1.html?entry_key=${encodeURIComponent(entry.entry_key)}`;
    viewLink.textContent = "Voir";
    actions.append(viewLink, editButton, aiRelationsLink);
    actionCell.appendChild(actions);
    row.appendChild(actionCell);
    entriesTableBody.appendChild(row);
  }
}

async function loadModelSummary() {
  const data = await apiRequest("/admin/model-summary");
  renderModel(data.model);
}

async function loadLanguages() {
  const data = await apiRequest("/languages");
  languages = data.languages;
  renderLanguages(languages);
}

async function loadEntries(search = currentSearch, offset = currentOffset) {
  const query = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: String(offset) });
  if (search.trim()) query.set("search", search.trim());
  const data = await apiRequest(`/admin/lexical-entries?${query}`);
  currentSearch = data.search;
  currentOffset = data.offset;
  renderEntries(data.items, data);
}

async function loadDashboard() {
  refreshButton.disabled = true;
  setApiState("loading", "Connexion à l’API…");
  try {
    await Promise.all([
      loadModelSummary(),
      loadLanguages(),
      loadEntries(currentSearch, currentOffset),
      loadRelations(),
      loadInflectedForms(),
      loadConnectorHelpFunctions(),
      loadConnectorHelps(),
    ]);
    setApiState("online", "API connectée");
    if (formsTableBody.children.length === 0) resetFormRows();
  } catch (error) {
    setApiState("error", "API indisponible");
    setFormMessage("error", `Impossible de charger l’administration : ${error.message}`);
  } finally {
    refreshButton.disabled = false;
  }
}

function createLanguageSelect(selectedCode) {
  const select = document.createElement("select");
  select.className = "form-language";
  select.setAttribute("aria-label", "Langue de la forme");
  for (const language of languages) {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = `${language.code.toUpperCase()} — ${language.name}`;
    option.selected = language.code === selectedCode;
    select.appendChild(option);
  }
  return select;
}

function addFormRow(
  selectedCode = languages[0]?.code || "fr",
  lemma = "",
  partOfSpeech = "noun",
  formId = null,
  removable = true
) {
  const row = document.createElement("tr");
  row.className = "form-row";
  if (formId) {
    row.dataset.formId = String(formId);
    row.dataset.formState = "existing";
  } else {
    row.dataset.formState = "new";
    row.title = "Nouvelle forme, supprimable avant enregistrement";
  }

  const languageCell = document.createElement("td");
  languageCell.appendChild(createLanguageSelect(selectedCode));

  const lemmaCell = document.createElement("td");
  const lemmaInput = document.createElement("input");
  lemmaInput.className = "form-lemma";
  lemmaInput.maxLength = 255;
  lemmaInput.value = lemma;
  lemmaInput.placeholder = "Lemme";
  lemmaInput.setAttribute("aria-label", "Lemme");
  lemmaCell.appendChild(lemmaInput);

  const posCell = document.createElement("td");
  const posSelect = document.createElement("select");
  posSelect.className = "form-pos";
  posSelect.setAttribute("aria-label", "Catégorie grammaticale");
  for (const [value, label] of [["noun", "Nom"], ["verb", "Verbe"], ["adjective", "Adjectif"], ["adverb", "Adverbe"], ["other", "Autre"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === partOfSpeech;
    posSelect.appendChild(option);
  }
  posCell.appendChild(posSelect);

  const actionCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-form-button";
  removeButton.textContent = "×";
  removeButton.title = "Retirer cette forme";
  removeButton.setAttribute("aria-label", "Retirer cette forme");
  removeButton.disabled = !removable;
  if (!removable) removeButton.title = "Les formes existantes sont conservées dans cette V0";
  removeButton.addEventListener("click", () => {
    if (formsTableBody.children.length > 1) row.remove();
  });
  actionCell.appendChild(removeButton);

  row.append(languageCell, lemmaCell, posCell, actionCell);
  formsTableBody.appendChild(row);
}

function resetFormRows() {
  formsTableBody.replaceChildren();
  const availableDefaults = DEFAULT_FORM_LANGUAGES.filter(code =>
    languages.some(language => language.code === code)
  );
  for (const code of availableDefaults.length ? availableDefaults : [languages[0]?.code]) {
    if (code) addFormRow(code);
  }
}

function collectForms() {
  return [...formsTableBody.querySelectorAll(".form-row")]
    .map(row => {
      const form = {
        language: row.querySelector(".form-language").value,
        lemma: row.querySelector(".form-lemma").value.trim(),
        part_of_speech: row.querySelector(".form-pos").value,
      };
      if (row.dataset.formId) form.id = Number(row.dataset.formId);
      return form;
    })
    .filter(form => form.lemma);
}

function resetEntryForm() {
  editingEntryKey = null;
  entryForm.reset();
  document.getElementById("entryKey").disabled = false;
  entryModeTitle.textContent = "Nouvelle entrée lexicale";
  entryModeNote.textContent = "L’entrée et toutes ses formes sont enregistrées ensemble. Aucun contenu apprenant n’est créé.";
  submitEntryButton.textContent = "Créer l’entrée lexicale";
  resetEntryButton.textContent = "Effacer";
  addFormButton.disabled = false;
  resetFormRows();
  formMessage.className = "form-message";
  formMessage.textContent = "";
}

function startEditingEntry(entry) {
  editingEntryKey = entry.entry_key;
  document.getElementById("entryKey").value = entry.entry_key;
  document.getElementById("entryKey").disabled = true;
  document.getElementById("glossFr").value = entry.gloss_fr || "";
  document.getElementById("glossEn").value = entry.gloss_en || "";
  document.getElementById("semanticDomain").value = entry.semantic_domain || "";
  formsTableBody.replaceChildren();
  for (const form of entry.forms) {
    addFormRow(form.language, form.lemma, form.part_of_speech || "other", form.id, false);
  }
  entryModeTitle.textContent = `Modifier ${entry.entry_key}`;
  entryModeNote.textContent = "Les formes existantes sont conservées. Vous pouvez les corriger et ajouter de nouvelles formes.";
  submitEntryButton.textContent = "Enregistrer les modifications";
  resetEntryButton.textContent = "Annuler";
  addFormButton.disabled = false;
  setFormMessage("info", `Édition de ${entry.entry_key}.`);
  document.getElementById("new-entry").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function submitEntry(event) {
  event.preventDefault();
  const forms = collectForms();
  const payload = {
    entry_key: document.getElementById("entryKey").value.trim().toUpperCase(),
    gloss_fr: document.getElementById("glossFr").value.trim(),
    gloss_en: document.getElementById("glossEn").value.trim() || null,
    semantic_domain: document.getElementById("semanticDomain").value.trim() || null,
    forms,
  };

  if (!payload.entry_key || !payload.gloss_fr || forms.length === 0) {
    setFormMessage("error", "Renseignez la clé, la glose française et au moins une forme.");
    return;
  }

  submitEntryButton.disabled = true;
  setFormMessage("info", editingEntryKey ? "Mise à jour de l’entrée…" : "Enregistrement de l’entrée…");
  try {
    const endpoint = editingEntryKey
      ? `/admin/lexical-entry/${encodeURIComponent(editingEntryKey)}`
      : "/admin/lexical-entry";
    const data = await apiRequest(endpoint, {
      method: editingEntryKey ? "PUT" : "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    resetEntryForm();
    setFormMessage("success", data.message);
    searchInput.value = data.entry.entry_key;
    currentSearch = data.entry.entry_key;
    currentOffset = 0;
    await Promise.all([loadEntries(currentSearch, currentOffset), loadModelSummary()]);
    document.getElementById("lexicon").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    const duplicateCodes = new Set(["DUPLICATE_ENTRY", "DUPLICATE_FORM"]);
    const prefix = duplicateCodes.has(error.code) ? "Doublon : " : "Erreur : ";
    setFormMessage("error", `${prefix}${error.message}`);
  } finally {
    submitEntryButton.disabled = false;
  }
}

function renderFormOptions(select, items) {
  select.replaceChildren();
  for (const form of items) {
    const option = document.createElement("option");
    option.value = String(form.id);
    option.textContent = `${form.language.toUpperCase()} · ${form.lemma} · ${form.entry_key} · ${form.part_of_speech || "?"}`;
    select.appendChild(option);
  }
  if (items.length === 0) {
    const option = document.createElement("option");
    option.textContent = "Aucune forme trouvée";
    option.disabled = true;
    select.appendChild(option);
  }
}

async function loadFormOptions(search, select) {
  const query = new URLSearchParams({ search: search.trim(), limit: "20" });
  const data = await apiRequest(`/admin/forms?${query}`);
  renderFormOptions(select, data.items);
}

function renderInflectedForms(items) {
  inflectedTableBody.replaceChildren();
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = appendCell(row, "Aucun mapping trouvé.", "empty-cell");
    cell.colSpan = 7;
    inflectedTableBody.appendChild(row);
    return;
  }
  for (const mapping of items) {
    const row = document.createElement("tr");
    const surfaceCell = appendCell(row, mapping.surface_form);
    surfaceCell.title = `Normalisée : ${mapping.normalized_surface}`;
    appendCell(
      row,
      `${mapping.language.toUpperCase()} · ${mapping.lemma}\n${mapping.entry_key} · ${publicLabel(mapping.part_of_speech)}`,
      "relation-form-cell"
    );
    appendCell(row, labelWithCode(mapping.grammatical_number), "code-value");
    const statusCell = appendCell(row, labelWithCode(mapping.status), "inflected-status");
    statusCell.dataset.status = mapping.status;
    appendCell(
      row,
      mapping.confidence_score === null ? "—" : Number(mapping.confidence_score).toFixed(3)
    );
    appendCell(row, labelWithCode(mapping.source_label));
    appendCell(row, mapping.created_at ? new Date(mapping.created_at).toLocaleString("fr-FR") : "—");
    inflectedTableBody.appendChild(row);
  }
}

async function loadInflectedForms(
  search = inflectedSearchInput.value,
  status = inflectedStatusFilter.value
) {
  const query = new URLSearchParams({ limit: "30", offset: "0" });
  if (search.trim()) query.set("search", search.trim());
  if (status) query.set("status", status);
  const data = await apiRequest(`/admin/inflected-forms?${query}`);
  inflectedMeta.textContent = `${data.total} mapping(s) trouvé(s).`;
  renderInflectedForms(data.items);
}

async function submitInflectedForm(event) {
  event.preventDefault();
  const payload = {
    lexical_form_id: Number(inflectedTargetSelect.value),
    surface_form: document.getElementById("inflectedSurface").value.trim(),
    grammatical_number: document.getElementById("inflectedNumber").value,
    status: document.getElementById("inflectedStatus").value,
    source_label: document.getElementById("inflectedSourceLabel").value.trim() || "manual_admin_v0",
    confidence_score: Number(document.getElementById("inflectedConfidence").value),
  };
  if (!payload.lexical_form_id || !payload.surface_form) {
    setInflectedMessage("error", "Sélectionnez une cible et renseignez la surface fléchie.");
    return;
  }

  createInflectedButton.disabled = true;
  setInflectedMessage("info", "Création du mapping…");
  try {
    const data = await apiRequest("/admin/inflected-form", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    document.getElementById("inflectedSurface").value = "";
    setInflectedMessage("success", data.message);
    await Promise.all([loadInflectedForms(), loadModelSummary()]);
  } catch (error) {
    const prefix = error.code === "DUPLICATE_INFLECTED_FORM" ? "Doublon : " : "Erreur : ";
    setInflectedMessage("error", `${prefix}${error.message}`);
  } finally {
    createInflectedButton.disabled = false;
  }
}

function renderConnectorHelpFunctions(items) {
  const functionSelect = document.getElementById("connectorFunction");
  functionSelect.replaceChildren();
  connectorFunctionFilter.replaceChildren(new Option("Toutes les fonctions", ""));
  connectorFunctionReference.replaceChildren();

  for (const item of items) {
    functionSelect.appendChild(new Option(`${item.code} — ${item.label}`, item.code));
    connectorFunctionFilter.appendChild(new Option(item.label, item.code));

    const block = document.createElement("div");
    block.className = "function-reference-item";
    const title = document.createElement("strong");
    title.textContent = `${item.label} · ${item.total}`;
    const description = document.createElement("span");
    description.textContent = item.description;
    block.append(title, description);
    connectorFunctionReference.appendChild(block);
  }
}

async function loadConnectorHelpFunctions() {
  const data = await apiRequest("/admin/connector-help-functions");
  renderConnectorHelpFunctions(data.items);
}

function renderConnectorHelps(items, data) {
  connectorHelpItems = items;
  connectorHelpTableBody.replaceChildren();
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = appendCell(row, "Aucune aide discursive trouvée.", "empty-cell");
    cell.colSpan = 7;
    connectorHelpTableBody.appendChild(row);
  }

  for (const item of items) {
    const row = document.createElement("tr");
    appendCell(row, item.expression);
    appendCell(row, item.language.toUpperCase(), "code-value");
    appendCell(row, labelWithCode(item.discourse_function), "code-value");
    appendCell(row, item.pedagogical_hint);
    const statusCell = appendCell(row, labelWithCode(item.status), "connector-status");
    statusCell.dataset.status = item.status;
    appendCell(row, labelWithCode(item.source_label));

    const actions = document.createElement("td");
    actions.className = "table-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button secondary";
    editButton.textContent = "Modifier";
    editButton.dataset.connectorAction = "edit";
    editButton.dataset.connectorId = String(item.id);
    const archiveButton = document.createElement("button");
    archiveButton.type = "button";
    archiveButton.className = "button secondary";
    archiveButton.textContent = "Archiver";
    archiveButton.disabled = item.status === "ARCHIVED";
    archiveButton.dataset.connectorAction = "archive";
    archiveButton.dataset.connectorId = String(item.id);
    actions.append(editButton, archiveButton);
    row.appendChild(actions);
    connectorHelpTableBody.appendChild(row);
  }

  const start = data.total === 0 ? 0 : data.offset + 1;
  const end = Math.min(data.offset + data.items.length, data.total);
  connectorPaginationLabel.textContent = `${start}–${end} / ${data.total}`;
  connectorPreviousButton.disabled = data.offset === 0;
  connectorNextButton.disabled = data.offset + data.limit >= data.total;
  connectorHelpMeta.textContent = `${data.total} aide(s) discursive(s) trouvée(s).`;
}

async function loadConnectorHelps(offset = connectorHelpOffset) {
  const query = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: String(offset) });
  const search = connectorHelpSearchInput.value.trim();
  if (search) query.set("search", search);
  if (connectorLanguageFilter.value) query.set("language", connectorLanguageFilter.value);
  if (connectorFunctionFilter.value) query.set("function", connectorFunctionFilter.value);
  if (connectorStatusFilter.value) query.set("status", connectorStatusFilter.value);
  const data = await apiRequest(`/admin/connector-helps?${query}`);
  connectorHelpOffset = data.offset;
  connectorHelpTotal = data.total;
  renderConnectorHelps(data.items, data);
}

function resetConnectorHelpForm() {
  editingConnectorHelpId = null;
  connectorHelpForm.reset();
  document.getElementById("connectorTitle").value = "Connecteur logique";
  document.getElementById("connectorSourceLabel").value = "manual_admin_v0";
  document.getElementById("connectorCaution").value = "La fonction exacte peut dépendre du contexte.";
  connectorHelpFormTitle.textContent = "Nouvelle aide discursive";
  saveConnectorHelpButton.textContent = "Créer l’aide";
  resetConnectorHelpButton.textContent = "Effacer";
  connectorHelpMessage.className = "form-message";
  connectorHelpMessage.textContent = "";
}

function startEditingConnectorHelp(item) {
  editingConnectorHelpId = item.id;
  document.getElementById("connectorLanguage").value = item.language;
  document.getElementById("connectorExpression").value = item.expression;
  document.getElementById("connectorFunction").value = item.discourse_function;
  document.getElementById("connectorStatus").value = item.status;
  document.getElementById("connectorHint").value = item.pedagogical_hint;
  document.getElementById("connectorExample").value = item.example || "";
  document.getElementById("connectorCaution").value = item.caution || "";
  document.getElementById("connectorTitle").value = item.pedagogical_title;
  document.getElementById("connectorSourceLabel").value = item.source_label || "manual_admin_v0";
  document.getElementById("connectorEntryKey").value = item.lexical_entry_key || "";
  document.getElementById("connectorNotes").value = item.notes || "";
  connectorHelpFormTitle.textContent = `Modifier « ${item.expression} »`;
  saveConnectorHelpButton.textContent = "Enregistrer les modifications";
  resetConnectorHelpButton.textContent = "Annuler";
  setConnectorHelpMessage("info", "Édition de l’aide discursive.");
  connectorHelpForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectConnectorHelp() {
  return {
    language: document.getElementById("connectorLanguage").value,
    expression: document.getElementById("connectorExpression").value.trim(),
    discourse_function: document.getElementById("connectorFunction").value,
    status: document.getElementById("connectorStatus").value,
    pedagogical_title: document.getElementById("connectorTitle").value.trim(),
    pedagogical_hint: document.getElementById("connectorHint").value.trim(),
    example: document.getElementById("connectorExample").value.trim() || null,
    caution: document.getElementById("connectorCaution").value.trim() || null,
    source_label: document.getElementById("connectorSourceLabel").value.trim() || "manual_admin_v0",
    lexical_entry_key: document.getElementById("connectorEntryKey").value.trim().toUpperCase() || null,
    notes: document.getElementById("connectorNotes").value.trim() || null,
  };
}

async function submitConnectorHelp(event) {
  event.preventDefault();
  const payload = collectConnectorHelp();
  if (!payload.expression || !payload.pedagogical_hint) {
    setConnectorHelpMessage("error", "Renseignez l’expression et l’aide pédagogique.");
    return;
  }

  saveConnectorHelpButton.disabled = true;
  setConnectorHelpMessage("info", editingConnectorHelpId ? "Mise à jour…" : "Création…");
  try {
    const endpoint = editingConnectorHelpId
      ? `/admin/connector-help/${editingConnectorHelpId}`
      : "/admin/connector-help";
    const data = await apiRequest(endpoint, {
      method: editingConnectorHelpId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    resetConnectorHelpForm();
    setConnectorHelpMessage("success", data.message);
    connectorHelpOffset = 0;
    await Promise.all([loadConnectorHelps(0), loadConnectorHelpFunctions(), loadModelSummary()]);
  } catch (error) {
    const prefix = new Set([
      "DUPLICATE_CONNECTOR_HELP",
      "CONNECTOR_HELP_FUNCTION_CONFLICT",
    ]).has(error.code) ? "Conflit : " : "Erreur : ";
    setConnectorHelpMessage("error", `${prefix}${error.message}`);
  } finally {
    saveConnectorHelpButton.disabled = false;
  }
}

async function archiveConnectorHelp(item) {
  if (!window.confirm(`Archiver l’aide « ${item.expression} » ?`)) return;
  try {
    const data = await apiRequest(`/admin/connector-help/${item.id}`, { method: "DELETE" });
    setConnectorHelpMessage("success", data.message);
    await Promise.all([loadConnectorHelps(), loadConnectorHelpFunctions(), loadModelSummary()]);
  } catch (error) {
    setConnectorHelpMessage("error", `Archivage impossible : ${error.message}`);
  }
}

function renderRelations(items) {
  relationsTableBody.replaceChildren();
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = appendCell(row, "Aucune relation trouvée.", "empty-cell");
    cell.colSpan = 5;
    relationsTableBody.appendChild(row);
    return;
  }
  for (const relation of items) {
    const row = document.createElement("tr");
    appendCell(row, `${relation.source_language.toUpperCase()} · ${relation.source_lemma}\n${relation.source_entry_key}`, "relation-form-cell");
    appendCell(row, labelWithCode(relation.relation_type), "code-value");
    appendCell(row, `${relation.target_language.toUpperCase()} · ${relation.target_lemma}\n${relation.target_entry_key}`, "relation-form-cell");
    appendCell(row, relation.score === null ? "—" : Number(relation.score).toFixed(3));
    appendCell(row, labelWithCode(relation.source_label));
    relationsTableBody.appendChild(row);
  }
}

async function loadRelations(search = relationSearchInput.value) {
  const query = new URLSearchParams({ search: search.trim(), limit: "30" });
  const data = await apiRequest(`/admin/form-relations?${query}`);
  renderRelations(data.items);
}

async function submitRelation(event) {
  event.preventDefault();
  const payload = {
    source_form_id: Number(sourceFormSelect.value),
    target_form_id: Number(targetFormSelect.value),
    relation_type: document.getElementById("relationType").value,
    score: Number(document.getElementById("relationScore").value),
    source_label: document.getElementById("relationSourceLabel").value.trim() || "manual_admin_v0",
  };
  if (!payload.source_form_id || !payload.target_form_id) {
    setRelationMessage("error", "Sélectionnez une forme source et une forme cible.");
    return;
  }

  createRelationButton.disabled = true;
  setRelationMessage("info", "Création de la relation…");
  try {
    const data = await apiRequest("/admin/form-relation", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    setRelationMessage("success", data.message);
    await Promise.all([loadRelations(), loadModelSummary()]);
  } catch (error) {
    const prefix = error.code === "DUPLICATE_RELATION" ? "Doublon : " : "Erreur : ";
    setRelationMessage("error", `${prefix}${error.message}`);
  } finally {
    createRelationButton.disabled = false;
  }
}

function debounceFormSearch(input, select, onError = message => setRelationMessage("error", message)) {
  let timeoutId;
  input.addEventListener("input", () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      loadFormOptions(input.value, select).catch(error => {
        onError(`Recherche impossible : ${error.message}`);
      });
    }, 250);
  });
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  currentSearch = searchInput.value.trim();
  currentOffset = 0;
  loadEntries(currentSearch, currentOffset).catch(error => {
    lexiconMeta.textContent = `Recherche impossible : ${error.message}`;
  });
});
previousPageButton.addEventListener("click", () => {
  currentOffset = Math.max(0, currentOffset - PAGE_LIMIT);
  loadEntries(currentSearch, currentOffset).catch(error => {
    lexiconMeta.textContent = `Pagination impossible : ${error.message}`;
  });
});
nextPageButton.addEventListener("click", () => {
  if (currentOffset + PAGE_LIMIT >= totalEntries) return;
  currentOffset += PAGE_LIMIT;
  loadEntries(currentSearch, currentOffset).catch(error => {
    lexiconMeta.textContent = `Pagination impossible : ${error.message}`;
  });
});
entriesTableBody.addEventListener("click", event => {
  const entryKey = event.target.dataset.entryKey;
  if (!entryKey) return;
  const entry = currentEntries.find(item => item.entry_key === entryKey);
  if (entry) startEditingEntry(entry);
});
refreshButton.addEventListener("click", loadDashboard);
addFormButton.addEventListener("click", () => addFormRow());
resetEntryButton.addEventListener("click", resetEntryForm);
entryForm.addEventListener("submit", submitEntry);
inflectedForm.addEventListener("submit", submitInflectedForm);
inflectedSearchForm.addEventListener("submit", event => {
  event.preventDefault();
  loadInflectedForms().catch(error => {
    setInflectedMessage("error", `Recherche impossible : ${error.message}`);
  });
});
inflectedStatusFilter.addEventListener("change", () => {
  loadInflectedForms().catch(error => {
    setInflectedMessage("error", `Filtrage impossible : ${error.message}`);
  });
});
connectorHelpForm.addEventListener("submit", submitConnectorHelp);
resetConnectorHelpButton.addEventListener("click", resetConnectorHelpForm);
connectorHelpSearchForm.addEventListener("submit", event => {
  event.preventDefault();
  connectorHelpOffset = 0;
  loadConnectorHelps(0).catch(error => setConnectorHelpMessage("error", error.message));
});
for (const filter of [connectorLanguageFilter, connectorFunctionFilter, connectorStatusFilter]) {
  filter.addEventListener("change", () => {
    connectorHelpOffset = 0;
    loadConnectorHelps(0).catch(error => setConnectorHelpMessage("error", error.message));
  });
}
connectorPreviousButton.addEventListener("click", () => {
  connectorHelpOffset = Math.max(0, connectorHelpOffset - PAGE_LIMIT);
  loadConnectorHelps().catch(error => setConnectorHelpMessage("error", error.message));
});
connectorNextButton.addEventListener("click", () => {
  if (connectorHelpOffset + PAGE_LIMIT >= connectorHelpTotal) return;
  connectorHelpOffset += PAGE_LIMIT;
  loadConnectorHelps().catch(error => setConnectorHelpMessage("error", error.message));
});
connectorHelpTableBody.addEventListener("click", event => {
  const id = Number(event.target.dataset.connectorId);
  const action = event.target.dataset.connectorAction;
  if (!id || !action) return;
  const item = connectorHelpItems.find(candidate => candidate.id === id);
  if (!item) return;
  if (action === "edit") startEditingConnectorHelp(item);
  if (action === "archive") archiveConnectorHelp(item);
});
relationForm.addEventListener("submit", submitRelation);
relationSearchForm.addEventListener("submit", event => {
  event.preventDefault();
  loadRelations(relationSearchInput.value).catch(error => {
    setRelationMessage("error", `Recherche impossible : ${error.message}`);
  });
});
debounceFormSearch(sourceFormSearch, sourceFormSelect);
debounceFormSearch(targetFormSearch, targetFormSelect);
debounceFormSearch(
  inflectedTargetSearch,
  inflectedTargetSelect,
  message => setInflectedMessage("error", message)
);

loadDashboard().then(() => Promise.all([
  loadFormOptions("", sourceFormSelect),
  loadFormOptions("", targetFormSelect),
  loadFormOptions("", inflectedTargetSelect),
])).catch(error => {
  setRelationMessage("error", `Chargement des formes impossible : ${error.message}`);
});
