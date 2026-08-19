"use strict";

const ANALYSIS_API_URL = "/analysis";
const DEFAULT_SIEVES = [1, 2, 3, 4, 5, 6, 7];
const sessionContract = window.SevenSievesSession;

const sourceTextInput = document.getElementById("sourceTextInput");
const sourceLanguage = document.getElementById("sourceLanguage");
const mediationLanguage = document.getElementById("mediationLanguage");
const analyzeButton = document.getElementById("analyzeButton");
const openStudentButton = document.getElementById("openStudentButton");
const apiStatus = document.getElementById("apiStatus");
const teacherFeedback = document.getElementById("teacherFeedback");
const resultSummary = document.getElementById("resultSummary");
const warningList = document.getElementById("warningList");

let preparedActivity = null;

function setApiStatus(state, message) {
  apiStatus.dataset.state = state;
  apiStatus.textContent = message;
}

function getComparisonLanguages() {
  return [...document.querySelectorAll('input[name="comparisonLanguage"]:checked')]
    .map((input) => input.value)
    .filter((code) => code !== sourceLanguage.value);
}

function currentPreparation() {
  return {
    text: sourceTextInput.value,
    source_language: sourceLanguage.value,
    mediation_language: mediationLanguage.value,
    comparison_languages: getComparisonLanguages(),
  };
}

function resetPreparedResult() {
  preparedActivity = null;
  window.sessionStorage.removeItem(sessionContract.STORAGE_KEY);
  openStudentButton.disabled = true;
  resultSummary.hidden = true;
  warningList.hidden = true;
  warningList.textContent = "";
  setApiStatus("idle", "Prête pour une analyse");
  teacherFeedback.textContent = "Les choix sont modifiables jusqu’au lancement de l’analyse.";
}

function renderSummary(activity) {
  const summary = sessionContract.summarizeAnalysis(activity.analysis);
  document.getElementById("summaryTokens").textContent = String(summary.tokens);
  document.getElementById("summaryEnrichments").textContent = String(summary.enrichments);
  document.getElementById("summarySieves").textContent = summary.sieve_ids.length
    ? summary.sieve_ids.join(", ")
    : "Aucun";
  document.getElementById("summaryWarnings").textContent = String(summary.warnings);
  resultSummary.hidden = false;

  if (activity.analysis.warnings.length) {
    warningList.textContent = activity.analysis.warnings
      .map((warning) => `${warning.code} : ${warning.message}`)
      .join("\n");
    warningList.hidden = false;
  } else {
    warningList.hidden = true;
    warningList.textContent = "";
  }
}

async function analyzeWithDicoIc() {
  const preparation = currentPreparation();
  if (!preparation.text.trim()) {
    setApiStatus("error", "Texte requis");
    teacherFeedback.textContent = "Saisissez un texte avant de lancer l’analyse.";
    sourceTextInput.focus();
    return;
  }

  preparedActivity = null;
  window.sessionStorage.removeItem(sessionContract.STORAGE_KEY);
  openStudentButton.disabled = true;
  resultSummary.hidden = true;
  warningList.hidden = true;
  analyzeButton.disabled = true;
  setApiStatus("loading", "Analyse en cours…");
  teacherFeedback.textContent = "Dico-IC prépare le paquet complet de l’activité…";

  try {
    const response = await fetch(ANALYSIS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        contract_version: "0.1",
        ...preparation,
        text: preparation.text,
        sieves: DEFAULT_SIEVES,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || `Réponse HTTP ${response.status}.`);

    preparedActivity = sessionContract.createActivity(preparation, data);
    sessionContract.writeActivity(window.sessionStorage, preparedActivity);
    renderSummary(preparedActivity);
    openStudentButton.disabled = false;
    setApiStatus("ready", "Activité prête");
    teacherFeedback.textContent = "Le paquet complet est conservé pour cet onglet. Vous pouvez ouvrir la vue apprenant.";
  } catch (error) {
    setApiStatus("error", "Analyse impossible");
    teacherFeedback.textContent = `Dico-IC n’a pas préparé l’activité : ${error.message}`;
  } finally {
    analyzeButton.disabled = false;
  }
}

function restoreSessionIfAvailable() {
  const result = sessionContract.readActivity(window.sessionStorage);
  if (result.status !== "ok") return;
  preparedActivity = result.activity;
  sourceTextInput.value = preparedActivity.preparation.text;
  sourceLanguage.value = preparedActivity.preparation.source_language;
  mediationLanguage.value = preparedActivity.preparation.mediation_language;
  document.querySelectorAll('input[name="comparisonLanguage"]').forEach((input) => {
    input.checked = preparedActivity.preparation.comparison_languages.includes(input.value);
  });
  renderSummary(preparedActivity);
  openStudentButton.disabled = false;
  setApiStatus("ready", "Activité prête");
  teacherFeedback.textContent = "La dernière activité préparée dans cet onglet est disponible.";
}

analyzeButton.addEventListener("click", analyzeWithDicoIc);
openStudentButton.addEventListener("click", () => {
  if (preparedActivity) window.location.href = sessionContract.STUDENT_PAGE;
});
document.querySelectorAll("#sourceTextInput, #sourceLanguage, #mediationLanguage, input[name=\"comparisonLanguage\"]")
  .forEach((control) => control.addEventListener("input", resetPreparedResult));

restoreSessionIfAvailable();
