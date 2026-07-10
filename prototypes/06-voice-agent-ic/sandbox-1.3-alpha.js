const manifestUrl = "data/proto06-manifests/climate-roundtable-demo.json";
const hubSandboxAccessBaseUrl = "http://127.0.0.1:8790/api/admin/proto06/sandbox/access";

const languageLabels = {
  es: "espagnol",
  it: "italien",
  ptBr: "portugais du Bresil"
};

const characterContexts = {
  clara: "Valencia / chaleur estivale",
  marco: "Italie / secheresse plus frequente",
  ana: "Bresil / pluies plus fortes"
};

const forbiddenData = [
  "texte apprenant",
  "launchToken",
  "session",
  "run complet",
  "run_events",
  "cle API",
  ".env",
  "donnees personnelles",
  "manifest complet si un resume suffit"
];

const state = {
  manifest: null,
  selectedCharacterId: "clara",
  access: {
    status: "checking",
    label: "Verification en attente",
    detail: "Recherche d'une preuve temporaire Hub",
    providerEnabled: false,
    generationEnabled: false
  }
};

const elements = {
  manifestStatus: document.querySelector("#manifestStatus"),
  manifestName: document.querySelector("#manifestName"),
  manifestThemes: document.querySelector("#manifestThemes"),
  manifestInstruction: document.querySelector("#manifestInstruction"),
  manifestQuestion: document.querySelector("#manifestQuestion"),
  manifestCharacters: document.querySelector("#manifestCharacters"),
  manifestLanguages: document.querySelector("#manifestLanguages"),
  characterButtons: document.querySelector("#characterButtons"),
  characterImage: document.querySelector("#characterImage"),
  characterName: document.querySelector("#characterName"),
  characterMeta: document.querySelector("#characterMeta"),
  characterContext: document.querySelector("#characterContext"),
  scriptedTurnText: document.querySelector("#scriptedTurnText"),
  transparentWords: document.querySelector("#transparentWords"),
  allowedData: document.querySelector("#allowedData"),
  forbiddenData: document.querySelector("#forbiddenData"),
  comparisonScripted: document.querySelector("#comparisonScripted"),
  accessTitle: document.querySelector("#access-title"),
  accessStatusText: document.querySelector("#accessStatusText"),
  accessStateLabel: document.querySelector("#accessStateLabel"),
  accessStateDetail: document.querySelector("#accessStateDetail"),
  accessProviderState: document.querySelector("#accessProviderState"),
  accessGenerationState: document.querySelector("#accessGenerationState"),
  accessGenerationNote: document.querySelector("#accessGenerationNote")
};

function setText(node, value) {
  node.textContent = value || "-";
}

function languageLabel(languageId) {
  return languageLabels[languageId] || languageId || "-";
}

function selectedCharacter() {
  return (state.manifest?.characters || []).find((character) => character.id === state.selectedCharacterId) || null;
}

function selectedStep() {
  return (state.manifest?.meeting?.steps || []).find((step) => step.characterId === state.selectedCharacterId) || null;
}

function selectedAllowedData() {
  const manifest = state.manifest;
  const character = selectedCharacter();
  const step = selectedStep();
  const scenario = manifest?.pedagogicalScenario || {};
  return {
    sourceManifestId: manifest?.manifestId || "",
    theme: (manifest?.climateThemes || []).join(", "),
    objectifPedagogique: scenario.pedagogicalGoal || "",
    questionCommune: scenario.commonQuestion || "",
    characterId: character?.id || "",
    langueCible: languageLabel(character?.languageId),
    contexteCourt: characterContexts[character?.id] || "",
    contraintesLongueur: "tour oral court, environ 20 a 30 mots",
    motsTransparentsSouhaites: (step?.transparentWords || []).join(", ")
  };
}

function renderDefinitionList(container, data) {
  container.replaceChildren();
  Object.entries(data).forEach(([key, value]) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = key;
    description.textContent = value || "-";
    row.append(term, description);
    container.append(row);
  });
}

function sandboxAccessIdFromUrl() {
  return new URLSearchParams(window.location.search).get("sandboxAccessId") || "";
}

function setAccessState(nextState) {
  state.access = {
    ...state.access,
    ...nextState,
    providerEnabled: Boolean(nextState.providerEnabled),
    generationEnabled: false
  };
  renderAccessState();
}

function renderAccessState() {
  const access = state.access;
  elements.accessStateLabel.textContent = access.label;
  elements.accessStateDetail.textContent = access.detail;
  elements.accessProviderState.textContent = `providerEnabled: ${access.providerEnabled ? "true" : "false"}`;
  elements.accessGenerationState.textContent = "generationEnabled: false";
  elements.accessGenerationNote.textContent = access.generationNote || "Generation IA desactivee : provider non connecte.";
  elements.accessGenerationNote.className = `access-generation-note access-${access.status}`;
  elements.accessTitle.textContent = access.title || "Verification par IC-Hub";
  elements.accessStatusText.textContent = access.message || "Statut lu depuis IC-Hub si une session admin est disponible.";
}

function accessMessageFromStatus(status) {
  if (status === 401) {
    return {
      status: "blocked",
      title: "Connexion Hub requise",
      label: "Connexion Hub requise",
      detail: "Le Hub demande une session valide pour verifier le role.",
      message: "Connectez-vous au Hub avec un compte admin, puis revenez sur cette sandbox. Aucun token n'est affiche ici.",
      generationNote: "Generation IA desactivee : connexion Hub requise."
    };
  }
  if (status === 403) {
    return {
      status: "blocked",
      title: "Acces sandbox refuse",
      label: "Acces sandbox expire ou invalide",
      detail: "IC-Hub refuse la preuve temporaire.",
      message: "Demandez un nouveau lancement depuis l'administration IC-Hub. La sandbox reste en lecture seule et sans provider.",
      generationNote: "Generation IA desactivee : preuve temporaire invalide."
    };
  }
  return {
    status: "blocked",
    title: "Statut Hub non verifie",
    label: "Acces sandbox expire ou invalide",
    detail: `IC-Hub refuse la preuve temporaire (${status}).`,
    message: "Demandez un nouveau lancement depuis l'administration IC-Hub. La sandbox reste en lecture seule et sans provider.",
    generationNote: "Generation IA desactivee : preuve temporaire invalide."
  };
}

async function loadHubAccessStatus() {
  const sandboxAccessId = sandboxAccessIdFromUrl();
  if (!sandboxAccessId) {
    setAccessState({
      status: "missing-proof",
      title: "Acces non verifie",
      label: "Preuve temporaire Hub absente",
      detail: "Ouvrez la sandbox depuis IC-Hub pour confirmer l'acces admin.",
      message: "Aucun sandboxAccessId n'est present dans l'URL. Le token de session Hub principal n'est jamais transmis a Proto06.",
      generationNote: "Generation IA desactivee : preuve temporaire absente.",
      providerEnabled: false
    });
    return;
  }

  try {
    const response = await fetch(`${hubSandboxAccessBaseUrl}/${encodeURIComponent(sandboxAccessId)}`, {
      method: "GET",
      cache: "no-store"
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.allowed === true && body.role === "admin") {
      setAccessState({
        status: "confirmed",
        title: "Acces admin confirme",
        label: "Acces admin confirme par IC-Hub",
        detail: `Sandbox: ${body.sandbox || "proto06-v1.3-alpha"} - preuve temporaire valide`,
        message: "IC-Hub confirme le role admin via une preuve temporaire. Cette version garde malgre tout la generation IA desactivee.",
        generationNote: "Generation IA desactivee : provider non connecte.",
        providerEnabled: body.providerEnabled === true
      });
      return;
    }
    setAccessState(accessMessageFromStatus(response.status));
  } catch (_error) {
    setAccessState({
      status: "network-error",
      title: "Hub indisponible",
      label: "Hub indisponible ou statut non verifiable",
      detail: "Impossible de joindre le pont admin-only IC-Hub.",
      message: "Verifiez que IC-Hub est lance sur http://127.0.0.1:8790. La sandbox reste sans provider.",
      generationNote: "Generation IA desactivee : Hub indisponible.",
      providerEnabled: false
    });
  }
}

function renderForbiddenData() {
  elements.forbiddenData.replaceChildren();
  forbiddenData.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    elements.forbiddenData.append(li);
  });
}

function renderManifestSummary() {
  const manifest = state.manifest;
  const scenario = manifest?.pedagogicalScenario || {};
  setText(elements.manifestName, manifest?.title);
  setText(elements.manifestThemes, (manifest?.climateThemes || []).join(", "));
  setText(elements.manifestInstruction, scenario.instruction);
  setText(elements.manifestQuestion, scenario.commonQuestion);
  setText(elements.manifestCharacters, (manifest?.characters || []).map((character) => character.displayName).join(", "));
  setText(elements.manifestLanguages, (manifest?.targetLanguages || []).map(languageLabel).join(", "));
}

function renderCharacterButtons() {
  elements.characterButtons.replaceChildren();
  (state.manifest?.characters || []).forEach((character) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = character.displayName || character.id;
    button.setAttribute("aria-pressed", String(character.id === state.selectedCharacterId));
    button.addEventListener("click", () => {
      state.selectedCharacterId = character.id;
      renderSandbox();
    });
    elements.characterButtons.append(button);
  });
}

function renderSelectedCharacter() {
  const character = selectedCharacter();
  const step = selectedStep();
  if (!character) return;
  elements.characterImage.src = character.image || "";
  elements.characterImage.alt = character.displayName || "";
  setText(elements.characterName, character.displayName || character.id);
  setText(elements.characterMeta, `${languageLabel(character.languageId)} | ${character.role || "-"}`);
  setText(elements.characterContext, `Contexte court : ${characterContexts[character.id] || "-"}`);
  setText(elements.scriptedTurnText, step?.text);
  setText(elements.comparisonScripted, step?.text);
  setText(elements.transparentWords, `Mots transparents : ${(step?.transparentWords || []).join(", ") || "-"}`);
}

function renderSandbox() {
  renderManifestSummary();
  renderCharacterButtons();
  renderSelectedCharacter();
  renderDefinitionList(elements.allowedData, selectedAllowedData());
}

async function loadManifest() {
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Manifest indisponible (${response.status})`);
    }
    state.manifest = await response.json();
    elements.manifestStatus.textContent = "Manifest local charge comme contexte de reference. Aucun JSON complet n'est affiche.";
    renderSandbox();
  } catch (error) {
    elements.manifestStatus.textContent = `Erreur de chargement du manifest local : ${error.message}`;
  }
}

renderForbiddenData();
renderAccessState();
loadHubAccessStatus();
loadManifest();
