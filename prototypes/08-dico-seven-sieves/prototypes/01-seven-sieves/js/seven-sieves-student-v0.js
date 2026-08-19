"use strict";

const sessionContract = window.SevenSievesSession;
let analysisPackage = null;
const explorationState = sessionContract.createExplorationState();
const textContainer = document.getElementById("text");
const sieveTitle = document.getElementById("sieve-title");
const sieveDescription = document.getElementById("sieve-description");
const activeSieveLabel = document.getElementById("activeSieveLabel");
const selectedCountEl = document.getElementById("selectedCount");
const correctCountEl = document.getElementById("correctCount");
const selectedWordsEl = document.getElementById("selectedWords");
const currentHintsEl = document.getElementById("currentHints");
const transformationsBox = document.getElementById("transformationsBox");
const inspectionBox = document.getElementById("inspectionBox");
const legendBox = document.getElementById("legendBox");
const globalFeedback = document.getElementById("globalFeedback");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSieve(sieveId) {
  return analysisPackage?.sieves.find((sieve) => sieve.id === sieveId) || null;
}

function getToken(tokenIndex) {
  return analysisPackage?.tokens.find((token) => token.index === tokenIndex) || null;
}

function getTokenEnrichments(tokenIndex, sieveId = null) {
  const token = getToken(tokenIndex);
  if (!token) return [];
  return sieveId === null
    ? token.enrichments
    : token.enrichments.filter((item) => item.sieve_id === sieveId);
}

function clearLocalExplorationState() {
  explorationState.reset();
  clearHintVisuals();
}

function formatPayload(payload = {}) {
  if (Array.isArray(payload.forms)) {
    return payload.forms.map((item) => `${item.language.toUpperCase()} : ${item.form}`).join(" · ");
  }
  if (payload.original && payload.transformed) return `${payload.original} → ${payload.transformed}`;
  if (payload.source_form && payload.mediation_form) return `${payload.source_form} → ${payload.mediation_form}`;
  if (payload.role) return `Rôle : ${payload.role}`;
  if (payload.category) return `Signal : ${payload.category}${payload.marker ? ` (${payload.marker})` : ""}`;
  if (payload.affix) return `${payload.affix_type === "prefix" ? "Préfixe" : "Suffixe"} : -${payload.affix}`;
  if (payload.pattern) return `Motif : ${payload.pattern}`;
  return "";
}

function formatEnrichmentPlain(enrichment) {
  return [
    enrichment.label,
    formatPayload(enrichment.payload),
    enrichment.explanation,
    enrichment.caution ? `Prudence : ${enrichment.caution}` : "",
  ].filter(Boolean).join("\n");
}

function enrichmentHtml(enrichment) {
  return `<div class="multi-line">${escapeHtml(formatEnrichmentPlain(enrichment)).replaceAll("\n", "<br>")}</div>`;
}

function createInteractiveToken(token) {
  const span = document.createElement("span");
  span.className = "word";
  span.dataset.tokenIndex = String(token.index);
  span.dataset.clean = token.normalized;
  span.appendChild(document.createTextNode(token.surface));

  const tooltip = document.createElement("span");
  tooltip.className = "tooltip";
  span.appendChild(tooltip);

  span.addEventListener("click", () => {
    explorationState.inspect(token.index);
    refreshTokenStates();
  });
  span.addEventListener("dblclick", (event) => {
    event.preventDefault();
    toggleTokenSelection(token.index);
  });
  span.addEventListener("mouseenter", () => {
    const enrichments = getTokenEnrichments(token.index, explorationState.activeSieve);
    if (!enrichments.length) return;
    tooltip.textContent = enrichments.map(formatEnrichmentPlain).join("\n\n");
    span.classList.add("show-tooltip");
  });
  span.addEventListener("mouseleave", () => span.classList.remove("show-tooltip"));
  return span;
}

function buildTextFromTokens() {
  textContainer.innerHTML = "";
  let cursor = 0;
  analysisPackage.tokens.forEach((token) => {
    if (token.start > cursor) {
      textContainer.appendChild(document.createTextNode(analysisPackage.text.slice(cursor, token.start)));
    }
    textContainer.appendChild(token.kind === "word" ? createInteractiveToken(token) : document.createTextNode(token.surface));
    cursor = token.end;
  });
  if (cursor < analysisPackage.text.length) {
    textContainer.appendChild(document.createTextNode(analysisPackage.text.slice(cursor)));
  }
  updateSidebar();
  renderInspectionBox();
}

function toggleTokenSelection(tokenIndex) {
  explorationState.toggleSelection(tokenIndex);
  updateSidebar();
  refreshTokenStates();
}

function getStatusLabel(status) {
  if (status === "known") return "compris";
  if (status === "doubt") return "doute";
  if (status === "unknown") return "inconnu";
  return "non défini";
}

function renderInspectionBox() {
  if (!analysisPackage) return;
  if (explorationState.inspectedTokenIndex === null) {
    inspectionBox.innerHTML = `<div class="inspect-section">Clique sur un mot pour examiner ses indices.<br>Double-clique pour l’ajouter à ta sélection.</div>`;
    return;
  }
  const token = getToken(explorationState.inspectedTokenIndex);
  if (!token) return;
  const status = explorationState.tokenStatuses[token.index] || "none";
  const isSelected = explorationState.selectedTokenIndexes.has(token.index);
  const activeEnrichments = getTokenEnrichments(token.index, explorationState.activeSieve);
  const allEnrichments = getTokenEnrichments(token.index);
  const activeHtml = activeEnrichments.length
    ? activeEnrichments.map(enrichmentHtml).join("<hr>")
    : `<div class="multi-line">Aucun indice reçu pour ce tamis.</div>`;
  const allHtml = allEnrichments.length
    ? allEnrichments.map((item) => {
      const sieve = getSieve(item.sieve_id);
      return `<div class="multi-line"><strong>Tamis ${item.sieve_id} — ${escapeHtml(sieve?.label || "")}</strong><br>${escapeHtml(item.label)}</div>`;
    }).join("")
    : `<div class="multi-line">Aucun indice reçu pour cette occurrence.</div>`;

  inspectionBox.innerHTML = `
    <div class="inspect-section">
      <div class="inspect-word">${escapeHtml(token.surface)}</div>
      <div class="inspect-muted">Tamis actif : ${explorationState.activeSieve}</div>
    </div>
    <div class="inspect-section">
      <h4>Sélection</h4>
      <button class="mini-btn" data-action="toggle-select">${isSelected ? "Retirer de la sélection" : "Ajouter à la sélection"}</button>
    </div>
    <div class="inspect-section">
      <h4>Ma compréhension</h4>
      <div class="inspect-actions">
        <button class="mini-btn ${status === "known" ? "active-status" : ""}" data-status="known">Compris</button>
        <button class="mini-btn ${status === "doubt" ? "active-status" : ""}" data-status="doubt">Doute</button>
        <button class="mini-btn ${status === "unknown" ? "active-status" : ""}" data-status="unknown">Inconnu</button>
      </div>
      <div class="inspect-muted" style="margin-top:8px;">Actuel : ${escapeHtml(getStatusLabel(status))}</div>
    </div>
    <div class="inspect-section"><h4>Indice du tamis actif</h4>${activeHtml}</div>
    <div class="inspect-section"><h4>Vue des sept tamis</h4>${allHtml}</div>`;
}

function refreshTokenStates() {
  document.querySelectorAll(".word[data-token-index]").forEach((element) => {
    const tokenIndex = Number(element.dataset.tokenIndex);
    const status = explorationState.tokenStatuses[tokenIndex] || "none";
    element.classList.toggle("selected", explorationState.selectedTokenIndexes.has(tokenIndex));
    element.classList.toggle("inspected", explorationState.inspectedTokenIndex === tokenIndex);
    element.classList.toggle("status-known", status === "known");
    element.classList.toggle("status-doubt", status === "doubt");
    element.classList.toggle("status-unknown", status === "unknown");
  });
  if (explorationState.hintsVisible) applyHintVisuals();
  renderInspectionBox();
}

function publicSieveStatus(sieve) {
  if (sieve.status === "experimental") return "Ce tamis propose encore des indices expérimentaux.";
  if (sieve.status === "unsupported") return "Ce tamis n’est pas disponible pour cette activité.";
  return "Ce tamis utilise les indices disponibles pour cette activité.";
}

function updateSidebar() {
  if (!analysisPackage) return;
  const selectedTokens = [...explorationState.selectedTokenIndexes].sort((a, b) => a - b).map(getToken).filter(Boolean);
  const coherentTokens = selectedTokens.filter((token) => getTokenEnrichments(token.index, explorationState.activeSieve).length > 0);
  selectedCountEl.textContent = String(selectedTokens.length);
  correctCountEl.textContent = String(coherentTokens.length);
  activeSieveLabel.textContent = String(explorationState.activeSieve);
  selectedWordsEl.textContent = selectedTokens.length
    ? selectedTokens.map((token) => token.surface).join(", ")
    : "Aucun mot sélectionné.";
  const sieve = getSieve(explorationState.activeSieve);
  currentHintsEl.textContent = sieve
    ? `${sieve.description}\n${publicSieveStatus(sieve)}`
    : "Tamis absent de cette activité.";

  if (selectedTokens.length === 0) {
    globalFeedback.textContent = "Explore le texte, inspecte un mot ou construis une sélection.";
    globalFeedback.style.background = "#f7fafc";
  } else if (coherentTokens.length < selectedTokens.length) {
    globalFeedback.textContent = "Ta sélection contient aussi des mots sans indice pour le tamis actif.";
    globalFeedback.style.background = "#fff8e8";
  } else {
    globalFeedback.textContent = "Ta sélection correspond aux indices du tamis actif.";
    globalFeedback.style.background = "#eafbe7";
  }
  updateTransformationsBox();
}

function updateTransformationsBox() {
  const rows = analysisPackage.tokens
    .filter((token) => token.kind === "word")
    .flatMap((token) => getTokenEnrichments(token.index, explorationState.activeSieve).map((enrichment) => {
      const payload = formatPayload(enrichment.payload);
      return `${token.surface} → ${enrichment.label}${payload ? ` · ${payload}` : ""}`;
    }));
  transformationsBox.textContent = rows.length ? rows.join("\n") : "Aucun indice reçu pour ce tamis.";
}

function clearHintVisuals() {
  document.querySelectorAll(".word").forEach((element) => {
    element.classList.remove("hint", "suffix", "pan-roman-match", "transform-strong", "transform-soft", "graphy-match", "morpho-match", "syntax-subject", "syntax-verb", "syntax-complement", "syntax-related", "show-tooltip");
  });
}

function classForEnrichment(enrichment) {
  if (enrichment.sieve_id === 2) return "pan-roman-match";
  if (enrichment.sieve_id === 3) return enrichment.level === "strong" ? "transform-strong" : "transform-soft";
  if (enrichment.sieve_id === 4) return "graphy-match";
  if (enrichment.sieve_id === 5) return `syntax-${enrichment.payload.role || "complement"}`;
  if (enrichment.sieve_id === 6) return "morpho-match";
  if (enrichment.sieve_id === 7) return "suffix";
  return "hint";
}

function applyHintVisuals() {
  clearHintVisuals();
  document.querySelectorAll(".word[data-token-index]").forEach((element) => {
    const enrichments = getTokenEnrichments(Number(element.dataset.tokenIndex), explorationState.activeSieve);
    if (!enrichments.length) return;
    element.classList.add("hint");
    enrichments.forEach((item) => element.classList.add(classForEnrichment(item)));
  });
}

function showHints() {
  if (!analysisPackage) return;
  explorationState.hintsVisible = true;
  applyHintVisuals();
}

function updateLegend() {
  const labels = {
    1: ["Correspondance forte", "Correspondance partielle"],
    2: ["Parenté lexicale romane"],
    3: ["Transformation forte", "Transformation partielle"],
    4: ["Signal grapho-phonétique"],
    5: ["Sujet, verbe ou complément probable"],
    6: ["Signal grammatical visible"],
    7: ["Préfixe ou suffixe repéré"],
  };
  legendBox.innerHTML = (labels[explorationState.activeSieve] || [])
    .map((label) => `<div class="legend-line"><span class="legend-sample"></span><span>${escapeHtml(label)}</span></div>`)
    .join("");
}

function updateMicroGuide() {
  const guides = {
    1: "Commence par repérer les mots proches de la langue de médiation.",
    2: "Compare les formes romanes sans chercher une traduction mot à mot.",
    3: "Observe les transformations proposées par les règles reçues.",
    4: "Observe les graphies qui orientent la prononciation.",
    5: "Essaie de reconstruire la phrase : qui fait quoi ?",
    6: "Repère les petits signaux grammaticaux.",
    7: "Regarde les terminaisons et débuts de mots.",
  };
  document.getElementById("microGuide").textContent = guides[explorationState.activeSieve] || "";
}

function setSieve(number) {
  if (!analysisPackage) return;
  const sieve = getSieve(number);
  if (!sieve || sieve.status === "unsupported") return;
  explorationState.activeSieve = number;
  for (let id = 1; id <= 7; id += 1) {
    document.getElementById(`btn-sieve-${id}`)?.classList.toggle("active", id === number);
  }
  sieveTitle.textContent = `${sieve.id}. ${sieve.label}`;
  sieveDescription.textContent = sieve.description;
  activeSieveLabel.textContent = String(number);
  updateLegend();
  updateMicroGuide();
  clearHintVisuals();
  if (explorationState.hintsVisible) applyHintVisuals();
  updateSidebar();
  renderInspectionBox();
}

function configureSieveButtons() {
  for (let id = 1; id <= 7; id += 1) {
    const button = document.getElementById(`btn-sieve-${id}`);
    const sieve = getSieve(id);
    if (!button || !sieve) continue;
    button.textContent = `${id}. ${sieve.label}`;
    button.disabled = sieve.status === "unsupported";
    button.classList.toggle("coming-soon", sieve.status === "unsupported");
    button.title = sieve.status === "experimental" ? "Traitement encore expérimental" : "";
  }
}

function compareSelection() {
  const selected = [...explorationState.selectedTokenIndexes].map(getToken).filter(Boolean);
  const matching = selected.filter((token) => getTokenEnrichments(token.index, explorationState.activeSieve).length > 0);
  globalFeedback.textContent = selected.length
    ? `Comparaison : ${matching.length} mot(s) sur ${selected.length} disposent d’un indice pour le tamis ${explorationState.activeSieve}. Ce retour n’est pas une note.`
    : "Sélectionne d’abord un ou plusieurs mots à comparer.";
  globalFeedback.style.background = "#eef4ff";
}

function resetExploration() {
  clearLocalExplorationState();
  setSieve(1);
  buildTextFromTokens();
  globalFeedback.textContent = "L’exploration a été réinitialisée. L’activité préparée est conservée.";
  globalFeedback.style.background = "#eef4ff";
}

function renderActivity(activity) {
  analysisPackage = activity.analysis;
  clearLocalExplorationState();
  const preparation = activity.preparation;
  document.getElementById("activityContext").innerHTML = `
    <strong>Activité préparée</strong>
    <span class="context-chip">Source : ${escapeHtml(preparation.source_language.toUpperCase())}</span>
    <span class="context-chip">Médiation : ${escapeHtml(preparation.mediation_language.toUpperCase())}</span>
    <span class="context-chip">Comparaison : ${escapeHtml(preparation.comparison_languages.join(" / ").toUpperCase() || "aucune")}</span>`;
  document.getElementById("emptyState").hidden = true;
  document.getElementById("studentWorkspace").hidden = false;
  configureSieveButtons();
  buildTextFromTokens();
  const firstAvailable = analysisPackage.sieves.find((sieve) => sieve.status !== "unsupported")?.id || 1;
  setSieve(firstAvailable);
}

function showEmptyState(status) {
  document.getElementById("activityContext").hidden = true;
  document.getElementById("studentWorkspace").hidden = true;
  document.getElementById("emptyState").hidden = false;
  document.getElementById("emptyReason").textContent = status === "missing"
    ? "Demande à l’enseignant de préparer l’exploration dans cet onglet."
    : "L’activité disponible n’est pas compatible. Reviens à la préparation pour en créer une nouvelle.";
}

inspectionBox.addEventListener("click", (event) => {
  if (explorationState.inspectedTokenIndex === null) return;
  const action = event.target.dataset.action;
  const status = event.target.dataset.status;
  if (action === "toggle-select") toggleTokenSelection(explorationState.inspectedTokenIndex);
  if (status) {
    explorationState.setStatus(explorationState.inspectedTokenIndex, status);
    refreshTokenStates();
  }
});
document.getElementById("showHintsButton").addEventListener("click", showHints);
document.getElementById("compareButton").addEventListener("click", compareSelection);
document.getElementById("resetButton").addEventListener("click", resetExploration);
document.querySelectorAll(".sieve-btn[data-sieve]").forEach((button) => {
  button.addEventListener("click", () => setSieve(Number(button.dataset.sieve)));
});

const storedActivity = sessionContract.readActivity(window.sessionStorage);
if (storedActivity.status === "ok") renderActivity(storedActivity.activity);
else showEmptyState(storedActivity.status);
