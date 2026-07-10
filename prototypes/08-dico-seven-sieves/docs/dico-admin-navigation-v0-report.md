# Dico-IC Admin — navigation V0 entre pages admin

## Objectif

Ajouter une navigation simple entre les pages d'administration existantes, sans
refonte, sans modification backend, sans endpoint nouveau et sans changement SQL.

## Pages détectées

Pages HTML d'administration utiles dans `admin/` :

| Page | Rôle |
|---|---|
| `admin/index-admin-0.1.html` | Administration principale : modèle, langues, lexique, relations, formes fléchies, aides discursives |
| `admin/index-admin-ai-domain-0.1.html` | Assistant IA Domaine |
| `admin/index-admin-ai-text-0.1.html` | Assistant IA Texte et Assistant IA Formes Fléchies |
| `admin/index-admin-ai-relations-0.1.html` | Assistant IA Relations |

Le lien `Seven Sieves` pointe vers :

```text
prototypes/01-seven-sieves/index-api-live-0.1.html
```

Il s'agit uniquement d'un lien de confort. La page Seven Sieves n'a pas été
modifiée.

## Pages modifiées

HTML :

- `admin/index-admin-0.1.html`
- `admin/index-admin-ai-domain-0.1.html`
- `admin/index-admin-ai-text-0.1.html`
- `admin/index-admin-ai-relations-0.1.html`

CSS :

- `admin/css/admin-0.1.css`
- `admin/css/admin-ai-domain-0.1.css`

Les pages IA Texte et IA Relations importent déjà `admin-ai-domain-0.1.css`.
Une seule déclaration CSS commune suffit donc pour les trois pages IA.

## Choix UI retenu

Une petite barre horizontale a été ajoutée sous l'en-tête de chaque page :

```text
Admin principal | IA Domaine | IA Texte | IA Relations | Seven Sieves
```

Caractéristiques :

- liens simples, sans JavaScript ;
- page courante indiquée par `aria-current="page"` et un style actif ;
- barre discrète, cohérente avec les couleurs existantes ;
- défilement horizontal sur petits écrans ;
- aucun déplacement des formulaires ou des sections métier.

## Vérifications réalisées

Vérifications statiques :

- les quatre pages admin contiennent la navigation commune ;
- chaque page possède exactement un lien actif ;
- les pages cibles existent ;
- le lien Seven Sieves pointe vers la page live existante ;
- aucune modification de script JavaScript ;
- aucune modification backend ;
- aucune modification SQL.

## Limites V0

- La navigation est dupliquée dans les quatre fichiers HTML. C'est acceptable
  pour une V0 sans framework ni système de template.
- Le lien Seven Sieves pointe vers la page live officielle
  `index-api-live-0.1.html`, pas vers les variantes pédagogiques.
- Il n'existe pas encore de composant partagé pour l'administration. Si le
  nombre de pages augmente fortement, il faudra envisager une génération ou un
  fragment commun.

## Conclusion

La navigation admin V0 améliore le passage entre les pages existantes sans
modifier les workflows métier. Elle reste volontairement simple : des liens
visibles, une page active, et aucun effet de bord fonctionnel.
