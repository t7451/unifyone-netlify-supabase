ALTER TABLE `orders` ADD COLUMN `squarePaymentId` varchar(100);
ALTER TABLE `orders` ADD COLUMN `squareOrderId` varchar(100);
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('stripe','paypal','shopify','square','manual','other');
ALTER TABLE `tenants` ADD COLUMN `squareAccessToken` text;
ALTER TABLE `tenants` ADD COLUMN `squareLocationId` varchar(100);
