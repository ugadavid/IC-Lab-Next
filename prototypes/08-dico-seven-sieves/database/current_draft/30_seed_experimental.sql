-- Draft experimental seed for IC-Dico.
-- Lexical entries, forms, relations and IC features remain exploratory.
-- This file intentionally excludes the minimal language seed kept in 20_seed_base.sql.
-- Sources: database/seed_data.sql and database/seed_data_v2.sql.
-- Status: non-final draft. Existing SQL files are unchanged.

USE ic_dico;

-- =========================================================
-- EXPERIMENTAL SET 1
-- =========================================================

-- ENTRY : PHENOMENON

CALL sp_upsert_lexical_entry(
    'PHENOMENON_OBSERVABLE',
    'phénomène observable',
    'observable phenomenon',
    'science',
    NULL
);

CALL sp_upsert_lexical_form('PHENOMENON_OBSERVABLE', 'fr', 'phénomène', 'phenomene', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('PHENOMENON_OBSERVABLE', 'es', 'fenómeno', 'fenomeno', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('PHENOMENON_OBSERVABLE', 'it', 'fenomeno', 'fenomeno', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('PHENOMENON_OBSERVABLE', 'pt', 'fenômeno', 'fenomeno', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('PHENOMENON_OBSERVABLE', 'en', 'phenomenon', 'phenomenon', 'noun', 0.90, NULL);

CALL sp_insert_form_relation('fr', 'phenomene', 'es', 'fenomeno', 'COGNATE_STRONG', 0.93, TRUE, 'manual_seed', 0.95, NULL);
CALL sp_insert_form_relation('fr', 'phenomene', 'it', 'fenomeno', 'COGNATE_STRONG', 0.95, TRUE, 'manual_seed', 0.95, NULL);
CALL sp_insert_form_relation('fr', 'phenomene', 'pt', 'fenomeno', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed', 0.95, NULL);
CALL sp_insert_form_relation('fr', 'phenomene', 'en', 'phenomenon', 'COGNATE_STRONG', 0.88, TRUE, 'manual_seed', 0.90, NULL);

CALL sp_insert_ic_feature('es', 'fenomeno', 'GRAPHIC_SIMILARITY', 0.93, NULL, 'manual_seed', 0.90, NULL);
CALL sp_insert_ic_feature('es', 'fenomeno', 'TRANSPARENCY_SCORE', 0.91, NULL, 'manual_seed', 0.90, NULL);
CALL sp_insert_ic_feature('en', 'phenomenon', 'TRANSPARENCY_SCORE', 0.78, NULL, 'manual_seed', 0.80, NULL);

-- ENTRY : INFORMATION

CALL sp_upsert_lexical_entry(
    'INFORMATION_DATA',
    'information, donnée communiquée',
    'information, communicated data',
    'communication',
    NULL
);

CALL sp_upsert_lexical_form('INFORMATION_DATA', 'fr', 'information', 'information', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('INFORMATION_DATA', 'es', 'información', 'informacion', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('INFORMATION_DATA', 'it', 'informazione', 'informazione', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('INFORMATION_DATA', 'pt', 'informação', 'informacao', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('INFORMATION_DATA', 'en', 'information', 'information', 'noun', 0.98, NULL);

CALL sp_insert_form_relation('fr', 'information', 'es', 'informacion', 'COGNATE_STRONG', 0.98, TRUE, 'manual_seed', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'information', 'it', 'informazione', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'information', 'pt', 'informacao', 'COGNATE_STRONG', 0.95, TRUE, 'manual_seed', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'information', 'en', 'information', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed', 0.98, NULL);

-- ENTRY : IMPORTANT

CALL sp_upsert_lexical_entry(
    'IMPORTANT_SIGNIFICANT',
    'important, significatif',
    'important, significant',
    'general',
    NULL
);

CALL sp_upsert_lexical_form('IMPORTANT_SIGNIFICANT', 'fr', 'important', 'important', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('IMPORTANT_SIGNIFICANT', 'es', 'importante', 'importante', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('IMPORTANT_SIGNIFICANT', 'it', 'importante', 'importante', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('IMPORTANT_SIGNIFICANT', 'pt', 'importante', 'importante', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('IMPORTANT_SIGNIFICANT', 'en', 'important', 'important', 'adjective', 0.98, NULL);

CALL sp_insert_form_relation('fr', 'important', 'es', 'importante', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'important', 'it', 'importante', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'important', 'pt', 'importante', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'important', 'en', 'important', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed', 0.99, NULL);

-- ENTRY : NATION

CALL sp_upsert_lexical_entry(
    'NATION_COUNTRY',
    'nation, pays ou communauté politique',
    'nation, country or political community',
    'politics',
    NULL
);

CALL sp_upsert_lexical_form('NATION_COUNTRY', 'fr', 'nation', 'nation', 'noun', 0.97, NULL);
CALL sp_upsert_lexical_form('NATION_COUNTRY', 'es', 'nación', 'nacion', 'noun', 0.97, NULL);
CALL sp_upsert_lexical_form('NATION_COUNTRY', 'it', 'nazione', 'nazione', 'noun', 0.97, NULL);
CALL sp_upsert_lexical_form('NATION_COUNTRY', 'pt', 'nação', 'nacao', 'noun', 0.97, NULL);
CALL sp_upsert_lexical_form('NATION_COUNTRY', 'en', 'nation', 'nation', 'noun', 0.97, NULL);

CALL sp_insert_form_relation('fr', 'nation', 'es', 'nacion', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'nation', 'it', 'nazione', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'nation', 'pt', 'nacao', 'COGNATE_STRONG', 0.95, TRUE, 'manual_seed', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'nation', 'en', 'nation', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed', 0.97, NULL);

-- ENTRY : UNIVERSITY

CALL sp_upsert_lexical_entry(
    'UNIVERSITY_INSTITUTION',
    'université, établissement d’enseignement supérieur',
    'university, higher education institution',
    'education',
    NULL
);

CALL sp_upsert_lexical_form('UNIVERSITY_INSTITUTION', 'fr', 'université', 'universite', 'noun', 0.96, NULL);
CALL sp_upsert_lexical_form('UNIVERSITY_INSTITUTION', 'es', 'universidad', 'universidad', 'noun', 0.96, NULL);
CALL sp_upsert_lexical_form('UNIVERSITY_INSTITUTION', 'it', 'università', 'universita', 'noun', 0.96, NULL);
CALL sp_upsert_lexical_form('UNIVERSITY_INSTITUTION', 'pt', 'universidade', 'universidade', 'noun', 0.96, NULL);
CALL sp_upsert_lexical_form('UNIVERSITY_INSTITUTION', 'en', 'university', 'university', 'noun', 0.94, NULL);

CALL sp_insert_form_relation('fr', 'universite', 'es', 'universidad', 'COGNATE_WEAK', 0.78, TRUE, 'manual_seed', 0.95, NULL);
CALL sp_insert_form_relation('fr', 'universite', 'it', 'universita', 'COGNATE_STRONG', 0.93, TRUE, 'manual_seed', 0.95, NULL);
CALL sp_insert_form_relation('fr', 'universite', 'pt', 'universidade', 'COGNATE_WEAK', 0.82, TRUE, 'manual_seed', 0.95, NULL);
CALL sp_insert_form_relation('fr', 'universite', 'en', 'university', 'COGNATE_WEAK', 0.70, TRUE, 'manual_seed', 0.90, NULL);

-- ENTRY : FAMILY

CALL sp_upsert_lexical_entry(
    'FAMILY_RELATION',
    'famille, groupe familial',
    'family, kinship group',
    'social',
    NULL
);

CALL sp_upsert_lexical_form('FAMILY_RELATION', 'fr', 'famille', 'famille', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('FAMILY_RELATION', 'es', 'familia', 'familia', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('FAMILY_RELATION', 'it', 'famiglia', 'famiglia', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('FAMILY_RELATION', 'pt', 'família', 'familia', 'noun', 0.95, NULL);
CALL sp_upsert_lexical_form('FAMILY_RELATION', 'en', 'family', 'family', 'noun', 0.94, NULL);

CALL sp_insert_form_relation('fr', 'famille', 'es', 'familia', 'COGNATE_WEAK', 0.74, TRUE, 'manual_seed', 0.92, NULL);
CALL sp_insert_form_relation('fr', 'famille', 'it', 'famiglia', 'COGNATE_WEAK', 0.68, TRUE, 'manual_seed', 0.92, NULL);
CALL sp_insert_form_relation('fr', 'famille', 'pt', 'familia', 'COGNATE_WEAK', 0.72, TRUE, 'manual_seed', 0.92, NULL);
CALL sp_insert_form_relation('fr', 'famille', 'en', 'family', 'COGNATE_WEAK', 0.66, TRUE, 'manual_seed', 0.90, NULL);

-- FALSE FRIENDS / PEDAGOGICAL CASES

CALL sp_upsert_lexical_entry('CURRENTLY_NOW', 'actuellement, en ce moment', 'currently, at present', 'time', NULL);
CALL sp_upsert_lexical_form('CURRENTLY_NOW', 'fr', 'actuellement', 'actuellement', 'adverb', 0.99, NULL);

CALL sp_upsert_lexical_entry('ACTUALLY_NOW_ES', 'actualmente, en ce moment', 'currently, at present', 'time', NULL);
CALL sp_upsert_lexical_form('ACTUALLY_NOW_ES', 'es', 'actualmente', 'actualmente', 'adverb', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'actuellement', 'es', 'actualmente', 'FALSE_FRIEND', 0.10, TRUE, 'manual_seed', 0.98, 'Ressemblance forte, sens différent du français actuel');

CALL sp_upsert_lexical_entry('BOOKSHOP_STORE', 'librairie, magasin de livres', 'bookshop, bookstore', 'commerce', NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'fr', 'librairie', 'librairie', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'es', 'librería', 'libreria', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'it', 'libreria', 'libreria', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'pt', 'livraria', 'livraria', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'en', 'bookshop', 'bookshop', 'noun', 0.90, NULL);

CALL sp_upsert_lexical_entry('LIBRARY_PUBLIC', 'bibliothèque, lieu de prêt ou consultation de livres', 'library, public or private book collection', 'education', NULL);
CALL sp_upsert_lexical_form('LIBRARY_PUBLIC', 'en', 'library', 'library', 'noun', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'librairie', 'en', 'library', 'FALSE_FRIEND', 0.05, TRUE, 'manual_seed', 0.99, 'Librairie = bookshop, pas library');

CALL sp_upsert_lexical_entry('ATTEND_BE_PRESENT', 'assister à, être présent à', 'attend, be present at', 'action', NULL);
CALL sp_upsert_lexical_form('ATTEND_BE_PRESENT', 'fr', 'assister', 'assister', 'verb', 0.99, NULL);

CALL sp_upsert_lexical_entry('HELP_ASSIST', 'aider, porter assistance', 'help, assist', 'action', NULL);
CALL sp_upsert_lexical_form('HELP_ASSIST', 'es', 'asistir', 'asistir', 'verb', 0.95, NULL);
CALL sp_upsert_lexical_form('HELP_ASSIST', 'en', 'assist', 'assist', 'verb', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'assister', 'en', 'assist', 'FALSE_FRIEND', 0.08, TRUE, 'manual_seed', 0.98, 'Assister (FR) != assist (EN)');

CALL sp_upsert_lexical_entry('CONDOM_PROTECTION', 'préservatif, moyen de protection contraceptive', 'condom, contraceptive protection', 'health', NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'fr', 'préservatif', 'preservatif', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'es', 'preservativo', 'preservativo', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'it', 'preservativo', 'preservativo', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'pt', 'preservativo', 'preservativo', 'noun', 0.99, NULL);

CALL sp_upsert_lexical_entry('PRESERVATIVE_ADDITIVE', 'conservateur, substance qui préserve un aliment', 'preservative, food additive', 'food', NULL);
CALL sp_upsert_lexical_form('PRESERVATIVE_ADDITIVE', 'en', 'preservative', 'preservative', 'noun', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'preservatif', 'en', 'preservative', 'FALSE_FRIEND', 0.05, TRUE, 'manual_seed', 0.98, 'Préservatif (FR) != preservative (EN)');

CALL sp_upsert_lexical_entry('WIDE_BROAD', 'large, de grande largeur', 'wide, broad', 'description', NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'fr', 'large', 'large', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'en', 'large', 'large', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'es', 'ancho', 'ancho', 'adjective', 0.90, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'it', 'ampio', 'ampio', 'adjective', 0.90, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'pt', 'largo', 'largo', 'adjective', 0.85, NULL);

CALL sp_upsert_lexical_entry('LONG_LENGTHY', 'long, de grande longueur', 'long, lengthy', 'description', NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'fr', 'long', 'long', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'es', 'largo', 'largo', 'adjective', 0.95, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'it', 'lungo', 'lungo', 'adjective', 0.95, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'pt', 'longo', 'longo', 'adjective', 0.95, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'en', 'long', 'long', 'adjective', 0.99, NULL);

CALL sp_insert_form_relation('fr', 'large', 'es', 'largo', 'FALSE_FRIEND', 0.10, TRUE, 'manual_seed', 0.96, 'Large (FR) != largo (ES)');

-- =========================================================
-- EXPERIMENTAL SET 2
-- =========================================================

CALL sp_upsert_lexical_entry('ANIMAL_CREATURE', 'animal, être vivant non humain', 'animal, non-human living creature', 'biology', NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'fr', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'es', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'it', 'animale', 'animale', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'pt', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('ANIMAL_CREATURE', 'en', 'animal', 'animal', 'noun', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'es', 'animal', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'it', 'animale', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'pt', 'animal', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'animal', 'en', 'animal', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);

CALL sp_upsert_lexical_entry('CULTURE_HUMAN', 'culture, ensemble de pratiques et savoirs', 'culture, set of practices and knowledge', 'society', NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'fr', 'culture', 'culture', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'es', 'cultura', 'cultura', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'it', 'cultura', 'cultura', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'pt', 'cultura', 'cultura', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CULTURE_HUMAN', 'en', 'culture', 'culture', 'noun', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'es', 'cultura', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'it', 'cultura', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'pt', 'cultura', 'COGNATE_STRONG', 0.96, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'culture', 'en', 'culture', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.99, NULL);

CALL sp_upsert_lexical_entry('POLITICS_FIELD', 'politique, domaine de gouvernement', 'politics, field of government', 'politics', NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'fr', 'politique', 'politique', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'es', 'política', 'politica', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'it', 'politica', 'politica', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'pt', 'política', 'politica', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('POLITICS_FIELD', 'en', 'politics', 'politics', 'noun', 0.96, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'es', 'politica', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'it', 'politica', 'COGNATE_STRONG', 0.91, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'pt', 'politica', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'politique', 'en', 'politics', 'COGNATE_WEAK', 0.72, TRUE, 'manual_seed_v2', 0.92, NULL);

CALL sp_upsert_lexical_entry('PROBLEM_DIFFICULTY', 'problème, difficulté ou question à résoudre', 'problem, difficulty or question to solve', 'general', NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'fr', 'problème', 'probleme', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'es', 'problema', 'problema', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'it', 'problema', 'problema', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'pt', 'problema', 'problema', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('PROBLEM_DIFFICULTY', 'en', 'problem', 'problem', 'noun', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'es', 'problema', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'it', 'problema', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'pt', 'problema', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'probleme', 'en', 'problem', 'COGNATE_STRONG', 0.92, TRUE, 'manual_seed_v2', 0.99, NULL);

CALL sp_upsert_lexical_entry('MUSIC_ART', 'musique, art des sons', 'music, art of sounds', 'art', NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'fr', 'musique', 'musique', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'es', 'música', 'musica', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'it', 'musica', 'musica', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'pt', 'música', 'musica', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('MUSIC_ART', 'en', 'music', 'music', 'noun', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'es', 'musica', 'COGNATE_STRONG', 0.89, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'it', 'musica', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'pt', 'musica', 'COGNATE_STRONG', 0.89, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'musique', 'en', 'music', 'COGNATE_STRONG', 0.86, TRUE, 'manual_seed_v2', 0.97, NULL);

CALL sp_upsert_lexical_entry('GENERAL_COMMON', 'général, commun ou global', 'general, common or global', 'general', NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'fr', 'général', 'general', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'es', 'general', 'general', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'it', 'generale', 'generale', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'pt', 'geral', 'geral', 'adjective', 0.96, NULL);
CALL sp_upsert_lexical_form('GENERAL_COMMON', 'en', 'general', 'general', 'adjective', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'general', 'es', 'general', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'general', 'it', 'generale', 'COGNATE_STRONG', 0.94, TRUE, 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'general', 'pt', 'geral', 'COGNATE_WEAK', 0.68, TRUE, 'manual_seed_v2', 0.92, NULL);
CALL sp_insert_form_relation('fr', 'general', 'en', 'general', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.98, NULL);

CALL sp_upsert_lexical_entry('DIFFERENT_NOT_SAME', 'différent, pas identique', 'different, not the same', 'general', NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'fr', 'différent', 'different', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'es', 'diferente', 'diferente', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'it', 'differente', 'differente', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'pt', 'diferente', 'diferente', 'adjective', 0.98, NULL);
CALL sp_upsert_lexical_form('DIFFERENT_NOT_SAME', 'en', 'different', 'different', 'adjective', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'different', 'es', 'diferente', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'different', 'it', 'differente', 'COGNATE_STRONG', 0.92, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'different', 'pt', 'diferente', 'COGNATE_STRONG', 0.90, TRUE, 'manual_seed_v2', 0.97, NULL);
CALL sp_insert_form_relation('fr', 'different', 'en', 'different', 'COGNATE_STRONG', 0.99, TRUE, 'manual_seed_v2', 0.98, NULL);

CALL sp_upsert_lexical_entry('ASK_REQUEST', 'demander, poser une requête', 'ask, request', 'communication', NULL);
CALL sp_upsert_lexical_form('ASK_REQUEST', 'fr', 'demander', 'demander', 'verb', 0.99, NULL);
CALL sp_upsert_lexical_entry('DEMAND_REQUIRE', 'exiger, réclamer', 'demand, require', 'communication', NULL);
CALL sp_upsert_lexical_form('DEMAND_REQUIRE', 'en', 'demand', 'demand', 'verb', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'demander', 'en', 'demand', 'FALSE_FRIEND', 0.08, TRUE, 'manual_seed_v2', 0.98, 'Demander = ask/request, pas demand');

CALL sp_upsert_lexical_entry('REASONABLE_SENSIBLE', 'sensible, raisonnable', 'sensible, reasonable', 'description', NULL);
CALL sp_upsert_lexical_form('REASONABLE_SENSIBLE', 'fr', 'sensible', 'sensible', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('REASONABLE_SENSIBLE', 'en', 'sensible', 'sensible', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_entry('SENSITIVE_EMOTIONAL', 'sensible, qui ressent facilement / sensitive', 'sensitive, easily affected', 'description', NULL);
CALL sp_upsert_lexical_form('SENSITIVE_EMOTIONAL', 'en', 'sensitive', 'sensitive', 'adjective', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'sensible', 'en', 'sensitive', 'FALSE_FRIEND', 0.10, TRUE, 'manual_seed_v2', 0.97, 'Sensible (FR) != sensitive (EN)');

CALL sp_upsert_lexical_entry('CURRENCY_MONEY', 'monnaie, argent ou devise', 'money, currency', 'economy', NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'fr', 'monnaie', 'monnaie', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'es', 'moneda', 'moneda', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'it', 'moneta', 'moneta', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'pt', 'moeda', 'moeda', 'noun', 0.98, NULL);
CALL sp_upsert_lexical_form('CURRENCY_MONEY', 'en', 'money', 'money', 'noun', 0.98, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'es', 'moneda', 'COGNATE_WEAK', 0.64, TRUE, 'manual_seed_v2', 0.94, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'it', 'moneta', 'COGNATE_WEAK', 0.62, TRUE, 'manual_seed_v2', 0.94, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'pt', 'moeda', 'COGNATE_WEAK', 0.55, TRUE, 'manual_seed_v2', 0.90, NULL);
CALL sp_insert_form_relation('fr', 'monnaie', 'en', 'money', 'COGNATE_WEAK', 0.42, TRUE, 'manual_seed_v2', 0.80, NULL);

CALL sp_upsert_lexical_entry('SECONDARY_SCHOOL_FR', 'collège, établissement scolaire intermédiaire', 'middle school / junior high', 'education', NULL);
CALL sp_upsert_lexical_form('SECONDARY_SCHOOL_FR', 'fr', 'collège', 'college', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_entry('COLLEGE_HE', 'college, établissement d’enseignement supérieur', 'college, higher education institution', 'education', NULL);
CALL sp_upsert_lexical_form('COLLEGE_HE', 'en', 'college', 'college', 'noun', 0.99, NULL);
CALL sp_insert_form_relation('fr', 'college', 'en', 'college', 'FALSE_FRIEND', 0.05, TRUE, 'manual_seed_v2', 0.99, 'Collège (FR) != college (EN)');

CALL sp_insert_ic_feature('es', 'informacion', 'TRANSPARENCY_SCORE', 0.96, NULL, 'manual_seed_v2', 0.95, NULL);
CALL sp_insert_ic_feature('it', 'informazione', 'TRANSPARENCY_SCORE', 0.94, NULL, 'manual_seed_v2', 0.95, NULL);
CALL sp_insert_ic_feature('en', 'college', 'FALSE_FRIEND_RISK', NULL, 'HIGH', 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_ic_feature('en', 'demand', 'FALSE_FRIEND_RISK', NULL, 'HIGH', 'manual_seed_v2', 0.98, NULL);
CALL sp_insert_ic_feature('en', 'sensitive', 'FALSE_FRIEND_RISK', NULL, 'HIGH', 'manual_seed_v2', 0.97, NULL);
