CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(500),
	`contactName` varchar(500),
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`website` varchar(500),
	`plan` varchar(100),
	`platforms` json,
	`branding` varchar(255),
	`monthlyRevenue` varchar(100),
	`teamSize` varchar(50),
	`message` text,
	`source` varchar(100) DEFAULT 'landing_page',
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`status` enum('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
	`assignedTo` int,
	`notes` text,
	`n8nTriggered` boolean DEFAULT false,
	`zapierTriggered` boolean DEFAULT false,
	`mailchimpSubscribed` boolean DEFAULT false,
	`notificationSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mailchimp_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`apiKey` text,
	`serverPrefix` varchar(10),
	`listId` varchar(100),
	`tagPrefix` varchar(100) DEFAULT 'unifyone',
	`enabled` boolean NOT NULL DEFAULT false,
	`subscriberCount` int DEFAULT 0,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mailchimp_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `mailchimp_config_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `n8n_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`triggerEvent` varchar(100) NOT NULL,
	`webhookUrl` text NOT NULL,
	`payloadTemplate` json,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastTriggeredAt` timestamp,
	`triggerCount` int DEFAULT 0,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `n8n_workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zapier_hooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`name` varchar(255) NOT NULL,
	`triggerEvent` varchar(100) NOT NULL,
	`webhookUrl` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastTriggeredAt` timestamp,
	`triggerCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zapier_hooks_id` PRIMARY KEY(`id`)
);
