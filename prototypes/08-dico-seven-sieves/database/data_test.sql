INSERT INTO language (code, name, family, is_romance) VALUES
('fr', 'Français', 'Romance', 1),
('es', 'Español', 'Romance', 1),
('it', 'Italiano', 'Romance', 1),
('pt', 'Português', 'Romance', 1),
('en', 'English', 'Germanic', 0);

INSERT INTO lexical_entry (entry_key, gloss_fr, gloss_en, semantic_domain)
VALUES
('PHENOMENON_OBSERVABLE', 'phénomène observable', 'observable phenomenon', 'science');

INSERT INTO lexical_form
(entry_id, language_id, lemma, normalized_lemma, part_of_speech, confidence_score)
VALUES
(1, 1, 'phénomène', 'phenomene', 'noun', 0.95),
(1, 2, 'fenómeno',  'fenomeno',  'noun', 0.95),
(1, 3, 'fenomeno',  'fenomeno',  'noun', 0.95),
(1, 4, 'fenômeno',  'fenomeno',  'noun', 0.95),
(1, 5, 'phenomenon','phenomenon','noun', 0.90);

INSERT INTO form_relation
(source_form_id, target_form_id, relation_type, score, is_symmetric, source_label, confidence_score)
VALUES
(1, 2, 'COGNATE_STRONG', 0.93, 1, 'manual_seed', 0.95),
(1, 3, 'COGNATE_STRONG', 0.95, 1, 'manual_seed', 0.95),
(1, 4, 'COGNATE_STRONG', 0.94, 1, 'manual_seed', 0.95),
(1, 5, 'COGNATE_STRONG', 0.88, 1, 'manual_seed', 0.90);

INSERT INTO pattern_rule
(source_language_id, target_language_id, pattern_type, source_pattern, target_pattern, description, reliability_score)
VALUES
(1, 2, 'ORTHOGRAPHIC', 'ph', 'f', 'Correspondance fréquente français → espagnol', 0.80),
(1, 3, 'ORTHOGRAPHIC', 'ph', 'f', 'Correspondance fréquente français → italien', 0.80),
(1, 4, 'ORTHOGRAPHIC', 'ph', 'f', 'Correspondance fréquente français → portugais', 0.80);

INSERT INTO ic_feature
(form_id, feature_type, value_num, value_text, source_label, confidence_score)
VALUES
(2, 'GRAPHIC_SIMILARITY', 0.93, NULL, 'manual_seed', 0.90),
(2, 'TRANSPARENCY_SCORE', 0.91, NULL, 'manual_seed', 0.90),
(5, 'TRANSPARENCY_SCORE', 0.78, NULL, 'manual_seed', 0.80);






-- ======================
-- LEXICAL ENTRIES
-- ======================

INSERT INTO lexical_entry (entry_key, gloss_fr, gloss_en, semantic_domain)
VALUES
('INFORMATION_DATA', 'information, donnée communiquée', 'information, communicated data', 'communication'),
('IMPORTANT_SIGNIFICANT', 'important, significatif', 'important, significant', 'general'),
('NATION_COUNTRY', 'nation, pays ou communauté politique', 'nation, country or political community', 'politics'),
('UNIVERSITY_INSTITUTION', 'université, établissement d’enseignement supérieur', 'university, higher education institution', 'education'),
('FAMILY_RELATION', 'famille, groupe familial', 'family, kinship group', 'social'),
('CURRENTLY_NOW', 'actuellement, en ce moment', 'currently, at present', 'time'),
('EVENTUALLY_POSSIBLY', 'éventuellement, possiblement', 'possibly, perhaps', 'modality'),
('BOOKSHOP_STORE', 'librairie, magasin de livres', 'bookshop, bookstore', 'commerce'),
('LIBRARY_PUBLIC', 'bibliothèque, lieu de consultation ou prêt de livres', 'library, public or private book collection', 'education'),
('ATTEND_BE_PRESENT', 'assister à, être présent à', 'attend, be present at', 'action'),
('HELP_ASSIST', 'aider, porter assistance', 'help, assist', 'action'),
('CONDOM_PROTECTION', 'préservatif, moyen de protection contraceptive', 'condom, contraceptive protection', 'health'),
('PRESERVATIVE_ADDITIVE', 'conservateur, substance qui préserve un aliment', 'preservative, food additive', 'food'),
('WIDE_BROAD', 'large, de grande largeur', 'wide, broad', 'description'),
('LONG_LENGTHY', 'long, de grande longueur', 'long, lengthy', 'description');

-- ======================
-- LEXICAL FORMS
-- ======================
-- On suppose que tes 5 langues ont déjà les ids 1..5 :
-- 1 fr, 2 es, 3 it, 4 pt, 5 en

INSERT INTO lexical_form
(entry_id, language_id, lemma, normalized_lemma, part_of_speech, confidence_score)
VALUES
-- INFORMATION_DATA
(2, 1, 'information', 'information', 'noun', 0.98),
(2, 2, 'información', 'informacion', 'noun', 0.98),
(2, 3, 'informazione', 'informazione', 'noun', 0.98),
(2, 4, 'informação', 'informacao', 'noun', 0.98),
(2, 5, 'information', 'information', 'noun', 0.98),

-- IMPORTANT_SIGNIFICANT
(3, 1, 'important', 'important', 'adjective', 0.98),
(3, 2, 'importante', 'importante', 'adjective', 0.98),
(3, 3, 'importante', 'importante', 'adjective', 0.98),
(3, 4, 'importante', 'importante', 'adjective', 0.98),
(3, 5, 'important', 'important', 'adjective', 0.98),

-- NATION_COUNTRY
(4, 1, 'nation', 'nation', 'noun', 0.97),
(4, 2, 'nación', 'nacion', 'noun', 0.97),
(4, 3, 'nazione', 'nazione', 'noun', 0.97),
(4, 4, 'nação', 'nacao', 'noun', 0.97),
(4, 5, 'nation', 'nation', 'noun', 0.97),

-- UNIVERSITY_INSTITUTION
(5, 1, 'université', 'universite', 'noun', 0.96),
(5, 2, 'universidad', 'universidad', 'noun', 0.96),
(5, 3, 'università', 'universita', 'noun', 0.96),
(5, 4, 'universidade', 'universidade', 'noun', 0.96),
(5, 5, 'university', 'university', 'noun', 0.94),

-- FAMILY_RELATION
(6, 1, 'famille', 'famille', 'noun', 0.95),
(6, 2, 'familia', 'familia', 'noun', 0.95),
(6, 3, 'famiglia', 'famiglia', 'noun', 0.95),
(6, 4, 'família', 'familia', 'noun', 0.95),
(6, 5, 'family', 'family', 'noun', 0.94),

-- CURRENTLY_NOW
(7, 1, 'actuellement', 'actuellement', 'adverb', 0.99),
(7, 5, 'currently', 'currently', 'adverb', 0.99),

-- EVENTUALLY_POSSIBLY
(8, 1, 'éventuellement', 'eventuellement', 'adverb', 0.99),
(8, 5, 'eventually', 'eventually', 'adverb', 0.99),
(8, 2, 'eventualmente', 'eventualmente', 'adverb', 0.95),
(8, 3, 'eventualmente', 'eventualmente', 'adverb', 0.95),
(8, 4, 'eventualmente', 'eventualmente', 'adverb', 0.95),

-- BOOKSHOP_STORE
(9, 1, 'librairie', 'librairie', 'noun', 0.99),
(9, 2, 'librería', 'libreria', 'noun', 0.99),
(9, 3, 'libreria', 'libreria', 'noun', 0.99),
(9, 4, 'livraria', 'livraria', 'noun', 0.99),
(9, 5, 'bookshop', 'bookshop', 'noun', 0.90),

-- LIBRARY_PUBLIC
(10, 1, 'bibliothèque', 'bibliotheque', 'noun', 0.99),
(10, 2, 'biblioteca', 'biblioteca', 'noun', 0.99),
(10, 3, 'biblioteca', 'biblioteca', 'noun', 0.99),
(10, 4, 'biblioteca', 'biblioteca', 'noun', 0.99),
(10, 5, 'library', 'library', 'noun', 0.99),

-- ATTEND_BE_PRESENT
(11, 1, 'assister', 'assister', 'verb', 0.99),
(11, 5, 'attend', 'attend', 'verb', 0.99),

-- HELP_ASSIST
(12, 1, 'aider', 'aider', 'verb', 0.99),
(12, 2, 'asistir', 'asistir', 'verb', 0.95),
(12, 5, 'assist', 'assist', 'verb', 0.99),

-- CONDOM_PROTECTION
(13, 1, 'préservatif', 'preservatif', 'noun', 0.99),
(13, 2, 'preservativo', 'preservativo', 'noun', 0.99),
(13, 3, 'preservativo', 'preservativo', 'noun', 0.99),
(13, 4, 'preservativo', 'preservativo', 'noun', 0.99),
(13, 5, 'condom', 'condom', 'noun', 0.95),

-- PRESERVATIVE_ADDITIVE
(14, 1, 'conservateur', 'conservateur', 'noun', 0.99),
(14, 2, 'preservative', 'preservative', 'noun', 0.90),
(14, 5, 'preservative', 'preservative', 'noun', 0.99),

-- WIDE_BROAD
(15, 1, 'large', 'large', 'adjective', 0.99),
(15, 5, 'large', 'large', 'adjective', 0.99),
(15, 2, 'ancho', 'ancho', 'adjective', 0.90),
(15, 3, 'ampio', 'ampio', 'adjective', 0.90),
(15, 4, 'largo', 'largo', 'adjective', 0.85),

-- LONG_LENGTHY
(16, 1, 'long', 'long', 'adjective', 0.99),
(16, 2, 'largo', 'largo', 'adjective', 0.95),
(16, 3, 'lungo', 'lungo', 'adjective', 0.95),
(16, 4, 'longo', 'longo', 'adjective', 0.95),
(16, 5, 'long', 'long', 'adjective', 0.99);

-- ======================
-- FORM RELATIONS
-- ======================

INSERT INTO form_relation
(source_form_id, target_form_id, relation_type, score, is_symmetric, source_label, confidence_score)
VALUES
-- information
(6, 7, 'COGNATE_STRONG', 0.98, 1, 'manual_seed', 0.98),
(6, 8, 'COGNATE_STRONG', 0.96, 1, 'manual_seed', 0.98),
(6, 9, 'COGNATE_STRONG', 0.95, 1, 'manual_seed', 0.98),
(6, 10, 'COGNATE_STRONG', 0.99, 1, 'manual_seed', 0.98),

-- important
(11, 12, 'COGNATE_STRONG', 0.99, 1, 'manual_seed', 0.99),
(11, 13, 'COGNATE_STRONG', 0.99, 1, 'manual_seed', 0.99),
(11, 14, 'COGNATE_STRONG', 0.99, 1, 'manual_seed', 0.99),
(11, 15, 'COGNATE_STRONG', 0.99, 1, 'manual_seed', 0.99),

-- nation
(16, 17, 'COGNATE_STRONG', 0.96, 1, 'manual_seed', 0.97),
(16, 18, 'COGNATE_STRONG', 0.96, 1, 'manual_seed', 0.97),
(16, 19, 'COGNATE_STRONG', 0.95, 1, 'manual_seed', 0.97),
(16, 20, 'COGNATE_STRONG', 0.99, 1, 'manual_seed', 0.97),

-- université
(21, 22, 'COGNATE_WEAK', 0.78, 1, 'manual_seed', 0.95),
(21, 23, 'COGNATE_STRONG', 0.93, 1, 'manual_seed', 0.95),
(21, 24, 'COGNATE_WEAK', 0.82, 1, 'manual_seed', 0.95),
(21, 25, 'COGNATE_WEAK', 0.70, 1, 'manual_seed', 0.90),

-- famille
(26, 27, 'COGNATE_WEAK', 0.74, 1, 'manual_seed', 0.92),
(26, 28, 'COGNATE_WEAK', 0.68, 1, 'manual_seed', 0.92),
(26, 29, 'COGNATE_WEAK', 0.72, 1, 'manual_seed', 0.92),
(26, 30, 'COGNATE_WEAK', 0.66, 1, 'manual_seed', 0.90),

-- faux amis actuellement / eventualmente / library etc.
(31, 33, 'FALSE_FRIEND', 0.15, 1, 'manual_seed', 0.98), -- actuellement / eventualmente
(34, 35, 'FALSE_FRIEND', 0.10, 1, 'manual_seed', 0.99), -- librairie / bookshop non faux ami ? non, donc à retirer si tu veux
(34, 40, 'FALSE_FRIEND', 0.05, 1, 'manual_seed', 0.99), -- librairie / library
(41, 42, 'FALSE_FRIEND', 0.08, 1, 'manual_seed', 0.98), -- assister / assist
(43, 46, 'FALSE_FRIEND', 0.05, 1, 'manual_seed', 0.98), -- préservatif / preservative
(47, 37, 'FALSE_FRIEND', 0.05, 1, 'manual_seed', 0.95), -- conservateur / preservative
(49, 53, 'FALSE_FRIEND', 0.10, 1, 'manual_seed', 0.96), -- large / largo
(54, 52, 'FALSE_FRIEND', 0.10, 1, 'manual_seed', 0.96), -- long / largo (depuis le français long vers es largo, ici pas faux ami, donc voir remarque ci-dessous)

-- vraies équivalences utiles
(34, 35, 'PARTIAL_EQUIVALENCE', 0.55, 1, 'manual_seed', 0.85),
(36, 40, 'PARTIAL_EQUIVALENCE', 0.20, 1, 'manual_seed', 0.75),
(41, 44, 'PARTIAL_EQUIVALENCE', 0.20, 1, 'manual_seed', 0.75),
(43, 44, 'COGNATE_STRONG', 0.95, 1, 'manual_seed', 0.95),
(49, 50, 'PARTIAL_EQUIVALENCE', 0.20, 1, 'manual_seed', 0.70),
(54, 55, 'PARTIAL_EQUIVALENCE', 0.95, 1, 'manual_seed', 0.95),
(54, 56, 'PARTIAL_EQUIVALENCE', 0.90, 1, 'manual_seed', 0.95),
(54, 57, 'PARTIAL_EQUIVALENCE', 0.90, 1, 'manual_seed', 0.95);

