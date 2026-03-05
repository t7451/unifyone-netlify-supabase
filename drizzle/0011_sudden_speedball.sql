CREATE TABLE `shopify_api_quota` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`restCallsMade` int NOT NULL DEFAULT 0,
	`restCallsLimit` int NOT NULL DEFAULT 40,
	`graphqlPointsUsed` int NOT NULL DEFAULT 0,
	`graphqlPointsLimit` int NOT NULL DEFAULT 1000,
	`throttledCount` int NOT NULL DEFAULT 0,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopify_api_quota_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopify_stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`userId` int NOT NULL,
	`shopDomain` varchar(255) NOT NULL,
	`accessToken` varchar(500) NOT NULL,
	`scopes` text NOT NULL,
	`shopName` varchar(255),
	`shopEmail` varchar(255),
	`shopCurrency` varchar(10) DEFAULT 'USD',
	`shopPlan` varchar(100),
	`status` enum('active','suspended','uninstalled') NOT NULL DEFAULT 'active',
	`lastSyncAt` timestamp,
	`installedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopify_stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopify_stores_shopDomain_unique` UNIQUE(`shopDomain`)
);
--> statement-breakpoint
CREATE TABLE `shopify_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`tenantId` int,
	`event` varchar(100) NOT NULL,
	`entity` enum('product','order','customer','inventory','fulfillment','webhook') NOT NULL,
	`entityId` varchar(100),
	`direction` enum('inbound','outbound') NOT NULL DEFAULT 'inbound',
	`status` enum('success','failed','skipped','retrying') NOT NULL,
	`latencyMs` int,
	`errorMsg` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`payload` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopify_sync_log_id` PRIMARY KEY(`id`)
);
