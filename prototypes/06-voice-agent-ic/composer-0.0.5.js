const STORAGE_KEY = "proto06SelectedCharacters";
const MIN_SELECTION = 2;
const MAX_SELECTION = 4;

const characterList = document.querySelector("#characterList");
const selectedList = document.querySelector("#selectedList");
const selectionStatus = document.querySelector("#selectionStatus");
const meetingPreview = document.querySelector("#meetingPreview");
const configOutput = document.querySelector("#configOutput");
const launchButton = document.querySelector("#launchButton");
const resetButton = document.querySelector("#resetButton");

const baseScenario = scenarioCatalog[activeScenarioId];
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

function formatList(values) {
  return [...new Set(values)].join(", ");
}

function buildScenarioFromSelection(selectionIds) {
  const validIds = selectionIds.filter((id) => characterCatalog[id]);
  const bundles = validIds.map(getCharacterBundle);
  const names = bundles.map(({ character }) => character.displayName);
  const climateThemes = bundles.map(({ place }) => place.climateTheme);
  const keywords = bundles.flatMap(({ character, place }) => [
    character.displayName,
    ...character.tags,
    place.climateTheme
  ]);

  const steps = bundles.map(({ character, language }, index) => {
    const catalogStep = getScenarioStepForCharacter(character.id);
    const nextBundle = bundles[index + 1];

    return {
      characterId: character.id,
      text:
        catalogStep?.text ||
        `Témoignage à compléter pour ${character.displayName}.`,
      transparentWords:
        catalogStep?.transparentWords ||
        character.tags.slice(0, 3).join(", ") ||
        language.label,
      next: nextBundle
        ? `Ensuite : ${nextBundle.character.displayName} témoignera en ${nextBundle.language.label.toLowerCase()}.`
        : "Ensuite : à vous de reconstruire les points communs.",
      observation: catalogStep?.observation || null
    };
  });

  return {
    id: "composedMeeting",
    title: "Rencontre REPLI4C composée",
    description:
      "Rencontre expérimentale construite à partir des personnages sélectionnés dans le catalogue.",
    instruction:
      "Écoutez les témoignages comme dans une rencontre REPLI4C. Appuyez-vous sur les mots proches, les lieux et les expériences pour reconstruire un sens global.",
    participants: validIds,
    steps,
    commonQuestion: `Question commune : quels changements avez-vous compris et quels points communs reliez-vous entre ${names.join(", ")} ?`,
    fallbackUtterance: `Je comprends des changements liés à ${formatList(climateThemes)}. Le point commun est le changement climatique vécu dans différents lieux.`,
    initialObservation: {
      transparent:
        "Les mots transparents et les indices proches servent de premiers appuis entre langues romanes.",
      clarification:
        "La rencontre composée invite à comparer plusieurs voix, lieux et phénomènes.",
      reformulation:
        "Le sens global se reconstruit en associant chaque personne à une expérience climatique.",
      partial:
        "Certains détails peuvent rester incertains, mais une hypothèse commune peut déjà émerger."
    },
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
        "Merci. Vous reliez plusieurs témoignages et vous construisez une compréhension globale de la rencontre, même si certains détails restent incertains.",
      observation: {
        transparent:
          "Les mots proches et les noms de phénomènes permettent d'entrer dans le sens sans traduire phrase par phrase.",
        clarification:
          "La réponse cherche des liens entre les personnes plutôt qu'une traduction isolée.",
        reformulation:
          "Chaque témoignage devient un indice dans une synthèse collective.",
        partial:
          "L'incertitude est acceptée comme une étape normale de l'intercompréhension."
      }
    },
    partial: {
      response:
        "On peut repartir des personnes, des lieux et de quelques mots proches pour formuler une hypothèse commune sur le climat qui change.",
      observation: {
        transparent:
          "Même quelques indices suffisent pour commencer la reconstruction.",
        clarification:
          "La clarification porte sur le thème partagé entre les témoignages.",
        reformulation:
          "La rencontre peut être résumée en associations simples : personne, lieu, phénomène.",
        partial:
          "La compréhension partielle reste utile pour produire une synthèse plausible."
      }
    }
  };
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

function renderCharacters() {
  characterList.innerHTML = "";

  Object.keys(characterCatalog).forEach((characterId) => {
    const { character, language, place } = getCharacterBundle(characterId);
    const isSelected = selectedCharacterIds.includes(characterId);
    const card = document.createElement("article");
    const image = document.createElement("img");
    const content = document.createElement("div");
    const title = document.createElement("h2");
    const meta = document.createElement("p");
    const theme = document.createElement("p");
    const tags = document.createElement("div");
    const button = document.createElement("button");

    card.className = "character-card";
    card.classList.toggle("is-selected", isSelected);

    image.src = character.image;
    image.alt = character.displayName;

    title.textContent = character.displayName;
    meta.textContent = `${language.label} - ${place.label}, ${place.country}`;
    theme.textContent = place.climateTheme;
    theme.className = "theme";
    tags.className = "tags";

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

    content.append(title, meta, theme, tags, button);
    card.append(image, content);
    characterList.append(card);
  });
}

function renderSelection() {
  selectedList.innerHTML = "";

  selectedCharacterIds.forEach((characterId, index) => {
    const { character, language, place } = getCharacterBundle(characterId);
    const item = document.createElement("li");
    item.innerHTML = `<strong>${index + 1}. ${character.displayName}</strong><span>${language.label} - ${place.country}</span>`;
    selectedList.append(item);
  });

  const count = selectedCharacterIds.length;
  selectionStatus.textContent =
    count < MIN_SELECTION
      ? `Sélectionnez au moins ${MIN_SELECTION} personnages.`
      : `${count} personnage${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""}.`;
}

function renderPreview() {
  const scenario = buildScenarioFromSelection(selectedCharacterIds);
  const bundles = selectedCharacterIds.map(getCharacterBundle);
  const languages = formatList(bundles.map(({ language }) => language.label));
  const places = formatList(
    bundles.map(({ place }) => `${place.label} (${place.country})`)
  );
  const themes = formatList(bundles.map(({ place }) => place.climateTheme));

  meetingPreview.innerHTML = `
    <dl>
      <div><dt>Ordre</dt><dd>${bundles
        .map(({ character }) => character.displayName)
        .join(" → ")}</dd></div>
      <div><dt>Langues</dt><dd>${languages}</dd></div>
      <div><dt>Lieux</dt><dd>${places}</dd></div>
      <div><dt>Thème</dt><dd>${themes}</dd></div>
      <div><dt>Question</dt><dd>${scenario.commonQuestion}</dd></div>
    </dl>
  `;
  configOutput.textContent = JSON.stringify(scenario, null, 2);
}

function renderActions() {
  launchButton.disabled = selectedCharacterIds.length < MIN_SELECTION;
}

function render() {
  renderCharacters();
  renderSelection();
  renderPreview();
  renderActions();
}

launchButton.addEventListener("click", () => {
  if (selectedCharacterIds.length < MIN_SELECTION) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCharacterIds));
  window.location.href = "index-0.0.5.html";
});

resetButton.addEventListener("click", () => {
  selectedCharacterIds = [...baseScenario.participants].slice(0, 3);
  render();
});

render();
