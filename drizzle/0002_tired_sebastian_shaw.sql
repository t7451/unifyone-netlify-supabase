ALTER TABLE `analytics_events` MODIFY COLUMN `properties` json;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `metadata` json;--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `features` json;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `images` json;--> statement-breakpoint
ALTER TABLE `products` MODIFY COLUMN `tags` json;--> statement-breakpoint
ALTER TABLE `tenants` MODIFY COLUMN `settings` json;--> statement-breakpoint
ALTER TABLE `webhook_events` MODIFY COLUMN `payload` json;