CREATE TABLE `theme_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `theme_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `theme_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `theme_installs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`themeId` int NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int,
	`stripePaymentIntentId` varchar(100),
	`amountPaid` decimal(10,2) NOT NULL DEFAULT '0.00',
	`installedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `theme_installs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `theme_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`themeId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(200),
	`body` text,
	`helpful` int NOT NULL DEFAULT 0,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `theme_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`longDescription` text,
	`authorId` int NOT NULL,
	`categoryId` int,
	`priceType` enum('free','paid','subscription') NOT NULL DEFAULT 'free',
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`stripePriceId` varchar(100),
	`previewUrl` text,
	`thumbnailUrl` text,
	`screenshotUrls` json DEFAULT ('[]'),
	`downloadUrl` text,
	`tags` json DEFAULT ('[]'),
	`industry` varchar(100),
	`complexity` enum('starter','standard','advanced') NOT NULL DEFAULT 'standard',
	`features` json DEFAULT ('[]'),
	`techStack` json DEFAULT ('[]'),
	`installCount` int NOT NULL DEFAULT 0,
	`reviewCount` int NOT NULL DEFAULT 0,
	`averageRating` decimal(3,2) NOT NULL DEFAULT '0.00',
	`status` enum('draft','pending_review','published','archived') NOT NULL DEFAULT 'draft',
	`featured` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `themes_id` PRIMARY KEY(`id`),
	CONSTRAINT `themes_slug_unique` UNIQUE(`slug`)
);
