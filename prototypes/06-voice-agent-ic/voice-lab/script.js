const languageFamilies = {
  all: { label: "Toutes", prefixes: [] },
  fr: { label: "Français", prefixes: ["fr"] },
  es: { label: "Espagnol", prefixes: ["es"] },
  it: { label: "Italien", prefixes: ["it"] },
  pt: { label: "Portugais", prefixes: ["pt"] },
  ca: { label: "Catalan", prefixes: ["ca"] },
  ro: { label: "Roumain", prefixes: ["ro"] }
};

const testTexts = {
  fr: "Bonjour. Je comprends une partie de la phrase grâce aux mots proches.",
  es: "Hola. Comprendo una parte de la frase gracias a las palabras transparentes.",
  it: "Ciao. Capisco una parte della frase grazie alle parole trasparenti.",
  pt: "Olá. Compreendo uma parte da frase graças às palavras transparentes.",
  ca: "Hola. Entenc una part de la frase gràcies a les paraules transparents.",
  ro: "Bună ziua. Înțeleg o parte din frază datorită cuvintelor transparente."
};

const sequentialTestText = {
  fr: "Test de voix française.",
  es: "Prueba de voz española.",
  it: "Prova di voce italiana.",
  pt: "Teste de voz portuguesa.",
  ca: "Prova de veu catalana.",
  ro: "Test de voce română.",
  all: "Voice Lab, synthèse vocale navigateur."
};

const voiceList = document.querySelector("#voiceList");
const voiceStatus = document.querySelector("#voiceStatus");
const playbackStatus = document.querySelector("#playbackStatus");
const visibleCount = document.querySelector("#visibleCount");
const refreshButton = document.querySelector("#refreshButton");
const speakButton = document.querySelector("#speakButton");
const testFilteredButton = document.querySelector("#testFilteredButton");
const stopButton = document.querySelector("#stopButton");
const pauseButton = document.querySelector("#pauseButton");
const resumeButton = document.querySelector("#resumeButton");
const testText = document.querySelector("#testText");
const rateInput = document.querySelector("#rateInput");
const pitchInput = document.querySelector("#pitchInput");
const volumeInput = document.querySelector("#volumeInput");
const rateValue = document.querySelector("#rateValue");
const pitchValue = document.querySelector("#pitchValue");
const volumeValue = document.querySelector("#volumeValue");

let voices = [];
let selectedVoiceURI = "";
let activeFamily = "all";
let sequenceCancelled = false;

function supportsSpeechSynthesis() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function getFilteredVoices() {
  const family = languageFamilies[activeFamily];

  if (!family || family.prefixes.length === 0) {
    return voices;
  }

  return voices.filter((voice) => {
    const lang = voice.lang.toLowerCase();
    return family.prefixes.some((prefix) => lang.startsWith(prefix));
  });
}

function updateSliderLabels() {
  rateValue.textContent = Number(rateInput.value).toFixed(2);
  pitchValue.textContent = Number(pitchInput.value).toFixed(2);
  volumeValue.textContent = Number(volumeInput.value).toFixed(2);
}

function setPlaybackStatus(message) {
  playbackStatus.textContent = message;
}

function findSelectedVoice() {
  return voices.find((voice) => voice.voiceURI === selectedVoiceURI) || null;
}

function renderVoices() {
  const filteredVoices = getFilteredVoices();

  voiceList.innerHTML = "";
  visibleCount.textContent = String(filteredVoices.length);

  if (voices.length === 0) {
    voiceList.innerHTML =
      '<p class="empty-state">Aucune voix détectée pour le moment. Certains navigateurs chargent les voix après quelques instants.</p>';
    return;
  }

  if (filteredVoices.length === 0) {
    voiceList.innerHTML =
      '<p class="empty-state">Aucune voix ne correspond à ce filtre sur ce navigateur ou ce système.</p>';
    return;
  }

  filteredVoices.forEach((voice) => {
    const card = document.createElement("button");
    const name = document.createElement("strong");
    const meta = document.createElement("div");
    const uri = document.createElement("div");

    card.type = "button";
    card.className = "voice-card";
    card.dataset.voiceUri = voice.voiceURI;

    if (voice.voiceURI === selectedVoiceURI) {
      card.classList.add("selected");
    }

    name.textContent = voice.name;
    meta.className = "voice-meta";
    meta.append(
      makeMeta(voice.lang || "langue inconnue"),
      makeMeta(voice.default ? "default: oui" : "default: non"),
      makeMeta(voice.localService ? "localService: oui" : "localService: non")
    );

    uri.className = "voice-uri";
    uri.textContent = voice.voiceURI ? `URI: ${voice.voiceURI}` : "URI: non disponible";

    card.append(name, meta, uri);
    card.addEventListener("click", () => {
      selectedVoiceURI = voice.voiceURI;
      renderVoices();
      setPlaybackStatus(`Voix sélectionnée : ${voice.name} (${voice.lang}).`);
    });

    voiceList.append(card);
  });
}

function makeMeta(text) {
  const item = document.createElement("span");
  item.textContent = text;
  return item;
}

function loadVoices() {
  if (!supportsSpeechSynthesis()) {
    voiceStatus.textContent = "speechSynthesis n'est pas disponible dans ce navigateur.";
    speakButton.disabled = true;
    testFilteredButton.disabled = true;
    return;
  }

  voices = window.speechSynthesis.getVoices();

  if (voices.length === 0) {
    voiceStatus.textContent =
      "Voix en attente de chargement. L'événement voiceschanged mettra la liste à jour.";
  } else {
    voiceStatus.textContent = `${voices.length} voix détectées par speechSynthesis.getVoices().`;

    if (!selectedVoiceURI) {
      const preferredVoice =
        voices.find((voice) => voice.lang.toLowerCase().startsWith("es")) ||
        voices.find((voice) => voice.default) ||
        voices[0];
      selectedVoiceURI = preferredVoice.voiceURI;
    }
  }

  renderVoices();
}

function buildUtterance(text, voice) {
  const utterance = new SpeechSynthesisUtterance(text);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.rate = Number(rateInput.value);
  utterance.pitch = Number(pitchInput.value);
  utterance.volume = Number(volumeInput.value);

  return utterance;
}

function speakSelectedVoice() {
  const selectedVoice = findSelectedVoice();
  const text = testText.value.trim();

  if (!supportsSpeechSynthesis()) {
    setPlaybackStatus("Lecture impossible : speechSynthesis n'est pas disponible.");
    return;
  }

  if (!selectedVoice) {
    setPlaybackStatus("Sélectionnez une voix dans la liste.");
    return;
  }

  if (!text) {
    setPlaybackStatus("Ajoutez un texte à lire.");
    return;
  }

  sequenceCancelled = true;
  window.speechSynthesis.cancel();

  const utterance = buildUtterance(text, selectedVoice);
  utterance.onstart = () => {
    setPlaybackStatus(`Lecture avec ${selectedVoice.name} (${selectedVoice.lang}).`);
  };
  utterance.onend = () => {
    setPlaybackStatus("Lecture terminée.");
  };
  utterance.onerror = () => {
    setPlaybackStatus("Erreur pendant la lecture vocale.");
  };

  window.speechSynthesis.speak(utterance);
}

function speakVoiceInSequence(voice, text) {
  return new Promise((resolve) => {
    const utterance = buildUtterance(text, voice);

    utterance.onstart = () => {
      setPlaybackStatus(`Test séquentiel : ${voice.name} (${voice.lang}).`);
      selectedVoiceURI = voice.voiceURI;
      renderVoices();
    };

    utterance.onend = resolve;
    utterance.onerror = resolve;

    window.speechSynthesis.speak(utterance);
  });
}

async function testFilteredVoices() {
  const filteredVoices = getFilteredVoices();

  if (!supportsSpeechSynthesis()) {
    setPlaybackStatus("Lecture impossible : speechSynthesis n'est pas disponible.");
    return;
  }

  if (filteredVoices.length === 0) {
    setPlaybackStatus("Aucune voix filtrée à tester.");
    return;
  }

  sequenceCancelled = false;
  window.speechSynthesis.cancel();

  for (const voice of filteredVoices) {
    if (sequenceCancelled) {
      setPlaybackStatus("Test séquentiel arrêté.");
      return;
    }

    const familyKey = voice.lang.slice(0, 2).toLowerCase();
    const text = sequentialTestText[familyKey] || sequentialTestText[activeFamily] || sequentialTestText.all;
    await speakVoiceInSequence(voice, text);
  }

  setPlaybackStatus("Toutes les voix filtrées ont été testées.");
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFamily = button.dataset.family;
    document.querySelectorAll(".filter-button").forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });
    renderVoices();
  });
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const preset = button.dataset.preset;
    testText.value = testTexts[preset];
  });
});

[rateInput, pitchInput, volumeInput].forEach((input) => {
  input.addEventListener("input", updateSliderLabels);
});

refreshButton.addEventListener("click", loadVoices);
speakButton.addEventListener("click", speakSelectedVoice);
testFilteredButton.addEventListener("click", testFilteredVoices);

stopButton.addEventListener("click", () => {
  sequenceCancelled = true;
  window.speechSynthesis.cancel();
  setPlaybackStatus("Lecture arrêtée.");
});

pauseButton.addEventListener("click", () => {
  window.speechSynthesis.pause();
  setPlaybackStatus("Lecture en pause.");
});

resumeButton.addEventListener("click", () => {
  window.speechSynthesis.resume();
  setPlaybackStatus("Lecture reprise.");
});

if (supportsSpeechSynthesis()) {
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

testText.value = testTexts.es;
updateSliderLabels();
loadVoices();
