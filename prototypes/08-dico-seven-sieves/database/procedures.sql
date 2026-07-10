DELIMITER $$
--
-- Procédures
--
CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_get_all_relations` (IN `p_lemma` VARCHAR(255))   BEGIN
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

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_get_cognates` (IN `p_lemma` VARCHAR(255))   BEGIN
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

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_get_false_friends` (IN `p_lemma` VARCHAR(255))   BEGIN
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

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_get_similarity` (IN `p_word` VARCHAR(255))   BEGIN
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

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_insert_form_relation` (IN `p_source_lang_code` VARCHAR(5), IN `p_source_norm_lemma` VARCHAR(255), IN `p_target_lang_code` VARCHAR(5), IN `p_target_norm_lemma` VARCHAR(255), IN `p_relation_type` VARCHAR(30), IN `p_score` DECIMAL(4,3), IN `p_is_symmetric` BOOLEAN, IN `p_source_label` VARCHAR(100), IN `p_confidence_score` DECIMAL(4,3), IN `p_notes` TEXT)   BEGIN
    DECLARE v_source_form_id BIGINT;
    DECLARE v_target_form_id BIGINT;

    SELECT lf.id INTO v_source_form_id
    FROM lexical_form lf
    JOIN language l ON l.id = lf.language_id
    WHERE l.code = p_source_lang_code
      AND lf.normalized_lemma = p_source_norm_lemma
    LIMIT 1;

    SELECT lf.id INTO v_target_form_id
    FROM lexical_form lf
    JOIN language l ON l.id = lf.language_id
    WHERE l.code = p_target_lang_code
      AND lf.normalized_lemma = p_target_norm_lemma
    LIMIT 1;

    IF v_source_form_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Source lexical form not found';
    END IF;

    IF v_target_form_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Target lexical form not found';
    END IF;

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
    VALUES (
        v_source_form_id,
        v_target_form_id,
        p_relation_type,
        p_score,
        p_is_symmetric,
        p_source_label,
        p_confidence_score,
        p_notes
    );
END$$

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_insert_ic_feature` (IN `p_lang_code` VARCHAR(5), IN `p_norm_lemma` VARCHAR(255), IN `p_feature_type` VARCHAR(50), IN `p_value_num` DECIMAL(8,4), IN `p_value_text` VARCHAR(100), IN `p_source_label` VARCHAR(100), IN `p_confidence_score` DECIMAL(4,3), IN `p_notes` TEXT)   BEGIN
    DECLARE v_form_id BIGINT;

    SELECT lf.id INTO v_form_id
    FROM lexical_form lf
    JOIN language l ON l.id = lf.language_id
    WHERE l.code = p_lang_code
      AND lf.normalized_lemma = p_norm_lemma
    LIMIT 1;

    IF v_form_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Lexical form not found for IC feature';
    END IF;

    INSERT INTO ic_feature (
        form_id,
        feature_type,
        value_num,
        value_text,
        source_label,
        confidence_score,
        notes
    )
    VALUES (
        v_form_id,
        p_feature_type,
        p_value_num,
        p_value_text,
        p_source_label,
        p_confidence_score,
        p_notes
    );
END$$

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_upsert_language` (IN `p_code` VARCHAR(5), IN `p_name` VARCHAR(50), IN `p_family` VARCHAR(50), IN `p_is_romance` BOOLEAN, IN `p_is_active` BOOLEAN)   BEGIN
    INSERT INTO language (code, name, family, is_romance, is_active)
    VALUES (p_code, p_name, p_family, p_is_romance, p_is_active)
    ON DUPLICATE KEY UPDATE
        name       = VALUES(name),
        family     = VALUES(family),
        is_romance = VALUES(is_romance),
        is_active  = VALUES(is_active);
END$$

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_upsert_lexical_entry` (IN `p_entry_key` VARCHAR(100), IN `p_gloss_fr` TEXT, IN `p_gloss_en` TEXT, IN `p_semantic_domain` VARCHAR(100), IN `p_notes` TEXT)   BEGIN
    INSERT INTO lexical_entry (entry_key, gloss_fr, gloss_en, semantic_domain, notes)
    VALUES (p_entry_key, p_gloss_fr, p_gloss_en, p_semantic_domain, p_notes)
    ON DUPLICATE KEY UPDATE
        gloss_fr        = VALUES(gloss_fr),
        gloss_en        = VALUES(gloss_en),
        semantic_domain = VALUES(semantic_domain),
        notes           = VALUES(notes);
END$$

CREATE DEFINER=`ic_user`@`%` PROCEDURE `sp_upsert_lexical_form` (IN `p_entry_key` VARCHAR(100), IN `p_language_code` VARCHAR(5), IN `p_lemma` VARCHAR(255), IN `p_normalized_lemma` VARCHAR(255), IN `p_part_of_speech` VARCHAR(20), IN `p_confidence_score` DECIMAL(4,3))   BEGIN
    DECLARE v_entry_id BIGINT;
    DECLARE v_language_id INT;

    SELECT id INTO v_entry_id
    FROM lexical_entry
    WHERE entry_key = p_entry_key
    LIMIT 1;

    SELECT id INTO v_language_id
    FROM language
    WHERE code = p_language_code
    LIMIT 1;

    IF v_entry_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Lexical entry not found';
    END IF;

    IF v_language_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Language not found';
    END IF;

    INSERT INTO lexical_form (
        entry_id,
        language_id,
        lemma,
        normalized_lemma,
        part_of_speech,
        confidence_score
    )
    VALUES (
        v_entry_id,
        v_language_id,
        p_lemma,
        p_normalized_lemma,
        p_part_of_speech,
        p_confidence_score
    )
    ON DUPLICATE KEY UPDATE
        normalized_lemma = VALUES(normalized_lemma),
        confidence_score = VALUES(confidence_score);
END$$

DELIMITER ;