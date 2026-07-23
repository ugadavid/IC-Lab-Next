# Mission 086 — Proto05 : lisibilité des champs, sélection visible et erreur `applyTemporalRect`

Date : 2026-07-23  
Périmètre : `prototypes/05-augmented-ic-video-01` uniquement.

## Résultat

L’atelier avancé d’anonymisation temporelle a été vérifié et ajusté sur son
interface. Le contrat temporel de la mission 085 est conservé : les temps sont
saisis explicitement, et le déplacement ou le redimensionnement ne crée ni ne
modifie automatiquement une image-clé ou son temps.

Version Proto05 observée : serveur `0.1.30`, inchangée.

## Modifications

- `teacher-anonymization-advanced.html`
  - grille responsive des images-clés : champ Temps compact et champs `x`, `y`,
    largeur et hauteur lisibles pour les décimales ;
  - distinction visuelle du masque actif, de l’image-clé sélectionnée et de la
    position interpolée à l’instant de lecture ;
  - surbrillance de la ligne sélectionnée, marqueurs sélectionnables dans la
    timeline, rectangle sélectionné et quatre poignées visibles ;
  - poignées désactivées lorsqu’aucune image-clé n’est sélectionnée ;
  - définition réelle de `applyTemporalRect(rect, position)`, utilisée pour
    appliquer la géométrie normalisée au rectangle affiché ;
  - sélection d’une ligne ou d’un marqueur sans modifier son temps.
- `server/test/hls-preparation.test.js`
  - vérifications statiques ciblées de la définition de `applyTemporalRect` et
    du flux de finalisation du déplacement.
- `server/server.js`
  - contrat de validation temporelle existant contrôlé et conservé ; aucune
    fusion de temps distincts n’est introduite. Les temps comme 3000 ms et
    3001 ms restent distincts.

## Cause de l’erreur corrigée

L’appel à `applyTemporalRect` ne disposait pas d’une implémentation cohérente
dans l’atelier servi. La fonction est maintenant définie au même endroit que
le calcul de géométrie et applique explicitement `left`, `top`, `width` et
`height` en pourcentage sur le calque du masque. Ce n’est pas un stub silencieux.

Pendant la première ouverture Chromium après la réécriture, une erreur de
syntaxe dans le rendu de la liste a également été détectée puis corrigée. Une
nouvelle ouverture de page a ensuite été utilisée pour la vérification finale.

## Vérifications

- `npm.cmd run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis.
- Analyse statique des deux scripts de la page : réussie.
- Chromium, préparation HLS temporaire :
  - sélection initiale d’un masque et d’une image-clé ;
  - présence des quatre poignées et du marqueur de timeline ;
  - affichage des champs et du statut de sélection ;
  - clic sur « Valider » : `Configuration valide.` ;
  - console applicative de la page fraîche : aucune erreur ;
  - 1440×1000 : `scrollWidth = clientWidth = 1440` ;
  - fenêtre réduite 800×600 : `scrollWidth = clientWidth` et les quatre
    poignées restent présentes.

La capture visuelle à 1440 px confirme que la vidéo utilise l’espace principal,
que le panneau latéral reste accessible et que les contrôles ne se chevauchent
pas.

## Limites

La recette Chromium complète avec glisser-déposer physique successif des quatre
coins, modification de plusieurs valeurs numériques, actualisation et lecture
de l’interpolation n’a pas été exécutée intégralement dans cette session. Les
événements et le contrat de transaction restent couverts par le code existant
et les contrôles statiques ciblés ; une validation humaine de ces gestes reste
à effectuer.

Aucune donnée canonique n’a été modifiée. Une préparation HLS temporaire a été
utilisée pour la recette. Aucun commit ni push n’a été effectué.

Suite proposée : exécuter la recette humaine complète avec deux temps manuels
distincts, puis poursuivre les contrôles de dérivation temporelle si nécessaire.

Message de commit proposé, non exécuté :
`fix(proto05): clarify temporal mask keyframe selection and geometry editing`
