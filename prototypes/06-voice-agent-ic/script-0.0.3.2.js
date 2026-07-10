const stagedScenario = {
  instruction:
    "Écoutez Clara, Marco et Ana comme dans une mini-rencontre REPLI4C. Observez la personne qui parle, gardez quelques mots proches, puis répondez en français.",
  commonQuestion:
    "Question commune : quels changements avez-vous compris et quels points communs reliez-vous entre Clara, Marco et Ana ?",
  fallbackUtterance:
    "Je comprends que Clara parle de chaleur, Marco de sécheresse et Ana de pluies plus fortes. Le point commun est le changement climatique.",
  participants: [
    {
      id: "clara",
      name: "Clara",
      role: "Espagne",
      detail: "Témoignage en espagnol",
      lang: "es-ES",
      languageLabel: "Espagnol",
      flag: "🇪🇸",
      avatarClass: "avatar-clara",
      text: "En Valencia los veranos son más largos y más calurosos.",
      transparentWords: "veranos, largos, calurosos",
      next: "Ensuite : Marco témoignera en italien."
    },
    {
      id: "marco",
      name: "Marco",
      role: "Italie",
      detail: "Témoignage en italien",
      lang: "it-IT",
      languageLabel: "Italien",
      flag: "🇮🇹",
      avatarClass: "avatar-marco",
      text: "Negli ultimi anni abbiamo avuto periodi di siccità più frequenti.",
      transparentWords: "ultimi, periodi, frequenti",
      next: "Ensuite : Ana témoignera en portugais du Brésil."
    },
    {
      id: "ana",
      name: "Ana",
      role: "Brésil",
      detail: "Témoignage en portugais",
      lang: "pt-BR",
      languageLabel: "Portugais du Brésil",
      flag: "🇧🇷",
      avatarClass: "avatar-ana",
      text: "As chuvas estão mais fortes do que antes.",
      transparentWords: "chuvas, fortes, antes",
      next: "Ensuite : à vous de reconstruire les points communs."
    }
  ],
  initialObservation: {
    transparent:
      "veranos, calurosos, periodi, frequenti, fortes : les indices sont associés à des personnes visibles.",
    clarification:
      "L'attention est dirigée vers un participant actif plutôt que vers une liste de textes.",
    reformulation:
      "La compréhension globale se construit par moments successifs d'une même rencontre.",
    partial:
      "L'apprenant peut mémoriser une association simple : une personne, une langue, un phénomène."
  },
  analysis: {
    keywords: [
      "ete",
      "etes",
      "chaud",
      "chauds",
      "chaleur",
      "secheresse",
      "sec",
      "pluie",
      "pluies",
      "fort",
      "forte",
      "fortes",
      "climat",
      "climatique",
      "changement",
      "changements",
      "commun",
      "communs",
      "clara",
      "marco",
      "ana"
    ],
    response:
      "Merci. Vous reconstruisez bien la rencontre : Clara évoque des étés plus chauds, Marco des sécheresses plus fréquentes, Ana des pluies plus fortes. Le thème commun est le changement climatique vécu localement.",
    observation: {
      transparent:
        "veranos / étés, calurosos / chauds, periodi / périodes, frequenti / fréquents, fortes / fortes",
      clarification:
        "La réponse associe chaque personne à un phénomène et compare les témoignages.",
      reformulation:
        "La rencontre devient une carte de sens : Clara-chaleur, Marco-sécheresse, Ana-pluies.",
      partial:
        "La compréhension globale émerge malgré des détails incertains dans chaque langue."
    }
  },
  partial: {
    response:
      "On peut reconstruire avec trois appuis : Clara parle de veranos calurosos, Marco de siccità, Ana de chuvas fortes. Vous pouvez formuler une hypothèse commune autour du climat qui change.",
    observation: {
      transparent:
        "veranos, siccità, chuvas, fortes : les mots-appuis suffisent pour relancer la compréhension.",
      clarification:
        "La relance repart des personnes visibles pour réduire la charge de comparaison.",
      reformulation:
        "Chaque témoignage est résumé en un phénomène avant de chercher le thème commun.",
      partial:
        "L'incertitude reste normale : l'objectif est une reconstruction plausible, pas une traduction."
    }
  }
};

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const startButton = document.querySelector("#startButton");
const speakButton = document.querySelector("#speakButton");
const replayButton = document.querySelector("#replayButton");
const bubbleReplayButton = document.querySelector("#bubbleReplayButton");
const instructionText = document.querySelector("#instructionText");
const fallbackInput = document.querySelector("#fallbackInput");
const speechStatus = document.querySelector("#speechStatus");
const agentText = document.querySelector("#agentText");
const speakerLang = document.querySelector("#speakerLang");
const activeBadge = document.querySelector("#activeBadge");
const activePortrait = document.querySelector("#activePortrait");
const activeInitial = document.querySelector("#activeInitial");
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


let recognition = null;
let isListening = false;
let manualTextDirty = false;
let lastSpokenText = "";
let lastSpokenLang = "es-ES";
let lastSpokenTitle = "Rencontre";
let sequenceRunning = false;
let activeStep = 0;
let activeParticipantId = "";

const observationLabels = {
  transparent: "Mots transparents",
  clarification: "Construction du sens",
  reformulation: "Comparaison incarnée",
  partial: "Compréhension partielle"
};

function setStatus(message) {
  speechStatus.textContent = message;
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
  progressText.textContent = `${Math.min(activeStep + 1, 4)} / 4`;

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
  activeBadge.textContent = isCollective
    ? "Question commune"
    : `${participant.name} - ${participant.role} ${participant.flag}`;
  speakerLang.textContent = isCollective
    ? "Réflexion collective"
    : `${participant.languageLabel} | indices : ${participant.transparentWords}`;
  //activeInitial.textContent = isCollective ? "?" : participant.name.charAt(0);


  const activeCharacter = document.querySelector("#activeCharacter");

if (activeCharacter && activeBackground) {
  if (participant.id === "collective") {
    activeCharacter.src = "images/Clara.png";
    activeCharacter.alt = "Question commune";
    activeCharacter.style.opacity = "0.25";
    activeBackground.src = "images/Espagne.png";
  } else {
    activeCharacter.src = `images/${participant.name}.png`;
    activeCharacter.alt = participant.name;

    const backgroundMap = {
      Clara: "images/Espagne.png",
      Marco: "images/Italie.png",
      Ana: "images/Bresil.png"
    };

    activeBackground.src = backgroundMap[participant.name] || "images/Espagne.png";
    activeCharacter.style.opacity = "1";
  }
}




  activePortrait.className = `active-portrait ${isCollective ? "avatar-collective" : participant.avatarClass}`;
  nextIcon.textContent = isCollective ? "💬" : participant.flag;
  meetingStatus.textContent = isCollective ? stagedScenario.commonQuestion : participant.next;

  renderParticipants();
  renderSteps();
  renderProgress();
}

function speakText(text, lang, title) {
  lastSpokenText = text;
  lastSpokenLang = lang;
  lastSpokenTitle = title;
  agentText.textContent = text;
  replayButton.disabled = false;
  bubbleReplayButton.disabled = false;

  if (!window.speechSynthesis) {
    setStatus("Lecture vocale indisponible dans ce navigateur.");
    return Promise.resolve();
  }

  window.speechSynthesis.cancel();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    if (heroScene) {
      heroScene.classList.add("is-speaking");
    }

    utterance.onend = () => {
      if (heroScene) {
        heroScene.classList.remove("is-speaking");
      }
      resolve();
    };

    utterance.onerror = () => {
      if (heroScene) {
        heroScene.classList.remove("is-speaking");
      }
      resolve();
    };

    
    window.speechSynthesis.speak(utterance);

    

  });
}

async function speakParticipant(participant, index) {
  activeStep = index;
  setActiveVisual(participant);
  setStatus(`Écoute : ${participant.name}.`);
  addHistory(`${participant.name} - ${participant.role}`, participant.text);
  await speakText(participant.text, participant.lang, participant.name);
}

async function playMeeting() {
  sequenceRunning = true;
  startButton.disabled = true;
  speakButton.disabled = true;
  historyList.innerHTML = "";
  fallbackInput.value = "";
  renderObservation(stagedScenario.initialObservation);

  for (const [index, participant] of stagedScenario.participants.entries()) {
    await speakParticipant(participant, index);
  }

  activeStep = 3;
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
  speakText(result.response, "fr-FR", "Relance pédagogique");
  setStatus("Votre reconstruction est prise en compte.");
}

function configureRecognition() {
  if (!SpeechRecognition) {
    fallbackInput.disabled = false;
    setStatus("Micro non reconnu ici. Utilisez la saisie de secours puis cliquez sur Parler.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "fr-FR";
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
    speakText(lastSpokenText, lastSpokenLang, lastSpokenTitle);
    setStatus("Réécoute du dernier moment.");
  }
}

replayButton.addEventListener("click", replayLast);
bubbleReplayButton.addEventListener("click", replayLast);

fallbackInput.addEventListener("input", () => {
  manualTextDirty = true;
  updateAnswerCount();
});

renderSteps();
renderProgress();
renderParticipants();
renderObservation(stagedScenario.initialObservation);
