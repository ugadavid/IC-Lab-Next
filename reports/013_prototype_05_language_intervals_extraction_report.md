# Rapport — Prototype 05 : timeline linguistique explicite

Date : 13 juillet 2026  
Version : **0.1.2**

## Source historique

La source retenue est le rendu historique de la timeline dans
`index-0.0.6.1.html` (repris par les versions 0.0.6.2 et 0.0.7). Ce rendu
construisait les barres linguistiques à partir des plages temporelles des
segments et de leurs `segment.languageIds`. Aucun autre intervalle indépendant
n’a été inventé.

Les 22 intervalles créés reprennent donc exactement chaque couple segment/langue
existant : les temps `startMs`/`endMs` du segment, la langue référencée par son
identifiant stable et le rattachement `segmentId`.

## Données récupérées

La fixture historique contient maintenant 22 objets `languageIntervals`, couvrant
les segments 01 à 11 et les langues FR, ES, IT et PT selon les associations déjà
présentes dans `segment.languageIds`. Les 11 segments restent inchangés ; les
deux représentations sont distinctes : les segments décrivent les langues
associées à un passage, les intervalles décrivent les plages affichées.

## Rendu et atelier

Le moteur partagé lit désormais `languageIntervals` pour dessiner la timeline
linguistique, avec libellés/couleurs dérivés de `activity.languages`. Un clic sur
une plage rejoint le segment rattaché (ou sa position temporelle). La timeline
des phénomènes reste séparée.

L’atelier auteur charge les 22 intervalles réels, permet leur édition, ajout et
suppression, puis les sauvegarde avec validation des langues, identifiants,
temps, rattachements et durée vidéo. Les brouillons nouvellement créés
conservent `languageIntervals: []`.

## Vérifications

- JSON valide : 22 intervalles, 11 segments, 26 phénomènes, 7 couches, 4 langues,
  5 locuteurs et 11 annotations ;
- version serveur et donnée : `0.1.2` ;
- atelier historique et prévisualisation accessibles ;
- création de brouillon : `languageIntervals: []` ;
- langue inexistante et intervalle invalide : `400` ;
- parsing HTML/JavaScript ;
- `npm run check` ;
- `git diff --check` ;
- données historiques restaurées après les tests réversibles.

## Incohérences documentées

La fixture historique ne comportait pas de tableau d’intervalles autonome : la
timeline précédente était une projection des segments. Les intervalles ajoutés
sont donc une normalisation fidèle de cette projection, sans modifier
`segment.languageIds`. Les chevauchements éventuels hérités des segments restent
autorisés et ne sont pas supprimés automatiquement.

Message de commit proposé :

`feat(prototype-05): model linguistic timeline intervals`
