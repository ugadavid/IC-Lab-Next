CREATE TABLE `language` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(5) NOT NULL,
  `name` varchar(50) NOT NULL,
  `family` varchar(50) DEFAULT NULL,
  `is_romance` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_language_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
