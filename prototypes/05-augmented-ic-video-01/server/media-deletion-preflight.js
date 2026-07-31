"use strict";

const TREATMENT_RELATIONS = Object.freeze([
  ["sourceAssetId", "source-asset", "asset d’entrée"],
  ["sourcePlayableId", "source-playable", "playable d’entrée"],
  ["outputAssetId", "output-asset", "asset de sortie"],
  ["outputPlayableId", "output-playable", "playable de sortie"],
  ["publishedPlayableId", "published-playable", "playable publié"]
]);

function canonicalTreatmentRelations(treatment, { assetId, playableIds }) {
  const playableSet = playableIds instanceof Set ? playableIds : new Set(playableIds || []);
  return TREATMENT_RELATIONS
    .filter(([field]) => {
      const value = treatment?.[field];
      return field.endsWith("AssetId") ? value === assetId : playableSet.has(value);
    })
    .map(([field, relation, label]) => ({ field, relation, label }));
}

function canonicalTreatmentDependencies(treatments, context) {
  return (treatments || [])
    .map(treatment => ({
      treatment,
      relations: canonicalTreatmentRelations(treatment, context)
    }))
    .filter(entry => entry.relations.length > 0)
    .sort((left, right) => String(left.treatment.id).localeCompare(String(right.treatment.id)))
    .map(({ treatment, relations }) => ({
      id: treatment.id,
      title: treatment.label || treatment.id,
      status: treatment.status || null,
      relations: relations.map(item => item.relation),
      relationLabels: relations.map(item => item.label)
    }));
}

module.exports = {
  TREATMENT_RELATIONS,
  canonicalTreatmentDependencies,
  canonicalTreatmentRelations
};
