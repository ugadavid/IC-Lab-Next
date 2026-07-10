USE ic_dico;

-- =========================================================
-- ENTRY : ANIMAL
-- =========================================================

CALL sp_upsert_lexical_entry(
    'ANIMAL_CREATURE',
    'animal, être vivant non humain',
    'animal, non-human living creature',
    'biology',
    NULL
);

CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'fr', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'es', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'it', 'animale', 'animale', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'pt', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'en', 'animal', 'animal', 'noun', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'animal', 'es', 'animal', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'it', 'animale', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'pt', 'animal', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'en', 'animal', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);

-- =========================================================
-- ENTRY : CULTURE
-- =========================================================

CALL sp_upsert_lexical_entry(
    'CULTURE_HUMAN',
    'culture, ensemble de pratiques et savoirs',
    'culture, set of practices and knowledge',
    'society',
    NULL
);

CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'fr', 'culture', 'culture', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'es', 'cultura', 'cultura', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'it', 'cultura', 'cultura', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'pt', 'cultura', 'cultura', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'en', 'culture', 'culture', 'noun', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'culture', 'es', 'cultura', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'it', 'cultura', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'pt', 'cultura', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'en', 'culture', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);

-- =========================================================
-- ENTRY : POLITICS
-- =========================================================

CALL sp_upsert_lexical_entry(
    'POLITICS_FIELD',
    'politique, domaine de gouvernement',
    'politics, field of government',
    'politics',
    NULL
);

CALL sp_upsert_lexical_form('POLITICS_FIELD', 'fr', 'politique', 'politique', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'es', 'política', 'politica', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'it', 'politica', 'politica', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'pt', 'política', 'politica', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'en', 'politics', 'politics', 'noun', 0.96, NULL);

CALL sp_insert_form_relation('fr', 'politique', 'es', 'politica', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'it', 'politica', 'COGNATE_STRONG', 0.91, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'pt', 'politica', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'en', 'politics', 'COGNATE_WEAK', 0.72, TRUE, 'manual_seed_v2', 0.92, NULL);

-- =========================================================
-- ENTRY : PROBLEM
-- =========================================================

CALL sp_upsert_lexical_entry(
    'PROBLEM_DIFFICULTY',
    'problème, difficulté ou question à résoudre',
    'problem, difficulty or question to solve',
    'general',
    NULL
);

CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'fr', 'problème', 'probleme', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'es', 'problema', 'problema', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'it', 'problema', 'problema', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'pt', 'problema', 'problema', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'en', 'problem', 'problem', 'noun', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'probleme', 'es', 'problema', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'it', 'problema', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'pt', 'problema', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'en', 'problem', 'COGNATE_STRONG', 0.92, TRUE, 'manual_seed_v2', 0.99, NULL);

-- =========================================================
-- ENTRY : MUSIC
-- =========================================================

CALL sp_upsert_lexical_entry(
    'MUSIC_ART',
    'musique, art des sons',
    'music, art of sounds',
    'art',
    NULL
);

CALL sp_upsert_lexical_form('MUSIC_ART', 'fr', 'musique', 'musique', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'es', 'música', 'musica', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'it', 'musica', 'musica', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'pt', 'música', 'musica', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'en', 'music', 'music', 'noun', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'musique', 'es', 'musica', 'COGNATE_STRONG', 0.89, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'it', 'musica', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'pt', 'musica', 'COGNATE_STRONG', 0.89, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'en', 'music', 'COGNATE_STRONG', 0.86, TRUE, 'manual_seed_v2', 0.97, NULL);

-- =========================================================
-- ENTRY : GENERAL
-- =========================================================

CALL sp_upsert_lexical_entry(
    'GENERAL_COMMON',
    'général, commun ou global',
    'general, common or global',
    'general',
    NULL
);

CALL sp_upsert_lexical_form('GENERAL_COMMON', 'fr', 'général', 'general', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'es', 'general', 'general', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'it', 'generale', 'generale', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'pt', 'geral', 'geral', 'adjective', 0.96, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'en', 'general', 'general', 'adjective', 0.98, NULL);

CALL sp_insert_form_relation('fr', 'general', 'es', 'general', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'general', 'it', 'generale', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'general', 'pt', 'geral', 'COGNATE_WEAK', 0.68, TRUE, 'manual_seed_v2', 0.92, NULL);
CALL sp_insert_form_relation('fr', 'general', 'en', 'general', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.98, NULL);

-- =========================================================
-- ENTRY : DIFFERENT
-- =========================================================

CALL sp_upsert_lexical_entry(
    'DIFFERENT_NOT_SAME',
    'différent, pas identique',
    'different, not the same',
    'general',
    NULL
);

CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'fr', 'différent', 'different', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'es', 'diferente', 'diferente', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'it', 'differente', 'differente', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'pt', 'diferente', 'diferente', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'en', 'different', 'different', 'adjective', 0.98, NULL);

CALL sp_insert_form_relation('fr', 'different', 'es', 'diferente', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'different', 'it', 'differente', 'COGNATE_STRONG', 0.92, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'different', 'pt', 'diferente', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'different', 'en', 'different', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.98, NULL);

-- =========================================================
-- FALSE FRIEND : DEMANDER / DEMAND
-- =========================================================

CALL sp_upsert_lexical_entry(
    'ASK_REQUEST',
    'demander, poser une requête',
    'ask, request',
    'communication',
    NULL
);
CALL sp_upsert_lexical_form('ASK_REQUEST', 'fr', 'demander', 'demander', 'verb', 0.99, NULL);

CALL sp_upsert_lexical_entry(
    'DEMAND_REQUIRE',
    'exiger, réclamer',
    'demand, require',
    'communication',
    NULL
);
CALL sp_upsert_lexical_form('DEMAND_REQUIRE', 'en', 'demand', 'demand', 'verb', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'demander',
    'en', 'demand',
    'FALSE_FRIEND',
    0.08,
    TRUE,
    'manual_seed_v2',
    0.98,
    'Demander = ask/request, pas demand'
);

-- =========================================================
-- FALSE FRIEND : SENSIBLE / SENSITIVE
-- =========================================================

CALL sp_upsert_lexical_entry(
    'REASONABLE_SENSIBLE',
    'sensible, raisonnable',
    'sensible, reasonable',
    'description',
    NULL
);
CALL sp_upsert_lexical_form('REASONABLE_SENSIBLE', 'fr', 'sensible', 'sensible', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('REASONABLE_SENSIBLE', 'en', 'sensible', 'sensible', 'adjective', 0.99, NULL);

CALL sp_upsert_lexical_entry(
    'SENSITIVE_EMOTIONAL',
    'sensible, qui ressent facilement / sensitive',
    'sensitive, easily affected',
    'description',
    NULL
);
CALL sp_upsert_lexical_form('SENSITIVE_EMOTIONAL', 'en', 'sensitive', 'sensitive', 'adjective', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'sensible',
    'en', 'sensitive',
    'FALSE_FRIEND',
    0.10,
    TRUE,
    'manual_seed_v2',
    0.97,
    'Sensible (FR) ≠ sensitive (EN)'
);

-- =========================================================
-- FALSE FRIEND : MONNAIE / MONEDA / MONEY
-- =========================================================

CALL sp_upsert_lexical_entry(
    'CURRENCY_MONEY',
    'monnaie, argent ou devise',
    'money, currency',
    'economy',
    NULL
);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'fr', 'monnaie', 'monnaie', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'es', 'moneda', 'moneda', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'it', 'moneta', 'moneta', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'pt', 'moeda', 'moeda', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'en', 'money', 'money', 'noun', 0.98, NULL);

CALL sp_insert_form_relation('fr', 'monnaie', 'es', 'moneda', 'COGNATE_WEAK', 0.64, TRUE, 'manual_seed_v2', 0.94, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'it', 'moneta', 'COGNATE_WEAK', 0.62, TRUE, 'manual_seed_v2', 0.94, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'pt', 'moeda', 'COGNATE_WEAK', 0.55, TRUE, 'manual_seed_v2', 0.90, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'en', 'money', 'COGNATE_WEAK', 0.42, TRUE, 'manual_seed_v2', 0.80, NULL);

-- =========================================================
-- FALSE FRIEND : COLLÈGE / COLLEGE
-- =========================================================

CALL sp_upsert_lexical_entry(
    'SECONDARY_SCHOOL_FR',
    'collège, établissement scolaire intermédiaire',
    'middle school / junior high',
    'education',
    NULL
);
CALL sp_upsert_lexical_form('SECONDARY_SCHOOL_FR', 'fr', 'collège', 'college', 'noun', 0.99, NULL);

CALL sp_upsert_lexical_entry(
    'COLLEGE_HE',
    'college, établissement d’enseignement supérieur',
    'college, higher education institution',
    'education',
    NULL
);
CALL sp_upsert_lexical_form('COLLEGE_HE', 'en', 'college', 'college', 'noun', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'college',
    'en', 'college',
    'FALSE_FRIEND',
    0.05,
    TRUE,
    'manual_seed_v2',
    0.99,
    'Collège (FR) ≠ college (EN)'
);

-- =========================================================
-- FEATURES (quelques exemples)
-- =========================================================

CALL sp_insert_ic_feature('es', 'informacion', 'TRANSPARENCY_SCORE', 0.96, NULL, 'manual_seed_v2', 0.95, NULL);
CALL sp_insert_ic_feature('it', 'informazione', 'TRANSPARENCY_SCORE', 0.94, NULL, 'manual_seed_v2', 0.95, NULL);
CALL sp_insert_ic_feature('en', 'college', 'FALSE_FRIEND_RISK', NULL, 'HIGH', 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_ic_feature('en', 'demand', 'FALSE_FRIEND_RISK', NULL, 'HIGH', 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_ic_feature('en', 'sensitive', 'FALSE_FRIEND_RISK', NULL, 'HIGH', 'manual_seed_v2', 0.97, NULL);

-- A insérer !!