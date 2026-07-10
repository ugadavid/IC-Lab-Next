const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateAdminFormRelation,
  validateAdminInflectedForm,
  validateAdminLexicalEntry,
  validateAdminLexicalEntryUpdate,
} = require("../src/admin");

const languages = ["fr", "es", "it", "pt", "en"].map((code) => ({ code }));

test("admin lexical entry validation normalizes multilingual forms", () => {
  const result = validateAdminLexicalEntry({
    entry_key: "SCHOOL_PLACE",
    gloss_fr: "école",
    semantic_domain: "école",
    forms: [
      { language: "fr", lemma: "École", part_of_speech: "noun" },
      { language: "pt", lemma: "escola", part_of_speech: "noun" },
    ],
  }, languages);

  assert.equal(result.ok, true);
  assert.equal(result.value.forms[0].normalized_lemma, "ecole");
  assert.equal(result.value.forms[1].normalized_lemma, "escola");
});

test("admin lexical entry validation rejects duplicate normalized forms", () => {
  const result = validateAdminLexicalEntry({
    entry_key: "DUPLICATE_TEST",
    gloss_fr: "test",
    forms: [
      { language: "fr", lemma: "école", part_of_speech: "noun" },
      { language: "fr", lemma: "ecole", part_of_speech: "noun" },
    ],
  }, languages);

  assert.equal(result.ok, false);
  assert.equal(result.code, "DUPLICATE_FORM");
});

test("admin lexical entry update keeps form ids and recalculates normalization", () => {
  const result = validateAdminLexicalEntryUpdate({
    gloss_fr: "école",
    gloss_en: "school",
    semantic_domain: "éducation",
    forms: [{ id: 42, language: "fr", lemma: "École", part_of_speech: "noun" }],
  }, "SCHOOL_PLACE", languages);

  assert.equal(result.ok, true);
  assert.equal(result.value.entry_key, "SCHOOL_PLACE");
  assert.equal(result.value.forms[0].id, 42);
  assert.equal(result.value.forms[0].normalized_lemma, "ecole");
});

test("admin lexical entry update accepts and normalizes a new form without id", () => {
  const result = validateAdminLexicalEntryUpdate({
    gloss_fr: "utile",
    forms: [
      { id: 539, language: "es", lemma: "útiles", part_of_speech: "adjective" },
      { language: "en", lemma: "Useful", part_of_speech: "adjective" },
    ],
  }, "UTIL_ADJECTIVE_USEFUL", languages);

  assert.equal(result.ok, true);
  assert.equal(result.value.forms[0].id, 539);
  assert.equal(Object.hasOwn(result.value.forms[1], "id"), false);
  assert.equal(result.value.forms[1].normalized_lemma, "useful");
});

test("admin lexical entry update rejects an invalid language on a new form", () => {
  const result = validateAdminLexicalEntryUpdate({
    gloss_fr: "utile",
    forms: [
      { id: 539, language: "es", lemma: "útiles", part_of_speech: "adjective" },
      { language: "xx", lemma: "useful", part_of_speech: "adjective" },
    ],
  }, "UTIL_ADJECTIVE_USEFUL", languages);

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_LANGUAGE");
});

test("admin lexical entry update rejects an empty new form", () => {
  const result = validateAdminLexicalEntryUpdate({
    gloss_fr: "utile",
    forms: [
      { id: 539, language: "es", lemma: "útiles", part_of_speech: "adjective" },
      { language: "en", lemma: "", part_of_speech: "adjective" },
    ],
  }, "UTIL_ADJECTIVE_USEFUL", languages);

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_LEMMA");
});

test("admin lexical entry update rejects a new form without part of speech", () => {
  const result = validateAdminLexicalEntryUpdate({
    gloss_fr: "utile",
    forms: [
      { id: 539, language: "es", lemma: "útiles", part_of_speech: "adjective" },
      { language: "en", lemma: "useful", part_of_speech: "" },
    ],
  }, "UTIL_ADJECTIVE_USEFUL", languages);

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_PART_OF_SPEECH");
});

test("admin lexical entry update rejects an internal duplicate with a new form", () => {
  const result = validateAdminLexicalEntryUpdate({
    gloss_fr: "utile",
    forms: [
      { id: 539, language: "en", lemma: "Useful", part_of_speech: "adjective" },
      { language: "en", lemma: "useful", part_of_speech: "adjective" },
    ],
  }, "UTIL_ADJECTIVE_USEFUL", languages);

  assert.equal(result.ok, false);
  assert.equal(result.code, "DUPLICATE_FORM");
});

test("admin lexical entry update refuses an entry key change", () => {
  const result = validateAdminLexicalEntryUpdate({
    entry_key: "OTHER_KEY",
    gloss_fr: "école",
    forms: [{ id: 42, language: "fr", lemma: "école", part_of_speech: "noun" }],
  }, "SCHOOL_PLACE", languages);

  assert.equal(result.ok, false);
  assert.equal(result.code, "ENTRY_KEY_IMMUTABLE");
});

test("admin form relation validation accepts a symmetric cognate", () => {
  const result = validateAdminFormRelation({
    source_form_id: 121,
    target_form_id: 120,
    relation_type: "COGNATE_STRONG",
    score: 0.95,
    source_label: "manual_admin_v0",
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.is_symmetric, true);
  assert.equal(result.value.confidence_score, 0.95);
});

test("admin inflected form validation normalizes a plural surface", () => {
  const result = validateAdminInflectedForm({
    lexical_form_id: 123,
    surface_form: "  Élèves  ",
    grammatical_number: "PLURAL",
    status: "VALIDATED",
    source_label: "manual_admin_v0",
    confidence_score: 1,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.surface_form, "Élèves");
  assert.equal(result.value.normalized_surface, "eleves");
});

test("admin inflected form validation rejects an invalid status", () => {
  const result = validateAdminInflectedForm({
    lexical_form_id: 123,
    surface_form: "élèves",
    grammatical_number: "PLURAL",
    status: "PUBLISHED",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_INFLECTED_FORM_STATUS");
});
