-- Draft consolidated schema for IC-Dico.
-- Source: database/sql.sql
-- Status: non-final draft. Existing SQL files are unchanged.

CREATE DATABASE IF NOT EXISTS ic_dico
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ic_dico;

CREATE TABLE language (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(5) NOT NULL,
    name            VARCHAR(50) NOT NULL,
    family          VARCHAR(50) NULL,
    is_romance      TINYINT(1) NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    documentation_status VARCHAR(20) NOT NULL DEFAULT 'DOCUMENTED',
    CONSTRAINT uq_language_code UNIQUE (code),
    CONSTRAINT chk_language_documentation_status
      CHECK (documentation_status IN ('DOCUMENTED', 'REFERENCED'))
) ENGINE=InnoDB;

CREATE TABLE lexical_entry (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_key       VARCHAR(100) NOT NULL,
    gloss_fr        TEXT NULL,
    gloss_en        TEXT NULL,
    semantic_domain VARCHAR(100) NULL,
    notes           TEXT NULL,
    CONSTRAINT uq_lexical_entry_key UNIQUE (entry_key)
) ENGINE=InnoDB;

CREATE TABLE lexical_form (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    entry_id            BIGINT NOT NULL,
    language_id         INT NOT NULL,
    lemma               VARCHAR(255) NOT NULL,
    normalized_lemma    VARCHAR(255) NULL,
    part_of_speech      VARCHAR(20) NULL,
    gender              VARCHAR(10) NULL,
    number_behavior     VARCHAR(20) NULL,
    register_label      VARCHAR(50) NULL,
    source_label        VARCHAR(100) NULL,
    confidence_score    DECIMAL(4,3) NULL,
    notes               TEXT NULL,

    CONSTRAINT fk_lexical_form_entry
        FOREIGN KEY (entry_id) REFERENCES lexical_entry(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_lexical_form_language
        FOREIGN KEY (language_id) REFERENCES language(id),

    CONSTRAINT uq_lexical_form_lang_lemma_pos
        UNIQUE (language_id, lemma, part_of_speech)
) ENGINE=InnoDB;

CREATE INDEX idx_lexical_form_entry_id
    ON lexical_form(entry_id);

CREATE INDEX idx_lexical_form_normalized_lemma
    ON lexical_form(normalized_lemma);

CREATE TABLE form_relation (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_form_id      BIGINT NOT NULL,
    target_form_id      BIGINT NOT NULL,
    relation_type       VARCHAR(30) NOT NULL,
    score               DECIMAL(4,3) NULL,
    is_symmetric        TINYINT(1) NOT NULL DEFAULT 1,
    source_label        VARCHAR(100) NULL,
    confidence_score    DECIMAL(4,3) NULL,
    notes               TEXT NULL,

    CONSTRAINT fk_form_relation_source
        FOREIGN KEY (source_form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_form_relation_target
        FOREIGN KEY (target_form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_form_relation_not_same
        CHECK (source_form_id <> target_form_id)
) ENGINE=InnoDB;

CREATE INDEX idx_form_relation_source
    ON form_relation(source_form_id);

CREATE INDEX idx_form_relation_target
    ON form_relation(target_form_id);

CREATE INDEX idx_form_relation_type
    ON form_relation(relation_type);

CREATE TABLE pattern_rule (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    source_language_id      INT NOT NULL,
    target_language_id      INT NOT NULL,
    pattern_type            VARCHAR(30) NULL,
    source_pattern          VARCHAR(100) NOT NULL,
    target_pattern          VARCHAR(100) NOT NULL,
    description             TEXT NULL,
    reliability_score       DECIMAL(4,3) NULL,
    examples                TEXT NULL,
    notes                   TEXT NULL,

    CONSTRAINT fk_pattern_rule_source_lang
        FOREIGN KEY (source_language_id) REFERENCES language(id),

    CONSTRAINT fk_pattern_rule_target_lang
        FOREIGN KEY (target_language_id) REFERENCES language(id)
) ENGINE=InnoDB;

CREATE INDEX idx_pattern_rule_langs
    ON pattern_rule(source_language_id, target_language_id);

CREATE TABLE ic_feature (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    form_id             BIGINT NOT NULL,
    feature_type        VARCHAR(50) NOT NULL,
    value_num           DECIMAL(8,4) NULL,
    value_text          VARCHAR(100) NULL,
    source_label        VARCHAR(100) NULL,
    confidence_score    DECIMAL(4,3) NULL,
    notes               TEXT NULL,

    CONSTRAINT fk_ic_feature_form
        FOREIGN KEY (form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_ic_feature_form
    ON ic_feature(form_id);

CREATE INDEX idx_ic_feature_type
    ON ic_feature(feature_type);
