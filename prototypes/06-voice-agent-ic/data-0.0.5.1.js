const languageCatalog = {
  es: {
    id: "es",
    label: "Espagnol",
    speechLang: "es-ES",
    family: "romane",
    status: "majoritaire",
    notes: "Langue romane utilisée dans REPLI4C."
  },
  "es-ar": {
    id: "es-ar",
    label: "Espagnol argentin",
    speechLang: "es-AR",
    family: "romane",
    status: "majoritaire",
    notes:
      "Variété argentine de l'espagnol. Selon le navigateur, la synthèse peut basculer vers es-ES ou es-US."
  },
  it: {
    id: "it",
    label: "Italien",
    speechLang: "it-IT",
    family: "romane",
    status: "majoritaire",
    notes: "Langue romane utilisée dans les échanges plurilingues."
  },
  ptBr: {
    id: "ptBr",
    label: "Portugais du Brésil",
    speechLang: "pt-BR",
    family: "romane",
    status: "majoritaire",
    notes: "Variété brésilienne du portugais, présente dans le contexte REPLI4C."
  },
  fr: {
    id: "fr",
    label: "Français",
    speechLang: "fr-FR",
    family: "romane",
    status: "majoritaire",
    notes: "Langue romane et langue de réponse de l'apprenant dans ce prototype."
  },
  ro: {
    id: "ro",
    label: "Roumain",
    speechLang: "ro-RO",
    family: "romane",
    status: "majoritaire",
    notes:
      "Langue romane ajoutée pour tester l'ouverture du prototype à l'Europe de l'Est."
  },
  ca: {
    id: "ca",
    label: "Catalan",
    speechLang: "ca-ES",
    family: "romane",
    status: "minoritaire / régionale",
    notes:
      "Langue romane ajoutée pour explorer les langues régionales ou minoritaires dans IC-Lab."
  }
};

const placeCatalog = {
  valencia: {
    id: "valencia",
    label: "Valencia",
    country: "Espagne",
    background: "images/Espagne.png",
    climateTheme: "étés plus longs et plus chauds",
    notes: "Lieu associé au témoignage de Clara."
  },
  italyDryness: {
    id: "italyDryness",
    label: "Italie",
    country: "Italie",
    background: "images/Italie.png",
    climateTheme: "sécheresses plus fréquentes",
    notes: "Lieu générique associé au témoignage de Marco."
  },
  brazilRain: {
    id: "brazilRain",
    label: "Brésil",
    country: "Brésil",
    background: "images/Bresil.png",
    climateTheme: "pluies plus fortes",
    notes: "Lieu associé au témoignage d'Ana."
  },
  grenoble: {
    id: "grenoble",
    label: "Grenoble",
    country: "France",
    background: "images/Grenoble.png",
    climateTheme: "canicules urbaines et nuits étouffantes",
    notes: "Lieu associé au témoignage de Malik."
  },
  buenosAires: {
    id: "buenosAires",
    label: "Buenos Aires",
    country: "Argentine",
    background: "images/Buenos-Aires.png",
    climateTheme: "vagues de chaleur, manque d'eau et ville",
    notes: "Lieu associé au témoignage de Lucía."
  },
  bucarest: {
    id: "bucarest",
    label: "Bucarest",
    country: "Roumanie",
    background: "images/Bucarest.png",
    climateTheme: "étés plus chauds, pluies brusques et saisons instables",
    notes: "Lieu associé au témoignage d'Andrei."
  },
  catalonia: {
    id: "catalonia",
    label: "Catalogne",
    country: "Espagne",
    background: "images/Cataluna.png",
    climateTheme: "sécheresse, restrictions d'eau et chaleur",
    notes: "Lieu associé au témoignage de Laia."
  }
};

const characterCatalog = {
  clara: {
    id: "clara",
    displayName: "Clara",
    languageId: "es",
    placeId: "valencia",
    image: "images/Clara.png",
    role: "Étudiante",
    shortBio: "Étudiante à Valencia.",
    voiceProfile: {
      preferredLang: "es-ES"
    },
    tags: ["chaleur", "été", "Espagne"]
  },
  marco: {
    id: "marco",
    displayName: "Marco",
    languageId: "it",
    placeId: "italyDryness",
    image: "images/Marco.png",
    role: "Étudiant",
    shortBio: "Étudiant italien témoignant de la sécheresse.",
    voiceProfile: {
      preferredLang: "it-IT"
    },
    tags: ["sécheresse", "Italie", "fréquence"]
  },
  ana: {
    id: "ana",
    displayName: "Ana",
    languageId: "ptBr",
    placeId: "brazilRain",
    image: "images/Ana.png",
    role: "Étudiante",
    shortBio: "Étudiante brésilienne témoignant des pluies fortes.",
    voiceProfile: {
      preferredLang: "pt-BR"
    },
    tags: ["pluie", "Brésil", "intensité"]
  },
  malik: {
    id: "malik",
    displayName: "Malik",
    languageId: "fr",
    placeId: "grenoble",
    image: "images/Malik.png",
    role: "Étudiant",
    shortBio: "Étudiant francophone à Grenoble.",
    voiceProfile: {
      preferredLang: "fr-FR"
    },
    tags: ["canicule", "ville", "nuits"]
  },
  lucia: {
    id: "lucia",
    displayName: "Lucía",
    languageId: "es-ar",
    placeId: "buenosAires",
    image: "images/Lucia.png",
    role: "Étudiante",
    shortBio: "Étudiante argentine à Buenos Aires.",
    voiceProfile: {
      preferredLang: "es-AR",
      fallbackLangs: ["es-ES", "es-US"]
    },
    tags: ["chaleur", "eau", "ville"]
  },
  andrei: {
    id: "andrei",
    displayName: "Andrei",
    languageId: "ro",
    placeId: "bucarest",
    image: "images/Andrei.png",
    role: "Étudiant",
    shortBio: "Étudiant roumanophone à Bucarest.",
    voiceProfile: {
      preferredLang: "ro-RO"
    },
    tags: ["été", "pluies", "saisons"]
  },
  laia: {
    id: "laia",
    displayName: "Laia",
    languageId: "ca",
    placeId: "catalonia",
    image: "images/Laia.png",
    role: "Étudiante",
    shortBio: "Étudiante catalanophone en Catalogne.",
    voiceProfile: {
      preferredLang: "ca-ES"
    },
    tags: ["sécheresse", "eau", "Catalogne"]
  }
};

const scenarioCatalog = {
  repli4cClimateRoundtable: {
    id: "repli4cClimateRoundtable",
    title: "Rencontre plurilingue REPLI4C",
    description:
      "Des étudiants témoignent dans leur langue romane autour d'expériences liées au changement climatique.",
    instruction:
      "Écoutez les participantes et participants comme dans une mini-rencontre REPLI4C. Observez la personne qui parle, gardez quelques mots proches, puis répondez en français.",
    participants: ["clara", "marco", "ana"],
    steps: [
      {
        characterId: "clara",
        text: "En Valencia los veranos son más largos y más calurosos.",
        transparentWords: "veranos, largos, calurosos",
        next: "Ensuite : une autre personne témoignera."
      },
      {
        characterId: "marco",
        text: "Negli ultimi anni abbiamo avuto periodi di siccità più frequenti.",
        transparentWords: "ultimi, periodi, frequenti",
        next: "Ensuite : une autre personne témoignera."
      },
      {
        characterId: "ana",
        text: "As chuvas estão mais fortes do que antes.",
        transparentWords: "chuvas, fortes, antes",
        next: "Ensuite : une autre personne témoignera."
      },
      {
        characterId: "malik",
        text: "À Grenoble, les étés sont plus chauds et les nuits restent parfois étouffantes.",
        transparentWords: "étés, chauds, nuits",
        next: "Ensuite : une autre personne témoignera."
      },
      {
        characterId: "lucia",
        text: "En Buenos Aires las olas de calor son más frecuentes y a veces falta agua.",
        transparentWords: "olas, calor, frecuentes, agua",
        next: "Ensuite : une autre personne témoignera."
      },
      {
        characterId: "andrei",
        text: "În ultimii ani, verile sunt mai calde și ploile vin mai brusc.",
        transparentWords: "ultimii, ani, verile, calde",
        next: "Ensuite : une autre personne témoignera."
      },
      {
        characterId: "laia",
        text: "A Catalunya, la sequera és més llarga i hem de cuidar més l'aigua.",
        transparentWords: "Catalunya, sequera, llarga, aigua",
        next: "Ensuite : une autre personne témoignera."
      }
    ],
    commonQuestion:
      "Question commune : quels changements avez-vous compris et quels points communs reliez-vous entre les témoignages ?",
    fallbackUtterance:
      "Je comprends plusieurs effets du changement climatique : chaleur, sécheresse, manque d'eau, pluies fortes ou saisons instables.",
    initialObservation: {
      transparent:
        "Les indices transparents varient selon les langues, mais ils restent souvent liés au climat, aux saisons, à l'eau ou à la chaleur.",
      clarification:
        "L'attention est dirigée vers des personnes, des lieux et des phénomènes plutôt que vers une traduction complète.",
      reformulation:
        "La compréhension globale se construit par associations successives : personne, langue, lieu, phénomène.",
      partial:
        "L'apprenant peut accepter des zones d'incertitude tout en reconstruisant un thème commun."
    },
    analysis: {
      keywords: [
        "ete",
        "etes",
        "chaud",
        "chauds",
        "chaleur",
        "canicule",
        "nuit",
        "nuits",
        "secheresse",
        "sec",
        "eau",
        "pluie",
        "pluies",
        "fort",
        "forte",
        "fortes",
        "saison",
        "saisons",
        "climat",
        "climatique",
        "changement",
        "changements",
        "commun",
        "communs",
        "clara",
        "marco",
        "ana",
        "malik",
        "lucia",
        "andrei",
        "laia"
      ],
      response:
        "Merci. Vous reconstruisez bien la rencontre : les témoignages évoquent des effets locaux du changement climatique, avec des points communs autour de la chaleur, de l'eau, des saisons ou des événements plus intenses.",
      observation: {
        transparent:
          "Les mots proches et les thèmes récurrents aident à relier plusieurs langues romanes.",
        clarification:
          "La réponse associe chaque personne à un phénomène et compare les témoignages.",
        reformulation:
          "La rencontre devient une carte de sens : personnes, lieux, langues et changements observés.",
        partial:
          "La compréhension globale émerge malgré des détails incertains dans chaque langue."
      }
    },
    partial: {
      response:
        "On peut reconstruire avec quelques appuis : chaleur, eau, sécheresse, pluies ou saisons instables. Vous pouvez formuler une hypothèse commune autour du climat qui change.",
      observation: {
        transparent:
          "Quelques mots-appuis suffisent pour relancer la compréhension.",
        clarification:
          "La relance repart des personnes visibles pour réduire la charge de comparaison.",
        reformulation:
          "Chaque témoignage est résumé en un phénomène avant de chercher le thème commun.",
        partial:
          "L'incertitude reste normale : l'objectif est une reconstruction plausible, pas une traduction."
      }
    }
  }
};

const activeScenarioId = "repli4cClimateRoundtable";
