"use strict";

const API_BASE_URL = "http://localhost:3000";
const RELATION_TYPES = ["COGNATE_STRONG", "COGNATE_WEAK", "RELATED_FORM", "FALSE_FRIEND"];
const REFERENCE_LANGUAGES = ["fr", "es", "it", "pt", "en", "all"];

let entry = null;
let existingRelations = [];
let candidates = [];
let formsById = new Map();

const apiStatus = document.getElementById("apiStatus");
const entryTitle = document.getElementById("entryTitle");
const entryMessage = document.getElementById("entryMessage");
const entrySummary = document.getElementById("entrySummary");
const entryForms = document.getElementById("entryForms");
const existingRelationCount = document.getElementById("existingRelationCount");
const referenceLanguage = document.getElementById("referenceLanguage");
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

const savedReferenceLanguage = sessionStorage.getItem("dicoIcRelationReferenceLanguage");
if (REFERENCE_LANGUAGES.includes(savedReferenceLanguage)) {
  referenceLanguage.value = savedReferenceLanguage;
}
referenceLanguage.addEventListener("change", () => {
  sessionStorage.setItem("dicoIcRelationReferenceLanguage", referenceLanguage.value);
});

function setApiState(state, message) {
  apiStatus.dataset.state = state;
  apiStatus.textContent = message;
}

function setMessage(element, kind, message) {
  element.className = `message ${kind}`;
  element.textContent = message;
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

function pairMatches(relation, leftId, rightId) {
  return (Number(relation.source_form_id) === leftId && Number(relation.target_form_id) === rightId)
    || (Number(relation.source_form_id) === rightId && Number(relation.target_form_id) === leftId);
}

function candidateStatus(candidate) {
  if (!formsById.has(candidate.left_form_id) || !formsById.has(candidate.right_form_id)
      || candidate.left_form_id === candidate.right_form_id
      || !RELATION_TYPES.includes(candidate.relation_type)
      || !Number.isFinite(Number(candidate.score))
      || Number(candidate.score) < 0 || Number(candidate.score) > 1) {
    return { code: "error", label: "Erreur" };
  }
  if (existingRelations.some(relation => pairMatches(relation, candidate.left_form_id, candidate.right_form_id))) {
    return { code: "existing", label: "Déjà existante" };
  }
  return { code: "new", label: "Nouvelle" };
}

function formReference(formId) {
  const form = formsById.get(formId);
  const wrapper = document.createElement("div");
  wrapper.className = "form-reference";
  if (!form) {
    wrapper.textContent = `Forme ${formId} introuvable`;
    return wrapper;
  }
  const lemma = document.createElement("strong");
  lemma.textContent = `${form.language.toUpperCase()} · ${form.lemma}`;
  const detail = document.createElement("small");
  detail.textContent = `${entry.entry_key} · ${form.part_of_speech || "?"} · id ${form.id}`;
  wrapper.append(lemma, detail);
  return wrapper;
}

function renderEntry() {
  entryTitle.textContent = `Entrée : ${entry.entry_key}`;
  document.getElementById("entryGlossFr").textContent = entry.gloss_fr || "—";
  document.getElementById("entryGlossEn").textContent = entry.gloss_en || "—";
  document.getElementById("entryDomain").textContent = entry.semantic_domain || "—";
  existingRelationCount.textContent = String(existingRelations.length);
  entryForms.replaceChildren();
  for (const form of entry.forms) {
    const tag = document.createElement("span");
    tag.className = "entry-form-tag";
    const code = document.createElement("strong");
    code.textContent = form.language.toUpperCase();
    tag.append(code, document.createTextNode(` · ${form.lemma} · ${form.part_of_speech || "?"}`));
    entryForms.appendChild(tag);
  }
  entrySummary.hidden = false;
  entryMessage.className = "message";
  entryMessage.textContent = "";
  generateButton.disabled = entry.forms.length < 2;
}

async function loadEntry() {
  const entryKey = new URLSearchParams(window.location.search).get("entry_key")?.trim().toUpperCase() || "";
  if (!entryKey) {
    setApiState("error", "Entrée manquante");
    setMessage(entryMessage, "error", "Ajoutez un paramètre entry_key à l’URL.");
    return;
  }
  try {
    const data = await apiRequest(`/admin/lexical-entry/${encodeURIComponent(entryKey)}`);
    entry = data.entry;
    existingRelations = data.relations || [];
    formsById = new Map(entry.forms.map(form => [Number(form.id), { ...form, id: Number(form.id) }]));
    renderEntry();
    setApiState("online", "API connectée");
    if (entry.forms.length < 2) {
      setMessage(entryMessage, "error", "Cette entrée ne contient pas assez de formes pour proposer une relation.");
    }
  } catch (error) {
    setApiState("error", "Chargement impossible");
    setMessage(entryMessage, "error", error.message);
  }
}

function renderCandidates() {
  candidateTableBody.replaceChildren();
  if (!candidates.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty-cell";
    cell.textContent = "Aucune proposition à afficher.";
    row.appendChild(cell);
    candidateTableBody.appendChild(row);
  }

  candidates.forEach((candidate, index) => {
    const status = candidateStatus(candidate);
    if (status.code !== "new") candidate.keep = false;
    const row = document.createElement("tr");
    row.dataset.index = String(index);

    const keepCell = document.createElement("td");
    keepCell.className = "keep-cell";
    const keep = document.createElement("input");
    keep.type = "checkbox";
    keep.checked = Boolean(candidate.keep);
    keep.disabled = status.code !== "new";
    keep.dataset.action = "keep";
    keep.dataset.index = String(index);
    keep.setAttribute("aria-label", `Garder la relation ${index + 1}`);
    keepCell.appendChild(keep);

    const leftCell = document.createElement("td");
    leftCell.appendChild(formReference(candidate.left_form_id));
    const rightCell = document.createElement("td");
    rightCell.appendChild(formReference(candidate.right_form_id));

    const typeCell = document.createElement("td");
    const typeSelect = document.createElement("select");
    typeSelect.dataset.index = String(index);
    typeSelect.dataset.field = "relation_type";
    typeSelect.setAttribute("aria-label", `Type de la relation ${index + 1}`);
    for (const type of RELATION_TYPES) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      option.selected = type === candidate.relation_type;
      typeSelect.appendChild(option);
    }
    typeCell.appendChild(typeSelect);

    const scoreCell = document.createElement("td");
    const scoreInput = document.createElement("input");
    scoreInput.type = "number";
    scoreInput.min = "0";
    scoreInput.max = "1";
    scoreInput.step = "0.01";
    scoreInput.value = String(candidate.score);
    scoreInput.dataset.index = String(index);
    scoreInput.dataset.field = "score";
    scoreInput.setAttribute("aria-label", `Score de la relation ${index + 1}`);
    scoreCell.appendChild(scoreInput);

    const justificationCell = document.createElement("td");
    justificationCell.textContent = candidate.justification;

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge status-${status.code}`;
    badge.textContent = status.label;
    if (status.code === "existing") {
      const existing = existingRelations.find(relation => pairMatches(relation, candidate.left_form_id, candidate.right_form_id));
      badge.title = existing ? `${existing.relation_type} · score ${existing.score ?? "?"}` : "Relation existante";
    }
    statusCell.appendChild(badge);

    const actionCell = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "×";
    remove.dataset.action = "delete";
    remove.dataset.index = String(index);
    remove.title = "Supprimer cette proposition";
    remove.setAttribute("aria-label", `Supprimer la relation ${index + 1}`);
    actionCell.appendChild(remove);

    row.append(keepCell, leftCell, rightCell, typeCell, scoreCell, justificationCell, statusCell, actionCell);
    candidateTableBody.appendChild(row);
  });
  candidateTotal.textContent = String(candidates.length);
  selectedTotal.textContent = String(candidates.filter(candidate => candidate.keep && candidateStatus(candidate).code === "new").length);
  createSelectedButton.disabled = !candidates.some(candidate => candidate.keep && candidateStatus(candidate).code === "new");
}

async function generateCandidates() {
  if (!entry) return;
  generateButton.disabled = true;
  creationReport.className = "creation-report";
  setMessage(generationMessage, "info", "Génération en cours. Aucune relation n’est écrite en base.");
  try {
    const data = await apiRequest("/admin/ai/relation-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        entry_key: entry.entry_key,
        reference_language: referenceLanguage.value,
      }),
    });
    existingRelations = data.existing_relations || [];
    candidates = data.candidates.map(candidate => ({ ...candidate, keep: candidate.status === "new" }));
    existingRelationCount.textContent = String(existingRelations.length);
    const referenceLabel = data.generation.reference_language === "all"
      ? "toutes les langues"
      : `référence ${data.generation.reference_language.toUpperCase()}`;
    generationMeta.textContent = `${data.generation.returned} proposition(s) · ${referenceLabel} · modèle ${data.generation.model}`;
    setMessage(generationMessage, "success", `${candidates.length} proposition(s) reçue(s). Relisez-les avant création.`);
    renderCandidates();
  } catch (error) {
    setMessage(generationMessage, "error", `Génération impossible : ${error.message}`);
  } finally {
    generateButton.disabled = !entry || entry.forms.length < 2;
  }
}

function updateCandidate(target) {
  const candidate = candidates[Number(target.dataset.index)];
  if (!candidate) return;
  if (target.dataset.action === "keep") candidate.keep = target.checked;
  if (target.dataset.field === "relation_type") candidate.relation_type = target.value;
  if (target.dataset.field === "score") candidate.score = Number(target.value);
}

candidateTableBody.addEventListener("change", event => {
  updateCandidate(event.target);
  renderCandidates();
});
candidateTableBody.addEventListener("click", event => {
  if (event.target.dataset.action !== "delete") return;
  candidates.splice(Number(event.target.dataset.index), 1);
  renderCandidates();
});

function setAllSelected(value) {
  candidates.forEach(candidate => {
    candidate.keep = value && candidateStatus(candidate).code === "new";
  });
  renderCandidates();
}

async function createSelectedRelations() {
  const selected = candidates.filter(candidate => candidate.keep && candidateStatus(candidate).code === "new");
  const report = { created: [], duplicates: [], errors: [], ignored: candidates.length - selected.length };
  createSelectedButton.disabled = true;
  creationReport.className = "creation-report visible";
  creationReport.textContent = `Création de ${selected.length} relation(s) en cours…`;

  for (const candidate of selected) {
    try {
      const data = await apiRequest("/admin/form-relation", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          source_form_id: candidate.left_form_id,
          target_form_id: candidate.right_form_id,
          relation_type: candidate.relation_type,
          score: Number(candidate.score),
          source_label: "ai_relations_v0",
        }),
      });
      report.created.push(`${formsById.get(candidate.left_form_id)?.lemma} ↔ ${formsById.get(candidate.right_form_id)?.lemma}`);
      existingRelations.push(data.relation);
      candidate.keep = false;
    } catch (error) {
      if (error.code === "DUPLICATE_RELATION") {
        report.duplicates.push(`${candidate.left_form_id} ↔ ${candidate.right_form_id}`);
        existingRelations.push({
          source_form_id: candidate.left_form_id,
          target_form_id: candidate.right_form_id,
          relation_type: candidate.relation_type,
          score: Number(candidate.score),
        });
        candidate.keep = false;
      } else {
        report.errors.push(`${candidate.left_form_id} ↔ ${candidate.right_form_id} : ${error.message}`);
      }
    }
  }

  existingRelationCount.textContent = String(existingRelations.length);
  creationReport.textContent = [
    `Relations créées : ${report.created.length}${report.created.length ? ` · ${report.created.join(", ")}` : ""}`,
    `Doublons : ${report.duplicates.length}${report.duplicates.length ? ` · ${report.duplicates.join(", ")}` : ""}`,
    `Erreurs : ${report.errors.length}${report.errors.length ? ` · ${report.errors.join(" | ")}` : ""}`,
    `Lignes ignorées : ${report.ignored}`,
  ].join("\n");
  renderCandidates();
}

generateButton.addEventListener("click", generateCandidates);
selectAllButton.addEventListener("click", () => setAllSelected(true));
selectNoneButton.addEventListener("click", () => setAllSelected(false));
createSelectedButton.addEventListener("click", createSelectedRelations);

loadEntry();
