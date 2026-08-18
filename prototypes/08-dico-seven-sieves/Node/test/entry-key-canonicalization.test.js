const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../server");
const { createRepository } = require("../src/repository");
const {
  EntryKeyCanonicalizationError,
  canonicalizeEntryKey,
  findDuplicateCanonicalEntryKeys,
} = require("../../admin/js/entry-key-canonicalization-0.1.js");
const {
  parseAndValidateCandidateJson,
} = require("../src/admin-ai-domain");
const {
  validateAdminLexicalEntry,
  validateAdminLexicalEntryUpdate,
} = require("../src/admin");

const vectors = [
  ["ACCÉLÉRÉ", "ACCELERE"],
  ["S’ÉLEVER", "S_ELEVER"],
  ["s'élever", "S_ELEVER"],
  ["CO-OPÉRER", "CO_OPERER"],
  ["CŒUR", "COEUR"],
  ["ÆTHER", "AETHER"],
  ["QUALITÉ", "QUALITE"],
  ["déjà  vu", "DEJA_VU"],
  ["DEJA___VU", "DEJA_VU"],
  ["__LANGUAGE_SYSTEM__", "LANGUAGE_SYSTEM"],
  ["LANGUAGE_SYSTEM", "LANGUAGE_SYSTEM"],
];

test("canonicalise tous les exemples publics et les séparateurs techniques", () => {
  for (const [input, expected] of vectors) {
    assert.equal(canonicalizeEntryKey(input), expected, input);
  }
});

test("refuse une clé devenue vide", () => {
  assert.throws(
    () => canonicalizeEntryKey(" — ' ’ "),
    error => error instanceof EntryKeyCanonicalizationError && error.code === "EMPTY_ENTRY_KEY"
  );
});

test("détecte les doublons de base et de lot après canonicalisation", () => {
  const duplicates = findDuplicateCanonicalEntryKeys(
    ["ACCÉLÉRÉ", "S’ÉLEVER", "S_ELEVER", "CŒUR"],
    ["ACCELERE"]
  );

  assert.deepEqual([...duplicates].sort(), ["ACCELERE", "S_ELEVER"]);
});

test("canonicalise les clés OpenAI sans toucher aux lemmes ni aux gloses", () => {
  const parsed = parseAndValidateCandidateJson({
    candidates: [{
      entry_key: "CŒUR",
      gloss_fr: "cœur accéléré",
      gloss_en: "heart",
      semantic_domain: "qualité vécue",
      forms: [{ language_code: "fr", lemma: "cœur", part_of_speech: "noun" }],
    }],
  }, {
    count: 1,
    languages: ["fr"],
    parts_of_speech: ["noun"],
  });

  assert.equal(parsed.candidates[0].entry_key, "COEUR");
  assert.equal(parsed.candidates[0].gloss_fr, "cœur accéléré");
  assert.equal(parsed.candidates[0].semantic_domain, "qualité vécue");
  assert.equal(parsed.candidates[0].forms[0].lemma, "cœur");
});

test("le validateur serveur canonicalise une création forgée et préserve ses textes", () => {
  const result = validateAdminLexicalEntry({
    entry_key: "ACCÉLÉRÉ",
    gloss_fr: "caractère accéléré",
    gloss_en: "accelerated quality",
    semantic_domain: "qualité",
    forms: [{ language: "fr", lemma: "accéléré", part_of_speech: "adjective" }],
  }, [{ code: "fr" }]);

  assert.equal(result.ok, true);
  assert.equal(result.value.entry_key, "ACCELERE");
  assert.equal(result.value.gloss_fr, "caractère accéléré");
  assert.equal(result.value.semantic_domain, "qualité");
  assert.equal(result.value.forms[0].lemma, "accéléré");
});

test("une mise à jour accepte la variante équivalente sans renommer la clé", () => {
  const result = validateAdminLexicalEntryUpdate({
    entry_key: "S’ÉLEVER",
    gloss_fr: "s’élever",
    gloss_en: "rise",
    semantic_domain: "mouvement",
    forms: [{ id: 7, language: "fr", lemma: "s’élever", part_of_speech: "verb" }],
  }, "S_ELEVER", [{ code: "fr" }]);

  assert.equal(result.ok, true);
  assert.equal(result.value.entry_key, "S_ELEVER");
  assert.equal(result.value.forms[0].lemma, "s’élever");
});

test("une requête de création accentuée rencontre immédiatement le doublon canonique", async () => {
  let receivedEntry = null;
  const repository = {
    getDocumentableLanguages: async () => [{ code: "fr" }],
    createAdminLexicalEntry: async entry => {
      receivedEntry = entry;
      const error = new Error(`L’entrée ${entry.entry_key} existe déjà.`);
      error.code = "DUPLICATE_ENTRY";
      throw error;
    },
  };
  const server = createApp(repository).listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/admin/lexical-entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry_key: "ACCÉLÉRÉ",
      gloss_fr: "accéléré",
      semantic_domain: "qualité",
      forms: [{ language: "fr", lemma: "accéléré", part_of_speech: "adjective" }],
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.error.code, "DUPLICATE_ENTRY");
  assert.equal(receivedEntry.entry_key, "ACCELERE");
  assert.equal(receivedEntry.forms[0].lemma, "accéléré");
  await new Promise(resolve => server.close(resolve));
});

test("la recherche de doublons du dépôt utilise elle aussi les clés canoniques", async () => {
  let parameters = null;
  const repository = createRepository({
    execute: async (_sql, values) => {
      parameters = values;
      return [[{ entry_key: "ACCELERE" }]];
    },
  });

  const result = await repository.findExistingEntryKeys(["ACCÉLÉRÉ", "ACCELERE"]);

  assert.deepEqual(parameters, ["ACCELERE"]);
  assert.deepEqual(result, ["ACCELERE"]);
});

test("l’interface canonicalise au blur et impérativement avant création", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const script = fs.readFileSync(
    path.resolve(__dirname, "../../admin/js/admin-ai-text-0.1.js"),
    "utf8"
  );

  assert.match(script, /addEventListener\("focusout"/);
  assert.match(script, /canonicalizeCandidateForReview/);
  assert.match(script, /refreshCanonicalEntryKeyExistence/);
  assert.match(script, /async function createSelectedCandidates\(\) \{\s+canonicalizeAllCandidateKeys\(\)/);
  assert.match(script, /status\.code === "duplicate"/);
});
