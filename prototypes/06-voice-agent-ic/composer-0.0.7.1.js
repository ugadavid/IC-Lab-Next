const CHARACTER_STORAGE_KEY = "proto06SelectedCharacters";
const SCENARIO_STORAGE_KEY = "proto06SelectedPedagogicalScenario";
const MIN_SELECTION = 2;
const MAX_SELECTION = 4;
const debugEnabled = localStorage.getItem("proto06Debug") === "1";

window.proto06Debug = function proto06Debug(enable = true) {
  if (enable) {
    localStorage.setItem("proto06Debug", "1");
  } else {
    localStorage.removeItem("proto06Debug");
  }

  location.reload();
};

const scenarioList = document.querySelector("#scenarioList");
const characterList = document.querySelector("#characterList");
const selectedList = document.querySelector("#selectedList");
const selectionStatus = document.querySelector("#selectionStatus");
const meetingPreview = document.querySelector("#meetingPreview");
const configOutput = document.querySelector("#configOutput");
const launchButton = document.querySelector("#launchButton");
const resetButton = document.querySelector("#resetButton");

const baseScenario = scenarioCatalog[activeScenarioId];
let selectedPedagogicalScenarioId = activePedagogicalScenarioId;
let selectedCharacterIds = [...baseScenario.participants].slice(0, 3);

function getCatalogItem(catalog, id, label) {
  const item = catalog[id];

  if (!item) {
    throw new Error(`${label} introuvable : ${id}`);
  }

  return item;
}

function getCharacterBundle(characterId) {
  const character = getCatalogItem(characterCatalog, characterId, "Personnage");
  const language = getCatalogItem(languageCatalog, character.languageId, "Langue");
  const place = getCatalogItem(placeCatalog, character.placeId, "Lieu");

  return { character, language, place };
}

function getScenarioStepForCharacter(characterId) {
  return baseScenario.steps.find((step) => step.characterId === characterId);
}

function getTestimonyForCharacter(characterId, pedagogicalScenarioId) {
  const variants = testimonyVariantCatalog[characterId] || {};
  const selectedVariant = variants[pedagogicalScenarioId];
  const globalVariant = variants.globalUnderstanding;
  const catalogStep = getScenarioStepForCharacter(characterId);

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

  if (catalogStep) {
    return {
      text: catalogStep.text,
      transparentWords: catalogStep.transparentWords,
      tags: [],
      translationFr: "",
      fallbackUsed: true,
      fallbackSource: "scenarioCatalog"
    };
  }

  return {
    text: `Témoignage à compléter pour ${characterId}.`,
    transparentWords: "témoignage à compléter",
    tags: ["à compléter"],
    translationFr: "",
    fallbackUsed: true,
    fallbackSource: "placeholder"
  };
}

function formatList(values) {
  return [...new Set(values)].join(", ");
}

function buildScenarioFromSelection(selectionIds, pedagogicalScenarioId) {
  const pedagogicalScenario = getCatalogItem(
    pedagogicalScenarioCatalog,
    pedagogicalScenarioId,
    "Scénario pédagogique"
  );
  const validIds = selectionIds.filter((id) => characterCatalog[id]);
  const bundles = validIds.map(getCharacterBundle);
  const names = bundles.map(({ character }) => character.displayName);
  const climateThemes = bundles.map(({ place }) => place.climateTheme);
  const keywords = bundles.flatMap(({ character, place }) => [
    character.displayName,
    ...character.tags,
    place.climateTheme,
    ...pedagogicalScenario.observationFocus
  ]);

  const steps = bundles.map(({ character, language }, index) => {
    const testimony = getTestimonyForCharacter(character.id, pedagogicalScenarioId);
    const nextBundle = bundles[index + 1];

    return {
      characterId: character.id,
      text: testimony.text,
      transparentWords: testimony.transparentWords,
      tags: testimony.tags || [],
      translationFr: testimony.translationFr || "",
      fallbackUsed: Boolean(testimony.fallbackUsed),
      fallbackSource: testimony.fallbackSource || "non renseigné",
      next: nextBundle
        ? `Ensuite : ${nextBundle.character.displayName} témoignera en ${nextBundle.language.label.toLowerCase()}.`
        : "Ensuite : à vous de reconstruire les points communs.",
      observation: null
    };
  });

  return {
    id: "composedMeeting",
    title: `Rencontre REPLI4C - ${pedagogicalScenario.shortTitle}`,
    description:
      "Rencontre expérimentale construite à partir d'un scénario pédagogique et de personnages sélectionnés.",
    instruction: pedagogicalScenario.instruction,
    pedagogicalScenario,
    participants: validIds,
    steps,
    commonQuestion: `Question commune : ${pedagogicalScenario.commonQuestion}`,
    fallbackUtterance: `Je comprends des changements liés à ${formatList(climateThemes)}. Pour l'activité "${pedagogicalScenario.shortTitle}", je peux répondre à partir de ces indices.`,
    initialObservation: pedagogicalScenario.initialObservation,
    analysis: {
      keywords: [
        ...new Set(
          keywords
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
    },
    preview: {
      names,
      climateThemes
    }
  };
}

function toggleScenario(scenarioId) {
  selectedPedagogicalScenarioId = scenarioId;
  render();
}

function toggleSelection(characterId) {
  const alreadySelected = selectedCharacterIds.includes(characterId);

  if (alreadySelected) {
    selectedCharacterIds = selectedCharacterIds.filter((id) => id !== characterId);
  } else if (selectedCharacterIds.length < MAX_SELECTION) {
    selectedCharacterIds = [...selectedCharacterIds, characterId];
  }

  render();
}

function renderScenarios() {
  scenarioList.innerHTML = "";

  Object.values(pedagogicalScenarioCatalog).forEach((scenario) => {
    const isSelected = scenario.id === selectedPedagogicalScenarioId;
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const meta = document.createElement("div");
    const focus = document.createElement("div");
    const button = document.createElement("button");

    card.className = "scenario-card";
    card.classList.toggle("is-selected", isSelected);
    title.textContent = scenario.title;
    description.textContent = scenario.description;
    meta.className = "scenario-meta";
    meta.innerHTML = `<span>${scenario.taskType}</span><span>${scenario.difficulty}</span><span>${scenario.recommendedParticipantCount} pers. conseillé</span>`;
    focus.className = "tag-list";

    scenario.observationFocus.forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = item;
      focus.append(chip);
    });

    button.type = "button";
    button.textContent = isSelected ? "Sélectionné" : "Choisir";
    button.setAttribute("aria-label", `Choisir le scénario ${scenario.title}`);
    button.addEventListener("click", () => toggleScenario(scenario.id));

    card.append(title, description, meta, focus, button);
    scenarioList.append(card);
  });
}

function renderCharacters() {
  characterList.innerHTML = "";

  Object.keys(characterCatalog).forEach((characterId) => {
    const { character, language, place } = getCharacterBundle(characterId);
    const isSelected = selectedCharacterIds.includes(characterId);
    const card = document.createElement("article");
    const figure = document.createElement("div");
    const image = document.createElement("img");
    const content = document.createElement("div");
    const title = document.createElement("h2");
    const meta = document.createElement("p");
    const theme = document.createElement("p");
    const tags = document.createElement("div");
    const button = document.createElement("button");

    card.className = "character-card";
    card.classList.toggle("is-selected", isSelected);
    figure.className = "character-figure";
    content.className = "character-content";

    image.src = character.image;
    image.alt = character.displayName;

    title.textContent = character.displayName;
    meta.textContent = `${language.label} - ${place.label}, ${place.country}`;
    theme.textContent = place.climateTheme;
    theme.className = "theme";
    tags.className = "tag-list";

    character.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      tags.append(chip);
    });

    button.type = "button";
    button.textContent = isSelected ? "Retirer" : "Ajouter";
    button.setAttribute(
      "aria-label",
      isSelected
        ? `Retirer ${character.displayName} de la rencontre`
        : `Ajouter ${character.displayName} à la rencontre`
    );
    button.disabled = !isSelected && selectedCharacterIds.length >= MAX_SELECTION;
    button.addEventListener("click", () => toggleSelection(characterId));

    figure.append(image);
    content.append(title, meta, theme, tags, button);
    card.append(figure, content);
    characterList.append(card);
  });
}

function renderSelection() {
  selectedList.innerHTML = "";

  selectedCharacterIds.forEach((characterId, index) => {
    const { character, language, place } = getCharacterBundle(characterId);
    const item = document.createElement("li");
    item.innerHTML = `<strong>${index + 1}. ${character.displayName}</strong><span>${language.label}</span><span>${place.country}</span>`;
    selectedList.append(item);
  });

  const count = selectedCharacterIds.length;
  selectionStatus.textContent =
    count < MIN_SELECTION
      ? `Sélectionnez au moins ${MIN_SELECTION} personnages.`
      : `${count} personnage${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}.`;
}

function renderPreview() {
  const scenario = buildScenarioFromSelection(
    selectedCharacterIds,
    selectedPedagogicalScenarioId
  );
  const pedagogicalScenario = scenario.pedagogicalScenario;
  const bundles = selectedCharacterIds.map(getCharacterBundle);
  const languages = formatList(bundles.map(({ language }) => language.label));
  const places = formatList(
    bundles.map(({ place }) => `${place.label} (${place.country})`)
  );
  const themes = formatList(bundles.map(({ place }) => place.climateTheme));
  const excerpts = scenario.steps
    .map((step) => {
      const character = getCatalogItem(characterCatalog, step.characterId, "Personnage");
      return `<li><strong>${character.displayName}</strong><span>${step.text}</span></li>`;
    })
    .join("");
  const missingVariants = selectedCharacterIds.filter(
    (characterId) =>
      !testimonyVariantCatalog[characterId]?.[selectedPedagogicalScenarioId]
  );
  const variantCount = selectedCharacterIds.reduce(
    (count, characterId) =>
      count + Object.keys(testimonyVariantCatalog[characterId] || {}).length,
    0
  );
  const debugMarkup = debugEnabled
    ? `
      <div class="composer-debug">
        <strong>Debug IC-Lab</strong>
        <dl>
          <div><dt>Scénario ID</dt><dd>${selectedPedagogicalScenarioId}</dd></div>
          <div><dt>Personnages IDs</dt><dd>${selectedCharacterIds.join(", ")}</dd></div>
          <div><dt>Variantes disponibles</dt><dd>${variantCount}</dd></div>
          <div><dt>Variantes manquantes</dt><dd>${missingVariants.length ? missingVariants.join(", ") : "aucune"}</dd></div>
        </dl>
      </div>
    `
    : "";

  meetingPreview.innerHTML = `
    <dl>
      <div><dt>Activité</dt><dd>${pedagogicalScenario.title}</dd></div>
      <div><dt>Contexte discursif</dt><dd>${pedagogicalScenario.shortTitle} - les témoignages sont adaptés à cette activité.</dd></div>
      <div><dt>Ordre</dt><dd>${bundles
        .map(({ character }) => character.displayName)
        .join(" → ")}</dd></div>
      <div><dt>Langues</dt><dd>${languages}</dd></div>
      <div><dt>Lieux</dt><dd>${places}</dd></div>
      <div><dt>Thème</dt><dd>${themes}</dd></div>
      <div><dt>Question</dt><dd>${scenario.commonQuestion}</dd></div>
    </dl>
    <div class="excerpt-preview">
      <strong>Extraits utilisés</strong>
      <ul>${excerpts}</ul>
    </div>
    ${debugMarkup}
  `;
  configOutput.textContent = JSON.stringify(scenario, null, 2);
}

function renderActions() {
  launchButton.disabled = selectedCharacterIds.length < MIN_SELECTION;
}

function render() {
  renderScenarios();
  renderCharacters();
  renderSelection();
  renderPreview();
  renderActions();
}

launchButton.addEventListener("click", () => {
  if (selectedCharacterIds.length < MIN_SELECTION) {
    return;
  }

  localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(selectedCharacterIds));
  localStorage.setItem(SCENARIO_STORAGE_KEY, selectedPedagogicalScenarioId);
  window.location.href = "index-0.0.7.1.html";
});

resetButton.addEventListener("click", () => {
  selectedPedagogicalScenarioId = activePedagogicalScenarioId;
  selectedCharacterIds = [...baseScenario.participants].slice(0, 3);
  render();
});

render();
