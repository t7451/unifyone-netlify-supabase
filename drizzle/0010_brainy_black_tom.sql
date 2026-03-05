CREATE TABLE `affiliate_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int,
	`name` varchar(200) NOT NULL,
	`category` varchar(100),
	`platform` varchar(100),
	`commissionRate` decimal(5,2) NOT NULL,
	`commissionType` enum('percentage','flat','recurring') NOT NULL DEFAULT 'percentage',
	`cookieDuration` int NOT NULL DEFAULT 30,
	`affiliateLink` varchar(1000),
	`monthlyEarnings` decimal(10,2) NOT NULL DEFAULT '0.00',
	`pendingPayout` decimal(10,2) NOT NULL DEFAULT '0.00',
	`instantPayout` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meta_pixel_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`eventName` varchar(100) NOT NULL,
	`eventId` varchar(100) NOT NULL,
	`eventSourceUrl` varchar(500),
	`customData` json,
	`status` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`responseCode` int,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meta_pixel_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int,
	`name` varchar(200) NOT NULL,
	`type` enum('affiliate','saas','consulting','physical','digital','passive') NOT NULL,
	`platform` varchar(100),
	`monthlyValue` decimal(10,2) NOT NULL DEFAULT '0.00',
	`commissionRate` decimal(5,2),
	`status` enum('active','pending','inactive','broken') NOT NULL DEFAULT 'active',
	`affiliateLink` varchar(1000),
	`cookieDuration` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_streams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`opportunityId` int NOT NULL,
	`credits` int NOT NULL,
	`status` enum('pending','completed','rejected') NOT NULL DEFAULT 'completed',
	`metaEventId` varchar(100),
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`credits` int NOT NULL,
	`category` enum('signup','referral','purchase','engagement','milestone','promotion') NOT NULL DEFAULT 'engagement',
	`maxClaimsPerUser` int NOT NULL DEFAULT 1,
	`totalMaxClaims` int,
	`claimCount` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reward_opportunities_id` PRIMARY KEY(`id`)
);
