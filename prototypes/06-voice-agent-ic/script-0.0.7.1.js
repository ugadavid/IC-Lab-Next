function getCatalogItem(catalog, id, label) {
  const item = catalog[id];

  if (!item) {
    throw new Error(`${label} introuvable : ${id}`);
  }

  return item;
}

function buildParticipantStep(step) {
  const character = getCatalogItem(characterCatalog, step.characterId, "Personnage");
  const language = getCatalogItem(languageCatalog, character.languageId, "Langue");
  const place = getCatalogItem(placeCatalog, character.placeId, "Lieu");

  return {
    id: character.id,
    characterId: character.id,
    name: character.displayName,
    role: place.country,
    detail: `Témoignage en ${language.label.toLowerCase()}`,
    lang: character.voiceProfile?.preferredLang || language.speechLang,
    languageLabel: language.label,
    avatarClass: `avatar-${character.id}`,
    image: character.image,
    background: place.background,
    text: step.text,
    transparentWords: step.transparentWords,
    next: step.next,
    character,
    language,
    place
  };
}

function buildScenario(scenarioId) {
  const source = getCatalogItem(scenarioCatalog, scenarioId, "Scénario");
  const participants = source.steps.map(buildParticipantStep);

  return {
    ...source,
    participants
  };
}

function getStoredSelection() {
  try {
    const stored = JSON.parse(localStorage.getItem("proto06SelectedCharacters"));

    if (Array.isArray(stored)) {
      const validIds = stored.filter((id) => characterCatalog[id]);

      if (validIds.length >= 2) {
        return validIds.slice(0, 4);
      }
    }
  } catch (error) {
    console.warn("Sélection de rencontre ignorée.", error);
  }

  return [...scenarioCatalog[activeScenarioId].participants];
}

function getScenarioStepForCharacter(characterId) {
  const source = getCatalogItem(scenarioCatalog, activeScenarioId, "Scénario");
  return source.steps.find((step) => step.characterId === characterId);
}

function getTestimonyForCharacter(characterId, pedagogicalScenarioId) {
  const variants = testimonyVariantCatalog[characterId] || {};
  const selectedVariant = variants[pedagogicalScenarioId];
  const globalVariant = variants.globalUnderstanding;
  const sourceStep = getScenarioStepForCharacter(characterId);

  if (selectedVariant) {
    return {
      ...selectedVariant,
      fallbackUsed: false,
      fallbackSource: "variante exacte"
    };
  }

  if (globalVariant) {
    return {
      ...globalVariant,
      fallbackUsed: pedagogicalScenarioId !== "globalUnderstanding",
      fallbackSource: "globalUnderstanding"
    };
  }

  if (sourceStep) {
    return {
      text: sourceStep.text,
      transparentWords: sourceStep.transparentWords,
      tags: [],
      translationFr: "",
      fallbackUsed: true,
      fallbackSource: "scenarioCatalog"
    };
  }

  return {
    text: `Témoignage à compléter pour ${characterId}.`,
    transparentWords: "témoignage à compléter",
    tags: ["à compléter"]
  };
}

function buildParticipantStepFromSelection(characterId, index, selectedCharacterIds, pedagogicalScenarioId = activePedagogicalScenarioId) {
  const character = getCatalogItem(characterCatalog, characterId, "Personnage");
  const language = getCatalogItem(languageCatalog, character.languageId, "Langue");
  const place = getCatalogItem(placeCatalog, character.placeId, "Lieu");
  const testimony = getTestimonyForCharacter(characterId, pedagogicalScenarioId);
  const sourceStep = testimony;
  const nextId = selectedCharacterIds[index + 1];
  const nextCharacter = nextId ? getCatalogItem(characterCatalog, nextId, "Personnage") : null;
  const nextLanguage = nextCharacter
    ? getCatalogItem(languageCatalog, nextCharacter.languageId, "Langue")
    : null;

  return {
    id: character.id,
    characterId: character.id,
    name: character.displayName,
    role: place.country,
    detail: `Témoignage en ${language.label.toLowerCase()}`,
    lang: character.voiceProfile?.preferredLang || language.speechLang,
    languageLabel: language.label,
    avatarClass: `avatar-${character.id}`,
    image: character.image,
    background: place.background,
    text:
      sourceStep?.text ||
      `Témoignage à compléter pour ${character.displayName}.`,
    transparentWords:
      sourceStep?.transparentWords ||
      character.tags.slice(0, 3).join(", ") ||
      language.label,
    text: testimony.text,
    transparentWords: testimony.transparentWords,
    testimonyTags: testimony.tags || [],
    translationFr: testimony.translationFr || "",
    fallbackUsed: Boolean(testimony.fallbackUsed),
    fallbackSource: testimony.fallbackSource || "non renseigné",
    next: nextCharacter
      ? `Ensuite : ${nextCharacter.displayName} témoignera en ${nextLanguage.label.toLowerCase()}.`
      : "Ensuite : à vous de reconstruire les points communs.",
    character,
    language,
    place
  };
}

function buildScenarioFromSelection(selectedCharacterIds) {
  const source = getCatalogItem(scenarioCatalog, activeScenarioId, "Scénario");
  const participantIds = selectedCharacterIds.filter((id) => characterCatalog[id]).slice(0, 4);
  const participantBundles = participantIds.map((id) => {
    const character = getCatalogItem(characterCatalog, id, "Personnage");
    const place = getCatalogItem(placeCatalog, character.placeId, "Lieu");
    return { character, place };
  });
  const participantNames = participantBundles.map(({ character }) => character.displayName);
  const climateThemes = participantBundles.map(({ place }) => place.climateTheme);
  const keywords = participantBundles.flatMap(({ character, place }) => [
    character.displayName,
    ...character.tags,
    place.climateTheme
  ]);

  return {
    ...source,
    title: "Rencontre REPLI4C composée",
    description:
      "Rencontre expérimentale construite à partir des personnages sélectionnés dans le catalogue.",
    participants: participantIds.map((characterId, index) =>
      buildParticipantStepFromSelection(
        characterId,
        index,
        participantIds,
        activePedagogicalScenarioId
      )
    ),
    commonQuestion: `Question commune : quels changements avez-vous compris et quels points communs reliez-vous entre ${participantNames.join(", ")} ?`,
    fallbackUtterance: `Je comprends des changements liés à ${climateThemes.join(", ")}. Le point commun est le changement climatique vécu dans différents lieux.`,
    analysis: {
      ...source.analysis,
      keywords: [
        ...new Set(
          [...source.analysis.keywords, ...keywords]
            .join(" ")
            .split(/\s+/)
            .map((word) => word.toLowerCase())
            .filter(Boolean)
        )
      ]
    }
  };
}

function getStoredPedagogicalScenarioId() {
  const stored = localStorage.getItem("proto06SelectedPedagogicalScenario");

  if (stored && pedagogicalScenarioCatalog[stored]) {
    return stored;
  }

  return activePedagogicalScenarioId;
}

function buildScenarioFromPedagogicalSelection(selectedCharacterIds, pedagogicalScenarioId) {
  const source = getCatalogItem(scenarioCatalog, activeScenarioId, "Scénario");
  const pedagogicalScenario = getCatalogItem(
    pedagogicalScenarioCatalog,
    pedagogicalScenarioId,
    "Scénario pédagogique"
  );
  const participantIds = selectedCharacterIds.filter((id) => characterCatalog[id]).slice(0, 4);
  const participantBundles = participantIds.map((id) => {
    const character = getCatalogItem(characterCatalog, id, "Personnage");
    const place = getCatalogItem(placeCatalog, character.placeId, "Lieu");
    return { character, place };
  });
  const climateThemes = participantBundles.map(({ place }) => place.climateTheme);
  const keywords = participantBundles.flatMap(({ character, place }) => [
    character.displayName,
    ...character.tags,
    place.climateTheme,
    ...pedagogicalScenario.observationFocus
  ]);

  return {
    ...source,
    title: `Rencontre REPLI4C - ${pedagogicalScenario.shortTitle}`,
    description:
      "Rencontre expérimentale construite à partir d'un scénario pédagogique et de personnages sélectionnés.",
    instruction: pedagogicalScenario.instruction,
    pedagogicalScenario,
    participants: participantIds.map((characterId, index) =>
      buildParticipantStepFromSelection(
        characterId,
        index,
        participantIds,
        pedagogicalScenarioId
      )
    ),
    commonQuestion: `Question commune : ${pedagogicalScenario.commonQuestion}`,
    fallbackUtterance: `Je comprends des changements liés à ${climateThemes.join(", ")}. Pour l'activité "${pedagogicalScenario.shortTitle}", je peux répondre à partir de ces indices.`,
    initialObservation: pedagogicalScenario.initialObservation,
    analysis: {
      ...source.analysis,
      keywords: [
        ...new Set(
          [...source.analysis.keywords, ...keywords]
            .join(" ")
            .split(/\s+/)
            .map((word) => word.toLowerCase())
            .filter(Boolean)
        )
      ],
      response:
        "Merci. Vous mobilisez les témoignages pour répondre à la tâche choisie et construire une compréhension partagée.",
      observation: pedagogicalScenario.initialObservation
    },
    partial: {
      response:
        "On peut repartir des personnes, des lieux, des mots proches et de la consigne choisie pour formuler une réponse partielle mais utile.",
      observation: pedagogicalScenario.initialObservation
    }
  };
}

const selectedCharacterIds = getStoredSelection();
const selectedPedagogicalScenarioId = getStoredPedagogicalScenarioId();
const stagedScenario = buildScenarioFromPedagogicalSelection(
  selectedCharacterIds,
  selectedPedagogicalScenarioId
);

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const startButton = document.querySelector("#startButton");
const speakButton = document.querySelector("#speakButton");
const replayButton = document.querySelector("#replayButton");
const bubbleReplayButton = document.querySelector("#bubbleReplayButton");
const pauseButton = document.querySelector("#pauseButton");
const resumeButton = document.querySelector("#resumeButton");
const stopButton = document.querySelector("#stopButton");
const instructionText = document.querySelector("#instructionText");
const fallbackInput = document.querySelector("#fallbackInput");
const speechStatus = document.querySelector("#speechStatus");
const agentText = document.querySelector("#agentText");
const speakerLang = document.querySelector("#speakerLang");
const activeBadge = document.querySelector("#activeBadge");
const activePortrait = document.querySelector("#activePortrait");
const progressText = document.querySelector("#progressText");
const progressDots = document.querySelector("#progressDots");
const observationGrid = document.querySelector("#observationGrid");
const historyList = document.querySelector("#historyList");
const participantList = document.querySelector("#participantList");
const stepList = document.querySelector("#stepList");
const meetingStatus = document.querySelector("#meetingStatus");
const nextIcon = document.querySelector("#nextIcon");
const answerCount = document.querySelector("#answerCount");
const activeBackground = document.querySelector("#activeBackground");
const heroScene = document.querySelector(".hero-scene");
const collectiveCharacters = [
  document.querySelector("#collectiveCharacter1"),
  document.querySelector("#collectiveCharacter2"),
  document.querySelector("#collectiveCharacter3"),
  document.querySelector("#collectiveCharacter4")
];

let recognition = null;
let isListening = false;
let manualTextDirty = false;
let lastSpokenText = "";
let lastSpokenLang = "es-ES";
let lastSpokenTitle = "Rencontre";
let sequenceRunning = false;
let activeStep = 0;
let activeParticipantId = "";
let currentSequenceIndex = 0;
let currentSpeechToken = 0;
let currentNormalResolve = null;
let playbackState = "idle";
let interruptionReason = "";
const debugEnabled = localStorage.getItem("proto06Debug") === "1";
let debugPanel = null;

window.proto06Debug = function proto06Debug(enable = true) {
  if (enable) {
    localStorage.setItem("proto06Debug", "1");
  } else {
    localStorage.removeItem("proto06Debug");
  }

  location.reload();
};

const observationLabels = {
  transparent: "Mots transparents",
  clarification: "Construction du sens",
  reformulation: "Comparaison incarnée",
  partial: "Compréhension partielle"
};

function getActiveDebugParticipant() {
  if (activeParticipantId === "collective") {
    return null;
  }

  return stagedScenario.participants.find(
    (participant) => participant.id === activeParticipantId
  ) || stagedScenario.participants[activeStep] || null;
}

function getDebugState() {
  const participant = getActiveDebugParticipant();

  return {
    pedagogicalScenario: stagedScenario.pedagogicalScenario,
    selectedCharacters: stagedScenario.participants.map((item) => item.id),
    activeParticipantId: activeParticipantId || "aucun",
    activeStep,
    totalSteps: stagedScenario.participants.length + 1,
    participant,
    commonQuestion: stagedScenario.commonQuestion
  };
}

function ensureDebugPanel() {
  if (!debugEnabled) {
    return null;
  }

  if (debugPanel) {
    return debugPanel;
  }

  debugPanel = document.createElement("aside");
  debugPanel.className = "debug-panel is-collapsed";
  debugPanel.innerHTML = `
    <button class="debug-toggle" type="button" aria-expanded="false">Debug IC-Lab</button>
    <div class="debug-content"></div>
  `;
  document.body.append(debugPanel);

  debugPanel.querySelector(".debug-toggle").addEventListener("click", () => {
    const collapsed = debugPanel.classList.toggle("is-collapsed");
    debugPanel
      .querySelector(".debug-toggle")
      .setAttribute("aria-expanded", String(!collapsed));
  });

  return debugPanel;
}

function renderDebugPanel() {
  const panel = ensureDebugPanel();

  if (!panel) {
    return;
  }

  const state = getDebugState();
  const participant = state.participant;
  const content = panel.querySelector(".debug-content");

  content.innerHTML = `
    <dl>
      <dt>Scénario pédagogique</dt>
      <dd>${state.pedagogicalScenario?.id || "non défini"} · ${state.pedagogicalScenario?.shortTitle || ""}</dd>
      <dt>Personnages sélectionnés</dt>
      <dd>${state.selectedCharacters.join(", ")}</dd>
      <dt>Personnage actif</dt>
      <dd>${participant ? participant.name : state.activeParticipantId}</dd>
      <dt>Langue active</dt>
      <dd>${participant ? participant.languageLabel : "réflexion collective"}</dd>
      <dt>speechLang demandé</dt>
      <dd>${participant ? participant.lang : languageCatalog.fr.speechLang}</dd>
      <dt>Lieu / pays</dt>
      <dd>${participant ? `${participant.place.label} / ${participant.place.country}` : "collectif"}</dd>
      <dt>Témoignage original</dt>
      <dd>${participant ? participant.text : "Question commune"}</dd>
      <dt>Traduction française</dt>
      <dd>${participant?.translationFr || "Non renseignée pour ce moment."}</dd>
      <dt>Mots transparents</dt>
      <dd>${participant?.transparentWords || "n/a"}</dd>
      <dt>Tags discursifs</dt>
      <dd>${participant?.testimonyTags?.join(", ") || "n/a"}</dd>
      <dt>Fallback</dt>
      <dd>${participant ? `${participant.fallbackUsed ? "oui" : "non"} (${participant.fallbackSource})` : "n/a"}</dd>
      <dt>Étape active</dt>
      <dd>${state.activeStep + 1} / ${state.totalSteps}</dd>
      <dt>Question commune</dt>
      <dd>${state.commonQuestion}</dd>
    </dl>
  `;
}

function setStatus(message) {
  speechStatus.textContent = message;
}

function setPlaybackState(state) {
  playbackState = state;
  const hasMoment = Boolean(lastSpokenText);
  const isSpeaking = state === "speaking";
  const isPaused = state === "paused";

  replayButton.disabled = !hasMoment;
  bubbleReplayButton.disabled = !hasMoment;
  pauseButton.disabled = !isSpeaking;
  resumeButton.disabled = !isPaused;
  stopButton.disabled = !isSpeaking && !isPaused;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function addHistory(speaker, text) {
  const item = document.createElement("li");
  const speakerLabel = document.createElement("span");
  const content = document.createElement("p");

  speakerLabel.className = "speaker";
  speakerLabel.textContent = speaker;
  content.textContent = text;

  item.append(speakerLabel, content);
  historyList.prepend(item);
}

function renderObservation(observation) {
  observationGrid.innerHTML = "";

  Object.entries(observationLabels).forEach(([kind, label]) => {
    const signal = document.createElement("article");
    const title = document.createElement("strong");
    const description = document.createElement("p");

    signal.className = "signal";
    signal.dataset.kind = kind;
    title.textContent = label;
    description.textContent = observation[kind];

    signal.append(title, description);
    observationGrid.append(signal);
  });
}

function getSteps() {
  return [
    ...stagedScenario.participants.map((participant) => ({
      id: participant.id,
      title: `${participant.name} - ${participant.role}`,
      detail: participant.detail
    })),
    {
      id: "collective",
      title: "Question commune",
      detail: "Votre reconstruction"
    }
  ];
}

function renderSteps() {
  stepList.innerHTML = "";

  getSteps().forEach((step, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    const lock = document.createElement("span");

    item.className = "step-item";
    item.classList.toggle("is-active", index === activeStep);
    number.className = "step-number";
    number.textContent = String(index + 1);
    copy.className = "step-copy";
    title.textContent = step.title;
    detail.textContent = step.detail;
    lock.className = "step-lock";
    lock.textContent = index < activeStep ? "✓" : index === activeStep ? "•" : "◼";

    copy.append(title, detail);
    item.append(number, copy, lock);
    stepList.append(item);
  });
}

function renderProgress() {
  progressDots.innerHTML = "";
  const totalSteps = getSteps().length;
  progressText.textContent = `${Math.min(activeStep + 1, totalSteps)} / ${totalSteps}`;

  getSteps().forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = "progress-dot";
    dot.classList.toggle("is-active", index === activeStep);
    progressDots.append(dot);
  });
}

function getParticipantState(participant) {
  if (!activeParticipantId) {
    return "attend";
  }

  if (activeParticipantId === "collective") {
    return "reflection";
  }

  return participant.id === activeParticipantId ? "speaking" : "listening";
}

function stateLabel(state) {
  const labels = {
    speaking: "parle",
    listening: "écoute",
    attend: "attend",
    reflection: "réflexion"
  };

  return labels[state];
}

function renderParticipants() {
  participantList.innerHTML = "";

  stagedScenario.participants.forEach((participant) => {
    const state = getParticipantState(participant);
    const card = document.createElement("article");
    const avatar = document.createElement("div");
    const initial = document.createElement("span");
    const copy = document.createElement("div");
    const name = document.createElement("strong");
    const detail = document.createElement("span");

    card.className = "person-mini";
    card.classList.toggle("is-speaking", state === "speaking");
    card.classList.toggle("is-listening", state === "listening");
    card.classList.toggle("is-thinking", state === "reflection");

    avatar.className = `mini-avatar ${participant.avatarClass}`;
    initial.textContent = participant.name.charAt(0);
    avatar.append(initial);

    copy.className = "mini-copy";
    name.textContent = `${participant.name} - ${participant.role}`;
    detail.textContent = `${participant.languageLabel} | ${stateLabel(state)}`;

    copy.append(name, detail);
    card.append(avatar, copy);
    participantList.append(card);
  });
}

function setActiveVisual(participant) {
  const isCollective = participant.id === "collective";

  activeParticipantId = participant.id;

  if (heroScene) {
    heroScene.classList.toggle("is-collective", isCollective);
  }

  activeBadge.textContent = isCollective
    ? "Question commune"
    : `${participant.name} - ${participant.role}`;
  speakerLang.textContent = isCollective
    ? "Réflexion collective"
    : `${participant.languageLabel} | indices : ${participant.transparentWords}`;

  const activeCharacter = document.querySelector("#activeCharacter");

  if (activeCharacter && activeBackground) {
    if (isCollective) {
      activeCharacter.alt = "";
      activeCharacter.style.opacity = "0";
      activeBackground.src = stagedScenario.participants[0].background;
    } else {
      activeCharacter.src = participant.image;
      activeCharacter.alt = participant.name;
      activeBackground.src = participant.background;
      activeCharacter.style.opacity = "1";
    }
  }

  activePortrait.className = `active-portrait ${isCollective ? "avatar-collective" : participant.avatarClass}`;
  nextIcon.textContent = isCollective ? "💬" : "●";
  meetingStatus.textContent = isCollective ? stagedScenario.commonQuestion : participant.next;

  renderParticipants();
  renderSteps();
  renderProgress();
  renderDebugPanel();
}

function renderCollectiveCharacters() {
  collectiveCharacters.forEach((image, index) => {
    const participant = stagedScenario.participants[index];

    if (!image) {
      return;
    }

    image.className = `collective-character collective-slot-${index + 1}`;

    if (!participant) {
      image.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      return;
    }

    image.hidden = false;
    image.src = participant.image;
    image.alt = participant.name;
    image.classList.add(`collective-${participant.id}`);
  });
}

function interruptNormalPlayback(reason = "manual") {
  if (currentNormalResolve) {
    interruptionReason = reason;
    const resolve = currentNormalResolve;
    currentNormalResolve = null;
    resolve(false);
  }
}

function speakText(text, lang, title, options = {}) {
  const { advanceSequence = false, cancelCurrent = true } = options;
  const speechToken = currentSpeechToken + 1;

  currentSpeechToken = speechToken;
  lastSpokenText = text;
  lastSpokenLang = lang;
  lastSpokenTitle = title;
  agentText.textContent = text;
  setPlaybackState("speaking");

  if (!window.speechSynthesis) {
    setStatus("Lecture vocale indisponible dans ce navigateur.");
    setPlaybackState("idle");
    return Promise.resolve(advanceSequence);
  }

  if (cancelCurrent) {
    window.speechSynthesis.cancel();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.88;
    utterance.pitch = 1;

    if (advanceSequence) {
      currentNormalResolve = resolve;
      interruptionReason = "";
    }

    if (heroScene) {
      heroScene.classList.add("is-speaking");
    }

    utterance.onend = () => {
      if (speechToken !== currentSpeechToken) {
        return;
      }

      if (heroScene) {
        heroScene.classList.remove("is-speaking");
      }

      if (advanceSequence) {
        currentNormalResolve = null;
      }

      setPlaybackState("idle");
      resolve(advanceSequence);
    };

    utterance.onerror = () => {
      if (speechToken !== currentSpeechToken) {
        return;
      }

      if (heroScene) {
        heroScene.classList.remove("is-speaking");
      }

      if (advanceSequence) {
        currentNormalResolve = null;
      }

      setPlaybackState("idle");
      resolve(false);
    };

    window.speechSynthesis.speak(utterance);
  });
}

async function speakParticipant(participant, index) {
  activeStep = index;
  currentSequenceIndex = index;
  setActiveVisual(participant);
  setStatus(`Écoute : ${participant.name}.`);
  addHistory(`${participant.name} - ${participant.role}`, participant.text);
  return speakText(participant.text, participant.lang, participant.name, {
    advanceSequence: true
  });
}

async function playMeeting() {
  sequenceRunning = true;
  startButton.disabled = true;
  speakButton.disabled = true;
  historyList.innerHTML = "";
  fallbackInput.value = "";
  renderObservation(stagedScenario.initialObservation);

  for (let index = currentSequenceIndex; index < stagedScenario.participants.length; index += 1) {
    const shouldAdvance = await speakParticipant(stagedScenario.participants[index], index);

    if (!shouldAdvance) {
      const reason = interruptionReason;

      sequenceRunning = false;
      startButton.disabled = false;
      startButton.textContent = "Reprendre la rencontre";

      if (reason === "replay") {
        setStatus("Relecture en cours.");
      } else if (reason === "stop") {
        setStatus("Lecture arrêtée. La rencontre reste au même endroit.");
      } else {
        setStatus("Lecture interrompue. Vous pouvez reprendre quand vous voulez.");
      }

      return;
    }
  }

  activeStep = stagedScenario.participants.length;
  setActiveVisual({
    id: "collective"
  });
  instructionText.textContent = stagedScenario.commonQuestion;
  agentText.textContent = stagedScenario.commonQuestion;
  addHistory("Question commune", stagedScenario.commonQuestion);
  fallbackInput.disabled = false;
  speakButton.disabled = false;
  startButton.disabled = false;
  startButton.textContent = "Rejouer la rencontre";
  sequenceRunning = false;
  currentSequenceIndex = stagedScenario.participants.length - 1;
  setStatus("À vous : prenez la parole en français.");
}

function chooseObservation(userText) {
  const normalized = normalizeText(userText);
  const matched = stagedScenario.analysis.keywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );

  return matched ? stagedScenario.analysis : stagedScenario.partial;
}

function handleUserText(text) {
  const cleanText = text.trim();

  if (!cleanText) {
    setStatus("Aucune parole détectée. Essayez une phrase courte.");
    return;
  }

  fallbackInput.value = cleanText;
  manualTextDirty = false;
  addHistory("Vous", cleanText);

  const result = chooseObservation(cleanText);
  renderObservation(result.observation);
  addHistory("Relance pédagogique", result.response);
  interruptNormalPlayback("feedback");
  speakText(result.response, languageCatalog.fr.speechLang, "Relance pédagogique", {
    advanceSequence: false
  });
  setStatus("Votre reconstruction est prise en compte.");
}

function configureRecognition() {
  if (!SpeechRecognition) {
    fallbackInput.disabled = false;
    setStatus("Micro non reconnu ici. Utilisez la saisie de secours puis cliquez sur Parler.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = languageCatalog.fr.speechLang;
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");

    fallbackInput.value = transcript;
    updateAnswerCount();

    if (event.results[event.results.length - 1].isFinal) {
      isListening = false;
      document.body.classList.remove("is-listening");
      handleUserText(transcript);
    }
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    document.body.classList.remove("is-listening");
    speakButton.textContent = "Parler";
  });

  recognition.addEventListener("error", () => {
    isListening = false;
    document.body.classList.remove("is-listening");
    fallbackInput.disabled = false;
    speakButton.textContent = "Parler";
    setStatus("Micro indisponible. Écrivez une réponse courte puis cliquez sur Parler.");
  });
}

function updateAnswerCount() {
  answerCount.textContent = `${fallbackInput.value.length} / 500`;
}

startButton.addEventListener("click", () => {
  if (sequenceRunning) {
    return;
  }

  configureRecognition();
  instructionText.textContent = stagedScenario.instruction;
  if (startButton.textContent !== "Reprendre la rencontre") {
    currentSequenceIndex = 0;
  }
  playMeeting();
});

speakButton.addEventListener("click", () => {
  if (!recognition) {
    handleUserText(fallbackInput.value || stagedScenario.fallbackUtterance);
    return;
  }

  if (fallbackInput.value.trim() && manualTextDirty && !isListening) {
    handleUserText(fallbackInput.value);
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  fallbackInput.value = "";
  updateAnswerCount();
  isListening = true;
  document.body.classList.add("is-listening");
  speakButton.textContent = "Arrêter";
  setStatus("Écoute en cours...");
  recognition.start();
});

function replayLast() {
  if (lastSpokenText) {
    interruptNormalPlayback("replay");
    speakText(lastSpokenText, lastSpokenLang, lastSpokenTitle, {
      advanceSequence: false
    });
    setStatus("Relecture en cours.");
  }
}

replayButton.addEventListener("click", replayLast);
bubbleReplayButton.addEventListener("click", replayLast);

pauseButton.addEventListener("click", () => {
  if (window.speechSynthesis && playbackState === "speaking") {
    window.speechSynthesis.pause();
    if (heroScene) {
      heroScene.classList.remove("is-speaking");
    }
    setPlaybackState("paused");
    setStatus("Lecture en pause.");
  }
});

resumeButton.addEventListener("click", () => {
  if (window.speechSynthesis && playbackState === "paused") {
    window.speechSynthesis.resume();
    if (heroScene) {
      heroScene.classList.add("is-speaking");
    }
    setPlaybackState("speaking");
    setStatus("Lecture reprise.");
  }
});

stopButton.addEventListener("click", () => {
  interruptNormalPlayback("stop");
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (heroScene) {
    heroScene.classList.remove("is-speaking");
  }
  setPlaybackState("idle");
  setStatus("Lecture arrêtée. La rencontre reste au même endroit.");
});

fallbackInput.addEventListener("input", () => {
  manualTextDirty = true;
  updateAnswerCount();
});

renderSteps();
renderProgress();
renderParticipants();
renderCollectiveCharacters();
renderObservation(stagedScenario.initialObservation);
setPlaybackState("idle");
renderDebugPanel();
