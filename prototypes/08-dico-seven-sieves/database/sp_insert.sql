-- Procédure pour les langues

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_upsert_language $$

CREATE PROCEDURE sp_upsert_language (
    IN p_code        VARCHAR(5),
    IN p_name        VARCHAR(50),
    IN p_family      VARCHAR(50),
    IN p_is_romance  BOOLEAN,
    IN p_is_active   BOOLEAN
)
BEGIN
    INSERT INTO language (code, name, family, is_romance, is_active)
    VALUES (p_code, p_name, p_family, p_is_romance, p_is_active)
    ON DUPLICATE KEY UPDATE
        name       = VALUES(name),
        family     = VALUES(family),
        is_romance = VALUES(is_romance),
        is_active  = VALUES(is_active);
END $$

DELIMITER ;

--  Utilisation
CALL sp_upsert_language('fr', 'Français', 'Romance', true, true);
CALL sp_upsert_language('en', 'English', 'Germanic', false, true);



-- Procédure pour les entrées lexicales

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_upsert_lexical_entry $$

CREATE PROCEDURE sp_upsert_lexical_entry (
    IN p_entry_key        VARCHAR(100),
    IN p_gloss_fr         TEXT,
    IN p_gloss_en         TEXT,
    IN p_semantic_domain  VARCHAR(100),
    IN p_notes            TEXT
)
BEGIN
    INSERT INTO lexical_entry (entry_key, gloss_fr, gloss_en, semantic_domain, notes)
    VALUES (p_entry_key, p_gloss_fr, p_gloss_en, p_semantic_domain, p_notes)
    ON DUPLICATE KEY UPDATE
        gloss_fr        = VALUES(gloss_fr),
        gloss_en        = VALUES(gloss_en),
        semantic_domain = VALUES(semantic_domain),
        notes           = VALUES(notes);
END $$

DELIMITER ;

--  Utilisation
CALL sp_upsert_lexical_entry(
    'INFORMATION_DATA',
    'information, donnée communiquée',
    'information, communicated data',
    'communication',
    NULL
);




-- Procédure pour les formes lexicales

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_upsert_lexical_form $$

CREATE PROCEDURE sp_upsert_lexical_form (
    IN p_entry_key         VARCHAR(100),
    IN p_language_code     VARCHAR(5),
    IN p_lemma             VARCHAR(255),
    IN p_normalized_lemma  VARCHAR(255),
    IN p_part_of_speech    VARCHAR(20),
    IN p_confidence_score  DECIMAL(4,3)
)
BEGIN
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
END $$

DELIMITER ;

--  Utilisation
CALL sp_upsert_lexical_form(
    'INFORMATION_DATA',
    'fr',
    'information',
    'information',
    'noun',
    0.98
);

CALL sp_upsert_lexical_form(
    'INFORMATION_DATA',
    'es',
    'información',
    'informacion',
    'noun',
    0.98
);




--  Procédure pour les relations entre formes

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_insert_form_relation $$

CREATE PROCEDURE sp_insert_form_relation (
    IN p_source_lang_code      VARCHAR(5),
    IN p_source_norm_lemma     VARCHAR(255),
    IN p_target_lang_code      VARCHAR(5),
    IN p_target_norm_lemma     VARCHAR(255),
    IN p_relation_type         VARCHAR(30),
    IN p_score                 DECIMAL(4,3),
    IN p_is_symmetric          BOOLEAN,
    IN p_source_label          VARCHAR(100),
    IN p_confidence_score      DECIMAL(4,3),
    IN p_notes                 TEXT
)
BEGIN
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
END $$

DELIMITER ;

--  Utilisation
CALL sp_insert_form_relation(
    'fr', 'information',
    'es', 'informacion',
    'COGNATE_STRONG',
    0.98,
    true,
    'manual_seed',
    0.98,
    NULL
);

CALL sp_insert_form_relation(
    'fr', 'actuellement',
    'es', 'actualmente',
    'FALSE_FRIEND',
    0.10,
    true,
    'manual_seed',
    0.98,
    'Ressemblance forte, sens différent'
);




--  Bonus très utile : procédure pour les features IC

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_insert_ic_feature $$

CREATE PROCEDURE sp_insert_ic_feature (
    IN p_lang_code         VARCHAR(5),
    IN p_norm_lemma        VARCHAR(255),
    IN p_feature_type      VARCHAR(50),
    IN p_value_num         DECIMAL(8,4),
    IN p_value_text        VARCHAR(100),
    IN p_source_label      VARCHAR(100),
    IN p_confidence_score  DECIMAL(4,3),
    IN p_notes             TEXT
)
BEGIN
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
END $$

DELIMITER ;
















--  Exemple complet d’utilisation propre
CALL sp_upsert_language('fr', 'Français', 'Romance', true, true);
CALL sp_upsert_language('es', 'Español', 'Romance', true, true);

CALL sp_upsert_lexical_entry(
    'CURRENTLY_NOW',
    'actuellement, en ce moment',
    'currently, at present',
    'time',
    NULL
);

CALL sp_upsert_lexical_form(
    'CURRENTLY_NOW',
    'fr',
    'actuellement',
    'actuellement',
    'adverb',
    0.99
);

CALL sp_upsert_lexical_entry(
    'ACTUALLY_IN_FACT',
    'en réalité, en fait',
    'actually, in fact',
    'modality',
    NULL
);

CALL sp_upsert_lexical_form(
    'ACTUALLY_IN_FACT',
    'es',
    'actualmente',
    'actualmente',
    'adverb',
    0.99
);

CALL sp_insert_form_relation(
    'fr', 'actuellement',
    'es', 'actualmente',
    'FALSE_FRIEND',
    0.10,
    true,
    'manual_seed',
    0.98,
    'Faux ami classique FR/ES'
);
