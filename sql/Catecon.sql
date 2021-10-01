CREATE DATABASE `Catecon`;
USE `Catecon`;
CREATE TABLE `users` (`name` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`email` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`permissions` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`maxDiagrams` bigint(20) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 CREATE TABLE `diagrams` (
  `name` varchar(128) DEFAULT NULL,
  `basename` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `user` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `codomain` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `description` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `properName` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `refs` longtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `timestamp` bigint(20) NOT NULL,
  `refcnt` int(11) DEFAULT '0',
  `cloudTimestamp` bigint(20) DEFAULT NULL,
  `prototype` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `category` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  FULLTEXT KEY `DescriptionIndex` (`properName`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4
CREATE USER `catecon`@`XXX.XXX.XXX.XXX` IDENTIFIED BY `ILoveCategoryTheory`;
GRANT ALL PRIVILEGES ON `Catecon`.* TO `catecon`@`XXX.XXX.XXX.XXX`;
