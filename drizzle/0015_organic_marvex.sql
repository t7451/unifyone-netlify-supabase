ALTER TABLE `friend_challenges` ADD `resolvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `winnerNotified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `loserNotified` boolean DEFAULT false NOT NULL;