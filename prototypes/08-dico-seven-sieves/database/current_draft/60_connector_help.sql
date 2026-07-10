-- Experimental V0 support for validated discourse connector pedagogical help.
-- Scope: exact ES/FR expressions and five fixed discourse functions.

USE ic_dico;

CREATE TABLE IF NOT EXISTS connector_help (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    language_id             INT NOT NULL,
    lexical_entry_id        BIGINT NULL,
    expression              VARCHAR(255) NOT NULL,
    normalized_expression   VARCHAR(255)
                            CHARACTER SET utf8mb4
                            COLLATE utf8mb4_bin NOT NULL,
    discourse_function      VARCHAR(20) NOT NULL,
    pedagogical_title       VARCHAR(100) NOT NULL DEFAULT 'Connecteur logique',
    pedagogical_hint        TEXT NOT NULL,
    example                 TEXT NULL,
    caution                 TEXT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    source_label            VARCHAR(100) NULL,
    notes                   TEXT NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_connector_help_language
        FOREIGN KEY (language_id) REFERENCES language(id),
    CONSTRAINT fk_connector_help_lexical_entry
        FOREIGN KEY (lexical_entry_id) REFERENCES lexical_entry(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_connector_help_expression
        CHECK (CHAR_LENGTH(TRIM(expression)) > 0),
    CONSTRAINT chk_connector_help_normalized_expression
        CHECK (CHAR_LENGTH(TRIM(normalized_expression)) > 0),
    CONSTRAINT chk_connector_help_function
        CHECK (discourse_function IN (
            'OPPOSITION', 'CAUSE', 'CONSEQUENCE', 'ADDITION', 'CHRONOLOGY'
        )),
    CONSTRAINT chk_connector_help_hint
        CHECK (CHAR_LENGTH(TRIM(pedagogical_hint)) > 0),
    CONSTRAINT chk_connector_help_status
        CHECK (status IN ('PROPOSED', 'VALIDATED', 'REJECTED', 'ARCHIVED')),
    CONSTRAINT uq_connector_help_expression_function
        UNIQUE (language_id, normalized_expression, discourse_function),

    INDEX idx_connector_help_lookup
        (language_id, status, normalized_expression),
    INDEX idx_connector_help_function_status
        (discourse_function, status),
    INDEX idx_connector_help_lexical_entry
        (lexical_entry_id)
) ENGINE=InnoDB;

INSERT INTO connector_help (
    language_id,
    expression,
    normalized_expression,
    discourse_function,
    pedagogical_hint,
    example,
    caution,
    status,
    source_label,
    notes
)
SELECT
    lang.id,
    seed.expression,
    seed.normalized_expression,
    seed.discourse_function,
    seed.pedagogical_hint,
    seed.example,
    seed.caution,
    'VALIDATED',
    'connector_help_v0_seed',
    'Catalogue pédagogique Connector Help V0.'
FROM (
    SELECT 'es' AS language_code, 'sin embargo' AS expression,
           'sin embargo' AS normalized_expression, 'OPPOSITION' AS discourse_function,
           'L''auteur introduit probablement une idée qui contraste avec ce qui précède.' AS pedagogical_hint,
           'sin embargo / cependant' AS example,
           'La fonction exacte peut dépendre du contexte.' AS caution
    UNION ALL
    SELECT 'es', 'pero', 'pero', 'OPPOSITION',
           'L''auteur introduit probablement une idée qui contraste avec ce qui précède.',
           'pero / mais', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'es', 'porque', 'porque', 'CAUSE',
           'La proposition qui suit donne probablement une raison ou une explication.',
           'porque / parce que', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'es', 'por tanto', 'por tanto', 'CONSEQUENCE',
           'L''auteur présente probablement un résultat ou une déduction.',
           'por tanto / donc', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'es', 'además', 'además', 'ADDITION',
           'L''auteur ajoute probablement une information ou un argument.',
           'además / de plus', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'es', 'después', 'después', 'CHRONOLOGY',
           'L''auteur signale probablement une étape qui vient après la précédente.',
           'después / ensuite', 'La relation temporelle exacte dépend du contexte.'
    UNION ALL
    SELECT 'fr', 'cependant', 'cependant', 'OPPOSITION',
           'L''auteur introduit probablement une idée qui contraste avec ce qui précède.',
           'cependant / sin embargo', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'fr', 'mais', 'mais', 'OPPOSITION',
           'L''auteur introduit probablement une idée qui contraste avec ce qui précède.',
           'mais / pero', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'fr', 'parce que', 'parce que', 'CAUSE',
           'La proposition qui suit donne probablement une raison ou une explication.',
           'parce que / porque', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'fr', 'donc', 'donc', 'CONSEQUENCE',
           'L''auteur présente probablement un résultat ou une déduction.',
           'donc / por tanto', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'fr', 'de plus', 'de plus', 'ADDITION',
           'L''auteur ajoute probablement une information ou un argument.',
           'de plus / además', 'La fonction exacte peut dépendre du contexte.'
    UNION ALL
    SELECT 'fr', 'ensuite', 'ensuite', 'CHRONOLOGY',
           'L''auteur signale probablement une étape qui vient après la précédente.',
           'ensuite / después', 'La relation temporelle exacte dépend du contexte.'
) AS seed
JOIN language lang
  ON lang.code = seed.language_code
LEFT JOIN connector_help existing
  ON existing.language_id = lang.id
 AND existing.normalized_expression = seed.normalized_expression
 AND existing.discourse_function = seed.discourse_function
WHERE existing.id IS NULL;
