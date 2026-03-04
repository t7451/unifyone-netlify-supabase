CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`userId` int,
	`orderId` int,
	`productId` int,
	`value` decimal(12,2),
	`properties` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parentId` int,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(255),
	`lastName` varchar(255),
	`phone` varchar(50),
	`stripeCustomerId` varchar(100),
	`shopifyCustomerId` varchar(100),
	`totalOrders` int DEFAULT 0,
	`totalSpent` decimal(12,2) DEFAULT '0.00',
	`tags` json DEFAULT ('[]'),
	`address` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reservedQuantity` int NOT NULL DEFAULT 0,
	`lowStockThreshold` int DEFAULT 10,
	`location` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`tenantId` int NOT NULL,
	`productId` int,
	`productName` varchar(500) NOT NULL,
	`productSku` varchar(100),
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`imageUrl` text,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`customerId` int,
	`orderNumber` varchar(50) NOT NULL,
	`status` enum('pending','confirmed','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('pending','paid','failed','refunded','partial') NOT NULL DEFAULT 'pending',
	`fulfillmentStatus` enum('unfulfilled','partial','fulfilled','returned') NOT NULL DEFAULT 'unfulfilled',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
	`taxAmount` decimal(12,2) DEFAULT '0.00',
	`shippingAmount` decimal(12,2) DEFAULT '0.00',
	`discountAmount` decimal(12,2) DEFAULT '0.00',
	`total` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) DEFAULT 'USD',
	`stripePaymentIntentId` varchar(100),
	`stripeSessionId` varchar(100),
	`shopifyOrderId` varchar(100),
	`customerEmail` varchar(320),
	`customerName` varchar(500),
	`shippingAddress` json,
	`notes` text,
	`tags` json DEFAULT ('[]'),
	`metadata` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`description` text,
	`priceMonthly` decimal(10,2) NOT NULL DEFAULT '0.00',
	`priceYearly` decimal(10,2) NOT NULL DEFAULT '0.00',
	`stripePriceIdMonthly` varchar(100),
	`stripePriceIdYearly` varchar(100),
	`maxProducts` int DEFAULT 100,
	`maxOrders` int DEFAULT 1000,
	`maxUsers` int DEFAULT 5,
	`features` json DEFAULT ('[]'),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`categoryId` int,
	`name` varchar(500) NOT NULL,
	`slug` varchar(500) NOT NULL,
	`description` text,
	`sku` varchar(100),
	`price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`compareAtPrice` decimal(10,2),
	`costPrice` decimal(10,2),
	`imageUrl` text,
	`images` json DEFAULT ('[]'),
	`tags` json DEFAULT ('[]'),
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'draft',
	`trackInventory` boolean DEFAULT true,
	`weight` decimal(8,3),
	`shopifyProductId` varchar(100),
	`metaTitle` varchar(255),
	`metaDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`domain` varchar(255),
	`logoUrl` text,
	`ownerId` int NOT NULL,
	`planId` int,
	`status` enum('active','suspended','trial','cancelled') NOT NULL DEFAULT 'trial',
	`stripeCustomerId` varchar(100),
	`stripeSubscriptionId` varchar(100),
	`subscriptionStatus` enum('active','past_due','cancelled','trialing','none') NOT NULL DEFAULT 'none',
	`subscriptionCurrentPeriodEnd` timestamp,
	`shopifyShopDomain` varchar(255),
	`shopifyAccessToken` text,
	`shopifySyncEnabled` boolean DEFAULT false,
	`n8nWebhookUrl` text,
	`settings` json DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`source` enum('stripe','shopify','n8n','internal') NOT NULL,
	`eventType` varchar(200) NOT NULL,
	`payload` json DEFAULT ('{}'),
	`status` enum('pending','processed','failed','skipped') NOT NULL DEFAULT 'pending',
	`error` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;