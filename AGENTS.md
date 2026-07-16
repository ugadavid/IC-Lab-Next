# AGENTS.md — IC-Lab-Next

## Rôle

IC-Lab-Next est le workspace actif de développement d’IC-Lab.
Les frontières, composants et dépendances sont décrits dans :

- `docs/WORKSPACE_PROVENANCE.md`
- `docs/ARCHITECTURE.md`
- `PROJECTS_LAUNCH.md`
- `STATUS.md`

Ces documents décrivent le projet ; ils ne remplacent pas la mission courante.

## Avant toute modification

- Inspecter l’état réel du dépôt et les fichiers concernés.
- Lire les README et documents spécialisés pertinents.
- Ne pas déduire l’état actuel uniquement des rapports historiques.
- Identifier les changements déjà présents et les préserver.
- Vérifier le propriétaire des données avant toute écriture.

## Priorité des sources

Pour les instructions, l’ordre de priorité est :

1. instructions de la plateforme et de l’environnement ;
2. mission courante explicitement confiée ;
3. `AGENTS.md` applicable ;
4. règles et contraintes du projet ;
5. méthode commune et documents historiques.

Pour établir l’état factuel, privilégier le code, la configuration et les
données actuellement présents, puis la documentation actuelle, puis les
rapports historiques. En cas de contradiction importante, la signaler et
demander un arbitrage.

## Périmètre

- Réaliser uniquement la mission demandée.
- Ne pas étendre silencieusement le périmètre.
- Ne pas modifier un autre prototype ou service sans nécessité explicite.
- Ne pas modifier les launchers, les données, les configurations ou l’architecture globale sans que la mission l’autorise.
- En cas d’ambiguïté importante, exposer le point et demander un arbitrage.

## Préservation et sécurité

- Ne pas supprimer de données, fichiers ou changements existants sans autorisation explicite.
- Ne pas utiliser de commande destructive par défaut. Une suppression explicitement demandée nécessite une sauvegarde, une vérification de l’impact et un retour arrière identifié.
- Ne pas exécuter de migration, script SQL, réinitialisation de base ou suppression de volume sans validation humaine préalable de l’impact, de la sauvegarde et du retour arrière.
- Ne jamais lire ni exposer les secrets `.env`.
- Les fichiers `.env.example` peuvent être consultés lorsqu’ils ne contiennent que des valeurs d’exemple.
- Respecter la propriété des données définie dans `docs/ARCHITECTURE.md`.

Les tests et recettes ne doivent pas modifier une donnée canonique par défaut.
Utiliser une fixture, une copie temporaire ou un scénario explicitement
réversible. Toute écriture nécessaire dans une donnée canonique doit être
autorisée et documenter sa sauvegarde et sa restauration.

## Réalisation

- Préférer les modifications locales, réversibles et proportionnées.
- Réutiliser les composants et contrats existants avant d’en créer de nouveaux.
- Préserver les interfaces et comportements déjà validés.
- Ne pas présenter une dépendance provisoire comme une architecture définitive.
- Ne pas créer de duplication de données ou de logique sans justification.

## Vérification

Adapter les contrôles au risque de la mission et distinguer :

- analyse statique ;
- tests automatisés ;
- validation HTTP ou serveur ;
- recette interactive ;
- validation visuelle Chromium ;
- validation fonctionnelle humaine.

Toute modification d’interface doit faire l’objet d’une vérification visuelle
lorsque l’environnement le permet. Préciser les pages et états touchés, une
dimension représentative, l’absence d’erreur visible et les observations ou
captures utiles. Si l’environnement n’est pas disponible, le signaler. Une
recette de Codex ne constitue pas une validation humaine de David.

## Restitution

Toute mission réalisée doit restituer :

- les fichiers modifiés ou créés ;
- les fonctionnalités réalisées ;
- les contrôles effectués ;
- ce qui n’a pas été vérifié ;
- les limites restantes ;
- les suites possibles ;
- un message de commit proposé ;
- indiquer la version obtenue ou préciser explicitement qu’elle est inchangée ;
- fournir le chemin du rapport créé ;
- distinguer les faits observés, les contrôles réalisés et la validation humaine.

Ne pas créer de commit ni effectuer de push sans demande explicite.

## Règle d’arrêt

S’arrêter avant l’exécution et demander un arbitrage si la mission implique :

- une modification importante du périmètre ;
- une migration de données ou d’architecture ;
- une perte ou transformation difficilement réversible ;
- une nouvelle dépendance entre prototypes ;
- une décision produit non tranchée ;
- une preuve indispensable qui ne peut pas être obtenue.

Une limite non bloquante peut être signalée lorsque le résultat reste utile,
réversible et conforme au périmètre. Une preuve est indispensable lorsqu’elle
conditionne la sécurité des données, un critère d’acceptation explicite ou une
affirmation de fonctionnement qui ne peut pas être établie autrement.

Les changements locaux qui chevauchent la mission doivent être préservés. Si la
modification ne peut pas être isolée proprement, contourner la zone concernée
ou demander un arbitrage ; ne pas écraser le travail existant.

## Rapports

- Toute mission réalisée doit produire un rapport dans `reports/`, y compris une
  mission documentaire.
- Le rapport doit indiquer le périmètre, les fichiers concernés, les vérifications,
  les éléments non vérifiés, les limites et la suite éventuelle.
- Le numéro et le nom du rapport doivent respecter la séquence existante.
- Le numéro suivant est déterminé par `max(numéro existant) + 1`, après vérification
  de l’absence de collision juste avant l’écriture.
- Une mission bloquée, abandonnée ou sans modification produit également un bref
  rapport si la mission autorise l’écriture documentaire.
- Si la mission interdit explicitement toute écriture dans le dépôt, aucune
  création de rapport n’est effectuée dans le dépôt ; la restitution indique cette
  exception dans le canal de travail.
- Un rapport ne vaut pas validation humaine : il restitue les faits et les 
  contrôles réalisés.

## Versionnement par baby steps

Les versions intermédiaires sont importantes et doivent rester explicites.

- Une mission documentaire seule ne modifie pas la version applicative.
- Une correction, un polish ou une petite évolution incrémente le plus petit 
  niveau déjà utilisé par la convention de versionnement du composant.
- Une version `0.1.x` peut représenter une longue série de missions successives.
- Le passage de `0.1` à `0.2` constitue une évolution majeure du prototype et
  nécessite une décision explicite de David.
- Le passage à `1.0` est exceptionnel. Il correspond à une maturité ou un
  changement de statut décidé explicitement par David ; il ne résulte jamais
  automatiquement du nombre de fonctionnalités réalisées.
- Ne jamais sauter, simplifier ou réécrire les versions intermédiaires pour
  donner une impression de maturité.
- Ne jamais appliquer automatiquement une convention SemVer classique si elle
  contredit la stratégie de développement du projet.
- Préserver la convention propre au composant : une page, un serveur ou un
  package peuvent avoir des numéros distincts.
- Chaque composant doit permettre d’identifier son artefact versionné principal,
  sa source de vérité et les artefacts secondaires éventuellement concernés.
- Toute modification de version doit être justifiée dans le rapport de mission.