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

const pedagogicalScenarioCatalog = {
  globalUnderstanding: {
    id: "globalUnderstanding",
    title: "Compréhension globale",
    shortTitle: "Compréhension globale",
    description:
      "Reconstruire les changements climatiques évoqués et les points communs entre les témoignages.",
    taskType: "reconstruction",
    commonQuestion:
      "Quels changements avez-vous compris et quels points communs reliez-vous entre les participants ?",
    observationFocus: ["mots transparents", "compréhension partielle", "thème commun"],
    recommendedParticipantCount: 3,
    difficulty: "modérée",
    instruction:
      "Écoutez les témoignages et reconstruisez le thème commun à partir d'indices partiels.",
    initialObservation: {
      transparent:
        "Les mots proches et les indices climatiques servent de premiers appuis.",
      clarification:
        "La tâche consiste à relier les témoignages plutôt qu'à traduire chaque phrase.",
      reformulation:
        "Le sens global se construit en comparant les phénomènes évoqués.",
      partial:
        "Une compréhension partielle peut suffire pour identifier un thème commun."
    }
  },
  affectsFeelings: {
    id: "affectsFeelings",
    title: "Affects et ressentis",
    shortTitle: "Ressentis",
    description:
      "Repérer les émotions, inquiétudes ou perceptions associées aux situations climatiques.",
    taskType: "interprétation",
    commonQuestion:
      "Quelles émotions, inquiétudes ou perceptions ressentez-vous dans ces témoignages ?",
    observationFocus: ["émotions", "perceptions", "vécu local"],
    recommendedParticipantCount: 3,
    difficulty: "modérée",
    instruction:
      "Écoutez les témoignages en cherchant ce qu'ils suggèrent comme vécu, inquiétude ou perception.",
    initialObservation: {
      transparent:
        "Certains mots du climat orientent vers des ressentis : chaleur, manque d'eau, sécheresse, pluies.",
      clarification:
        "L'observation porte sur ce que les situations font ressentir, même si les émotions ne sont pas toutes nommées.",
      reformulation:
        "L'apprenant transforme des indices factuels en hypothèses sur le vécu des personnes.",
      partial:
        "Les affects peuvent être reconstruits prudemment à partir du contexte et des phénomènes."
    }
  },
  adaptationStrategies: {
    id: "adaptationStrategies",
    title: "Stratégies d'adaptation",
    shortTitle: "Adaptations",
    description:
      "Imaginer des réponses possibles face aux situations climatiques décrites.",
    taskType: "projection pratique",
    commonQuestion:
      "Quelles adaptations ou réponses possibles imaginez-vous face aux situations décrites ?",
    observationFocus: ["réponses possibles", "comparaison des lieux", "action"],
    recommendedParticipantCount: 3,
    difficulty: "modérée à élevée",
    instruction:
      "Écoutez les témoignages, puis passez du constat climatique aux réponses possibles.",
    initialObservation: {
      transparent:
        "Les indices de situation aident à imaginer des réponses adaptées à chaque lieu.",
      clarification:
        "La compréhension sert ici à formuler des pistes d'action, pas seulement à résumer.",
      reformulation:
        "Chaque témoignage devient un problème local auquel associer une réponse possible.",
      partial:
        "Même une compréhension incomplète peut ouvrir une hypothèse d'adaptation."
    }
  },
  prospectiveStories: {
    id: "prospectiveStories",
    title: "Récits prospectifs",
    shortTitle: "Futurs possibles",
    description:
      "Imaginer l'évolution des lieux dans dix ou vingt ans à partir des témoignages.",
    taskType: "projection narrative",
    commonQuestion:
      "Imaginez ces lieux dans dix ou vingt ans : qu'est-ce qui pourrait changer ?",
    observationFocus: ["futurs possibles", "lieux", "projection"],
    recommendedParticipantCount: 3,
    difficulty: "élevée",
    instruction:
      "Écoutez les témoignages comme des points de départ pour imaginer des futurs possibles.",
    initialObservation: {
      transparent:
        "Les mots liés aux saisons, à l'eau et à la chaleur donnent des pistes de projection.",
      clarification:
        "L'objectif est de construire un récit plausible à partir d'indices partiels.",
      reformulation:
        "Les situations présentes deviennent des scénarios possibles pour les lieux entendus.",
      partial:
        "La projection accepte l'incertitude : elle formule des possibles, pas des certitudes."
    }
  },
  transparentWords: {
    id: "transparentWords",
    title: "Mots transparents et indices",
    shortTitle: "Mots transparents",
    description:
      "Identifier les mots, ressemblances et indices qui aident à comprendre chaque témoignage.",
    taskType: "repérage stratégique",
    commonQuestion:
      "Quels mots ou indices vous ont aidé à comprendre chaque témoignage ?",
    observationFocus: ["indices lexicaux", "ressemblances", "stratégies"],
    recommendedParticipantCount: 3,
    difficulty: "accessible",
    instruction:
      "Écoutez les témoignages en notant les mots proches, les ressemblances et les indices de contexte.",
    initialObservation: {
      transparent:
        "Les mots transparents sont au centre de la tâche : ils deviennent des points d'appui explicites.",
      clarification:
        "On observe les stratégies de repérage plutôt que le résultat final seulement.",
      reformulation:
        "Chaque mot reconnu peut être reformulé comme un indice de compréhension.",
      partial:
        "Les zones non comprises restent acceptables si les indices repérés sont explicités."
    }
  },
  clarificationZones: {
    id: "clarificationZones",
    title: "Zones floues et clarification",
    shortTitle: "Clarification",
    description:
      "Repérer ce qui reste incertain et formuler une question pour négocier le sens.",
    taskType: "clarification",
    commonQuestion:
      "Quel passage reste flou ? Quelle question poseriez-vous au groupe pour clarifier ?",
    observationFocus: ["incertitude", "questions", "reformulation"],
    recommendedParticipantCount: 3,
    difficulty: "modérée",
    instruction:
      "Écoutez les témoignages en acceptant les zones floues, puis préparez une question de clarification.",
    initialObservation: {
      transparent:
        "Les indices reconnus permettent de localiser aussi ce qui reste incertain.",
      clarification:
        "La tâche valorise la demande de clarification comme stratégie d'intercompréhension.",
      reformulation:
        "Une zone floue peut être transformée en question adressée au groupe.",
      partial:
        "Ne pas tout comprendre devient un matériau de négociation du sens."
    }
  }
};

const activeScenarioId = "repli4cClimateRoundtable";
const activePedagogicalScenarioId = "globalUnderstanding";
