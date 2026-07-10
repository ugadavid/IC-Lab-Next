const scenario = {
  instruction:
    "Vous êtes étudiant francophone dans une rencontre REPLI4C. Répondez en français à Clara, étudiante espagnole. Ne traduisez pas tout : dites ce que vous comprenez globalement, les mots qui vous aident et ce qui reste incertain.",
  startAgent:
    "Hola. Soy Clara, estudiante de Valencia. En los últimos años los veranos son más largos y más calurosos. ¿Qué entiendes de mi situación?",
  startLang: "es-ES",
  startSpeaker: "Clara - étudiante espagnole",
  fallbackUtterance:
    "Je comprends que Clara parle des étés plus longs et plus chauds à Valence, mais je ne comprends pas tous les détails.",
  initialObservation: {
    transparent:
      "estudiante / étudiante, últimos / derniers, años / années, largos / longs, calurosos / chaleureux ou chauds",
    clarification:
      "La première question demande ce qui est compris, pas une traduction complète.",
    reformulation:
      "La situation est formulée comme un témoignage personnel : lieu, période, phénomène climatique, ressenti possible.",
    partial:
      "L'utilisateur peut déjà reconstruire l'idée générale avec quelques mots transparents et accepter les zones floues."
  },
  turns: [
    {
      keywords: [
        "ete",
        "etes",
        "chaleur",
        "chaud",
        "chauds",
        "long",
        "longs",
        "valence",
        "climat",
        "climatique",
        "compris"
      ],
      speaker: "Clara - étudiante espagnole",
      lang: "es-ES",
      agent:
        "Sí, eso es. Hablo de una experiencia cotidiana: el calor cambia mi manera de vivir la ciudad. Salimos más tarde, buscamos sombra y a veces sentimos cansancio.",
      observation: {
        transparent:
          "experiencia / expérience, cotidiana / quotidienne, calor / chaleur, ciudad / cité ou ville, sentimos / sentons",
        clarification:
          "Clara confirme la compréhension globale avant d'ajouter des détails.",
        reformulation:
          "Le phénomène climatique est reformulé à travers des effets concrets : sortir plus tard, chercher l'ombre, ressentir de la fatigue.",
        partial:
          "Même si tous les mots ne sont pas reconnus, la chaîne chaleur → ville → habitudes → fatigue devient interprétable."
      }
    },
    {
      keywords: [
        "fatigue",
        "fatiguee",
        "ombre",
        "ville",
        "sortir",
        "tard",
        "habitude",
        "habitudes",
        "quotidien",
        "ressens",
        "ressenti"
      ],
      speaker: "Clara - étudiante espagnole",
      lang: "es-ES",
      agent:
        "Exacto. Cuando dices fatigue, entiendo cansancio. Para mí, la palabra importante es adaptación: cambiamos horarios, gestos y emociones. ¿Puedes explicar qué parte te parece clara y qué parte sigue incierta?",
      observation: {
        transparent:
          "adaptación / adaptation, horarios / horaires, gestos / gestes, emociones / émotions, importante / important",
        clarification:
          "L'agent invite à distinguer ce qui est clair de ce qui reste incertain.",
        reformulation:
          "'fatigue' est relié à 'cansancio', puis l'idée est élargie vers l'adaptation.",
        partial:
          "La compréhension partielle devient un objet de discussion : on nomme les zones sûres et les zones à négocier."
      }
    },
    {
      keywords: [
        "clair",
        "claire",
        "incertain",
        "incertaine",
        "adaptation",
        "horaire",
        "horaires",
        "emotion",
        "emotions",
        "geste",
        "gestes",
        "partie"
      ],
      speaker: "Clara - étudiante espagnole",
      lang: "es-ES",
      agent:
        "Muy bien. Estamos construyendo una comprensión común: no una traducción palabra por palabra, sino una interpretación compartida. Yo digo calor, adaptación, emociones; tú reconstruyes con chaleur, horaires, fatigue.",
      observation: {
        transparent:
          "comprensión / compréhension, común / commune, traducción / traduction, interpretación / interprétation",
        clarification:
          "Clara explicite la règle de l'intercompréhension : comprendre ensemble plutôt que traduire.",
        reformulation:
          "Les mots espagnols et français sont mis en parallèle pour stabiliser un sens partagé.",
        partial:
          "L'incertitude est acceptée : l'échange avance par rapprochements successifs."
      }
    },
    {
      keywords: [
        "commun",
        "commune",
        "ensemble",
        "traduction",
        "interpretation",
        "partage",
        "partagee",
        "reconstruis",
        "reconstruction",
        "sens"
      ],
      speaker: "Clara - étudiante espagnole",
      lang: "es-ES",
      agent:
        "Para ampliar la conversación, escuchamos también a una compañera italiana: 'Nel mio paese, la siccità cambia il paesaggio e anche la memoria dei luoghi'. ¿Qué palabras reconoces?",
      observation: {
        transparent:
          "conversación / conversation, italiana / italienne, paese / pays, siccità / sécheresse, memoria / mémoire",
        clarification:
          "Un deuxième témoignage roman est introduit avec une question simple : repérer des mots reconnaissables.",
        reformulation:
          "Le thème climatique se déplace de la chaleur vers la sécheresse, le paysage et la mémoire des lieux.",
        partial:
          "Le prototype commence à rendre visible une situation plurilingue : l'utilisateur ne comprend pas tout, mais peut transférer des stratégies."
      }
    }
  ],
  misunderstanding: {
    speaker: "Clara - étudiante espagnole",
    lang: "es-ES",
    agent:
      "Entiendo una parte, pero necesitamos aclarar. Puedes responder con palabras simples: calor, verano, ciudad, emoción, adaptación. No hace falta traducir todo.",
    observation: {
      transparent:
        "parte / partie, aclarar / clarifier, calor / chaleur, emoción / émotion, adaptación / adaptation",
      clarification:
        "Clara demande une clarification sans sanctionner l'incompréhension.",
      reformulation:
        "Elle propose des mots-appuis pour relancer la négociation du sens.",
      partial:
        "Le malentendu devient une étape normale : on réduit la complexité et on repart d'indices partagés."
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

let currentTurn = 0;
let lastAgentText = "";
let lastAgentLang = scenario.startLang;
let recognition = null;
let isListening = false;
let manualTextDirty = false;

const observationLabels = {
  transparent: "Mots transparents",
  clarification: "Négociation du sens",
  reformulation: "Reformulation",
  partial: "Compréhension partielle"
};

function setStatus(message) {
  speechStatus.textContent = message;
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

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function speakAgent(text, lang = "es-ES") {
  lastAgentText = text;
  lastAgentLang = lang;
  agentText.textContent = text;
  agentTitle.textContent = lang.startsWith("it") ? "Italien" : "Espagnol";
  replayButton.disabled = false;

  if (!window.speechSynthesis) {
    setStatus("Lecture vocale indisponible dans ce navigateur.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

function chooseScenarioTurn(userText) {
  const normalized = normalizeText(userText);
  const scriptedTurn = scenario.turns[currentTurn] || scenario.turns.at(-1);
  const matched = scriptedTurn.keywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );

  if (!matched) {
    return scenario.misunderstanding;
  }

  currentTurn += 1;
  return scriptedTurn;
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

  const selectedTurn = chooseScenarioTurn(cleanText);
  speakAgent(selectedTurn.agent, selectedTurn.lang);
  renderObservation(selectedTurn.observation);
  addHistory(selectedTurn.speaker, selectedTurn.agent);
  setStatus("Réponse scénarisée générée et lue.");
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
    setStatus("Micro indisponible. Écrivez une phrase courte puis cliquez sur Parler.");
  });
}

startButton.addEventListener("click", () => {
  currentTurn = 0;
  instructionText.textContent = scenario.instruction;
  fallbackInput.disabled = false;
  fallbackInput.value = "";
  historyList.innerHTML = "";
  speakButton.disabled = false;
  startButton.textContent = "Recommencer";

  configureRecognition();
  speakAgent(scenario.startAgent, scenario.startLang);
  addHistory(scenario.startSpeaker, scenario.startAgent);
  renderObservation(scenario.initialObservation);
  setStatus("Échange REPLI4C démarré. Cliquez sur Parler ou utilisez la saisie de secours.");
});

speakButton.addEventListener("click", () => {
  if (!recognition) {
    handleUserText(fallbackInput.value || scenario.fallbackUtterance);
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
  if (lastAgentText) {
    speakAgent(lastAgentText, lastAgentLang);
    setStatus("Réécoute de la dernière réponse.");
  }
});

fallbackInput.addEventListener("input", () => {
  manualTextDirty = true;
});
