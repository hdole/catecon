CREATE DATABASE `Catecon`;
USE `Catecon`;
CREATE TABLE `users` (`name` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`email` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`permissions` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`maxDiagrams` bigint(20) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE `diagrams` (`name` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`basename` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`user` VARCHAR(64) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`category` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`description` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`properName` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`refs` longtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`timestamp` bigint(20) NOT NULL,
	`refcnt` int DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE `diagrams`
	ADD UNIQUE KEY `Name` (`name`) USING HASH,
	ADD KEY `TimestampIndex` (`timestamp`),
	ADD KEY `user` (`user`(64));
ALTER TABLE `diagrams` ADD FULLTEXT KEY `DescriptionIndex` (`properName`);
CREATE USER `catecon`@`172.26.11.254` IDENTIFIED BY `ILoveCategoryTheory`;
GRANT ALL PRIVILEGES ON `Catecon`.* TO `catecon`@`172.26.11.254`;
