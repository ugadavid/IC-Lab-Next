-- Draft base seed for IC-Dico.
-- Minimal reference data only.
-- Status: non-final draft. Existing SQL files are unchanged.

USE ic_dico;

CALL sp_upsert_language('fr', 'Français', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('es', 'Español', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('it', 'Italiano', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('pt', 'Português', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('en', 'English', 'Germanic', FALSE, TRUE);
