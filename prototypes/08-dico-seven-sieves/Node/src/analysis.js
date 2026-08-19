const CONTRACT_VERSION = "0.1";
const MAX_TEXT_LENGTH = 20_000;
const DEFAULT_SIEVES = [1, 2, 3, 4, 5, 6, 7];

const SIEVE_CATALOG = {
  1: {
    code: "international_lexicon",
    label: "Lexique international",
    description: "Repère les formes transparentes ou quasi transparentes.",
    status: "available",
  },
  2: {
    code: "pan_romance_lexicon",
    label: "Lexique pan-roman",
    description: "Compare des formes proches dans plusieurs langues romanes.",
    status: "available",
  },
  3: {
    code: "phonetic_correspondences",
    label: "Correspondances phonétiques",
    description: "Repère des correspondances régulières entre formes.",
    status: "available",
  },
  4: {
    code: "graphy_pronunciation",
    label: "Graphies / prononciations",
    description: "Signale des graphies utiles pour orienter la prononciation.",
    status: "experimental",
  },
  5: {
    code: "pan_romance_syntax",
    label: "Syntaxe pan-romane",
    description: "Propose une lecture syntaxique très simplifiée de l’énoncé.",
    status: "experimental",
  },
  6: {
    code: "morphosyntax",
    label: "Morphosyntaxe",
    description: "Repère quelques signaux grammaticaux visibles.",
    status: "experimental",
  },
  7: {
    code: "affixes",
    label: "Préfixes / suffixes",
    description: "Repère des affixes donnant des indices morphologiques.",
    status: "available",
  },
};

function normalizeClient(value) {
  return value.normalize("NFC").toLocaleLowerCase("und");
}

function toLookupKey(value) {
  return normalizeClient(value)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

function tokenize(text) {
  const tokens = [];
  const pattern = /[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*|[^\s]/gu;

  for (const match of text.matchAll(pattern)) {
    const surface = match[0];
    const kind = /[\p{L}\p{M}\p{N}]/u.test(surface[0]) ? "word" : "punctuation";
    const normalized = kind === "word" ? normalizeClient(surface) : "";
    tokens.push({
      index: tokens.length,
      kind,
      surface,
      normalized,
      lookup_key: kind === "word" ? toLookupKey(surface) : "",
      start: match.index,
      end: match.index + surface.length,
      enrichments: [],
    });
  }

  return tokens;
}

function validationError(status, code, message, field) {
  return { ok: false, status, code, message, field };
}

function validateRequest(body, availableLanguages) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return validationError(400, "INVALID_REQUEST", "Le corps doit être un objet JSON.");
  }
  if (body.contract_version !== CONTRACT_VERSION) {
    return validationError(
      400,
      "INVALID_CONTRACT_VERSION",
      `contract_version doit valoir ${CONTRACT_VERSION}.`,
      "contract_version"
    );
  }
  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return validationError(400, "INVALID_TEXT", "Le texte doit être une chaîne non vide.", "text");
  }
  if (body.text.length > MAX_TEXT_LENGTH) {
    return validationError(
      413,
      "TEXT_TOO_LONG",
      `Le texte dépasse la limite de ${MAX_TEXT_LENGTH} unités UTF-16.`,
      "text"
    );
  }

  const languageCodes = new Set(availableLanguages.map((language) => language.code));
  for (const field of ["source_language", "mediation_language"]) {
    if (typeof body[field] !== "string" || !languageCodes.has(body[field])) {
      return validationError(
        400,
        "INVALID_LANGUAGE",
        `La langue demandée dans ${field} n’est pas disponible.`,
        field
      );
    }
  }

  const comparison = body.comparison_languages ?? [];
  if (!Array.isArray(comparison) || comparison.some((code) => typeof code !== "string")) {
    return validationError(
      400,
      "INVALID_COMPARISON_LANGUAGES",
      "comparison_languages doit être un tableau de codes langue.",
      "comparison_languages"
    );
  }
  if (new Set(comparison).size !== comparison.length) {
    return validationError(
      400,
      "DUPLICATE_COMPARISON_LANGUAGE",
      "comparison_languages ne doit pas contenir de doublons.",
      "comparison_languages"
    );
  }
  const invalidComparison = comparison.find((code) => !languageCodes.has(code));
  if (invalidComparison) {
    return validationError(
      400,
      "INVALID_LANGUAGE",
      `La langue de comparaison ${invalidComparison} n’est pas disponible.`,
      "comparison_languages"
    );
  }

  const requestedSieves = body.sieves ?? DEFAULT_SIEVES;
  if (!Array.isArray(requestedSieves)
      || requestedSieves.some((id) => !Number.isInteger(id) || id < 1 || id > 7)) {
    return validationError(
      400,
      "INVALID_SIEVES",
      "sieves doit être un tableau d’entiers compris entre 1 et 7.",
      "sieves"
    );
  }

  const warnings = [];
  const normalizedComparison = comparison.filter((code) => {
    if (code !== body.source_language) return true;
    warnings.push({
      code: "COMPARISON_LANGUAGE_IGNORED",
      severity: "info",
      scope: "analysis",
      message: `La langue source ${code} a été retirée des langues de comparaison.`,
    });
    return false;
  });

  const tokens = tokenize(body.text);
  return {
    ok: true,
    value: {
      contract_version: CONTRACT_VERSION,
      text: body.text,
      source_language: body.source_language,
      mediation_language: body.mediation_language,
      comparison_languages: normalizedComparison,
      sieves: [...new Set(requestedSieves)],
      tokens,
    },
    warnings,
  };
}

function groupedBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return groups;
}

function clampConfidence(value, fallback) {
  const numeric = Number(value ?? fallback);
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
}

function buildConnectorHelpEnrichments(request, connectorHelps = []) {
  if (connectorHelps.length === 0) return [];

  const wordTokens = request.tokens.filter((token) => token.kind === "word");
  const candidates = connectorHelps
    .map((help) => ({
      help,
      words: tokenize(help.normalized_expression)
        .filter((token) => token.kind === "word")
        .map((token) => token.normalized),
    }))
    .filter((candidate) => candidate.words.length > 0)
    .sort((left, right) => right.words.length - left.words.length
      || right.help.normalized_expression.length - left.help.normalized_expression.length
      || left.help.id - right.help.id);

  const occupied = new Set();
  const matches = [];

  for (let start = 0; start < wordTokens.length; start += 1) {
    for (const candidate of candidates) {
      const matchedTokens = wordTokens.slice(start, start + candidate.words.length);
      if (matchedTokens.length !== candidate.words.length) continue;
      if (matchedTokens.some((token) => occupied.has(token.index))) continue;

      const sameWords = matchedTokens.every(
        (token, index) => token.normalized === candidate.words[index]
      );
      if (!sameWords) continue;

      const whitespaceOnly = matchedTokens.slice(0, -1).every((token, index) =>
        /^\s+$/u.test(request.text.slice(token.end, matchedTokens[index + 1].start))
      );
      if (!whitespaceOnly) continue;

      const first = matchedTokens[0];
      const last = matchedTokens.at(-1);
      matchedTokens.forEach((token) => occupied.add(token.index));
      matches.push({
        start: first.start,
        end: last.end,
        tokenIndexes: matchedTokens.map((token) => token.index),
        help: candidate.help,
      });
      break;
    }
  }

  return matches
    .sort((left, right) => left.start - right.start)
    .map((match, index) => ({
      id: `p-${String(index + 1).padStart(4, "0")}`,
      type: "connector_help",
      label: match.help.pedagogical_title,
      language: request.source_language,
      function: match.help.discourse_function,
      expression: request.text.slice(match.start, match.end),
      token_indexes: match.tokenIndexes,
      start: match.start,
      end: match.end,
      pedagogical_hint: match.help.pedagogical_hint,
      example: match.help.example,
      caution: match.help.caution,
      source: {
        kind: "connector_help",
        id: match.help.id,
        label: "Dico-IC",
      },
    }));
}

function analyze(request, resources, initialWarnings = []) {
  const enabled = new Set(request.sieves);
  const sourceFormsByLookup = new Map();
  for (const form of resources.sourceForms) {
    const lookupKey = form.matched_lookup_key || form.normalized_lemma;
    if (!sourceFormsByLookup.has(lookupKey)) sourceFormsByLookup.set(lookupKey, []);
    sourceFormsByLookup.get(lookupKey).push(form);
  }
  const relatedByEntry = groupedBy(resources.relatedForms, "entry_id");
  const relationsByForm = new Map();

  for (const relation of resources.relations) {
    for (const formId of [relation.source_form_id, relation.target_form_id]) {
      if (!relationsByForm.has(formId)) relationsByForm.set(formId, []);
      relationsByForm.get(formId).push(relation);
    }
  }

  let enrichmentNumber = 0;
  const addEnrichment = (token, enrichment) => {
    enrichmentNumber += 1;
    token.enrichments.push({
      id: `e-${String(enrichmentNumber).padStart(4, "0")}`,
      ...enrichment,
    });
  };

  for (const token of request.tokens) {
    if (token.kind !== "word") continue;
    const sourceForms = sourceFormsByLookup.get(token.lookup_key) || [];

    if (enabled.has(1)) {
      const candidates = [];
      for (const form of sourceForms) {
        for (const relation of relationsByForm.get(form.id) || []) {
          const formIsSource = relation.source_form_id === form.id;
          if (!formIsSource && !relation.is_symmetric) continue;
          const other = formIsSource
            ? { lemma: relation.target_lemma, language: relation.target_language_code }
            : { lemma: relation.source_lemma, language: relation.source_language_code };
          if (other.language === request.mediation_language
              && String(relation.relation_type).startsWith("COGNATE")) {
            candidates.push({ form, relation, other });
          }
        }
      }
      const match = candidates.sort((a, b) => Number(b.relation.score) - Number(a.relation.score))[0];
      if (match) {
        const confidence = clampConfidence(
          match.relation.score ?? match.relation.confidence_score,
          0.75
        );
        addEnrichment(token, {
          sieve_id: 1,
          type: "lexical_transparency",
          label: "Mot transparent ou quasi transparent",
          explanation: `La forme ${request.source_language} est proche d’une forme reconnaissable en ${request.mediation_language}.`,
          caution: "Cette ressemblance est un indice et non une traduction automatique.",
          confidence,
          level: confidence >= 0.8 ? "strong" : "informational",
          source: {
            kind: "form_relation",
            label: match.relation.source_label || "Dico-IC V0",
          },
          payload: {
            source_form: match.form.lemma,
            mediation_form: match.other.lemma,
            mediation_language: match.other.language,
            relation_type: match.relation.relation_type,
          },
        });
      }
    }

    if (enabled.has(2)) {
      const match = sourceForms.map((form) => {
        const forms = relatedByEntry.get(form.entry_id) || [];
        const byLanguage = new Map(forms.map((related) => [related.language_code, related]));
        return { form, forms: [...byLanguage.values()] };
      }).find((candidate) => candidate.forms.length >= 3);

      if (match) {
        addEnrichment(token, {
          sieve_id: 2,
          type: "pan_romance_family",
          label: "Parenté lexicale romane",
          explanation: "Des formes apparentées sont attestées dans plusieurs langues demandées.",
          caution: "Les formes comparées sont des aides à l’inférence, pas une traduction automatique.",
          confidence: 0.84,
          level: "strong",
          source: { kind: "lexical_form", label: "Dico-IC V0" },
          payload: {
            family_label: match.form.gloss_fr || match.form.entry_key,
            forms: match.forms.map((form) => ({
              language: form.language_code,
              form: form.lemma,
            })),
          },
        });
      }
    }

    for (const rule of resources.rules) {
      if (rule.pattern_type !== "SUFFIX_TRANSFORM") continue;
      const sourcePattern = normalizeClient(rule.source_pattern);
      if (!token.normalized.endsWith(sourcePattern)) continue;

      const transformed = token.normalized.slice(0, -sourcePattern.length) + rule.target_pattern;
      const confirmedForm = sourceForms
        .flatMap((form) => relatedByEntry.get(form.entry_id) || [])
        .find((form) => form.language_code === rule.target_language_code
          && normalizeClient(form.lemma) === normalizeClient(transformed));
      const confidence = clampConfidence(rule.reliability_score, 0.7);

      if (enabled.has(3)) {
        addEnrichment(token, {
          sieve_id: 3,
          type: "form_correspondence",
          label: `Correspondance -${rule.source_pattern} → -${rule.target_pattern}`,
          explanation: rule.description || "La finale fournit une piste entre les deux langues.",
          caution: confirmedForm
            ? `La forme proposée est confirmée ici par le lexique : ${confirmedForm.lemma}.`
            : "La transformation n’est pas confirmée par une forme lexicale liée.",
          confidence: confirmedForm ? confidence : clampConfidence(confidence * 0.7, 0.5),
          level: confirmedForm && confidence >= 0.8 ? "strong" : "informational",
          source: { kind: "pattern_rule", label: "Dico-IC V0" },
          payload: {
            original: token.surface,
            transformed,
            source_pattern: rule.source_pattern,
            target_pattern: rule.target_pattern,
            source_language: rule.source_language_code,
            target_language: rule.target_language_code,
          },
        });
      }

      if (enabled.has(7)) {
        addEnrichment(token, {
          sieve_id: 7,
          type: "affix_signal",
          label: `Suffixe -${rule.source_pattern} repéré`,
          explanation: "La finale peut aider à reconnaître une famille de mots.",
          caution: "Un suffixe isolé ne détermine pas le sens complet.",
          confidence: clampConfidence(confidence * 0.97, 0.7),
          level: "informational",
          source: { kind: "pattern_rule", label: "Dico-IC V0" },
          payload: {
            affix_type: "suffix",
            affix: rule.source_pattern,
            language: request.source_language,
          },
        });
      }
    }

    if (enabled.has(4) && request.source_language === "es"
        && /c[ei]/.test(token.lookup_key) && !token.lookup_key.endsWith("cion")) {
      addEnrichment(token, {
        sieve_id: 4,
        type: "grapho_phonetic_signal",
        label: "c devant e ou i",
        explanation: "Le c devant e ou i attire l’attention sur une variation de prononciation en espagnol.",
        caution: "La réalisation varie selon les régions ; le signal reste ici graphique.",
        confidence: 0.7,
        level: "informational",
        source: { kind: "heuristic", label: "Heuristique grapho-phonique V0" },
        payload: {
          pattern: token.lookup_key.match(/c[ei]/)[0],
          scope: "contains",
          comparison_hint: "variation graphique et phonétique",
        },
      });
    }

    const validatedPlural = sourceForms.find((form) => form.match_kind === "inflected_form"
      && form.inflected_status === "VALIDATED"
      && form.inflected_grammatical_number === "PLURAL"
      && String(form.part_of_speech).toLowerCase() === "noun");
    if (enabled.has(6) && validatedPlural) {
      addEnrichment(token, {
        sieve_id: 6,
        type: "morphosyntactic_signal",
        label: "Pluriel validé",
        explanation: `Cette forme est le pluriel validé de « ${validatedPlural.lemma} » dans Dico-IC.`,
        caution: "Cette information provient d’un mapping validé dans Dico-IC.",
        confidence: clampConfidence(validatedPlural.inflected_confidence_score, 1),
        level: "strong",
        source: {
          kind: "inflected_form",
          id: validatedPlural.inflected_form_id,
          label: "Dico-IC",
        },
        payload: {
          category: "validated_plural",
          grammatical_number: "PLURAL",
          lemma: validatedPlural.lemma,
          surface_form: token.surface,
        },
      });
    }

    const verbForm = sourceForms.find((form) => String(form.part_of_speech).toLowerCase() === "verb");
    if (enabled.has(5) && verbForm) {
      addEnrichment(token, {
        sieve_id: 5,
        type: "syntax_role",
        label: "Verbe probable",
        explanation: "La base lexicale identifie cette forme comme verbale.",
        caution: "Le rôle exact dans la phrase n’est pas analysé en V0.",
        confidence: clampConfidence(Number(verbForm.confidence_score || 0.8) * 0.7, 0.65),
        level: "informational",
        source: { kind: "heuristic", label: "Heuristique syntaxique V0" },
        payload: { role: "verb", pattern: "lexical_pos" },
      });
    }

    const infinitiveMatch = token.lookup_key.match(/(ar|er|ir)$/);
    if (enabled.has(6) && request.source_language === "es" && verbForm && infinitiveMatch) {
      addEnrichment(token, {
        sieve_id: 6,
        type: "morphosyntactic_signal",
        label: "Infinitif probable",
        explanation: `La finale -${infinitiveMatch[1]} peut signaler un infinitif espagnol.`,
        caution: "Le rôle exact doit être vérifié dans la phrase.",
        confidence: 0.78,
        level: "informational",
        source: { kind: "heuristic", label: "Heuristique morphosyntaxique V0" },
        payload: {
          category: "probable_infinitive",
          marker: `-${infinitiveMatch[1]}`,
          part_of_speech: "VERB",
        },
      });
    }
  }

  const warnings = [...initialWarnings];
  for (const sieveId of [4, 5, 6]) {
    if (enabled.has(sieveId)) {
      warnings.push({
        code: "SIEVE_EXPERIMENTAL",
        severity: "info",
        scope: "sieve",
        message: `Le tamis ${sieveId} utilise une heuristique exploratoire V0.`,
        sieve_id: sieveId,
      });
    }
  }

  const resultCounts = new Map();
  for (const token of request.tokens) {
    for (const enrichment of token.enrichments) {
      resultCounts.set(enrichment.sieve_id, (resultCounts.get(enrichment.sieve_id) || 0) + 1);
    }
  }

  return {
    contract_version: CONTRACT_VERSION,
    status: "complete",
    text: request.text,
    languages: {
      source: request.source_language,
      mediation: request.mediation_language,
      comparison: request.comparison_languages,
    },
    sieves: request.sieves.map((id) => ({
      id,
      ...SIEVE_CATALOG[id],
      result_count: resultCounts.get(id) || 0,
    })),
    tokens: request.tokens.map(({ lookup_key, ...token }) => token),
    pedagogical_enrichments: buildConnectorHelpEnrichments(
      request,
      resources.connectorHelps || []
    ),
    warnings,
  };
}

module.exports = {
  CONTRACT_VERSION,
  MAX_TEXT_LENGTH,
  analyze,
  buildConnectorHelpEnrichments,
  normalizeClient,
  toLookupKey,
  tokenize,
  validateRequest,
};
