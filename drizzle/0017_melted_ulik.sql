CREATE TABLE `deep_link_attributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(255),
	`source` varchar(100) NOT NULL DEFAULT 'unknown',
	`medium` varchar(100),
	`campaign` varchar(255),
	`deepLinkPath` varchar(500),
	`referralCode` varchar(100),
	`utmSource` varchar(255),
	`utmMedium` varchar(255),
	`utmCampaign` varchar(255),
	`converted` boolean NOT NULL DEFAULT false,
	`convertedAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deep_link_attributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `n8n_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`workflowId` varchar(255),
	`webhookUrl` varchar(1000),
	`cronExpression` varchar(100) NOT NULL,
	`payload` json,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`lastRunStatus` enum('success','failed','pending'),
	`lastRunError` text,
	`triggerCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `n8n_schedules_id` PRIMARY KEY(`id`)
);
