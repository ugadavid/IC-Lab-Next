const roundtableScenario = {
  instruction:
    "Écoutez trois témoignages courts en espagnol, italien et portugais du Brésil. Ensuite, répondez en français : quels changements avez-vous compris et quels points communs voyez-vous ?",
  commonQuestion:
    "Quels changements avez-vous compris ? Quels points communs voyez-vous entre ces témoignages ?",
  fallbackUtterance:
    "Je comprends que les trois personnes parlent de changements climatiques : des étés plus chauds, de la sécheresse et des pluies plus fortes.",
  testimonies: [
    {
      speaker: "Clara - Espagne",
      lang: "es-ES",
      country: "Valencia",
      text: "En Valencia los veranos son más largos y más calurosos.",
      transparentWords: "Valencia, veranos, largos, calurosos"
    },
    {
      speaker: "Marco - Italie",
      lang: "it-IT",
      country: "Italie",
      text: "Negli ultimi anni abbiamo avuto periodi di siccità più frequenti.",
      transparentWords: "ultimi, anni, periodi, siccità, frequenti"
    },
    {
      speaker: "Ana - Brésil",
      lang: "pt-BR",
      country: "Brésil",
      text: "As chuvas estão mais fortes do que antes.",
      transparentWords: "chuvas, fortes, antes"
    }
  ],
  initialObservation: {
    transparent:
      "veranos, calurosos, periodi, frequenti, fortes : plusieurs indices restent accessibles malgré le changement de langue.",
    clarification:
      "La tâche ne porte pas sur une phrase isolée mais sur la recherche d'un thème commun.",
    reformulation:
      "Trois témoignages courts posent une même question : quels effets du changement climatique sont perceptibles ?",
    partial:
      "L'apprenant peut comprendre globalement chaleur, sécheresse et pluies fortes sans tout identifier."
  },
  analysis: {
    keywords: [
      "ete",
      "etes",
      "chaud",
      "chauds",
      "chaleur",
      "long",
      "longs",
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
      "point",
      "points"
    ],
    response:
      "Merci. Ta reconstruction va dans le sens attendu : plusieurs langues, plusieurs indices, mais un thème commun autour des effets du changement climatique.",
    observation: {
      transparent:
        "veranos / étés, calurosos / chauds, periodi / périodes, frequenti / fréquents, fortes / fortes",
      clarification:
        "La réponse française met en relation plusieurs témoignages au lieu de traiter chaque phrase séparément.",
      reformulation:
        "Les indices dispersés sont regroupés en trois changements : chaleur, sécheresse, pluies plus fortes.",
      partial:
        "Certains détails restent incertains, mais le sens global est construit par comparaison."
    }
  },
  partial: {
    response:
      "On peut repartir des indices visibles : veranos et calurosos indiquent la chaleur ; siccità renvoie à la sécheresse ; chuvas fortes évoque des pluies plus intenses.",
    observation: {
      transparent:
        "veranos, calurosos, siccità, chuvas, fortes : ces mots servent de points d'appui.",
      clarification:
        "La relance réduit la complexité et propose des indices à comparer.",
      reformulation:
        "La table ronde est reformulée comme une série de phénomènes : chaleur, sécheresse, pluies.",
      partial:
        "La compréhension partielle est suffisante pour formuler une hypothèse globale."
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
const testimonyList = document.querySelector("#testimonyList");

let recognition = null;
let isListening = false;
let manualTextDirty = false;
let lastSpokenText = "";
let lastSpokenLang = "es-ES";
let lastSpokenTitle = "Table ronde";
let sequenceRunning = false;

const observationLabels = {
  transparent: "Mots transparents",
  clarification: "Construction du sens",
  reformulation: "Comparaison des témoignages",
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

function renderTestimonies() {
  testimonyList.innerHTML = "";

  roundtableScenario.testimonies.forEach((testimony, index) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const text = document.createElement("p");
    const meta = document.createElement("p");
    const button = document.createElement("button");

    card.className = "testimony-card";
    title.textContent = testimony.speaker;
    text.textContent = testimony.text;
    meta.className = "testimony-meta";
    meta.textContent = `Langue : ${testimony.lang} | Indices : ${testimony.transparentWords}`;
    button.type = "button";
    button.textContent = "Relire ce témoignage";
    button.addEventListener("click", () => {
      speakTestimony(testimony);
      addHistory(testimony.speaker, testimony.text);
      setStatus(`Relecture du témoignage ${index + 1}.`);
    });

    card.append(title, text, meta, button);
    testimonyList.append(card);
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

function speakTestimony(testimony) {
  return speakText(testimony.text, testimony.lang, testimony.speaker);
}

async function playRoundtable() {
  sequenceRunning = true;
  startButton.disabled = true;
  speakButton.disabled = true;
  historyList.innerHTML = "";
  fallbackInput.value = "";
  renderObservation(roundtableScenario.initialObservation);

  for (const testimony of roundtableScenario.testimonies) {
    setStatus(`Écoute : ${testimony.speaker}.`);
    addHistory(testimony.speaker, testimony.text);
    await speakTestimony(testimony);
  }

  instructionText.textContent = roundtableScenario.commonQuestion;
  agentTitle.textContent = "Question commune";
  agentText.textContent = roundtableScenario.commonQuestion;
  addHistory("Question commune", roundtableScenario.commonQuestion);
  fallbackInput.disabled = false;
  speakButton.disabled = false;
  startButton.disabled = false;
  startButton.textContent = "Réécouter la table ronde";
  sequenceRunning = false;
  setStatus("À vous : répondez en français avec les changements compris ou les points communs.");
}

function chooseObservation(userText) {
  const normalized = normalizeText(userText);
  const matched = roundtableScenario.analysis.keywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );

  return matched ? roundtableScenario.analysis : roundtableScenario.partial;
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
  instructionText.textContent = roundtableScenario.instruction;
  playRoundtable();
});

speakButton.addEventListener("click", () => {
  if (!recognition) {
    handleUserText(fallbackInput.value || roundtableScenario.fallbackUtterance);
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
    setStatus("Réécoute du dernier élément lu.");
  }
});

fallbackInput.addEventListener("input", () => {
  manualTextDirty = true;
});

renderTestimonies();
renderObservation(roundtableScenario.initialObservation);
