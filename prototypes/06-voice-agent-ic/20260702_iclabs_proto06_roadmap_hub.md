# IC-Lab / Prototype 06 — Feuille de route vers une plateforme connectée

Date : 2026-07-02  
Statut : document de travail interne

## 1. Point de départ

Le Prototype 06 n’est plus seulement un agent vocal ou une rencontre plurilingue scénarisée.

Il est devenu progressivement :

1. une rencontre incarnée entre personnages plurilingues ;
2. un compositeur de rencontres ;
3. un atelier de scénarios pédagogiques ;
4. un système de variantes discursives ;
5. une administration locale d’activités enseignantes ;
6. une bibliothèque locale d’activités REPLI4C.

La V1.0 actuelle permet déjà de retrouver, filtrer, consulter, lancer, modifier, dupliquer, importer et exporter des activités locales ou natives.

Le prochain enjeu est donc de sortir du stockage local navigateur pour aller vers une mémoire connectée, puis vers un hub IC-Lab plus large.

## 2. Principe d’architecture

Ne pas faire porter à Prototype 06 toutes les responsabilités.

Séparer clairement :

```txt
IC-Lab Hub
├── Comptes
├── Rôles
├── Cours / groupes
├── Bibliothèque d’activités
├── Prototypes branchés
│   ├── Prototype 06 — Rencontres plurilingues
│   ├── Seven Sieves
│   ├── Dico-IC
│   └── Augmented IC Video
└── Services IA / voix / coûts
```

Le Prototype 06 doit rester un outil spécialisé.

Le Hub IC-Lab doit porter les comptes, les rôles, les cours, la bibliothèque commune, les accès aux différents prototypes, les configurations IA, les traces et les exports éventuels.

## 3. Rôles envisagés

### Admin

Gère l’environnement : comptes, droits, catalogues globaux, paramètres IA, visibilité des activités et maintenance.

### Enseignant

Peut créer des cours, créer/modifier/partager des activités, choisir les prototypes utilisés, assigner des activités à des groupes et consulter les productions ou traces disponibles.

### Étudiant

Peut accéder à un cours ou une activité, réaliser une activité, retrouver les ressources assignées par l’enseignant, éventuellement travailler sous pseudo ou via code de cours.

### Observateur / chercheur

Peut, selon autorisation, consulter des activités, observer des traces, exporter des données et analyser les usages.

## 4. Gestion des étudiants et des cours

Éviter autant que possible le compte partagé unique du type `prof-students`, sauf pour une démo très temporaire.

Piste recommandée :

```txt
Cours / groupe + code d’accès + identifiant étudiant léger
```

Exemple :

```txt
Cours : REPLI4C Grenoble 2026
Code : CLARA-842
Étudiant : pseudo ou identifiant temporaire
```

Cela permet plusieurs cours par enseignant, plusieurs niveaux, plusieurs groupes, des activités différentes selon les groupes, et des traces plus propres si nécessaire.

## 5. Objets centraux à prévoir

### User

Compte ou identité légère : id, nom affiché, email, rôle, préférences, date de création.

### Course

Cours ou groupe pédagogique : id, titre, enseignant responsable, description, niveau, code d’accès, activités assignées.

### Activity

Ressource pédagogique centrale : id, titre, auteur, objectif pédagogique, prototype cible, scénario, personnages, consignes, notes enseignantes, visibilité, version, tags, dates.

### Run / Session

Exécution d’une activité : id, activityId, userId ou pseudo, courseId, date, réponses, durée, traces éventuelles.

### Prototype

Référence à un outil IC-Lab : voice-meeting, seven-sieves, dico-ic, augmented-ic-video.

### AIConfig

Configuration IA / voix : provider, modèle, mode, voix, coût estimé, limite de durée, langue imposée, rôle pédagogique.

## 6. Feuille de route proposée

## V1.1 — Serveur local connecté pour les activités

Objectif : sortir la mémoire des activités de `localStorage`.

Architecture minimale :

```txt
server/
├── server.js
├── data/
│   └── activities.json
└── README.md
```

API minimale :

```txt
GET    /api/activities
GET    /api/activities/:id
POST   /api/activities
PUT    /api/activities/:id
DELETE /api/activities/:id
```

Fonctions attendues :
- bibliothèque qui lit depuis l’API ;
- admin qui sauvegarde côté serveur ;
- compositeur qui peut lancer une activité connectée ;
- import/export JSON conservé ;
- fallback local possible si le serveur n’est pas disponible.

But : tester une mémoire partagée locale, avant comptes et rôles.

## V1.2 — Hub IC-Lab minimal

Objectif : créer une page d’entrée commune.

Fonctions :
- accès Prototype 06 ;
- accès préparé Seven Sieves ;
- accès préparé Dico-IC ;
- accès préparé Augmented IC Video ;
- navigation commune ;
- liste des activités ou ressources récentes.

Pas encore de comptes complets, de droits complexes ou d’IA connectée.

## V1.3 — Comptes et rôles

Objectif : introduire des identités.

Fonctions :
- login local simple ;
- rôles admin / enseignant / étudiant / observateur ;
- activités associées à un auteur ;
- première gestion des permissions.

## V1.4 — Cours et groupes

Objectif : permettre à un enseignant d’organiser plusieurs contextes pédagogiques.

Fonctions :
- création de cours ;
- groupes ;
- code d’accès étudiant ;
- assignation d’activités à un cours ;
- activité différente selon niveau ou groupe ;
- vue étudiant par cours.

## V1.5 — IA expérimentale

Objectif : brancher de vraies IA sans casser l’architecture.

Questions à tester :
- un agent peut-il rester strictement dans une langue ?
- plusieurs agents IA peuvent-ils coexister sans confusion ?
- l’IA peut-elle jouer un rôle didactique dans l’interproduction ?
- l’IA peut-elle aider l’apprenant à clarifier sans traduire systématiquement ?
- comment présenter clairement les coûts ?

Modes possibles :
1. mode scénarisé sans IA ;
2. IA texte + voix navigateur ;
3. IA texte + voix API ;
4. IA vocale temps réel ;
5. multi-agents IA limité.

## V2.0 — Plateforme IC-Lab

Objectif : passer à une mémoire collective réelle.

Fonctions possibles :
- bibliothèque partagée ;
- visibilité privée / cours / partagée / publique ;
- auteurs ;
- versions ;
- retours d’usage ;
- collections thématiques ;
- traces pédagogiques ;
- exports de recherche ;
- intégration réelle des autres prototypes.

## 7. Chantier IA : points de vigilance

L’IA ne doit pas seulement “parler espagnol” ou “jouer un personnage”.

Elle doit respecter une intention didactique :
- rester dans sa langue ;
- ne pas traduire systématiquement ;
- encourager la compréhension partielle ;
- demander clarification ;
- reformuler sans infantiliser ;
- aider à l’interproduction ;
- adapter la difficulté ;
- rester dans le scénario ;
- ne pas prendre la place de l’apprenant ;
- permettre à l’enseignant de garder le contrôle.

## 8. Types d’agents IA à distinguer

### Agent participant

Joue un personnage, parle sa langue, témoigne et réagit dans le cadre de la rencontre.

### Agent tuteur discret

Accompagne l’apprenant, aide à reformuler, propose une relance, encourage la clarification, signale une stratégie possible.

### Agent observateur enseignant

Produit des traces, repère les stratégies IC, synthétise les difficultés et prépare un retour pédagogique.

Ces rôles ne doivent pas forcément être activés en même temps.

## 9. Coûts et modes de voix

Il faudra comparer plusieurs modes.

### Voix navigateur

Avantages :
- gratuit ;
- simple ;
- autonome ;
- pas de clé API.

Limites :
- qualité variable ;
- voix disponibles selon OS/navigateur ;
- langues minoritaires incertaines.

### Voix API

Avantages :
- qualité plus crédible ;
- choix de voix ;
- cohérence meilleure.

Limites :
- coût ;
- dépendance API ;
- latence ;
- gestion des durées.

### Realtime vocal

Avantages :
- interaction plus naturelle ;
- agents plus vivants.

Limites :
- coût potentiellement élevé ;
- durée à contrôler ;
- complexité technique ;
- risques pédagogiques si l’agent devient trop libre.

Il faudra présenter dans l’interface : modèle choisi, voix choisie, mode choisi, durée estimée, coût estimé et avertissements.

## 10. Prototypes à intégrer dans le Hub

### Prototype 06 — Rencontres plurilingues

Déjà avancé : personnages, scénarios, variantes discursives, activités, bibliothèque, admin local.

### Seven Sieves

Intégration future : activités de lecture, choix de textes, choix de langues, export de traces, rattachement à un cours.

### Dico-IC

Intégration future : base lexicale, enrichissements, ressources communes, alimentation des autres prototypes.

### Augmented IC Video

Intégration future : vidéos annotées, scènes d’observation, activités liées, traces d’observation.

## 11. Principes à garder

- Complexité différée : ne pas transformer chaque prototype en plateforme.
- Mémoire commune : les ressources doivent pouvoir circuler entre enseignants.
- Mutualisation : une activité doit pouvoir être retrouvée, comprise, adaptée et réutilisée.
- Contrôle enseignant : l’IA doit être configurable, encadrée et optionnelle.
- Coût visible : toute option IA coûteuse doit être explicitement signalée.
- Expérience apprenant : l’interface ne doit pas devenir un tableau de bord technique.
- Recherche / mémoire : documenter pourquoi l’activité existe, qui l’a créée, comment elle a été utilisée, ce qui a été observé.

## 12. Prochaine étape concrète

Priorité recommandée :

## V1.1 — serveur local connecté pour la bibliothèque d’activités

But immédiat :

```txt
localStorage → API locale → stockage partagé
```

Pourquoi commencer par là ?

Parce que :
- c’est le premier pas vers la mémoire collective ;
- cela reste maîtrisable techniquement ;
- cela ne demande pas encore de comptes ;
- cela prépare naturellement les rôles, cours et partages ;
- cela évite de partir trop vite vers une plateforme complète.

## 13. Questions ouvertes

- SQLite ou simple fichier JSON pour V1.1 ?
- Jusqu’où garder un mode entièrement statique ?
- Les activités doivent-elles être versionnées dès V1.1 ?
- Faut-il créer un format `.iclactivity.json` ?
- Comment gérer les activités d’autres prototypes ?
- À quel moment introduire les comptes ?
- Comment gérer les étudiants sans lourdeur administrative ?
- Comment évaluer le coût d’une activité IA avant lancement ?
- Quels niveaux d’accès pour la bibliothèque partagée ?
- Quelle part du système restera prototype IC-Lab et quelle part deviendra plateforme ?

## 14. Formulation provisoire

IC-Lab doit évoluer vers un hub de scénarisation, de mutualisation et d’expérimentation en intercompréhension.

Prototype 06 en constitue aujourd’hui le laboratoire le plus avancé : il montre comment une rencontre plurilingue peut devenir une activité pédagogique, puis une ressource éditable, partageable et potentiellement connectée.
