const express = require("express");
const cors = require("cors");
const path = require("node:path");
const { canonicalizeEntryKey } = require("../admin/js/entry-key-canonicalization-0.1.js");

const { createPool, createRepository } = require("./src/repository");
const {
  CONTRACT_VERSION,
  MAX_TEXT_LENGTH,
  analyze,
  validateRequest,
} = require("./src/analysis");
const {
  ALLOWED_CONNECTOR_HELP_STATUSES,
  ALLOWED_DISCOURSE_FUNCTIONS,
  ALLOWED_INFLECTED_FORM_STATUSES,
  DISCOURSE_FUNCTIONS,
  normalizeConnectorExpression,
  validateAdminConnectorHelp,
  validateAdminFormRelation,
  validateAdminInflectedForm,
  validateAdminLexicalEntry,
  validateAdminLexicalEntryUpdate,
} = require("./src/admin");
const {
  AdminAiError,
  generateDomainCandidates,
  validateDomainCandidateRequest,
} = require("./src/admin-ai-domain");
const {
  buildTextCoverage,
  generateTextCandidates,
  validateTextCandidateRequest,
  validateTextCoverageRequest,
} = require("./src/admin-ai-text");
const {
  generateInflectedCandidates,
  resolveInflectedCandidates,
  validateInflectedCandidateRequest,
} = require("./src/admin-ai-inflected-form");
const {
  annotateExistingRelations,
  generateRelationCandidates,
  validateRelationCandidateRequest,
} = require("./src/admin-ai-relations");

function errorResponse(res, status, code, message, field) {
  const error = { code, message };
  if (field) error.field = field;
  return res.status(status).json({ contract_version: CONTRACT_VERSION, error });
}

function createClientAbortContext(req, res) {
  const controller = new AbortController();
  const abort = () => {
    if (!res.writableEnded && !controller.signal.aborted) controller.abort();
  };
  req.once("aborted", abort);
  res.once("close", abort);
  return {
    signal: controller.signal,
    cleanup() {
      req.removeListener("aborted", abort);
      res.removeListener("close", abort);
    },
  };
}

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parsePagination(query) {
  const parsedLimit = Number.parseInt(query.limit, 10);
  const parsedOffset = Number.parseInt(query.offset, 10);
  return {
    limit: Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 30,
    offset: Number.isInteger(parsedOffset) ? Math.max(0, parsedOffset) : 0,
  };
}

function publicConnectorHelp(item) {
  return {
    id: item.id,
    language: item.language_name
      ? { code: item.language, name: item.language_name }
      : item.language,
    expression: item.expression,
    discourse_function: item.discourse_function,
    pedagogical_title: item.pedagogical_title,
    pedagogical_hint: item.pedagogical_hint,
    example: item.example,
    caution: item.caution,
    source_label: item.source_label,
  };
}

function connectorHelpError(res, error) {
  if (error.code === "CONNECTOR_HELP_NOT_FOUND") {
    return errorResponse(res, 404, error.code, error.message, "id");
  }
  if (error.code === "LEXICAL_ENTRY_NOT_FOUND") {
    return errorResponse(res, 404, error.code, error.message, "lexical_entry_key");
  }
  if (error.code === "UNSUPPORTED_CONNECTOR_LANGUAGE") {
    return errorResponse(res, 422, error.code, error.message, "language");
  }
  if (error.code === "DUPLICATE_CONNECTOR_HELP"
      || error.code === "CONNECTOR_HELP_FUNCTION_CONFLICT") {
    return errorResponse(res, 409, error.code, error.message, "expression");
  }
  return null;
}

function createApp(repository, options = {}) {
  const app = express();
  const generateText = options.generateTextCandidates || generateTextCandidates;

  app.use(cors());
  app.use(express.json({ limit: "128kb" }));
  app.use("/admin-app", express.static(path.resolve(__dirname, "../admin"), {
    dotfiles: "deny",
    index: false,
  }));
  app.use("/prototypes", express.static(path.resolve(__dirname, "../prototypes"), {
    dotfiles: "deny",
    index: false,
  }));

  app.get("/languages", async (_req, res, next) => {
    try {
      const languages = await repository.getLanguages();
      res.json({ contract_version: CONTRACT_VERSION, languages });
    } catch (error) {
      next(error);
    }
  });

  app.get("/language-catalog", async (_req, res, next) => {
    try {
      const catalog = await repository.getLanguageCatalog();
      res.json({ contract_version: CONTRACT_VERSION, ...catalog });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/documentable-languages", async (_req, res, next) => {
    try {
      const languages = await repository.getDocumentableLanguages();
      res.json({ contract_version: CONTRACT_VERSION, languages });
    } catch (error) {
      next(error);
    }
  });

  app.get("/connector-help-languages", async (_req, res, next) => {
    try {
      const languages = await repository.getConnectorHelpLanguages();
      res.json({ contract_version: CONTRACT_VERSION, languages });
    } catch (error) {
      next(error);
    }
  });

  app.get("/connector-helps", async (req, res, next) => {
    try {
      const language = typeof req.query.language === "string" ? req.query.language.toLowerCase() : "";
      const discourseFunction = typeof req.query.function === "string"
        ? req.query.function.toUpperCase()
        : "";
      const connectorHelpLanguages = await repository.getConnectorHelpLanguages();
      if (language && !connectorHelpLanguages.some((item) => item.code === language)) {
        return errorResponse(res, 400, "INVALID_CONNECTOR_LANGUAGE", "La langue doit être active et documentée pour les aides à la lecture.", "language");
      }
      if (discourseFunction && !ALLOWED_DISCOURSE_FUNCTIONS.has(discourseFunction)) {
        return errorResponse(res, 400, "INVALID_DISCOURSE_FUNCTION", "La fonction discursive est invalide.", "function");
      }
      const { limit, offset } = parsePagination(req.query);
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
      const result = await repository.getConnectorHelps({
        language,
        discourseFunction,
        search,
        limit,
        offset,
      });
      return res.json({
        contract_version: CONTRACT_VERSION,
        items: result.items.map(publicConnectorHelp),
        total: result.total,
        language,
        function: discourseFunction,
        search,
        limit,
        offset,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/connector-help/lookup", async (req, res, next) => {
    try {
      const language = typeof req.query.language === "string" ? req.query.language.toLowerCase() : "";
      const expression = typeof req.query.expression === "string" ? req.query.expression : "";
      const connectorHelpLanguages = await repository.getConnectorHelpLanguages();
      if (!connectorHelpLanguages.some((item) => item.code === language)) {
        return errorResponse(res, 400, "INVALID_CONNECTOR_LANGUAGE", "La langue doit être active et documentée pour les aides à la lecture.", "language");
      }
      if (!expression.trim() || expression.length > 255) {
        return errorResponse(res, 400, "INVALID_CONNECTOR_EXPRESSION", "expression est obligatoire.", "expression");
      }
      const items = await repository.lookupConnectorHelp({
        language,
        normalizedExpression: normalizeConnectorExpression(expression),
      });
      return res.json({
        contract_version: CONTRACT_VERSION,
        language,
        expression,
        items: items.map(publicConnectorHelp),
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/connector-help/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_CONNECTOR_HELP_ID", "L’identifiant est invalide.", "id");
      const item = await repository.getConnectorHelp(id);
      if (!item) return errorResponse(res, 404, "CONNECTOR_HELP_NOT_FOUND", "L’aide discursive n’existe pas.", "id");
      return res.json({ contract_version: CONTRACT_VERSION, connector_help: publicConnectorHelp(item) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/analysis", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(
        res,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type doit être application/json."
      );
    }

    try {
      const languages = await repository.getLanguages();
      const validation = validateRequest(req.body, languages);

      if (!validation.ok) {
        return errorResponse(
          res,
          validation.status,
          validation.code,
          validation.message,
          validation.field
        );
      }

      const resources = await repository.loadAnalysisResources(validation.value);
      const response = analyze(validation.value, resources, validation.warnings);
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/admin/model-summary", async (_req, res, next) => {
    try {
      const model = await repository.getAdminModelSummary();
      res.json({ contract_version: CONTRACT_VERSION, model });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/connector-helps", async (req, res, next) => {
    try {
      const language = typeof req.query.language === "string" ? req.query.language.toLowerCase() : "";
      const discourseFunction = typeof req.query.function === "string"
        ? req.query.function.toUpperCase()
        : "";
      const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
      const connectorHelpLanguages = await repository.getConnectorHelpLanguages();
      if (language && !connectorHelpLanguages.some((item) => item.code === language)) {
        return errorResponse(res, 400, "INVALID_CONNECTOR_LANGUAGE", "La langue doit être active et documentée pour les aides à la lecture.", "language");
      }
      if (discourseFunction && !ALLOWED_DISCOURSE_FUNCTIONS.has(discourseFunction)) {
        return errorResponse(res, 400, "INVALID_DISCOURSE_FUNCTION", "La fonction discursive est invalide.", "function");
      }
      if (status && !ALLOWED_CONNECTOR_HELP_STATUSES.has(status)) {
        return errorResponse(res, 400, "INVALID_CONNECTOR_HELP_STATUS", "Le statut Connector Help est invalide.", "status");
      }
      const { limit, offset } = parsePagination(req.query);
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
      const result = await repository.getAdminConnectorHelps({
        language,
        discourseFunction,
        status,
        search,
        limit,
        offset,
      });
      return res.json({
        contract_version: CONTRACT_VERSION,
        items: result.items,
        total: result.total,
        language,
        function: discourseFunction,
        status,
        search,
        limit,
        offset,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/admin/connector-help-functions", async (_req, res, next) => {
    try {
      const counts = await repository.getConnectorHelpFunctionCounts();
      const items = Object.entries(DISCOURSE_FUNCTIONS).map(([code, metadata]) => ({
        code,
        ...metadata,
        total: counts.get(code) || 0,
      }));
      return res.json({ contract_version: CONTRACT_VERSION, items });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/admin/connector-help/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_CONNECTOR_HELP_ID", "L’identifiant est invalide.", "id");
      const item = await repository.getAdminConnectorHelp(id);
      if (!item) return errorResponse(res, 404, "CONNECTOR_HELP_NOT_FOUND", "L’aide discursive n’existe pas.", "id");
      return res.json({ contract_version: CONTRACT_VERSION, connector_help: item });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/admin/connector-help", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const languages = await repository.getLanguages();
      const validation = validateAdminConnectorHelp(req.body, languages);
      if (!validation.ok) {
        return errorResponse(res, validation.status, validation.code, validation.message, validation.field);
      }
      const item = await repository.createAdminConnectorHelp(validation.value);
      return res.status(201).json({
        contract_version: CONTRACT_VERSION,
        message: `Aide discursive « ${item.expression} » créée.`,
        connector_help: item,
      });
    } catch (error) {
      return connectorHelpError(res, error) || next(error);
    }
  });

  app.put("/admin/connector-help/:id", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_CONNECTOR_HELP_ID", "L’identifiant est invalide.", "id");
      const languages = await repository.getLanguages();
      const validation = validateAdminConnectorHelp(req.body, languages);
      if (!validation.ok) {
        return errorResponse(res, validation.status, validation.code, validation.message, validation.field);
      }
      const item = await repository.updateAdminConnectorHelp(id, validation.value);
      return res.json({
        contract_version: CONTRACT_VERSION,
        message: `Aide discursive « ${item.expression} » mise à jour.`,
        connector_help: item,
      });
    } catch (error) {
      return connectorHelpError(res, error) || next(error);
    }
  });

  app.delete("/admin/connector-help/:id", async (req, res, next) => {
    try {
      const id = parsePositiveId(req.params.id);
      if (!id) return errorResponse(res, 400, "INVALID_CONNECTOR_HELP_ID", "L’identifiant est invalide.", "id");
      const item = await repository.archiveAdminConnectorHelp(id);
      return res.json({
        contract_version: CONTRACT_VERSION,
        message: "Aide discursive archivée.",
        connector_help: item,
      });
    } catch (error) {
      return connectorHelpError(res, error) || next(error);
    }
  });

  app.get("/admin/lexical-entries", async (req, res, next) => {
    try {
      const parsedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isInteger(parsedLimit)
        ? Math.max(1, Math.min(parsedLimit, 100))
        : 30;
      const parsedOffset = Number.parseInt(req.query.offset, 10);
      const offset = Number.isInteger(parsedOffset) ? Math.max(0, parsedOffset) : 0;
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
      const result = await repository.getAdminLexicalEntries({ search, limit, offset });
      res.json({
        contract_version: CONTRACT_VERSION,
        items: result.items,
        limit,
        offset,
        total: result.total,
        search,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/admin/lexical-entry/:entryKey", async (req, res, next) => {
    try {
      const entryKey = canonicalizeEntryKey(req.params.entryKey);
      const entry = await repository.getAdminLexicalEntry(entryKey);
      if (!entry) {
        return errorResponse(res, 404, "ENTRY_NOT_FOUND", `L’entrée ${entryKey} n’existe pas.`, "entry_key");
      }
      const relations = await repository.getAdminRelationsForFormIds(
        entry.forms.map((form) => form.id)
      );
      return res.json({ contract_version: CONTRACT_VERSION, entry, relations });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/admin/lexical-entry/:entryKey", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const entryKey = canonicalizeEntryKey(req.params.entryKey);
      const languages = await repository.getDocumentableLanguages();
      const validation = validateAdminLexicalEntryUpdate(req.body, entryKey, languages);
      if (!validation.ok) {
        return errorResponse(
          res,
          validation.status,
          validation.code,
          validation.message,
          validation.field
        );
      }
      const entry = await repository.updateAdminLexicalEntry(entryKey, validation.value);
      return res.json({
        contract_version: CONTRACT_VERSION,
        message: `Entrée ${entryKey} mise à jour avec ${entry.forms.length} forme(s).`,
        entry,
      });
    } catch (error) {
      if (error.code === "ENTRY_NOT_FOUND") {
        return errorResponse(res, 404, error.code, error.message, "entry_key");
      }
      if (error.code === "INVALID_FORM_SET") {
        return errorResponse(res, 409, error.code, error.message, "forms");
      }
      if (error.code === "DUPLICATE_FORM") {
        return errorResponse(res, 409, error.code, error.message, "forms");
      }
      if (error.code === "INVALID_LANGUAGE") {
        return errorResponse(res, 400, error.code, error.message, "forms");
      }
      return next(error);
    }
  });

  app.get("/admin/forms", async (req, res, next) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
      const parsedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 50)) : 20;
      const items = await repository.searchAdminForms({ search, limit });
      return res.json({ contract_version: CONTRACT_VERSION, items, search, limit });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/admin/inflected-forms", async (req, res, next) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
      const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
      if (status && !ALLOWED_INFLECTED_FORM_STATUSES.has(status)) {
        return errorResponse(
          res,
          400,
          "INVALID_INFLECTED_FORM_STATUS",
          "Le statut doit valoir PROPOSED, VALIDATED, REJECTED ou ARCHIVED.",
          "status"
        );
      }
      const parsedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 30;
      const parsedOffset = Number.parseInt(req.query.offset, 10);
      const offset = Number.isInteger(parsedOffset) ? Math.max(0, parsedOffset) : 0;
      const result = await repository.getAdminInflectedForms({ search, status, limit, offset });
      return res.json({
        contract_version: CONTRACT_VERSION,
        items: result.items,
        total: result.total,
        search,
        status,
        limit,
        offset,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/admin/inflected-form", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const validation = validateAdminInflectedForm(req.body);
      if (!validation.ok) {
        return errorResponse(
          res,
          validation.status,
          validation.code,
          validation.message,
          validation.field
        );
      }
      const mapping = await repository.createAdminInflectedForm(validation.value);
      return res.status(201).json({
        contract_version: CONTRACT_VERSION,
        message: `Mapping ${mapping.surface_form} → ${mapping.lemma} créé.`,
        mapping,
      });
    } catch (error) {
      if (error.code === "TARGET_FORM_NOT_FOUND") {
        return errorResponse(res, 404, error.code, error.message, "lexical_form_id");
      }
      if (error.code === "UNSUPPORTED_INFLECTED_FORM_POS"
          || error.code === "UNSUPPORTED_INFLECTED_FORM_LANGUAGE") {
        return errorResponse(res, 422, error.code, error.message, "lexical_form_id");
      }
      if (error.code === "DUPLICATE_INFLECTED_FORM") {
        return errorResponse(res, 409, error.code, error.message, "surface_form");
      }
      return next(error);
    }
  });

  app.get("/admin/form-relations", async (req, res, next) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
      const parsedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 30;
      const items = await repository.getAdminFormRelations({ search, limit });
      return res.json({ contract_version: CONTRACT_VERSION, items, search, limit });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/admin/form-relation", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const validation = validateAdminFormRelation(req.body);
      if (!validation.ok) {
        return errorResponse(
          res,
          validation.status,
          validation.code,
          validation.message,
          validation.field
        );
      }
      const relation = await repository.createAdminFormRelation(validation.value);
      return res.status(201).json({
        contract_version: CONTRACT_VERSION,
        message: `Relation ${relation.relation_type} créée entre les formes ${relation.source_form_id} et ${relation.target_form_id}.`,
        relation,
      });
    } catch (error) {
      if (error.code === "FORM_NOT_FOUND") {
        return errorResponse(res, 404, error.code, error.message);
      }
      if (error.code === "DUPLICATE_RELATION") {
        return errorResponse(res, 409, error.code, error.message);
      }
      return next(error);
    }
  });

  app.put("/admin/form-relation/:relationId", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    const relationId = parsePositiveId(req.params.relationId);
    if (!relationId) {
      return errorResponse(res, 400, "INVALID_RELATION_ID", "L’identifiant de relation est invalide.", "relation_id");
    }
    try {
      const validation = validateAdminFormRelation(req.body);
      if (!validation.ok) {
        return errorResponse(res, validation.status, validation.code, validation.message, validation.field);
      }
      const relation = await repository.updateAdminFormRelation(relationId, validation.value);
      return res.json({
        contract_version: CONTRACT_VERSION,
        message: `Relation ${relationId} mise à jour.`,
        relation,
      });
    } catch (error) {
      if (error.code === "RELATION_NOT_FOUND") {
        return errorResponse(res, 404, error.code, error.message, "relation_id");
      }
      if (error.code === "RELATION_PAIR_IMMUTABLE") {
        return errorResponse(res, 409, error.code, error.message, "relation_id");
      }
      return next(error);
    }
  });

  app.post("/admin/lexical-entry", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(
        res,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type doit être application/json."
      );
    }

    try {
      const languages = await repository.getDocumentableLanguages();
      const validation = validateAdminLexicalEntry(req.body, languages);
      if (!validation.ok) {
        return errorResponse(
          res,
          validation.status,
          validation.code,
          validation.message,
          validation.field
        );
      }

      const entry = await repository.createAdminLexicalEntry(validation.value);
      return res.status(201).json({
        contract_version: CONTRACT_VERSION,
        message: `Entrée ${entry.entry_key} créée avec ${entry.forms.length} forme(s).`,
        entry,
      });
    } catch (error) {
      if (error.code === "DUPLICATE_ENTRY") {
        return errorResponse(res, 409, "DUPLICATE_ENTRY", error.message, "entry_key");
      }
      if (error.code === "INVALID_LANGUAGE") {
        return errorResponse(res, 400, error.code, error.message, "forms");
      }
      return next(error);
    }
  });

  app.post("/admin/ai/domain-candidates", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(
        res,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type doit être application/json."
      );
    }

    try {
      const languages = await repository.getLanguages();
      const request = validateDomainCandidateRequest(req.body, languages);
      const generated = await generateDomainCandidates(request);
      const existingEntryKeys = await repository.findExistingEntryKeys(
        generated.candidates.map((candidate) => candidate.entry_key)
      );
      return res.json({
        contract_version: CONTRACT_VERSION,
        candidates: generated.candidates,
        existing_entry_keys: existingEntryKeys,
        generation: {
          model: generated.model,
          response_id: generated.response_id,
          requested: request.count,
          returned: generated.candidates.length,
        },
      });
    } catch (error) {
      if (error instanceof AdminAiError) {
        return errorResponse(res, error.status, error.code, error.message, error.field);
      }
      return next(error);
    }
  });

  app.post("/admin/text-coverage", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const languages = await repository.getLanguages();
      const request = validateTextCoverageRequest(req.body, languages);
      const coverageRows = await repository.findTextCoverageForms(
        request.uniqueWords.map((word) => word.normalized),
        request.sourceLanguage
      );
      return res.json({
        contract_version: CONTRACT_VERSION,
        ...buildTextCoverage(
          request,
          coverageRows.lexicalForms,
          coverageRows.inflectedForms
        ),
      });
    } catch (error) {
      if (error instanceof AdminAiError) {
        return errorResponse(res, error.status, error.code, error.message, error.field);
      }
      return next(error);
    }
  });

  app.post("/admin/ai/inflected-form-candidates", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const languages = await repository.getLanguages();
      const request = validateInflectedCandidateRequest(req.body, languages);
      const generated = await generateInflectedCandidates(request);
      const resolution = await repository.loadInflectedCandidateResolution(generated.candidates);
      const candidates = resolveInflectedCandidates(
        generated.candidates,
        resolution.lexicalForms,
        resolution.existingMappings
      );
      return res.json({
        contract_version: CONTRACT_VERSION,
        candidates,
        ...(generated.warnings.length > 0 ? { warnings: generated.warnings } : {}),
        generation: {
          model: generated.model,
          response_id: generated.response_id,
          requested: request.count,
          returned: candidates.length,
          ignored: generated.warnings.length,
        },
      });
    } catch (error) {
      if (error instanceof AdminAiError) {
        return errorResponse(res, error.status, error.code, error.message, error.field);
      }
      return next(error);
    }
  });

  app.post("/admin/ai/text-candidates", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    const cancellation = createClientAbortContext(req, res);
    try {
      const languages = await repository.getLanguages();
      const request = validateTextCandidateRequest(req.body, languages);
      const generated = await generateText(request, { signal: cancellation.signal });
      if (cancellation.signal.aborted) return;
      const existingEntryKeys = await repository.findExistingEntryKeys(
        generated.candidates.map((candidate) => candidate.entry_key)
      );
      if (cancellation.signal.aborted) return;
      return res.json({
        contract_version: CONTRACT_VERSION,
        candidates: generated.candidates,
        existing_entry_keys: existingEntryKeys,
        generation: {
          model: generated.model,
          response_id: generated.response_id,
          requested: request.count,
          returned: generated.candidates.length,
        },
      });
    } catch (error) {
      if (cancellation.signal.aborted || error?.code === "OPENAI_CANCELLED") return;
      if (error instanceof AdminAiError) {
        return errorResponse(res, error.status, error.code, error.message, error.field);
      }
      return next(error);
    } finally {
      cancellation.cleanup();
    }
  });

  app.post("/admin/ai/relation-candidates", async (req, res, next) => {
    if (!req.is("application/json")) {
      return errorResponse(res, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type doit être application/json.");
    }
    try {
      const request = validateRelationCandidateRequest(req.body);
      const entry = await repository.getAdminLexicalEntry(request.entry_key);
      if (!entry) {
        throw new AdminAiError(404, "ENTRY_NOT_FOUND", `L’entrée ${request.entry_key} n’existe pas.`, "entry_key");
      }
      const relationRequest = {
        entry_key: entry.entry_key,
        gloss_fr: entry.gloss_fr,
        gloss_en: entry.gloss_en,
        reference_language: request.reference_language,
        forms: entry.forms,
      };
      const existingRelations = await repository.getAdminRelationsForFormIds(
        entry.forms.map((form) => form.id)
      );
      const generated = await generateRelationCandidates(relationRequest);
      const candidates = annotateExistingRelations(generated.candidates, existingRelations);
      return res.json({
        contract_version: CONTRACT_VERSION,
        entry,
        candidates,
        existing_relations: existingRelations,
        generation: {
          model: generated.model,
          response_id: generated.response_id,
          returned: candidates.length,
          reference_language: request.reference_language,
        },
      });
    } catch (error) {
      if (error instanceof AdminAiError) {
        return errorResponse(res, error.status, error.code, error.message, error.field);
      }
      return next(error);
    }
  });

  // Legacy exploratory endpoint retained for compatibility with the first UI.
  app.get("/cognates/:word", async (req, res, next) => {
    try {
      const rows = await repository.getLegacyRelations(req.params.word);
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      return errorResponse(res, 400, "INVALID_JSON", "Le corps JSON est invalide.");
    }

    if (error.type === "entity.too.large") {
      return errorResponse(
        res,
        413,
        "TEXT_TOO_LONG",
        `Le texte dépasse la limite de ${MAX_TEXT_LENGTH} unités UTF-16.`,
        "text"
      );
    }

    console.error(error);
    return errorResponse(res, 500, "INTERNAL_ERROR", "Erreur interne de l’API.");
  });

  return app;
}

if (require.main === module) {
  const pool = createPool();
  const repository = createRepository(pool);
  const app = createApp(repository);
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    console.log(`Dico-IC API listening on http://localhost:${port}`);
  });
}

module.exports = { createApp };
