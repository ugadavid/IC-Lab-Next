const mysql = require("mysql2/promise");

function createPool(overrides = {}) {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "ic_user",
    password: process.env.DB_PASSWORD || "ic_pass",
    database: process.env.DB_NAME || "ic_dico",
    charset: "utf8mb4",
    decimalNumbers: true,
    connectionLimit: 5,
    ...overrides,
  });
}

function placeholders(values) {
  return values.map(() => "?").join(", ");
}

function createRepository(pool) {
  async function readLexicalEntryByKey(executor, entryKey) {
    const [rows] = await executor.execute(`
      SELECT
        le.id,
        le.entry_key,
        le.gloss_fr,
        le.gloss_en,
        le.semantic_domain,
        le.notes,
        lf.id AS form_id,
        l.code AS language,
        lf.lemma,
        lf.normalized_lemma,
        lf.part_of_speech,
        lf.source_label,
        lf.confidence_score
      FROM lexical_entry le
      LEFT JOIN lexical_form lf ON lf.entry_id = le.id
      LEFT JOIN language l ON l.id = lf.language_id
      WHERE le.entry_key = ?
      ORDER BY l.code, lf.lemma
    `, [entryKey]);

    if (rows.length === 0) return null;
    return {
      id: rows[0].id,
      entry_key: rows[0].entry_key,
      gloss_fr: rows[0].gloss_fr,
      gloss_en: rows[0].gloss_en,
      semantic_domain: rows[0].semantic_domain,
      notes: rows[0].notes,
      forms: rows.filter((row) => row.form_id !== null).map((row) => ({
        id: row.form_id,
        language: row.language,
        lemma: row.lemma,
        normalized_lemma: row.normalized_lemma,
        part_of_speech: row.part_of_speech,
        source_label: row.source_label,
        confidence_score: row.confidence_score,
      })),
    };
  }

  async function readConnectorHelpById(executor, id, validatedOnly = false) {
    const [rows] = await executor.execute(`
      SELECT
        ch.id,
        ch.language_id,
        l.code AS language,
        l.name AS language_name,
        ch.lexical_entry_id,
        le.entry_key AS lexical_entry_key,
        ch.expression,
        ch.normalized_expression,
        ch.discourse_function,
        ch.pedagogical_title,
        ch.pedagogical_hint,
        ch.example,
        ch.caution,
        ch.status,
        ch.source_label,
        ch.notes,
        ch.created_at,
        ch.updated_at
      FROM connector_help ch
      JOIN language l ON l.id = ch.language_id
      LEFT JOIN lexical_entry le ON le.id = ch.lexical_entry_id
      WHERE ch.id = ?
        ${validatedOnly ? "AND ch.status = 'VALIDATED' AND l.is_active = 1" : ""}
    `, [id]);
    return rows[0] || null;
  }

  async function listConnectorHelps({
    language = "",
    discourseFunction = "",
    status = "",
    search = "",
    limit = 30,
    offset = 0,
    validatedOnly = false,
  } = {}) {
    const conditions = [];
    const parameters = [];
    if (validatedOnly) {
      conditions.push("ch.status = 'VALIDATED'");
      conditions.push("l.is_active = 1");
    } else if (status) {
      conditions.push("ch.status = ?");
      parameters.push(status);
    }
    if (language) {
      conditions.push("l.code = ?");
      parameters.push(language);
    }
    if (discourseFunction) {
      conditions.push("ch.discourse_function = ?");
      parameters.push(discourseFunction);
    }
    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      conditions.push(`(
        ch.expression LIKE ?
        OR ch.pedagogical_hint LIKE ?
        OR ch.example LIKE ?
        OR ch.source_label LIKE ?
      )`);
      parameters.push(pattern, pattern, pattern, pattern);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const from = `
      FROM connector_help ch
      JOIN language l ON l.id = ch.language_id
      LEFT JOIN lexical_entry le ON le.id = ch.lexical_entry_id
      ${where}
    `;
    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total ${from}`, parameters);
    const [items] = await pool.execute(`
      SELECT
        ch.id,
        l.code AS language,
        l.name AS language_name,
        ch.lexical_entry_id,
        le.entry_key AS lexical_entry_key,
        ch.expression,
        ch.normalized_expression,
        ch.discourse_function,
        ch.pedagogical_title,
        ch.pedagogical_hint,
        ch.example,
        ch.caution,
        ch.status,
        ch.source_label,
        ch.notes,
        ch.created_at,
        ch.updated_at
      ${from}
      ORDER BY ch.updated_at DESC, ch.id DESC
      LIMIT ? OFFSET ?
    `, [...parameters, limit, offset]);
    return { items, total: Number(countRows[0].total) };
  }

  async function resolveConnectorHelpReferences(connection, connectorHelp) {
    const [languageRows] = await connection.execute(`
      SELECT id, code
      FROM language
      WHERE code = ? AND is_active = 1
      FOR UPDATE
    `, [connectorHelp.language]);
    if (languageRows.length === 0 || !new Set(["es", "fr"]).has(languageRows[0].code)) {
      const error = new Error("La langue Connector Help doit être une langue active parmi es ou fr.");
      error.code = "UNSUPPORTED_CONNECTOR_LANGUAGE";
      throw error;
    }

    let lexicalEntryId = null;
    if (connectorHelp.lexical_entry_key) {
      const [entryRows] = await connection.execute(`
        SELECT id
        FROM lexical_entry
        WHERE entry_key = ?
        FOR UPDATE
      `, [connectorHelp.lexical_entry_key]);
      if (entryRows.length === 0) {
        const error = new Error("L’entrée lexicale facultative n’existe pas.");
        error.code = "LEXICAL_ENTRY_NOT_FOUND";
        throw error;
      }
      lexicalEntryId = entryRows[0].id;
    }
    return { languageId: languageRows[0].id, lexicalEntryId };
  }

  async function rejectValidatedConnectorConflict(connection, connectorHelp, languageId, excludedId = null) {
    if (connectorHelp.status !== "VALIDATED") return;
    const parameters = [languageId, connectorHelp.normalized_expression];
    let excludedClause = "";
    if (excludedId !== null) {
      excludedClause = "AND id <> ?";
      parameters.push(excludedId);
    }
    const [conflicts] = await connection.execute(`
      SELECT id, discourse_function
      FROM connector_help
      WHERE language_id = ?
        AND normalized_expression = ?
        AND status = 'VALIDATED'
        ${excludedClause}
      FOR UPDATE
    `, parameters);
    if (conflicts.length > 0) {
      const error = new Error("Cette expression possède déjà une fonction validée dans cette langue.");
      error.code = "CONNECTOR_HELP_FUNCTION_CONFLICT";
      throw error;
    }
  }

  function mapConnectorHelpWriteError(error) {
    if (error.code === "ER_DUP_ENTRY") {
      error.code = "DUPLICATE_CONNECTOR_HELP";
      error.message = "Cette expression possède déjà cette fonction dans cette langue.";
    }
    return error;
  }

  return {
    async getLanguages() {
      const [rows] = await pool.execute(`
        SELECT code, name, family, is_romance, is_active
        FROM language
        WHERE is_active = 1
        ORDER BY code
      `);
      return rows.map((row) => ({
        code: row.code,
        name: row.name,
        family: row.family,
        is_romance: Boolean(row.is_romance),
        is_active: Boolean(row.is_active),
      }));
    },

    async loadAnalysisResources(request) {
      let connectorHelps = [];
      if (new Set(["es", "fr"]).has(request.source_language)) {
        [connectorHelps] = await pool.execute(`
          SELECT
            ch.id,
            l.code AS language_code,
            ch.expression,
            ch.normalized_expression,
            ch.discourse_function,
            ch.pedagogical_title,
            ch.pedagogical_hint,
            ch.example,
            ch.caution,
            ch.source_label
          FROM connector_help ch
          JOIN language l ON l.id = ch.language_id
          WHERE l.code = ?
            AND l.is_active = 1
            AND ch.status = 'VALIDATED'
          ORDER BY CHAR_LENGTH(ch.normalized_expression) DESC, ch.id ASC
        `, [request.source_language]);
      }

      const lookupKeys = [...new Set(request.tokens
        .filter((token) => token.kind === "word")
        .map((token) => token.lookup_key))];

      if (lookupKeys.length === 0) {
        return { sourceForms: [], relatedForms: [], relations: [], rules: [], connectorHelps };
      }

      const [exactSourceForms] = await pool.execute(`
        SELECT
          lf.id,
          lf.entry_id,
          lf.lemma,
          lf.normalized_lemma,
          lf.part_of_speech,
          lf.confidence_score,
          lf.source_label,
          l.code AS language_code,
          le.entry_key,
          le.gloss_fr,
          le.gloss_en,
          le.semantic_domain,
          lf.normalized_lemma AS matched_lookup_key,
          'lexical_form' AS match_kind,
          NULL AS inflected_form_id,
          NULL AS inflected_grammatical_number,
          NULL AS inflected_status,
          NULL AS inflected_source_label,
          NULL AS inflected_confidence_score
        FROM lexical_form lf
        JOIN language l ON l.id = lf.language_id
        JOIN lexical_entry le ON le.id = lf.entry_id
        WHERE l.code = ?
          AND lf.normalized_lemma IN (${placeholders(lookupKeys)})
      `, [request.source_language, ...lookupKeys]);

      const exactLookupKeys = new Set(exactSourceForms.map((form) => form.matched_lookup_key));
      const unresolvedLookupKeys = lookupKeys.filter((key) => !exactLookupKeys.has(key));
      let inflectedSourceForms = [];
      if (unresolvedLookupKeys.length > 0) {
        [inflectedSourceForms] = await pool.execute(`
          SELECT
            lf.id,
            lf.entry_id,
            lf.lemma,
            lf.normalized_lemma,
            lf.part_of_speech,
            lf.confidence_score,
            lf.source_label,
            l.code AS language_code,
            le.entry_key,
            le.gloss_fr,
            le.gloss_en,
            le.semantic_domain,
            inflected.normalized_surface AS matched_lookup_key,
            'inflected_form' AS match_kind,
            inflected.id AS inflected_form_id,
            inflected.grammatical_number AS inflected_grammatical_number,
            inflected.status AS inflected_status,
            inflected.source_label AS inflected_source_label,
            inflected.confidence_score AS inflected_confidence_score
          FROM inflected_form inflected
          JOIN lexical_form lf ON lf.id = inflected.lexical_form_id
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE inflected.status = 'VALIDATED'
            AND l.code = ?
            AND inflected.normalized_surface IN (${placeholders(unresolvedLookupKeys)})
        `, [request.source_language, ...unresolvedLookupKeys]);
      }

      const sourceForms = [...new Map(
        [...exactSourceForms, ...inflectedSourceForms]
          .map((form) => [`${form.matched_lookup_key}:${form.id}`, form])
      ).values()];

      const entryIds = [...new Set(sourceForms.map((form) => form.entry_id))];
      const sourceFormIds = [...new Set(sourceForms.map((form) => form.id))];
      const requestedLanguages = [...new Set([
        request.source_language,
        request.mediation_language,
        ...request.comparison_languages,
      ])];

      let relatedForms = [];
      if (entryIds.length > 0) {
        [relatedForms] = await pool.execute(`
          SELECT
            lf.id,
            lf.entry_id,
            lf.lemma,
            lf.normalized_lemma,
            lf.part_of_speech,
            lf.confidence_score,
            lf.source_label,
            l.code AS language_code,
            le.entry_key,
            le.gloss_fr,
            le.gloss_en,
            le.semantic_domain
          FROM lexical_form lf
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE lf.entry_id IN (${placeholders(entryIds)})
            AND l.code IN (${placeholders(requestedLanguages)})
          ORDER BY lf.entry_id, l.code, lf.id
        `, [...entryIds, ...requestedLanguages]);
      }

      let relations = [];
      if (sourceFormIds.length > 0) {
        [relations] = await pool.execute(`
          SELECT
            r.id,
            r.source_form_id,
            r.target_form_id,
            r.relation_type,
            r.score,
            r.is_symmetric,
            r.source_label,
            r.confidence_score,
            source_form.lemma AS source_lemma,
            source_language.code AS source_language_code,
            target_form.lemma AS target_lemma,
            target_language.code AS target_language_code
          FROM form_relation r
          JOIN lexical_form source_form ON source_form.id = r.source_form_id
          JOIN language source_language ON source_language.id = source_form.language_id
          JOIN lexical_form target_form ON target_form.id = r.target_form_id
          JOIN language target_language ON target_language.id = target_form.language_id
          WHERE r.source_form_id IN (${placeholders(sourceFormIds)})
             OR (r.is_symmetric = 1 AND r.target_form_id IN (${placeholders(sourceFormIds)}))
        `, [...sourceFormIds, ...sourceFormIds]);
      }

      const targetLanguages = [...new Set([
        request.mediation_language,
        ...request.comparison_languages,
      ])];
      let rules = [];
      if (targetLanguages.length > 0) {
        [rules] = await pool.execute(`
          SELECT
            pr.id,
            pr.pattern_type,
            pr.source_pattern,
            pr.target_pattern,
            pr.description,
            pr.reliability_score,
            pr.examples,
            pr.notes,
            source_language.code AS source_language_code,
            target_language.code AS target_language_code
          FROM pattern_rule pr
          JOIN language source_language ON source_language.id = pr.source_language_id
          JOIN language target_language ON target_language.id = pr.target_language_id
          WHERE source_language.code = ?
            AND target_language.code IN (${placeholders(targetLanguages)})
        `, [request.source_language, ...targetLanguages]);
      }

      return { sourceForms, relatedForms, relations, rules, connectorHelps };
    },

    async getLegacyRelations(word) {
      const [results] = await pool.query("CALL get_all_relations(?)", [word]);
      return results[0];
    },

    async getAdminModelSummary() {
      const [rows] = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM language) AS languages,
          (SELECT COUNT(*) FROM lexical_entry) AS lexical_entries,
          (SELECT COUNT(*) FROM lexical_form) AS lexical_forms,
          (SELECT COUNT(*) FROM inflected_form) AS inflected_forms,
          (SELECT COUNT(*) FROM connector_help) AS connector_helps,
          (SELECT COUNT(*) FROM form_relation) AS form_relations,
          (SELECT COUNT(*) FROM pattern_rule) AS pattern_rules,
          (SELECT COUNT(*) FROM ic_feature) AS ic_features
      `);
      const [coverageRows] = await pool.query(`
        SELECT
          SUM(has_fr AND has_es AND has_it AND has_pt) AS central_romance_entries,
          SUM(has_fr AND has_es AND has_it AND has_pt AND has_en) AS comparison_english_entries
        FROM (
          SELECT
            le.id,
            MAX(l.code = 'fr') AS has_fr,
            MAX(l.code = 'es') AS has_es,
            MAX(l.code = 'it') AS has_it,
            MAX(l.code = 'pt') AS has_pt,
            MAX(l.code = 'en') AS has_en
          FROM lexical_entry le
          LEFT JOIN lexical_form lf ON lf.entry_id = le.id
          LEFT JOIN language l ON l.id = lf.language_id
          GROUP BY le.id
        ) coverage
      `);

      return {
        database: "ic_dico",
        counts: rows[0],
        coverage: {
          central_romance_entries: Number(coverageRows[0].central_romance_entries || 0),
          comparison_english_entries: Number(coverageRows[0].comparison_english_entries || 0),
        },
        tables: [
          { name: "language", role: "Langues disponibles et propriétés générales." },
          { name: "lexical_entry", role: "Concept lexical mutualisé entre plusieurs langues." },
          { name: "lexical_form", role: "Forme linguistique rattachée à une entrée et une langue." },
          { name: "inflected_form", role: "Pluriel attesté et validé donnant accès à un lemme canonique." },
          { name: "connector_help", role: "Aide pédagogique validée associée à une expression discursive." },
          { name: "form_relation", role: "Relation explicite entre deux formes lexicales." },
          { name: "pattern_rule", role: "Correspondance réutilisable entre motifs de langues." },
          { name: "ic_feature", role: "Trait expérimental associé à une forme." },
        ],
      };
    },

    async getAdminLexicalEntry(entryKey) {
      return readLexicalEntryByKey(pool, entryKey);
    },

    async getAdminRelationsForFormIds(formIds) {
      const uniqueIds = [...new Set(formIds.map(Number))].filter(Number.isSafeInteger);
      if (uniqueIds.length < 2) return [];
      const [rows] = await pool.execute(`
        SELECT
          relation.id,
          relation.source_form_id,
          relation.target_form_id,
          relation.relation_type,
          relation.score,
          relation.is_symmetric,
          relation.source_label,
          relation.confidence_score
        FROM form_relation relation
        WHERE relation.source_form_id IN (${placeholders(uniqueIds)})
          AND relation.target_form_id IN (${placeholders(uniqueIds)})
        ORDER BY relation.id
      `, [...uniqueIds, ...uniqueIds]);
      return rows.map((row) => ({ ...row, is_symmetric: Boolean(row.is_symmetric) }));
    },

    async getAdminLexicalEntries({ search = "", limit = 30, offset = 0 } = {}) {
      const normalizedSearch = search.trim();
      const filterParameters = [];
      let where = "";
      if (normalizedSearch) {
        where = `
          WHERE le.entry_key LIKE ?
             OR le.gloss_fr LIKE ?
             OR le.semantic_domain LIKE ?
        `;
        const pattern = `%${normalizedSearch}%`;
        filterParameters.push(pattern, pattern, pattern);
      }

      const [countRows] = await pool.execute(`
        SELECT COUNT(*) AS total
        FROM lexical_entry le
        ${where}
      `, filterParameters);

      const parameters = [...filterParameters, limit, offset];

      const [rows] = await pool.execute(`
        SELECT
          selected.id,
          selected.entry_key,
          selected.gloss_fr,
          selected.gloss_en,
          selected.semantic_domain,
          lf.id AS form_id,
          l.code AS language,
          lf.lemma,
          lf.normalized_lemma,
          lf.part_of_speech
        FROM (
          SELECT le.id, le.entry_key, le.gloss_fr, le.gloss_en, le.semantic_domain
          FROM lexical_entry le
          ${where}
          ORDER BY le.id DESC
          LIMIT ? OFFSET ?
        ) selected
        LEFT JOIN lexical_form lf ON lf.entry_id = selected.id
        LEFT JOIN language l ON l.id = lf.language_id
        ORDER BY selected.id DESC, l.code, lf.lemma
      `, parameters);

      const entries = [];
      const entriesById = new Map();
      for (const row of rows) {
        if (!entriesById.has(row.id)) {
          const entry = {
            id: row.id,
            entry_key: row.entry_key,
            gloss_fr: row.gloss_fr,
            gloss_en: row.gloss_en,
            semantic_domain: row.semantic_domain,
            forms: [],
          };
          entriesById.set(row.id, entry);
          entries.push(entry);
        }
        if (row.form_id !== null) {
          entriesById.get(row.id).forms.push({
            id: row.form_id,
            language: row.language,
            lemma: row.lemma,
            normalized_lemma: row.normalized_lemma,
            part_of_speech: row.part_of_speech,
          });
        }
      }
      return { items: entries, total: Number(countRows[0].total) };
    },

    async createAdminLexicalEntry(entry) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [existing] = await connection.execute(
          "SELECT id FROM lexical_entry WHERE entry_key = ? FOR UPDATE",
          [entry.entry_key]
        );
        if (existing.length > 0) {
          const error = new Error(`L’entrée ${entry.entry_key} existe déjà.`);
          error.code = "DUPLICATE_ENTRY";
          throw error;
        }

        await connection.query("CALL sp_upsert_lexical_entry(?, ?, ?, ?, ?)", [
          entry.entry_key,
          entry.gloss_fr,
          entry.gloss_en,
          entry.semantic_domain,
          entry.notes,
        ]);

        for (const form of entry.forms) {
          await connection.query("CALL sp_upsert_lexical_form(?, ?, ?, ?, ?, ?, ?)", [
            entry.entry_key,
            form.language,
            form.lemma,
            form.normalized_lemma,
            form.part_of_speech,
            form.confidence_score,
            form.notes,
          ]);
        }

        const created = await readLexicalEntryByKey(connection, entry.entry_key);
        await connection.commit();
        return created;
      } catch (error) {
        await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
          error.code = "DUPLICATE_ENTRY";
          error.message = `L’entrée ${entry.entry_key} ou l’une de ses formes existe déjà.`;
        }
        throw error;
      } finally {
        connection.release();
      }
    },

    async updateAdminLexicalEntry(entryKey, entry) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [entryRows] = await connection.execute(
          "SELECT id FROM lexical_entry WHERE entry_key = ? FOR UPDATE",
          [entryKey]
        );
        if (entryRows.length === 0) {
          const error = new Error(`L’entrée ${entryKey} n’existe pas.`);
          error.code = "ENTRY_NOT_FOUND";
          throw error;
        }
        const entryId = entryRows[0].id;
        const [existingForms] = await connection.execute(
          "SELECT id FROM lexical_form WHERE entry_id = ? ORDER BY id FOR UPDATE",
          [entryId]
        );
        const existingIds = existingForms.map((form) => Number(form.id));
        const existingFormUpdates = entry.forms.filter((form) => form.id !== undefined);
        const newForms = entry.forms.filter((form) => form.id === undefined);
        const requestedIds = existingFormUpdates
          .map((form) => Number(form.id))
          .sort((a, b) => a - b);
        if (existingIds.length !== requestedIds.length
            || existingIds.some((id, index) => id !== requestedIds[index])) {
          const error = new Error("Toutes les formes existantes doivent être conservées dans cette V0.");
          error.code = "INVALID_FORM_SET";
          throw error;
        }

        await connection.execute(`
          UPDATE lexical_entry
          SET gloss_fr = ?, gloss_en = ?, semantic_domain = ?, notes = ?
          WHERE id = ?
        `, [entry.gloss_fr, entry.gloss_en, entry.semantic_domain, entry.notes, entryId]);

        for (const form of existingFormUpdates) {
          const [languageRows] = await connection.execute(
            "SELECT id FROM language WHERE code = ? AND is_active = 1",
            [form.language]
          );
          if (languageRows.length === 0) {
            const error = new Error(`La langue ${form.language} n’est pas active.`);
            error.code = "INVALID_LANGUAGE";
            throw error;
          }
          await connection.execute(`
            UPDATE lexical_form
            SET language_id = ?, lemma = ?, normalized_lemma = ?, part_of_speech = ?, notes = ?
            WHERE id = ? AND entry_id = ?
          `, [
            languageRows[0].id,
            form.lemma,
            form.normalized_lemma,
            form.part_of_speech,
            form.notes,
            form.id,
            entryId,
          ]);
        }

        for (const form of newForms) {
          const [languageRows] = await connection.execute(
            "SELECT id FROM language WHERE code = ? AND is_active = 1",
            [form.language]
          );
          if (languageRows.length === 0) {
            const error = new Error(`La langue ${form.language} n’est pas active.`);
            error.code = "INVALID_LANGUAGE";
            throw error;
          }
          await connection.execute(`
            INSERT INTO lexical_form (
              entry_id, language_id, lemma, normalized_lemma,
              part_of_speech, confidence_score, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            entryId,
            languageRows[0].id,
            form.lemma,
            form.normalized_lemma,
            form.part_of_speech,
            form.confidence_score,
            form.notes,
          ]);
        }

        const updated = await readLexicalEntryByKey(connection, entryKey);
        await connection.commit();
        return updated;
      } catch (error) {
        await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
          error.code = "DUPLICATE_FORM";
          error.message = "Une forme identique existe déjà pour cette langue et cette catégorie.";
        }
        throw error;
      } finally {
        connection.release();
      }
    },

    async searchAdminForms({ search = "", limit = 20 } = {}) {
      const normalizedSearch = search.trim();
      const parameters = [];
      let where = "";
      if (normalizedSearch) {
        const pattern = `%${normalizedSearch}%`;
        where = `
          WHERE lf.lemma LIKE ?
             OR lf.normalized_lemma LIKE ?
             OR le.entry_key LIKE ?
             OR l.code LIKE ?
        `;
        parameters.push(pattern, pattern, pattern, pattern);
      }
      parameters.push(limit);
      const [rows] = await pool.execute(`
        SELECT
          lf.id,
          lf.lemma,
          lf.normalized_lemma,
          lf.part_of_speech,
          l.code AS language,
          le.entry_key,
          le.gloss_fr
        FROM lexical_form lf
        JOIN language l ON l.id = lf.language_id
        JOIN lexical_entry le ON le.id = lf.entry_id
        ${where}
        ORDER BY lf.id DESC
        LIMIT ?
      `, parameters);
      return rows;
    },

    async getAdminInflectedForms({ search = "", status = "", limit = 30, offset = 0 } = {}) {
      const conditions = [];
      const parameters = [];
      if (search.trim()) {
        const pattern = `%${search.trim()}%`;
        conditions.push(`(
          inflected.surface_form LIKE ?
          OR inflected.normalized_surface LIKE ?
          OR lf.lemma LIKE ?
          OR le.entry_key LIKE ?
          OR l.code LIKE ?
        )`);
        parameters.push(pattern, pattern, pattern, pattern, pattern);
      }
      if (status) {
        conditions.push("inflected.status = ?");
        parameters.push(status);
      }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const [countRows] = await pool.execute(`
        SELECT COUNT(*) AS total
        FROM inflected_form inflected
        JOIN lexical_form lf ON lf.id = inflected.lexical_form_id
        JOIN language l ON l.id = lf.language_id
        JOIN lexical_entry le ON le.id = lf.entry_id
        ${where}
      `, parameters);
      const [items] = await pool.execute(`
        SELECT
          inflected.id,
          inflected.lexical_form_id,
          inflected.surface_form,
          inflected.normalized_surface,
          inflected.grammatical_number,
          inflected.status,
          inflected.source_label,
          inflected.confidence_score,
          inflected.created_at,
          lf.lemma,
          lf.part_of_speech,
          l.code AS language,
          le.entry_key
        FROM inflected_form inflected
        JOIN lexical_form lf ON lf.id = inflected.lexical_form_id
        JOIN language l ON l.id = lf.language_id
        JOIN lexical_entry le ON le.id = lf.entry_id
        ${where}
        ORDER BY inflected.id DESC
        LIMIT ? OFFSET ?
      `, [...parameters, limit, offset]);
      return { items, total: Number(countRows[0].total) };
    },

    async getConnectorHelps(options = {}) {
      return listConnectorHelps({ ...options, status: "", validatedOnly: true });
    },

    async lookupConnectorHelp({ language, normalizedExpression }) {
      const [items] = await pool.execute(`
        SELECT
          ch.id,
          l.code AS language,
          ch.expression,
          ch.discourse_function,
          ch.pedagogical_title,
          ch.pedagogical_hint,
          ch.example,
          ch.caution,
          ch.source_label
        FROM connector_help ch
        JOIN language l ON l.id = ch.language_id
        WHERE l.code = ?
          AND l.is_active = 1
          AND ch.status = 'VALIDATED'
          AND ch.normalized_expression = ?
        ORDER BY ch.id
      `, [language, normalizedExpression]);
      return items;
    },

    async getConnectorHelp(id) {
      return readConnectorHelpById(pool, id, true);
    },

    async getAdminConnectorHelps(options = {}) {
      return listConnectorHelps(options);
    },

    async getAdminConnectorHelp(id) {
      return readConnectorHelpById(pool, id, false);
    },

    async getConnectorHelpFunctionCounts() {
      const [rows] = await pool.execute(`
        SELECT discourse_function, COUNT(*) AS total
        FROM connector_help
        GROUP BY discourse_function
      `);
      return new Map(rows.map((row) => [row.discourse_function, Number(row.total)]));
    },

    async createAdminConnectorHelp(connectorHelp) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const { languageId, lexicalEntryId } = await resolveConnectorHelpReferences(
          connection,
          connectorHelp
        );
        await rejectValidatedConnectorConflict(connection, connectorHelp, languageId);
        const [result] = await connection.execute(`
          INSERT INTO connector_help (
            language_id, lexical_entry_id, expression, normalized_expression,
            discourse_function, pedagogical_title, pedagogical_hint, example,
            caution, status, source_label, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          languageId,
          lexicalEntryId,
          connectorHelp.expression,
          connectorHelp.normalized_expression,
          connectorHelp.discourse_function,
          connectorHelp.pedagogical_title,
          connectorHelp.pedagogical_hint,
          connectorHelp.example,
          connectorHelp.caution,
          connectorHelp.status,
          connectorHelp.source_label,
          connectorHelp.notes,
        ]);
        const created = await readConnectorHelpById(connection, result.insertId);
        await connection.commit();
        return created;
      } catch (error) {
        await connection.rollback();
        throw mapConnectorHelpWriteError(error);
      } finally {
        connection.release();
      }
    },

    async updateAdminConnectorHelp(id, connectorHelp) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [existing] = await connection.execute(
          "SELECT id FROM connector_help WHERE id = ? FOR UPDATE",
          [id]
        );
        if (existing.length === 0) {
          const error = new Error("L’aide discursive n’existe pas.");
          error.code = "CONNECTOR_HELP_NOT_FOUND";
          throw error;
        }
        const { languageId, lexicalEntryId } = await resolveConnectorHelpReferences(
          connection,
          connectorHelp
        );
        await rejectValidatedConnectorConflict(connection, connectorHelp, languageId, id);
        await connection.execute(`
          UPDATE connector_help
          SET language_id = ?,
              lexical_entry_id = ?,
              expression = ?,
              normalized_expression = ?,
              discourse_function = ?,
              pedagogical_title = ?,
              pedagogical_hint = ?,
              example = ?,
              caution = ?,
              status = ?,
              source_label = ?,
              notes = ?
          WHERE id = ?
        `, [
          languageId,
          lexicalEntryId,
          connectorHelp.expression,
          connectorHelp.normalized_expression,
          connectorHelp.discourse_function,
          connectorHelp.pedagogical_title,
          connectorHelp.pedagogical_hint,
          connectorHelp.example,
          connectorHelp.caution,
          connectorHelp.status,
          connectorHelp.source_label,
          connectorHelp.notes,
          id,
        ]);
        const updated = await readConnectorHelpById(connection, id);
        await connection.commit();
        return updated;
      } catch (error) {
        await connection.rollback();
        throw mapConnectorHelpWriteError(error);
      } finally {
        connection.release();
      }
    },

    async archiveAdminConnectorHelp(id) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(`
          UPDATE connector_help
          SET status = 'ARCHIVED'
          WHERE id = ?
        `, [id]);
        if (result.affectedRows === 0) {
          const error = new Error("L’aide discursive n’existe pas.");
          error.code = "CONNECTOR_HELP_NOT_FOUND";
          throw error;
        }
        const archived = await readConnectorHelpById(connection, id);
        await connection.commit();
        return archived;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async createAdminInflectedForm(mapping) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [targets] = await connection.execute(`
          SELECT
            lf.id,
            lf.lemma,
            lf.part_of_speech,
            l.code AS language,
            le.entry_key
          FROM lexical_form lf
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE lf.id = ?
          FOR UPDATE
        `, [mapping.lexical_form_id]);
        if (targets.length === 0) {
          const error = new Error("La forme lexicale cible n’existe pas.");
          error.code = "TARGET_FORM_NOT_FOUND";
          throw error;
        }
        const target = targets[0];
        if (!new Set(["noun", "adjective"]).has(String(target.part_of_speech).toLowerCase())) {
          const error = new Error("La cible doit être un nom ou un adjectif dans cette V0.");
          error.code = "UNSUPPORTED_INFLECTED_FORM_POS";
          throw error;
        }
        if (!new Set(["fr", "es", "it", "pt"]).has(target.language)) {
          const error = new Error("La langue cible doit être fr, es, it ou pt dans cette V0.");
          error.code = "UNSUPPORTED_INFLECTED_FORM_LANGUAGE";
          throw error;
        }

        const [result] = await connection.execute(`
          INSERT INTO inflected_form (
            lexical_form_id,
            surface_form,
            normalized_surface,
            grammatical_number,
            status,
            source_label,
            confidence_score
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          mapping.lexical_form_id,
          mapping.surface_form,
          mapping.normalized_surface,
          mapping.grammatical_number,
          mapping.status,
          mapping.source_label,
          mapping.confidence_score,
        ]);
        const [createdRows] = await connection.execute(`
          SELECT
            inflected.id,
            inflected.lexical_form_id,
            inflected.surface_form,
            inflected.normalized_surface,
            inflected.grammatical_number,
            inflected.status,
            inflected.source_label,
            inflected.confidence_score,
            inflected.created_at,
            lf.lemma,
            lf.part_of_speech,
            l.code AS language,
            le.entry_key
          FROM inflected_form inflected
          JOIN lexical_form lf ON lf.id = inflected.lexical_form_id
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE inflected.id = ?
        `, [result.insertId]);
        await connection.commit();
        return createdRows[0];
      } catch (error) {
        await connection.rollback();
        if (error.code === "ER_DUP_ENTRY") {
          error.code = "DUPLICATE_INFLECTED_FORM";
          error.message = "Ce mapping de forme fléchie existe déjà.";
        }
        throw error;
      } finally {
        connection.release();
      }
    },

    async getAdminFormRelations({ search = "", limit = 30 } = {}) {
      const normalizedSearch = search.trim();
      const parameters = [];
      let where = "";
      if (normalizedSearch) {
        const pattern = `%${normalizedSearch}%`;
        where = `
          WHERE source_form.lemma LIKE ?
             OR target_form.lemma LIKE ?
             OR source_entry.entry_key LIKE ?
             OR target_entry.entry_key LIKE ?
             OR relation.relation_type LIKE ?
        `;
        parameters.push(pattern, pattern, pattern, pattern, pattern);
      }
      parameters.push(limit);
      const [rows] = await pool.execute(`
        SELECT
          relation.id,
          relation.relation_type,
          relation.score,
          relation.is_symmetric,
          relation.source_label,
          source_form.id AS source_form_id,
          source_form.lemma AS source_lemma,
          source_language.code AS source_language,
          source_entry.entry_key AS source_entry_key,
          target_form.id AS target_form_id,
          target_form.lemma AS target_lemma,
          target_language.code AS target_language,
          target_entry.entry_key AS target_entry_key
        FROM form_relation relation
        JOIN lexical_form source_form ON source_form.id = relation.source_form_id
        JOIN language source_language ON source_language.id = source_form.language_id
        JOIN lexical_entry source_entry ON source_entry.id = source_form.entry_id
        JOIN lexical_form target_form ON target_form.id = relation.target_form_id
        JOIN language target_language ON target_language.id = target_form.language_id
        JOIN lexical_entry target_entry ON target_entry.id = target_form.entry_id
        ${where}
        ORDER BY relation.id DESC
        LIMIT ?
      `, parameters);
      return rows.map((row) => ({ ...row, is_symmetric: Boolean(row.is_symmetric) }));
    },

    async createAdminFormRelation(relation) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const orderedIds = [relation.source_form_id, relation.target_form_id].sort((a, b) => a - b);
        const [forms] = await connection.execute(
          "SELECT id FROM lexical_form WHERE id IN (?, ?) ORDER BY id FOR UPDATE",
          orderedIds
        );
        if (forms.length !== 2) {
          const error = new Error("La forme source ou la forme cible n’existe pas.");
          error.code = "FORM_NOT_FOUND";
          throw error;
        }

        const [duplicates] = await connection.execute(`
          SELECT id
          FROM form_relation
          WHERE relation_type = ?
            AND ((source_form_id = ? AND target_form_id = ?)
              OR (source_form_id = ? AND target_form_id = ?))
          FOR UPDATE
        `, [
          relation.relation_type,
          relation.source_form_id,
          relation.target_form_id,
          relation.target_form_id,
          relation.source_form_id,
        ]);
        if (duplicates.length > 0) {
          const error = new Error("Cette relation existe déjà entre les deux formes.");
          error.code = "DUPLICATE_RELATION";
          throw error;
        }

        const [result] = await connection.execute(`
          INSERT INTO form_relation (
            source_form_id, target_form_id, relation_type, score,
            is_symmetric, source_label, confidence_score, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          relation.source_form_id,
          relation.target_form_id,
          relation.relation_type,
          relation.score,
          relation.is_symmetric ? 1 : 0,
          relation.source_label,
          relation.confidence_score,
          relation.notes,
        ]);
        await connection.commit();
        return { id: result.insertId, ...relation };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async findExistingEntryKeys(entryKeys) {
      const uniqueKeys = [...new Set(entryKeys)].filter(Boolean);
      if (uniqueKeys.length === 0) return [];
      const [rows] = await pool.execute(`
        SELECT entry_key
        FROM lexical_entry
        WHERE entry_key IN (${placeholders(uniqueKeys)})
      `, uniqueKeys);
      return rows.map((row) => row.entry_key);
    },

    async findKnownLexicalForms(normalizedLemmas) {
      const uniqueLemmas = [...new Set(normalizedLemmas)].filter(Boolean);
      if (uniqueLemmas.length === 0) return [];
      const [rows] = await pool.execute(`
        SELECT
          lf.normalized_lemma,
          lf.lemma,
          lf.part_of_speech,
          l.code AS language,
          le.entry_key,
          le.gloss_fr
        FROM lexical_form lf
        JOIN language l ON l.id = lf.language_id
        JOIN lexical_entry le ON le.id = lf.entry_id
        WHERE lf.normalized_lemma IN (${placeholders(uniqueLemmas)})
        ORDER BY lf.normalized_lemma, l.code, lf.lemma
      `, uniqueLemmas);
      return rows;
    },

    async findTextCoverageForms(normalizedSurfaces, language) {
      const uniqueSurfaces = [...new Set(normalizedSurfaces)].filter(Boolean);
      if (uniqueSurfaces.length === 0) {
        return { lexicalForms: [], inflectedForms: [] };
      }
      const [lexicalForms] = await pool.execute(`
        SELECT
          lf.normalized_lemma,
          lf.lemma,
          lf.part_of_speech,
          l.code AS language,
          le.entry_key,
          le.gloss_fr
        FROM lexical_form lf
        JOIN language l ON l.id = lf.language_id
        JOIN lexical_entry le ON le.id = lf.entry_id
        WHERE l.code = ?
          AND lf.normalized_lemma IN (${placeholders(uniqueSurfaces)})
        ORDER BY lf.normalized_lemma, lf.lemma
      `, [language, ...uniqueSurfaces]);
      const exactKeys = new Set(lexicalForms.map((form) => form.normalized_lemma));
      const unresolved = uniqueSurfaces.filter((surface) => !exactKeys.has(surface));
      let inflectedForms = [];
      if (unresolved.length > 0) {
        [inflectedForms] = await pool.execute(`
          SELECT
            inflected.id,
            inflected.lexical_form_id,
            inflected.normalized_surface,
            inflected.grammatical_number,
            inflected.status,
            lf.lemma,
            lf.part_of_speech,
            l.code AS language,
            le.entry_key
          FROM inflected_form inflected
          JOIN lexical_form lf ON lf.id = inflected.lexical_form_id
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE l.code = ?
            AND inflected.status = 'VALIDATED'
            AND inflected.normalized_surface IN (${placeholders(unresolved)})
          ORDER BY inflected.normalized_surface, inflected.id
        `, [language, ...unresolved]);
      }
      return { lexicalForms, inflectedForms };
    },

    async loadInflectedCandidateResolution(candidates) {
      const lemmaKeys = [...new Set(candidates
        .map((candidate) => candidate.normalized_lemma_candidate)
        .filter(Boolean))];
      const surfaceKeys = [...new Set(candidates
        .map((candidate) => candidate.normalized_surface)
        .filter(Boolean))];
      const languages = [...new Set(candidates.map((candidate) => candidate.language))];
      let lexicalForms = [];
      let existingMappings = [];
      if (lemmaKeys.length > 0 && languages.length > 0) {
        [lexicalForms] = await pool.execute(`
          SELECT
            lf.id,
            lf.lemma,
            lf.normalized_lemma,
            lf.part_of_speech,
            l.code AS language,
            le.entry_key,
            le.gloss_fr
          FROM lexical_form lf
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE l.code IN (${placeholders(languages)})
            AND lf.normalized_lemma IN (${placeholders(lemmaKeys)})
            AND LOWER(lf.part_of_speech) IN ('noun', 'adjective')
          ORDER BY l.code, lf.normalized_lemma, lf.id
        `, [...languages, ...lemmaKeys]);
      }
      if (surfaceKeys.length > 0 && languages.length > 0) {
        [existingMappings] = await pool.execute(`
          SELECT
            inflected.id,
            inflected.lexical_form_id,
            inflected.normalized_surface,
            inflected.grammatical_number,
            inflected.status,
            lf.lemma,
            lf.part_of_speech,
            l.code AS language,
            le.entry_key
          FROM inflected_form inflected
          JOIN lexical_form lf ON lf.id = inflected.lexical_form_id
          JOIN language l ON l.id = lf.language_id
          JOIN lexical_entry le ON le.id = lf.entry_id
          WHERE l.code IN (${placeholders(languages)})
            AND inflected.normalized_surface IN (${placeholders(surfaceKeys)})
          ORDER BY inflected.normalized_surface, inflected.id
        `, [...languages, ...surfaceKeys]);
      }
      return { lexicalForms, existingMappings };
    },
  };
}

module.exports = { createPool, createRepository };
