--  Trouver les cognats d’un mot : (ex : 'phenomene')
DELIMITER $$
CREATE PROCEDURE get_cognates (
    IN p_lemma VARCHAR(255)
)
BEGIN
    SELECT
        lf1.lemma AS source_lemma,
        l1.code   AS source_lang,
        lf2.lemma AS target_lemma,
        l2.code   AS target_lang,
        fr.relation_type,
        fr.score
    FROM form_relation fr
    JOIN lexical_form lf1 ON lf1.id = fr.source_form_id
    JOIN lexical_form lf2 ON lf2.id = fr.target_form_id
    JOIN language l1 ON l1.id = lf1.language_id
    JOIN language l2 ON l2.id = lf2.language_id
    WHERE lf1.normalized_lemma = p_lemma
    ORDER BY fr.score DESC, l2.code;
END$$

DELIMITER ;


--  Lister toutes les formes d’une entrée :
SELECT
    le.entry_key,
    le.gloss_fr,
    l.code,
    lf.lemma,
    lf.part_of_speech
FROM lexical_entry le
JOIN lexical_form lf ON lf.entry_id = le.id
JOIN language l ON l.id = lf.language_id
WHERE le.entry_key = 'PHENOMENON_OBSERVABLE'
ORDER BY l.code;

--  Voir les règles entre deux langues :
SELECT
    ls.code AS source_lang,
    lt.code AS target_lang,
    pr.pattern_type,
    pr.source_pattern,
    pr.target_pattern,
    pr.reliability_score
FROM pattern_rule pr
JOIN language ls ON ls.id = pr.source_language_id
JOIN language lt ON lt.id = pr.target_language_id
WHERE ls.code = 'fr' AND lt.code = 'es'
ORDER BY pr.reliability_score DESC;

--  Détecter les relations d’une forme, dans les deux sens :
SELECT
    lf_src.lemma AS from_lemma,
    l_src.code   AS from_lang,
    lf_tgt.lemma AS to_lemma,
    l_tgt.code   AS to_lang,
    fr.relation_type,
    fr.score
FROM form_relation fr
JOIN lexical_form lf_src ON lf_src.id = fr.source_form_id
JOIN lexical_form lf_tgt ON lf_tgt.id = fr.target_form_id
JOIN language l_src ON l_src.id = lf_src.language_id
JOIN language l_tgt ON l_tgt.id = lf_tgt.language_id
WHERE lf_src.normalized_lemma = 'fenomeno'
   OR lf_tgt.normalized_lemma = 'fenomeno'
ORDER BY fr.score DESC;




--  Version bidirectionnelle
/*
    pour gérer :

    source → target
    target → source
*/
DELIMITER $$

CREATE PROCEDURE get_all_relations (
    IN p_lemma VARCHAR(255)
)
BEGIN
    SELECT
        lf1.lemma AS word_1,
        l1.code   AS lang_1,
        lf2.lemma AS word_2,
        l2.code   AS lang_2,
        fr.relation_type,
        fr.score
    FROM form_relation fr
    JOIN lexical_form lf1 ON lf1.id = fr.source_form_id
    JOIN lexical_form lf2 ON lf2.id = fr.target_form_id
    JOIN language l1 ON l1.id = lf1.language_id
    JOIN language l2 ON l2.id = lf2.language_id
    WHERE lf1.normalized_lemma = p_lemma

    UNION

    SELECT
        lf2.lemma AS word_1,
        l2.code   AS lang_1,
        lf1.lemma AS word_2,
        l1.code   AS lang_2,
        fr.relation_type,
        fr.score
    FROM form_relation fr
    JOIN lexical_form lf1 ON lf1.id = fr.source_form_id
    JOIN lexical_form lf2 ON lf2.id = fr.target_form_id
    JOIN language l1 ON l1.id = lf1.language_id
    JOIN language l2 ON l2.id = lf2.language_id
    WHERE lf2.normalized_lemma = p_lemma

    ORDER BY score DESC;

END$$

DELIMITER ;


--  Première PS “scoring V1” (ultra simple)
/*
    Score =

    relation existante → score
    sinon → similarité brute
*/
DELIMITER $$

CREATE PROCEDURE get_similarity (
    IN p_word VARCHAR(255)
)
BEGIN
    SELECT
        lf.lemma,
        l.code,
        CASE
            WHEN lf.normalized_lemma = p_word THEN 1.0
            WHEN lf.normalized_lemma LIKE CONCAT('%', p_word, '%') THEN 0.7
            WHEN p_word LIKE CONCAT('%', lf.normalized_lemma, '%') THEN 0.7
            ELSE 0.3
        END AS similarity_score
    FROM lexical_form lf
    JOIN language l ON l.id = lf.language_id
    ORDER BY similarity_score DESC;
END$$

DELIMITER ;


--  détecter faux amis
DELIMITER $$

CREATE PROCEDURE get_false_friends (
    IN p_lemma VARCHAR(255)
)
BEGIN
    SELECT
        lf1.lemma,
        l1.code,
        lf2.lemma,
        l2.code,
        fr.score
    FROM lexical_form lf1
    JOIN form_relation fr ON fr.source_form_id = lf1.id
    JOIN lexical_form lf2 ON lf2.id = fr.target_form_id
    JOIN language l1 ON l1.id = lf1.language_id
    JOIN language l2 ON l2.id = lf2.language_id
    WHERE lf1.normalized_lemma = p_lemma
      AND fr.relation_type = 'FALSE_FRIEND';
END$$

DELIMITER ;