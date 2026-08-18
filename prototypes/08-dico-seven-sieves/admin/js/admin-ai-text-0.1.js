"use strict";

const API_BASE_URL = "http://localhost:3000";
const DEFAULT_LANGUAGE_CODES = new Set(["fr", "es", "it", "pt"]);
const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb"];
const {
  DEFAULT_BATCH_SIZE,
  ManualInflectedBatchSession,
  buildInflectedBatchRequest,
  formIdentity: inflectedFormIdentity,
  formatIgnoredProposalWarning,
} = window.DicoManualInflectedBatches;
const {
  CancellableGenerationSession,
  isAbortError,
} = window.DicoTextGeneration;
const {
  canonicalizeEntryKey,
  findDuplicateCanonicalEntryKeys,
} = window.DicoEntryKey;

let languages = [];
let candidates = [];
let existingEntryKeys = new Set();
let unknownWordValues = [];
let reviewItems = [];
let inflectedCandidates = [];
const inflectedBatchSession = new ManualInflectedBatchSession();
let inflectedBatchLoading = false;
const lexicalGenerationSession = new CancellableGenerationSession();

const apiStatus = document.getElementById("apiStatus");
const coverageForm = document.getElementById("coverageForm");
const sourceLanguage = document.getElementById("sourceLanguage");
const textInput = document.getElementById("textInput");
const analyzeButton = document.getElementById("analyzeButton");
const coverageMessage = document.getElementById("coverageMessage");
const coverageResults = document.getElementById("coverageResults");
const knownList = document.getElementById("knownList");
const knownInflectedList = document.getElementById("knownInflectedList");
const unknownList = document.getElementById("unknownList");
const conceptAbsentList = document.getElementById("conceptAbsentList");
const generateInflectedButton = document.getElementById("generateInflectedButton");
const inflectedGenerationMessage = document.getElementById("inflectedGenerationMessage");
const inflectedBatchProgress = document.getElementById("inflectedBatchProgress");
const inflectedBatchSize = document.getElementById("inflectedBatchSize");
const inflectedCandidateTableBody = document.getElementById("inflectedCandidateTableBody");
const inflectedCandidateTotal = document.getElementById("inflectedCandidateTotal");
const inflectedReadyTotal = document.getElementById("inflectedReadyTotal");
const inflectedGenerationMeta = document.getElementById("inflectedGenerationMeta");
const createInflectedButton = document.getElementById("createInflectedButton");
const inflectedCreationReport = document.getElementById("inflectedCreationReport");
const lexicalGenerationSection = document.getElementById("lexicalGenerationSection");
const languageChoices = document.getElementById("languageChoices");
const generateButton = document.getElementById("generateButton");
const generationMessage = document.getElementById("generationMessage");
const generationProgress = document.getElementById("generationProgress");
const generationProgressLabel = document.getElementById("generationProgressLabel");
const generationElapsed = document.getElementById("generationElapsed");
const generationLanguages = document.getElementById("generationLanguages");
const cancelGenerationButton = document.getElementById("cancelGenerationButton");
const candidateTableBody = document.getElementById("candidateTableBody");
const candidateTotal = document.getElementById("candidateTotal");
const selectedTotal = document.getElementById("selectedTotal");
const generationMeta = document.getElementById("generationMeta");
const selectAllButton = document.getElementById("selectAllButton");
const selectNoneButton = document.getElementById("selectNoneButton");
const createSelectedButton = document.getElementById("createSelectedButton");
const creationReport = document.getElementById("creationReport");

function setApiState(state, message) {
  apiStatus.dataset.state = state;
  apiStatus.textContent = message;
}

function setMessage(kind, message) {
  generationMessage.className = `message ${kind}`;
  generationMessage.textContent = message;
}

function setCoverageMessage(kind, message) {
  coverageMessage.className = `message ${kind}`;
  coverageMessage.textContent = message;
}

function targetLanguageInputs() {
  return [...document.querySelectorAll('input[name="targetLanguage"]')];
}

function setLexicalGenerationLoading(loading, languageSnapshot = []) {
  targetLanguageInputs().forEach(input => { input.disabled = loading; });
  generateButton.disabled = loading || unknownWordValues.length === 0;
  cancelGenerationButton.hidden = !loading;
  cancelGenerationButton.disabled = !loading;
  generationProgress.hidden = !loading;
  if (loading) {
    generationProgressLabel.textContent = "Génération OpenAI en cours…";
    generationElapsed.textContent = "0 s";
    generationLanguages.textContent = `Langues demandées : ${languageSnapshot.map(code => code.toUpperCase()).join(", ")}`;
  }
}

function cancelLexicalGeneration(options = {}) {
  const cancelled = lexicalGenerationSession.cancel();
  if (!cancelled) return false;
  setLexicalGenerationLoading(false);
  if (options.showMessage !== false) {
    setMessage("info", "Génération annulée. Aucun nouveau brouillon n’a été créé.");
  }
  return true;
}

function setInflectedMessage(kind, message) {
  inflectedGenerationMessage.className = `message ${kind}`;
  inflectedGenerationMessage.textContent = message;
}

function updateInflectedBatchControls() {
  const progress = inflectedBatchSession.progress();
  if (progress.total === 0) {
    inflectedBatchProgress.textContent = "Analysez un texte pour préparer les formes à examiner.";
    generateInflectedButton.textContent = "Examiner le prochain lot";
    generateInflectedButton.disabled = true;
    inflectedBatchSize.disabled = true;
    return;
  }
  if (progress.complete) {
    inflectedBatchProgress.textContent = `${progress.total} formes examinées`;
    generateInflectedButton.textContent = "Toutes les formes ont été examinées";
    generateInflectedButton.disabled = true;
    inflectedBatchSize.disabled = true;
    return;
  }
  inflectedBatchProgress.textContent = progress.examined
    ? `${progress.examined} examinées · ${progress.remaining} restantes`
    : `${progress.total} formes à examiner · prochain lot : ${progress.nextSize}`;
  generateInflectedButton.textContent = progress.remaining <= inflectedBatchSession.batchSize
    ? `Examiner les ${progress.nextSize} formes restantes`
    : `Examiner le prochain lot — ${progress.nextSize} formes`;
  generateInflectedButton.disabled = inflectedBatchLoading;
  inflectedBatchSize.disabled = inflectedBatchLoading;
}

function applySelectedInflectedBatchSize() {
  try {
    inflectedBatchSession.setBatchSize(inflectedBatchSize.value);
    updateInflectedBatchControls();
    return true;
  } catch (error) {
    inflectedBatchSize.value = String(inflectedBatchSession.batchSize);
    setInflectedMessage("error", error.message);
    updateInflectedBatchControls();
    return false;
  }
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

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
}

async function loadLanguages() {
  try {
    const data = await apiRequest("/languages");
    languages = data.languages;
    languageChoices.replaceChildren();
    sourceLanguage.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choisir une langue";
    sourceLanguage.appendChild(placeholder);
    for (const language of languages) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "targetLanguage";
      input.value = language.code;
      input.checked = DEFAULT_LANGUAGE_CODES.has(language.code);
      label.append(input, document.createTextNode(` ${language.code.toUpperCase()} — ${language.name}`));
      languageChoices.appendChild(label);
      if (DEFAULT_LANGUAGE_CODES.has(language.code)) {
        const sourceOption = document.createElement("option");
        sourceOption.value = language.code;
        sourceOption.textContent = `${language.code.toUpperCase()} — ${language.name}`;
        sourceLanguage.appendChild(sourceOption);
      }
    }
    sourceLanguage.value = "es";
    setApiState("online", "API connectée");
  } catch (error) {
    setApiState("error", "API indisponible");
    setMessage("error", `Impossible de charger les langues : ${error.message}`);
  }
}

function canonicalKeyOrNull(value) {
  try {
    return canonicalizeEntryKey(value);
  } catch {
    return null;
  }
}

function validateDraft(candidate, candidateIndex = -1) {
  const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
  if (!canonicalKey || !/^[A-Z][A-Z0-9_]{2,99}$/.test(canonicalKey)) {
    return { code: "error", label: "Erreur" };
  }
  if (!candidate.gloss_fr.trim() || !candidate.semantic_domain.trim()) return { code: "incomplete", label: "Incomplet" };
  const requestedLanguages = checkedValues("targetLanguage");
  const complete = requestedLanguages.every(code =>
    candidate.forms.some(form => form.language_code === code && form.lemma.trim() && PARTS_OF_SPEECH.includes(form.part_of_speech))
  );
  if (!complete) return { code: "incomplete", label: "Incomplet" };
  const duplicateKeys = findDuplicateCanonicalEntryKeys(
    candidates.map(item => item.entry_key),
    [...existingEntryKeys]
  );
  if (duplicateKeys.has(canonicalKey)) {
    return { code: "duplicate", label: "Doublon possible" };
  }
  return { code: "ready", label: "Prêt" };
}

function canonicalizeCandidateForReview(candidate, index) {
  const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
  if (!canonicalKey) return false;
  candidate.entry_key = canonicalKey;
  const status = validateDraft(candidate, index);
  if (status.code === "duplicate" || status.code === "error") candidate.keep = false;
  return true;
}

function canonicalizeAllCandidateKeys() {
  candidates.forEach((candidate) => {
    const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
    if (canonicalKey) candidate.entry_key = canonicalKey;
    else candidate.keep = false;
  });
  candidates.forEach((candidate, index) => {
    const status = validateDraft(candidate, index);
    if (status.code === "duplicate" || status.code === "error") candidate.keep = false;
  });
}

async function refreshCanonicalEntryKeyExistence(candidate, index) {
  const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
  if (!canonicalKey) return;
  try {
    await apiRequest(`/admin/lexical-entry/${encodeURIComponent(canonicalKey)}`);
    existingEntryKeys.add(canonicalKey);
  } catch (error) {
    if (error.status !== 404) {
      setMessage("error", `Vérification du doublon impossible : ${error.message}`);
      return;
    }
  }
  if (candidates[index] === candidate && canonicalKeyOrNull(candidate.entry_key) === canonicalKey) {
    canonicalizeCandidateForReview(candidate, index);
    renderCandidates();
  }
}

function makeInput(value, field, index, ariaLabel) {
  const input = document.createElement("input");
  input.value = value;
  input.dataset.index = String(index);
  input.dataset.field = field;
  input.setAttribute("aria-label", ariaLabel);
  return input;
}

function renderCandidates() {
  candidateTableBody.replaceChildren();
  if (candidates.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-cell";
    cell.textContent = "Générez un premier lot de propositions.";
    row.appendChild(cell);
    candidateTableBody.appendChild(row);
  }

  candidates.forEach((candidate, index) => {
    const row = document.createElement("tr");
    row.dataset.index = String(index);
    const status = validateDraft(candidate, index);

    const keepCell = document.createElement("td");
    keepCell.className = "keep-cell";
    const keep = document.createElement("input");
    keep.type = "checkbox";
    keep.checked = candidate.keep;
    keep.disabled = status.code === "duplicate" || status.code === "error";
    keep.dataset.action = "keep";
    keep.dataset.index = String(index);
    keep.setAttribute("aria-label", `Garder ${candidate.entry_key || `la proposition ${index + 1}`}`);
    keepCell.appendChild(keep);

    const conceptCell = document.createElement("td");
    conceptCell.appendChild(makeInput(candidate.entry_key, "entry_key", index, "Clé technique"));

    const glossCell = document.createElement("td");
    const glossStack = document.createElement("div");
    glossStack.className = "stack";
    glossStack.append(
      makeInput(candidate.gloss_fr, "gloss_fr", index, "Glose française"),
      makeInput(candidate.gloss_en, "gloss_en", index, "Glose anglaise"),
      makeInput(candidate.semantic_domain, "semantic_domain", index, "Domaine sémantique")
    );
    glossCell.appendChild(glossStack);

    const formsCell = document.createElement("td");
    const formsStack = document.createElement("div");
    formsStack.className = "stack";
    for (const form of candidate.forms) {
      const editor = document.createElement("div");
      editor.className = "form-editor";
      const code = document.createElement("span");
      code.className = "language-code";
      code.textContent = form.language_code.toUpperCase();
      const lemma = document.createElement("input");
      lemma.value = form.lemma;
      lemma.dataset.index = String(index);
      lemma.dataset.formLanguage = form.language_code;
      lemma.dataset.formField = "lemma";
      lemma.setAttribute("aria-label", `Lemme ${form.language_code.toUpperCase()}`);
      const pos = document.createElement("select");
      pos.dataset.index = String(index);
      pos.dataset.formLanguage = form.language_code;
      pos.dataset.formField = "part_of_speech";
      pos.setAttribute("aria-label", `Catégorie ${form.language_code.toUpperCase()}`);
      for (const value of PARTS_OF_SPEECH) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === form.part_of_speech;
        pos.appendChild(option);
      }
      editor.append(code, lemma, pos);
      formsStack.appendChild(editor);
    }
    formsCell.appendChild(formsStack);

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge status-${status.code}`;
    badge.textContent = status.label;
    statusCell.appendChild(badge);

    const actionCell = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "×";
    remove.dataset.action = "delete";
    remove.dataset.index = String(index);
    remove.title = "Supprimer cette proposition";
    remove.setAttribute("aria-label", `Supprimer ${candidate.entry_key || `la proposition ${index + 1}`}`);
    actionCell.appendChild(remove);

    row.append(keepCell, conceptCell, glossCell, formsCell, statusCell, actionCell);
    candidateTableBody.appendChild(row);
  });

  candidateTotal.textContent = String(candidates.length);
  selectedTotal.textContent = String(candidates.filter(candidate => candidate.keep).length);
  createSelectedButton.disabled = !candidates.some(candidate => candidate.keep);
}

function updateCandidateIndicators(index) {
  const candidate = candidates[index];
  const row = candidateTableBody.querySelector(`tr[data-index="${index}"]`);
  if (candidate && row) {
    const status = validateDraft(candidate, index);
    const badge = row.querySelector(".status-badge");
    badge.className = `status-badge status-${status.code}`;
    badge.textContent = status.label;
  }
  selectedTotal.textContent = String(candidates.filter(item => item.keep).length);
  createSelectedButton.disabled = !candidates.some(item => item.keep);
}

function renderWords(target, words, kind = "unknown") {
  target.replaceChildren();
  if (!words.length) {
    target.textContent = kind === "unknown" ? "Aucune forme à examiner." : "Aucune forme reconnue.";
    return;
  }
  for (const word of words) {
    const item = document.createElement("span");
    item.className = `word-item${kind === "known" ? " known" : ""}${kind === "inflected" ? " inflected" : ""}`;
    const detail = kind !== "unknown" && word.matches
      ? ` · ${word.matches.map(match => `${match.lemma} · ${match.entry_key}`).join(", ")}`
      : "";
    const marker = kind === "known" ? "✓" : kind === "inflected" ? "↳" : "?";
    item.textContent = `${marker} ${word.surface} (${word.occurrences})${detail}`;
    target.appendChild(item);
  }
}

async function analyzeCoverage(event) {
  event.preventDefault();
  cancelLexicalGeneration({ showMessage: false });
  reviewItems = [];
  unknownWordValues = [];
  inflectedCandidates = [];
  inflectedBatchSession.reset([], sourceLanguage.value);
  inflectedBatchSize.value = String(DEFAULT_BATCH_SIZE);
  inflectedBatchLoading = false;
  inflectedGenerationMeta.textContent = "Aucune génération.";
  inflectedCreationReport.className = "creation-report";
  inflectedCreationReport.textContent = "";
  setInflectedMessage("", "");
  renderInflectedCandidates();
  updateInflectedBatchControls();
  analyzeButton.disabled = true;
  generateButton.disabled = true;
  generateInflectedButton.disabled = true;
  setCoverageMessage("info", "Lecture du texte et comparaison avec Dico-IC…");
  try {
    const data = await apiRequest("/admin/text-coverage", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        text: textInput.value,
        source_language: sourceLanguage.value,
      }),
    });
    document.getElementById("totalWords").textContent = data.summary.total_words;
    document.getElementById("uniqueForms").textContent = data.summary.unique_forms;
    document.getElementById("knownLemmas").textContent = data.summary.known_lemmas;
    document.getElementById("knownInflectedForms").textContent = data.summary.known_inflected_forms;
    document.getElementById("reviewForms").textContent = data.summary.forms_to_review;
    document.getElementById("absentConcepts").textContent = "0";
    renderWords(knownList, data.known_forms, "known");
    renderWords(knownInflectedList, data.known_inflected_forms, "inflected");
    renderWords(unknownList, data.forms_to_review, "unknown");
    conceptAbsentList.textContent = "Déterminés après la proposition morphologique.";
    reviewItems = data.forms_to_review;
    inflectedBatchSession.reset(reviewItems, sourceLanguage.value);
    inflectedBatchSize.value = String(DEFAULT_BATCH_SIZE);
    inflectedCandidates = inflectedBatchSession.candidates;
    renderInflectedCandidates();
    coverageResults.hidden = false;
    updateInflectedBatchControls();
    generateButton.disabled = true;
    setInflectedMessage(
      "info",
      reviewItems.length
        ? "Examinez les formes par lots successifs. Chaque lot reste déclenché manuellement."
        : "Aucune forme ne nécessite d’examen morphologique."
    );
    setCoverageMessage("success", reviewItems.length
      ? `${data.summary.known_lemmas} lemme(s), ${data.summary.known_inflected_forms} flexion(s) connue(s), ${data.summary.forms_to_review} forme(s) à examiner.`
      : "Toutes les formes uniques du texte sont déjà représentées dans Dico-IC.");
  } catch (error) {
    reviewItems = [];
    unknownWordValues = [];
    inflectedBatchSession.reset([], sourceLanguage.value);
    inflectedCandidates = inflectedBatchSession.candidates;
    coverageResults.hidden = true;
    updateInflectedBatchControls();
    setCoverageMessage("error", `Analyse impossible : ${error.message}`);
  } finally {
    analyzeButton.disabled = false;
  }
}

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function stateLabel(state) {
  return {
    READY: "READY",
    LEMMA_NOT_FOUND: "Lemme absent",
    AMBIGUOUS: "Ambigu",
    ALREADY_KNOWN: "Déjà connu",
    NEEDS_CORRECTION: "À corriger",
    REJECTED_BY_REVIEWER: "Refusé",
    CREATED: "Créé",
    ERROR: "Erreur",
  }[state] || state;
}

function evaluateInflectedCandidate(candidate) {
  if (candidate.state === "REJECTED_BY_REVIEWER" || candidate.state === "CREATED") {
    candidate.selected = false;
    return;
  }
  const target = candidate.target_options.find(
    (item) => Number(item.id) === Number(candidate.lexical_form_id)
  ) || null;
  candidate.target = target;
  if (!target) {
    candidate.state = candidate.target_options.length > 1 ? "AMBIGUOUS" : "LEMMA_NOT_FOUND";
    candidate.selected = false;
    return;
  }
  const sameMapping = candidate.existing_mappings.some(
    (mapping) => Number(mapping.lexical_form_id) === Number(target.id)
  );
  if (sameMapping) {
    candidate.state = "ALREADY_KNOWN";
    candidate.selected = false;
    return;
  }
  if (candidate.existing_mappings.length > 0
      || normalizeLookup(candidate.surface_form) === normalizeLookup(candidate.lemma_candidate)) {
    candidate.state = "NEEDS_CORRECTION";
    candidate.selected = false;
    return;
  }
  candidate.state = "READY";
}

function renderConceptAbsent() {
  const absent = inflectedCandidates.filter((candidate) => candidate.state === "LEMMA_NOT_FOUND");
  document.getElementById("absentConcepts").textContent = String(absent.length);
  conceptAbsentList.replaceChildren();
  if (!absent.length) {
    conceptAbsentList.textContent = "Aucun lemme absent identifié.";
    return;
  }
  for (const candidate of absent) {
    const item = document.createElement("span");
    item.className = "word-item";
    item.textContent = `? ${candidate.surface_form} → ${candidate.lemma_candidate}`;
    conceptAbsentList.appendChild(item);
  }
}

function renderTargetOptions(select, candidate) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = candidate.target_options.length
    ? "Choisir une cible"
    : "Aucune cible";
  select.appendChild(placeholder);
  for (const target of candidate.target_options) {
    const option = document.createElement("option");
    option.value = String(target.id);
    option.textContent = `${target.lemma} · ${target.entry_key}`;
    option.selected = Number(target.id) === Number(candidate.lexical_form_id);
    select.appendChild(option);
  }
}

function renderInflectedCandidates() {
  inflectedCandidateTableBody.replaceChildren();
  if (!inflectedCandidates.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 11;
    cell.className = "empty-cell";
    cell.textContent = "Aucune proposition morphologique.";
    row.appendChild(cell);
    inflectedCandidateTableBody.appendChild(row);
  }

  inflectedCandidates.forEach((candidate, index) => {
    const row = document.createElement("tr");
    row.dataset.index = String(index);
    if (candidate.state === "REJECTED_BY_REVIEWER") row.classList.add("candidate-rejected");

    const keepCell = document.createElement("td");
    const keep = document.createElement("input");
    keep.type = "checkbox";
    keep.checked = Boolean(candidate.selected);
    keep.disabled = candidate.state !== "READY";
    keep.dataset.inflectedAction = "select";
    keep.dataset.index = String(index);
    keep.setAttribute("aria-label", `Valider ${candidate.surface_form}`);
    keepCell.appendChild(keep);

    const surfaceCell = document.createElement("td");
    surfaceCell.textContent = candidate.surface_form;
    const languageCell = document.createElement("td");
    languageCell.textContent = candidate.language.toUpperCase();
    const contextCell = document.createElement("td");
    contextCell.className = "context-cell";
    contextCell.textContent = candidate.context;

    const lemmaCell = document.createElement("td");
    const lemma = document.createElement("input");
    lemma.value = candidate.lemma_candidate;
    lemma.dataset.inflectedField = "lemma_candidate";
    lemma.dataset.index = String(index);
    lemma.setAttribute("aria-label", `Lemme proposé pour ${candidate.surface_form}`);
    lemmaCell.appendChild(lemma);

    const targetCell = document.createElement("td");
    const target = document.createElement("select");
    target.dataset.inflectedField = "lexical_form_id";
    target.dataset.index = String(index);
    target.setAttribute("aria-label", `Cible Dico-IC pour ${candidate.surface_form}`);
    renderTargetOptions(target, candidate);
    targetCell.appendChild(target);

    const posCell = document.createElement("td");
    const pos = document.createElement("select");
    pos.dataset.inflectedField = "part_of_speech";
    pos.dataset.index = String(index);
    for (const value of ["noun", "adjective"]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === candidate.part_of_speech;
      pos.appendChild(option);
    }
    posCell.appendChild(pos);

    const numberCell = document.createElement("td");
    numberCell.textContent = "PLURAL";
    const confidenceCell = document.createElement("td");
    confidenceCell.textContent = Number(candidate.confidence_score).toFixed(2);
    confidenceCell.title = candidate.reason_short;

    const stateCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge status-${candidate.state.toLowerCase().replaceAll("_", "-")}`;
    badge.textContent = stateLabel(candidate.state);
    stateCell.appendChild(badge);

    const actionsCell = document.createElement("td");
    const actionStack = document.createElement("div");
    actionStack.className = "action-stack";
    const correct = document.createElement("button");
    correct.type = "button";
    correct.className = "button secondary";
    correct.textContent = "Corriger";
    correct.dataset.inflectedAction = "resolve";
    correct.dataset.index = String(index);
    const refuse = document.createElement("button");
    refuse.type = "button";
    refuse.className = "button secondary";
    refuse.textContent = candidate.state === "REJECTED_BY_REVIEWER" ? "Restaurer" : "Refuser";
    refuse.dataset.inflectedAction = "reject";
    refuse.dataset.index = String(index);
    actionStack.append(correct, refuse);
    if (candidate.state === "LEMMA_NOT_FOUND") {
      const createLemma = document.createElement("button");
      createLemma.type = "button";
      createLemma.className = "button secondary";
      createLemma.textContent = "Créer le lemme";
      createLemma.dataset.inflectedAction = "create-lemma";
      createLemma.dataset.index = String(index);
      actionStack.appendChild(createLemma);
    }
    actionsCell.appendChild(actionStack);

    row.append(
      keepCell, surfaceCell, languageCell, contextCell, lemmaCell, targetCell,
      posCell, numberCell, confidenceCell, stateCell, actionsCell
    );
    inflectedCandidateTableBody.appendChild(row);
  });

  inflectedCandidateTotal.textContent = String(inflectedCandidates.length);
  inflectedReadyTotal.textContent = String(
    inflectedCandidates.filter((candidate) => candidate.state === "READY").length
  );
  createInflectedButton.disabled = !inflectedCandidates.some(
    (candidate) => candidate.state === "READY" && candidate.selected
  );
  renderConceptAbsent();
}

async function generateInflectedCandidates() {
  if (!applySelectedInflectedBatchSize()) return;
  const batch = inflectedBatchSession.nextBatch();
  if (!batch.length || !sourceLanguage.value) {
    setInflectedMessage("error", "Analysez un texte et choisissez sa langue source.");
    return;
  }
  inflectedBatchLoading = true;
  updateInflectedBatchControls();
  setInflectedMessage("info", "Analyse morphologique en cours. Aucune donnée n’est écrite.");
  inflectedCreationReport.className = "creation-report";
  try {
    const data = await apiRequest("/admin/ai/inflected-form-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(buildInflectedBatchRequest(
        batch,
        sourceLanguage.value,
        textInput.value
      )),
    });
    inflectedBatchSession.completeBatch(batch, data.candidates);
    inflectedCandidates = inflectedBatchSession.candidates;
    const returnedKeys = new Set(data.candidates.map(
      (candidate) => inflectedFormIdentity(candidate.language, candidate.normalized_surface)
    ));
    const omitted = batch.filter((item) => !returnedKeys.has(
      inflectedFormIdentity(sourceLanguage.value, item.normalized)
    ));
    unknownWordValues = [...new Set([
      ...unknownWordValues,
      ...data.candidates
        .filter((candidate) => candidate.state === "LEMMA_NOT_FOUND")
        .map((candidate) => candidate.surface_form),
      ...omitted.map((item) => item.surface),
    ])];
    generateButton.disabled = unknownWordValues.length === 0;
    inflectedGenerationMeta.textContent =
      `Dernier lot : ${data.generation.returned}/${data.generation.requested} · modèle ${data.generation.model}`;
    const progress = inflectedBatchSession.progress();
    const warningMessage = formatIgnoredProposalWarning(data.warnings, data.candidates.length);
    setInflectedMessage(
      warningMessage ? "warning" : "success",
      warningMessage || (progress.complete
        ? `${progress.total} formes examinées. Vérifiez les propositions avant toute création.`
        : `${data.candidates.length} proposition(s) reçue(s). Le lot suivant attend votre action.`)
    );
    renderInflectedCandidates();
  } catch (error) {
    setInflectedMessage(
      "error",
      error.code === "OPENAI_TIMEOUT" || error.status === 504
        ? "La génération a dépassé le délai autorisé. Réduisez la taille du lot puis réessayez."
        : `Génération impossible : ${error.message}`
    );
  } finally {
    inflectedBatchLoading = false;
    updateInflectedBatchControls();
  }
}

async function resolveCorrectedCandidate(index) {
  const candidate = inflectedCandidates[index];
  if (!candidate) return;
  try {
    const data = await apiRequest(
      `/admin/forms?search=${encodeURIComponent(candidate.lemma_candidate)}&limit=50`
    );
    candidate.target_options = data.items.filter((item) =>
      item.language === candidate.language
      && String(item.part_of_speech).toLowerCase() === candidate.part_of_speech
      && normalizeLookup(item.lemma) === normalizeLookup(candidate.lemma_candidate)
    );
    candidate.lexical_form_id = candidate.target_options.length === 1
      ? candidate.target_options[0].id
      : null;
    evaluateInflectedCandidate(candidate);
    renderInflectedCandidates();
  } catch (error) {
    candidate.state = "ERROR";
    candidate.selected = false;
    setInflectedMessage("error", `Recherche de cible impossible : ${error.message}`);
    renderInflectedCandidates();
  }
}

async function createSelectedInflectedMappings() {
  const selected = inflectedCandidates.filter(
    (candidate) => candidate.state === "READY" && candidate.selected
  );
  const report = { created: [], duplicates: [], errors: [] };
  createInflectedButton.disabled = true;
  inflectedCreationReport.className = "creation-report visible";
  inflectedCreationReport.textContent = `Création de ${selected.length} mapping(s) en cours…`;

  for (const candidate of selected) {
    try {
      await apiRequest("/admin/inflected-form", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          lexical_form_id: candidate.lexical_form_id,
          surface_form: candidate.surface_form,
          grammatical_number: "PLURAL",
          status: "VALIDATED",
          source_label: candidate.source_label || "ai_text_inflection_v0",
          confidence_score: candidate.confidence_score,
        }),
      });
      report.created.push(candidate.surface_form);
      candidate.state = "CREATED";
      candidate.selected = false;
    } catch (error) {
      if (error.code === "DUPLICATE_INFLECTED_FORM") {
        report.duplicates.push(candidate.surface_form);
        candidate.state = "ALREADY_KNOWN";
      } else {
        report.errors.push(`${candidate.surface_form} : ${error.message}`);
        candidate.state = "ERROR";
      }
      candidate.selected = false;
    }
  }

  inflectedCreationReport.textContent = [
    `Mappings créés : ${report.created.length}${report.created.length ? ` — ${report.created.join(", ")}` : ""}`,
    `Déjà connus : ${report.duplicates.length}${report.duplicates.length ? ` — ${report.duplicates.join(", ")}` : ""}`,
    `Erreurs : ${report.errors.length}${report.errors.length ? ` — ${report.errors.join(" | ")}` : ""}`,
  ].join("\n");
  renderInflectedCandidates();
}

async function generateCandidates() {
  const request = {
    unknown_words: unknownWordValues,
    languages: checkedValues("targetLanguage"),
  };
  if (!request.unknown_words.length || request.languages.length === 0) {
    setMessage("error", "Analysez un texte contenant des formes inconnues et choisissez au moins une langue.");
    return;
  }

  const generation = lexicalGenerationSession.start(request.languages, elapsedSeconds => {
    generationElapsed.textContent = `${elapsedSeconds} s`;
  });
  if (!generation) return;

  setLexicalGenerationLoading(true, generation.languages);
  setMessage("info", "La génération peut être annulée sans modifier les brouillons existants.");
  creationReport.className = "creation-report";
  try {
    const data = await apiRequest("/admin/ai/text-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(request),
      signal: generation.signal,
    });
    if (!lexicalGenerationSession.isCurrent(generation.id)) return;
    generationProgressLabel.textContent = "Affichage des brouillons…";
    existingEntryKeys = new Set(
      (data.existing_entry_keys || []).map(canonicalizeEntryKey)
    );
    candidates = data.candidates.map(candidate => ({
      ...candidate,
      entry_key: canonicalizeEntryKey(candidate.entry_key),
      keep: true,
    }));
    canonicalizeAllCandidateKeys();
    generationMeta.textContent = `${data.generation.returned}/${data.generation.requested} · modèle ${data.generation.model}`;
    setMessage("success", `${candidates.length} proposition(s) reçue(s). Relisez-les avant création.`);
    renderCandidates();
  } catch (error) {
    if (!lexicalGenerationSession.isCurrent(generation.id)) return;
    if (isAbortError(error)) {
      setMessage("info", "Génération annulée. Aucun nouveau brouillon n’a été créé.");
    } else if (error.code === "OPENAI_TIMEOUT") {
      setMessage("error", "La génération OpenAI a dépassé le délai autorisé. Réessayez.");
    } else {
      setMessage("error", `Génération impossible : ${error.message}`);
    }
  } finally {
    if (lexicalGenerationSession.finish(generation.id)) {
      setLexicalGenerationLoading(false);
    }
  }
}

function updateCandidateFromControl(target) {
  const index = Number(target.dataset.index);
  const candidate = candidates[index];
  if (!candidate) return;
  if (target.dataset.action === "keep") candidate.keep = target.checked;
  if (target.dataset.field) {
    candidate[target.dataset.field] = target.value;
  }
  if (target.dataset.formField) {
    const form = candidate.forms.find(item => item.language_code === target.dataset.formLanguage);
    if (form) form[target.dataset.formField] = target.value;
  }
}

candidateTableBody.addEventListener("input", event => {
  updateCandidateFromControl(event.target);
  updateCandidateIndicators(Number(event.target.dataset.index));
});
candidateTableBody.addEventListener("change", event => {
  updateCandidateFromControl(event.target);
  updateCandidateIndicators(Number(event.target.dataset.index));
});
candidateTableBody.addEventListener("focusout", event => {
  if (event.target.dataset.field !== "entry_key") return;
  const index = Number(event.target.dataset.index);
  const candidate = candidates[index];
  if (!candidate) return;
  if (canonicalizeCandidateForReview(candidate, index)) {
    event.target.value = candidate.entry_key;
    void refreshCanonicalEntryKeyExistence(candidate, index);
  }
  renderCandidates();
});
candidateTableBody.addEventListener("click", event => {
  if (event.target.dataset.action !== "delete") return;
  candidates.splice(Number(event.target.dataset.index), 1);
  renderCandidates();
});

inflectedCandidateTableBody.addEventListener("input", event => {
  const index = Number(event.target.dataset.index);
  const candidate = inflectedCandidates[index];
  if (!candidate || event.target.dataset.inflectedField !== "lemma_candidate") return;
  candidate.lemma_candidate = event.target.value;
  candidate.normalized_lemma_candidate = normalizeLookup(event.target.value);
  candidate.lexical_form_id = null;
  candidate.target = null;
  candidate.target_options = [];
  candidate.state = "NEEDS_CORRECTION";
  candidate.selected = false;
});

inflectedCandidateTableBody.addEventListener("change", event => {
  const index = Number(event.target.dataset.index);
  const candidate = inflectedCandidates[index];
  if (!candidate) return;
  if (event.target.dataset.inflectedAction === "select") {
    candidate.selected = event.target.checked;
  }
  if (event.target.dataset.inflectedField === "lexical_form_id") {
    candidate.lexical_form_id = event.target.value ? Number(event.target.value) : null;
    evaluateInflectedCandidate(candidate);
  }
  if (event.target.dataset.inflectedField === "part_of_speech") {
    candidate.part_of_speech = event.target.value;
    candidate.lexical_form_id = null;
    candidate.target_options = [];
    candidate.state = "NEEDS_CORRECTION";
    candidate.selected = false;
  }
  renderInflectedCandidates();
});

inflectedCandidateTableBody.addEventListener("click", event => {
  const action = event.target.dataset.inflectedAction;
  if (!action) return;
  const index = Number(event.target.dataset.index);
  const candidate = inflectedCandidates[index];
  if (!candidate) return;
  if (action === "resolve") {
    resolveCorrectedCandidate(index);
    return;
  }
  if (action === "reject") {
    candidate.state = candidate.state === "REJECTED_BY_REVIEWER"
      ? "NEEDS_CORRECTION"
      : "REJECTED_BY_REVIEWER";
    candidate.selected = false;
    renderInflectedCandidates();
    return;
  }
  if (action === "create-lemma") {
    unknownWordValues = [...new Set([...unknownWordValues, candidate.surface_form])];
    generateButton.disabled = false;
    setMessage(
      "info",
      `${candidate.surface_form} a été orienté vers les brouillons lexicaux. Lancez la génération puis validez le lemme avant de reprendre ce mapping.`
    );
    lexicalGenerationSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function setAllSelected(value) {
  candidates.forEach(candidate => { candidate.keep = value; });
  renderCandidates();
}

async function createSelectedCandidates() {
  canonicalizeAllCandidateKeys();
  renderCandidates();
  const selected = candidates.filter(candidate => candidate.keep);
  const report = { created: [], duplicates: [], errors: [], ignored: candidates.length - selected.length };
  createSelectedButton.disabled = true;
  creationReport.className = "creation-report visible";
  creationReport.textContent = `Création de ${selected.length} entrée(s) en cours…`;

  for (const candidate of selected) {
    const status = validateDraft(candidate, candidates.indexOf(candidate));
    if (status.code === "error" || status.code === "incomplete" || status.code === "duplicate") {
      report.ignored += 1;
      continue;
    }
    try {
      await apiRequest("/admin/lexical-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          entry_key: candidate.entry_key,
          gloss_fr: candidate.gloss_fr,
          gloss_en: candidate.gloss_en || null,
          semantic_domain: candidate.semantic_domain,
          forms: candidate.forms.map(form => ({
            language: form.language_code,
            lemma: form.lemma,
            part_of_speech: form.part_of_speech,
          })),
        }),
      });
      report.created.push(candidate.entry_key);
      candidate.keep = false;
      existingEntryKeys.add(candidate.entry_key);
    } catch (error) {
      if (error.code === "DUPLICATE_ENTRY") report.duplicates.push(candidate.entry_key);
      else report.errors.push(`${candidate.entry_key} : ${error.message}`);
    }
  }

  creationReport.textContent = [
    `Entrées créées : ${report.created.length}${report.created.length ? ` — ${report.created.join(", ")}` : ""}`,
    `Doublons : ${report.duplicates.length}${report.duplicates.length ? ` — ${report.duplicates.join(", ")}` : ""}`,
    `Erreurs : ${report.errors.length}${report.errors.length ? ` — ${report.errors.join(" | ")}` : ""}`,
    `Lignes ignorées : ${report.ignored}`,
  ].join("\n");
  renderCandidates();
}

coverageForm.addEventListener("submit", analyzeCoverage);
sourceLanguage.addEventListener("change", () => {
  cancelLexicalGeneration({ showMessage: false });
  reviewItems = [];
  inflectedBatchSession.reset([], sourceLanguage.value);
  inflectedBatchSize.value = String(DEFAULT_BATCH_SIZE);
  inflectedCandidates = inflectedBatchSession.candidates;
  unknownWordValues = [];
  coverageResults.hidden = true;
  inflectedBatchLoading = false;
  inflectedGenerationMeta.textContent = "Aucune génération.";
  inflectedCreationReport.className = "creation-report";
  inflectedCreationReport.textContent = "";
  setInflectedMessage("", "");
  updateInflectedBatchControls();
  generateButton.disabled = true;
  renderInflectedCandidates();
});
generateInflectedButton.addEventListener("click", generateInflectedCandidates);
inflectedBatchSize.addEventListener("change", applySelectedInflectedBatchSize);
createInflectedButton.addEventListener("click", createSelectedInflectedMappings);
generateButton.addEventListener("click", generateCandidates);
cancelGenerationButton.addEventListener("click", () => cancelLexicalGeneration());
selectAllButton.addEventListener("click", () => setAllSelected(true));
selectNoneButton.addEventListener("click", () => setAllSelected(false));
createSelectedButton.addEventListener("click", createSelectedCandidates);
window.addEventListener("pagehide", () => cancelLexicalGeneration({ showMessage: false }));

loadLanguages();
