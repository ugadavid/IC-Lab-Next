-- Experimental V0 support for manually validated inflected forms.
-- Scope: attested noun/adjective plurals only. This draft is not final.

USE ic_dico;

CREATE TABLE IF NOT EXISTS inflected_form (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    lexical_form_id     BIGINT NOT NULL,
    surface_form        VARCHAR(255) NOT NULL,
    normalized_surface  VARCHAR(255) NOT NULL,
    grammatical_number  VARCHAR(10) NOT NULL DEFAULT 'PLURAL',
    status              VARCHAR(20) NOT NULL DEFAULT 'VALIDATED',
    source_label        VARCHAR(100) NULL,
    confidence_score    DECIMAL(4,3) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inflected_form_lexical_form
        FOREIGN KEY (lexical_form_id) REFERENCES lexical_form(id)
        ON DELETE CASCADE,
    CONSTRAINT chk_inflected_form_surface_nonempty
        CHECK (CHAR_LENGTH(TRIM(surface_form)) > 0),
    CONSTRAINT chk_inflected_form_normalized_nonempty
        CHECK (CHAR_LENGTH(TRIM(normalized_surface)) > 0),
    CONSTRAINT chk_inflected_form_number
        CHECK (grammatical_number = 'PLURAL'),
    CONSTRAINT chk_inflected_form_status
        CHECK (status IN ('PROPOSED', 'VALIDATED', 'REJECTED', 'ARCHIVED')),
    CONSTRAINT chk_inflected_form_confidence
        CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
    CONSTRAINT uq_inflected_form_mapping
        UNIQUE (lexical_form_id, normalized_surface, grammatical_number),

    INDEX idx_inflected_form_lookup (normalized_surface, status),
    INDEX idx_inflected_form_lexical_form (lexical_form_id)
) ENGINE=InnoDB;
