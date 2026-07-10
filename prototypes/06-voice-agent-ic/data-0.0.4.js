const languageCatalog = {
  es: {
    id: "es",
    label: "Espagnol",
    speechLang: "es-ES",
    family: "romane",
    status: "majoritaire",
    notes: "Langue romane utilisée dans REPLI4C."
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
    notes: "Langue de réponse de l'apprenant dans ce prototype."
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
  }
};

const scenarioCatalog = {
  repli4cClimateRoundtable: {
    id: "repli4cClimateRoundtable",
    title: "Rencontre plurilingue REPLI4C",
    description:
      "Trois étudiants témoignent dans leur langue romane autour d'expériences liées au changement climatique.",
    instruction:
      "Écoutez Clara, Marco et Ana comme dans une mini-rencontre REPLI4C. Observez la personne qui parle, gardez quelques mots proches, puis répondez en français.",
    participants: ["clara", "marco", "ana"],
    steps: [
      {
        characterId: "clara",
        text: "En Valencia los veranos son más largos y más calurosos.",
        transparentWords: "veranos, largos, calurosos",
        next: "Ensuite : Marco témoignera en italien."
      },
      {
        characterId: "marco",
        text: "Negli ultimi anni abbiamo avuto periodi di siccità più frequenti.",
        transparentWords: "ultimi, periodi, frequenti",
        next: "Ensuite : Ana témoignera en portugais du Brésil."
      },
      {
        characterId: "ana",
        text: "As chuvas estão mais fortes do que antes.",
        transparentWords: "chuvas, fortes, antes",
        next: "Ensuite : à vous de reconstruire les points communs."
      }
    ],
    commonQuestion:
      "Question commune : quels changements avez-vous compris et quels points communs reliez-vous entre Clara, Marco et Ana ?",
    fallbackUtterance:
      "Je comprends que Clara parle de chaleur, Marco de sécheresse et Ana de pluies plus fortes. Le point commun est le changement climatique.",
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
  }
};

const activeScenarioId = "repli4cClimateRoundtable";
