"use strict";

const ANALYSIS_API_URL = "http://localhost:3000/analysis";
const MOCK_ANALYSIS_URL = "./mock/analysis-response-v0.json";
const DEFAULT_SIEVES = [1, 2, 3, 4, 5, 6, 7];

let analysisPackage = null;
let analysisOrigin = "Aucune analyse";
let activeSieve = 1;
let inspectedTokenIndex = null;
let hintsVisible = false;

const selectedTokenIndexes = new Set();
const tokenStatuses = Object.create(null);

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
const sourceTextInput = document.getElementById("sourceTextInput");
const sourceLanguage = document.getElementById("sourceLanguage");
const mediationLanguage = document.getElementById("mediationLanguage");
const analyzeButton = document.getElementById("analyzeButton");
const fallbackButton = document.getElementById("fallbackButton");
const apiStatus = document.getElementById("apiStatus");
const apiTokenCount = document.getElementById("apiTokenCount");
const apiEnrichmentCount = document.getElementById("apiEnrichmentCount");
const apiWarnings = document.getElementById("apiWarnings");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSieve(sieveId) {
  return analysisPackage?.sieves.find(sieve => sieve.id === sieveId) || null;
}

function getToken(tokenIndex) {
  return analysisPackage?.tokens.find(token => token.index === tokenIndex) || null;
}

function getTokenEnrichments(tokenIndex, sieveId = null) {
  const token = getToken(tokenIndex);
  if (!token) return [];
  if (sieveId === null) return token.enrichments;
  return token.enrichments.filter(item => item.sieve_id === sieveId);
}

function validateAnalysisPackage(data) {
  if (!data || data.contract_version !== "0.1") {
    throw new Error("Version de contrat JSON absente ou incompatible.");
  }
  if (typeof data.text !== "string" || !Array.isArray(data.tokens)) {
    throw new Error("Le paquet JSON ne contient pas de texte ou de tokens valides.");
  }
  if (!Array.isArray(data.sieves) || !Array.isArray(data.warnings)) {
    throw new Error("Le paquet JSON ne contient pas les tamis ou warnings attendus.");
  }

  let previousEnd = 0;
  data.tokens.forEach((token, position) => {
    if (token.index !== position) {
      throw new Error(`Index de token incohérent à la position ${position}.`);
    }
    if (!Number.isInteger(token.start) || !Number.isInteger(token.end)) {
      throw new Error(`Offsets absents pour le token ${position}.`);
    }
    if (token.start < previousEnd || token.end < token.start) {
      throw new Error(`Offsets non ordonnés pour le token ${position}.`);
    }
    if (data.text.slice(token.start, token.end) !== token.surface) {
      throw new Error(`Offset UTF-16 incohérent pour « ${token.surface} ».`);
    }
    if (!Array.isArray(token.enrichments)) {
      throw new Error(`Enrichissements invalides pour le token ${position}.`);
    }
    previousEnd = token.end;
  });

  return data;
}

function setApiStatus(state, message) {
  apiStatus.dataset.state = state;
  apiStatus.textContent = message;
}

function getComparisonLanguages() {
  return [...document.querySelectorAll('input[name="comparisonLanguage"]:checked')]
    .map(input => input.value)
    .filter(code => code !== sourceLanguage.value);
}

function clearLocalExplorationState() {
  inspectedTokenIndex = null;
  hintsVisible = false;
  selectedTokenIndexes.clear();
  Object.keys(tokenStatuses).forEach(key => delete tokenStatuses[key]);
}

function updateAnalysisSummary() {
  if (!analysisPackage) {
    apiTokenCount.textContent = "0";
    apiEnrichmentCount.textContent = "0";
    apiWarnings.classList.add("hidden");
    apiWarnings.textContent = "";
    return;
  }

  const enrichmentCount = analysisPackage.tokens.reduce(
    (total, token) => total + token.enrichments.length,
    0
  );
  apiTokenCount.textContent = String(analysisPackage.tokens.length);
  apiEnrichmentCount.textContent = String(enrichmentCount);

  if (analysisPackage.warnings.length) {
    apiWarnings.textContent = analysisPackage.warnings
      .map(warning => `${warning.code} : ${warning.message}`)
      .join("\n");
    apiWarnings.classList.remove("hidden");
  } else {
    apiWarnings.textContent = "";
    apiWarnings.classList.add("hidden");
  }
}

function applyAnalysisPackage(data, origin) {
  analysisPackage = validateAnalysisPackage(data);
  analysisOrigin = origin;
  clearLocalExplorationState();
  updateLanguageLabel();
  configureSieveButtons();
  buildTextFromTokens();
  updateAnalysisSummary();

  const requestedSieve = getSieve(activeSieve)?.status !== "unsupported"
    ? activeSieve
    : analysisPackage.sieves.find(sieve => sieve.status !== "unsupported")?.id;
  if (requestedSieve) setSieve(requestedSieve);
}

async function analyzeWithDicoIc() {
  const text = sourceTextInput.value;
  if (!text.trim()) {
    setApiStatus("offline", "Texte requis");
    globalFeedback.textContent = "Collez ou saisissez un texte avant de lancer l’analyse.";
    sourceTextInput.focus();
    return;
  }

  analyzeButton.disabled = true;
  fallbackButton.classList.add("hidden");
  setApiStatus("loading", "Analyse en cours…");
  globalFeedback.textContent = "Connexion à Dico-IC…";
  let apiUnavailable = true;

  try {
    const response = await fetch(ANALYSIS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        contract_version: "0.1",
        text,
        source_language: sourceLanguage.value,
        mediation_language: mediationLanguage.value,
        comparison_languages: getComparisonLanguages(),
        sieves: DEFAULT_SIEVES
      })
    });
    apiUnavailable = response.status >= 500;

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error?.message || `Réponse HTTP ${response.status}.`);
    }

    applyAnalysisPackage(data, "API Dico-IC");
    setApiStatus("online", "API Dico-IC connectée");
  } catch (error) {
    setApiStatus("offline", apiUnavailable ? "API indisponible" : "Requête refusée");
    fallbackButton.classList.toggle("hidden", !apiUnavailable);
    globalFeedback.textContent = apiUnavailable
      ? `Dico-IC indisponible : ${error.message}`
      : `Analyse refusée : ${error.message}`;
    globalFeedback.style.background = "#fff0f0";
    if (!analysisPackage) {
      textContainer.textContent = "L’API n’a pas répondu. Le mock de développement peut être chargé sans perdre le texte saisi.";
      currentHintsEl.textContent = "Aucune analyse chargée.";
      transformationsBox.textContent = "Aucun enrichissement disponible.";
      inspectionBox.textContent = "Une analyse doit être chargée avant l’inspection.";
    }
  } finally {
    analyzeButton.disabled = false;
  }
}

async function loadFallbackMock() {
  fallbackButton.disabled = true;
  setApiStatus("loading", "Chargement du mock…");

  try {
    const response = await fetch(MOCK_ANALYSIS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Réponse HTTP ${response.status}.`);
    const data = await response.json();
    applyAnalysisPackage(data, "Mock de développement");
    sourceTextInput.value = analysisPackage.text;
    sourceLanguage.value = analysisPackage.languages.source;
    mediationLanguage.value = analysisPackage.languages.mediation;
    setApiStatus("online", "Fallback mock chargé");
  } catch (error) {
    showMockLoadError(error);
    setApiStatus("offline", "Mock indisponible");
  } finally {
    fallbackButton.disabled = false;
  }
}

function updateLanguageLabel() {
  const label = document.getElementById("languagePairLabel");
  if (!label) return;
  const { source, mediation, comparison } = analysisPackage.languages;
  const compared = comparison.length ? ` · ${comparison.join(" / ").toUpperCase()}` : "";
  label.textContent = `${source.toUpperCase()} → ${mediation.toUpperCase()}${compared}`;
}

function showMockLoadError(error) {
  analysisPackage = null;
  textContainer.textContent =
    "Impossible de charger le mock JSON. Servez ce dossier avec un serveur HTTP local, puis réessayez.";
  globalFeedback.textContent = `Mock indisponible : ${error.message}`;
  globalFeedback.style.background = "#fff0f0";
  currentHintsEl.textContent = "Aucune analyse chargée.";
  transformationsBox.textContent = "Le prototype historique reste disponible séparément.";
  inspectionBox.textContent = "Le paquet JSON doit être chargé avant l’inspection.";
}

function configureSieveButtons() {
  for (let id = 1; id <= 7; id += 1) {
    const button = document.getElementById(`btn-sieve-${id}`);
    const sieve = getSieve(id);
    if (!button || !sieve) continue;

    button.textContent = `${id}. ${sieve.label}`;
    button.disabled = sieve.status === "unsupported";
    button.classList.toggle("coming-soon", sieve.status === "unsupported");
    button.title = sieve.status === "experimental" ? "Traitement expérimental" : "";
  }
}

function buildTextFromTokens() {
  textContainer.innerHTML = "";
  let cursor = 0;

  analysisPackage.tokens.forEach(token => {
    if (token.start > cursor) {
      textContainer.appendChild(
        document.createTextNode(analysisPackage.text.slice(cursor, token.start))
      );
    }

    if (token.kind === "word") {
      textContainer.appendChild(createInteractiveToken(token));
    } else {
      textContainer.appendChild(document.createTextNode(token.surface));
    }

    cursor = token.end;
  });

  if (cursor < analysisPackage.text.length) {
    textContainer.appendChild(
      document.createTextNode(analysisPackage.text.slice(cursor))
    );
  }

  updateSidebar();
  renderInspectionBox();
}

function createInteractiveToken(token) {
  const span = document.createElement("span");
  span.className = "word";
  span.dataset.tokenIndex = String(token.index);
  span.dataset.clean = token.normalized;
  span.appendChild(document.createTextNode(token.surface));

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  span.appendChild(tooltip);

  span.addEventListener("click", () => {
    inspectedTokenIndex = token.index;
    refreshTokenStates();
  });

  span.addEventListener("dblclick", event => {
    event.preventDefault();
    toggleTokenSelection(token.index);
  });

  span.addEventListener("mouseenter", () => {
    const enrichments = getTokenEnrichments(token.index, activeSieve);
    if (!enrichments.length) return;
    tooltip.textContent = enrichments.map(formatEnrichmentPlain).join("\n\n");
    span.classList.add("show-tooltip");
  });

  span.addEventListener("mouseleave", () => {
    span.classList.remove("show-tooltip");
  });

  return span;
}

function toggleTokenSelection(tokenIndex) {
  if (selectedTokenIndexes.has(tokenIndex)) {
    selectedTokenIndexes.delete(tokenIndex);
  } else {
    selectedTokenIndexes.add(tokenIndex);
  }
  updateSidebar();
  refreshTokenStates();
}

function formatPayload(payload = {}) {
  if (Array.isArray(payload.forms)) {
    return payload.forms.map(item => `${item.language.toUpperCase()} : ${item.form}`).join(" · ");
  }
  if (payload.original && payload.transformed) {
    return `${payload.original} → ${payload.transformed}`;
  }
  if (payload.source_form && payload.mediation_form) {
    return `${payload.source_form} → ${payload.mediation_form}`;
  }
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
    enrichment.caution ? `Prudence : ${enrichment.caution}` : ""
  ].filter(Boolean).join("\n");
}

function enrichmentHtml(enrichment) {
  return `<div class="multi-line">${escapeHtml(formatEnrichmentPlain(enrichment)).replaceAll("\n", "<br>")}</div>`;
}

function renderInspectionBox() {
  if (!analysisPackage) return;

  if (inspectedTokenIndex === null) {
    inspectionBox.innerHTML = `
      <div class="inspect-section">
        Clique sur un mot pour inspecter les enrichissements reçus.<br>
        Double-clique pour l’ajouter à ta sélection.
      </div>`;
    return;
  }

  const token = getToken(inspectedTokenIndex);
  if (!token) return;

  const status = tokenStatuses[token.index] || "none";
  const isSelected = selectedTokenIndexes.has(token.index);
  const activeEnrichments = getTokenEnrichments(token.index, activeSieve);
  const allEnrichments = getTokenEnrichments(token.index);

  const activeHtml = activeEnrichments.length
    ? activeEnrichments.map(enrichmentHtml).join("<hr>")
    : `<div class="multi-line">Aucun enrichissement reçu pour ce tamis.</div>`;

  const allHtml = allEnrichments.length
    ? allEnrichments.map(item => {
        const sieve = getSieve(item.sieve_id);
        return `<div class="multi-line"><strong>Tamis ${item.sieve_id} — ${escapeHtml(sieve?.label || "")}</strong><br>${escapeHtml(item.label)}</div>`;
      }).join("")
    : `<div class="multi-line">Aucun enrichissement reçu pour cette occurrence.</div>`;

  inspectionBox.innerHTML = `
    <div class="inspect-section">
      <div class="inspect-word">${escapeHtml(token.surface)}</div>
      <div class="inspect-muted">Token ${token.index} · Tamis actif : ${activeSieve}</div>
    </div>
    <div class="inspect-section">
      <h4>Action</h4>
      <button class="mini-btn secondary" data-action="toggle-select">
        ${isSelected ? "Retirer de la sélection" : "Ajouter à la sélection"}
      </button>
    </div>
    <div class="inspect-section">
      <h4>Statut du mot</h4>
      <div class="inspect-actions">
        <button class="mini-btn ghost ${status === "known" ? "active-status" : ""}" data-status="known">Compris</button>
        <button class="mini-btn ghost ${status === "doubt" ? "active-status" : ""}" data-status="doubt">Doute</button>
        <button class="mini-btn ghost ${status === "unknown" ? "active-status" : ""}" data-status="unknown">Inconnu</button>
      </div>
      <div class="inspect-muted" style="margin-top:8px;">Actuel : ${escapeHtml(getStatusLabel(status))}</div>
    </div>
    <div class="inspect-section">
      <h4>Enrichissement du tamis actif</h4>
      ${activeHtml}
    </div>
    <div class="inspect-section">
      <h4>Vue multi-tamis</h4>
      ${allHtml}
    </div>`;
}

function getStatusLabel(status) {
  if (status === "known") return "compris";
  if (status === "doubt") return "doute";
  if (status === "unknown") return "inconnu";
  return "non défini";
}

function refreshTokenStates() {
  document.querySelectorAll(".word[data-token-index]").forEach(element => {
    const tokenIndex = Number(element.dataset.tokenIndex);
    const status = tokenStatuses[tokenIndex] || "none";

    element.classList.toggle("selected", selectedTokenIndexes.has(tokenIndex));
    element.classList.toggle("inspected", inspectedTokenIndex === tokenIndex);
    element.classList.toggle("status-known", status === "known");
    element.classList.toggle("status-doubt", status === "doubt");
    element.classList.toggle("status-unknown", status === "unknown");
  });

  if (hintsVisible) applyHintVisuals();
  renderInspectionBox();
}

function updateSidebar() {
  if (!analysisPackage) return;

  const selectedTokens = [...selectedTokenIndexes]
    .sort((a, b) => a - b)
    .map(getToken)
    .filter(Boolean);

  const coherentTokens = selectedTokens.filter(token =>
    getTokenEnrichments(token.index, activeSieve).length > 0
  );

  selectedCountEl.textContent = String(selectedTokens.length);
  correctCountEl.textContent = String(coherentTokens.length);
  activeSieveLabel.textContent = String(activeSieve);
  selectedWordsEl.textContent = selectedTokens.length
    ? selectedTokens.map(token => token.surface).join(", ")
    : "Aucun mot sélectionné.";

  const sieve = getSieve(activeSieve);
  currentHintsEl.textContent = sieve
    ? `${sieve.description}\nÉtat du moteur : ${sieve.status}.`
    : "Tamis absent du paquet JSON.";

  if (selectedTokens.length === 0) {
    const warningCount = analysisPackage.warnings.length;
    const enrichmentCount = analysisPackage.tokens.reduce(
      (total, token) => total + token.enrichments.length,
      0
    );
    globalFeedback.textContent = `${analysisOrigin} · ${analysisPackage.tokens.length} tokens · ${enrichmentCount} enrichissement(s) · ${warningCount} avertissement(s).`;
    globalFeedback.style.background = "#f7fafc";
  } else if (coherentTokens.length < 5) {
    globalFeedback.textContent = "Bon début ! Continue l’exploration.";
    globalFeedback.style.background = "#eef4ff";
  } else {
    globalFeedback.textContent = "Très bonne exploration du texte !";
    globalFeedback.style.background = "#eafbe7";
  }

  updateTransformationsBox();
}

function updateTransformationsBox() {
  if (!analysisPackage) return;

  const rows = analysisPackage.tokens
    .filter(token => token.kind === "word")
    .flatMap(token => getTokenEnrichments(token.index, activeSieve)
      .map(enrichment => `${token.surface} → ${enrichment.label}${formatPayload(enrichment.payload) ? ` · ${formatPayload(enrichment.payload)}` : ""}`));

  transformationsBox.textContent = rows.length
    ? rows.join("\n")
    : "Aucun enrichissement reçu pour ce tamis.";
}

function clearHintVisuals() {
  document.querySelectorAll(".word").forEach(element => {
    element.classList.remove(
      "hint",
      "suffix",
      "pan-roman-match",
      "transform-strong",
      "transform-soft",
      "graphy-match",
      "morpho-match",
      "syntax-subject",
      "syntax-verb",
      "syntax-complement",
      "syntax-related",
      "show-tooltip"
    );
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
  document.querySelectorAll(".word[data-token-index]").forEach(element => {
    const enrichments = getTokenEnrichments(Number(element.dataset.tokenIndex), activeSieve);
    if (!enrichments.length) return;
    element.classList.add("hint");
    enrichments.forEach(item => element.classList.add(classForEnrichment(item)));
  });
}

function showHints() {
  if (!analysisPackage) return;
  hintsVisible = true;
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
    7: ["Préfixe ou suffixe repéré"]
  };

  legendBox.innerHTML = (labels[activeSieve] || [])
    .map(label => `<div class="legend-line"><span class="legend-sample legend-strong"></span><span>${escapeHtml(label)}</span></div>`)
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
    7: "Regarde les terminaisons et débuts de mots."
  };
  document.getElementById("microGuide").textContent = guides[activeSieve] || "";
}

function setSieve(number) {
  if (!analysisPackage) return;
  const sieve = getSieve(number);
  if (!sieve || sieve.status === "unsupported") return;

  activeSieve = number;
  for (let id = 1; id <= 7; id += 1) {
    document.getElementById(`btn-sieve-${id}`)?.classList.toggle("active", id === number);
  }

  sieveTitle.textContent = `${sieve.id}. ${sieve.label}`;
  sieveDescription.textContent = sieve.description;
  activeSieveLabel.textContent = String(number);
  updateLegend();
  updateMicroGuide();
  clearHintVisuals();
  if (hintsVisible) applyHintVisuals();
  updateSidebar();
  renderInspectionBox();
}

function checkProgress() {
  if (!analysisPackage) return;
  const selected = [...selectedTokenIndexes].map(getToken).filter(Boolean);
  const valid = selected.filter(token => getTokenEnrichments(token.index, activeSieve).length > 0);
  const invalid = selected.filter(token => getTokenEnrichments(token.index, activeSieve).length === 0);

  alert(
    `Tamis ${activeSieve}\n\n` +
    `Sélections cohérentes avec le paquet JSON : ${valid.length}\n` +
    `Sélections sans enrichissement reçu : ${invalid.length}\n\n` +
    "Ce feedback accompagne l’exploration ; il ne constitue pas une note."
  );
}

function resetAll() {
  inspectedTokenIndex = null;
  hintsVisible = false;
  selectedTokenIndexes.clear();
  Object.keys(tokenStatuses).forEach(key => delete tokenStatuses[key]);
  clearHintVisuals();
  updateSidebar();
  refreshTokenStates();
}

function toggleHelp() {
  document.getElementById("helpPanel").classList.toggle("hidden");
}

inspectionBox.addEventListener("click", event => {
  if (inspectedTokenIndex === null) return;

  const action = event.target.dataset.action;
  const status = event.target.dataset.status;

  if (action === "toggle-select") {
    toggleTokenSelection(inspectedTokenIndex);
  }
  if (status) {
    tokenStatuses[inspectedTokenIndex] = status;
    refreshTokenStates();
  }
});

analyzeButton.addEventListener("click", analyzeWithDicoIc);
fallbackButton.addEventListener("click", loadFallbackMock);
textContainer.textContent = "Préparez le texte et les langues, puis lancez l’analyse Dico-IC.";
inspectionBox.textContent = "Une analyse doit être chargée avant l’inspection.";
setApiStatus("idle", "API prête à être appelée");
