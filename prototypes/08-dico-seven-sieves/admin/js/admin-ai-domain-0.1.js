"use strict";

const API_BASE_URL = "http://localhost:3000";
const DEFAULT_LANGUAGE_CODES = new Set(["fr", "es", "it", "pt"]);
const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb"];
const {
  canonicalizeEntryKey,
  findDuplicateCanonicalEntryKeys,
  reconcileFrenchPronominalConceptKey,
} = window.DicoEntryKey;

let languages = [];
let candidates = [];
let existingEntryKeys = new Set();

const apiStatus = document.getElementById("apiStatus");
const generationForm = document.getElementById("generationForm");
const domainInput = document.getElementById("domainInput");
const candidateCount = document.getElementById("candidateCount");
const levelSelect = document.getElementById("levelSelect");
const languageChoices = document.getElementById("languageChoices");
const generateButton = document.getElementById("generateButton");
const generationMessage = document.getElementById("generationMessage");
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
    for (const language of languages) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "targetLanguage";
      input.value = language.code;
      input.checked = DEFAULT_LANGUAGE_CODES.has(language.code);
      label.append(input, document.createTextNode(` ${language.code.toUpperCase()} — ${language.name}`));
      languageChoices.appendChild(label);
    }
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

function validateDraft(candidate) {
  const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
  if (!canonicalKey || !/^[A-Z][A-Z0-9_]{2,99}$/.test(canonicalKey)) return { code: "error", label: "Erreur" };
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
  if (duplicateKeys.has(canonicalKey)) return { code: "duplicate", label: "Doublon possible" };
  const pronominalCheck = reconcileFrenchPronominalConceptKey(canonicalKey, candidate.forms);
  if (pronominalCheck.state === "ambiguous") {
    return { code: "warning", label: "Structure à vérifier", title: pronominalCheck.warning };
  }
  return { code: "ready", label: "Prêt" };
}

function canonicalizeCandidateForReview(candidate) {
  const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
  if (!canonicalKey) return false;
  candidate.entry_key = canonicalKey;
  const status = validateDraft(candidate);
  if (status.code === "duplicate" || status.code === "error" || status.code === "warning") candidate.keep = false;
  return true;
}

function canonicalizeAllCandidateKeys() {
  candidates.forEach((candidate) => {
    const canonicalKey = canonicalKeyOrNull(candidate.entry_key);
    if (canonicalKey) candidate.entry_key = canonicalKey;
    else candidate.keep = false;
  });
  candidates.forEach((candidate) => {
    const status = validateDraft(candidate);
    if (status.code === "duplicate" || status.code === "error" || status.code === "warning") candidate.keep = false;
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
    canonicalizeCandidateForReview(candidate);
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
    const status = validateDraft(candidate);

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
    if (status.title) badge.title = status.title;
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
    const status = validateDraft(candidate);
    const badge = row.querySelector(".status-badge");
    badge.className = `status-badge status-${status.code}`;
    badge.textContent = status.label;
    badge.title = status.title || "";
  }
  selectedTotal.textContent = String(candidates.filter(item => item.keep).length);
  createSelectedButton.disabled = !candidates.some(item => item.keep);
}

async function generateCandidates(event) {
  event.preventDefault();
  const request = {
    domain: domainInput.value.trim(),
    count: Number(candidateCount.value),
    languages: checkedValues("targetLanguage"),
    level: levelSelect.value,
    parts_of_speech: checkedValues("partOfSpeech"),
  };
  if (!request.domain || request.languages.length === 0 || request.parts_of_speech.length === 0) {
    setMessage("error", "Renseignez un domaine, au moins une langue et une catégorie.");
    return;
  }

  generateButton.disabled = true;
  setMessage("info", "Génération en cours. Aucun brouillon n’est encore écrit en base.");
  creationReport.className = "creation-report";
  try {
    const data = await apiRequest("/admin/ai/domain-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(request),
    });
    existingEntryKeys = new Set((data.existing_entry_keys || []).map(canonicalizeEntryKey));
    candidates = data.candidates.map(candidate => ({ ...candidate, keep: true }));
    canonicalizeAllCandidateKeys();
    generationMeta.textContent = `${data.generation.returned}/${data.generation.requested} · modèle ${data.generation.model}`;
    setMessage("success", `${candidates.length} proposition(s) reçue(s). Relisez-les avant création.`);
    renderCandidates();
  } catch (error) {
    setMessage("error", `Génération impossible : ${error.message}`);
  } finally {
    generateButton.disabled = false;
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
  if (canonicalizeCandidateForReview(candidate)) {
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
    const status = validateDraft(candidate);
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

generationForm.addEventListener("submit", generateCandidates);
selectAllButton.addEventListener("click", () => setAllSelected(true));
selectNoneButton.addEventListener("click", () => setAllSelected(false));
createSelectedButton.addEventListener("click", createSelectedCandidates);

loadLanguages();
