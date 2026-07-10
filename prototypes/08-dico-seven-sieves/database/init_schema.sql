/**
    A vérifier, comparer à l'existant !!
*/

USE ic_dico;

-- =========================================================
-- TABLES
-- =========================================================

DROP TABLE IF EXISTS ic_feature;
DROP TABLE IF EXISTS form_relation;
DROP TABLE IF EXISTS lexical_form;
DROP TABLE IF EXISTS lexical_entry;
DROP TABLE IF EXISTS language;

CREATE TABLE language (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(5) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    family VARCHAR(50),
    is_romance BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE lexical_entry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_key VARCHAR(100) NOT NULL UNIQUE,
    gloss_fr TEXT,
    gloss_en TEXT,
    semantic_domain VARCHAR(100),
    notes TEXT
);

CREATE TABLE lexical_form (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_id BIGINT NOT NULL,
    language_id INT NOT NULL,

    lemma VARCHAR(255) NOT NULL,
    normalized_lemma VARCHAR(255),
    part_of_speech VARCHAR(20),

    confidence_score DECIMAL(4,3),
    notes TEXT,

    CONSTRAINT fk_lexical_form_entry
        FOREIGN KEY (entry_id) REFERENCES lexical_entry(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_lexical_form_language
        FOREIGN KEY (language_id) REFERENCES language(id),

    CONSTRAINT uq_lexical_form_lang_lemma_pos
        UNIQUE(language_id, lemma, part_of_speech)
);

CREATE INDEX idx_lexical_form_normalized_lemma
    ON lexical_form(normalized_lemma);

CREATE TABLE form_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    source_form_id BIGINT NOT NULL,
    target_form_id BIGINT NOT NULL,

    relation_type VARCHAR(30) NOT NULL,
    score DECIMAL(4,3),
    is_symmetric BOOLEAN DEFAULT TRUE,

    source_label VARCHAR(100),
    confidence_score DECIMAL(4,3),
    notes TEXT,

    CONSTRAINT fk_form_relation_source
        FOREIGN KEY (source_form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_form_relation_target
        FOREIGN KEY (target_form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_form_relation_not_same
        CHECK (source_form_id <> target_form_id)
);

CREATE INDEX idx_form_relation_source ON form_relation(source_form_id);
CREATE INDEX idx_form_relation_target ON form_relation(target_form_id);
CREATE INDEX idx_form_relation_type ON form_relation(relation_type);

CREATE TABLE ic_feature (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    form_id BIGINT NOT NULL,
    feature_type VARCHAR(50) NOT NULL,
    value_num DECIMAL(8,4),
    value_text VARCHAR(100),
    source_label VARCHAR(100),
    confidence_score DECIMAL(4,3),
    notes TEXT,

    CONSTRAINT fk_ic_feature_form
        FOREIGN KEY (form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_ic_feature_form ON ic_feature(form_id);
CREATE INDEX idx_ic_feature_type ON ic_feature(feature_type);

-- =========================================================
-- PROCEDURES
-- =========================================================

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


DROP PROCEDURE IF EXISTS sp_upsert_lexical_form $$
CREATE PROCEDURE sp_upsert_lexical_form (
    IN p_entry_key         VARCHAR(100),
    IN p_language_code     VARCHAR(5),
    IN p_lemma             VARCHAR(255),
    IN p_normalized_lemma  VARCHAR(255),
    IN p_part_of_speech    VARCHAR(20),
    IN p_confidence_score  DECIMAL(4,3),
    IN p_notes             TEXT
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
        confidence_score,
        notes
    )
    VALUES (
        v_entry_id,
        v_language_id,
        p_lemma,
        p_normalized_lemma,
        p_part_of_speech,
        p_confidence_score,
        p_notes
    )
    ON DUPLICATE KEY UPDATE
        normalized_lemma = VALUES(normalized_lemma),
        confidence_score = VALUES(confidence_score),
        notes            = VALUES(notes);
END $$


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


DROP PROCEDURE IF EXISTS sp_get_all_relations $$
CREATE PROCEDURE sp_get_all_relations (
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

    ORDER BY score DESC, lang_2, word_2;
END $$

DELIMITER ;

