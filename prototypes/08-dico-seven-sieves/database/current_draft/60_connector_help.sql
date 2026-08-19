-- Experimental V0 support for validated discourse connector pedagogical help.
-- Scope: exact FR/ES/IT/PT/EN expressions and five fixed discourse functions.

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

-- Mission 218: published multilingual working core for IT/PT/EN.
-- VALIDATED means published and usable by the V0 application. The catalogue
-- remains intended for later linguistic and pedagogical discussion.
INSERT INTO connector_help (
    language_id,
    lexical_entry_id,
    expression,
    normalized_expression,
    discourse_function,
    pedagogical_title,
    pedagogical_hint,
    example,
    caution,
    status,
    source_label,
    notes
)
SELECT
    lang.id,
    NULL,
    seed.expression,
    seed.normalized_expression,
    seed.discourse_function,
    seed.pedagogical_title,
    seed.pedagogical_hint,
    seed.example,
    seed.caution,
    'VALIDATED',
    'Noyau multilingue Dico-IC',
    'Catalogue de travail à revoir avec Christian et Sylvain.'
FROM (
    SELECT 'it' AS language_code, 'tuttavia' AS expression,
           'tuttavia' AS normalized_expression, 'OPPOSITION' AS discourse_function,
           'Repère d’opposition' AS pedagogical_title,
           'L’auteur introduit probablement un contraste, une concession ou une restriction.' AS pedagogical_hint,
           'Il risultato è utile; tuttavia, rimane provvisorio.' AS example,
           'Vérifier la portée concessive ou adversative dans la phrase.' AS caution
    UNION ALL
    SELECT 'pt', 'no entanto', 'no entanto', 'OPPOSITION',
           'Repère d’opposition',
           'L’auteur introduit probablement un contraste, une concession ou une restriction.',
           'O resultado é útil; no entanto, continua provisório.',
           'Vérifier la portée concessive ou adversative dans la phrase.'
    UNION ALL
    SELECT 'en', 'however', 'however', 'OPPOSITION',
           'Repère d’opposition',
           'L’auteur introduit probablement un contraste, une concession ou une restriction.',
           'The result is useful; however, it remains provisional.',
           'Le mot possède d’autres emplois ; vérifier qu’il marque ici un contraste discursif.'
    UNION ALL
    SELECT 'it', 'perché', 'perché', 'CAUSE',
           'Repère de cause',
           'La proposition qui suit donne probablement une raison ou une explication.',
           'Procediamo perché gli indizi sono chiari.',
           'Distinguer l’emploi causal des emplois finaux ou interrogatifs.'
    UNION ALL
    SELECT 'pt', 'porque', 'porque', 'CAUSE',
           'Repère de cause',
           'La proposition qui suit donne probablement une raison ou une explication.',
           'Avançamos porque os indícios são claros.',
           'Distinguer l’emploi causal des emplois interrogatifs ou explicatifs voisins.'
    UNION ALL
    SELECT 'en', 'because', 'because', 'CAUSE',
           'Repère de cause',
           'La proposition qui suit donne probablement une raison ou une explication.',
           'We move forward because the clues are clear.',
           'Vérifier que la proposition introduite explique bien un fait du contexte.'
    UNION ALL
    SELECT 'it', 'quindi', 'quindi', 'CONSEQUENCE',
           'Repère de conséquence',
           'L’auteur présente probablement un résultat, une déduction ou une conclusion.',
           'Gli indizi concordano; quindi, l’ipotesi è plausibile.',
           '« Quindi » peut aussi avoir une valeur temporelle ; vérifier le lien logique dans le contexte.'
    UNION ALL
    SELECT 'pt', 'portanto', 'portanto', 'CONSEQUENCE',
           'Repère de conséquence',
           'L’auteur présente probablement un résultat, une déduction ou une conclusion.',
           'Os indícios coincidem; portanto, a hipótese é plausível.',
           'Vérifier que le lien est bien une conséquence ou une conclusion.'
    UNION ALL
    SELECT 'en', 'therefore', 'therefore', 'CONSEQUENCE',
           'Repère de conséquence',
           'L’auteur présente probablement un résultat, une déduction ou une conclusion.',
           'The clues agree; therefore, the hypothesis is plausible.',
           'Vérifier que le lien est bien une conséquence ou une conclusion.'
    UNION ALL
    SELECT 'it', 'inoltre', 'inoltre', 'ADDITION',
           'Repère d’addition',
           'L’auteur ajoute probablement une information ou un argument.',
           'Inoltre, la forma appare in diverse lingue.',
           'Vérifier que l’expression ajoute un élément au même mouvement argumentatif.'
    UNION ALL
    SELECT 'pt', 'além disso', 'além disso', 'ADDITION',
           'Repère d’addition',
           'L’auteur ajoute probablement une information ou un argument.',
           'Além disso, a forma aparece em várias línguas.',
           'Vérifier que l’expression ajoute un élément au même mouvement argumentatif.'
    UNION ALL
    SELECT 'en', 'moreover', 'moreover', 'ADDITION',
           'Repère d’addition',
           'L’auteur ajoute probablement une information ou un argument.',
           'Moreover, the form appears in several languages.',
           'Vérifier que l’expression ajoute un élément au même mouvement argumentatif.'
    UNION ALL
    SELECT 'it', 'poi', 'poi', 'CHRONOLOGY',
           'Repère chronologique',
           'L’auteur situe probablement une étape après une autre.',
           'Poi, confrontiamo le forme.',
           'Le mot est polysémique ; vérifier qu’il marque ici une succession temporelle.'
    UNION ALL
    SELECT 'pt', 'depois', 'depois', 'CHRONOLOGY',
           'Repère chronologique',
           'L’auteur situe probablement une étape après une autre.',
           'Depois, comparamos as formas.',
           'Le mot est polysémique ; vérifier qu’il marque ici une succession temporelle.'
    UNION ALL
    SELECT 'en', 'then', 'then', 'CHRONOLOGY',
           'Repère chronologique',
           'L’auteur situe probablement une étape après une autre.',
           'Then, we compare the forms.',
           'Le mot possède plusieurs valeurs ; vérifier qu’il marque ici une succession temporelle.'
) AS seed
JOIN language lang
  ON lang.code = seed.language_code
 AND lang.is_active = TRUE
 AND lang.documentation_status = 'DOCUMENTED'
LEFT JOIN connector_help existing
  ON existing.language_id = lang.id
 AND existing.normalized_expression = seed.normalized_expression
 AND existing.discourse_function = seed.discourse_function
WHERE existing.id IS NULL;
