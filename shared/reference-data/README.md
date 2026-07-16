# Référentiels partagés du workspace

Ce dossier contient les petits référentiels transversaux appartenant au
workspace IC-Lab-Next, sans transférer la propriété des données métier des
prototypes.

`languages.json` est le dictionnaire commun minimal des langues. Ses
identifiants sont stables et ses consommateurs le traitent en lecture seule.
Toute extension ou modification de ce dictionnaire demande une mission
explicite. Depuis Proto05 `0.1.12`, ses activités utilisent exclusivement ces
identifiants ; le serveur et les interfaces n’entretiennent plus de vocabulaire
local de langues en parallèle.
