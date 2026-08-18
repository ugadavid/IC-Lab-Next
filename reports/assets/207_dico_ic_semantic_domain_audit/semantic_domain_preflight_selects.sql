-- Mission 207 — exclusivement SELECT
SELECT COUNT(*) AS total_entries,
       SUM(semantic_domain IS NOT NULL) AS non_null_values,
       SUM(semantic_domain IS NULL) AS null_values,
       SUM(BINARY semantic_domain = BINARY '') AS empty_values,
       SUM(CHAR_LENGTH(semantic_domain) <> CHAR_LENGTH(TRIM(semantic_domain))) AS values_with_outer_spaces,
       COUNT(DISTINCT BINARY semantic_domain) AS exact_binary_distinct_values,
       COUNT(DISTINCT BINARY TRIM(semantic_domain)) AS trimmed_binary_distinct_values
FROM lexical_entry;

SELECT semantic_domain AS exact_value, HEX(semantic_domain) AS utf8_hex,
       COUNT(*) AS frequency, GROUP_CONCAT(id ORDER BY id) AS entry_ids,
       GROUP_CONCAT(entry_key ORDER BY id SEPARATOR '|') AS entry_keys
FROM lexical_entry
GROUP BY BINARY semantic_domain
ORDER BY BINARY semantic_domain;

SELECT le.id, le.entry_key, le.semantic_domain, le.gloss_fr,
       MAX(CASE WHEN l.code = 'fr' THEN lf.lemma END) AS french_lemma
FROM lexical_entry AS le
LEFT JOIN lexical_form AS lf ON lf.entry_id = le.id
LEFT JOIN language AS l ON l.id = lf.language_id
GROUP BY le.id, le.entry_key, le.semantic_domain, le.gloss_fr
ORDER BY le.id;

SELECT column_name, column_type, is_nullable, character_set_name, collation_name, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'lexical_entry' AND column_name = 'semantic_domain';

SELECT index_name, non_unique, seq_in_index, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'lexical_entry'
ORDER BY index_name, seq_in_index;

SELECT 'language' AS object_name, COUNT(*) AS row_count FROM language
UNION ALL SELECT 'lexical_entry', COUNT(*) FROM lexical_entry
UNION ALL SELECT 'lexical_form', COUNT(*) FROM lexical_form
UNION ALL SELECT 'inflected_form', COUNT(*) FROM inflected_form
UNION ALL SELECT 'connector_help', COUNT(*) FROM connector_help
UNION ALL SELECT 'form_relation', COUNT(*) FROM form_relation
UNION ALL SELECT 'pattern_rule', COUNT(*) FROM pattern_rule
UNION ALL SELECT 'ic_feature', COUNT(*) FROM ic_feature;

