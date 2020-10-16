DROP DATABASE `Catecon`;
CREATE DATABASE `Catecon`;
USE `Catecon`;
CREATE TABLE `diagrams` (`name` VARCHAR(256) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`basename` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`user` VARCHAR(64) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`description` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`properName` mediumtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`refs` longtext CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,
	`timestamp` bigint(20) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE `diagrams`
	ADD UNIQUE KEY `Name` (`name`) USING HASH,
	ADD KEY `TimestampIndex` (`timestamp`),
	ADD KEY `user` (`user`(64));
ALTER TABLE `diagrams` ADD FULLTEXT KEY `DescriptionIndex` (`properName`);
