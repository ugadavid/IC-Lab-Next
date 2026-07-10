-- Experimental seed supporting the Seven Sieves POST /analysis V0 mock.
-- This file is a non-final draft and must be loaded after 30_seed_experimental.sql.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ic_dico;

START TRANSACTION;

-- -----------------------------------------------------------------------------
-- Minimal lexical entries and forms required by the API mock
-- -----------------------------------------------------------------------------

CALL sp_upsert_lexical_entry(
    'ORGANIZATION_ENTITY',
    'organisation, structure organisée',
    'organization, organized structure',
    'general',
    'Support expérimental du mock API Seven Sieves V0.'
);

CALL sp_upsert_lexical_form(
    'ORGANIZATION_ENTITY', 'es', 'organización', 'organizacion',
    'noun', 0.98,
    'Forme espagnole utilisée par le mock API V0.'
);

CALL sp_upsert_lexical_form(
    'ORGANIZATION_ENTITY', 'fr', 'organisation', 'organisation',
    'noun', 0.99,
    'Forme française cible utilisée par le mock API V0.'
);

CALL sp_upsert_lexical_entry(
    'LANGUAGE_SYSTEM',
    'langue, système de communication',
    'language, communication system',
    'language',
    'Entrée pan-romane minimale pour le mock API Seven Sieves V0.'
);

CALL sp_upsert_lexical_form(
    'LANGUAGE_SYSTEM', 'es', 'lenguas', 'lenguas',
    'noun', 0.98,
    'Forme plurielle conservée telle qu’elle apparaît dans le mock.'
);

CALL sp_upsert_lexical_form(
    'LANGUAGE_SYSTEM', 'fr', 'langues', 'langues',
    'noun', 0.98,
    'Forme plurielle de comparaison pour le mock.'
);

CALL sp_upsert_lexical_form(
    'LANGUAGE_SYSTEM', 'it', 'lingue', 'lingue',
    'noun', 0.98,
    'Forme plurielle de comparaison pour le mock.'
);

CALL sp_upsert_lexical_form(
    'LANGUAGE_SYSTEM', 'pt', 'línguas', 'linguas',
    'noun', 0.98,
    'Forme plurielle de comparaison pour le mock.'
);

CALL sp_upsert_lexical_entry(
    'SCIENTIFIC_PROPERTY',
    'scientifique',
    'scientific',
    'general',
    'Support lexical minimal pour le tamis grapho-phonique du mock.'
);

CALL sp_upsert_lexical_form(
    'SCIENTIFIC_PROPERTY', 'es', 'científica', 'cientifica',
    'adjective', 0.97,
    'Forme fléchie espagnole conservée pour reconnaître le texte du mock.'
);

CALL sp_upsert_lexical_entry(
    'PROMOTE_ACTION',
    'promouvoir, favoriser',
    'promote, foster',
    'general',
    'Support lexical minimal pour le signal morphosyntaxique du mock.'
);

CALL sp_upsert_lexical_form(
    'PROMOTE_ACTION', 'es', 'promueve', 'promueve',
    'verb', 0.97,
    'Forme conjuguée espagnole conservée pour reconnaître le texte du mock.'
);

CALL sp_upsert_lexical_entry(
    'UNDERSTAND_COMPREHEND',
    'comprendre',
    'understand, comprehend',
    'general',
    'Entrée pan-romane minimale pour le mock API Seven Sieves V0.'
);

CALL sp_upsert_lexical_form(
    'UNDERSTAND_COMPREHEND', 'es', 'comprender', 'comprender',
    'verb', 0.99,
    'Infinitif espagnol utilisé par le mock.'
);

CALL sp_upsert_lexical_form(
    'UNDERSTAND_COMPREHEND', 'fr', 'comprendre', 'comprendre',
    'verb', 0.99,
    'Infinitif français de comparaison.'
);

CALL sp_upsert_lexical_form(
    'UNDERSTAND_COMPREHEND', 'it', 'comprendere', 'comprendere',
    'verb', 0.99,
    'Infinitif italien de comparaison.'
);

CALL sp_upsert_lexical_form(
    'UNDERSTAND_COMPREHEND', 'pt', 'compreender', 'compreender',
    'verb', 0.99,
    'Infinitif portugais de comparaison.'
);

-- -----------------------------------------------------------------------------
-- Minimal cognate relations
--
-- sp_insert_form_relation is intentionally not used here because it performs an
-- unconditional INSERT. The guarded statements keep ordinary replays from
-- creating duplicate relations.
-- -----------------------------------------------------------------------------

INSERT INTO form_relation (
    source_form_id,
    target_form_id,
    relation_type,
    score,
    is_symmetric,
    source_label,
    confidence_score,
    notes
)
SELECT
    source_form.id,
    target_form.id,
    'COGNATE_STRONG',
    0.94,
    TRUE,
    'api_mock_support_v0',
    0.98,
    'Relation expérimentale organización ↔ organisation.'
FROM lexical_form source_form
JOIN language source_language
    ON source_language.id = source_form.language_id
JOIN lexical_form target_form
    ON target_form.lemma = 'organización'
    AND target_form.part_of_speech = 'noun'
JOIN language target_language
    ON target_language.id = target_form.language_id
WHERE source_language.code = 'fr'
  AND source_form.lemma = 'organisation'
  AND source_form.part_of_speech = 'noun'
  AND target_language.code = 'es'
  AND NOT EXISTS (
      SELECT 1
      FROM form_relation existing_relation
      WHERE (
            (
                existing_relation.source_form_id = source_form.id
                AND existing_relation.target_form_id = target_form.id
            )
            OR (
                existing_relation.is_symmetric = TRUE
                AND existing_relation.source_form_id = target_form.id
                AND existing_relation.target_form_id = source_form.id
            )
        )
  );

INSERT INTO form_relation (
    source_form_id,
    target_form_id,
    relation_type,
    score,
    is_symmetric,
    source_label,
    confidence_score,
    notes
)
SELECT
    source_form.id,
    target_form.id,
    'COGNATE_WEAK',
    0.78,
    TRUE,
    'api_mock_support_v0',
    0.95,
    'Relation expérimentale langues ↔ lenguas.'
FROM lexical_form source_form
JOIN language source_language
    ON source_language.id = source_form.language_id
JOIN lexical_form target_form
    ON target_form.lemma = 'lenguas'
    AND target_form.part_of_speech = 'noun'
JOIN language target_language
    ON target_language.id = target_form.language_id
WHERE source_language.code = 'fr'
  AND source_form.lemma = 'langues'
  AND source_form.part_of_speech = 'noun'
  AND target_language.code = 'es'
  AND NOT EXISTS (
      SELECT 1
      FROM form_relation existing_relation
      WHERE (
            (
                existing_relation.source_form_id = source_form.id
                AND existing_relation.target_form_id = target_form.id
            )
            OR (
                existing_relation.is_symmetric = TRUE
                AND existing_relation.source_form_id = target_form.id
                AND existing_relation.target_form_id = source_form.id
            )
        )
  );

INSERT INTO form_relation (
    source_form_id,
    target_form_id,
    relation_type,
    score,
    is_symmetric,
    source_label,
    confidence_score,
    notes
)
SELECT
    source_form.id,
    target_form.id,
    'COGNATE_STRONG',
    0.90,
    TRUE,
    'api_mock_support_v0',
    0.97,
    'Relation expérimentale langues ↔ lingue.'
FROM lexical_form source_form
JOIN language source_language
    ON source_language.id = source_form.language_id
JOIN lexical_form target_form
    ON target_form.lemma = 'lingue'
    AND target_form.part_of_speech = 'noun'
JOIN language target_language
    ON target_language.id = target_form.language_id
WHERE source_language.code = 'fr'
  AND source_form.lemma = 'langues'
  AND source_form.part_of_speech = 'noun'
  AND target_language.code = 'it'
  AND NOT EXISTS (
      SELECT 1
      FROM form_relation existing_relation
      WHERE (
            (
                existing_relation.source_form_id = source_form.id
                AND existing_relation.target_form_id = target_form.id
            )
            OR (
                existing_relation.is_symmetric = TRUE
                AND existing_relation.source_form_id = target_form.id
                AND existing_relation.target_form_id = source_form.id
            )
        )
  );

INSERT INTO form_relation (
    source_form_id,
    target_form_id,
    relation_type,
    score,
    is_symmetric,
    source_label,
    confidence_score,
    notes
)
SELECT
    source_form.id,
    target_form.id,
    'COGNATE_WEAK',
    0.76,
    TRUE,
    'api_mock_support_v0',
    0.95,
    'Relation expérimentale langues ↔ línguas.'
FROM lexical_form source_form
JOIN language source_language
    ON source_language.id = source_form.language_id
JOIN lexical_form target_form
    ON target_form.lemma = 'línguas'
    AND target_form.part_of_speech = 'noun'
JOIN language target_language
    ON target_language.id = target_form.language_id
WHERE source_language.code = 'fr'
  AND source_form.lemma = 'langues'
  AND source_form.part_of_speech = 'noun'
  AND target_language.code = 'pt'
  AND NOT EXISTS (
      SELECT 1
      FROM form_relation existing_relation
      WHERE (
            (
                existing_relation.source_form_id = source_form.id
                AND existing_relation.target_form_id = target_form.id
            )
            OR (
                existing_relation.is_symmetric = TRUE
                AND existing_relation.source_form_id = target_form.id
                AND existing_relation.target_form_id = source_form.id
            )
        )
  );

-- -----------------------------------------------------------------------------
-- Minimal suffix transformation for Spanish -> French
--
-- There is no current stored procedure for pattern_rule, so this insertion is
-- guarded directly. No generic -er infinitive rule is added in this seed.
-- -----------------------------------------------------------------------------

INSERT INTO pattern_rule (
    source_language_id,
    target_language_id,
    pattern_type,
    source_pattern,
    target_pattern,
    description,
    reliability_score,
    examples,
    notes
)
SELECT
    source_language.id,
    target_language.id,
    'SUFFIX_TRANSFORM',
    'ción',
    'tion',
    'Correspondance fréquente du suffixe espagnol -ción vers le suffixe français -tion.',
    0.88,
    'organización → organisation',
    'Règle expérimentale V0 : la cible produite doit être confirmée par une forme lexicale attestée.'
FROM language source_language
JOIN language target_language
    ON target_language.code = 'fr'
WHERE source_language.code = 'es'
  AND NOT EXISTS (
      SELECT 1
      FROM pattern_rule existing_rule
      WHERE existing_rule.source_language_id = source_language.id
        AND existing_rule.target_language_id = target_language.id
        AND existing_rule.pattern_type = 'SUFFIX_TRANSFORM'
        AND existing_rule.source_pattern = 'ción'
        AND existing_rule.target_pattern = 'tion'
  );

COMMIT;
