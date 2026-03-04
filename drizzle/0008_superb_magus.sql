CREATE TABLE `announcement_dismissals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`announcementId` int NOT NULL,
	`dismissedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcement_dismissals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(30) NOT NULL DEFAULT 'banner',
	`severity` varchar(20) NOT NULL DEFAULT 'info',
	`dismissible` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`event` varchar(100) NOT NULL,
	`n8nEnabled` boolean NOT NULL DEFAULT false,
	`zapierEnabled` boolean NOT NULL DEFAULT false,
	`mailchimpEnabled` boolean NOT NULL DEFAULT false,
	`slackWebhookUrl` text,
	`slackEnabled` boolean NOT NULL DEFAULT false,
	`emailEnabled` boolean NOT NULL DEFAULT false,
	`emailRecipients` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_triggers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int,
	`type` varchar(50) NOT NULL DEFAULT 'info',
	`title` varchar(255) NOT NULL,
	`body` text,
	`link` varchar(500),
	`read` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
