/**
    A vérifier, comparer à l'existant !!
*/

USE ic_dico;

-- =========================================================
-- LANGUAGES
-- =========================================================

CALL sp_upsert_language('fr', 'Français', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('es', 'Español', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('it', 'Italiano', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('pt', 'Português', 'Romance', TRUE, TRUE);
CALL sp_upsert_language('en', 'English', 'Germanic', FALSE, TRUE);

-- =========================================================
-- ENTRY : PHENOMENON
-- =========================================================

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

-- =========================================================
-- ENTRY : INFORMATION
-- =========================================================

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

-- =========================================================
-- ENTRY : IMPORTANT
-- =========================================================

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

-- =========================================================
-- ENTRY : NATION
-- =========================================================

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

-- =========================================================
-- ENTRY : UNIVERSITY
-- =========================================================

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

-- =========================================================
-- ENTRY : FAMILY
-- =========================================================

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

-- =========================================================
-- FALSE FRIENDS / PEDAGOGICAL CASES
-- =========================================================

CALL sp_upsert_lexical_entry(
    'CURRENTLY_NOW',
    'actuellement, en ce moment',
    'currently, at present',
    'time',
    NULL
);
CALL sp_upsert_lexical_form('CURRENTLY_NOW', 'fr', 'actuellement', 'actuellement', 'adverb', 0.99, NULL);

CALL sp_upsert_lexical_entry(
    'ACTUALLY_NOW_ES',
    'actualmente, en ce moment',
    'currently, at present',
    'time',
    NULL
);
CALL sp_upsert_lexical_form('ACTUALLY_NOW_ES', 'es', 'actualmente', 'actualmente', 'adverb', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'actuellement',
    'es', 'actualmente',
    'FALSE_FRIEND',
    0.10,
    TRUE,
    'manual_seed',
    0.98,
    'Ressemblance forte, sens différent du français actuel'
);

CALL sp_upsert_lexical_entry(
    'BOOKSHOP_STORE',
    'librairie, magasin de livres',
    'bookshop, bookstore',
    'commerce',
    NULL
);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'fr', 'librairie', 'librairie', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'es', 'librería', 'libreria', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'it', 'libreria', 'libreria', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'pt', 'livraria', 'livraria', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('BOOKSHOP_STORE', 'en', 'bookshop', 'bookshop', 'noun', 0.90, NULL);

CALL sp_upsert_lexical_entry(
    'LIBRARY_PUBLIC',
    'bibliothèque, lieu de prêt ou consultation de livres',
    'library, public or private book collection',
    'education',
    NULL
);
CALL sp_upsert_lexical_form('LIBRARY_PUBLIC', 'en', 'library', 'library', 'noun', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'librairie',
    'en', 'library',
    'FALSE_FRIEND',
    0.05,
    TRUE,
    'manual_seed',
    0.99,
    'Librairie = bookshop, pas library'
);

CALL sp_upsert_lexical_entry(
    'ATTEND_BE_PRESENT',
    'assister à, être présent à',
    'attend, be present at',
    'action',
    NULL
);
CALL sp_upsert_lexical_form('ATTEND_BE_PRESENT', 'fr', 'assister', 'assister', 'verb', 0.99, NULL);

CALL sp_upsert_lexical_entry(
    'HELP_ASSIST',
    'aider, porter assistance',
    'help, assist',
    'action',
    NULL
);
CALL sp_upsert_lexical_form('HELP_ASSIST', 'es', 'asistir', 'asistir', 'verb', 0.95, NULL);
CALL sp_upsert_lexical_form('HELP_ASSIST', 'en', 'assist', 'assist', 'verb', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'assister',
    'en', 'assist',
    'FALSE_FRIEND',
    0.08,
    TRUE,
    'manual_seed',
    0.98,
    'Assister (FR) ≠ assist (EN)'
);

CALL sp_upsert_lexical_entry(
    'CONDOM_PROTECTION',
    'préservatif, moyen de protection contraceptive',
    'condom, contraceptive protection',
    'health',
    NULL
);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'fr', 'préservatif', 'preservatif', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'es', 'preservativo', 'preservativo', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'it', 'preservativo', 'preservativo', 'noun', 0.99, NULL);
CALL sp_upsert_lexical_form('CONDOM_PROTECTION', 'pt', 'preservativo', 'preservativo', 'noun', 0.99, NULL);

CALL sp_upsert_lexical_entry(
    'PRESERVATIVE_ADDITIVE',
    'conservateur, substance qui préserve un aliment',
    'preservative, food additive',
    'food',
    NULL
);
CALL sp_upsert_lexical_form('PRESERVATIVE_ADDITIVE', 'en', 'preservative', 'preservative', 'noun', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'preservatif',
    'en', 'preservative',
    'FALSE_FRIEND',
    0.05,
    TRUE,
    'manual_seed',
    0.98,
    'Préservatif (FR) ≠ preservative (EN)'
);

CALL sp_upsert_lexical_entry(
    'WIDE_BROAD',
    'large, de grande largeur',
    'wide, broad',
    'description',
    NULL
);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'fr', 'large', 'large', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'en', 'large', 'large', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'es', 'ancho', 'ancho', 'adjective', 0.90, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'it', 'ampio', 'ampio', 'adjective', 0.90, NULL);
CALL sp_upsert_lexical_form('WIDE_BROAD', 'pt', 'largo', 'largo', 'adjective', 0.85, NULL);

CALL sp_upsert_lexical_entry(
    'LONG_LENGTHY',
    'long, de grande longueur',
    'long, lengthy',
    'description',
    NULL
);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'fr', 'long', 'long', 'adjective', 0.99, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'es', 'largo', 'largo', 'adjective', 0.95, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'it', 'lungo', 'lungo', 'adjective', 0.95, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'pt', 'longo', 'longo', 'adjective', 0.95, NULL);
CALL sp_upsert_lexical_form('LONG_LENGTHY', 'en', 'long', 'long', 'adjective', 0.99, NULL);

CALL sp_insert_form_relation(
    'fr', 'large',
    'es', 'largo',
    'FALSE_FRIEND',
    0.10,
    TRUE,
    'manual_seed',
    0.96,
    'Large (FR) ≠ largo (ES)'
);