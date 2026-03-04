ALTER TABLE `orders` ADD `paypalOrderId` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentMethod` enum('stripe','paypal','shopify','manual','other');