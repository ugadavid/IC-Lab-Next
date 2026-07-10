# Prototype 06 V1.1 - backend local

Ce serveur Node local sert les fichiers statiques du prototype et expose une API REST minimale sous `/api`.

## Lancer

```bash
cd prototypes/06-voice-agent-ic/server
npm start
```

Par defaut, le serveur ecoute sur `http://localhost:8788`. Le port peut etre change avec `PORT=8790 npm start`.

## Endpoints

- `GET /api/health` : etat du service.
- `GET /api/activities` : liste des activites serveur.
- `GET /api/activities/:id` : detail d'une activite serveur.
- `POST /api/activities` : creation d'une activite serveur.
- `PUT /api/activities/:id` : modification d'une activite serveur.
- `DELETE /api/activities/:id` : suppression d'une activite serveur.

## Stockage

Les activites sont stockees dans `server/data/activities.json`.

```json
{
  "version": "1.1",
  "updatedAt": "2026-07-02T00:00:00.000Z",
  "activities": []
}
```

Avant chaque ecriture, une copie du JSON precedent est creee dans `server/data/backups/`. L'ecriture passe par un fichier temporaire puis un renommage.

## Validation

Le serveur valide au minimum `title`, `scenarioId`, `characterIds`, `pedagogicalGoal` et `commonQuestion`. `characterIds` doit contenir de 2 a 4 personnages.

## Exemples curl

```bash
curl http://localhost:8788/api/health
curl http://localhost:8788/api/activities
curl -X POST http://localhost:8788/api/activities \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test serveur\",\"scenarioId\":\"globalUnderstanding\",\"characterIds\":[\"clara\",\"marco\"],\"pedagogicalGoal\":\"Verifier la sauvegarde serveur.\",\"commonQuestion\":\"Que comprenez-vous ?\"}"
```

## Limites

Cette V1.1 est volontairement locale : pas de comptes, pas de roles, pas d'authentification, pas de base de donnees complexe et pas d'IA.
