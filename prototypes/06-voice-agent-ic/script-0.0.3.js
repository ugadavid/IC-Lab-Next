const meetingScenario = {
  instruction:
    "Vous assistez à une rencontre plurilingue REPLI4C. Clara, Marco et Ana témoignent chacun dans leur langue. Observez qui parle, écoutez les indices, puis reconstruisez le sens global en français.",
  commonQuestion:
    "Conclusion collective : quels changements avez-vous compris et quels points communs reliez-vous entre Clara, Marco et Ana ?",
  fallbackUtterance:
    "Je comprends que Clara parle de chaleur, Marco de sécheresse et Ana de pluies plus fortes. Le point commun est le changement climatique.",
  participants: [
    {
      id: "clara",
      name: "Clara",
      role: "Étudiante de Valencia",
      speaker: "Clara - Espagne",
      lang: "es-ES",
      languageLabel: "Espagnol",
      avatarClass: "avatar-clara",
      text: "En Valencia los veranos son más largos y más calurosos.",
      transparentWords: "Valencia, veranos, largos, calurosos"
    },
    {
      id: "marco",
      name: "Marco",
      role: "Étudiant italien",
      speaker: "Marco - Italie",
      lang: "it-IT",
      languageLabel: "Italien",
      avatarClass: "avatar-marco",
      text: "Negli ultimi anni abbiamo avuto periodi di siccità più frequenti.",
      transparentWords: "ultimi, anni, periodi, siccità, frequenti"
    },
    {
      id: "ana",
      name: "Ana",
      role: "Étudiante brésilienne",
      speaker: "Ana - Brésil",
      lang: "pt-BR",
      languageLabel: "Portugais du Brésil",
      avatarClass: "avatar-ana",
      text: "As chuvas estão mais fortes do que antes.",
      transparentWords: "chuvas, fortes, antes"
    }
  ],
  initialObservation: {
    transparent:
      "veranos, calurosos, periodi, frequenti, fortes : les mots proches restent visibles, mais ils sont maintenant portés par des personnes.",
    clarification:
      "L'attention est guidée par l'alternance des états : parole, écoute, attente, réflexion.",
    reformulation:
      "La table ronde devient une rencontre : chaque témoignage est un moment situé, incarné par un participant.",
    partial:
      "L'utilisateur peut accepter de ne pas tout comprendre et suivre malgré tout la dynamique globale."
  },
  analysis: {
    keywords: [
      "ete",
      "etes",
      "chaud",
      "chauds",
      "chaleur",
      "secheresse",
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
      "Merci. Tu relies bien les personnes et les phénomènes : Clara évoque la chaleur, Marco la sécheresse, Ana les pluies fortes. La rencontre aide à construire un thème commun.",
    observation: {
      transparent:
        "veranos / étés, calurosos / chauds, periodi / périodes, frequenti / fréquents, fortes / fortes",
      clarification:
        "La réponse reconstruit le sens en associant chaque participant à un phénomène.",
      reformulation:
        "Les témoignages deviennent une carte simple : Clara-chaleur, Marco-sécheresse, Ana-pluies.",
      partial:
        "La compréhension globale naît d'indices partiels et de la mémoire visuelle des personnes."
    }
  },
  partial: {
    response:
      "On peut reprendre la rencontre personne par personne : Clara parle de veranos calurosos, Marco de siccità, Ana de chuvas fortes. Le thème commun reste le climat qui change.",
    observation: {
      transparent:
        "Les mots-appuis sont distribués entre les participants : veranos, siccità, chuvas, fortes.",
      clarification:
        "La relance utilise l'incarnation visuelle pour réduire la charge : une personne, un phénomène.",
      reformulation:
        "Le sens global est reformulé comme une comparaison de trois expériences vécues.",
      partial:
        "Même avec des détails incertains, les avatars peuvent aider à mémoriser les grandes associations."
    }
  }
};

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const startButton = document.querySelector("#startButton");
const speakButton = document.querySelector("#speakButton");
const replayButton = document.querySelector("#replayButton");
const instructionText = document.querySelector("#instructionText");
const fallbackInput = document.querySelector("#fallbackInput");
const speechStatus = document.querySelector("#speechStatus");
const agentText = document.querySelector("#agentText");
const agentTitle = document.querySelector("#agent-title");
const observationGrid = document.querySelector("#observationGrid");
const historyList = document.querySelector("#historyList");
const participantList = document.querySelector("#participantList");
const meetingStatus = document.querySelector("#meetingStatus");

let recognition = null;
let isListening = false;
let manualTextDirty = false;
let lastSpokenText = "";
let lastSpokenLang = "es-ES";
let lastSpokenTitle = "Rencontre";
let sequenceRunning = false;
let activeParticipantId = "";

const observationLabels = {
  transparent: "Mots transparents",
  clarification: "Attention et engagement",
  reformulation: "Rencontre incarnée",
  partial: "Compréhension partielle"
};

function setStatus(message) {
  speechStatus.textContent = message;
}

function setMeetingStatus(message) {
  meetingStatus.textContent = message;
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

function getParticipantState(participant) {
  if (!activeParticipantId) {
    return "attente";
  }

  if (activeParticipantId === "collective") {
    return "réflexion";
  }

  return participant.id === activeParticipantId ? "parole" : "écoute";
}

function renderParticipants() {
  participantList.innerHTML = "";

  meetingScenario.participants.forEach((participant) => {
    const card = document.createElement("article");
    const heading = document.createElement("div");
    const name = document.createElement("h3");
    const role = document.createElement("p");
    const avatar = document.createElement("div");
    const initial = document.createElement("span");
    const quote = document.createElement("p");
    const language = document.createElement("p");
    const state = document.createElement("p");
    const actions = document.createElement("div");
    const replay = document.createElement("button");

    const stateLabel = getParticipantState(participant);

    card.className = "participant-card";
    card.classList.toggle("is-active", stateLabel === "parole");
    card.classList.toggle("is-thinking", stateLabel === "réflexion");
    card.classList.toggle("is-waiting", stateLabel === "attente");

    name.textContent = participant.name;
    role.className = "participant-role";
    role.textContent = participant.role;
    heading.append(name, role);

    avatar.className = `participant-avatar ${participant.avatarClass}`;
    initial.className = "participant-initial";
    initial.textContent = participant.name.charAt(0);
    avatar.append(initial);

    quote.className = "active-quote";
    quote.textContent = participant.text;

    language.className = "participant-language";
    language.textContent = `${participant.languageLabel} | Indices : ${participant.transparentWords}`;

    state.className = "participant-state";
    state.textContent = `État : ${stateLabel}`;

    actions.className = "participant-actions";
    replay.type = "button";
    replay.textContent = "Relire";
    replay.addEventListener("click", () => {
      activeParticipantId = participant.id;
      renderParticipants();
      speakParticipant(participant);
      addHistory(participant.speaker, participant.text);
      setMeetingStatus(`${participant.name} parle`);
    });
    actions.append(replay);

    card.append(heading, avatar, quote, language, state, actions);
    participantList.append(card);
  });
}

function speakText(text, lang, title) {
  lastSpokenText = text;
  lastSpokenLang = lang;
  lastSpokenTitle = title;
  agentText.textContent = text;
  agentTitle.textContent = title;
  replayButton.disabled = false;

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
    window.speechSynthesis.speak(utterance);
  });
}

function speakParticipant(participant) {
  return speakText(participant.text, participant.lang, participant.speaker);
}

async function playMeeting() {
  sequenceRunning = true;
  startButton.disabled = true;
  speakButton.disabled = true;
  historyList.innerHTML = "";
  fallbackInput.value = "";
  renderObservation(meetingScenario.initialObservation);

  for (const participant of meetingScenario.participants) {
    activeParticipantId = participant.id;
    renderParticipants();
    setMeetingStatus(`${participant.name} parle`);
    setStatus(`Écoute : ${participant.speaker}.`);
    addHistory(participant.speaker, participant.text);
    await speakParticipant(participant);
  }

  activeParticipantId = "collective";
  renderParticipants();
  instructionText.textContent = meetingScenario.commonQuestion;
  agentTitle.textContent = "Conclusion collective";
  agentText.textContent = meetingScenario.commonQuestion;
  addHistory("Conclusion collective", meetingScenario.commonQuestion);
  fallbackInput.disabled = false;
  speakButton.disabled = false;
  startButton.disabled = false;
  startButton.textContent = "Rejouer la rencontre";
  sequenceRunning = false;
  setMeetingStatus("réflexion collective");
  setStatus("À vous : reconstruisez le sens global en français.");
}

function chooseObservation(userText) {
  const normalized = normalizeText(userText);
  const matched = meetingScenario.analysis.keywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );

  return matched ? meetingScenario.analysis : meetingScenario.partial;
}

function handleUserText(text) {
  const cleanText = text.trim();

  if (!cleanText) {
    setStatus("Aucune parole détectée. Essayez une phrase courte.");
    return;
  }

  fallbackInput.value = cleanText;
  manualTextDirty = false;
  addHistory("Utilisateur francophone", cleanText);

  const result = chooseObservation(cleanText);
  renderObservation(result.observation);
  addHistory("Observation scénarisée", result.response);
  speakText(result.response, "fr-FR", "Relance pédagogique");
  setStatus("Observation scénarisée affichée et lue.");
}

function configureRecognition() {
  if (!SpeechRecognition) {
    fallbackInput.disabled = false;
    setStatus("Micro non reconnu ici. Utilisez la saisie de secours puis cliquez sur Répondre.");
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

    if (event.results[event.results.length - 1].isFinal) {
      isListening = false;
      document.body.classList.remove("is-listening");
      handleUserText(transcript);
    }
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    document.body.classList.remove("is-listening");
    speakButton.textContent = "Répondre";
  });

  recognition.addEventListener("error", () => {
    isListening = false;
    document.body.classList.remove("is-listening");
    fallbackInput.disabled = false;
    speakButton.textContent = "Répondre";
    setStatus("Micro indisponible. Écrivez une réponse courte puis cliquez sur Répondre.");
  });
}

startButton.addEventListener("click", () => {
  if (sequenceRunning) {
    return;
  }

  configureRecognition();
  instructionText.textContent = meetingScenario.instruction;
  playMeeting();
});

speakButton.addEventListener("click", () => {
  if (!recognition) {
    handleUserText(fallbackInput.value || meetingScenario.fallbackUtterance);
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
  isListening = true;
  document.body.classList.add("is-listening");
  speakButton.textContent = "Arrêter";
  setStatus("Écoute en cours...");
  recognition.start();
});

replayButton.addEventListener("click", () => {
  if (lastSpokenText) {
    speakText(lastSpokenText, lastSpokenLang, lastSpokenTitle);
    setStatus("Réécoute de la personne active.");
  }
});

fallbackInput.addEventListener("input", () => {
  manualTextDirty = true;
});

renderParticipants();
renderObservation(meetingScenario.initialObservation);
