-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : mariadb
-- Généré le : ven. 15 mai 2026 à 08:22
-- Version du serveur : 11.8.6-MariaDB-ubu2404
-- Version de PHP : 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `ic_dico`
--
CREATE DATABASE IF NOT EXISTS `ic_dico` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
USE `ic_dico`;


-- --------------------------------------------------------

--
-- Structure de la table `form_relation`
--

CREATE TABLE `form_relation` (
  `id` bigint(20) NOT NULL,
  `source_form_id` bigint(20) NOT NULL,
  `target_form_id` bigint(20) NOT NULL,
  `relation_type` varchar(30) NOT NULL,
  `score` decimal(4,3) DEFAULT NULL,
  `is_symmetric` tinyint(1) NOT NULL DEFAULT 1,
  `source_label` varchar(100) DEFAULT NULL,
  `confidence_score` decimal(4,3) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ;

--
-- Déchargement des données de la table `form_relation`
--

INSERT INTO `form_relation` (`id`, `source_form_id`, `target_form_id`, `relation_type`, `score`, `is_symmetric`, `source_label`, `confidence_score`, `notes`) VALUES
(1, 1, 2, 'COGNATE_STRONG', 0.930, 1, 'manual_seed', 0.950, NULL),
(2, 1, 3, 'COGNATE_STRONG', 0.950, 1, 'manual_seed', 0.950, NULL),
(3, 1, 4, 'COGNATE_STRONG', 0.940, 1, 'manual_seed', 0.950, NULL),
(4, 1, 5, 'COGNATE_STRONG', 0.880, 1, 'manual_seed', 0.900, NULL),
(5, 6, 7, 'COGNATE_STRONG', 0.980, 1, 'manual_seed', 0.980, NULL),
(6, 6, 8, 'COGNATE_STRONG', 0.960, 1, 'manual_seed', 0.980, NULL),
(7, 6, 9, 'COGNATE_STRONG', 0.950, 1, 'manual_seed', 0.980, NULL),
(8, 6, 10, 'COGNATE_STRONG', 0.990, 1, 'manual_seed', 0.980, NULL),
(9, 11, 12, 'COGNATE_STRONG', 0.990, 1, 'manual_seed', 0.990, NULL),
(10, 11, 13, 'COGNATE_STRONG', 0.990, 1, 'manual_seed', 0.990, NULL),
(11, 11, 14, 'COGNATE_STRONG', 0.990, 1, 'manual_seed', 0.990, NULL),
(12, 11, 15, 'COGNATE_STRONG', 0.990, 1, 'manual_seed', 0.990, NULL),
(13, 16, 17, 'COGNATE_STRONG', 0.960, 1, 'manual_seed', 0.970, NULL),
(14, 16, 18, 'COGNATE_STRONG', 0.960, 1, 'manual_seed', 0.970, NULL),
(15, 16, 19, 'COGNATE_STRONG', 0.950, 1, 'manual_seed', 0.970, NULL),
(16, 16, 20, 'COGNATE_STRONG', 0.990, 1, 'manual_seed', 0.970, NULL),
(17, 21, 22, 'COGNATE_WEAK', 0.780, 1, 'manual_seed', 0.950, NULL),
(18, 21, 23, 'COGNATE_STRONG', 0.930, 1, 'manual_seed', 0.950, NULL),
(19, 21, 24, 'COGNATE_WEAK', 0.820, 1, 'manual_seed', 0.950, NULL),
(20, 21, 25, 'COGNATE_WEAK', 0.700, 1, 'manual_seed', 0.900, NULL),
(21, 26, 27, 'COGNATE_WEAK', 0.740, 1, 'manual_seed', 0.920, NULL),
(22, 26, 28, 'COGNATE_WEAK', 0.680, 1, 'manual_seed', 0.920, NULL),
(23, 26, 29, 'COGNATE_WEAK', 0.720, 1, 'manual_seed', 0.920, NULL),
(24, 26, 30, 'COGNATE_WEAK', 0.660, 1, 'manual_seed', 0.900, NULL),
(25, 31, 33, 'FALSE_FRIEND', 0.150, 1, 'manual_seed', 0.980, NULL),
(26, 34, 35, 'FALSE_FRIEND', 0.100, 1, 'manual_seed', 0.990, NULL),
(27, 34, 40, 'FALSE_FRIEND', 0.050, 1, 'manual_seed', 0.990, NULL),
(28, 41, 42, 'FALSE_FRIEND', 0.080, 1, 'manual_seed', 0.980, NULL),
(29, 43, 46, 'FALSE_FRIEND', 0.050, 1, 'manual_seed', 0.980, NULL),
(30, 47, 37, 'FALSE_FRIEND', 0.050, 1, 'manual_seed', 0.950, NULL),
(31, 49, 53, 'FALSE_FRIEND', 0.100, 1, 'manual_seed', 0.960, NULL),
(32, 54, 52, 'FALSE_FRIEND', 0.100, 1, 'manual_seed', 0.960, NULL),
(33, 34, 35, 'PARTIAL_EQUIVALENCE', 0.550, 1, 'manual_seed', 0.850, NULL),
(34, 36, 40, 'PARTIAL_EQUIVALENCE', 0.200, 1, 'manual_seed', 0.750, NULL),
(35, 41, 44, 'PARTIAL_EQUIVALENCE', 0.200, 1, 'manual_seed', 0.750, NULL),
(36, 43, 44, 'COGNATE_STRONG', 0.950, 1, 'manual_seed', 0.950, NULL),
(37, 49, 50, 'PARTIAL_EQUIVALENCE', 0.200, 1, 'manual_seed', 0.700, NULL),
(38, 54, 55, 'PARTIAL_EQUIVALENCE', 0.950, 1, 'manual_seed', 0.950, NULL),
(39, 54, 56, 'PARTIAL_EQUIVALENCE', 0.900, 1, 'manual_seed', 0.950, NULL),
(40, 54, 57, 'PARTIAL_EQUIVALENCE', 0.900, 1, 'manual_seed', 0.950, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `ic_feature`
--

CREATE TABLE `ic_feature` (
  `id` bigint(20) NOT NULL,
  `form_id` bigint(20) NOT NULL,
  `feature_type` varchar(50) NOT NULL,
  `value_num` decimal(8,4) DEFAULT NULL,
  `value_text` varchar(100) DEFAULT NULL,
  `source_label` varchar(100) DEFAULT NULL,
  `confidence_score` decimal(4,3) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Déchargement des données de la table `ic_feature`
--

INSERT INTO `ic_feature` (`id`, `form_id`, `feature_type`, `value_num`, `value_text`, `source_label`, `confidence_score`, `notes`) VALUES
(1, 2, 'GRAPHIC_SIMILARITY', 0.9300, NULL, 'manual_seed', 0.900, NULL),
(2, 2, 'TRANSPARENCY_SCORE', 0.9100, NULL, 'manual_seed', 0.900, NULL),
(3, 5, 'TRANSPARENCY_SCORE', 0.7800, NULL, 'manual_seed', 0.800, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `language`
--

CREATE TABLE `language` (
  `id` int(11) NOT NULL,
  `code` varchar(5) NOT NULL,
  `name` varchar(50) NOT NULL,
  `family` varchar(50) DEFAULT NULL,
  `is_romance` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Déchargement des données de la table `language`
--

INSERT INTO `language` (`id`, `code`, `name`, `family`, `is_romance`, `is_active`) VALUES
(1, 'fr', 'Français', 'Romance', 1, 1),
(2, 'es', 'Español', 'Romance', 1, 1),
(3, 'it', 'Italiano', 'Romance', 1, 1),
(4, 'pt', 'Português', 'Romance', 1, 1),
(5, 'en', 'English', 'Germanic', 0, 1);

-- --------------------------------------------------------

--
-- Structure de la table `lexical_entry`
--

CREATE TABLE `lexical_entry` (
  `id` bigint(20) NOT NULL,
  `entry_key` varchar(100) NOT NULL,
  `gloss_fr` text DEFAULT NULL,
  `gloss_en` text DEFAULT NULL,
  `semantic_domain` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Déchargement des données de la table `lexical_entry`
--

INSERT INTO `lexical_entry` (`id`, `entry_key`, `gloss_fr`, `gloss_en`, `semantic_domain`, `notes`) VALUES
(1, 'PHENOMENON_OBSERVABLE', 'phénomène observable', 'observable phenomenon', 'science', NULL),
(2, 'INFORMATION_DATA', 'information, donnée communiquée', 'information, communicated data', 'communication', NULL),
(3, 'IMPORTANT_SIGNIFICANT', 'important, significatif', 'important, significant', 'general', NULL),
(4, 'NATION_COUNTRY', 'nation, pays ou communauté politique', 'nation, country or political community', 'politics', NULL),
(5, 'UNIVERSITY_INSTITUTION', 'université, établissement d’enseignement supérieur', 'university, higher education institution', 'education', NULL),
(6, 'FAMILY_RELATION', 'famille, groupe familial', 'family, kinship group', 'social', NULL),
(7, 'CURRENTLY_NOW', 'actuellement, en ce moment', 'currently, at present', 'time', NULL),
(8, 'EVENTUALLY_POSSIBLY', 'éventuellement, possiblement', 'possibly, perhaps', 'modality', NULL),
(9, 'BOOKSHOP_STORE', 'librairie, magasin de livres', 'bookshop, bookstore', 'commerce', NULL),
(10, 'LIBRARY_PUBLIC', 'bibliothèque, lieu de consultation ou prêt de livres', 'library, public or private book collection', 'education', NULL),
(11, 'ATTEND_BE_PRESENT', 'assister à, être présent à', 'attend, be present at', 'action', NULL),
(12, 'HELP_ASSIST', 'aider, porter assistance', 'help, assist', 'action', NULL),
(13, 'CONDOM_PROTECTION', 'préservatif, moyen de protection contraceptive', 'condom, contraceptive protection', 'health', NULL),
(14, 'PRESERVATIVE_ADDITIVE', 'conservateur, substance qui préserve un aliment', 'preservative, food additive', 'food', NULL),
(15, 'WIDE_BROAD', 'large, de grande largeur', 'wide, broad', 'description', NULL),
(16, 'LONG_LENGTHY', 'long, de grande longueur', 'long, lengthy', 'description', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `lexical_form`
--

CREATE TABLE `lexical_form` (
  `id` bigint(20) NOT NULL,
  `entry_id` bigint(20) NOT NULL,
  `language_id` int(11) NOT NULL,
  `lemma` varchar(255) NOT NULL,
  `normalized_lemma` varchar(255) DEFAULT NULL,
  `part_of_speech` varchar(20) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `number_behavior` varchar(20) DEFAULT NULL,
  `register_label` varchar(50) DEFAULT NULL,
  `source_label` varchar(100) DEFAULT NULL,
  `confidence_score` decimal(4,3) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Déchargement des données de la table `lexical_form`
--

INSERT INTO `lexical_form` (`id`, `entry_id`, `language_id`, `lemma`, `normalized_lemma`, `part_of_speech`, `gender`, `number_behavior`, `register_label`, `source_label`, `confidence_score`, `notes`) VALUES
(1, 1, 1, 'phénomène', 'phenomene', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(2, 1, 2, 'fenómeno', 'fenomeno', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(3, 1, 3, 'fenomeno', 'fenomeno', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(4, 1, 4, 'fenômeno', 'fenomeno', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(5, 1, 5, 'phenomenon', 'phenomenon', 'noun', NULL, NULL, NULL, NULL, 0.900, NULL),
(6, 2, 1, 'information', 'information', 'noun', NULL, NULL, NULL, NULL, 0.980, NULL),
(7, 2, 2, 'información', 'informacion', 'noun', NULL, NULL, NULL, NULL, 0.980, NULL),
(8, 2, 3, 'informazione', 'informazione', 'noun', NULL, NULL, NULL, NULL, 0.980, NULL),
(9, 2, 4, 'informação', 'informacao', 'noun', NULL, NULL, NULL, NULL, 0.980, NULL),
(10, 2, 5, 'information', 'information', 'noun', NULL, NULL, NULL, NULL, 0.980, NULL),
(11, 3, 1, 'important', 'important', 'adjective', NULL, NULL, NULL, NULL, 0.980, NULL),
(12, 3, 2, 'importante', 'importante', 'adjective', NULL, NULL, NULL, NULL, 0.980, NULL),
(13, 3, 3, 'importante', 'importante', 'adjective', NULL, NULL, NULL, NULL, 0.980, NULL),
(14, 3, 4, 'importante', 'importante', 'adjective', NULL, NULL, NULL, NULL, 0.980, NULL),
(15, 3, 5, 'important', 'important', 'adjective', NULL, NULL, NULL, NULL, 0.980, NULL),
(16, 4, 1, 'nation', 'nation', 'noun', NULL, NULL, NULL, NULL, 0.970, NULL),
(17, 4, 2, 'nación', 'nacion', 'noun', NULL, NULL, NULL, NULL, 0.970, NULL),
(18, 4, 3, 'nazione', 'nazione', 'noun', NULL, NULL, NULL, NULL, 0.970, NULL),
(19, 4, 4, 'nação', 'nacao', 'noun', NULL, NULL, NULL, NULL, 0.970, NULL),
(20, 4, 5, 'nation', 'nation', 'noun', NULL, NULL, NULL, NULL, 0.970, NULL),
(21, 5, 1, 'université', 'universite', 'noun', NULL, NULL, NULL, NULL, 0.960, NULL),
(22, 5, 2, 'universidad', 'universidad', 'noun', NULL, NULL, NULL, NULL, 0.960, NULL),
(23, 5, 3, 'università', 'universita', 'noun', NULL, NULL, NULL, NULL, 0.960, NULL),
(24, 5, 4, 'universidade', 'universidade', 'noun', NULL, NULL, NULL, NULL, 0.960, NULL),
(25, 5, 5, 'university', 'university', 'noun', NULL, NULL, NULL, NULL, 0.940, NULL),
(26, 6, 1, 'famille', 'famille', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(27, 6, 2, 'familia', 'familia', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(28, 6, 3, 'famiglia', 'famiglia', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(29, 6, 4, 'família', 'familia', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(30, 6, 5, 'family', 'family', 'noun', NULL, NULL, NULL, NULL, 0.940, NULL),
(31, 7, 1, 'actuellement', 'actuellement', 'adverb', NULL, NULL, NULL, NULL, 0.990, NULL),
(32, 7, 5, 'currently', 'currently', 'adverb', NULL, NULL, NULL, NULL, 0.990, NULL),
(33, 8, 1, 'éventuellement', 'eventuellement', 'adverb', NULL, NULL, NULL, NULL, 0.990, NULL),
(34, 8, 5, 'eventually', 'eventually', 'adverb', NULL, NULL, NULL, NULL, 0.990, NULL),
(35, 8, 2, 'eventualmente', 'eventualmente', 'adverb', NULL, NULL, NULL, NULL, 0.950, NULL),
(36, 8, 3, 'eventualmente', 'eventualmente', 'adverb', NULL, NULL, NULL, NULL, 0.950, NULL),
(37, 8, 4, 'eventualmente', 'eventualmente', 'adverb', NULL, NULL, NULL, NULL, 0.950, NULL),
(38, 9, 1, 'librairie', 'librairie', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(39, 9, 2, 'librería', 'libreria', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(40, 9, 3, 'libreria', 'libreria', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(41, 9, 4, 'livraria', 'livraria', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(42, 9, 5, 'bookshop', 'bookshop', 'noun', NULL, NULL, NULL, NULL, 0.900, NULL),
(43, 10, 1, 'bibliothèque', 'bibliotheque', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(44, 10, 2, 'biblioteca', 'biblioteca', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(45, 10, 3, 'biblioteca', 'biblioteca', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(46, 10, 4, 'biblioteca', 'biblioteca', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(47, 10, 5, 'library', 'library', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(48, 11, 1, 'assister', 'assister', 'verb', NULL, NULL, NULL, NULL, 0.990, NULL),
(49, 11, 5, 'attend', 'attend', 'verb', NULL, NULL, NULL, NULL, 0.990, NULL),
(50, 12, 1, 'aider', 'aider', 'verb', NULL, NULL, NULL, NULL, 0.990, NULL),
(51, 12, 2, 'asistir', 'asistir', 'verb', NULL, NULL, NULL, NULL, 0.950, NULL),
(52, 12, 5, 'assist', 'assist', 'verb', NULL, NULL, NULL, NULL, 0.990, NULL),
(53, 13, 1, 'préservatif', 'preservatif', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(54, 13, 2, 'preservativo', 'preservativo', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(55, 13, 3, 'preservativo', 'preservativo', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(56, 13, 4, 'preservativo', 'preservativo', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(57, 13, 5, 'condom', 'condom', 'noun', NULL, NULL, NULL, NULL, 0.950, NULL),
(58, 14, 1, 'conservateur', 'conservateur', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(59, 14, 2, 'preservative', 'preservative', 'noun', NULL, NULL, NULL, NULL, 0.900, NULL),
(60, 14, 5, 'preservative', 'preservative', 'noun', NULL, NULL, NULL, NULL, 0.990, NULL),
(61, 15, 1, 'large', 'large', 'adjective', NULL, NULL, NULL, NULL, 0.990, NULL),
(62, 15, 5, 'large', 'large', 'adjective', NULL, NULL, NULL, NULL, 0.990, NULL),
(63, 15, 2, 'ancho', 'ancho', 'adjective', NULL, NULL, NULL, NULL, 0.900, NULL),
(64, 15, 3, 'ampio', 'ampio', 'adjective', NULL, NULL, NULL, NULL, 0.900, NULL),
(65, 15, 4, 'largo', 'largo', 'adjective', NULL, NULL, NULL, NULL, 0.850, NULL),
(66, 16, 1, 'long', 'long', 'adjective', NULL, NULL, NULL, NULL, 0.990, NULL),
(67, 16, 2, 'largo', 'largo', 'adjective', NULL, NULL, NULL, NULL, 0.950, NULL),
(68, 16, 3, 'lungo', 'lungo', 'adjective', NULL, NULL, NULL, NULL, 0.950, NULL),
(69, 16, 4, 'longo', 'longo', 'adjective', NULL, NULL, NULL, NULL, 0.950, NULL),
(70, 16, 5, 'long', 'long', 'adjective', NULL, NULL, NULL, NULL, 0.990, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `pattern_rule`
--

CREATE TABLE `pattern_rule` (
  `id` int(11) NOT NULL,
  `source_language_id` int(11) NOT NULL,
  `target_language_id` int(11) NOT NULL,
  `pattern_type` varchar(30) DEFAULT NULL,
  `source_pattern` varchar(100) NOT NULL,
  `target_pattern` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `reliability_score` decimal(4,3) DEFAULT NULL,
  `examples` text DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Déchargement des données de la table `pattern_rule`
--

INSERT INTO `pattern_rule` (`id`, `source_language_id`, `target_language_id`, `pattern_type`, `source_pattern`, `target_pattern`, `description`, `reliability_score`, `examples`, `notes`) VALUES
(1, 1, 2, 'ORTHOGRAPHIC', 'ph', 'f', 'Correspondance fréquente français → espagnol', 0.800, NULL, NULL),
(2, 1, 3, 'ORTHOGRAPHIC', 'ph', 'f', 'Correspondance fréquente français → italien', 0.800, NULL, NULL),
(3, 1, 4, 'ORTHOGRAPHIC', 'ph', 'f', 'Correspondance fréquente français → portugais', 0.800, NULL, NULL);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `form_relation`
--
ALTER TABLE `form_relation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_form_relation_source` (`source_form_id`),
  ADD KEY `idx_form_relation_target` (`target_form_id`),
  ADD KEY `idx_form_relation_type` (`relation_type`);

--
-- Index pour la table `ic_feature`
--
ALTER TABLE `ic_feature`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ic_feature_form` (`form_id`),
  ADD KEY `idx_ic_feature_type` (`feature_type`);

--
-- Index pour la table `language`
--
ALTER TABLE `language`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_language_code` (`code`);

--
-- Index pour la table `lexical_entry`
--
ALTER TABLE `lexical_entry`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_lexical_entry_key` (`entry_key`);

--
-- Index pour la table `lexical_form`
--
ALTER TABLE `lexical_form`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_lexical_form_lang_lemma_pos` (`language_id`,`lemma`,`part_of_speech`),
  ADD KEY `idx_lexical_form_entry_id` (`entry_id`),
  ADD KEY `idx_lexical_form_normalized_lemma` (`normalized_lemma`);

--
-- Index pour la table `pattern_rule`
--
ALTER TABLE `pattern_rule`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pattern_rule_target_lang` (`target_language_id`),
  ADD KEY `idx_pattern_rule_langs` (`source_language_id`,`target_language_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `form_relation`
--
ALTER TABLE `form_relation`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `ic_feature`
--
ALTER TABLE `ic_feature`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `language`
--
ALTER TABLE `language`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `lexical_entry`
--
ALTER TABLE `lexical_entry`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `lexical_form`
--
ALTER TABLE `lexical_form`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT pour la table `pattern_rule`
--
ALTER TABLE `pattern_rule`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `form_relation`
--
ALTER TABLE `form_relation`
  ADD CONSTRAINT `fk_form_relation_source` FOREIGN KEY (`source_form_id`) REFERENCES `lexical_form` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_form_relation_target` FOREIGN KEY (`target_form_id`) REFERENCES `lexical_form` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `ic_feature`
--
ALTER TABLE `ic_feature`
  ADD CONSTRAINT `fk_ic_feature_form` FOREIGN KEY (`form_id`) REFERENCES `lexical_form` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `lexical_form`
--
ALTER TABLE `lexical_form`
  ADD CONSTRAINT `fk_lexical_form_entry` FOREIGN KEY (`entry_id`) REFERENCES `lexical_entry` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_lexical_form_language` FOREIGN KEY (`language_id`) REFERENCES `language` (`id`);

--
-- Contraintes pour la table `pattern_rule`
--
ALTER TABLE `pattern_rule`
  ADD CONSTRAINT `fk_pattern_rule_source_lang` FOREIGN KEY (`source_language_id`) REFERENCES `language` (`id`),
  ADD CONSTRAINT `fk_pattern_rule_target_lang` FOREIGN KEY (`target_language_id`) REFERENCES `language` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
