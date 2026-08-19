# Rollback contrôlé — Mission 218

Le rollback ne doit être utilisé que pour retirer exactement les quinze lignes de la Mission 218. Il ne cible ni une plage d’IDs ni toutes les aides IT/PT/EN : chaque ligne est d’abord comparée au plan gelé et à son empreinte de contenu.

Préconditions :

- conserver `pre_apply_backup.json` et `mission_218_frozen_plan.json` inchangés ;
- exécuter le contrôle avant le rollback ;
- refuser toute intervention si l’état est `partial` ou `unknown` ;
- ne pas modifier manuellement une ligne Mission 218 pour forcer le contrôle.

Depuis `prototypes/08-dico-seven-sieves/Node` :

```text
node scripts/manage-multilingual-connector-helps.js --check --backup ../../../reports/assets/218_dico_ic_multilingual_connector_help_seed/pre_apply_backup.json
node scripts/manage-multilingual-connector-helps.js --rollback --backup ../../../reports/assets/218_dico_ic_multilingual_connector_help_seed/pre_apply_backup.json
node scripts/manage-multilingual-connector-helps.js --check --backup ../../../reports/assets/218_dico_ic_multilingual_connector_help_seed/pre_apply_backup.json
```

Postconditions attendues :

- `changed_rows = 15` puis état `pending` ;
- `connector_help = 12` ;
- empreinte `connector_help = 10d59caa8e50e3055a9dd75bac51ad9696d27c8124fbea8cee26da450210d846` ;
- auto-incrément restauré à `17` ;
- les sept autres empreintes identiques à la sauvegarde.

Le rollback a été exécuté avec succès uniquement sur la fixture complète puis restauré bit à bit. Il n’a pas été exécuté sur la base réelle après l’application validée.
