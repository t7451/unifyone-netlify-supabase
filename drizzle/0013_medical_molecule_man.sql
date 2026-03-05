CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`icon` varchar(100) NOT NULL DEFAULT 'Trophy',
	`category` enum('gig','finance','social','platform','milestone','special') NOT NULL,
	`pointsReward` int NOT NULL DEFAULT 50,
	`requirement` json NOT NULL,
	`rarity` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `challenge_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenge_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`type` enum('daily','weekly','monthly','one_time','community') NOT NULL,
	`category` enum('gig','finance','social','platform') NOT NULL,
	`goal` int NOT NULL,
	`unit` varchar(50) NOT NULL DEFAULT 'count',
	`pointsReward` int NOT NULL,
	`bonusReward` varchar(200),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`maxParticipants` int,
	`participantCount` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`type` enum('auto_save','budget_cap','alert','allocation','goal') NOT NULL,
	`triggerType` enum('income_received','expense_over','balance_below','balance_above','scheduled','manual') NOT NULL,
	`triggerValue` decimal(10,2),
	`actionType` enum('transfer','notify','block','tag','save') NOT NULL,
	`actionValue` decimal(10,2),
	`actionPercent` decimal(5,2),
	`category` varchar(100),
	`platform` varchar(100),
	`enabled` boolean NOT NULL DEFAULT true,
	`triggerCount` int NOT NULL DEFAULT 0,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gig_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(100) NOT NULL DEFAULT 'other',
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`durationMinutes` int,
	`startLat` decimal(10,7),
	`startLng` decimal(10,7),
	`endLat` decimal(10,7),
	`endLng` decimal(10,7),
	`totalMiles` decimal(8,2) NOT NULL DEFAULT '0.00',
	`grossEarnings` decimal(10,2) NOT NULL DEFAULT '0.00',
	`tips` decimal(10,2) NOT NULL DEFAULT '0.00',
	`bonuses` decimal(10,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gig_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mileage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shiftId` int,
	`date` timestamp NOT NULL,
	`miles` decimal(8,2) NOT NULL,
	`purpose` varchar(255) NOT NULL DEFAULT 'business',
	`irsRateCents` int NOT NULL DEFAULT 70,
	`deductionCents` int NOT NULL,
	`startAddress` varchar(500),
	`endAddress` varchar(500),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mileage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `points_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`points` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`description` varchar(500),
	`referenceId` varchar(100),
	`balanceAfter` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `points_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` varchar(100) NOT NULL,
	`provider` enum('stripe','paypal','manual') NOT NULL DEFAULT 'stripe',
	`providerSubscriptionId` varchar(255),
	`status` enum('active','pending','canceled','expired','trial') NOT NULL DEFAULT 'pending',
	`features` json DEFAULT ('[]'),
	`trialEndsAt` timestamp,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`canceledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_entitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementId` int NOT NULL,
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	`pointsAwarded` int NOT NULL,
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalPoints` int NOT NULL DEFAULT 0,
	`lifetimePoints` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`streakDays` int NOT NULL DEFAULT 0,
	`lastActivityAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_points_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_points_userId_unique` UNIQUE(`userId`)
);
