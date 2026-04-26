CREATE TABLE `card_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cardNumber` varchar(20) NOT NULL,
	`cardType` varchar(20) NOT NULL,
	`status` varchar(255) NOT NULL,
	`classification` varchar(50),
	`errorCode` varchar(50),
	`errorMessage` text,
	`responseTime` int,
	`proxyUsed` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `card_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalChecks` int NOT NULL DEFAULT 0,
	`approvedCount` int NOT NULL DEFAULT 0,
	`declinedCount` int NOT NULL DEFAULT 0,
	`unknownCount` int NOT NULL DEFAULT 0,
	`averageResponseTime` int NOT NULL DEFAULT 0,
	`lastCheckAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_stats_userId_unique` UNIQUE(`userId`)
);
