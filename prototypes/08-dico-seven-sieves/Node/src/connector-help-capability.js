"use strict";

function isConnectorHelpCapableLanguage(language) {
  return Boolean(language)
    && (language.is_active === true || Number(language.is_active) === 1)
    && language.documentation_status === "DOCUMENTED";
}

function connectorHelpCapableLanguages(languages = []) {
  return languages.filter(isConnectorHelpCapableLanguage);
}

function connectorHelpLanguagePresentation(language) {
  const isRomance = language.is_romance === true || Number(language.is_romance) === 1;
  return {
    code: language.code,
    name: language.name,
    family: language.family,
    is_romance: isRomance,
    is_active: true,
    documentation_status: "DOCUMENTED",
    public_classification: isRomance
      ? "Langue romane documentée"
      : "Langue de comparaison — non romane",
  };
}

module.exports = {
  connectorHelpCapableLanguages,
  connectorHelpLanguagePresentation,
  isConnectorHelpCapableLanguage,
};
