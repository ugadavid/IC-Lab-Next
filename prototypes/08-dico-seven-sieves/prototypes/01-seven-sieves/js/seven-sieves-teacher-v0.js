"use strict";

const ANALYSIS_API_URL = "/analysis";
const DEFAULT_SIEVES = [1, 2, 3, 4, 5, 6, 7];
const sessionContract = window.SevenSievesSession;
const lifecycleContract = window.SevenSievesAnalysisLifecycle;

const sourceTextInput = document.getElementById("sourceTextInput");
const sourceLanguage = document.getElementById("sourceLanguage");
const mediationLanguage = document.getElementById("mediationLanguage");
const comparisonControls = [...document.querySelectorAll('input[name="comparisonLanguage"]')];
const preparationControls = [sourceTextInput, sourceLanguage, mediationLanguage, ...comparisonControls];
const preparationCard = document.getElementById("preparationCard");
const analyzeButton = document.getElementById("analyzeButton");
const cancelAnalysisButton = document.getElementById("cancelAnalysisButton");
const openStudentButton = document.getElementById("openStudentButton");
const analysisProgress = document.getElementById("analysisProgress");
const analysisElapsed = document.getElementById("analysisElapsed");
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
  return comparisonControls
    .filter((input) => input.checked)
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

function clearPreparedActivity() {
  preparedActivity = null;
  sessionContract.invalidateActivity(window.sessionStorage);
  openStudentButton.disabled = true;
  resultSummary.hidden = true;
  warningList.hidden = true;
  warningList.textContent = "";
}

function setPreparationLocked(locked) {
  preparationControls.forEach((control) => { control.disabled = locked; });
  analyzeButton.disabled = locked;
  cancelAnalysisButton.hidden = !locked;
  analysisProgress.hidden = !locked;
  preparationCard.setAttribute("aria-busy", String(locked));
}

function invalidatePreparedResult() {
  clearPreparedActivity();
  lifecycle.invalidate();
  setApiStatus("invalidated", "Nouvelle analyse nécessaire");
  teacherFeedback.textContent = "Les paramètres ont changé. Relancez l’analyse pour préparer une nouvelle activité.";
}

function renderSummary(activity) {
  const summary = sessionContract.summarizeAnalysis(activity.analysis);
  document.getElementById("summaryTokens").textContent = String(summary.tokens);
  document.getElementById("summaryEnrichments").textContent = String(summary.enrichments);
  document.getElementById("summaryReadingAids").textContent = String(summary.pedagogical_enrichments);
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

function handleLifecycleTransition(state) {
  if (state === "running") {
    setPreparationLocked(true);
    setApiStatus("loading", "Analyse en cours…");
    teacherFeedback.textContent = "Analyse Dico-IC en cours… Aucun résultat précédent ne sera réutilisé.";
    return;
  }

  if (["success", "cancelled", "timed_out", "error"].includes(state)) setPreparationLocked(false);
  if (state === "cancelled") {
    setApiStatus("cancelled", "Analyse annulée");
    teacherFeedback.textContent = "Analyse annulée. Modifiez les paramètres ou relancez la préparation.";
  } else if (state === "timed_out") {
    setApiStatus("error", "Délai d’analyse dépassé");
    teacherFeedback.textContent = "L’analyse a dépassé le délai autorisé. Vérifiez le service Dico-IC puis relancez la préparation.";
  } else if (state === "error") {
    setApiStatus("error", "Analyse impossible");
    teacherFeedback.textContent = "Dico-IC n’a pas pu préparer l’activité. Vérifiez le service puis relancez l’analyse.";
  }
}

const lifecycle = lifecycleContract.createAnalysisLifecycle({
  timeoutMs: lifecycleContract.DEFAULT_ANALYSIS_TIMEOUT_MS,
  onTransition: handleLifecycleTransition,
  onElapsed: (seconds) => { analysisElapsed.textContent = `${seconds} s`; },
});

async function requestAnalysis(preparation, signal) {
  const response = await fetch(ANALYSIS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    signal,
    body: JSON.stringify({
      contract_version: "0.1",
      ...preparation,
      text: preparation.text,
      sieves: DEFAULT_SIEVES,
    }),
  });
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Réponse JSON invalide.", { cause: error });
  }
  if (!response.ok) throw new Error(`Réponse HTTP ${response.status}.`);
  return data;
}

function analyzeWithDicoIc() {
  if (lifecycle.isRunning()) return;
  const preparation = currentPreparation();
  if (!preparation.text.trim()) {
    setApiStatus("error", "Texte requis");
    teacherFeedback.textContent = "Saisissez un texte avant de lancer l’analyse.";
    sourceTextInput.focus();
    return;
  }

  clearPreparedActivity();
  analysisElapsed.textContent = "0 s";
  lifecycle.start(
    ({ signal }) => requestAnalysis(preparation, signal),
    {
      onSuccess(data) {
        const activity = sessionContract.createActivity(preparation, data);
        sessionContract.writeActivity(window.sessionStorage, activity);
        preparedActivity = activity;
        renderSummary(activity);
        openStudentButton.disabled = false;
        setApiStatus("ready", "Activité prête");
        teacherFeedback.textContent = "Le paquet complet de cette analyse est conservé pour cet onglet. Vous pouvez ouvrir la vue apprenant.";
      },
      onError(error) {
        clearPreparedActivity();
        console.error("Échec de l’analyse Seven Sieves", error);
      },
    },
  );
}

function restoreSessionIfAvailable() {
  const result = sessionContract.readActivity(window.sessionStorage);
  if (result.status !== "ok") {
    sessionContract.invalidateActivity(window.sessionStorage);
    return;
  }
  preparedActivity = result.activity;
  if (preparedActivity.preparation_signature === undefined) {
    preparedActivity.preparation_signature = sessionContract.preparationSignature(preparedActivity.preparation);
    sessionContract.writeActivity(window.sessionStorage, preparedActivity);
  }
  sourceTextInput.value = preparedActivity.preparation.text;
  sourceLanguage.value = preparedActivity.preparation.source_language;
  mediationLanguage.value = preparedActivity.preparation.mediation_language;
  comparisonControls.forEach((input) => {
    input.checked = preparedActivity.preparation.comparison_languages.includes(input.value);
  });
  renderSummary(preparedActivity);
  openStudentButton.disabled = false;
  setApiStatus("ready", "Activité prête");
  teacherFeedback.textContent = "La dernière activité préparée dans cet onglet est disponible.";
}

analyzeButton.addEventListener("click", analyzeWithDicoIc);
cancelAnalysisButton.addEventListener("click", () => lifecycle.cancel());
openStudentButton.addEventListener("click", () => {
  if (!preparedActivity) return;
  if (preparedActivity.preparation_signature !== sessionContract.preparationSignature(currentPreparation())) {
    invalidatePreparedResult();
    return;
  }
  window.location.href = sessionContract.STUDENT_PAGE;
});
preparationControls.forEach((control) => control.addEventListener("input", invalidatePreparedResult));
window.addEventListener("pagehide", () => lifecycle.dispose());

restoreSessionIfAvailable();
