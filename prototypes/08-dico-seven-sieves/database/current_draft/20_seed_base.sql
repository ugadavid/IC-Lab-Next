-- Draft base seed for IC-Dico.
-- Minimal reference data only.
-- Status: non-final draft. Existing SQL files are unchanged.

USE ic_dico;

CALL sp_upsert_language('fr', 'Français', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('es', 'Español', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('it', 'Italiano', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('pt', 'Português', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('en', 'English', 'Germanic', FALSE, TRUE);

-- Mission 193: explicit statuses avoid the DOCUMENTED default for catalog-only languages.
INSERT INTO language (code, name, family, is_romance, documentation_status, is_active) VALUES
  ('ca', 'Català', 'Romance', TRUE, 'REFERENCED', FALSE),
  ('gl', 'Galego', 'Romance', TRUE, 'REFERENCED', FALSE),
  ('oc', 'Occitan', 'Romance', TRUE, 'REFERENCED', FALSE),
  ('ro', 'Română', 'Romance', TRUE, 'REFERENCED', FALSE),
  ('co', 'Corsu', 'Romance', TRUE, 'REFERENCED', FALSE),
  ('sc', 'Sardu', 'Romance', TRUE, 'REFERENCED', FALSE),
  ('rm', 'Rumantsch', 'Romance', TRUE, 'REFERENCED', FALSE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  family = VALUES(family),
  is_romance = VALUES(is_romance),
  documentation_status = VALUES(documentation_status),
  is_active = VALUES(is_active);
