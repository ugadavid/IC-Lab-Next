"use strict";

(function exposeVideoMetadataContract(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.Proto05VideoMetadata = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createVideoMetadataContract() {
  const USAGES = Object.freeze([
    Object.freeze({ value: "", label: "Non renseigné" }),
    Object.freeze({ value: "working-video", label: "Vidéo de travail" }),
    Object.freeze({ value: "test-video", label: "Vidéo de test" }),
    Object.freeze({ value: "pedagogical-resource", label: "Ressource pédagogique" }),
    Object.freeze({ value: "reference", label: "Référence" }),
    Object.freeze({ value: "archive", label: "Archive" })
  ]);
  const CONFIDENTIALITIES = Object.freeze([
    Object.freeze({ value: "", label: "Non renseigné" }),
    Object.freeze({ value: "internal", label: "Interne" }),
    Object.freeze({ value: "private", label: "Privé" }),
    Object.freeze({ value: "publishable", label: "Publiable" }),
    Object.freeze({ value: "other", label: "Autre" })
  ]);
  const LIMITS = Object.freeze({
    title: 500,
    description: 10000,
    context: 2000,
    responsibleParty: 500,
    notes: 20000,
    source: 4000,
    originUrl: 4000,
    license: 4000,
    consent: 4000,
    restrictions: 4000
  });

  function optionalText(value, limit) {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return undefined;
    const text = value.trim();
    return text ? text.slice(0, limit) : null;
  }

  function validCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }

  function selectValue(value, options) {
    const normalized = value === null || value === undefined ? "" : String(value);
    return options.some(option => option.value === normalized) ? normalized || null : undefined;
  }

  function uniqueStrings(value) {
    if (!Array.isArray(value)) return undefined;
    if (value.some(item => typeof item !== "string" || !item.trim())) return undefined;
    return [...new Set(value.map(item => item.trim()))];
  }

  function validateProfile(payload, { knownLanguageIds = [] } = {}) {
    const input = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
    const fieldErrors = {};
    const title = typeof input.title === "string" ? input.title.trim().slice(0, LIMITS.title) : "";
    if (!title) fieldErrors.title = "Le titre principal est obligatoire.";

    const description = optionalText(input.description, LIMITS.description);
    if (description === undefined) fieldErrors.description = "La description doit être un texte.";

    const usage = selectValue(input.usage, USAGES);
    if (usage === undefined) fieldErrors.usage = "Le statut ou usage est invalide.";

    const context = optionalText(input.context, LIMITS.context);
    if (context === undefined) fieldErrors.context = "Le contexte doit être un texte.";
    const responsibleParty = optionalText(input.responsibleParty, LIMITS.responsibleParty);
    if (responsibleParty === undefined) fieldErrors.responsibleParty = "Le responsable doit être un texte.";
    const notes = optionalText(input.notes, LIMITS.notes);
    if (notes === undefined) fieldErrors.notes = "Les notes doivent être un texte.";

    const captureDateText = optionalText(input.captureDate, 10);
    const captureDate = captureDateText === undefined ? undefined : captureDateText;
    if (captureDate === undefined || captureDate !== null && !validCalendarDate(captureDate)) {
      fieldErrors.captureDate = "La date de captation doit être une date valide.";
    }

    const languageIds = uniqueStrings(input.languageIds);
    if (languageIds === undefined) {
      fieldErrors.languageIds = "La liste des langues est invalide.";
    } else if (knownLanguageIds.length) {
      const known = new Set(knownLanguageIds);
      if (languageIds.some(id => !known.has(id))) {
        fieldErrors.languageIds = "Une langue sélectionnée n’appartient pas au référentiel.";
      }
    }

    const source = optionalText(input.source, LIMITS.source);
    if (source === undefined) fieldErrors.source = "La provenance doit être un texte.";
    const originUrl = optionalText(input.originUrl, LIMITS.originUrl);
    if (originUrl === undefined) {
      fieldErrors.originUrl = "L’URL d’origine doit être un texte.";
    } else if (originUrl !== null) {
      try {
        const parsed = new URL(originUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
      } catch {
        fieldErrors.originUrl = "L’URL d’origine doit utiliser HTTP ou HTTPS.";
      }
    }

    const license = optionalText(input.license, LIMITS.license);
    if (license === undefined) fieldErrors.license = "Les conditions d’utilisation doivent être un texte.";
    const consent = optionalText(input.consent, LIMITS.consent);
    if (consent === undefined) fieldErrors.consent = "Le consentement doit être un texte.";
    const restrictions = optionalText(input.restrictions, LIMITS.restrictions);
    if (restrictions === undefined) fieldErrors.restrictions = "Les restrictions doivent être un texte.";
    const confidentiality = selectValue(input.confidentiality, CONFIDENTIALITIES);
    if (confidentiality === undefined) fieldErrors.confidentiality = "Le niveau de confidentialité est invalide.";

    const folderId = input.folderId === null || input.folderId === undefined || input.folderId === ""
      ? null
      : typeof input.folderId === "string" && input.folderId.trim()
        ? input.folderId.trim()
        : undefined;
    if (folderId === undefined) fieldErrors.folderId = "Le dossier sélectionné est invalide.";
    const tagIds = uniqueStrings(input.tagIds);
    if (tagIds === undefined) fieldErrors.tagIds = "La liste des étiquettes est invalide.";

    return {
      valid: Object.keys(fieldErrors).length === 0,
      fieldErrors,
      value: {
        title,
        description: description ?? null,
        editorialMetadata: {
          usage: usage ?? null,
          context: context ?? null,
          responsibleParty: responsibleParty ?? null,
          captureDate: captureDate ?? null,
          languageIds: languageIds || [],
          notes: notes ?? null
        },
        declaredProvenance: {
          source: source ?? null,
          originUrl: originUrl ?? null
        },
        declaredRights: {
          license: license ?? null,
          consent: consent ?? null,
          restrictions: restrictions ?? null,
          confidentiality: confidentiality ?? null
        },
        folderId: folderId ?? null,
        tagIds: tagIds || []
      }
    };
  }

  function editableProfile(asset) {
    const editorial = asset?.editorialMetadata || {};
    const declaredProvenance = asset?.provenance?.declared || {};
    const rights = asset?.rights || {};
    return {
      title: asset?.title || "",
      description: asset?.description || "",
      usage: editorial.usage || "",
      context: editorial.context || "",
      responsibleParty: editorial.responsibleParty || "",
      captureDate: editorial.captureDate || "",
      languageIds: Array.isArray(editorial.languageIds) ? [...editorial.languageIds] : [],
      notes: editorial.notes || "",
      source: declaredProvenance.source || "",
      originUrl: declaredProvenance.originUrl || "",
      license: rights.license || "",
      consent: rights.consent || "",
      restrictions: rights.restrictions || "",
      confidentiality: rights.confidentiality || "",
      folderId: asset?.folderId || null,
      tagIds: Array.isArray(asset?.tagIds) ? [...asset.tagIds] : []
    };
  }

  function optionLabel(options, value) {
    return options.find(option => option.value === (value || ""))?.label || "Non renseigné";
  }

  return Object.freeze({
    CONFIDENTIALITIES,
    LIMITS,
    USAGES,
    editableProfile,
    optionLabel,
    validateProfile
  });
});
