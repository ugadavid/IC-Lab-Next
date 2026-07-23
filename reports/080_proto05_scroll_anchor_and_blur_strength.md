# Mission 080 — Proto05 : ancrage du calque et puissance du flou

## Version et périmètre

Proto05 uniquement. Version serveur conservée à `0.1.30` après la correction de la mission 079. Aucun autre prototype, IC-Hub, activité canonique ou source vidéo existante n’a été modifié par cette mission.

## Ancrage géométrique

Le calque `maskLayer` reste un enfant de `.stage`, qui est `position: relative`; il n’est donc pas positionné par rapport au document ou à la fenêtre. `videoContentRect()` calcule la zone vidéo affichée depuis `stage.getBoundingClientRect()`, les dimensions intrinsèques de la vidéo et `object-fit: contain`. Les bandes noires sont ainsi exclues du repère des masques.

Les coordonnées normalisées sont converties en pourcentages du `maskLayer`, dont l’origine et les dimensions correspondent à la zone vidéo affichée. Le déplacement et le redimensionnement utilisent le même `getBoundingClientRect()` du calque au début de l’interaction. Le redimensionnement du stage, le redimensionnement de la fenêtre et le défilement déclenchent une resynchronisation locale; aucun calcul ne dépend de `window.scrollX` ou `window.scrollY`.

## Profils de flou

Le panneau propose trois profils, avec `Standard` sélectionné par défaut :

| Profil | FFmpeg `boxblur` | Effet |
|---|---:|---|
| Léger | `luma_radius=6`, `luma_power=1` | flou léger |
| Standard | `luma_radius=14`, `luma_power=2` | flou équilibré |
| Fort | `luma_radius=28`, `luma_power=3` | flou renforcé |

Le choix est envoyé dans `blurProfile` lors de la création du job. Le serveur refuse les profils inconnus et ne remplace pas silencieusement un choix valide. Le graphe `filter_complex` applique le même profil à chaque masque. La provenance conserve l’identifiant du profil, ses valeurs FFmpeg, le graphe, les arguments, les masques, le hash, la date et le statut.

## Fichiers concernés

- `prototypes/05-augmented-ic-video-01/teacher-anonymization.html` : synchronisation géométrique du calque, contrôle de puissance et transmission du profil.
- `prototypes/05-augmented-ic-video-01/server/server.js` : profils validés, sélection du profil dans le job, pipeline boxblur et provenance.
- `prototypes/05-augmented-ic-video-01/server/test/hls-preparation.test.js` : profil standard, refus d’un profil inconnu et paramètres de provenance.

## Contrôles effectués

- `npm run check` : réussi.
- `node --test test/hls-preparation.test.js` : 2 tests réussis, incluant masques multiples, dérivation, validation finale, persistance, lecture Range et nettoyage.
- Vérification statique : calque enfant du conteneur relatif, calcul `getBoundingClientRect()`, profils `6/1`, `14/2`, `28/3`, transmission `blurProfile`, absence de dépendance à `scrollX`/`scrollY`.

La recette Chromium obligatoire aux différentes tailles, positions de défilement et niveaux de zoom n’a pas pu être exécutée dans cette session, l’outil Chromium n’étant pas disponible. La validation humaine doit encore confirmer visuellement l’absence de décalage après défilement, la différence des trois profils et l’absence d’erreur console.

Une modification préexistante de `prototypes/05-augmented-ic-video-01/data/video-library.json` était visible dans l’état Git et a été conservée sans intervention.

Limites restantes : pas de détection automatique, suivi temporel, anonymisation vocale ou réglage par masque. Aucun commit ni push.

Message de commit proposé : `Proto05: ancrer les masques et régler la puissance du flou`.
