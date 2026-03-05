CREATE TABLE `sovereign_waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`company` varchar(255),
	`currentStack` text,
	`monthlyRevenue` enum('pre_revenue','under_5k','5k_25k','25k_100k','over_100k'),
	`biggestChallenge` text,
	`referralSource` varchar(100),
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`status` enum('pending','contacted','qualified','converted','rejected') NOT NULL DEFAULT 'pending',
	`position` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sovereign_waitlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `sovereign_waitlist_email_unique` UNIQUE(`email`)
);
