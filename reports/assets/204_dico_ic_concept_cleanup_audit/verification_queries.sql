-- Mission 204 — vérifications strictement en lecture seule
-- Aucune instruction d'écriture n'est présente dans ce fichier.

SELECT COUNT(*) AS lexical_entries FROM lexical_entry;
SELECT COUNT(*) AS lexical_forms FROM lexical_form;
SELECT COUNT(*) AS inflected_forms FROM inflected_form;
SELECT COUNT(*) AS connector_helps FROM connector_help;
SELECT COUNT(*) AS form_relations FROM form_relation;
SELECT COUNT(*) AS pattern_rules FROM pattern_rule;
SELECT COUNT(*) AS ic_features FROM ic_feature;
SELECT COUNT(*) AS languages FROM language;

SELECT le.id, le.entry_key, le.gloss_fr, le.gloss_en, le.semantic_domain,
       (SELECT COUNT(*) FROM lexical_form lf WHERE lf.entry_id=le.id) AS forms,
       (SELECT COUNT(*) FROM inflected_form i JOIN lexical_form lf ON lf.id=i.lexical_form_id WHERE lf.entry_id=le.id) AS inflections,
       (SELECT COUNT(*) FROM form_relation r JOIN lexical_form lf ON lf.id=r.source_form_id WHERE lf.entry_id=le.id) AS outgoing_relations,
       (SELECT COUNT(*) FROM form_relation r JOIN lexical_form lf ON lf.id=r.target_form_id WHERE lf.entry_id=le.id) AS incoming_relations,
       (SELECT COUNT(*) FROM ic_feature ic JOIN lexical_form lf ON lf.id=ic.form_id WHERE lf.entry_id=le.id) AS features,
       (SELECT COUNT(*) FROM connector_help ch WHERE ch.lexical_entry_id=le.id) AS connector_helps
FROM lexical_entry le
ORDER BY le.id;

SELECT le.id, le.entry_key, l.code AS language, lf.id AS form_id, lf.lemma, lf.part_of_speech,
       lf.confidence_score, lf.source_label
FROM lexical_entry le
LEFT JOIN lexical_form lf ON lf.entry_id=le.id
LEFT JOIN language l ON l.id=lf.language_id
ORDER BY le.id, l.code, lf.id;

SELECT l.code, lf.normalized_lemma, COUNT(DISTINCT lf.entry_id) AS entry_count,
       GROUP_CONCAT(DISTINCT CONCAT(le.id, ':', le.entry_key) ORDER BY le.id SEPARATOR '|') AS entries
FROM lexical_form lf
JOIN language l ON l.id=lf.language_id
JOIN lexical_entry le ON le.id=lf.entry_id
GROUP BY l.code, lf.normalized_lemma
HAVING COUNT(DISTINCT lf.entry_id) > 1
ORDER BY entry_count DESC, l.code, lf.normalized_lemma;

SELECT LOWER(TRIM(gloss_fr)) AS normalized_gloss_fr, COUNT(*) AS entry_count,
       GROUP_CONCAT(CONCAT(id, ':', entry_key) ORDER BY id SEPARATOR '|') AS entries
FROM lexical_entry
WHERE NULLIF(TRIM(gloss_fr), '') IS NOT NULL
GROUP BY LOWER(TRIM(gloss_fr))
HAVING COUNT(*) > 1
ORDER BY entry_count DESC, normalized_gloss_fr;

SELECT id, entry_key, gloss_fr, gloss_en, semantic_domain
FROM lexical_entry
WHERE NOT EXISTS (SELECT 1 FROM lexical_form lf WHERE lf.entry_id=lexical_entry.id)
ORDER BY id;

SELECT id, entry_key
FROM lexical_entry
WHERE entry_key REGEXP '_(VERB|VERBE|NOUN|ADJ|ADJECTIF|ADJECTIVE)(_|$)'
ORDER BY id;

SELECT id, entry_key, gloss_fr, gloss_en, semantic_domain
FROM lexical_entry
WHERE entry_key IN (
  'SOUFFRIR','SUFFER','SOUFFRIR_VERB','SOFFRIR',
  'S_ELEVER','S_ELEVER_VERB','ELEVERSER_VERB','ELEVER','ELEVATION','RISE','SE_LEVER_VERBE_PRONOMINAL',
  'PREOCCUPANT','PREOCCUPANT_ADJ','PREOCCUPANT_ADJECTIF','PREOCCUPANT_ADJECTIVE','WORRYING','WORRISOME',
  'AUGMENTER','AUGMENTER_VERB','INCREASE','PRODUIRE','PRODUIRE_VERB','PRODUCE',
  'HUMANITE','HUMANITE_NOUN','HUMANITY','RUIN','RUINER','RUINER_VERB','RUI_NER','RUIINER_VERB'
)
ORDER BY id;
